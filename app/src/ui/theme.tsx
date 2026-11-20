import React, { createContext, useContext } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  TextStyle,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export const light = {
  background: '#F5F6F0',
  surface: '#FFFFFF',
  ink: '#193C34',
  muted: '#53685E',
  primary: '#285E49',
  onPrimary: '#FFFFFF',
  soft: '#E3EDDF',
  line: '#D5DED3',
  orange: '#C54822',
  orangeSoft: '#FCE9DE',
  red: '#B52E35',
  redSoft: '#FCE8E7',
  map: '#E5EBE0',
  water: '#BDDBDD',
  road: '#FFFFFF',
  dark: false,
};
export const dark = {
  background: '#101B17',
  surface: '#1A2A23',
  ink: '#EFF5EC',
  muted: '#B3C3B5',
  primary: '#B6D8A8',
  onPrimary: '#163625',
  soft: '#2A4032',
  line: '#425347',
  orange: '#FFAA85',
  orangeSoft: '#4A2B21',
  red: '#FF9D9F',
  redSoft: '#4E2529',
  map: '#263A2D',
  water: '#33595B',
  road: '#53665A',
  dark: true,
};
export type Theme = typeof light;
export const ThemeContext = createContext<Theme>(light);
export const useTheme = () => useContext(ThemeContext);
export function Label({
  children,
  style,
  color,
  size = 16,
  weight = '400',
  lines,
}: {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  color?: string;
  size?: number;
  weight?: TextStyle['fontWeight'];
  lines?: number;
}) {
  const c = useTheme();
  return (
    <Text
      numberOfLines={lines}
      style={[
        {
          color: color || c.ink,
          fontSize: size,
          fontWeight: weight,
          lineHeight: size * 1.4,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  icon: Icon,
  tone = 'primary',
  busy,
  disabled,
  compact,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  icon?: LucideIcon;
  tone?: 'primary' | 'soft' | 'outline' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useTheme();
  const background =
    tone === 'primary'
      ? c.primary
      : tone === 'danger'
      ? c.orange
      : tone === 'soft'
      ? c.soft
      : 'transparent';
  const color =
    tone === 'primary'
      ? c.onPrimary
      : tone === 'danger'
      ? c.dark
        ? '#29160D'
        : '#FFFFFF'
      : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: tone === 'outline' ? c.line : background,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        compact && { paddingHorizontal: 14 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : Icon ? (
        <Icon size={19} color={color} strokeWidth={1.8} />
      ) : null}
      <Label color={color} weight="600" size={14} style={{ flexShrink: 1 }}>
        {title}
      </Label>
    </Pressable>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: pressed ? c.soft : 'transparent',
      })}
    >
      <Icon size={22} color={c.ink} strokeWidth={1.8} />
    </Pressable>
  );
}
export function Chip({
  text,
  selected,
  onPress,
  icon: Icon,
}: {
  text: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
}) {
  const c = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? c.primary : c.surface,
          borderColor: selected ? c.primary : c.line,
        },
      ]}
    >
      {Icon && <Icon size={16} color={selected ? c.onPrimary : c.muted} />}
      <Label size={13} weight="600" color={selected ? c.onPrimary : c.muted}>
        {text}
      </Label>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'decimal-pad' | 'default';
  maxLength?: number;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Label size={14} weight="600">
        {label}
      </Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={{
          backgroundColor: c.background,
          color: c.ink,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: 12,
          padding: 16,
          fontSize: 16,
          minHeight: multiline ? 130 : 54,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
export function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const c = useTheme();
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderRadius: 16, padding: 20, gap: 12 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={{ paddingVertical: 28, alignItems: 'center', gap: 12 }}>
      <View style={{ backgroundColor: c.soft, padding: 18, borderRadius: 24 }}>
        <Icon size={30} color={c.primary} strokeWidth={1.5} />
      </View>
      <Label size={18} weight="600" style={{ textAlign: 'center' }}>
        {title}
      </Label>
      <Label
        size={14}
        color={c.muted}
        style={{ textAlign: 'center', maxWidth: 310 }}
      >
        {body}
      </Label>
      {action}
    </View>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const c = useTheme();
  return (
    <View style={styles.section}>
      <Label size={20} weight="700" style={{ flex: 1 }}>
        {title}
      </Label>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 48, justifyContent: 'center', paddingLeft: 12 }}
        >
          <Label size={14} weight="600" color={c.primary}>
            {action}
          </Label>
        </Pressable>
      )}
    </View>
  );
}
export const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  chip: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
