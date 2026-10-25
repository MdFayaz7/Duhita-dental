import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle, FiCalendar, FiChevronLeft, FiChevronRight, FiList, FiPlus, FiUserPlus, FiUsers,
} from 'react-icons/fi';
import { api } from './api';
import {
  Button, Drawer, ErrorNote, Segmented, Skeleton, STATUS_LABELS, cx, formatSlot, todayIso, useConfirm, useToast,
} from './ui';
import { useLiveEvents } from '../lib/useLiveEvents';
import { AppointmentDrawer, BookingModal, CATEGORY_LABELS, saveWithClashCheck } from './CalendarBooking';

const ROW_H = 28; // px per slot row
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // weeks start on Sunday, as in Practo
const FALLBACK_COLORS = ['#4e79a7', '#c45a9d', '#3f9e5a', '#9c5a2b', '#7b2fbe', '#16808a', '#d23f3f', '#e0662b', '#b56a1f', '#7f56d9', '#22303c'];
const VIEWS = [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }];
const UNASSIGNED = { id: 'none', name: 'Not assigned', color: '#64748b' };
const PREFS_KEY = 'duhita.admin.calendar';

/* ---------------------------------------------------------------- date & time helpers
   Dates are YYYY-MM-DD strings and times HH:MM, always in clinic time — no timezone surprises. */

const toDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const toIso = (d) => d.toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = toDate(iso); d.setUTCDate(d.getUTCDate() + n); return toIso(d); };
const addMonths = (iso, n) => { const d = toDate(iso.slice(0, 8) + '01'); d.setUTCMonth(d.getUTCMonth() + n); return toIso(d); };
const weekday = (iso) => (toDate(iso).getUTCDay() + 6) % 7; // Monday = 0, matching the API's closed_weekdays
const startOfWeek = (iso) => addDays(iso, -toDate(iso).getUTCDay()); // the Sunday on or before
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const nowMinutes = () => {
  const [h, m] = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }).split(':').map(Number);
  return h * 60 + m;
};
const fmt = (iso, opts) => toDate(iso).toLocaleDateString('en-IN', { timeZone: 'UTC', ...opts });
const holdsTime = (a) => !['cancelled', 'no_show'].includes(a.status);

function rangeFor(view, anchor) {
  if (view === 'day') return [anchor, anchor];
  if (view === 'week') { const s = startOfWeek(anchor); return [s, addDays(s, 6)]; }
  const first = anchor.slice(0, 8) + '01';
  const last = addDays(addMonths(first, 1), -1);
  return [startOfWeek(first), addDays(startOfWeek(last), 6)];
}

function rangeLabel(view, start, end, anchor) {
  if (view === 'day') return fmt(start, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  if (view === 'month') return fmt(anchor, { month: 'long', year: 'numeric' });
  return `${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** Side-by-side lanes for overlapping appointments in one column. */
function layout(items) {
  const sorted = items
    .map((a) => ({ a, start: mins(a.slot), end: mins(a.slot) + (a.duration || 15) }))
    .sort((x, y) => x.start - y.start || y.end - x.end);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    cluster.forEach((it) => {
      let lane = lanes.findIndex((end) => end <= it.start);
      if (lane === -1) { lane = lanes.length; lanes.push(0); }
      lanes[lane] = it.end;
      it.lane = lane;
    });
    cluster.forEach((it) => out.push({ ...it, lanes: lanes.length }));
    cluster = [];
    clusterEnd = -1;
  };
  sorted.forEach((it) => {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  });
  if (cluster.length) flush();
  return out;
}

const readPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
};
const savePrefs = (prefs) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
};

/* ---------------------------------------------------------------- page */

export default function Calendar() {
  const toast = useToast();
  const confirm = useConfirm();
  const [hours, setHours] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [view, setView] = useState(() => readPrefs().view || (window.matchMedia('(max-width: 767px)').matches ? 'day' : 'week'));
  const [doctorId, setDoctorId] = useState(() => readPrefs().doctorId || 'all');
  const [anchor, setAnchor] = useState(todayIso());
  const [items, setItems] = useState(null);
  const [today, setToday] = useState([]);
  const [pending, setPending] = useState([]);
  const [draft, setDraft] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showToday, setShowToday] = useState(false);
  const [error, setError] = useState('');
  const [start, end] = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  useEffect(() => savePrefs({ view, doctorId }), [view, doctorId]);

  useEffect(() => {
    Promise.all([api.clinicHours(), api.doctors()])
      .then(([h, d]) => {
        setHours(h);
        setDoctors(d.items.filter((x) => x.in_calendar !== false)
          .map((x, i) => ({ ...x, color: x.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length] })));
      })
      .catch((e) => setError(e.message));
  }, []);

  const load = useCallback(async () => {
    const t = todayIso();
    try {
      const [cal, todays, requests] = await Promise.all([
        api.calendar({ start, end }),
        start <= t && t <= end ? null : api.calendar({ start: t, end: t }),
        api.appointments({ status: 'pending', limit: 200 }),
      ]);
      setItems(cal.items);
      setToday((todays || cal).items.filter((a) => a.date === t));
      setPending(requests.items.filter((a) => a.date >= t).sort((x, y) => (x.date + x.slot).localeCompare(y.date + y.slot)));
      setError('');
    } catch (e) {
      setError(e.message);
      setItems((list) => list || []);
    }
  }, [start, end]);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  useLiveEvents((event) => {
    if (event.type?.startsWith('appointment_')) load();
  });

  const byId = useMemo(() => Object.fromEntries(doctors.map((d) => [String(d.id), d])), [doctors]);
  const doctorOf = useCallback((a) => byId[String(a.doctor_id)] || null, [byId]);
  const colorOf = useCallback((a) => doctorOf(a)?.color || UNASSIGNED.color, [doctorOf]);
  const all = useMemo(() => [...(items || []), ...today, ...pending], [items, today, pending]);
  const opened = openId ? all.find((a) => a.id === openId) : null;

  const visible = useMemo(() => (items || []).filter((a) =>
    doctorId === 'all' ? true : doctorId === 'none' ? !a.doctor_id : String(a.doctor_id) === doctorId), [items, doctorId]);

  const counts = useMemo(() => {
    const c = { all: 0, none: 0 };
    (items || []).filter(holdsTime).forEach((a) => {
      c.all += 1;
      const key = a.doctor_id ? String(a.doctor_id) : 'none';
      c[key] = (c[key] || 0) + 1;
    });
    return c;
  }, [items]);

  const shift = (dir) => setAnchor((a) => (view === 'day' ? addDays(a, dir) : view === 'week' ? addDays(a, 7 * dir) : addMonths(a, dir)));

  const newBooking = (preset = {}) => {
    const slot = preset.slot || hhmm(Math.max(mins(hours?.sessions?.[0]?.from || '10:00'), Math.ceil(nowMinutes() / 15) * 15));
    setDraft({
      date: preset.date || (view === 'day' ? anchor : todayIso()),
      slot,
      doctor_id: preset.doctor_id ?? (doctorId !== 'all' && doctorId !== 'none' ? doctorId : ''),
      ...preset,
    });
  };

  const walkIn = () => newBooking({
    date: todayIso(), slot: hhmm(Math.floor(nowMinutes() / 5) * 5), category: 'walkin', status: 'checked_in',
  });

  const patch = async (appt, changes, message) => {
    setItems((list) => list?.map((a) => (a.id === appt.id ? { ...a, ...changes } : a)));
    try {
      const saved = await saveWithClashCheck(confirm, (force) => api.updateAppointment(appt.id, { ...changes, force }));
      if (saved && message) toast(message);
    } catch (e) {
      toast(e.message, 'error');
    }
    load();
  };

  const setStatus = (appt, status) => patch(appt, { status }, `${appt.name}: ${STATUS_LABELS[status]}`);
  const move = (appt, changes) => {
    if (changes.date === appt.date && changes.slot === appt.slot && (changes.doctor_id == null || String(changes.doctor_id) === String(appt.doctor_id))) return;
    patch(appt, changes, `${appt.name} moved to ${formatSlot(changes.slot)}`);
  };

  const remove = async (appt) => {
    const ok = await confirm({ title: 'Delete appointment', message: `Delete ${appt.name}’s appointment? This cannot be undone. To keep a record, cancel it instead.`, confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      await api.deleteAppointment(appt.id);
      toast('Appointment deleted');
      setOpenId(null);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const todayPanel = (
    <TodayPanel items={today} colorOf={colorOf} onOpen={(a) => setOpenId(a.id)} onStatus={setStatus} onWalkIn={walkIn} />
  );

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-9 -my-6 lg:-my-8 flex min-h-screen">
      {/* Doctors & categories */}
      <aside className="hidden lg:flex w-[230px] shrink-0 flex-col border-r border-[var(--a-border)] bg-[#0e141b]">
        <div className="p-4 border-b border-[var(--a-border)]">
          <Button className="w-full" onClick={() => newBooking()} disabled={!hours}><FiPlus /> New appointment</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 grid content-start gap-5">
          <div>
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">Doctors</p>
            <DoctorRow label="All doctors" count={counts.all} active={doctorId === 'all'} onClick={() => setDoctorId('all')} />
            {doctors.map((d) => (
              <DoctorRow key={d.id} label={d.name} color={d.color} count={counts[String(d.id)] || 0}
                active={doctorId === String(d.id)} onClick={() => setDoctorId(String(d.id))} />
            ))}
            {counts.none > 0 && (
              <DoctorRow label={UNASSIGNED.name} color={UNASSIGNED.color} count={counts.none}
                active={doctorId === 'none'} onClick={() => setDoctorId('none')} />
            )}
            {!doctors.length && (
              <p className="px-2 text-[12.5px] text-[var(--a-muted)]">Add doctors on the <Link to="/admin/doctors" className="text-[var(--a-accent)]">Doctors</Link> page.</p>
            )}
          </div>
          {hours && (
            <div>
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">Categories</p>
              {hours.categories.map((c) => (
                <p key={c.id} className="flex items-center gap-2.5 px-2 py-1.5 text-[13px] text-[var(--a-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />{c.label}
                </p>
              ))}
            </div>
          )}
          {pending.length > 0 && (
            <div>
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f2b356]">
                Requests to confirm · {pending.length}
              </p>
              <div className="grid gap-1">
                {pending.slice(0, 8).map((a) => (
                  <button key={a.id} onClick={() => { setOpenId(a.id); setAnchor(a.date); }}
                    className="text-left rounded-lg px-2 py-1.5 hover:bg-white/5">
                    <span className="block text-[13px] truncate">{a.name}</span>
                    <span className="block text-[11.5px] text-[var(--a-muted)]">{fmt(a.date, { day: 'numeric', month: 'short' })} · {formatSlot(a.slot)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Calendar */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="flex flex-wrap items-center gap-2.5 px-4 sm:px-5 py-3 border-b border-[var(--a-border)]">
          <h1 className="text-[20px] font-semibold tracking-tight mr-2">Calendar</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => shift(-1)} aria-label="Previous" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-white/8"><FiChevronLeft /></button>
            <span className="min-w-[150px] text-center text-[14px] font-medium">{rangeLabel(view, start, end, anchor)}</span>
            <button onClick={() => shift(1)} aria-label="Next" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-white/8"><FiChevronRight /></button>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setAnchor(todayIso())}>Today</Button>
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} aria-label="Doctor"
            className="lg:hidden rounded-lg border border-[var(--a-border)] bg-[#0e141b] px-2.5 py-2 text-[13px]">
            <option value="all">All doctors</option>
            {doctors.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
            <option value="none">Not assigned</option>
          </select>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Segmented options={VIEWS} value={view} onChange={setView} />
            <Button size="sm" variant="secondary" className="xl:hidden" onClick={() => setShowToday(true)}>Today’s list</Button>
            <Link to="/admin/appointments/list" className="inline-flex items-center gap-2 rounded-xl border border-[var(--a-border)] px-3 py-2 text-[13px] text-[var(--a-muted)] hover:text-white hover:bg-white/5">
              <FiList /> List
            </Link>
            <Button size="sm" className="lg:hidden" onClick={() => newBooking()} disabled={!hours}><FiPlus /></Button>
          </div>
        </header>
        {error && <div className="px-5 pt-3"><ErrorNote>{error}</ErrorNote></div>}

        <div className="flex-1 min-h-0">
          {!hours || items === null ? (
            <div className="p-5 grid gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : view === 'month' ? (
            <MonthGrid start={start} end={end} anchor={anchor} items={visible} colorOf={colorOf} hours={hours}
              onDay={(d) => { setAnchor(d); setView('day'); }} />
          ) : (
            <TimeGrid
              hours={hours}
              items={visible}
              columns={view === 'day'
                ? dayColumns(anchor, doctorId, doctors, visible, byId, hours)
                : Array.from({ length: 7 }, (_, i) => {
                  const date = addDays(start, i);
                  return { key: date, date, label: fmt(date, { weekday: 'short' }), sub: fmt(date, { day: 'numeric', month: 'short' }), closed: hours.closed_weekdays.includes(weekday(date)), today: date === todayIso() };
                })}
              colorOf={colorOf}
              onSlot={(column, slot) => newBooking({ date: column.date, slot, ...(column.doctorId ? { doctor_id: column.doctorId } : {}) })}
              onOpen={(a) => setOpenId(a.id)}
              onMove={move}
            />
          )}
        </div>
      </section>

      {/* Today */}
      <aside className="hidden xl:flex w-[290px] shrink-0 flex-col border-l border-[var(--a-border)] bg-[#0e141b]">{todayPanel}</aside>
      <Drawer open={showToday} title="Today’s schedule" onClose={() => setShowToday(false)}>{todayPanel}</Drawer>

      <BookingModal draft={draft} hours={hours} doctors={doctors} onClose={() => setDraft(null)}
        onSaved={(saved) => { setDraft(null); if (saved?.date) setAnchor(saved.date); load(); }} />
      {opened && (
        <AppointmentDrawer appointment={opened} doctor={doctorOf(opened)} onClose={() => setOpenId(null)}
          onEdit={(a) => { setOpenId(null); setDraft({ appointment: a }); }}
          onStatus={setStatus} onDelete={remove} />
      )}
    </div>
  );
}

function dayColumns(date, doctorId, doctors, items, byId, hours) {
  const base = { date, closed: hours.closed_weekdays.includes(weekday(date)), today: date === todayIso() };
  if (doctorId !== 'all') {
    const d = doctorId === 'none' ? UNASSIGNED : byId[doctorId];
    return [{ ...base, key: doctorId, label: d?.name || 'Doctor', color: d?.color, doctorId: doctorId === 'none' ? null : doctorId, filter: () => true }];
  }
  const columns = doctors.map((d) => ({
    ...base, key: String(d.id), label: d.name, color: d.color, doctorId: String(d.id),
    filter: (a) => String(a.doctor_id) === String(d.id),
  }));
  const known = new Set(doctors.map((d) => String(d.id)));
  if (!columns.length || items.some((a) => a.date === date && !known.has(String(a.doctor_id)))) {
    columns.push({ ...base, key: 'none', label: UNASSIGNED.name, color: UNASSIGNED.color, doctorId: null,
      filter: (a) => !known.has(String(a.doctor_id)) });
  }
  return columns;
}

function DoctorRow({ label, color, count, active, onClick }) {
  return (
    <button onClick={onClick}
      className={cx('w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13.5px] transition-colors',
        active ? 'bg-[var(--a-accent-soft)] text-white' : 'text-[var(--a-muted)] hover:bg-white/5 hover:text-white')}>
      {color ? <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ background: color }} /> : <FiUsers className="w-3.5 h-3.5 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[12px] tabular-nums text-white/40">{count}</span>
    </button>
  );
}

/* ---------------------------------------------------------------- day / week time grid */

function TimeGrid({ hours, items, columns, colorOf, onSlot, onOpen, onMove }) {
  const step = hours.slot_minutes;
  const sessions = hours.sessions.map((s) => [mins(s.from), mins(s.to)]);
  const [now, setNow] = useState(nowMinutes);
  const [dropAt, setDropAt] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutes()), 60000);
    return () => clearInterval(id);
  }, []);

  // Grid covers clinic hours, stretched to show any booking outside them.
  let gridStart = Math.min(...sessions.map((s) => s[0]));
  let gridEnd = Math.max(...sessions.map((s) => s[1]));
  items.forEach((a) => {
    gridStart = Math.min(gridStart, Math.floor(mins(a.slot) / 60) * 60);
    gridEnd = Math.max(gridEnd, mins(a.slot) + (a.duration || 15));
  });
  gridEnd = Math.ceil(gridEnd / step) * step;
  const rows = [];
  for (let m = gridStart; m < gridEnd; m += step) rows.push(m);
  const isOpen = (m) => sessions.some(([f, t]) => m >= f && m < t);
  const minWidth = columns.length > 1 ? (columns[0].doctorId !== undefined ? 170 : 120) : 240;

  const byColumn = (c) => items.filter((a) => a.date === c.date && (c.filter ? c.filter(a) : true));

  const drop = (e, column, slot) => {
    e.preventDefault();
    setDropAt(null);
    const id = e.dataTransfer.getData('text/plain');
    const appt = items.find((a) => a.id === id);
    if (!appt) return;
    onMove(appt, { date: column.date, slot: hhmm(slot), ...(column.doctorId ? { doctor_id: Number(column.doctorId) } : {}) });
  };

  return (
    <div className="h-[calc(100vh-61px)] overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: `60px repeat(${columns.length}, minmax(${minWidth}px, 1fr))` }}>
        {/* header row */}
        <div className="sticky top-0 left-0 z-30 bg-[var(--a-bg)] border-b border-[var(--a-border)]" />
        {columns.map((c) => (
          <div key={c.key} className={cx('sticky top-0 z-20 border-b border-l border-[var(--a-border)] px-2 py-2.5 text-center',
            c.today ? 'bg-[#13302c]' : 'bg-[var(--a-bg)]')}>
            <p className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold truncate">
              {c.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />}
              <span className="truncate">{c.label}</span>
            </p>
            {c.sub && <p className={cx('text-[11.5px]', c.today ? 'text-[#7fe3d3]' : 'text-[var(--a-muted)]')}>{c.sub}{c.closed ? ' · closed' : ''}</p>}
          </div>
        ))}

        {/* time gutter */}
        <div className="sticky left-0 z-10 bg-[var(--a-bg)]">
          {rows.map((m) => (
            <div key={m} style={{ height: ROW_H }} className={cx('pr-2 text-right text-[10.5px] leading-none pt-1', m % 60 === 0 ? 'text-[var(--a-muted)] font-medium' : 'text-white/25')}>
              {formatSlot(hhmm(m))}
            </div>
          ))}
        </div>

        {/* columns */}
        {columns.map((c) => {
          const laid = layout(byColumn(c));
          const showNow = c.today && now >= gridStart && now < gridEnd;
          return (
            <div key={c.key} className="relative border-l border-[var(--a-border)]">
              {rows.map((m) => {
                const closed = c.closed || !isOpen(m);
                const target = dropAt === `${c.key}|${m}`;
                return (
                  <button key={m} type="button" style={{ height: ROW_H }}
                    aria-label={`Book ${formatSlot(hhmm(m))}${c.doctorId ? ` with ${c.label}` : ''} on ${c.date}`}
                    onClick={() => onSlot(c, hhmm(m))}
                    onDragOver={(e) => { e.preventDefault(); if (!target) setDropAt(`${c.key}|${m}`); }}
                    onDragLeave={() => target && setDropAt(null)}
                    onDrop={(e) => drop(e, c, m)}
                    className={cx('group block w-full border-b text-left transition-colors',
                      m % 60 === 45 ? 'border-white/10' : 'border-white/[0.04]',
                      target ? 'bg-[var(--a-accent)]/30' : closed ? 'cal-closed hover:bg-white/5' : 'hover:bg-[var(--a-accent-soft)]')}>
                    <span className="hidden group-hover:block pl-1.5 text-[10.5px] text-[#7fe3d3]">+ {formatSlot(hhmm(m))}</span>
                  </button>
                );
              })}

              {laid.map(({ a, start, end, lane, lanes }) => (
                <AppointmentBlock key={a.id} a={a} color={colorOf(a)}
                  style={{
                    top: ((start - gridStart) / step) * ROW_H + 1,
                    height: Math.max(((end - start) / step) * ROW_H - 2, 22),
                    left: `calc(${(lane / lanes) * 100}% + 2px)`,
                    width: `calc(${100 / lanes}% - 4px)`,
                  }}
                  onOpen={onOpen} />
              ))}

              {showNow && (
                <div className="pointer-events-none absolute inset-x-0 z-[15] h-0.5 bg-[#f59f00]" style={{ top: ((now - gridStart) / step) * ROW_H }}>
                  <span className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-[#f59f00]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CATEGORY_COLORS = { high_priority: '#e8743b', telephonic: '#5b8fd0', walkin: '#3fae6a' };

function AppointmentBlock({ a, color, style, onOpen }) {
  const off = !holdsTime(a);
  const tall = style.height > 40;
  return (
    <button type="button" draggable={!off}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', a.id); e.dataTransfer.effectAllowed = 'move'; }}
      onClick={(e) => { e.stopPropagation(); onOpen(a); }}
      title={`${formatSlot(a.slot)} · ${a.name} · ${STATUS_LABELS[a.status]}${a.procedures ? ` · ${a.procedures}` : ''}`}
      className={cx('absolute z-10 overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11.5px] leading-tight shadow-sm transition-[filter] hover:brightness-125',
        a.status === 'pending' && 'outline outline-1 outline-dashed outline-[#f2b356]/80',
        off && 'opacity-45 line-through')}
      style={{ ...style, borderLeftColor: color, background: `${color}${a.status === 'completed' ? '30' : '55'}` }}>
      <span className="flex items-center gap-1 font-semibold text-white truncate">
        {a.category && <span className="w-1.5 h-1.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[a.category] }} title={CATEGORY_LABELS[a.category]} />}
        <span className="truncate">{a.name}</span>
      </span>
      <span className="block truncate text-white/70">
        {formatSlot(a.slot)}{a.status !== 'confirmed' ? ` · ${STATUS_LABELS[a.status]}` : ''}
      </span>
      {tall && a.procedures && <span className="block truncate text-white/60">{a.procedures}</span>}
    </button>
  );
}

/* ---------------------------------------------------------------- month grid */

function MonthGrid({ start, end, anchor, items, colorOf, hours, onDay }) {
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const byDay = {};
  items.filter(holdsTime).forEach((a) => { (byDay[a.date] ||= []).push(a); });
  const month = anchor.slice(0, 7);
  const t = todayIso();

  return (
    <div className="h-[calc(100vh-61px)] overflow-auto p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-[var(--a-border)] bg-[var(--a-border)] min-w-[640px]">
        {DOW.map((d) => <div key={d} className="bg-[var(--a-surface)] px-2 py-2 text-[11.5px] font-semibold uppercase tracking-wider text-[var(--a-muted)]">{d}</div>)}
        {days.map((d) => {
          const list = (byDay[d] || []).sort((x, y) => x.slot.localeCompare(y.slot));
          const inMonth = d.slice(0, 7) === month;
          const closed = hours.closed_weekdays.includes(weekday(d));
          return (
            <button key={d} onClick={() => onDay(d)}
              className={cx('min-h-[112px] p-2 text-left align-top transition-colors hover:bg-white/5',
                inMonth ? (closed ? 'bg-[#10161d]' : 'bg-[var(--a-bg)]') : 'bg-[#0a0e13] opacity-50')}>
              <span className="flex items-center justify-between">
                <span className={cx('grid place-items-center w-6 h-6 rounded-full text-[12.5px]', d === t ? 'bg-[var(--a-accent)] text-white font-semibold' : 'text-white/80')}>
                  {Number(d.slice(8))}
                </span>
                {list.length > 0 && <span className="text-[11px] text-[var(--a-muted)]">{list.length}</span>}
              </span>
              <span className="mt-1.5 grid gap-0.5">
                {list.slice(0, 3).map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5 truncate text-[11.5px] text-white/80">
                    <span className="w-1.5 h-1.5 shrink-0 rounded-full" style={{ background: colorOf(a) }} />
                    <span className="truncate">{formatSlot(a.slot)} {a.name}</span>
                  </span>
                ))}
                {list.length > 3 && <span className="text-[11px] text-[var(--a-muted)]">+{list.length - 3} more</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- today's schedule */

const TODAY_TABS = [
  { key: 'all', label: 'Today', match: holdsTime, tone: 'bg-white/12 text-white' },
  { key: 'waiting', label: 'Waiting', match: (a) => a.status === 'checked_in', tone: 'bg-[#f0616d] text-white' },
  { key: 'engaged', label: 'Engaged', match: (a) => a.status === 'engaged', tone: 'bg-[#22b8cf] text-white' },
  { key: 'done', label: 'Done', match: (a) => a.status === 'completed', tone: 'bg-[#2f9e44] text-white' },
];
const QUICK = { pending: ['confirmed', 'Confirm'], confirmed: ['checked_in', 'Check in'], checked_in: ['engaged', 'Engage'], engaged: ['completed', 'Done'] };

function TodayPanel({ items, colorOf, onOpen, onStatus, onWalkIn }) {
  const [tab, setTab] = useState('all');
  const active = TODAY_TABS.find((t) => t.key === tab);
  const list = items.filter(active.match).sort((x, y) => x.slot.localeCompare(y.slot));

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-[var(--a-border)] grid gap-3">
        <p className="text-[14px] font-semibold">Today’s schedule</p>
        <Button variant="secondary" onClick={onWalkIn}><FiUserPlus /> Add walk-in</Button>
        <div className="grid grid-cols-4 gap-1.5">
          {TODAY_TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cx('rounded-lg py-1.5 text-center transition-colors', tab === t.key ? 'bg-white/8 ring-1 ring-white/15' : 'hover:bg-white/5')}>
              <span className="block text-[10px] uppercase tracking-wider text-[var(--a-muted)]">{t.label}</span>
              <span className={cx('mx-auto mt-1 grid place-items-center min-w-[28px] w-fit px-1.5 rounded text-[12.5px] font-semibold', t.tone)}>
                {items.filter(t.match).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-[var(--a-muted)]"><FiCalendar className="mx-auto mb-2" />No appointments</p>
        ) : (
          <ul className="divide-y divide-[var(--a-border)]">
            {list.map((a) => {
              const quick = QUICK[a.status];
              return (
                <li key={a.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/3">
                  <span className="w-1 self-stretch rounded-full" style={{ background: colorOf(a) }} />
                  <button onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left">
                    <span className="block text-[13.5px] truncate">{a.name}</span>
                    <span className="block text-[11.5px] text-[var(--a-muted)] truncate">
                      {formatSlot(a.slot)} · {STATUS_LABELS[a.status]}{a.doctor ? ` · ${a.doctor}` : ''}
                    </span>
                  </button>
                  {quick && (
                    <button onClick={() => onStatus(a, quick[0])}
                      className="shrink-0 rounded-md border border-[var(--a-border)] px-2 py-1 text-[11.5px] text-[var(--a-muted)] hover:text-white hover:bg-white/8">
                      {quick[1]}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {items.some((a) => a.status === 'pending') && (
        <p className="m-3 flex items-start gap-2 rounded-lg bg-[#f2b356]/10 px-3 py-2 text-[12px] text-[#f2b356]">
          <FiAlertCircle className="mt-0.5 shrink-0" /> Some of today’s bookings are still requests — confirm them so the patient is told.
        </p>
      )}
    </div>
  );
}
