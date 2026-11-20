import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  View,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  MapPin,
  Send,
  Siren,
  HeartHandshake,
  LocateFixed,
} from 'lucide-react-native';
import {
  Button,
  Chip,
  Field,
  IconButton,
  Label,
  Panel,
  useTheme,
} from './theme';
import {
  addPoint,
  locate,
  safely,
  sendMessage,
  useStore,
} from '../state/store';
import { OfflineAiClassifier } from '../core/OfflineAiClassifier';
import { MapPoint, Priority, Resource } from '../core/types';

export function Sheet({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const c = useTheme();
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (Keyboard.isVisible()) {Keyboard.dismiss();} else {onClose();}
      }}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          backgroundColor: '#00000070',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            maxHeight: '94%',
            width: '100%',
            maxWidth: 700,
            alignSelf: 'center',
            flexShrink: 1,
          }}
        >
          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              flexShrink: 1,
            }}
          >
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Label size={24} weight="700">
                  {title}
                </Label>
                {subtitle && (
                  <Label color={c.muted} size={13}>
                    {subtitle}
                  </Label>
                )}
              </View>
              <IconButton icon={X} label="Pencereyi kapat" onPress={onClose} />
            </View>
            <ScrollView
              style={{flexShrink: 1}}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 24, paddingTop: 12, gap: 18 }}
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function ComposeSheet({
  sos = false,
  onClose,
}: {
  sos?: boolean;
  onClose: () => void;
}) {
  const c = useTheme(),
    coordinates = useStore(s => s.coordinates),
    locating = useStore(s => s.locating);
  const [text, setText] = useState(sos ? 'Acil yardıma ihtiyacım var. ' : '');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [share, setShare] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const analysis = OfflineAiClassifier.classify(text);
  const selected = sos ? 1 : priority ?? analysis.priority;
  const close = () => {
    if (!busy) {
      onClose();
    }
  };
  const send = async () => {
    setBusy(true);
    setError('');
    try {
      await sendMessage(text, {
        kind: sos ? 'sos' : 'message',
        priority: selected,
        shareLocation: share,
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Mesaj kaydedilemedi. Yeniden deneyin.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      title={sos ? 'Acil yardım çağrısı' : 'Yeni mesaj'}
      subtitle={
        sos
          ? 'Konumunuzu ve ihtiyacınızı kontrol edin.'
          : 'Yakındaki dayanışma ağına yazın.'
      }
      onClose={close}
    >
      {sos && (
        <Panel style={{ backgroundColor: c.orangeSoft }}>
          <Siren color={c.orange} size={26} />
          <Label size={14} color={c.ink}>
            SOS cihaza kaydedilir; bağlantı kurulunca yakındaki telefonlara
            iletilir. 112 / AFAD’a otomatik gönderilmez.
          </Label>
        </Panel>
      )}
      {!sos && (
        <Label color={c.muted} size={14}>
          Ortak kanal. Mesajınızı aktaran kişiler okuyabilir; özel bilgi
          paylaşmayın.
        </Label>
      )}
      <Field
        label={sos ? 'Neredesiniz, neye ihtiyacınız var?' : 'Mesajınız'}
        value={text}
        onChangeText={setText}
        placeholder="Örn. İki kişiyiz, suya ihtiyacımız var."
        multiline
        maxLength={600}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label size={12} color={c.muted}>
          Cihaz içi kurallarla önceliklendirme
        </Label>
        <Label size={12} color={c.muted}>
          {text.length}/600
        </Label>
      </View>
      {!sos && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              { p: 3, title: 'Genel' },
              { p: 2, title: 'İhtiyaç' },
              { p: 1, title: 'Acil' },
            ] as const
          ).map(item => (
            <Chip
              key={item.p}
              text={item.title}
              selected={selected === item.p}
              onPress={() => setPriority(item.p)}
            />
          ))}
        </View>
      )}
      <View
        style={{
          backgroundColor: c.background,
          padding: 16,
          borderRadius: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <MapPin size={22} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Label weight="600" size={15}>
              Konum ekle
            </Label>
            <Label size={12} color={c.muted}>
              {coordinates
                ? `Son ölçüm ±${Math.round(coordinates.accuracy)} m`
                : 'Konumsuz da gönderebilirsiniz'}
            </Label>
          </View>
          <Switch
            accessibilityLabel="Mesaja konum ekle"
            value={share}
            onValueChange={setShare}
            trackColor={{ false: c.line, true: c.primary }}
            thumbColor={c.surface}
          />
        </View>
        {share && (
          <Button
            tone="outline"
            title={
              locating
                ? 'Konum alınıyor…'
                : coordinates
                ? 'Konumu yenile'
                : 'Konumumu al'
            }
            icon={LocateFixed}
            busy={locating}
            onPress={() => safely(locate)}
          />
        )}
      </View>
      {error ? (
        <Label color={c.red} size={14}>
          {error}
        </Label>
      ) : null}
      <Button
        title={sos ? 'SOS’u kaydet ve ilet' : 'Mesajı kaydet ve ilet'}
        tone={sos ? 'danger' : 'primary'}
        icon={sos ? Siren : Send}
        busy={busy}
        disabled={!text.trim()}
        onPress={send}
      />
      <Label size={12} color={c.muted}>
        “Kaydedildi” teslim edildi demek değildir. Alındı onayı mesaj
        ayrıntısında görünür.
      </Label>
    </Sheet>
  );
}
export function AidSheet({ onClose }: { onClose: () => void }) {
  const c = useTheme();
  const [intent, setIntent] = useState<'need' | 'offer'>('need'),
    [resource, setResource] = useState<Resource>('Su');
  const [quantity, setQuantity] = useState(''),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (!quantity.trim()) {
        throw new Error('Miktar veya kişi sayısı girin.');
      }
      if (!text.trim()) {
        throw new Error('Kısa bir açıklama girin.');
      }
      const summary = `${resource} ${
        intent === 'need' ? 'ihtiyacı' : 'paylaşımı'
      } · ${quantity.trim()}: ${text.trim()}`;
      await sendMessage(summary, {
        kind: 'aid',
        priority: 2,
        shareLocation: false,
        listing: {
          intent,
          resource,
          quantity: quantity.trim(),
          text: text.trim(),
        },
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İlan kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      title="Dayanışmaya katıl"
      subtitle="Bir ihtiyaç, bir paylaşım, daha güçlü bir mahalle."
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip
          text="İhtiyacım var"
          selected={intent === 'need'}
          onPress={() => setIntent('need')}
        />
        <Chip
          text="Paylaşabilirim"
          selected={intent === 'offer'}
          onPress={() => setIntent('offer')}
        />
      </View>
      <Label size={14} weight="600">
        Kaynak türü
      </Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(
          ['Su', 'Gıda', 'Barınma', 'Sağlık', 'Enerji', 'Diğer'] as Resource[]
        ).map(r => (
          <Chip
            text={r}
            key={r}
            selected={resource === r}
            onPress={() => setResource(r)}
          />
        ))}
      </View>
      <Field
        label="Miktar / kişi sayısı"
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Örn. 5 litre, 2 kişi"
        maxLength={40}
      />
      <Field
        label="Açıklama"
        value={text}
        onChangeText={setText}
        placeholder="Neye ihtiyacınız var veya ne paylaşabilirsiniz?"
        multiline
        maxLength={450}
      />
      <Label size={13} color={c.muted}>
        Ortak kanalda paylaşılır. Acil yardım puana veya takasa bağlı değildir.
        İlanı kapatmak yerel durumunu değiştirir.
      </Label>
      {error ? (
        <Label color={c.red} size={14}>
          {error}
        </Label>
      ) : null}
      <Button
        title="İlanı kaydet ve paylaş"
        icon={HeartHandshake}
        busy={busy}
        onPress={save}
      />
    </Sheet>
  );
}
export function PointSheet({ onClose }: { onClose: () => void }) {
  const c = useTheme(),
    location = useStore(s => s.coordinates),
    locating = useStore(s => s.locating);
  const [title, setTitle] = useState(''),
    [latitude, setLatitude] = useState(location?.latitude.toString() || ''),
    [longitude, setLongitude] = useState(location?.longitude.toString() || '');
  const [category, setCategory] = useState<MapPoint['category']>('meeting'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const fromDevice = async () => {
    await locate();
    const current = useStore.getState().coordinates;
    if (current) {
      setLatitude(current.latitude.toString());
      setLongitude(current.longitude.toString());
    }
  };
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (!latitude.trim() || !longitude.trim()) {
        throw new Error('Koordinat girin veya cihaz konumunu alın.');
      }
      await addPoint({
        title,
        category,
        latitude: Number(latitude.replace(',', '.')),
        longitude: Number(longitude.replace(',', '.')),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nokta kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      title="Haritaya nokta ekle"
      subtitle="Sizin kaydınız; resmi veya doğrulanmış tesis değildir."
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <Field
        label="Nokta adı"
        value={title}
        onChangeText={setTitle}
        placeholder="Örn. Apartman önü buluşma noktası"
        maxLength={60}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(
          [
            { id: 'meeting', text: 'Toplanma' },
            { id: 'water', text: 'Su' },
            { id: 'medical', text: 'Sağlık' },
            { id: 'hazard', text: 'Tehlike' },
          ] as const
        ).map(x => (
          <Chip
            key={x.id}
            text={x.text}
            selected={category === x.id}
            onPress={() => setCategory(x.id)}
          />
        ))}
      </View>
      <Button
        tone="outline"
        title="Cihaz konumunu kullan"
        icon={LocateFixed}
        busy={locating}
        onPress={() => safely(fromDevice)}
      />
      <Field
        label="Enlem (−90 ile 90)"
        value={latitude}
        onChangeText={setLatitude}
        placeholder="40.9904"
        keyboardType="default"
        maxLength={20}
      />
      <Field
        label="Boylam (−180 ile 180)"
        value={longitude}
        onChangeText={setLongitude}
        placeholder="29.0270"
        keyboardType="default"
        maxLength={20}
      />
      <Label size={13} color={c.muted}>
        Bu nokta yalnızca bu cihazda saklanır. Navigasyon veya yol tarifi
        sağlamaz.
      </Label>
      {error ? (
        <Label color={c.red} size={14}>
          {error}
        </Label>
      ) : null}
      <Button title="Noktayı kaydet" icon={MapPin} busy={busy} onPress={save} />
    </Sheet>
  );
}
