import {
  BinaryPacketCodec,
  CompactPacket,
} from '../src/core/BinaryPacketCodec';
import { OfflineAiClassifier } from '../src/core/OfflineAiClassifier';
import {
  AutonomousMeshEngine,
  batteryMode,
  eligible,
} from '../src/core/AutonomousMeshEngine';
import {
  canonical,
  MESSAGE_LIFETIME,
  validateEnvelope,
} from '../src/core/protocol';
import { advanceExercise, initialExercise } from '../src/core/exercise';
import { Envelope, Message } from '../src/core/types';

const now = 1793210400000;
const make = (p: 1 | 2 | 3 = 3, overrides: Partial<Message> = {}): Message => ({
  message: {
    version: 1,
    id: '12345678-1234-1234-1234-123456789012',
    sender: 'a'.repeat(24),
    publicKey: 'a'.repeat(124),
    name: 'Komşu',
    text: 'Güvendeyim',
    createdAt: now,
    expiresAt: now + MESSAGE_LIFETIME,
    priority: p,
    coordinates: null,
    maxHops: 8,
    kind: 'message',
    intent: 'message',
    resource: 'Diğer',
  },
  signature: 'a'.repeat(96),
  hops: 0,
  direction: 'out',
  status: 'queued',
  receivedAt: now,
  receipts: [],
  ...overrides,
});
describe('31-byte beacon', () => {
  const packet: CompactPacket = {
    id: 0xffffffff,
    senderHash: 123,
    priority: 1,
    ttl: 8,
    coordinates: { latitude: -89.123456, longitude: 179.999999 },
    payload: Uint8Array.from({ length: 13 }, (_, i) => i),
  };
  test('round trip and exact size', () => {
    const bytes = BinaryPacketCodec.encode(packet);
    expect(bytes).toHaveLength(31);
    expect(BinaryPacketCodec.decode(bytes)).toEqual(packet);
  });
  test('respects offset into a larger buffer', () => {
    const padded = new Uint8Array(50);
    padded.set(BinaryPacketCodec.encode(packet), 7);
    expect(BinaryPacketCodec.decode(padded.subarray(7, 38))).toEqual(packet);
  });
  test('missing coordinates use an explicit sentinel', () => {
    expect(
      BinaryPacketCodec.decode(
        BinaryPacketCodec.encode({ ...packet, coordinates: null }),
      ).coordinates,
    ).toBeNull();
  });
  test('hop budget cannot underflow', () => {
    expect(
      BinaryPacketCodec.forward(
        BinaryPacketCodec.encode({ ...packet, ttl: 0 }),
      ),
    ).toBeNull();
    const bytes = BinaryPacketCodec.forward(BinaryPacketCodec.encode(packet));
    expect(BinaryPacketCodec.decode(bytes!).ttl).toBe(7);
  });
  test.each([-1, 0x100000000, NaN, 0.5])('rejects invalid id %s', id => {
    expect(() => BinaryPacketCodec.encode({ ...packet, id })).toThrow();
  });
  test('rejects invalid coordinates and ambiguous sentinel', () => {
    expect(() =>
      BinaryPacketCodec.encode({
        ...packet,
        coordinates: { latitude: 91, longitude: 0 },
      }),
    ).toThrow();
    const bytes = BinaryPacketCodec.encode({ ...packet, coordinates: null });
    new DataView(bytes.buffer).setInt32(14, 0);
    expect(() => BinaryPacketCodec.decode(bytes)).toThrow();
  });
  test('rejects oversized or undersized payload instead of truncating', () => {
    for (const size of [0, 12, 14, 200]) {
      expect(() =>
        BinaryPacketCodec.encode({ ...packet, payload: new Uint8Array(size) }),
      ).toThrow();
    }
  });
  test('rejects malformed length and priority', () => {
    expect(() => BinaryPacketCodec.decode(new Uint8Array(30))).toThrow();
    const bytes = BinaryPacketCodec.encode(packet);
    bytes[8] = 99;
    expect(() => BinaryPacketCodec.decode(bytes)).toThrow();
  });
});
describe('offline Turkish classification', () => {
  test.each([
    ['Enkaz altındayım, yardım edin', 1],
    ['NEFES ALAMIYORUM', 1],
    ['Su lazım', 2],
    ['İki battaniye paylaşabilirim', 2],
    ['Güvendeyim', 3],
    ['Enkaz altında değilim, güvendeyim', 3],
    ['Yangın yok ama nefes alamıyorum', 1],
    ['Tatbikat: enkaz altındayım', 3],
    ['Ben iyiyim ama komşum enkaz altında', 1],
    ['Güvende değilim', 1],
    ['SOS', 1],
  ])('%s has priority %s', (text, priority) => {
    expect(OfflineAiClassifier.classify(text).priority).toBe(priority);
  });
  test('distinguishes aid offer and need', () => {
    expect(
      OfflineAiClassifier.classify('Su var, paylaşabilirim'),
    ).toMatchObject({ intent: 'offer', resource: 'Su' });
    expect(OfflineAiClassifier.classify('Su yok lazım')).toMatchObject({
      intent: 'need',
      resource: 'Su',
    });
  });
});
describe('protocol boundaries', () => {
  test('accepts valid signed-envelope shape', () => {
    expect(validateEnvelope(make(), now)).toBe(true);
  });
  test.each([null, {}, { message: {} }, { message: { id: 5 } }])(
    'rejects malformed input',
    e => {
      expect(validateEnvelope(e, now)).toBe(false);
    },
  );
  test('rejects expired/future, hop tampering and invalid coordinates', () => {
    const good = make();
    for (const envelope of [
      { ...good, hops: -1 },
      { ...good, hops: 9 },
      { ...good, message: { ...good.message, expiresAt: now } },
      { ...good, message: { ...good.message, createdAt: now + 999999 } },
      {
        ...good,
        message: {
          ...good.message,
          coordinates: { latitude: NaN, longitude: 30 },
        },
      },
    ]) {
      expect(validateEnvelope(envelope, now)).toBe(false);
    }
  });
  test('canonical signature binds text, intent, coordinates and expiry', () => {
    const m = make().message;
    for (const patch of [
      { text: 'değişti' },
      { intent: 'offer' as const },
      { coordinates: { latitude: 40, longitude: 29 } },
      { expiresAt: m.expiresAt + 1 },
    ]) {
      expect(canonical({ ...m, ...patch })).not.toBe(canonical(m));
    }
  });
});
describe('mesh scheduling, failures and receipts', () => {
  test.each([
    [51, false, 'ACTIVE_RELAY'],
    [50, false, 'CONSERVATIVE_NODE'],
    [20, false, 'CONSERVATIVE_NODE'],
    [19, false, 'SURVIVAL_MODE'],
    [5, true, 'ACTIVE_RELAY'],
    [-1, false, 'CONSERVATIVE_NODE'],
  ])('battery %s charging %s', (battery, charging, mode) => {
    expect(batteryMode(battery as number, charging as boolean)).toBe(mode);
  });
  test('urgent-first; conserves energy and respects expiration/hops', () => {
    const normal = make(3),
      urgent = make(1),
      relayed = { ...urgent, direction: 'in' as const };
    expect(eligible([normal, urgent], 'ACTIVE_RELAY', now)[0]).toEqual(urgent);
    expect(eligible([normal, urgent], 'CONSERVATIVE_NODE', now)).toEqual([
      urgent,
    ]);
    expect(eligible([relayed, urgent], 'SURVIVAL_MODE', now)).toEqual([urgent]);
    expect(eligible([{ ...urgent, hops: 8 }], 'ACTIVE_RELAY', now)).toEqual([]);
    expect(eligible([urgent], 'ACTIVE_RELAY', now + MESSAGE_LIFETIME)).toEqual(
      [],
    );
  });
  test('retries dropped packets with backoff; only application ack stops retry', async () => {
    let clock = now;
    const send = jest
      .fn()
      .mockRejectedValueOnce(new Error('radio disconnected'))
      .mockResolvedValue(undefined);
    const engine = new AutonomousMeshEngine({ send }, () => clock),
      messages = [make(1)];
    await engine.flush(messages, ['B'], 'ACTIVE_RELAY');
    expect(send).toHaveBeenCalledTimes(1);
    await engine.flush(messages, ['B'], 'ACTIVE_RELAY');
    expect(send).toHaveBeenCalledTimes(1);
    clock += 2000;
    await engine.flush(messages, ['B'], 'ACTIVE_RELAY');
    expect(send).toHaveBeenCalledTimes(2);
    clock += 4000;
    await engine.flush(messages, ['B'], 'ACTIVE_RELAY');
    expect(send).toHaveBeenCalledTimes(3);
    engine.acknowledge('B', messages[0].message.id);
    clock += 60000;
    await engine.flush(messages, ['B'], 'ACTIVE_RELAY');
    expect(send).toHaveBeenCalledTimes(3);
    expect(messages[0].status).toBe('queued'); // API success is not delivery.
    engine.forgetPeer('B');
    await engine.flush(messages, ['B'], 'ACTIVE_RELAY');
    expect(send).toHaveBeenCalledTimes(4);
    const wire = JSON.parse(send.mock.calls[3][1]) as { envelope: Envelope };
    expect(wire.envelope.hops).toBe(1);
  });
  test('serializes simultaneous flush calls', async () => {
    let finish!: () => void;
    const send = jest.fn(
      () =>
        new Promise<void>(r => {
          finish = r;
        }),
    );
    const engine = new AutonomousMeshEngine({ send }, () => now);
    const first = engine.flush([make()], ['B'], 'ACTIVE_RELAY');
    await engine.flush([make()], ['B'], 'ACTIVE_RELAY');
    expect(send).toHaveBeenCalledTimes(1);
    finish();
    await first;
  });
});
describe('isolated exercise', () => {
  test('recovers from offline and low battery without phantom delivery', () => {
    let s = initialExercise();
    s = advanceExercise({ ...s, online: false });
    expect(s.step).toBe(0);
    s = advanceExercise({ ...s, online: true, lowBattery: true });
    expect(s.step).toBe(0);
    s = advanceExercise({ ...s, lowBattery: false });
    s = advanceExercise(s);
    expect(s.delivered).toBe(false);
    s = advanceExercise(s);
    expect(s.delivered).toBe(true);
    expect(s.copies).toBe(3);
    expect(advanceExercise(s)).toEqual(s);
  });
});
