import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { FiArrowRight, FiCalendar, FiClock, FiFileText, FiImage, FiRefreshCw, FiUserCheck, FiUsers } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import { Button, EmptyState, ErrorNote, Panel, Skeleton, StatusPill, formatDateTime, formatSlot } from './ui';
import { useLiveEvents } from '../lib/useLiveEvents';

const Kpi = ({ icon: Icon, label, value, sub, to, tone = 'text-[var(--a-accent)] bg-[var(--a-accent-soft)]' }) => {
  const inner = (
    <Panel className="p-5 h-full transition-colors hover:border-white/25">
      <div className="flex items-center justify-between">
        <span className={`w-10 h-10 grid place-items-center rounded-xl ${tone}`}><Icon className="w-[18px] h-[18px]" /></span>
        {sub && <span className="text-[12px] font-medium text-[var(--a-muted)] bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">{sub}</span>}
      </div>
      <p className="mt-4 text-[28px] font-semibold leading-none">{value}</p>
      <p className="mt-2 text-[13px] text-[var(--a-muted)]">{label}</p>
    </Panel>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const SectionHead = ({ title, to, linkLabel }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[var(--a-border)]">
    <h2 className="text-[15.5px] font-semibold">{title}</h2>
    {to && (
      <Link to={to} className="inline-flex items-center gap-1.5 text-[13px] text-[var(--a-accent)] hover:underline">
        {linkLabel} <FiArrowRight className="w-3.5 h-3.5" />
      </Link>
    )}
  </div>
);

export default function Overview() {
  const { user } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [s, f] = await Promise.all([api.overview(), api.dashboard()]);
      setStats(s);
      setFeed(f);
      setError('');
    } catch (e) {
      if (!silent) setError(e.message);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useLiveEvents((event) => {
    if (['appointment_created', 'appointment_updated', 'appointment_deleted', 'patient_registered', 'patient_deleted', 'stats_updated', 'schedule_updated'].includes(event.type)) {
      fetchData(true);
    }
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 5000);

    const onFocus = () => fetchData(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchData]);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });

  return (
    <>
      <PageHead
        title={`Good day${user ? `, ${user}` : ''}`}
        subtitle={today}
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium">Live sync</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => fetchData(false)} disabled={refreshing}>
              <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[var(--a-accent)]' : ''}`} />
              {refreshing ? 'Updating…' : 'Refresh'}
            </Button>
          </div>
        }
      />
      <ErrorNote>{error}</ErrorNote>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats ? (
          <>
            <Kpi
              icon={FiCalendar}
              label="Total Appointments"
              value={stats.appointments_total}
              sub={stats.appointments_today > 0 ? `${stats.appointments_today} today` : 'All time'}
              to="/admin/appointments"
            />
            <Kpi
              icon={FiClock}
              label="Awaiting Confirmation"
              value={stats.appointments_pending}
              sub={stats.appointments_pending > 0 ? 'Pending' : 'All clear'}
              to="/admin/appointments"
              tone="text-[#f2b356] bg-[#f2b356]/14"
            />
            <Kpi
              icon={FiUsers}
              label="Registered Patients"
              value={stats.patients_total}
              sub={stats.patients_this_week > 0 ? `+${stats.patients_this_week} this wk` : 'Total records'}
              to="/admin/patients"
              tone="text-[#74c0f0] bg-[#4ea8de]/14"
            />
            <Kpi
              icon={FiUserCheck}
              label="Doctors on Team"
              value={stats.doctors}
              sub="Specialists"
              to="/admin/doctors"
              tone="text-[#c9a6f5] bg-[#a97bf0]/14"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[136px] rounded-2xl" />)
        )}
      </div>

      <div className="grid gap-4 mt-4 lg:grid-cols-2">
        <Panel>
          <SectionHead title="Today’s schedule" to="/admin/schedule" linkLabel="Manage" />
          {!feed ? <div className="p-5 grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : feed.todays_schedule.length === 0 ? (
              <EmptyState icon={FiClock} title="Nothing scheduled today." hint="Copy today’s appointments into the schedule to plan the day." />
            ) : (
              <ul className="divide-y divide-[var(--a-border)]">
                {feed.todays_schedule.map((row) => (
                  <li key={row.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="w-[76px] shrink-0 text-[13px] text-[var(--a-muted)]">{formatSlot(row.time_from)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{row.patient_name}</span>
                      {row.doctor && <span className="block text-[12.5px] text-[var(--a-muted)]">{row.doctor}</span>}
                    </span>
                    <StatusPill status={row.status} />
                  </li>
                ))}
              </ul>
            )}
        </Panel>

        <Panel>
          <SectionHead title="Latest bookings" to="/admin/appointments" linkLabel="All appointments" />
          {!feed ? <div className="p-5 grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : feed.recent_bookings.length === 0 ? (
              <EmptyState icon={FiCalendar} title="No bookings yet." hint="Appointments booked on the website land here." />
            ) : (
              <ul className="divide-y divide-[var(--a-border)]">
                {feed.recent_bookings.map((a) => (
                  <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{a.name}</span>
                      <span className="block text-[12.5px] text-[var(--a-muted)]">{a.date} · {formatSlot(a.slot)}</span>
                    </span>
                    <StatusPill status={a.status} />
                  </li>
                ))}
              </ul>
            )}
        </Panel>

        <Panel>
          <SectionHead title="Recent registrations" to="/admin/patients" linkLabel="All registrations" />
          {!feed ? <div className="p-5 grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : feed.recent_patients.length === 0 ? (
              <EmptyState icon={FiUsers} title="No registrations yet." hint="New patient forms from the website appear here." />
            ) : (
              <ul className="divide-y divide-[var(--a-border)]">
                {feed.recent_patients.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{p.name}</span>
                      <span className="block text-[12.5px] text-[var(--a-muted)]">{p.patient_id} · {formatDateTime(p.created_at)}</span>
                    </span>
                    <span className="text-[12.5px] text-[var(--a-muted)] whitespace-nowrap">{p.age} yrs</span>
                  </li>
                ))}
              </ul>
            )}
        </Panel>

        <Panel>
          <SectionHead title="Website content" to="/admin/gallery/clinic" linkLabel="Manage galleries" />
          {!stats ? <div className="p-5 grid gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div> : (
            <ul className="divide-y divide-[var(--a-border)]">
              {[
                [FiImage, 'Clinic gallery', stats.gallery.clinic, '/admin/gallery/clinic'],
                [FiImage, 'Infrastructure gallery', stats.gallery.infrastructure, '/admin/gallery/infrastructure'],
                [FiImage, 'Dental camp gallery', stats.gallery.camps, '/admin/gallery/camps'],
                [FiFileText, 'Patient feedback videos', stats.feedback ?? 0, '/admin/feedback'],
                [FiFileText, 'Research papers', stats.research, '/admin/research'],
              ].map(([Icon, label, count, to]) => (
                <li key={label}>
                  <Link to={to} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/4">
                    <Icon className="w-4 h-4 text-[var(--a-muted)]" />
                    <span className="flex-1 text-[14px]">{label}</span>
                    <span className="text-[14px] text-[var(--a-muted)]">{count}</span>
                    <FiArrowRight className="w-4 h-4 text-white/25" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
