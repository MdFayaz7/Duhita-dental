import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Card, Field, Input, Loading, Notice, Pill, Row, Screen } from '../components/ui';
import AuthScreen from './AuthScreen';
import { useAuth } from '../lib/auth';
import * as ImagePicker from 'expo-image-picker';
import RecordsSection from './RecordsSection';
import {
  fileUrl,
  formatSlot,
  myAppointments,
  removePhoto,
  updateProfile,
  uploadPhoto,
  type Appointment,
  type Patient,
} from '../lib/clinicApi';
import { clinic, radius, shadow, space, type } from '../theme';

/** "2026-09-29" → { day: "29", month: "SEP", weekday: "Tuesday" } */
const dateParts = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    weekday: date.toLocaleDateString('en-IN', { weekday: 'long' }),
    full: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
};

export default function ProfileScreen() {
  const nav = useNavigation<any>();
  const { ready, token, patient, signOut, setPatient } = useAuth();
  const [appointments, setAppointments] = useState<{ upcoming: Appointment[]; past: Appointment[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [medical, setMedical] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let live = true;
      myAppointments(token)
        .then((d) => live && setAppointments(d))
        .catch(() => live && setAppointments({ upcoming: [], past: [] }));
      return () => {
        live = false;
      };
    }, [token]),
  );

  if (!ready) return <Screen><Loading label="Loading your profile…" /></Screen>;
  if (!token || !patient) return <AuthScreen />;

  const next = appointments?.upcoming[0];
  const visits = (appointments?.past ?? []).filter((a) => a.status === 'completed');

  return (
    <Screen>
      {/* Patient card */}
      <View style={s.idCard}>
        <View style={s.idTop}>
          <PhotoPicker patient={patient} token={token} onChange={setPatient} />
          <View style={{ flex: 1 }}>
            <Text style={s.idName} numberOfLines={1}>{patient.name}</Text>
            <Text style={s.idMeta}>
              +91 {patient.phone}
              {patient.age ? `  ·  ${patient.age} yrs` : ''}
              {patient.sex ? `  ·  ${patient.sex}` : ''}
            </Text>
          </View>
        </View>
        <View style={s.idStrip}>
          <Text style={s.idLabel}>Patient ID</Text>
          <Text style={s.idValue}>{patient.patient_id}</Text>
        </View>
      </View>

      {/* Two things patients do most */}
      <Row style={{ gap: space.sm }}>
        <Pressable style={({ pressed }) => [s.action, pressed && s.pressed]} onPress={() => nav.navigate('Book')}>
          <Text style={s.actionIcon}>📅</Text>
          <Text style={s.actionLabel}>Book a visit</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [s.action, pressed && s.pressed]} onPress={() => nav.navigate('Appointments')}>
          <Text style={s.actionIcon}>🗂</Text>
          <Text style={s.actionLabel}>My appointments</Text>
        </Pressable>
      </Row>

      {/* Next visit */}
      <SectionHead title="Next visit" />
      {appointments === null ? (
        <Card><Loading /></Card>
      ) : !next ? (
        <Card style={s.empty}>
          <Text style={s.emptyIcon}>🦷</Text>
          <Text style={[type.h3, { marginTop: 8, textAlign: 'center' }]}>No upcoming visit</Text>
          <Text style={[type.small, { marginTop: 4, textAlign: 'center' }]}>
            Pick a time that suits you — mornings and evenings, Monday to Saturday.
          </Text>
          <Button label="Book an appointment" style={{ marginTop: space.md, alignSelf: 'stretch' }} onPress={() => nav.navigate('Book')} />
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Row style={{ padding: space.md, gap: space.md, alignItems: 'stretch' }}>
            <View style={s.dateBlock}>
              <Text style={s.dateDay}>{dateParts(next.date).day}</Text>
              <Text style={s.dateMonth}>{dateParts(next.date).month}</Text>
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={type.h3}>{formatSlot(next.slot)}</Text>
              <Text style={[type.small, { marginTop: 2 }]}>{dateParts(next.date).weekday}</Text>
              {!!next.reason && <Text style={[type.small, { marginTop: 4, color: clinic.ink }]}>{next.reason}</Text>}
            </View>
            <View style={{ justifyContent: 'center' }}>
              <Pill text={next.status} tone={next.status === 'confirmed' ? 'good' : 'warn'} />
            </View>
          </Row>
          <Pressable style={s.cardFoot} onPress={() => nav.navigate('Appointments')}>
            <Text style={s.cardFootText}>
              {appointments.upcoming.length > 1
                ? `View all ${appointments.upcoming.length} upcoming visits`
                : 'Manage this appointment'}
            </Text>
            <Text style={s.cardFootChevron}>›</Text>
          </Pressable>
        </Card>
      )}

      {/* Dental record */}
      <SectionHead title="My dental record" hint={visits.length ? `${visits.length} completed visit${visits.length === 1 ? '' : 's'}` : undefined} />
      {appointments === null ? (
        <Card><Loading /></Card>
      ) : visits.length === 0 ? (
        <Card>
          <Text style={type.body}>Your treatment history appears here after your first completed visit.</Text>
        </Card>
      ) : (
        <Card>
          {visits.slice(0, 6).map((v, i) => (
            <View key={v.id} style={s.visit}>
              <View style={s.timeline}>
                <View style={s.dot} />
                {i < Math.min(visits.length, 6) - 1 && <View style={s.line} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 16 }}>
                <Text style={[type.h3, { fontSize: 15 }]}>{v.reason || 'Dental visit'}</Text>
                <Text style={type.small}>
                  {dateParts(v.date).full} · {formatSlot(v.slot)}
                  {v.doctor ? ` · ${v.doctor}` : ''}
                </Text>
                {!!v.notes && <Text style={[type.small, { marginTop: 3 }]}>{v.notes}</Text>}
              </View>
            </View>
          ))}
          {visits.length > 6 && (
            <Button label="See all visits" variant="ghost" onPress={() => nav.navigate('Appointments')} />
          )}
        </Card>
      )}

      {/* Medical history */}
      <SectionHead title="Medical history" hint="Shown to your dentist" />
      {medical ? (
        <MedicalForm
          patient={patient}
          token={token}
          onSaved={(p) => {
            setPatient(p);
            setMedical(false);
          }}
          onCancel={() => setMedical(false)}
        />
      ) : (
        <Card>
          {([
            ['Blood group', patient.blood_group ?? '—'],
            ['Conditions', patient.conditions?.length ? patient.conditions.join(', ') : 'None reported'],
            ['Allergies', patient.allergies || 'None reported'],
            ['Medicines', patient.medications || 'None reported'],
            ['Emergency contact', patient.emergency_contact
              ? `${patient.emergency_contact}${patient.emergency_phone ? ` · +91 ${patient.emergency_phone}` : ''}`
              : '—'],
          ] as const).map(([k, v], i) => (
            <View key={k} style={[s.detail, i > 0 && s.detailDivider]}>
              <Text style={s.detailKey}>{k}</Text>
              <Text style={s.detailValue}>{v}</Text>
            </View>
          ))}
          <Button label="Update medical history" variant="outline" style={{ marginTop: space.md }} onPress={() => setMedical(true)} />
        </Card>
      )}

      {/* Records */}
      <SectionHead title="Records & documents" />
      <RecordsSection token={token} />

      {/* Personal details */}
      <SectionHead title="Personal details" />
      {editing ? (
        <DetailsForm
          patient={patient}
          token={token}
          onSaved={(p) => {
            setPatient(p);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Card>
          {([
            ['Name', patient.name],
            ['Mobile', `+91 ${patient.phone}`],
            ['Age', patient.age ? `${patient.age}` : '—'],
            ['Sex', patient.sex ?? '—'],
            ['Email', patient.email ?? '—'],
            ['Address', patient.address ?? '—'],
          ] as const).map(([k, v], i) => (
            <View key={k} style={[s.detail, i > 0 && s.detailDivider]}>
              <Text style={s.detailKey}>{k}</Text>
              <Text style={s.detailValue}>{v}</Text>
            </View>
          ))}
          <Button label="Edit details" variant="outline" style={{ marginTop: space.md }} onPress={() => setEditing(true)} />
        </Card>
      )}

      <Pressable
        onPress={() =>
          Alert.alert('Sign out?', 'You will need your mobile number and password to sign back in.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
          ])
        }
      >
        <Text style={s.signOut}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

/** The profile picture: tap to change, long-press to remove. */
function PhotoPicker({
  patient,
  token,
  onChange,
}: {
  patient: Patient;
  token: string;
  onChange: (p: Patient) => void;
}) {
  const [busy, setBusy] = useState(false);

  const pick = async (from: 'camera' | 'library') => {
    const perm =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access so your photo can be used.');
      return;
    }
    const res =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1], mediaTypes: ['images'] });
    if (res.canceled) return;
    setBusy(true);
    try {
      const { photo } = await uploadPhoto(token, res.assets[0].uri);
      onChange({ ...patient, photo });
    } catch (e) {
      Alert.alert('Could not upload', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const choose = () =>
    Alert.alert('Profile picture', undefined, [
      { text: 'Take a photo', onPress: () => pick('camera') },
      { text: 'Choose from gallery', onPress: () => pick('library') },
      ...(patient.photo
        ? [{
            text: 'Remove photo',
            style: 'destructive' as const,
            onPress: async () => {
              await removePhoto(token).catch(() => {});
              onChange({ ...patient, photo: undefined });
            },
          }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  return (
    <Pressable onPress={choose} style={s.avatarWrap} accessibilityLabel="Change profile picture">
      {patient.photo ? (
        <Image source={{ uri: fileUrl(patient.photo) }} style={s.avatarImg} />
      ) : (
        <View style={s.avatar}>
          <Text style={s.avatarText}>{patient.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={s.avatarBadge}>
        <Text style={{ fontSize: 11 }}>{busy ? '…' : '📷'}</Text>
      </View>
    </Pressable>
  );
}

const CONDITIONS = [
  'Diabetes', 'Blood pressure', 'Heart condition', 'Asthma', 'Thyroid',
  'Bleeding disorder', 'Kidney disease', 'Pregnancy',
];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/** What the dentist needs to know before treating. */
function MedicalForm({
  patient,
  token,
  onSaved,
  onCancel,
}: {
  patient: Patient;
  token: string;
  onSaved: (p: Patient) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    conditions: patient.conditions ?? [],
    blood_group: patient.blood_group ?? '',
    allergies: patient.allergies ?? '',
    medications: patient.medications ?? '',
    emergency_contact: patient.emergency_contact ?? '',
    emergency_phone: patient.emergency_phone ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  const toggle = (c: string) =>
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(c) ? f.conditions.filter((x) => x !== c) : [...f.conditions, c],
    }));

  const save = async () => {
    setBusy(true);
    setFailed('');
    try {
      onSaved(
        await updateProfile(token, {
          conditions: form.conditions,
          blood_group: form.blood_group || undefined,
          allergies: form.allergies.trim() || undefined,
          medications: form.medications.trim() || undefined,
          emergency_contact: form.emergency_contact.trim() || undefined,
          emergency_phone: form.emergency_phone || undefined,
        } as Partial<Patient>),
      );
    } catch (e) {
      setFailed((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <Field label="Conditions" hint="Tap any that apply to you.">
        <View style={s.chips}>
          {CONDITIONS.map((c) => (
            <Pressable key={c} onPress={() => toggle(c)} style={[s.chip, form.conditions.includes(c) && s.chipOn]}>
              <Text style={[s.chipText, form.conditions.includes(c) && { color: '#fff' }]}>{c}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Blood group">
        <View style={s.chips}>
          {BLOOD_GROUPS.map((b) => (
            <Pressable
              key={b}
              onPress={() => setForm({ ...form, blood_group: form.blood_group === b ? '' : b })}
              style={[s.chip, form.blood_group === b && s.chipOn]}
            >
              <Text style={[s.chipText, form.blood_group === b && { color: '#fff' }]}>{b}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Allergies" hint="Medicines, anaesthetic, latex, food…">
        <Input value={form.allergies} onChangeText={(v) => setForm({ ...form, allergies: v })} placeholder="None" />
      </Field>

      <Field label="Medicines you take">
        <Input value={form.medications} onChangeText={(v) => setForm({ ...form, medications: v })} placeholder="None" />
      </Field>

      <Field label="Emergency contact">
        <Input
          value={form.emergency_contact}
          onChangeText={(v) => setForm({ ...form, emergency_contact: v })}
          placeholder="Name"
          autoCapitalize="words"
        />
      </Field>
      <Field label="Emergency number">
        <Input
          value={form.emergency_phone}
          onChangeText={(v) => setForm({ ...form, emergency_phone: v.replace(/\D/g, '').slice(0, 10) })}
          placeholder="10-digit number"
          keyboardType="number-pad"
        />
      </Field>

      {!!failed && <Notice text={failed} />}
      <Row style={{ gap: space.sm }}>
        <Button label="Save" loading={busy} style={{ flex: 1 }} onPress={save} />
        <Button label="Cancel" variant="outline" onPress={onCancel} />
      </Row>
    </Card>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      {!!hint && <Text style={type.small}>{hint}</Text>}
    </View>
  );
}

function DetailsForm({
  patient,
  token,
  onSaved,
  onCancel,
}: {
  patient: Patient;
  token: string;
  onSaved: (p: Patient) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: patient.name ?? '',
    age: patient.age ? String(patient.age) : '',
    email: patient.email ?? '',
    address: patient.address ?? '',
    profession: patient.profession ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  const save = async () => {
    setBusy(true);
    setFailed('');
    try {
      onSaved(
        await updateProfile(token, {
          name: form.name.trim(),
          age: form.age ? Number(form.age) : undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          profession: form.profession.trim() || undefined,
        }),
      );
    } catch (e) {
      setFailed((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <Field label="Full name">
        <Input value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} autoCapitalize="words" />
      </Field>
      <Field label="Age">
        <Input
          value={form.age}
          onChangeText={(v) => setForm({ ...form, age: v.replace(/\D/g, '').slice(0, 3) })}
          keyboardType="number-pad"
        />
      </Field>
      <Field label="Email">
        <Input
          value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Field>
      <Field label="Address">
        <Input
          value={form.address}
          onChangeText={(v) => setForm({ ...form, address: v })}
          multiline
          style={{ minHeight: 84, paddingTop: 12 }}
        />
      </Field>
      <Field label="Profession">
        <Input value={form.profession} onChangeText={(v) => setForm({ ...form, profession: v })} />
      </Field>
      {!!failed && <Notice text={failed} />}
      <Row style={{ gap: space.sm }}>
        <Button label="Save changes" loading={busy} style={{ flex: 1 }} onPress={save} />
        <Button label="Cancel" variant="outline" onPress={onCancel} />
      </Row>
    </Card>
  );
}

const s = StyleSheet.create({
  idCard: {
    backgroundColor: clinic.slate,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  idTop: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: space.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 23, fontWeight: '700' },
  avatarWrap: { width: 56, height: 56 },
  avatarImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#b9c3cc',
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  chipOn: { backgroundColor: clinic.slate, borderColor: clinic.slate },
  chipText: { fontSize: 13.5, color: clinic.ink, fontWeight: '600' },
  idName: { color: '#fff', fontSize: 19, fontWeight: '700' },
  idMeta: { color: '#c9d6e4', fontSize: 13, marginTop: 3 },
  idStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.16)',
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  idLabel: { color: '#b8c7d7', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  idValue: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 1.5 },

  action: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: clinic.line,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    ...shadow.card,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 13.5, fontWeight: '700', color: clinic.ink },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: clinic.ink },

  empty: { alignItems: 'center', paddingVertical: space.lg },
  emptyIcon: { fontSize: 26 },

  dateBlock: {
    width: 62,
    borderRadius: radius.md,
    backgroundColor: clinic.mist,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dateDay: { fontSize: 24, fontWeight: '800', color: clinic.ink, lineHeight: 28 },
  dateMonth: { fontSize: 11, fontWeight: '700', color: clinic.slate, letterSpacing: 1 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: 12,
    backgroundColor: clinic.ivory,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: clinic.line,
  },
  cardFootText: { fontSize: 13.5, fontWeight: '700', color: clinic.slate },
  cardFootChevron: { fontSize: 20, color: clinic.slate },

  visit: { flexDirection: 'row', gap: 12 },
  timeline: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: clinic.slate, marginTop: 5 },
  line: { flex: 1, width: 2, backgroundColor: clinic.line, marginTop: 4 },

  detail: { paddingVertical: 11 },
  detailDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: clinic.line },
  detailKey: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: clinic.stone },
  detailValue: { fontSize: 15, color: clinic.ink, marginTop: 3 },

  signOut: { textAlign: 'center', color: clinic.danger, fontWeight: '700', fontSize: 14.5, paddingVertical: 16 },
});
