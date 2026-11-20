import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StatusBar,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  MessageCircle,
  Map,
  HeartHandshake,
  Radio,
  X,
  RefreshCw,
} from 'lucide-react-native';
import { initialize, notify, safely, useStore } from './src/state/store';
import { batteryMode } from './src/core/AutonomousMeshEngine';
import {
  ThemeContext,
  light,
  dark,
  Label,
  Button,
  useTheme,
} from './src/ui/theme';
import {
  Actions,
  AidScreen,
  Brand,
  ExerciseSheet,
  HomeScreen,
  MapScreen,
  MessageSheet,
  MessagesScreen,
  NetworkScreen,
  SettingsSheet,
  Tab,
} from './src/ui/Screens';
import { AidSheet, ComposeSheet, PointSheet } from './src/ui/Sheets';

const tabs = [
  { id: 'home', text: 'Ana sayfa', icon: Home },
  { id: 'messages', text: 'Mesajlar', icon: MessageCircle },
  { id: 'map', text: 'Harita', icon: Map },
  { id: 'aid', text: 'Dayanışma', icon: HeartHandshake },
  { id: 'network', text: 'Ağ', icon: Radio },
] as const;
type ActiveSheet =
  | 'compose'
  | 'sos'
  | 'aid'
  | 'point'
  | 'settings'
  | 'exercise'
  | { message: string }
  | null;
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: '#F5F6F0',
            justifyContent: 'center',
            padding: 32,
            gap: 16,
          }}
        >
          <Label size={24} weight="700">
            Ekran yüklenemedi
          </Label>
          <Label>
            Yerel kayıtlarınız silinmedi. Ekranı yeniden açmayı deneyin.
          </Label>
          <Button
            title="Yeniden dene"
            onPress={() => this.setState({ error: false })}
          />
        </View>
      );
    }
    return this.props.children;
  }
}
function Shell() {
  const c = useTheme(),
    { ready, fatal, notice, device, peers } = useStore();
  const [tab, setTab] = useState<Tab>('home'),
    [sheet, setSheet] = useState<ActiveSheet>(null);
  const scroll = useRef<ScrollView>(null),
    { width } = useWindowDimensions();
  const wide = width >= 700;
  const navigate = (next: Tab) => {
    setTab(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const a: Actions = {
    navigate,
    compose: () => setSheet('compose'),
    sos: () => setSheet('sos'),
    aid: () => setSheet('aid'),
    point: () => setSheet('point'),
    settings: () => setSheet('settings'),
    exercise: () => setSheet('exercise'),
    message: m => setSheet({ message: m.message.id }),
  };
  useEffect(() => {
    void initialize();
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) {
        setSheet(null);
        return true;
      }
      if (tab !== 'home') {
        navigate('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [sheet, tab]);
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => notify(null), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  const confirm = peers.filter(p => p.state === 'confirm').length;
  if (!ready) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: c.background,
          justifyContent: 'center',
          padding: 32,
          gap: 20,
        }}
      >
        <Brand />
        <Label size={25} weight="700">
          {fatal ? 'Kayıtlar açılamadı' : 'Yerel alanınız hazırlanıyor'}
        </Label>
        <Label color={c.muted}>
          {fatal || 'Hesap yok. Sunucu yok. Veriler bu cihazda.'}
        </Label>
        {fatal ? (
          <Button
            title="Yeniden dene"
            icon={RefreshCw}
            onPress={() => safely(initialize)}
          />
        ) : (
          <ActivityIndicator color={c.primary} />
        )}
      </SafeAreaView>
    );
  }
  const nav = (
    <View
      style={{
        flexDirection: wide ? 'column' : 'row',
        gap: wide ? 12 : 0,
        paddingHorizontal: wide ? 12 : 4,
        paddingVertical: 8,
        backgroundColor: c.surface,
        borderTopWidth: wide ? 0 : 1,
        borderColor: c.line,
        width: wide ? 106 : undefined,
      }}
    >
      {tabs.map(item => {
        const active = tab === item.id,
          Icon = item.icon;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.text}
            accessibilityState={{ selected: active }}
            onPress={() => navigate(item.id)}
            style={{
              flex: wide ? undefined : 1,
              minHeight: 64,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <View
              style={{
                paddingHorizontal: 15,
                paddingVertical: 5,
                borderRadius: 18,
                backgroundColor: active ? c.soft : 'transparent',
              }}
            >
              <Icon
                size={22}
                color={active ? c.primary : c.muted}
                strokeWidth={active ? 2.2 : 1.7}
              />
              {item.id === 'network' && confirm > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: 0,
                    width: 8,
                    height: 8,
                    backgroundColor: c.orange,
                    borderRadius: 4,
                  }}
                />
              )}
            </View>
            <Label
              size={10}
              weight={active ? '700' : '400'}
              color={active ? c.primary : c.muted}
              lines={1}
            >
              {item.text}
            </Label>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={{ flex: 1, backgroundColor: c.surface }}
    >
      <StatusBar
        barStyle={c.dark ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
      />
      <View
        style={{
          flex: 1,
          flexDirection: wide ? 'row' : 'column',
          backgroundColor: c.background,
        }}
      >
        {wide && nav}
        <View style={{ flex: 1 }}>
          {batteryMode(device.battery, device.charging) === 'SURVIVAL_MODE' &&
            device.battery >= 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Düşük pil, SOS oluştur"
                onPress={a.sos}
                style={{ padding: 12, backgroundColor: '#000000' }}
              >
                <Label size={13} color="#FFFFFF" weight="600">
                  Pil %{device.battery} · Tarama kapalı · SOS oluştur
                </Label>
              </Pressable>
            )}
          {confirm > 0 && tab !== 'network' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate('network')}
              style={{ backgroundColor: c.orangeSoft, padding: 14 }}
            >
              <Label size={14} color={c.orange} weight="600">
                {confirm} telefon kod doğrulaması bekliyor. Ağı açın.
              </Label>
            </Pressable>
          )}
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: width < 360 ? 16 : 24,
              paddingBottom: 28,
              gap: 16,
              maxWidth: 760,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            {tab === 'home' ? (
              <HomeScreen a={a} />
            ) : tab === 'messages' ? (
              <MessagesScreen a={a} />
            ) : tab === 'map' ? (
              <MapScreen a={a} />
            ) : tab === 'aid' ? (
              <AidScreen a={a} />
            ) : (
              <NetworkScreen a={a} />
            )}
          </ScrollView>
          {notice && (
            <View
              accessibilityLiveRegion="polite"
              style={{
                position: 'absolute',
                bottom: 12,
                left: 16,
                right: 16,
                backgroundColor: c.ink,
                padding: 14,
                paddingRight: 4,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                maxWidth: 700,
                alignSelf: 'center',
              }}
            >
              <Label size={13} color={c.background} style={{ flex: 1 }}>
                {notice}
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Bildirimi kapat"
                onPress={() => notify(null)}
                style={{
                  width: 48,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X color={c.background} size={20} />
              </Pressable>
            </View>
          )}
        </View>
        {!wide && nav}
      </View>
      {sheet === 'compose' && <ComposeSheet onClose={() => setSheet(null)} />}
      {sheet === 'sos' && <ComposeSheet sos onClose={() => setSheet(null)} />}
      {sheet === 'aid' && <AidSheet onClose={() => setSheet(null)} />}
      {sheet === 'point' && <PointSheet onClose={() => setSheet(null)} />}
      {sheet === 'settings' && <SettingsSheet onClose={() => setSheet(null)} />}
      {sheet === 'exercise' && <ExerciseSheet onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && (
        <MessageSheet id={sheet.message} onClose={() => setSheet(null)} />
      )}
    </SafeAreaView>
  );
}
function ThemedApp() {
  const system = useColorScheme(),
    preference = useStore(s => s.data.preferences.theme),
    device = useStore(s => s.device);
  const isDark =
    preference === 'dark' || (preference === 'system' && system === 'dark');
  const survival =
    device.battery >= 0 && !device.charging && device.battery < 20;
  const theme = survival
    ? { ...dark, background: '#000000', surface: '#080808' }
    : isDark
    ? dark
    : light;
  return (
    <ThemeContext.Provider value={theme}>
      <Boundary>
        <Shell />
      </Boundary>
    </ThemeContext.Provider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemedApp />
    </SafeAreaProvider>
  );
}
