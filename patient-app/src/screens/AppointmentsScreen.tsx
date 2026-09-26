import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Card, Loading, Notice, Pill, Row, SectionTitle } from '../components/ui';
import AuthScreen from './AuthScreen';
import { useAuth } from '../lib/auth';
import {
  cancelAppointment,
  formatDate,
  formatSlot,
  myAppointments,
  type Appointment,
} from '../lib/clinicApi';
import { clinic, space, type } from '../theme';

const TONE: Record<Appointment['status'], 'good' | 'warn' | 'bad' | 'neutral'> = {
  confirmed: 'good',
  completed: 'good',
  pending: 'warn',
  cancelled: 'bad',
  no_show: 'bad',
};

export default function AppointmentsScreen() {
  const nav = useNavigation<any>();
  const { ready, token } = useAuth();
  const [data, setData] = useState<{ upcoming: Appointment[]; past: Appointment[] } | null>(null);
  const [failed, setFailed] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await myAppointments(token));
      setFailed('');
    } catch (e) {
      setFailed((e as Error).message);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!ready) return <Loading />;
  if (!token) return <AuthScreen />;

  const cancel = (a: Appointment) =>
    Alert.alert('Cancel this appointment?', `${formatDate(a.date, true)} at ${formatSlot(a.slot)}`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel appointment',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAppointment(token, a.id);
            load();
          } catch (e) {
            setFailed((e as Error).message);
          }
        },
      },
    ]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: clinic.ivory }}
      contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: space.xl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <SectionTitle eyebrow="Your visits" title="My appointments" />
      {!!failed && <Notice text={failed} />}

      {data === null ? (
        <Card><Loading /></Card>
      ) : (
        <>
          <Text style={type.label}>Upcoming</Text>
          {data.upcoming.length === 0 ? (
            <Card>
              <Text style={type.body}>Nothing booked yet.</Text>
              <Button label="Book an appointment" style={{ marginTop: space.md }} onPress={() => nav.navigate('Book')} />
            </Card>
          ) : (
            data.upcoming.map((a) => (
              <Card key={a.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={type.h3}>{formatDate(a.date, true)}</Text>
                  <Pill text={a.status} tone={TONE[a.status]} />
                </Row>
                <Text style={[type.body, { marginTop: 4 }]}>
                  {formatSlot(a.slot)}
                  {a.reason ? ` · ${a.reason}` : ''}
                </Text>
                {!!a.notes && <Text style={[type.small, { marginTop: 4 }]}>{a.notes}</Text>}
                <Button label="Cancel appointment" variant="ghost" style={{ marginTop: space.sm, alignSelf: 'flex-start' }} onPress={() => cancel(a)} />
              </Card>
            ))
          )}

          <Text style={[type.label, { marginTop: space.sm }]}>Past visits</Text>
          {data.past.length === 0 ? (
            <Card><Text style={type.body}>No past visits recorded yet.</Text></Card>
          ) : (
            <Card>
              {data.past.map((a, i) => (
                <View key={a.id} style={[s.row, i > 0 && s.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.h3, { fontSize: 15 }]}>{formatDate(a.date, true)}</Text>
                    <Text style={type.small}>
                      {formatSlot(a.slot)}
                      {a.reason ? ` · ${a.reason}` : ''}
                    </Text>
                  </View>
                  <Pill text={a.status} tone={TONE[a.status]} />
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: clinic.line },
});
