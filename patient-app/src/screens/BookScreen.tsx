import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Button, Card, Field, Input, Loading, Notice, Row, Screen, SectionTitle } from '../components/ui';
import AuthScreen from './AuthScreen';
import { complaints } from '../data/clinic';
import { useAuth } from '../lib/auth';
import { bookAppointment, formatDate, formatSlot, getSlots, todayIso, type SlotDay } from '../lib/clinicApi';
import { clinic, radius, space, type } from '../theme';

const DAYS = 21; // how many days the picker offers

/** The next three weeks as pickable days, with Sundays marked closed. */
function useDays() {
  return useMemo(() => {
    const out: { iso: string; date: Date; closed: boolean; today: boolean }[] = [];
    const today = todayIso();
    const [y, m, d] = today.split('-').map(Number);
    for (let i = 0; i < DAYS; i++) {
      const date = new Date(y, m - 1, d + i);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      out.push({ iso, date, closed: date.getDay() === 0, today: i === 0 });
    }
    return out;
  }, []);
}

export default function BookScreen() {
  const nav = useNavigation<any>();
  const preset = useRoute<any>().params?.reason as string | undefined;
  const { ready, token, patient } = useAuth();
  const days = useDays();

  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState(preset ?? '');
  const [notes, setNotes] = useState('');
  const [day, setDay] = useState<SlotDay | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [booked, setBooked] = useState<{ date: string; slot: string } | null>(null);

  useEffect(() => {
    if (!date) return;
    let live = true;
    setLoadingSlots(true);
    setSlot('');
    getSlots(date)
      .then((d) => live && setDay(d))
      .catch((e) => live && setFailed((e as Error).message))
      .finally(() => live && setLoadingSlots(false));
    return () => {
      live = false;
    };
  }, [date]);

  if (!ready) return <Screen><Loading /></Screen>;
  if (!token || !patient) {
    return <AuthScreen />;
  }

  if (booked) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <View style={s.tick}><Text style={{ fontSize: 28 }}>✓</Text></View>
          <Text style={[type.h2, { marginTop: space.md, textAlign: 'center' }]}>Appointment requested</Text>
          <Text style={[type.body, { marginTop: 8, textAlign: 'center' }]}>
            {formatDate(booked.date, true)} at {formatSlot(booked.slot)}.{'\n'}
            The clinic will call you shortly to confirm.
          </Text>
          <Button
            label="View my appointments"
            style={{ marginTop: space.lg, alignSelf: 'stretch' }}
            onPress={() => nav.navigate('Appointments')}
          />
          <Button
            label="Book another"
            variant="ghost"
            onPress={() => {
              setBooked(null);
              setDate('');
              setSlot('');
            }}
          />
        </Card>
      </Screen>
    );
  }

  const submit = async () => {
    setFailed('');
    if (!date) return setFailed('Please choose a date.');
    if (!slot) return setFailed('Please choose a time.');
    setBusy(true);
    try {
      const a = await bookAppointment(token, { date, slot, reason: reason || undefined, notes: notes || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setBooked({ date: a.date, slot: a.slot });
    } catch (e) {
      setFailed((e as Error).message);
      if (date) getSlots(date).then(setDay).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SectionTitle
        eyebrow={`Patient ID ${patient.patient_id}`}
        title="Book an appointment"
        sub="Pick a day and time — you’ll get a call to confirm."
      />

      <Card>
        <Text style={type.label}>1 · Choose a date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.days}>
          {days.map((d) => {
            const active = date === d.iso;
            return (
              <Pressable
                key={d.iso}
                disabled={d.closed}
                onPress={() => setDate(d.iso)}
                style={[s.day, active && s.dayOn, d.closed && s.dayOff]}
              >
                <Text style={[s.dayName, active && { color: '#fff' }]}>
                  {d.today ? 'Today' : d.date.toLocaleDateString('en-IN', { weekday: 'short' })}
                </Text>
                <Text style={[s.dayNum, active && { color: '#fff' }]}>{d.date.getDate()}</Text>
                <Text style={[s.dayMonth, active && { color: '#fff' }]}>
                  {d.closed ? 'Closed' : d.date.toLocaleDateString('en-IN', { month: 'short' })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={[type.small, { marginTop: 8 }]}>Sundays are by prior appointment — please call us.</Text>
      </Card>

      <Card>
        <Text style={type.label}>2 · Choose a time</Text>
        {!date ? (
          <Text style={[type.body, { marginTop: 10 }]}>Pick a date first to see open times.</Text>
        ) : loadingSlots ? (
          <Loading label="Checking open times…" />
        ) : (
          day?.sessions.map((session) => {
            const open = session.slots.filter((t) => t.available);
            return (
              <View key={session.id} style={{ marginTop: space.md }}>
                <Text style={[type.h3, { fontSize: 15 }]}>
                  {session.label} <Text style={type.small}>· {session.range}</Text>
                </Text>
                {open.length === 0 ? (
                  <Text style={[type.small, { marginTop: 6 }]}>No times left in this session.</Text>
                ) : (
                  <View style={s.slots}>
                    {open.map((t) => (
                      <Pressable
                        key={t.time}
                        onPress={() => setSlot(t.time)}
                        style={[s.slot, slot === t.time && s.slotOn]}
                      >
                        <Text style={[s.slotText, slot === t.time && { color: '#fff' }]}>{formatSlot(t.time)}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </Card>

      <Card style={{ gap: space.md }}>
        <Text style={type.label}>3 · Why are you coming in?</Text>
        <View style={s.slots}>
          {complaints.map((c) => (
            <Pressable
              key={c}
              onPress={() => setReason(reason === c ? '' : c)}
              style={[s.slot, reason === c && s.slotOn]}
            >
              <Text style={[s.slotText, reason === c && { color: '#fff' }]}>{c}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Anything else we should know? (optional)">
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Pain since 3 days, upper left side…"
            multiline
            style={{ minHeight: 86, paddingTop: 12 }}
          />
        </Field>
      </Card>

      {!!failed && <Notice text={failed} />}

      <Button
        label={date && slot ? `Request ${formatDate(date)} · ${formatSlot(slot)}` : 'Request appointment'}
        loading={busy}
        disabled={!date || !slot}
        onPress={submit}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  days: { gap: 8, paddingVertical: 12 },
  day: {
    width: 74,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#b9c3cc',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dayOn: { backgroundColor: clinic.slate, borderColor: clinic.slate },
  dayOff: { opacity: 0.4 },
  dayName: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: clinic.stone },
  dayNum: { fontSize: 22, fontWeight: '700', color: clinic.ink, marginVertical: 2 },
  dayMonth: { fontSize: 11, color: clinic.stone },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  slot: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#b9c3cc',
    backgroundColor: '#fff',
  },
  slotOn: { backgroundColor: clinic.slate, borderColor: clinic.slate },
  slotText: { fontSize: 13.5, color: clinic.ink, fontWeight: '600' },
  tick: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: clinic.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
