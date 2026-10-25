import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCheck, FiClock, FiEdit2, FiPhone, FiTrash2, FiUser, FiUserPlus, FiUsers, FiX, FiMessageCircle,
} from 'react-icons/fi';
import { api } from './api';
import {
  Button, Drawer, ErrorNote, Field, Modal, StatusPill, cx, formatSlot, inputClass, useConfirm, useToast,
} from './ui';

const PHONE = /^[6-9]\d{9}$/;
const blankPatient = { name: '', phone: '', email: '', age: '', sex: '' };

export const CATEGORY_LABELS = { high_priority: 'High priority', telephonic: 'Telephonic', walkin: 'Walk-in' };

/** Run a save; if the doctor is already booked at that time (409), ask before saving anyway. */
export async function saveWithClashCheck(confirm, send) {
  try {
    return await send(false);
  } catch (e) {
    if (e.status !== 409) throw e;
    const ok = await confirm({ title: 'Time already booked', message: `${e.message} Book anyway?`, confirmLabel: 'Book anyway' });
    return ok ? send(true) : null;
  }
}

const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/* ---------------------------------------------------------------- patient search */

function PatientPicker({ onPick, onNew }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return undefined; }
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const { items } = await api.patients({ q: term, limit: 8, sort: 'name' });
        if (id === seq.current) setResults(items);
      } catch {
        if (id === seq.current) setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const startNew = () => onNew(/^\d+$/.test(q.trim()) ? { phone: q.trim() } : { name: q.trim() });

  return (
    <div className="grid gap-2">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className={inputClass}
        placeholder="Search by name, mobile, patient ID or Practo number" />
      {results && (
        <ul className="max-h-64 overflow-y-auto rounded border border-[var(--a-border)] divide-y divide-[var(--a-border)]">
          {results.map((p) => (
            <li key={p.patient_id}>
              <button type="button" onClick={() => onPick(p)} className="w-full text-left px-3.5 py-2.5 hover:bg-black/3">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate">{p.name}</span>
                  {p.family_size > 1 && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#7f56d9]/18 px-2 py-0.5 text-[11.5px] text-[#6941c6]">
                      <FiUsers className="w-3 h-3" /> Family of {p.family_size}
                    </span>
                  )}
                </span>
                <span className="block text-[12.5px] text-[var(--a-muted)]">
                  {p.patient_id}{p.practo_id ? ` · Practo ${p.practo_id}` : ''} · {p.phone ? `+91 ${p.phone}` : 'no mobile'}
                  {p.age != null ? ` · ${p.age}y` : ''}{p.sex ? ` ${p.sex[0]}` : ''}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={startNew} className="w-full text-left px-3.5 py-2.5 text-[var(--a-accent)] hover:bg-black/3 inline-flex items-center gap-2">
              <FiUserPlus /> {results.length ? 'Not listed — add a new patient' : `No match — add “${q.trim()}” as a new patient`}
            </button>
          </li>
        </ul>
      )}
      {!results && (
        <button type="button" onClick={() => onNew({})} className="justify-self-start text-[13px] text-[var(--a-accent)] inline-flex items-center gap-1.5">
          <FiUserPlus /> New patient
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- booking modal */

/**
 * draft: { date, slot, doctor_id?, category?, status? } for a new booking,
 *        or { appointment } to edit one.
 */
export function BookingModal({ draft, hours, doctors, onClose, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const editing = draft?.appointment || null;
  const [patient, setPatient] = useState(null);
  const [newPatient, setNewPatient] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!draft) return;
    const a = draft.appointment;
    setPatient(a ? { patient_id: a.patient_id, name: a.name, phone: a.phone } : null);
    setNewPatient(null);
    setError('');
    setForm({
      doctor_id: String(a?.doctor_id ?? draft.doctor_id ?? ''),
      category: a?.category ?? draft.category ?? '',
      date: a?.date ?? draft.date,
      slot: a?.slot ?? draft.slot,
      duration: String(a?.duration ?? 15),
      procedures: a?.procedures ?? '',
      notes: a?.notes ?? '',
      status: draft.status ?? 'confirmed',
      notify: true,
    });
  }, [draft]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setNp = (k) => (e) => setNewPatient((p) => ({ ...p, [k]: e.target.value }));
  const durations = hours?.durations || [5, 10, 15, 30, 45, 60];

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!editing && !patient && !newPatient) return setError('Choose a patient, or add a new one.');
    if (newPatient && newPatient.name.trim().length < 2) return setError('Enter the new patient’s name.');
    if (newPatient && !PHONE.test(newPatient.phone)) return setError('Enter a valid 10-digit mobile number.');

    const body = {
      doctor_id: form.doctor_id ? Number(form.doctor_id) : null,
      date: form.date,
      slot: form.slot,
      duration: Number(form.duration),
      procedures: form.procedures.trim() || null,
      notes: form.notes.trim() || null,
    };
    let send;
    if (editing) {
      send = (force) => api.updateAppointment(editing.id, { ...body, category: form.category, force });
    } else {
      Object.assign(body, { category: form.category || null, status: form.status, notify: form.status === 'confirmed' && form.notify });
      if (newPatient) {
        body.new_patient = {
          name: newPatient.name.trim(), phone: newPatient.phone, email: newPatient.email.trim() || null,
          age: newPatient.age ? Number(newPatient.age) : null, sex: newPatient.sex || null,
        };
      } else {
        body.patient_id = patient.patient_id;
      }
      send = (force) => api.bookAppointment({ ...body, force });
    }

    setBusy(true);
    try {
      const saved = await saveWithClashCheck(confirm, send);
      if (saved) {
        toast(editing ? 'Appointment updated' : `Booked ${saved.name} at ${formatSlot(saved.slot)}`);
        onSaved(saved);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!draft} wide title={editing ? 'Edit appointment' : 'New appointment'}
      subtitle={form.date ? `${longDate(form.date)} · ${formatSlot(form.slot)}` : ''} onClose={onClose}>
      <form onSubmit={save} className="grid gap-5">
        <ErrorNote>{error}</ErrorNote>

        <section className="grid gap-2">
          <span className="text-[13px] text-[var(--a-muted)]">Patient</span>
          {patient ? (
            <div className="flex items-center gap-3 rounded border border-[var(--a-border)] bg-[var(--a-input)] px-3.5 py-3">
              <span className="w-9 h-9 grid place-items-center rounded-full bg-black/5"><FiUser /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium truncate">{patient.name}</span>
                <span className="block text-[12.5px] text-[var(--a-muted)]">
                  {patient.patient_id || 'No patient ID'} · {patient.phone ? `+91 ${patient.phone}` : 'no mobile'}
                </span>
                {patient.family_size > 1 && (
                  <span className="block text-[12px] text-[#6941c6] mt-0.5">
                    Shares this mobile number with {patient.family_size - 1} other{patient.family_size > 2 ? 's' : ''} — check it’s the right family member.
                  </span>
                )}
              </span>
              {!editing && <Button type="button" size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>}
            </div>
          ) : newPatient ? (
            <div className="grid gap-3 rounded border border-[var(--a-accent)]/30 bg-[var(--a-accent-soft)] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#0e8a7d]">New patient — a patient ID is created on save</span>
                <button type="button" onClick={() => setNewPatient(null)} aria-label="Back to search" className="text-[var(--a-muted)] hover:text-[var(--a-text)]"><FiX /></button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Name *"><input value={newPatient.name} onChange={setNp('name')} className={inputClass} /></Field>
                <Field label="Mobile *" hint="Family members may share one number">
                  <input value={newPatient.phone} onChange={setNp('phone')} inputMode="numeric" maxLength={10} className={inputClass} />
                </Field>
                <Field label="Email"><input type="email" value={newPatient.email} onChange={setNp('email')} className={inputClass} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age"><input type="number" min="0" max="120" value={newPatient.age} onChange={setNp('age')} className={inputClass} /></Field>
                  <Field label="Sex">
                    <select value={newPatient.sex} onChange={setNp('sex')} className={inputClass}>
                      <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          ) : (
            <PatientPicker onPick={setPatient} onNew={(prefill) => setNewPatient({ ...blankPatient, ...prefill })} />
          )}
        </section>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Doctor">
            <select value={form.doctor_id || ''} onChange={set('doctor_id')} className={inputClass}>
              <option value="">Not assigned</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={form.category || ''} onChange={set('category')} className={inputClass}>
              <option value="">None</option>
              {(hours?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Date"><input type="date" required value={form.date || ''} onChange={set('date')} className={inputClass} /></Field>
          <Field label="Time"><input type="time" required step="300" value={form.slot || ''} onChange={set('slot')} className={inputClass} /></Field>
          <Field label="For" className="col-span-2 sm:col-span-1">
            <select value={form.duration || '15'} onChange={set('duration')} className={inputClass}>
              {durations.map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60} hr${d > 60 ? 's' : ''}`}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Planned procedures"><textarea rows={2} value={form.procedures || ''} onChange={set('procedures')} placeholder="e.g. RCT 36, scaling" className={inputClass} /></Field>
          <Field label="Notes"><textarea rows={2} value={form.notes || ''} onChange={set('notes')} className={inputClass} /></Field>
        </div>

        {!editing && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={inputClass}>
                <option value="confirmed">Booked</option>
                <option value="checked_in">Waiting (patient is here)</option>
                <option value="pending">Request (not confirmed yet)</option>
              </select>
            </Field>
            {form.status === 'confirmed' && (
              <label className="flex items-center gap-2.5 text-[14px] text-[var(--a-text)] mt-5">
                <input type="checkbox" checked={!!form.notify} onChange={set('notify')} className="w-4 h-4 accent-[#16a394]" />
                Send the patient a WhatsApp confirmation
              </label>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={busy} className="flex-1">{busy ? 'Saving…' : editing ? 'Save changes' : 'Save appointment'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- appointment details */

const FLOW = [
  { status: 'confirmed', label: 'Confirm', from: ['pending'] },
  { status: 'checked_in', label: 'Check in', from: ['pending', 'confirmed'] },
  { status: 'engaged', label: 'Engage', from: ['checked_in'] },
  { status: 'completed', label: 'Done', from: ['checked_in', 'engaged'] },
];

const SOURCES = { website: 'Website request', app: 'Patient app', clinic: 'Front desk' };

export function AppointmentDrawer({ appointment, doctor, onClose, onEdit, onStatus, onDelete }) {
  if (!appointment) return null;
  const a = appointment;
  const next = FLOW.filter((f) => f.from.includes(a.status));
  const rows = [
    ['Patient ID', a.patient_id || 'Walk-in (not registered)'],
    ['When', `${longDate(a.date)} · ${formatSlot(a.slot)} · ${a.duration || 15} min`],
    ['Doctor', doctor ? (
      <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: doctor.color }} />{doctor.name}</span>
    ) : a.doctor || 'Not assigned'],
    ['Category', CATEGORY_LABELS[a.category]],
    ['Procedures', a.procedures],
    ['Reason', a.reason],
    ['Notes', a.notes],
    ['Booked via', SOURCES[a.source] || a.source],
  ].filter(([, v]) => v);

  return (
    <Drawer open title={a.name} subtitle={a.phone ? `+91 ${a.phone}` : ''} onClose={onClose}>
      <div className="grid gap-5">
        <div className="flex items-center justify-between gap-3">
          <StatusPill status={a.status} />
          <span className="flex gap-2">
            {a.phone && (
              <>
                <a href={`tel:+91${a.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--a-border)] px-3 py-2 text-[13px] hover:bg-black/3"><FiPhone className="w-3.5 h-3.5" /> Call</a>
                <a href={`https://wa.me/91${a.phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[var(--a-border)] px-3 py-2 text-[13px] hover:bg-black/3"><FiMessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
              </>
            )}
          </span>
        </div>

        <dl className="grid gap-3 text-[14px]">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[110px_1fr] gap-3">
              <dt className="text-[var(--a-muted)]">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>

        {next.length > 0 && (
          <div className="grid gap-2">
            <span className="text-[12px] uppercase tracking-wider text-[var(--a-muted)]">Next step</span>
            <div className="flex flex-wrap gap-2">
              {next.map((f, i) => (
                <Button key={f.status} variant={i === 0 ? 'primary' : 'secondary'} onClick={() => onStatus(a, f.status)}>
                  {f.status === 'completed' ? <FiCheck /> : <FiClock />} {f.label}
                </Button>
              ))}
            </div>
            {a.status === 'pending' && <p className="text-[12.5px] text-[var(--a-muted)]">Confirming sends the patient a WhatsApp confirmation.</p>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-[var(--a-border)] pt-4">
          <Button variant="secondary" onClick={() => onEdit(a)}><FiEdit2 /> Edit / reschedule</Button>
          {a.patient_id && (
            <>
              <Link to={`/admin/patients/${a.patient_id}/invoices/new`} className="inline-flex items-center gap-2 h-[38px] px-4 rounded-[3px] border border-[#c8c8c8] text-[14px] text-[var(--a-text)] hover:bg-[#f5f5f5]">Create invoice</Link>
              <Link to={`/admin/patients/${a.patient_id}`} className="inline-flex items-center gap-2 h-[38px] px-4 rounded-[3px] border border-[#c8c8c8] text-[14px] text-[var(--a-text)] hover:bg-[#f5f5f5]">Patient record</Link>
            </>
          )}
          {!['cancelled', 'completed'].includes(a.status) && (
            <>
              <Button variant="secondary" onClick={() => onStatus(a, 'no_show')}>No show</Button>
              <Button variant="secondary" onClick={() => onStatus(a, 'cancelled')}><FiX /> Cancel</Button>
            </>
          )}
          {['cancelled', 'no_show'].includes(a.status) && (
            <Button variant="secondary" onClick={() => onStatus(a, 'confirmed')}>Restore</Button>
          )}
          <Button variant="danger" onClick={() => onDelete(a)} aria-label="Delete appointment" className={cx('ml-auto')}><FiTrash2 /></Button>
        </div>
      </div>
    </Drawer>
  );
}
