import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  Switch,
  View,
  Linking,
  Alert,
} from 'react-native';
import {
  ArrowUpRight,
  Radio,
  Siren,
  MessageCircle,
  MapPin,
  Plus,
  HeartHandshake,
  Droplets,
  Check,
  ChevronRight,
  ShieldCheck,
  Battery,
  Settings,
  Play,
  RotateCcw,
  Smartphone,
  Send,
  X,
  Download,
  Trash2,
  LocateFixed,
  Link,
  RefreshCw,
} from 'lucide-react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Native from '../specs/NativeBitChat';
import {
  commit,
  confirmPeer,
  connectPeer,
  locate,
  notify,
  refreshDevice,
  safely,
  startNetwork,
  stopNetwork,
  updatePreferences,
  useStore,
} from '../state/store';
import { Message, MapPoint, priorityLabel } from '../core/types';
import { batteryMode } from '../core/AutonomousMeshEngine';
import { advanceExercise, initialExercise } from '../core/exercise';
import {
  Button,
  Chip,
  Empty,
  Field,
  IconButton,
  Label,
  Panel,
  Section,
  useTheme,
} from './theme';
import { MapCanvas, categoryLabel } from './MapCanvas';
import { Sheet } from './Sheets';

export type Tab = 'home' | 'messages' | 'map' | 'aid' | 'network';
export type Actions = {
  navigate: (tab: Tab) => void;
  compose: () => void;
  sos: () => void;
  aid: () => void;
  point: () => void;
  settings: () => void;
  exercise: () => void;
  message: (m: Message) => void;
};
const time = (value: number) =>
  new Date(value).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
const stamp = (value: number) =>
  new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
export function Brand({ small = false }: { small?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <View
        style={{
          width: small ? 32 : 38,
          height: small ? 32 : 38,
          backgroundColor: c.primary,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width="25" height="25" viewBox="0 0 28 28">
          <Line
            x1="7"
            y1="7"
            x2="21"
            y2="21"
            stroke={c.onPrimary}
            strokeWidth="2"
          />
          <Line
            x1="7"
            y1="21"
            x2="21"
            y2="7"
            stroke={c.onPrimary}
            strokeWidth="2"
          />
          <Circle cx="7" cy="7" r="4" fill={c.onPrimary} />
          <Circle cx="21" cy="7" r="4" fill={c.onPrimary} />
          <Circle cx="7" cy="21" r="4" fill={c.onPrimary} />
          <Circle cx="21" cy="21" r="4" fill={c.onPrimary} />
        </Svg>
      </View>
      <Label
        size={small ? 20 : 22}
        weight="800"
        style={{ letterSpacing: -0.7 }}
      >
        bitchat
        <Label size={22} color={c.orange}>
          .
        </Label>
      </Label>
    </View>
  );
}
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 6,
      }}
    >
      <View style={{ flex: 1 }}>
        <Label size={29} weight="700" style={{ letterSpacing: -0.7 }}>
          {title}
        </Label>
        <Label size={14} color={c.muted}>
          {subtitle}
        </Label>
      </View>
      {right}
    </View>
  );
}
export function MessageRow({
  item,
  onPress,
}: {
  item: Message;
  onPress: () => void;
}) {
  const c = useTheme(),
    p = item.message.priority,
    expired = item.message.expiresAt <= Date.now();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.message.name}: ${item.message.text}`}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 16,
        flexDirection: 'row',
        gap: 12,
        borderBottomWidth: 1,
        borderColor: c.line,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 15,
          backgroundColor: p === 1 ? c.orangeSoft : c.soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {p === 1 ? (
          <Siren size={21} color={c.orange} />
        ) : (
          <MessageCircle size={21} color={c.primary} />
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Label size={14} weight="700" lines={1} style={{ flex: 1 }}>
            {item.direction === 'out' ? 'Siz' : item.message.name}
            <Label size={12} color={c.muted}>
              {' '}
              · {p === 1 ? 'Acil' : p === 2 ? 'İhtiyaç' : 'Genel'}
            </Label>
          </Label>
          <Label size={12} color={c.muted}>
            {time(item.message.createdAt)}
          </Label>
        </View>
        <Label size={14} lines={2}>
          {item.message.text}
        </Label>
        <Label
          size={11}
          color={
            expired ? c.muted : item.status === 'queued' ? c.orange : c.primary
          }
        >
          {expired
            ? 'Süresi doldu · tekrar iletilmez'
            : item.direction === 'in'
            ? 'Bu cihaza alındı · imzalı'
            : item.status === 'received'
            ? 'Yakındaki telefona ulaştı'
            : 'Cihazda kayıtlı · alındı onayı yok'}
        </Label>
      </View>
    </Pressable>
  );
}
export function HomeScreen({ a }: { a: Actions }) {
  const c = useTheme(),
    { data, running, peers, device, coordinates } = useStore();
  const connected = peers.filter(p => p.state === 'connected').length;
  const queued = data.messages.filter(
    m =>
      m.direction === 'out' &&
      m.status === 'queued' &&
      m.message.expiresAt > Date.now(),
  ).length;
  const recent = [...data.messages]
    .sort((x, y) => y.receivedAt - x.receivedAt)
    .slice(0, 2);
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Brand />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: c.soft,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 7,
            }}
          >
            <Label size={12} weight="600">
              {device.battery < 0 ? 'Pil —' : `%${device.battery}`}
            </Label>
          </View>
          <IconButton
            icon={Settings}
            label="Ayarları aç"
            onPress={a.settings}
          />
        </View>
      </View>
      <View style={{ gap: 5, marginTop: 8 }}>
        <Label size={32} weight="700" style={{ letterSpacing: -0.9 }}>
          Bağımız kopmasın.
        </Label>
        <Label color={c.muted} size={15}>
          İnternet olmasa da birbirimiz var.
        </Label>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ağ durumunu aç"
        onPress={() => a.navigate('network')}
        style={{
          backgroundColor: c.soft,
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          gap: 13,
          alignItems: 'center',
        }}
      >
        <Radio size={25} color={c.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Label size={15} weight="700">
            {connected
              ? `${connected} telefonla bağlısınız`
              : running
              ? 'Yakındaki telefonlar aranıyor'
              : 'Yakındaki ağ kapalı'}
          </Label>
          <Label size={12} color={c.muted}>
            {connected
              ? `${queued} mesaj alındı onayı bekliyor`
              : running
              ? 'Diğer cihazda da BitChat’i açın'
              : 'Mesajlarınız bu cihazda güvende'}
          </Label>
        </View>
        <ChevronRight size={20} color={c.primary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Acil yardım çağrısı oluştur"
        onPress={a.sos}
        style={({ pressed }) => ({
          backgroundColor: c.orangeSoft,
          borderRadius: 20,
          padding: 22,
          gap: 15,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              backgroundColor: c.dark ? '#683621' : '#F9D6C3',
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Siren color={c.orange} size={27} strokeWidth={1.7} />
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: c.surface,
            }}
          >
            <Label size={11} weight="700" color={c.orange}>
              ÖNCELİKLİ İLETİM
            </Label>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Label size={25} weight="700">
            Yardıma ihtiyacım var
          </Label>
          <Label size={14} color={c.muted}>
            SOS’unuzu hazırlayın. Yakındaki ağa{'\n'}ilk sırada iletilmek üzere
            kaydedilsin.
          </Label>
        </View>
        <View
          style={{
            minHeight: 50,
            backgroundColor: c.orange,
            borderRadius: 13,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Label size={15} weight="700" color={c.dark ? '#29160D' : '#FFFFFF'}>
            Acil yardım çağrısı oluştur
          </Label>
          <ArrowUpRight size={21} color={c.dark ? '#29160D' : '#FFFFFF'} />
        </View>
      </Pressable>
      <Section
        title="Çevrimdışı alanınız"
        action="Haritayı aç"
        onPress={() => a.navigate('map')}
      />
      <MapCanvas
        height={190}
        points={data.points}
        location={coordinates}
        compact
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: -4,
        }}
      >
        <ShieldCheck size={15} color={c.primary} />
        <Label size={12} color={c.muted}>
          {data.points.length
            ? `${data.points.length} kişisel nokta bu cihazda kayıtlı`
            : 'Kendi güvenli noktalarınızı cihazınıza kaydedin'}
        </Label>
      </View>
      <Section
        title="Son mesajlar"
        action="Tümü"
        onPress={() => a.navigate('messages')}
      />
      {recent.length ? (
        <View>
          {recent.map(m => (
            <MessageRow
              key={m.message.id}
              item={m}
              onPress={() => a.message(m)}
            />
          ))}
        </View>
      ) : (
        <Panel>
          <Label weight="600">İlk bağlantı sizinle başlar.</Label>
          <Label size={14} color={c.muted}>
            Bir mesaj yazın; ağ kapalıyken de kaybolmaz.
          </Label>
          <Button
            title="İlk mesajınızı yazın"
            icon={MessageCircle}
            tone="outline"
            onPress={a.compose}
          />
        </Panel>
      )}
      <Pressable
        onPress={a.exercise}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          gap: 14,
          paddingVertical: 18,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: c.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Play size={20} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Label weight="600" size={15}>
            Afetten önce birlikte deneyelim
          </Label>
          <Label color={c.muted} size={12}>
            Tek telefonda, izole ağ tatbikatı
          </Label>
        </View>
        <ChevronRight size={20} color={c.muted} />
      </Pressable>
    </>
  );
}
export function MessagesScreen({ a }: { a: Actions }) {
  const c = useTheme(),
    messages = useStore(s => s.data.messages);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'queued'>('all'),
    [search, setSearch] = useState('');
  const visible = [...messages]
    .filter(
      m =>
        (filter === 'all' ||
          (filter === 'urgent'
            ? m.message.priority === 1
            : m.direction === 'out' && m.status === 'queued')) &&
        `${m.message.text} ${m.message.name}`
          .toLocaleLowerCase('tr')
          .includes(search.toLocaleLowerCase('tr')),
    )
    .sort((x, y) => y.receivedAt - x.receivedAt);
  return (
    <>
      <ScreenHeader
        title="Mesajlar"
        subtitle="Birbirimize ulaşmanın en kısa yolu."
        right={
          <IconButton icon={Plus} label="Yeni mesaj yaz" onPress={a.compose} />
        }
      />
      <Field
        label="Mesajlarda ara"
        value={search}
        onChangeText={setSearch}
        placeholder="Mesaj veya kişi adı"
        maxLength={100}
      />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip
          text={`Tümü · ${messages.length}`}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <Chip
          text="Acil"
          selected={filter === 'urgent'}
          onPress={() => setFilter('urgent')}
        />
        <Chip
          text="Bekleyen"
          selected={filter === 'queued'}
          onPress={() => setFilter('queued')}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <ShieldCheck size={16} color={c.primary} />
        <Label size={12} color={c.muted} style={{ flex: 1 }}>
          İmzalı ortak kanal · 24 saat iletim süresi
        </Label>
      </View>
      {visible.length ? (
        <View>
          {visible.slice(0, 200).map(m => (
            <MessageRow
              key={m.message.id}
              item={m}
              onPress={() => a.message(m)}
            />
          ))}
          {visible.length > 200 && (
            <Label size={13} color={c.muted}>
              Son 200 sonuç gösteriliyor. Aramayla daraltın.
            </Label>
          )}
        </View>
      ) : (
        <Empty
          icon={MessageCircle}
          title={messages.length ? 'Eşleşen mesaj yok' : 'Henüz mesaj yok'}
          body={
            messages.length
              ? 'Başka bir sözcük veya filtre deneyin.'
              : 'Ağ olmasa da yazabilirsiniz. Mesajlar önce cihazınıza kaydedilir.'
          }
          action={<Button title="Mesaj yaz" icon={Send} onPress={a.compose} />}
        />
      )}
    </>
  );
}
export function MapScreen({ a }: { a: Actions }) {
  const c = useTheme(),
    { points } = useStore(s => s.data),
    location = useStore(s => s.coordinates),
    locating = useStore(s => s.locating);
  const [filter, setFilter] = useState<MapPoint['category'] | 'all'>('all'),
    [selected, setSelected] = useState<MapPoint | null>(null);
  const filtered = points.filter(
    p => filter === 'all' || p.category === filter,
  );
  return (
    <>
      <ScreenHeader
        title="Çevrimdışı harita"
        subtitle="Bildiklerinizi kaydedin, yanınızda kalsın."
        right={
          <IconButton
            icon={Plus}
            label="Harita noktası ekle"
            onPress={a.point}
          />
        }
      />
      <Label size={13} color={c.muted}>
        Kişisel koordinat planı. Resmi toplanma alanı veya yol verisi içermez.
      </Label>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <Chip
          text="Tümü"
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        {(Object.keys(categoryLabel) as MapPoint['category'][]).map(key => (
          <Chip
            key={key}
            text={categoryLabel[key]}
            selected={filter === key}
            onPress={() => setFilter(key)}
          />
        ))}
      </ScrollView>
      <MapCanvas
        points={filtered}
        location={location}
        height={340}
        onSelect={setSelected}
      />
      <Button
        title={locating ? 'Konum alınıyor…' : 'Konumumu al'}
        icon={LocateFixed}
        tone="outline"
        busy={locating}
        onPress={() => safely(locate)}
      />
      {location && (
        <Label size={12} color={c.muted}>
          {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · ±
          {Math.round(location.accuracy)} m · {time(location.timestamp)}
        </Label>
      )}
      <Section title={`Kayıtlı noktalar · ${filtered.length}`} />
      {filtered.length ? (
        filtered.map(p => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => setSelected(p)}
            style={{
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <MapPin
              color={p.category === 'hazard' ? c.orange : c.primary}
              size={24}
            />
            <View style={{ flex: 1 }}>
              <Label size={15} weight="600">
                {p.title}
              </Label>
              <Label size={12} color={c.muted}>
                {categoryLabel[p.category]} · Kişisel kayıt
              </Label>
            </View>
            <ChevronRight color={c.muted} size={19} />
          </Pressable>
        ))
      ) : (
        <Empty
          icon={MapPin}
          title="Alanınızı siz tanıyorsunuz"
          body="Buluşma yerini, su noktasını veya gördüğünüz tehlikeyi koordinatıyla kaydedin."
          action={
            <Button title="İlk noktayı ekle" onPress={a.point} icon={Plus} />
          }
        />
      )}
      {selected && (
        <Sheet
          title={selected.title}
          subtitle={`${categoryLabel[selected.category]} · Kişisel kayıt`}
          onClose={() => setSelected(null)}
        >
          <Label>
            {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
          </Label>
          <Label color={c.muted} size={14}>
            Bu nokta sizin tarafınızdan eklendi. Güvenliği ve erişimi sahada
            kontrol edin. Navigasyon sağlanmaz.
          </Label>
          <Button
            title="Koordinatı paylaş"
            icon={Send}
            onPress={() =>
              safely(async () => {
                await Share.share({
                  message: `${selected.title}\n${selected.latitude}, ${selected.longitude}\nBitChat kişisel noktası; resmi tesis kaydı değildir.`,
                });
              })
            }
          />
          <Button
            title="Yerel noktayı sil"
            icon={Trash2}
            tone="outline"
            onPress={() =>
              safely(async () => {
                await commit(d => ({
                  ...d,
                  points: d.points.filter(p => p.id !== selected.id),
                }));
                setSelected(null);
              })
            }
          />
        </Sheet>
      )}
    </>
  );
}
export function AidScreen({ a }: { a: Actions }) {
  const c = useTheme(),
    { listings, messages } = useStore(s => s.data);
  const [filter, setFilter] = useState<'all' | 'need' | 'offer'>('all');
  const remote = messages.filter(
    m =>
      m.direction === 'in' &&
      m.message.kind === 'aid' &&
      m.message.expiresAt > Date.now(),
  );
  const local = listings.filter(
    l => !l.closed && (filter === 'all' || l.intent === filter),
  );
  const remoteVisible = remote.filter(
    m => filter === 'all' || m.message.intent === filter,
  );
  return (
    <>
      <ScreenHeader
        title="Dayanışma"
        subtitle="Elinizdekini paylaşın, ihtiyacınızı söyleyin."
        right={
          <IconButton
            icon={Plus}
            label="Dayanışma ilanı ekle"
            onPress={a.aid}
          />
        }
      />
      <Panel style={{ backgroundColor: c.soft, padding: 24 }}>
        <HeartHandshake size={32} color={c.primary} />
        <Label size={25} weight="700">
          Birlikte daha güçlüyüz.
        </Label>
        <Label size={14} color={c.muted}>
          Bir şişe su. Fazladan bir battaniye. Küçük bir paylaşım, büyük bir
          destek.
        </Label>
        <Button
          title="İhtiyaç veya paylaşım ekle"
          icon={Plus}
          onPress={a.aid}
        />
      </Panel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip
          text="Tümü"
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <Chip
          text="İhtiyaçlar"
          selected={filter === 'need'}
          onPress={() => setFilter('need')}
        />
        <Chip
          text="Paylaşımlar"
          selected={filter === 'offer'}
          onPress={() => setFilter('offer')}
        />
      </View>
      <Label size={12} color={c.muted}>
        Acil yardım ücretsiz ve koşulsuzdur. Bu sürüm para veya kripto varlık
        üretmez.
      </Label>
      {local.length + remoteVisible.length === 0 && (
        <Empty
          icon={HeartHandshake}
          title="Dayanışmaya yer açın"
          body="Burada sizin ve bağlı telefonlardan alınan ilanlar görünür. Şu an bu filtrede ilan yok."
        />
      )}
      {local.map(l => (
        <Panel key={l.id}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Droplets size={20} color={c.primary} />
              <Label size={16} weight="700">
                {l.resource}
              </Label>
            </View>
            <Label
              size={12}
              color={l.intent === 'need' ? c.orange : c.primary}
              weight="600"
            >
              {l.intent === 'need' ? 'İHTİYAÇ' : 'PAYLAŞIM'}
            </Label>
          </View>
          <Label size={20} weight="600">
            {l.quantity}
          </Label>
          <Label size={14}>{l.text}</Label>
          <Label size={12} color={c.muted}>
            Sizin ilanınız · {stamp(l.createdAt)} ·{' '}
            {messages.find(m => m.message.id === l.messageId)?.status ===
            'received'
              ? 'Yakındaki telefona ulaştı'
              : 'Yerelde kayıtlı'}
          </Label>
          <Button
            title="İlanı bu cihazda kapat"
            tone="outline"
            icon={Check}
            onPress={() =>
              safely(async () => {
                await commit(d => ({
                  ...d,
                  listings: d.listings.map(x =>
                    x.id === l.id ? { ...x, closed: true } : x,
                  ),
                }));
                notify(
                  'İlan burada kapatıldı. Daha önce iletilen kopyalar geri çekilmez.',
                );
              })
            }
          />
        </Panel>
      ))}
      {remoteVisible.map(m => (
        <Panel key={m.message.id}>
          <Label size={12} color={c.primary}>
            {m.message.intent === 'need'
              ? 'YAKINDAKİ İHTİYAÇ'
              : 'YAKINDAKİ PAYLAŞIM'}
          </Label>
          <Label size={17} weight="600">
            {m.message.name}
          </Label>
          <Label size={14}>{m.message.text}</Label>
          <Label size={12} color={c.muted}>
            İmzalı ilan · {time(m.receivedAt)}
          </Label>
          <Button
            title="Ortak kanalda yanıt yaz"
            icon={MessageCircle}
            tone="outline"
            onPress={a.compose}
          />
        </Panel>
      ))}
      {listings.some(l => l.closed) && (
        <Label size={12} color={c.muted}>
          {listings.filter(l => l.closed).length} ilan bu cihazda kapalı.
        </Label>
      )}
    </>
  );
}

export function NetworkScreen({ a }: { a: Actions }) {
  const c = useTheme(),
    { device, running, starting, scanning, peers, data } = useStore();
  const mode = batteryMode(device.battery, device.charging);
  const label =
    mode === 'ACTIVE_RELAY'
      ? 'Aktif taşıyıcı'
      : mode === 'CONSERVATIVE_NODE'
      ? 'Tasarruflu düğüm'
      : 'Hayatta kalma';
  return (
    <>
      <ScreenHeader
        title="Yakındaki ağ"
        subtitle="Telefonlar bağlanır, mesajlar yolunu bulur."
        right={
          <IconButton
            icon={RefreshCw}
            label="Cihaz durumunu yenile"
            onPress={() => safely(refreshDevice)}
          />
        }
      />
      <Panel style={{ backgroundColor: c.soft, padding: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Radio size={42} color={c.primary} strokeWidth={1.5} />
          <View style={{ flex: 1 }}>
            <Label size={23} weight="700">
              {running ? 'Ağınız açık' : 'Bağlantıya hazır'}
            </Label>
            <Label size={13} color={c.muted}>
              {running
                ? scanning
                  ? 'Yakındaki cihazlar taranıyor'
                  : mode === 'SURVIVAL_MODE'
                  ? 'Düşük pil: tarama kapalı'
                  : 'Pil için tarama molası'
                : 'Bluetooth + Wi-Fi · İnternet gerekmez'}
            </Label>
          </View>
        </View>
        <Label size={14} color={c.muted}>
          İki telefonda da ağı açın. Birbirinizi bulunca bağlanın ve ekrandaki
          kodları karşılaştırın.
        </Label>
        <Button
          title={running ? 'Ağı kapat' : 'Yakındaki ağı aç'}
          icon={running ? X : Radio}
          busy={starting}
          onPress={() => safely(running ? stopNetwork : startNetwork)}
        />
      </Panel>
      <View style={{ gap: 10 }}>
        {[
          {
            name: 'Bluetooth',
            value: device.bluetooth ? 'Açık' : 'Kapalı / izin yok',
          },
          { name: 'Wi-Fi', value: device.wifi ? 'Açık' : 'Kapalı' },
          {
            name: 'Google Play Hizmetleri',
            value: device.playServices
              ? 'Kullanılabilir'
              : 'Gerekli / kullanılamıyor',
          },
          {
            name: 'İnternet',
            value: device.internet
              ? 'Var · kurum sunucusu yapılandırılmadı'
              : 'Yok · yerel özellikler çalışır',
          },
        ].map(row => (
          <View
            key={row.name}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 16,
              paddingVertical: 5,
            }}
          >
            <Label size={13} color={c.muted}>
              {row.name}
            </Label>
            <Label
              size={13}
              weight="600"
              style={{ flexShrink: 1, textAlign: 'right' }}
            >
              {row.value}
            </Label>
          </View>
        ))}
      </View>
      <Button
        title="Cihaz ayarlarını aç"
        tone="outline"
        icon={Settings}
        onPress={() =>
          safely(async () => {
            await Linking.sendIntent('android.settings.WIRELESS_SETTINGS');
          })
        }
      />
      <Section title={`Telefonlar · ${peers.length}`} />
      {peers.length ? (
        peers.map(p => (
          <Panel key={p.id}>
            <View
              style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
            >
              <Smartphone size={24} color={c.primary} />
              <View style={{ flex: 1 }}>
                <Label weight="600">{p.name}</Label>
                <Label size={12} color={c.muted}>
                  {p.state === 'connected'
                    ? 'Bağlı · kodla doğrulanmış bağlantı'
                    : p.state === 'confirm'
                    ? 'Kod doğrulaması bekliyor'
                    : p.state === 'connecting'
                    ? 'Bağlantı kuruluyor…'
                    : 'Yakında bulundu'}
                </Label>
              </View>
            </View>
            {p.state === 'found' && (
              <Button
                title="Bağlan"
                tone="outline"
                icon={Link}
                onPress={() => safely(() => connectPeer(p.id))}
              />
            )}
            {p.state === 'confirm' && (
              <>
                <Label
                  size={32}
                  weight="700"
                  style={{ letterSpacing: 4, textAlign: 'center' }}
                >
                  {p.code}
                </Label>
                <Label size={13} color={c.muted}>
                  İki telefonda aynı kod görünüyor mu? Karşılaştırmadan kabul
                  etmeyin.
                </Label>
                <Button
                  title="Kod aynı, kabul et"
                  icon={Check}
                  onPress={() => safely(() => confirmPeer(p.id, true))}
                />
                <Button
                  title="Reddet"
                  tone="outline"
                  onPress={() => safely(() => confirmPeer(p.id, false))}
                />
              </>
            )}
          </Panel>
        ))
      ) : (
        <Empty
          icon={Radio}
          title={
            running
              ? 'Henüz telefon bulunamadı'
              : 'Ağ açıldığında burada görünür'
          }
          body={
            running
              ? 'Diğer telefonda aynı uygulamayı açın, Bluetooth ve Wi-Fi’ı kontrol edin. Emülatör gerçek radyo bağlantısını doğrulamaz.'
              : 'İzin vermek ve ağı açmak sizin kontrolünüzde. Tek telefonla tatbikatı deneyebilirsiniz.'
          }
        />
      )}
      <Panel>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Battery size={23} color={c.primary} />
          <Label size={18} weight="600">
            {label}
          </Label>
        </View>
        <Label size={14} color={c.muted}>
          {mode === 'ACTIVE_RELAY'
            ? '5 sn tarama, 10 sn mola. Geçerli mesajlar öncelik sırasıyla taşınır.'
            : mode === 'CONSERVATIVE_NODE'
            ? '5 sn tarama, 25 sn mola. Yalnızca acil mesajlar aktarılır.'
            : 'Tarama kapalı. Mevcut bağlantıda yalnızca kendi SOS’unuz iletilir. Yakındaki cihazın bağlantı başlatması gerekir.'}
        </Label>
        <Label size={12} color={c.muted}>
          Pil {device.battery < 0 ? 'ölçülemedi' : `%${device.battery}`}{' '}
          {device.charging ? '· Şarjda' : ''}. Ağ yalnızca uygulama öndeyken
          çalışır; arka plana geçince kapanır.
        </Label>
      </Panel>
      <Button
        title="Tek telefonla ağ tatbikatı"
        icon={Play}
        onPress={a.exercise}
      />
      <Button
        title="Yerel kayıt özetini dışa aktar"
        tone="outline"
        icon={Download}
        onPress={() =>
          safely(async () => {
            await Native.exportData(
              JSON.stringify(
                {
                  application: 'BitChat',
                  exportedAt: new Date().toISOString(),
                  note: 'Yerel kayıt; kurum teslimi kanıtı değildir. Ortak kanal mesajları ve isteğe bağlı koordinatlar içerir.',
                  messages: data.messages.map(m => ({
                    ...m.message,
                    localStatus: m.status,
                  })),
                  points: data.points,
                  listings: data.listings,
                },
                null,
                2,
              ),
            );
          })
        }
      />
      <Label size={12} color={c.muted}>
        Bağlantılar Nearby tarafından şifrelenir. Ortak kanal çok atlamalı uçtan
        uca gizlilik sağlamaz. İmzalar cihaz kökenini doğrular; görünen kişi
        adını doğrulamaz. Kurum eşitlemesi, drone ve ultrasonik aktarım bu
        sürümde yoktur.
      </Label>
    </>
  );
}
export function ExerciseSheet({ onClose }: { onClose: () => void }) {
  const c = useTheme(),
    [state, setState] = useState(initialExercise);
  return (
    <Sheet
      title="Ağ tatbikatı"
      subtitle="Sanal A, B, C telefonları · Gerçek mesaj gönderilmez"
      onClose={onClose}
    >
      <Panel style={{ backgroundColor: c.soft }}>
        <Label size={14} weight="600">
          Bir SOS, üç telefon.
        </Label>
        <Label size={14} color={c.muted}>
          Bağlantıyı kesin veya B’nin pilini azaltın. Paket bekler; koşullar
          düzelince ilerler. Bu görselleştirme fiziksel radyo testi değildir.
        </Label>
      </Panel>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
        }}
      >
        {['A', 'B', 'C'].map((name, i) => (
          <React.Fragment key={name}>
            {i > 0 && (
              <View
                style={{
                  height: 2,
                  flex: 1,
                  backgroundColor: state.step >= i ? c.primary : c.line,
                  marginHorizontal: 8,
                }}
              />
            )}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 64,
                  height: 76,
                  borderRadius: 16,
                  backgroundColor: state.step >= i ? c.primary : c.soft,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Smartphone
                  size={26}
                  color={state.step >= i ? c.onPrimary : c.muted}
                />
                <Label
                  size={18}
                  weight="700"
                  color={state.step >= i ? c.onPrimary : c.muted}
                >
                  {name}
                </Label>
              </View>
              <Label size={11} color={c.muted}>
                {i === 0 ? 'Gönderen' : i === 1 ? 'Taşıyıcı' : 'Alıcı'}
              </Label>
            </View>
          </React.Fragment>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Label size={15} style={{ flex: 1 }}>
          B bağlantısı açık
        </Label>
        <Switch
          accessibilityLabel="Tatbikatta B bağlantısı açık"
          value={state.online}
          onValueChange={online => setState(s => ({ ...s, online }))}
          trackColor={{ true: c.primary, false: c.line }}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Label size={15} style={{ flex: 1 }}>
          B düşük pilde (%12)
        </Label>
        <Switch
          accessibilityLabel="Tatbikatta düşük pil"
          value={state.lowBattery}
          onValueChange={lowBattery => setState(s => ({ ...s, lowBattery }))}
          trackColor={{ true: c.primary, false: c.line }}
        />
      </View>
      <Button
        title={
          state.delivered ? 'Tatbikat tamamlandı' : 'Bir sonraki adımı çalıştır'
        }
        disabled={state.delivered}
        icon={Play}
        onPress={() => setState(advanceExercise)}
      />
      <Button
        title="Tatbikatı sıfırla"
        tone="outline"
        icon={RotateCcw}
        onPress={() => setState(initialExercise())}
      />
      <Label size={14} weight="600">
        {state.delivered
          ? 'Sanal alıcıdan onay alındı'
          : `Adım ${state.step}/3 · ${state.copies} sanal kopya`}
      </Label>
      {state.events.length ? (
        state.events.map((event, i) => (
          <View
            key={`${i}-${event}`}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: c.primary,
                marginTop: 7,
              }}
            />
            <Label size={13} color={c.muted} style={{ flex: 1 }}>
              {event}
            </Label>
          </View>
        ))
      ) : (
        <Label size={13} color={c.muted}>
          Başlamak için bir sonraki adımı çalıştırın.
        </Label>
      )}
    </Sheet>
  );
}
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const c = useTheme(),
    { data, identity, running } = useStore();
  const [name, setName] = useState(data.preferences.name),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  return (
    <Sheet
      title="Size ait bir ağ"
      subtitle="Tercihler bu cihazda saklanır."
      onClose={onClose}
    >
      <Field
        label="Görünen adınız"
        value={name}
        onChangeText={setName}
        placeholder="Komşularınızın göreceği ad"
        maxLength={30}
      />
      <Button
        title="Adı kaydet"
        icon={Check}
        busy={saving}
        onPress={async () => {
          setSaving(true);
          setError('');
          try {
            if (running) {
              await stopNetwork();
            }
            await updatePreferences({ name: name.trim() });
            notify(
              'Adınız kaydedildi. Ağı yeni adınızla tekrar açabilirsiniz.',
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
          } finally {
            setSaving(false);
          }
        }}
      />
      {error ? (
        <Label size={14} color={c.red}>
          {error}
        </Label>
      ) : null}
      <Label weight="600">Görünüm</Label>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {(
          [
            { id: 'system', label: 'Cihaz' },
            { id: 'light', label: 'Açık' },
            { id: 'dark', label: 'Koyu' },
          ] as const
        ).map(item => (
          <Chip
            text={item.label}
            key={item.id}
            selected={data.preferences.theme === item.id}
            onPress={() => safely(() => updatePreferences({ theme: item.id }))}
          />
        ))}
      </View>
      <Panel style={{ backgroundColor: c.background }}>
        <Label size={16} weight="600">
          Gizlilik, açıkça.
        </Label>
        <Label size={14} color={c.muted}>
          Hesap, telefon numarası veya merkezi sunucu gerekmez. Anahtarınız
          Android Keystore’da tutulur. Mesajlar ortak kanaldadır; özel bilgi
          yazmayın. Konum yalnızca gönderirken seçerseniz eklenir.
        </Label>
        <Label size={12} color={c.muted}>
          Cihaz kimliği: {identity?.sender || 'Hazırlanıyor'}
        </Label>
        <Label size={12} color={c.muted}>
          Nearby SDK, Google kullanım ve tanılama ayarınıza bağlı tanılama
          toplayabilir.
        </Label>
      </Panel>
      <Button
        title="Uygulama izinlerini aç"
        icon={Settings}
        tone="outline"
        onPress={() => safely(() => Linking.openSettings())}
      />
      <Button
        title="Süresi dolan mesajları temizle"
        icon={Trash2}
        tone="outline"
        onPress={() =>
          Alert.alert(
            'Eski mesajlar silinsin mi?',
            '24 saatlik iletim süresi dolmuş mesajlar bu cihazdan kaldırılır. Bu işlem geri alınamaz.',
            [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Temizle',
                style: 'destructive',
                onPress: () =>
                  safely(async () => {
                    await commit(d => ({
                      ...d,
                      messages: d.messages.filter(
                        m => m.message.expiresAt > Date.now(),
                      ),
                    }));
                    notify('Süresi dolan mesajlar temizlendi.');
                  }),
              },
            ],
          )
        }
      />
      <Label size={12} color={c.muted}>
        BitChat 1.0 · Android saha prototipi{'\n'}Acil servis yerine geçmez.
        Gerçek cihaz menzili ve teslimi ortam koşullarına bağlıdır.
      </Label>
    </Sheet>
  );
}
export function MessageSheet({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const c = useTheme(),
    item = useStore(s => s.data.messages.find(m => m.message.id === id));
  if (!item) {
    return (
      <Sheet title="Mesaj bulunamadı" onClose={onClose}>
        <Label>Mesaj bu cihazdan kaldırılmış olabilir.</Label>
      </Sheet>
    );
  }
  return (
    <Sheet
      title={item.message.kind === 'sos' ? 'SOS ayrıntısı' : 'Mesaj ayrıntısı'}
      subtitle={`${
        item.direction === 'out' ? 'Siz' : item.message.name
      } · ${stamp(item.message.createdAt)} ${time(item.message.createdAt)}`}
      onClose={onClose}
    >
      <Label
        size={13}
        color={item.message.priority === 1 ? c.orange : c.primary}
        weight="700"
      >
        {priorityLabel(item.message.priority)}
      </Label>
      <Label size={19}>{item.message.text}</Label>
      <Panel style={{ backgroundColor: c.soft }}>
        <ShieldCheck size={25} color={c.primary} />
        <Label size={15} weight="600">
          {item.direction === 'in'
            ? 'Bu cihaza alındı; imza doğrulandı'
            : item.status === 'received'
            ? 'Yakındaki telefondan alındı onayı var'
            : 'Bu cihazda kayıtlı; alındı onayı bekleniyor'}
        </Label>
        <Label size={13} color={c.muted}>
          {item.direction === 'out' && item.status === 'received'
            ? `${item.receipts.length} yakın bağlantıdan uygulama düzeyinde onay alındı. Bu, AFAD veya hedef kişiye teslim edildiği anlamına gelmez.`
            : 'Kurum teslimi veya bir kurtarma ekibinin gördüğü doğrulanmış değildir.'}
        </Label>
      </Panel>
      {item.message.coordinates && (
        <Label size={14}>
          Eklenen konum: {item.message.coordinates.latitude.toFixed(6)},{' '}
          {item.message.coordinates.longitude.toFixed(6)}
        </Label>
      )}
      <Label size={12} color={c.muted}>
        Cihaz: {item.message.sender}
        {'\n'}Atlama: {item.hops}/{item.message.maxHops}
        {'\n'}İletim sonu: {stamp(item.message.expiresAt)}{' '}
        {time(item.message.expiresAt)}
        {'\n'}Kimlik: {item.message.id}
      </Label>
      <Button
        title="Metni paylaş"
        icon={Send}
        tone="outline"
        onPress={() =>
          safely(async () => {
            await Share.share({
              message: `${item.message.text}${
                item.message.coordinates
                  ? `\n${item.message.coordinates.latitude}, ${item.message.coordinates.longitude}`
                  : ''
              }\nBitChat yerel mesajı; kurum teslimi doğrulanmadı.`,
            });
          })
        }
      />
    </Sheet>
  );
}
