import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Input, Notice, Screen } from '../components/ui';
import { clinicInfo } from '../data/clinic';
import { useAuth } from '../lib/auth';
import { checkNumber } from '../lib/clinicApi';
import { clinic, radius, shadow, space, type } from '../theme';

type Mode = 'signin' | 'signup';
const PHONE = /^[6-9]\d{9}$/;

/**
 * Sign in or create an account.
 *
 * Patients who already registered at the clinic or on the website are recognised
 * by their mobile number: creating a login attaches to that same record, so their
 * Patient ID and visit history carry over instead of a second file being made.
 */
export default function AuthScreen({ onDone }: { onDone?: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    age: '',
    sex: '' as '' | 'Male' | 'Female' | 'Other',
    patientId: '',
  });
  const [known, setKnown] = useState<{ registered: boolean; has_login: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // As soon as a full number is typed, ask the clinic whether it already has a file.
  useEffect(() => {
    setKnown(null);
    if (!PHONE.test(form.phone)) return;
    let live = true;
    const t = setTimeout(() => {
      checkNumber(form.phone)
        .then((r) => live && setKnown(r))
        .catch(() => {});
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [form.phone]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!PHONE.test(form.phone)) e.phone = 'Enter a 10-digit mobile number.';
    if (form.password.length < 6) e.password = 'At least 6 characters.';
    if (mode === 'signup') {
      if (form.name.trim().length < 2) e.name = 'Please enter your full name.';
      if (form.age && (Number(form.age) < 0 || Number(form.age) > 120)) e.age = 'Enter a real age.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setFailed('');
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(form.phone, form.password);
      } else {
        await signUp({
          name: form.name.trim(),
          phone: form.phone,
          password: form.password,
          patient_id: form.patientId.trim() || undefined,
          age: form.age ? Number(form.age) : undefined,
          sex: form.sex || undefined,
        });
      }
      onDone?.();
    } catch (e) {
      setFailed((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFailed('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={s.hero}>
          <Text style={s.heroEyebrow}>Your profile</Text>
          <Text style={s.heroTitle}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</Text>
          <Text style={s.heroSub}>
            {mode === 'signin'
              ? 'Sign in to book visits and see your dental record.'
              : 'Visited us before? Use the same mobile number — your Patient ID and visit history come with you.'}
          </Text>
          <View style={s.perks}>
            {[
              ['📅', 'Book in seconds'],
              ['🗂', 'Your visit history'],
              ['🪪', 'Your Patient ID'],
            ].map(([icon, label]) => (
              <View key={label} style={s.perk}>
                <Text style={{ fontSize: 15 }}>{icon}</Text>
                <Text style={s.perkText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Card style={{ gap: space.md }}>
          {mode === 'signup' && (
            <Field label="Full name" error={errors.name}>
              <Input
                value={form.name}
                onChangeText={(v) => set({ name: v })}
                placeholder="Your name"
                autoCapitalize="words"
                autoComplete="name"
                invalid={!!errors.name}
              />
            </Field>
          )}

          <Field label="Mobile number" error={errors.phone}>
            <Input
              value={form.phone}
              onChangeText={(v) => set({ phone: v.replace(/\D/g, '').slice(0, 10) })}
              placeholder="10-digit number"
              keyboardType="number-pad"
              autoComplete="tel"
              invalid={!!errors.phone}
            />
          </Field>

          {/* What we know about this number */}
          {known && mode === 'signup' && known.registered && !known.has_login && (
            <Notice tone="good" text="We found your clinic record. Creating a password keeps your Patient ID and past visits." />
          )}
          {known && mode === 'signup' && known.has_login && (
            <Notice text="This number already has an app account. Please sign in instead." />
          )}
          {known && mode === 'signin' && known.registered && !known.has_login && (
            <Notice tone="good" text="You're registered at the clinic but haven't set an app password yet. Tap “New patient?” below to set one." />
          )}
          {known && mode === 'signin' && !known.registered && (
            <Notice text="We have no record for this number. Create an account below." />
          )}

          <Field label="Password" hint={mode === 'signup' ? 'At least 6 characters.' : undefined} error={errors.password}>
            <Input
              value={form.password}
              onChangeText={(v) => set({ password: v })}
              placeholder="••••••"
              secureTextEntry
              invalid={!!errors.password}
            />
          </Field>

          {mode === 'signup' && (
            <>
              <Field
                label="Patient ID (optional)"
                hint="On your clinic receipt, like DD2609-1234. Only needed if your number has changed."
              >
                <Input
                  value={form.patientId}
                  onChangeText={(v) => set({ patientId: v.toUpperCase() })}
                  placeholder="DD2609-1234"
                  autoCapitalize="characters"
                />
              </Field>
              <Field label="Age (optional)" error={errors.age}>
                <Input
                  value={form.age}
                  onChangeText={(v) => set({ age: v.replace(/\D/g, '').slice(0, 3) })}
                  placeholder="e.g. 32"
                  keyboardType="number-pad"
                  invalid={!!errors.age}
                />
              </Field>
              <Field label="Sex (optional)">
                <View style={s.segments}>
                  {(['Male', 'Female', 'Other'] as const).map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => set({ sex: form.sex === opt ? '' : opt })}
                      style={[s.segment, form.sex === opt && s.segmentOn]}
                    >
                      <Text style={[s.segmentText, form.sex === opt && { color: '#fff' }]}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
            </>
          )}

          {!!failed && <Notice text={failed} />}

          <Button label={mode === 'signin' ? 'Sign in' : 'Create account'} loading={busy} onPress={submit} />

          <Pressable onPress={() => switchTo(mode === 'signin' ? 'signup' : 'signin')}>
            <Text style={s.switch}>
              {mode === 'signin' ? 'New patient? Create an account' : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </Card>

        <Text style={[type.small, { textAlign: 'center' }]}>
          Forgot your password, or changed your number? Call the clinic on {clinicInfo.phoneDisplay} and we’ll reset it.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: clinic.slate,
    borderRadius: radius.xl,
    padding: space.lg,
    ...shadow.card,
  },
  heroEyebrow: { color: '#c9d6e4', fontSize: 11.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 25, fontWeight: '700', marginTop: 8 },
  heroSub: { color: '#d7e2ec', fontSize: 14.5, lineHeight: 21, marginTop: 8 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.md },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  perkText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  segments: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#b9c3cc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  segmentOn: { backgroundColor: clinic.slate, borderColor: clinic.slate },
  segmentText: { fontSize: 14, fontWeight: '600', color: clinic.ink },
  switch: { textAlign: 'center', color: clinic.slate, fontWeight: '700', fontSize: 14 },
});
