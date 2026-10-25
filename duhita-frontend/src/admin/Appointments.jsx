import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiDownload, FiEdit2, FiPhone, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import {
  Button, EmptyState, ErrorNote, Field, IconButton, Panel, SearchInput, Segmented, Skeleton,
  StatusPill, STATUSES, STATUS_LABELS, Table, exportCsv, formatDateTime, formatSlot, inputClass, todayIso, useConfirm, useToast,
} from './ui';
import { useLiveEvents } from '../lib/useLiveEvents';
import { BookingModal } from './CalendarBooking';

const RANGES = [
  { value: 'day', label: 'Selected day' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All' },
];

export default function Appointments() {
  const toast = useToast();
  const confirm = useConfirm();
  const [range, setRange] = useState('all');
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [hours, setHours] = useState(null);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    Promise.all([api.clinicHours(), api.doctors()])
      .then(([h, d]) => { setHours(h); setDoctors(d.items.filter((x) => x.in_calendar !== false)); })
      .catch(() => {});
  }, []);

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

  useLiveEvents((event) => {
    if (['appointment_created', 'appointment_updated', 'appointment_deleted'].includes(event.type)) {
      load();
    }
  });

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    const interval = setInterval(() => {
      if (!editing && !q && document.visibilityState === 'visible') {
        load();
      }
    }, 5000);

    const onFocus = () => { if (!editing) load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load, q, editing]);

  // Stable object, so background refreshes don't reset the open form.
  const editDraft = useMemo(() => (editing ? { appointment: editing } : null), [editing]);

  const counts = useMemo(() => {
    const base = { all: items?.length || 0 };
    STATUSES.forEach((s) => { base[s] = items?.filter((a) => a.status === s).length || 0; });
    return base;
  }, [items]);

  const setStatusFor = async (row, value) => {
    setItems((list) => list.map((a) => (a.id === row.id ? { ...a, status: value } : a)));
    try {
      await api.updateAppointment(row.id, { status: value });
      toast(`${row.name}: ${STATUS_LABELS[value]}`);
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
        Phone: a.phone, Doctor: a.doctor || '', Duration: a.duration || 15, Procedures: a.procedures || '', Reason: a.reason || '', Notes: a.notes || '',
        Status: a.status, Booked: formatDateTime(a.created_at),
      })));

  return (
    <>
      <PageHead
        title="Appointments list"
        subtitle="Every booking — website, app and front desk — as a searchable list."
        actions={
          <div className="flex items-center gap-2.5">
            <Link to="/admin/appointments" className="inline-flex items-center gap-2 rounded border border-[var(--a-border)] px-3.5 py-2.5 text-[13px] text-[var(--a-muted)] hover:text-[var(--a-text)] hover:bg-black/3">
              <FiCalendar className="w-4 h-4" /> Calendar
            </Link>
            <div className="hidden sm:inline-flex items-center gap-2 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium">Live</span>
            </div>
            <Button variant="secondary" onClick={() => load()}>
              <FiRefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button variant="secondary" onClick={download} disabled={!items?.length}>
              <FiDownload /> Export CSV
            </Button>
          </div>
        }
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
          options={[{ value: 'all', label: 'All', count: counts.all }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], count: counts[s] }))]}
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
                  <tr key={a.id} className="hover:bg-black/3">
                    <td className="px-5 py-4">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-[12.5px] text-[var(--a-muted)]">{a.patient_id || 'Walk-in'}</p>
                    </td>
                    <td className="px-5 py-4"><a href={`tel:+91${a.phone}`} className="text-[#1a9ad6] hover:underline">+91 {a.phone}</a></td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {a.date}<span className="text-[var(--a-muted)]"> · </span>{formatSlot(a.slot)}
                      {a.doctor && <p className="text-[12.5px] text-[var(--a-muted)]">{a.doctor}</p>}
                    </td>
                    <td className="px-5 py-4 max-w-[200px] truncate text-[var(--a-muted)]">{a.reason || a.notes || '—'}</td>
                    <td className="px-5 py-4 text-[12.5px] text-[var(--a-muted)] whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                    <td className="px-5 py-4">
                      <select value={a.status} onChange={(e) => setStatusFor(a, e.target.value)}
                        className="rounded-lg border border-[var(--a-border)] bg-[var(--a-input)] px-2.5 py-1.5 text-[13px] capitalize">
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
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

      <BookingModal draft={editDraft} hours={hours} doctors={doctors}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </>
  );
}
