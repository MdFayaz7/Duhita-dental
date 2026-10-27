import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Button, EmptyState, Field, StatusPill, Table, formatDateTime, formatSlot, inputClass, useConfirm, useToast } from '../ui';
import { longDate } from '../billingUi';
import { SectionBar, usePatientCtx } from './shared';

const FIELDS = [
  ['name', 'Name'], ['phone', 'Mobile'], ['alt_phone', 'Other phone'], ['email', 'Email'], ['age', 'Age', 'number'], ['dob', 'Date of birth', 'date'],
  ['sex', 'Gender', ['Female', 'Male', 'Other']], ['blood_group', 'Blood group'], ['address', 'Address', 'wide'],
  ['allergies', 'Allergies', 'wide'], ['medications', 'Current medication', 'wide'], ['profession', 'Occupation'], ['referral', 'Referred by'],
  ['emergency_contact', 'Emergency contact'], ['emergency_phone', 'Emergency phone'],
];

export default function Profile() {
  const { patient, reload } = usePatientCtx();
  const p = patient.patient;
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [f, setF] = useState(p);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(p), [p]);

  const save = async (e) => {
    e.preventDefault();
    const body = {};
    for (const [k] of FIELDS) {
      const v = typeof f[k] === 'string' ? f[k].trim() : f[k];
      if ((v ?? '') !== (p[k] ?? '')) body[k] = v === '' ? null : k === 'age' ? Number(v) : v;
    }
    if (!Object.keys(body).length) return toast('Nothing changed.');
    setBusy(true);
    try {
      await api.updatePatient(p.patient_id, body);
      toast('Profile saved');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Delete patient', message: `Delete ${p.name} (${p.patient_id}) and their records?`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.deletePatient(p.patient_id);
      toast('Patient deleted');
      navigate('/admin/patients');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <form onSubmit={save}>
      <SectionBar title="Profile">
        <Button size="sm" variant="danger" type="button" onClick={remove}>Delete</Button>
        <Button size="sm" type="submit" disabled={busy} className="!bg-[#3cae4c] !border-[#3cae4c]">{busy ? 'Saving…' : 'Save Profile'}</Button>
      </SectionBar>
      <div className="grid gap-4 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map(([k, label, type]) => (
          <Field key={k} label={label} className={type === 'wide' ? 'sm:col-span-2 lg:col-span-3' : ''}>
            {Array.isArray(type) ? (
              <select value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputClass}>
                <option value="">—</option>{type.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={['number', 'date'].includes(type) ? type : 'text'} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputClass} />
            )}
          </Field>
        ))}
        <div className="sm:col-span-2 lg:col-span-3 grid gap-1 text-[13px] text-[#666]">
          <p>Patient ID <b>{p.patient_id}</b>{p.practo_id ? ` · Practo #${p.practo_id}` : ''} · registered {formatDateTime(p.created_at)}{p.app_user ? ' · uses the patient app' : ''}</p>
          {p.conditions?.length > 0 && <p>Medical history: {p.conditions.join(', ')}</p>}
          {p.complaint && <p>First complaint: {p.complaint}</p>}
          {patient.family.length > 0 && (
            <p>Family (same mobile): {patient.family.map((m, i) => (
              <span key={m.patient_id}>{i ? ', ' : ''}<Link to={`/admin/patients/${m.patient_id}`} className="text-[#1a9ad6] uppercase">{m.name}</Link> ({m.patient_id})</span>
            ))}</p>
          )}
        </div>
      </div>
    </form>
  );
}

export function Appointments() {
  const { patient, doctors } = usePatientCtx();
  return (
    <>
      <SectionBar title="Appointments"><Link to="/admin/appointments" className="text-[13px] text-[#1a9ad6] hover:underline">Book in the calendar →</Link></SectionBar>
      <div className="bg-white">
        {!patient.appointments.length ? <EmptyState title="No appointments yet." /> : (
          <Table head={['Date', 'Time', 'Doctor', 'For', 'Status']} minWidth={700}>
            {patient.appointments.map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-2.5 whitespace-nowrap">{longDate(a.date)}</td>
                <td className="px-5 py-2.5">{formatSlot(a.slot)}</td>
                <td className="px-5 py-2.5">{doctors[String(a.doctor_id)]?.name || a.doctor || '—'}</td>
                <td className="px-5 py-2.5 text-[#555]">{a.procedures || a.reason || '—'}</td>
                <td className="px-5 py-2.5"><StatusPill status={a.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}

export function Communications() {
  const { patient } = usePatientCtx();
  const [items, setItems] = useState(null);
  useEffect(() => { api.communications(patient.patient.patient_id).then((r) => setItems(r.items)).catch(() => setItems([])); }, [patient]);
  return (
    <>
      <SectionBar title="Communications" />
      <div className="bg-white">
        {!items ? null : !items.length ? <EmptyState title="No messages sent to this patient yet." hint="Booking confirmations sent on WhatsApp appear here." /> : (
          <Table head={['When', 'Channel', 'Direction', 'Message', 'Status']} minWidth={760}>
            {items.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-2.5 whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                <td className="px-5 py-2.5">{m.channel}</td>
                <td className="px-5 py-2.5 capitalize">{m.direction === 'out' ? 'Sent' : 'Received'}</td>
                <td className="px-5 py-2.5 text-[#555]">{m.text || m.kind.replace(/_/g, ' ')}</td>
                <td className="px-5 py-2.5 capitalize">{m.status}{m.error ? <span className="block text-[12px] text-[#d93a46]">{m.error}</span> : null}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
