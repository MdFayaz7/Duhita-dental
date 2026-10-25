import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle, FiChevronLeft, FiChevronRight, FiList, FiPlus, FiUserPlus,
} from 'react-icons/fi';
import { api } from './api';
import {
  Button, Drawer, ErrorNote, Segmented, Skeleton, STATUS_LABELS, cx, formatSlot, todayIso, useConfirm, useToast,
} from './ui';
import { useLiveEvents } from '../lib/useLiveEvents';
import { AppointmentDrawer, BookingModal, CATEGORY_LABELS, saveWithClashCheck } from './CalendarBooking';

const ROW_H = 40; // px per 15-minute row (Practo's spacing)
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

/** The next 15-minute start inside clinic hours (skips the lunch break; first slot tomorrow-style after closing). */
function nextOpenSlot(hours) {
  const step = hours?.slot_minutes || 15;
  const sessions = (hours?.sessions || [{ from: '10:00', to: '13:00' }]).map((x) => [mins(x.from), mins(x.to)]);
  const now = Math.ceil(nowMinutes() / step) * step;
  const open = sessions.find(([, to]) => now < to);
  return hhmm(open ? Math.max(open[0], now) : sessions[0][0]);
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
    const slot = preset.slot || nextOpenSlot(hours);
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
    // Fills the area under the admin top bar (60px), like Practo's calendar screen.
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-[calc(100vh-60px)] bg-white">
      {/* Title bar: Calendar · date range · Today · Day/Week/Month */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-2.5 bg-[var(--a-toolbar)] border-b border-[var(--a-border)]">
        <h1 className="text-[24px] font-light text-[#333]">Calendar</h1>
        <span className="hidden md:block text-[13px] uppercase tracking-wide text-[#777] truncate max-w-[300px]">Duhita Multispeciality Dental Centre</span>
        <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} aria-label="Doctor"
          className="lg:hidden h-[34px] rounded-[3px] border border-[#c8c8c8] bg-white px-2 text-[13px]">
          <option value="all">All doctors</option>
          {doctors.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          <option value="none">Not assigned</option>
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <button onClick={() => shift(-1)} aria-label="Previous" className="w-8 h-8 grid place-items-center text-[#555] hover:text-black"><FiChevronLeft className="w-5 h-5" /></button>
            <span className="min-w-[150px] text-center text-[15px] font-medium text-[#333]">{rangeLabel(view, start, end, anchor)}</span>
            <button onClick={() => shift(1)} aria-label="Next" className="w-8 h-8 grid place-items-center text-[#555] hover:text-black"><FiChevronRight className="w-5 h-5" /></button>
          </div>
          <Button variant="secondary" onClick={() => setAnchor(todayIso())}>Today</Button>
          <Segmented options={VIEWS} value={view} onChange={setView} />
          <Link to="/admin/appointments/list" title="List view"
            className="inline-flex items-center gap-1.5 h-[38px] px-3 rounded-[3px] border border-[#c8c8c8] bg-white text-[14px] text-[#555] hover:bg-[#f5f5f5]">
            <FiList /> <span className="hidden sm:inline">List</span>
          </Link>
          <Button variant="secondary" className="xl:hidden" onClick={() => setShowToday(true)}>Today’s schedule</Button>
        </div>
      </header>
      {error && <div className="px-5 pt-3"><ErrorNote>{error}</ErrorNote></div>}

      <div className="flex flex-1 min-h-0">
        {/* Doctors & categories */}
        <aside className="hidden lg:flex w-[250px] shrink-0 flex-col border-r border-[var(--a-border)] bg-white">
          <button onClick={() => newBooking()} disabled={!hours}
            className="flex items-center justify-center gap-2.5 h-[52px] border-b border-[var(--a-border)] text-[15px] text-[#333] hover:bg-[#fafafa] disabled:opacity-50">
            <FiPlus className="w-[18px] h-[18px] text-[var(--a-accent)]" /> New Appointment
          </button>
          <div className="flex-1 overflow-y-auto">
            <p className="px-5 pt-4 pb-2 text-[14px] font-medium uppercase text-[#444] bg-[var(--a-panel)] border-b border-[var(--a-border)]">Doctors</p>
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
              <p className="px-5 py-3 text-[13px] text-[var(--a-muted)]">Add doctors on the <Link to="/admin/doctors" className="text-[var(--a-link)]">Doctors</Link> page.</p>
            )}

            {hours && (
              <div className="mt-4 mx-5 pt-4 border-t border-[var(--a-border)]">
                <p className="flex items-center justify-between pb-2 text-[14px] font-medium uppercase text-[#444]">
                  Categories <Link to="/admin/appointments/list" className="text-[12px] normal-case text-[var(--a-link)]">VIEW ALL</Link>
                </p>
                {hours.categories.map((c) => (
                  <p key={c.id} className="flex items-center gap-2.5 py-1.5 text-[14px] text-[#555]">
                    <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />{c.label} Appointment
                  </p>
                ))}
              </div>
            )}

            {pending.length > 0 && (
              <div className="mt-4 mx-5 pt-4 pb-4 border-t border-[var(--a-border)]">
                <p className="pb-2 text-[14px] font-medium uppercase text-[#444]">
                  Online requests <span className="ml-1 inline-grid place-items-center min-w-[22px] h-[20px] px-1 rounded-[3px] bg-[#ffb74d] text-[12px] text-white">{pending.length}</span>
                </p>
                {pending.slice(0, 8).map((a) => (
                  <button key={a.id} onClick={() => { setOpenId(a.id); setAnchor(a.date); }}
                    className="w-full text-left py-1.5 hover:text-[var(--a-link)]">
                    <span className="block text-[14px] uppercase truncate text-[#333]">{a.name}</span>
                    <span className="block text-[12px] text-[#888]">{fmt(a.date, { day: 'numeric', month: 'short' })} · {formatSlot(a.slot)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Grid */}
        <section className="flex-1 min-w-0 min-h-0 relative">
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
                  return { key: date, date, label: `${fmt(date, { weekday: 'short' })} ${fmt(date, { day: 'numeric', month: 'short' })}`.toUpperCase(), closed: hours.closed_weekdays.includes(weekday(date)), today: date === todayIso() };
                })}
              colorOf={colorOf}
              onSlot={(column, slot) => newBooking({ date: column.date, slot, ...(column.doctorId ? { doctor_id: column.doctorId } : {}) })}
              onOpen={(a) => setOpenId(a.id)}
              onMove={move}
            />
          )}
          <button onClick={() => newBooking()} disabled={!hours} aria-label="New appointment"
            className="lg:hidden absolute right-4 bottom-4 z-30 w-14 h-14 rounded-full bg-[var(--a-accent)] text-white shadow-lg grid place-items-center"><FiPlus className="w-6 h-6" /></button>
        </section>

        {/* Today */}
        <aside className="hidden xl:flex w-[300px] shrink-0 flex-col border-l border-[var(--a-border)] bg-white">{todayPanel}</aside>
      </div>
      <Drawer open={showToday} title="Today’s Schedule" onClose={() => setShowToday(false)}>{todayPanel}</Drawer>

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
      className={cx('w-full flex items-center gap-3 px-5 h-[40px] text-left text-[14px] uppercase transition-colors',
        active ? 'bg-[var(--a-selected)] text-white' : 'text-[#444] hover:bg-[#f5f5f5]')}>
      {color ? <span className="w-3 h-3 shrink-0 rounded-full" style={{ background: color }} /> : null}
      <span className="flex-1 truncate">{label}</span>
      <span className={cx('text-[14px] tabular-nums', active ? 'text-white' : 'text-[#666]')}>{count}</span>
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
  const minWidth = columns.length > 1 ? (columns[0].doctorId !== undefined ? 160 : 118) : 240;

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
    <div className="absolute inset-0 overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: `72px repeat(${columns.length}, minmax(${minWidth}px, 1fr))` }}>
        {/* header row */}
        <div className="sticky top-0 left-0 z-30 bg-white border-b border-r border-[var(--a-border)] grid place-items-center text-[#999]">
          <span className="text-[12px]">IST</span>
        </div>
        {columns.map((c) => (
          <div key={c.key} title={c.closed ? 'Clinic closed (by appointment only)' : undefined} className={cx('sticky top-0 z-20 h-[46px] grid place-items-center border-b border-r border-[var(--a-border)] px-2 text-center',
            c.today ? 'bg-[#7c8191] text-white' : 'bg-white text-[#666]')}>
            <p className="flex items-center justify-center gap-1.5 text-[13px] truncate max-w-full">
              {c.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />}
              <span className="truncate">{c.label}</span>
            </p>
          </div>
        ))}

        {/* time gutter */}
        <div className="sticky left-0 z-10 bg-white border-r border-[var(--a-border)]">
          {rows.map((m) => (
            <div key={m} style={{ height: ROW_H }} className="relative border-b border-[var(--a-grid)] pr-2 pt-1 text-right text-[12px] leading-none text-[#888]">
              {formatSlot(hhmm(m))}
              {m <= now && now < m + step && columns.some((c) => c.today) && (
                <span className="absolute right-0 border-y-[5px] border-y-transparent border-l-[6px] border-l-[var(--a-accent)]"
                  style={{ top: ((now - m) / step) * ROW_H - 5 }} />
              )}
            </div>
          ))}
        </div>

        {/* columns */}
        {columns.map((c) => {
          const laid = layout(byColumn(c));
          const showNow = c.today && now >= gridStart && now < gridEnd;
          return (
            <div key={c.key} className="relative border-r border-[var(--a-border)]">
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
                    className={cx('group block w-full border-b border-[var(--a-grid)] text-left transition-colors',
                      target ? 'bg-[var(--a-accent)]/25'
                        : closed ? 'cal-closed hover:bg-[#e2e2e2]'
                          : c.today ? 'bg-[#fdf3e6] hover:bg-[#fbe6cc]' : 'hover:bg-[#f3f6ff]')}>
                    <span className="hidden group-hover:block pl-2 text-[12px] text-[#888]">+ {formatSlot(hhmm(m))}</span>
                  </button>
                );
              })}

              {laid.map(({ a, start, end, lane, lanes }) => (
                <AppointmentBlock key={a.id} a={a} color={colorOf(a)}
                  style={{
                    top: ((start - gridStart) / step) * ROW_H + 1,
                    height: Math.max(((end - start) / step) * ROW_H - 2, 24),
                    left: `calc(${(lane / lanes) * 100}% + 3px)`,
                    width: `calc(${100 / lanes}% - 6px)`,
                  }}
                  onOpen={onOpen} />
              ))}

              {showNow && (
                <div className="pointer-events-none absolute inset-x-0 z-[15] h-[2px] bg-[var(--a-accent)]" style={{ top: ((now - gridStart) / step) * ROW_H }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CATEGORY_COLORS = { high_priority: '#f26b3a', telephonic: '#5b8fd0', walkin: '#3fae6a' };

/** Practo-style block: a pale tint of the doctor's colour with a solid bar on the left. */
function AppointmentBlock({ a, color, style, onOpen }) {
  const off = !holdsTime(a);
  const tall = style.height > 44;
  return (
    <button type="button" draggable={!off}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', a.id); e.dataTransfer.effectAllowed = 'move'; }}
      onClick={(e) => { e.stopPropagation(); onOpen(a); }}
      title={`${formatSlot(a.slot)} · ${a.name} · ${STATUS_LABELS[a.status]}${a.procedures ? ` · ${a.procedures}` : ''}`}
      className={cx('absolute z-10 overflow-hidden rounded-[2px] border-l-[4px] px-1.5 py-[3px] text-left leading-tight transition-shadow hover:shadow-md',
        a.status === 'pending' && 'outline outline-1 outline-dashed outline-[#e0861a] -outline-offset-1',
        off && 'opacity-50')}
      style={{ ...style, borderLeftColor: color, background: `color-mix(in srgb, ${color} ${a.status === 'completed' ? 14 : 30}%, white)` }}>
      <span className="flex items-center gap-1 text-[13px] uppercase text-[#333] truncate">
        {a.category && <span className="w-2 h-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[a.category] }} title={CATEGORY_LABELS[a.category]} />}
        <span className={cx('truncate', off && 'line-through')}>{a.name}</span>
      </span>
      <span className="block truncate text-[11.5px] text-[#555]">
        {formatSlot(a.slot)}{a.status !== 'confirmed' ? ` · ${STATUS_LABELS[a.status]}` : ''}
      </span>
      {tall && a.procedures && <span className="block truncate text-[11.5px] text-[#666]">{a.procedures}</span>}
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
    <div className="absolute inset-0 overflow-auto">
      <div className="grid grid-cols-7 min-w-[700px] border-l border-[var(--a-border)]">
        {DOW.map((d) => (
          <div key={d} className="sticky top-0 z-10 h-[46px] grid place-items-center bg-white border-b border-r border-[var(--a-border)] text-[13px] uppercase text-[#666]">{d}</div>
        ))}
        {days.map((d) => {
          const list = (byDay[d] || []).sort((x, y) => x.slot.localeCompare(y.slot));
          const inMonth = d.slice(0, 7) === month;
          const closed = hours.closed_weekdays.includes(weekday(d));
          return (
            <button key={d} onClick={() => onDay(d)}
              className={cx('min-h-[118px] p-2 text-left align-top border-b border-r border-[var(--a-border)] transition-colors hover:bg-[#f3f6ff]',
                d === t ? 'bg-[#fdf3e6]' : !inMonth ? 'bg-[#fafafa] text-[#bbb]' : closed ? 'bg-[#f3f3f3]' : 'bg-white')}>
              <span className="flex items-center justify-between">
                <span className={cx('grid place-items-center w-7 h-7 rounded-full text-[13px]', d === t ? 'bg-[var(--a-accent)] text-white' : inMonth ? 'text-[#444]' : 'text-[#bbb]')}>
                  {Number(d.slice(8))}
                </span>
                {list.length > 0 && <span className="text-[12px] text-[#888]">{list.length} appt{list.length > 1 ? 's' : ''}</span>}
              </span>
              <span className="mt-1.5 grid gap-[3px]">
                {list.slice(0, 3).map((a) => (
                  <span key={a.id} className="truncate rounded-[2px] border-l-[3px] px-1.5 py-[1px] text-[11.5px] uppercase text-[#333]"
                    style={{ borderLeftColor: colorOf(a), background: `color-mix(in srgb, ${colorOf(a)} 25%, white)` }}>
                    {formatSlot(a.slot)} {a.name}
                  </span>
                ))}
                {list.length > 3 && <span className="text-[12px] text-[var(--a-link)]">+{list.length - 3} more</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- today's schedule */

const COUNTERS = [
  { key: 'all', label: 'Today', match: holdsTime, tone: 'bg-[#6d6d6d]' },
  { key: 'waiting', label: 'Waiting', match: (a) => a.status === 'checked_in', tone: 'bg-[var(--a-waiting)]' },
  { key: 'engaged', label: 'Engaged', match: (a) => a.status === 'engaged', tone: 'bg-[var(--a-engaged)]' },
  { key: 'done', label: 'Done', match: (a) => a.status === 'completed', tone: 'bg-[var(--a-done)]' },
];
const CHANNELS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'online', label: 'Online', match: (a) => a.source === 'website' || a.source === 'app' },
  { key: 'offline', label: 'Offline', match: (a) => a.source !== 'website' && a.source !== 'app' },
];
const QUICK = { pending: ['confirmed', 'Confirm'], confirmed: ['checked_in', 'Check in'], checked_in: ['engaged', 'Engage'], engaged: ['completed', 'Done'] };

function TodayPanel({ items, colorOf, onOpen, onStatus, onWalkIn }) {
  const [counter, setCounter] = useState('all');
  const [channel, setChannel] = useState('all');
  const inChannel = items.filter(CHANNELS.find((c) => c.key === channel).match);
  const list = inChannel.filter(COUNTERS.find((c) => c.key === counter).match).sort((x, y) => x.slot.localeCompare(y.slot));

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--a-border)]">
        <p className="text-[15px] text-[#333]">Today’s Schedule</p>
        <Button variant="outline" className="mt-3 w-full" onClick={onWalkIn}><FiUserPlus /> Add Walk-in Appointment</Button>
      </div>
      <div className="flex justify-center gap-6 bg-[var(--a-toolbar)] border-b border-[var(--a-border)]">
        {CHANNELS.map((c) => (
          <button key={c.key} onClick={() => setChannel(c.key)}
            className={cx('py-2.5 text-[15px] border-b-[3px] -mb-px', channel === c.key ? 'border-[var(--a-accent)] text-[#333] font-medium' : 'border-transparent text-[#666] hover:text-[#333]')}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 border-b border-[var(--a-border)]">
        {COUNTERS.map((c) => (
          <button key={c.key} onClick={() => setCounter(c.key)}
            className={cx('relative py-3 text-center', counter === c.key && 'bg-[#fafafa]')}>
            <span className={cx('block text-[11px] uppercase', counter === c.key ? 'text-[#333] font-medium' : 'text-[#777]')}>{c.label}</span>
            <span className={cx('mx-auto mt-1.5 grid place-items-center min-w-[34px] w-fit h-[26px] px-2 rounded-[3px] text-[14px] text-white', c.tone)}>
              {inChannel.filter(c.match).length}
            </span>
            {counter === c.key && <span className="absolute left-1/2 -translate-x-1/2 bottom-0 border-x-[7px] border-x-transparent border-b-[7px] border-b-[var(--a-border)]" />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <p className="px-4 py-4 text-[15px] text-[#555]">No appointments</p>
        ) : (
          <ul className="divide-y divide-[var(--a-border)]">
            {list.map((a) => {
              const quick = QUICK[a.status];
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafafa]">
                  <span className="w-[4px] self-stretch rounded-[1px]" style={{ background: colorOf(a) }} />
                  <button onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left">
                    <span className="block text-[14px] uppercase truncate text-[#333]">{a.name}</span>
                    <span className="block text-[12px] text-[#888] truncate">
                      {formatSlot(a.slot)} · {STATUS_LABELS[a.status]}{a.doctor ? ` · ${a.doctor}` : ''}
                    </span>
                  </button>
                  {quick && (
                    <button onClick={() => onStatus(a, quick[0])}
                      className="shrink-0 rounded-[3px] border border-[#c8c8c8] bg-white px-2.5 py-1 text-[12px] text-[#555] hover:border-[var(--a-accent)] hover:text-[var(--a-accent)]">
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
        <p className="m-3 flex items-start gap-2 rounded-[3px] bg-[#fff3e3] border border-[#f7cf9b] px-3 py-2 text-[12.5px] text-[#9a5a12]">
          <FiAlertCircle className="mt-0.5 shrink-0" /> Some of today’s bookings are online requests — confirm them so the patient is told.
        </p>
      )}
    </div>
  );
}
