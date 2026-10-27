import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Card, Loading, Notice } from '../components/ui';
import { myHealth, type ClinicHealth } from '../lib/clinicApi';
import { clinic, space, type } from '../theme';

const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const inr = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const FOOD: Record<string, string> = { before: 'before food', after: 'after food', with: 'with food' };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Text style={[type.label, { marginBottom: space.sm }]}>{title}</Text>
      {children}
    </Card>
  );
}

const Line = ({ main, sub }: { main: string; sub?: string }) => (
  <View style={{ marginBottom: 8 }}>
    <Text style={[type.body, { color: clinic.ink }]}>{main}</Text>
    {!!sub && <Text style={type.small}>{sub}</Text>}
  </View>
);

/** The clinic's record of this patient: prescriptions, treatment, notes, vitals and bills the clinic chose to share. */
export default function ClinicRecordSection({ token }: { token: string }) {
  const [h, setH] = useState<ClinicHealth | null>(null);
  const [failed, setFailed] = useState('');
  useEffect(() => {
    myHealth(token).then(setH).catch((e) => setFailed((e as Error).message));
  }, [token]);

  if (failed) return <Notice text={failed} />;
  if (!h) return <Card><Loading /></Card>;
  const by = (d?: string | null) => (d ? ` · ${d}` : '');
  const blocks = [
    h.prescriptions?.length ? (
      <Block key="rx" title="Prescriptions">
        {h.prescriptions.map((rx) => (
          <View key={rx.id} style={{ marginBottom: space.sm }}>
            <Text style={type.small}>{prettyDate(rx.date)}{by(rx.doctor)}</Text>
            {rx.items.map((i, n) => (
              <Line key={n} main={`${n + 1}. ${i.drug}${i.strength ? ` ${i.strength}` : ''}`}
                sub={[i.frequency, i.food && FOOD[i.food], i.days && `${i.days} days`, i.instructions].filter(Boolean).join(' · ')} />
            ))}
            {!!rx.notes && <Text style={type.small}>{rx.notes}</Text>}
          </View>
        ))}
      </Block>
    ) : null,
    h.plans?.length ? (
      <Block key="plan" title="Treatment plan">
        {h.plans.map((t) => <Line key={t.id} main={`${t.name} · ${inr(t.total)}`} sub={`${prettyDate(t.date)}${t.teeth.length ? ` · Teeth ${t.teeth.join(', ')}` : ''}${by(t.doctor)}`} />)}
      </Block>
    ) : null,
    h.procedures?.length ? (
      <Block key="done" title="Treatment done">
        {h.procedures.map((t) => <Line key={t.id} main={t.name} sub={`${prettyDate(t.date)}${t.teeth.length ? ` · Teeth ${t.teeth.join(', ')}` : ''}${by(t.doctor)}`} />)}
      </Block>
    ) : null,
    h.notes?.length ? (
      <Block key="notes" title="Doctor's notes">
        {h.notes.map((n) => (
          <Line key={n.id} main={[...n.complaints, ...n.diagnoses].join(', ') || n.notes.join(', ') || 'Visit notes'}
            sub={`${prettyDate(n.date)}${by(n.doctor)}${n.follow_up ? ` · Follow-up ${prettyDate(n.follow_up)}` : ''}`} />
        ))}
      </Block>
    ) : null,
    h.vitals?.length ? (
      <Block key="vitals" title="Vital signs">
        {h.vitals.map((v) => (
          <Line key={v.id} main={[v.pulse && `Pulse ${v.pulse}`, v.bp_systolic && `BP ${v.bp_systolic}/${v.bp_diastolic ?? '–'}`,
            v.temperature && `${Number(v.temperature)}°F`, v.weight && `${Number(v.weight)} kg`].filter(Boolean).join(' · ')} sub={prettyDate(v.date)} />
        ))}
      </Block>
    ) : null,
    h.invoices?.length ? (
      <Block key="bills" title="Bills">
        {h.invoices.map((i) => (
          <Line key={i.id} main={`Bill #${i.number} · ${inr(i.total)}`}
            sub={`${prettyDate(i.date)} · ${i.items.join(', ')}${Number(i.due) > 0 ? ` · Due ${inr(i.due)}` : ' · Paid'}`} />
        ))}
      </Block>
    ) : null,
  ].filter(Boolean);

  return blocks.length ? <>{blocks}</> : (
    <Card><Text style={type.body}>Your prescriptions, treatment plan and bills from the clinic will appear here after your visit.</Text></Card>
  );
}
