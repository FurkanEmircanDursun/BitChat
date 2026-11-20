import { create } from 'zustand';
import Native from '../specs/NativeBitChat';
import {
  emptyData,
  LocalData,
  DeviceStatus,
  Peer,
  Coordinates,
  Envelope,
  SignedMessage,
  Priority,
  Listing,
  MapPoint,
  Preferences,
} from '../core/types';
import { OfflineAiClassifier } from '../core/OfflineAiClassifier';
import {
  canonical,
  MESSAGE_LIFETIME,
  validateEnvelope,
} from '../core/protocol';
import {
  AutonomousMeshEngine,
  batteryMode,
} from '../core/AutonomousMeshEngine';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

type Store = {
  data: LocalData;
  ready: boolean;
  fatal: string | null;
  notice: string | null;
  identity: { sender: string; publicKey: string } | null;
  device: DeviceStatus;
  peers: Peer[];
  running: boolean;
  scanning: boolean;
  starting: boolean;
  coordinates: (Coordinates & { accuracy: number; timestamp: number }) | null;
  locating: boolean;
};
export const useStore = create<Store>(() => ({
  data: emptyData(),
  ready: false,
  fatal: null,
  notice: null,
  identity: null,
  device: {
    battery: -1,
    charging: false,
    internet: false,
    bluetooth: false,
    wifi: false,
    playServices: false,
  },
  peers: [],
  running: false,
  scanning: false,
  starting: false,
  coordinates: null,
  locating: false,
}));
const engine = new AutonomousMeshEngine({
  send: (peer, payload) => Native.send(peer, payload),
});
let transaction: Promise<unknown> = Promise.resolve();
let booted = false;
let receiveSerial: Promise<unknown> = Promise.resolve();
let startGeneration = 0;
let discoveryGeneration = 0;
let discoveryTimer: ReturnType<typeof setTimeout> | undefined;
const messageError = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
export function notify(message: string | null) {
  useStore.setState({ notice: message });
}
export async function safely(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (e) {
    notify(messageError(e));
  }
}
/** Serialize all commits; publish only after the SQLite transaction succeeds. */
export function commit(
  change: (current: LocalData) => LocalData,
): Promise<void> {
  const operation = transaction
    .catch(() => undefined)
    .then(async () => {
      if (!useStore.getState().ready) {
        throw new Error('Yerel kayıt henüz hazır değil.');
      }
      const next = change(useStore.getState().data);
      await Native.saveState(JSON.stringify(next));
      useStore.setState({ data: next });
    });
  transaction = operation;
  return operation;
}
function checkStored(value: unknown): value is LocalData {
  const v = value as LocalData;
  return (
    !!v &&
    v.schema === 1 &&
    Array.isArray(v.messages) &&
    v.messages.length <= 10000 &&
    Array.isArray(v.listings) &&
    v.listings.length <= 10000 &&
    Array.isArray(v.points) &&
    v.points.length <= 10000 &&
    !!v.preferences &&
    typeof v.preferences.name === 'string' &&
    v.preferences.name.length <= 30 &&
    ['system', 'light', 'dark'].includes(v.preferences.theme) &&
    v.messages.every(
      m =>
        !!m.message &&
        typeof m.message.id === 'string' &&
        typeof m.message.text === 'string' &&
        Array.isArray(m.receipts),
    ) &&
    v.listings.every(
      l => typeof l.id === 'string' && typeof l.text === 'string',
    ) &&
    v.points.every(
      p =>
        typeof p.id === 'string' &&
        typeof p.title === 'string' &&
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude),
    )
  );
}
export async function initialize(): Promise<void> {
  if (booted) {
    return;
  }
  booted = true;
  try {
    const [raw, identity] = await Promise.all([
      Native.loadState(),
      Native.getIdentity(),
    ]);
    const data = raw ? JSON.parse(raw) : emptyData();
    const deviceIdentity = JSON.parse(identity) as {
      sender: string;
      publicKey: string;
    };
    const challenge = `BitChat identity proof:${await Native.createId()}`;
    const proof = await Native.sign(challenge);
    if (
      !(await Native.verify(
        challenge,
        proof,
        deviceIdentity.publicKey,
        deviceIdentity.sender,
      ))
    ) {
      throw new Error(
        'Cihaz imza anahtarı doğrulanamadı. Önceki kayıtlar korunuyor.',
      );
    }
    if (!checkStored(data)) {
      throw new Error(
        'Kayıt biçimi okunamadı. Veriler korunuyor; uygulamayı silmeyin.',
      );
    }
    useStore.setState({
      data,
      identity: deviceIdentity,
      ready: true,
      fatal: null,
    });
    Native.onRadioEvent(rawEvent => {
      receiveSerial = receiveSerial
        .catch(() => undefined)
        .then(() => handleRadio(rawEvent))
        .catch(e => notify(messageError(e)));
    });
    AppState.addEventListener('change', state => {
      // No foreground service: stop instead of promising background delivery.
      if (state !== 'active' && useStore.getState().running) {
        safely(stopNetwork);
      }
      if (state === 'active') {
        safely(refreshDevice);
      }
    });
    await refreshDevice().catch(e =>
      notify(`Cihaz bilgisi okunamadı: ${messageError(e)}`),
    );
    setInterval(() => {
      safely(async () => {
        await refreshDevice();
        await flush();
      });
    }, 4000);
  } catch (e) {
    booted = false;
    useStore.setState({ fatal: messageError(e) });
  }
}
export async function refreshDevice() {
  const previous = useStore.getState().device;
  const device = JSON.parse(await Native.getDeviceStatus()) as DeviceStatus;
  useStore.setState({ device });
  if (
    useStore.getState().running &&
    (previous.battery !== device.battery ||
      previous.charging !== device.charging)
  ) {
    if (
      batteryMode(previous.battery, previous.charging) !==
      batteryMode(device.battery, device.charging)
    ) {
      await scheduleDiscovery();
    }
  }
}
export async function startNetwork() {
  if (useStore.getState().running || useStore.getState().starting) {
    return;
  }
  const generation = ++startGeneration;
  useStore.setState({ starting: true });
  try {
    const permissions =
      Number(Platform.Version) >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    if (Number(Platform.Version) >= 33) {
      permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
    }
    const results = await PermissionsAndroid.requestMultiple(permissions);
    if (
      Object.values(results).some(p => p !== PermissionsAndroid.RESULTS.GRANTED)
    ) {
      throw new Error(
        'Yakındaki cihaz izni gerekli. Ayarlar’dan izin verip tekrar deneyin. Yerel özellikler kullanılabilir.',
      );
    }
    await refreshDevice();
    const { device, data } = useStore.getState();
    if (!device.playServices) {
      throw new Error(
        'Bu cihazda güncel Google Play Hizmetleri gerekli. Tatbikat çevrimdışı kullanılabilir.',
      );
    }
    if (!device.bluetooth || !device.wifi) {
      throw new Error(
        'Bluetooth ve Wi-Fi’ı cihaz ayarlarından açın. İnternet bağlantısı gerekmez.',
      );
    }
    if (generation !== startGeneration || AppState.currentState !== 'active') {
      return;
    }
    await Native.start(data.preferences.name);
    if (generation !== startGeneration || AppState.currentState !== 'active') {
      await Native.stop();
      return;
    }
    useStore.setState({ running: true });
    await scheduleDiscovery();
    notify(
      'Yakındaki ağ açık. Diğer telefonda da ağı açın, bağlantı kodunu karşılaştırın.',
    );
  } catch (e) {
    await Native.stop().catch(() => undefined);
    useStore.setState({ running: false, scanning: false, peers: [] });
    throw e;
  } finally {
    useStore.setState({ starting: false });
  }
}
export async function stopNetwork() {
  ++startGeneration;
  ++discoveryGeneration;
  if (discoveryTimer) {
    clearTimeout(discoveryTimer);
  }
  const peers = useStore.getState().peers;
  await Native.stop();
  peers.forEach(p => engine.forgetPeer(p.id));
  useStore.setState({
    running: false,
    scanning: false,
    starting: false,
    peers: [],
  });
}
async function scheduleDiscovery(): Promise<void> {
  const generation = ++discoveryGeneration;
  if (discoveryTimer) {
    clearTimeout(discoveryTimer);
  }
  const { device, running } = useStore.getState();
  if (!running) {
    return;
  }
  const mode = batteryMode(device.battery, device.charging);
  await Native.discovery(false);
  useStore.setState({ scanning: false });
  if (mode === 'SURVIVAL_MODE') {
    return;
  }
  const cycle = async (enabled: boolean) => {
    if (generation !== discoveryGeneration || !useStore.getState().running) {
      return;
    }
    try {
      await Native.discovery(enabled);
      if (generation !== discoveryGeneration) {
        return;
      }
      useStore.setState({ scanning: enabled });
      discoveryTimer = setTimeout(
        () => {
          void cycle(!enabled);
        },
        enabled ? 5000 : mode === 'ACTIVE_RELAY' ? 10000 : 25000,
      );
    } catch (e) {
      notify(`Tarama durdu: ${messageError(e)}. Ağı kapatıp yeniden açın.`);
      useStore.setState({ scanning: false });
    }
  };
  await cycle(true);
}
export async function locate() {
  if (useStore.getState().locating) {
    return;
  }
  useStore.setState({ locating: true });
  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    if (
      Object.values(results).every(
        p => p !== PermissionsAndroid.RESULTS.GRANTED,
      )
    ) {
      throw new Error(
        'Konum izni verilmedi. Konumsuz mesaj gönderebilirsiniz.',
      );
    }
    const coordinates = JSON.parse(await Native.getLocation());
    useStore.setState({
      coordinates: { ...coordinates, timestamp: Date.now() },
    });
    notify('Cihaz konumu alındı. Paylaşım tercihini siz belirlersiniz.');
  } finally {
    useStore.setState({ locating: false });
  }
}
export async function sendMessage(
  text: string,
  options: {
    priority?: Priority;
    kind?: SignedMessage['kind'];
    shareLocation?: boolean;
    listing?: Omit<Listing, 'id' | 'messageId' | 'createdAt' | 'closed'>;
  } = {},
) {
  text = text.trim();
  if (!text || text.length > 600) {
    throw new Error('Mesaj 1–600 karakter olmalı.');
  }
  const { identity, data, coordinates } = useStore.getState();
  if (!identity) {
    throw new Error('Cihaz kimliği hazır değil.');
  }
  if (data.messages.length >= 10000) {
    throw new Error(
      '10.000 kayıt sınırına ulaşıldı. Eski kayıtları temizleyin.',
    );
  }
  const includeLocation =
    options.shareLocation ?? data.preferences.shareLocation;
  if (
    includeLocation &&
    (!coordinates || Date.now() - coordinates.timestamp > 120000)
  ) {
    throw new Error(
      'Güncel konum yok. Konumu yenileyin veya konum paylaşımını kapatın.',
    );
  }
  const analysis = OfflineAiClassifier.classify(text);
  const now = Date.now();
  const message: SignedMessage = {
    version: 1,
    id: await Native.createId(),
    ...identity,
    name: data.preferences.name.trim() || 'Komşu',
    text,
    createdAt: now,
    expiresAt: now + MESSAGE_LIFETIME,
    priority:
      options.kind === 'sos' ? 1 : options.priority ?? analysis.priority,
    coordinates:
      includeLocation && coordinates
        ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
        : null,
    maxHops: 8,
    kind: options.kind ?? 'message',
    intent: options.listing?.intent ?? analysis.intent,
    resource: options.listing?.resource ?? analysis.resource,
  };
  const signature = await Native.sign(canonical(message));
  const listing = options.listing
    ? {
        ...options.listing,
        id: await Native.createId(),
        messageId: message.id,
        createdAt: now,
        closed: false,
      }
    : null;
  await commit(current => ({
    ...current,
    messages: [
      ...current.messages,
      {
        message,
        signature,
        hops: 0,
        direction: 'out',
        status: 'queued',
        receivedAt: now,
        receipts: [],
      },
    ],
    listings: listing ? [...current.listings, listing] : current.listings,
  }));
  notify('Cihaza kaydedildi. Bağlı telefonlardan alındı onayı bekleniyor.');
  await flush();
}
export async function updatePreferences(patch: Partial<Preferences>) {
  if (
    patch.name !== undefined &&
    (!patch.name.trim() || patch.name.trim().length > 30)
  ) {
    throw new Error('Görünen ad 1–30 karakter olmalı.');
  }
  await commit(d => ({ ...d, preferences: { ...d.preferences, ...patch } }));
}
export async function addPoint(point: Omit<MapPoint, 'id' | 'createdAt'>) {
  const id = await Native.createId();
  if (
    !point.title.trim() ||
    point.title.length > 60 ||
    !Number.isFinite(point.latitude) ||
    Math.abs(point.latitude) > 90 ||
    !Number.isFinite(point.longitude) ||
    Math.abs(point.longitude) > 180
  ) {
    throw new Error('Başlık ve geçerli koordinat girin.');
  }
  await commit(d => ({
    ...d,
    points: [
      ...d.points,
      { ...point, title: point.title.trim(), id, createdAt: Date.now() },
    ],
  }));
}
export async function flush() {
  const s = useStore.getState();
  if (!s.running) {
    return;
  }
  await engine.flush(
    s.data.messages,
    s.peers.filter(p => p.state === 'connected').map(p => p.id),
    batteryMode(s.device.battery, s.device.charging),
  );
}
export async function connectPeer(id: string) {
  useStore.setState(s => ({
    peers: s.peers.map(p => (p.id === id ? { ...p, state: 'connecting' } : p)),
  }));
  try {
    await Native.connect(id);
  } catch (e) {
    useStore.setState(s => ({
      peers: s.peers.map(p =>
        p.id === id && p.state === 'connecting' ? { ...p, state: 'found' } : p,
      ),
    }));
    throw e;
  }
}
export async function confirmPeer(id: string, accept: boolean) {
  await Native.confirm(id, accept);
}
async function handleRadio(raw: string) {
  const event = JSON.parse(raw);
  if (event.type === 'warning') {
    notify(event.message);
    return;
  }
  const current = useStore.getState();
  if (!current.running) {
    return;
  }
  if (['lost', 'disconnected'].includes(event.type)) {
    engine.forgetPeer(event.id);
    useStore.setState({ peers: current.peers.filter(p => p.id !== event.id) });
    return;
  }
  const states: Record<string, Peer['state']> = {
    found: 'found',
    confirm: 'confirm',
    connected: 'connected',
  };
  if (states[event.type]) {
    const peer: Peer = {
      id: event.id,
      name: event.name,
      state: states[event.type],
      code: event.code,
    };
    useStore.setState({
      peers: [...current.peers.filter(p => p.id !== peer.id), peer],
    });
    if (peer.state === 'connected') {
      await flush();
    }
    return;
  }
  if (
    event.type !== 'payload' ||
    typeof event.data !== 'string' ||
    event.data.length > 16000
  ) {
    return;
  }
  if (!current.peers.some(p => p.id === event.id && p.state === 'connected')) {
    return;
  }
  const payload = JSON.parse(event.data);
  if (payload.type === 'ack' && typeof payload.id === 'string') {
    // A receipt only attests to this authenticated neighboring link.
    const found = current.data.messages.find(m => m.message.id === payload.id);
    if (!found) {
      return;
    }
    await commit(d => ({
      ...d,
      messages: d.messages.map(m =>
        m.message.id === payload.id
          ? {
              ...m,
              status: 'received',
              receipts: [...new Set([...m.receipts, event.id])],
            }
          : m,
      ),
    }));
    engine.acknowledge(event.id, payload.id);
    return;
  }
  if (payload.type !== 'message' || !validateEnvelope(payload.envelope)) {
    return;
  }
  const envelope = payload.envelope as Envelope;
  if (
    !(await Native.verify(
      canonical(envelope.message),
      envelope.signature,
      envelope.message.publicKey,
      envelope.message.sender,
    ))
  ) {
    notify('İmzası doğrulanamayan paket reddedildi.');
    return;
  }
  if (
    !useStore
      .getState()
      .data.messages.some(m => m.message.id === envelope.message.id)
  ) {
    await commit(d => {
      if (d.messages.length >= 10000) {
        throw new Error('Kayıt sınırı dolu; yeni paket alınamadı.');
      }
      return {
        ...d,
        messages: [
          ...d.messages,
          {
            ...envelope,
            direction: 'in',
            status: 'received',
            receivedAt: Date.now(),
            receipts: [],
          },
        ],
      };
    });
  }
  engine.acknowledge(event.id, envelope.message.id);
  await Native.send(
    event.id,
    JSON.stringify({ type: 'ack', id: envelope.message.id }),
  );
  await flush();
}
