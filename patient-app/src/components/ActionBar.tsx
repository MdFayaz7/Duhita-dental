/** The two actions a patient always needs, pinned to the bottom of every screen. */
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { clinicInfo } from '../data/clinic';
import { clinic, radius, shadow } from '../theme';

export default function ActionBar({ onBook }: { onBook: () => void }) {
  const insets = useSafeAreaInsets();
  const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Pressable
        style={({ pressed }) => [styles.btn, styles.call, pressed && styles.pressed]}
        onPress={() => {
          tap();
          Linking.openURL(`tel:${clinicInfo.phone}`).catch(() => {});
        }}
        accessibilityLabel={`Call the clinic on ${clinicInfo.phoneDisplay}`}
      >
        <Text style={styles.icon}>📞</Text>
        <Text style={[styles.label, { color: clinic.ink }]}>Call</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.btn, styles.book, pressed && styles.pressed]}
        onPress={() => {
          tap();
          onBook();
        }}
        accessibilityLabel="Book an appointment"
      >
        <Text style={styles.icon}>📅</Text>
        <Text style={[styles.label, { color: '#fff' }]}>Book an Appointment</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: clinic.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: clinic.line,
    ...shadow.bar,
  },
  btn: {
    minHeight: 50,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  call: { flex: 1, borderWidth: 1, borderColor: clinic.slate, backgroundColor: '#fff' },
  book: { flex: 2, backgroundColor: clinic.slate },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  icon: { fontSize: 16 },
  label: { fontSize: 15, fontWeight: '700' },
});
