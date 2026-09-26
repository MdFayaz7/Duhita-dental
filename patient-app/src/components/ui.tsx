/** Small building blocks shared by every clinic screen. */
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { clinic, radius, shadow, space, type } from '../theme';

export const openUrl = (url: string) => Linking.openURL(url).catch(() => {});

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.screenContent, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <View style={s.sectionTitle}>
      {!!eyebrow && <Text style={type.label}>{eyebrow}</Text>}
      <Text style={[type.h2, eyebrow ? { marginTop: 6 } : null]}>{title}</Text>
      {!!sub && <Text style={[type.body, { marginTop: 6 }]}>{sub}</Text>}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'solid', loading, disabled, style }: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.btn,
        variant === 'solid' && s.btnSolid,
        variant === 'outline' && s.btnOutline,
        variant === 'ghost' && s.btnGhost,
        variant === 'danger' && s.btnDanger,
        pressed && !off && { transform: [{ scale: 0.985 }] },
        off && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'solid' || variant === 'danger' ? '#fff' : clinic.slate} />
      ) : (
        <Text
          style={[
            s.btnText,
            (variant === 'solid' || variant === 'danger') && { color: '#fff' },
            variant === 'ghost' && { color: clinic.slate },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
      {!!error ? <Text style={s.error}>{error}</Text> : !!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

export function Input({ invalid, style, ...props }: TextInputProps & { invalid?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={clinic.stone}
      style={[s.input, invalid && { borderColor: clinic.danger }, style]}
      {...props}
    />
  );
}

export function Chip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.chip, active && s.chipOn, disabled && s.chipOff]}
    >
      <Text style={[s.chipText, active && { color: '#fff' }, disabled && { color: clinic.stone }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const tones = {
    neutral: { bg: clinic.ivoryDeep, fg: clinic.ink },
    good: { bg: clinic.successBg, fg: clinic.success },
    warn: { bg: '#fff4e5', fg: '#a15c07' },
    bad: { bg: clinic.dangerBg, fg: clinic.danger },
  }[tone];
  return (
    <View style={[s.pill, { backgroundColor: tones.bg }]}>
      <Text style={[s.pillText, { color: tones.fg }]}>{text}</Text>
    </View>
  );
}

export function Notice({ text, tone = 'bad' }: { text: string; tone?: 'bad' | 'good' }) {
  return (
    <View style={[s.notice, tone === 'good' && { backgroundColor: clinic.successBg, borderColor: '#bfe3cf' }]}>
      <Text style={[s.noticeText, tone === 'good' && { color: clinic.success }]}>{text}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.sm }, style]}>{children}</View>;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 28, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={clinic.slate} />
      {!!label && <Text style={type.small}>{label}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: clinic.ivory },
  screenContent: { padding: space.md, paddingBottom: space.xl, gap: space.md },
  card: {
    backgroundColor: clinic.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: clinic.line,
    ...shadow.card,
  },
  sectionTitle: { marginTop: space.xs },
  btn: {
    minHeight: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  btnSolid: { backgroundColor: clinic.slate },
  btnOutline: { borderWidth: 1, borderColor: clinic.slate },
  btnGhost: { backgroundColor: 'transparent', minHeight: 40 },
  btnDanger: { backgroundColor: clinic.danger },
  btnText: { fontSize: 15, fontWeight: '700', color: clinic.slate },
  fieldLabel: { fontSize: 13.5, fontWeight: '600', color: clinic.ink },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#b9c3cc',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontSize: 16,
    color: clinic.ink,
  },
  hint: { fontSize: 12.5, color: clinic.stone },
  error: { fontSize: 12.5, color: clinic.danger },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#b9c3cc',
    backgroundColor: '#fff',
  },
  chipOn: { backgroundColor: clinic.slate, borderColor: clinic.slate },
  chipOff: { opacity: 0.4 },
  chipText: { fontSize: 14, color: clinic.ink, fontWeight: '600' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  notice: {
    backgroundColor: clinic.dangerBg,
    borderColor: '#f3c9c4',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  noticeText: { color: clinic.danger, fontSize: 13.5 },
});
