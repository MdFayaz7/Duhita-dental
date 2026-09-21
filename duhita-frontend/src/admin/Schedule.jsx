import { useCallback, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiClock, FiCopy, FiEdit2, FiPlus, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import {
  Button, EmptyState, ErrorNote, Field, IconButton, Modal, Panel, Skeleton, StatusPill, STATUSES,
  Table, formatSlot, inputClass, todayIso, useConfirm, useToast,
} from './ui';

const shiftDate = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
};

const blank = { time_from: '10:00', time_to: '', patient_name: '', patient_id: '', doctor: '', status: 'pending', notes: '', priority: 1 };

export default function Schedule() {
  const toast = useToast();
  const confirm = useConfirm();
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setRows(null);
    setError('');
    try {
      const { items } = await api.schedule(date);
      setRows(items);
    } catch (e) {
      setError(e.message);
      setRows([]);
    }
  }, [date]);
  useEffect(() => { load(); }, [load]);

  const copyDay = async () => {
    try {
      const { added } = await api.copySchedule(date);
      toast(added ? `${added} appointment${added === 1 ? '' : 's'} added to the schedule` : 'Schedule already up to date');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const move = async (row, delta) => {
    try {
      await api.updateSchedule(row.id, { priority: Math.max(1, (row.priority || 1) + delta) });
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const remove = async (row) => {
    const ok = await confirm({ title: 'Remove entry', message: `Remove ${row.patient_name} from the ${date} schedule?`, confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    try {
      await api.deleteSchedule(row.id);
      toast('Entry removed');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const setStatusFor = async (row, status) => {
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status } : r)));
    try {
      await api.updateSchedule(row.id, { status });
    } catch (e) {
      toast(e.message, 'error');
      load();
    }
  };

  const pretty = new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <PageHead
        title="Daily Schedule"
        subtitle="The clinic's running order for the day."
        actions={
          <>
            <Button variant="secondary" onClick={() => window.print()}><FiPrinter /> Print</Button>
            <Button variant="secondary" onClick={copyDay}><FiCopy /> Copy appointments</Button>
            <Button onClick={() => setEditing({ ...blank, priority: (rows?.length || 0) + 1 })}><FiPlus /> Add entry</Button>
          </>
        }
      />
      <ErrorNote>{error}</ErrorNote>

      <Panel className="p-4 flex flex-wrap items-center gap-3">
        <IconButton label="Previous day" onClick={() => setDate(shiftDate(date, -1))} className="border border-[var(--a-border)]"><FiChevronLeft /></IconButton>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} max-w-[180px]`} />
        <IconButton label="Next day" onClick={() => setDate(shiftDate(date, 1))} className="border border-[var(--a-border)]"><FiChevronRight /></IconButton>
        <span className="text-[14px] text-[var(--a-muted)]">{pretty}</span>
        {date !== todayIso() && <Button size="sm" variant="ghost" onClick={() => setDate(todayIso())}>Back to today</Button>}
      </Panel>

      <Panel className="mt-5 overflow-hidden">
        {rows === null ? (
          <div className="p-5 grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FiClock}
            title="Nothing scheduled for this day."
            hint="Pull in the day's online bookings, or add a walk-in manually."
            action={<div className="flex justify-center gap-3"><Button variant="secondary" onClick={copyDay}><FiCopy /> Copy appointments</Button><Button onClick={() => setEditing(blank)}><FiPlus /> Add entry</Button></div>}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table head={['#', 'Time', 'Patient', 'Doctor', 'Status', 'Notes', '']} minWidth={900}>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/3">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-7 h-7 grid place-items-center rounded-lg bg-white/8 text-[13px]">{row.priority}</span>
                        <div className="grid">
                          <button onClick={() => move(row, -1)} aria-label="Move up" className="text-[10px] leading-none text-[var(--a-muted)] hover:text-white">▲</button>
                          <button onClick={() => move(row, 1)} aria-label="Move down" className="text-[10px] leading-none text-[var(--a-muted)] hover:text-white">▼</button>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">{formatSlot(row.time_from)}{row.time_to ? ` – ${formatSlot(row.time_to)}` : ''}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{row.patient_name}</p>
                      <p className="text-[12.5px] text-[var(--a-muted)]">{row.patient_id || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-[var(--a-muted)]">{row.doctor || '—'}</td>
                    <td className="px-5 py-4">
                      <select value={row.status} onChange={(e) => setStatusFor(row, e.target.value)}
                        className="rounded-lg border border-[var(--a-border)] bg-[#0e141b] px-2.5 py-1.5 text-[13px] capitalize">
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4 max-w-[200px] truncate text-[var(--a-muted)]">{row.notes || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <IconButton label="Edit" onClick={() => setEditing(row)}><FiEdit2 /></IconButton>
                        <IconButton label="Remove" tone="danger" onClick={() => remove(row)}><FiTrash2 /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>

            <ul className="md:hidden divide-y divide-[var(--a-border)]">
              {rows.map((row) => (
                <li key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] text-[var(--a-muted)]">#{row.priority} · {formatSlot(row.time_from)}{row.time_to ? ` – ${formatSlot(row.time_to)}` : ''}</p>
                      <p className="font-medium truncate mt-0.5">{row.patient_name}</p>
                      {row.doctor && <p className="text-[12.5px] text-[var(--a-muted)]">{row.doctor}</p>}
                    </div>
                    <StatusPill status={row.status} />
                  </div>
                  {row.notes && <p className="mt-2 text-[13px] text-[var(--a-muted)]">{row.notes}</p>}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => move(row, -1)}>▲</Button>
                    <Button size="sm" variant="secondary" onClick={() => move(row, 1)}>▼</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(row)}><FiEdit2 /> Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(row)}><FiTrash2 /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <EntryModal entry={editing} date={date} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </>
  );
}

function EntryModal({ entry, date, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isEdit = !!entry?.id;

  useEffect(() => { if (entry) setForm({ ...blank, ...entry }); }, [entry]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      time_from: form.time_from,
      time_to: form.time_to || null,
      patient_name: form.patient_name,
      patient_id: form.patient_id || null,
      doctor: form.doctor || null,
      status: form.status,
      notes: form.notes || null,
      priority: Number(form.priority) || 1,
    };
    try {
      isEdit ? await api.updateSchedule(entry.id, payload) : await api.addSchedule({ ...payload, date });
      toast(isEdit ? 'Entry updated' : 'Entry added to the schedule');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!entry} title={isEdit ? 'Edit schedule entry' : 'Add schedule entry'} subtitle={date} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="From"><input type="time" required value={form.time_from} onChange={set('time_from')} className={inputClass} /></Field>
          <Field label="To (optional)"><input type="time" value={form.time_to || ''} onChange={set('time_to')} className={inputClass} /></Field>
        </div>
        <Field label="Patient name"><input required value={form.patient_name} onChange={set('patient_name')} className={inputClass} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Patient ID"><input value={form.patient_id || ''} onChange={set('patient_id')} placeholder="DD2609-1234" className={inputClass} /></Field>
          <Field label="Doctor"><input value={form.doctor || ''} onChange={set('doctor')} className={inputClass} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Status">
            <select value={form.status} onChange={set('status')} className={`${inputClass} capitalize`}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <Field label="Order"><input type="number" min="1" value={form.priority} onChange={set('priority')} className={inputClass} /></Field>
        </div>
        <Field label="Notes / reason"><textarea rows={3} value={form.notes || ''} onChange={set('notes')} className={inputClass} /></Field>
        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={busy} className="flex-1">{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add entry'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
