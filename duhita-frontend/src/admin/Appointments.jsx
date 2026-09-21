import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiDownload, FiEdit2, FiPhone, FiTrash2 } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import {
  Button, EmptyState, ErrorNote, Field, IconButton, Modal, Panel, SearchInput, Segmented, Skeleton,
  StatusPill, STATUSES, Table, exportCsv, formatDateTime, formatSlot, inputClass, todayIso, useConfirm, useToast,
} from './ui';

const RANGES = [
  { value: 'day', label: 'Selected day' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All' },
];

export default function Appointments() {
  const toast = useToast();
  const confirm = useConfirm();
  const [range, setRange] = useState('day');
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = { ...(range === 'day' ? { date } : {}), status, ...(q ? { q } : {}) };
      const { items } = await api.appointments(params);
      const rows = range === 'upcoming' ? items.filter((a) => a.date >= todayIso()) : items;
      setItems(rows);
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  }, [range, date, status, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const counts = useMemo(() => {
    const base = { all: items?.length || 0 };
    STATUSES.forEach((s) => { base[s] = items?.filter((a) => a.status === s).length || 0; });
    return base;
  }, [items]);

  const setStatusFor = async (row, value) => {
    setItems((list) => list.map((a) => (a.id === row.id ? { ...a, status: value } : a)));
    try {
      await api.updateAppointment(row.id, { status: value });
      toast(`${row.name} marked ${value.replace('_', ' ')}`);
    } catch (e) {
      toast(e.message, 'error');
      load();
    }
  };

  const remove = async (row) => {
    const ok = await confirm({
      title: 'Delete appointment',
      message: `Delete the booking for ${row.name} on ${row.date}? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteAppointment(row.id);
      toast('Appointment deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const download = () =>
    exportCsv(`duhita-appointments-${range === 'day' ? date : range}.csv`,
      (items || []).map((a) => ({
        Date: a.date, Time: formatSlot(a.slot), Patient: a.name, 'Patient ID': a.patient_id || '',
        Phone: a.phone, Doctor: a.doctor || '', Reason: a.reason || '', Notes: a.notes || '',
        Status: a.status, Booked: formatDateTime(a.created_at),
      })));

  return (
    <>
      <PageHead
        title="Appointments"
        subtitle="Every booking made on the website, with its status."
        actions={<Button variant="secondary" onClick={download} disabled={!items?.length}><FiDownload /> Export CSV</Button>}
      />
      <ErrorNote>{error}</ErrorNote>

      <Panel className="p-4 sm:p-5 grid gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Show"><Segmented options={RANGES} value={range} onChange={setRange} /></Field>
          {range === 'day' && (
            <Field label="Date">
              <div className="flex gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                <Button variant="secondary" size="sm" onClick={() => setDate(todayIso())}>Today</Button>
              </div>
            </Field>
          )}
          <Field label="Search" className="flex-1 min-w-[220px]">
            <SearchInput value={q} onChange={setQ} placeholder="Name, phone or patient ID" />
          </Field>
        </div>
        <Segmented
          value={status}
          onChange={setStatus}
          options={[{ value: 'all', label: 'All', count: counts.all }, ...STATUSES.map((s) => ({ value: s, label: s.replace('_', ' '), count: counts[s] }))]}
        />
      </Panel>

      <Panel className="mt-5 overflow-hidden">
        {items === null ? (
          <div className="p-5 grid gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={FiCalendar} title="No appointments match this view." hint="Try a different date, or switch to “All”." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table head={['Patient', 'Contact', 'Date & time', 'Reason', 'Booked', 'Status', '']}>
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-white/3">
                    <td className="px-5 py-4">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-[12.5px] text-[var(--a-muted)]">{a.patient_id || 'Walk-in'}</p>
                    </td>
                    <td className="px-5 py-4"><a href={`tel:+91${a.phone}`} className="text-[var(--a-accent)] hover:underline">+91 {a.phone}</a></td>
                    <td className="px-5 py-4 whitespace-nowrap">{a.date}<span className="text-[var(--a-muted)]"> · </span>{formatSlot(a.slot)}</td>
                    <td className="px-5 py-4 max-w-[200px] truncate text-[var(--a-muted)]">{a.reason || a.notes || '—'}</td>
                    <td className="px-5 py-4 text-[12.5px] text-[var(--a-muted)] whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                    <td className="px-5 py-4">
                      <select value={a.status} onChange={(e) => setStatusFor(a, e.target.value)}
                        className="rounded-lg border border-[var(--a-border)] bg-[#0e141b] px-2.5 py-1.5 text-[13px] capitalize">
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <IconButton label="Edit" onClick={() => setEditing(a)}><FiEdit2 /></IconButton>
                        <IconButton label="Delete" tone="danger" onClick={() => remove(a)}><FiTrash2 /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-[var(--a-border)]">
              {items.map((a) => (
                <li key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.name}</p>
                      <p className="text-[12.5px] text-[var(--a-muted)]">{a.patient_id || 'Walk-in'} · booked {formatDateTime(a.created_at)}</p>
                    </div>
                    <StatusPill status={a.status} />
                  </div>
                  <p className="mt-2.5 text-[13.5px]">{a.date} · {formatSlot(a.slot)}</p>
                  {(a.reason || a.notes) && <p className="mt-1 text-[13px] text-[var(--a-muted)]">{a.reason || a.notes}</p>}
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <a href={`tel:+91${a.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--a-border)] px-3 py-2 text-[13px]"><FiPhone className="w-3.5 h-3.5" /> Call</a>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(a)}><FiEdit2 /> Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(a)}><FiTrash2 /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <EditModal appointment={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </>
  );
}

function EditModal({ appointment, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (appointment) setForm({ date: appointment.date, slot: appointment.slot, doctor: appointment.doctor || '', status: appointment.status, notes: appointment.notes || '' });
  }, [appointment]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateAppointment(appointment.id, { ...form, doctor: form.doctor || null, notes: form.notes || null });
      toast('Appointment updated');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!appointment} title="Edit appointment" subtitle={appointment?.name} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Date"><input type="date" value={form.date || ''} onChange={set('date')} className={inputClass} /></Field>
          <Field label="Time"><input type="time" value={form.slot || ''} onChange={set('slot')} className={inputClass} /></Field>
        </div>
        <Field label="Doctor"><input value={form.doctor || ''} onChange={set('doctor')} placeholder="Assign a doctor" className={inputClass} /></Field>
        <Field label="Status">
          <select value={form.status || 'pending'} onChange={set('status')} className={`${inputClass} capitalize`}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </Field>
        <Field label="Notes"><textarea rows={3} value={form.notes || ''} onChange={set('notes')} className={inputClass} /></Field>
        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={busy} className="flex-1">{busy ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
