import { useEffect, useState } from 'react';
import { FiClock, FiPlus, FiX } from 'react-icons/fi';
import { api } from './api';
import { Button, Panel, cx, useToast } from './ui';

const cell = 'h-[32px] rounded-[2px] border border-[#c8c8c8] bg-white px-2 text-[13px] outline-none focus:border-[var(--a-link)]';

/** Weekly clinic timings (Monday first). A day with no sessions is closed / by appointment only. */
export default function ClinicHours() {
  const toast = useToast();
  const [week, setWeek] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.clinicHours().then((h) => setWeek(h.week.map((d) => ({ day: d.day, sessions: d.sessions.map(({ from, to }) => ({ from, to })) }))))
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);

  const setDay = (i, sessions) => setWeek((w) => w.map((d, j) => (j === i ? { ...d, sessions } : d)));
  const copyToWeekdays = () => setWeek((w) => w.map((d, j) => (j < 5 ? { ...d, sessions: w[0].sessions.map((s) => ({ ...s })) } : d)));

  const save = async () => {
    setBusy(true);
    try {
      await api.saveClinicHours(week.map((d) => d.sessions));
      toast('Clinic hours saved — the calendar, website booking and app use them now.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="p-6 lg:col-span-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-10 h-10 grid place-items-center rounded bg-[var(--a-accent-soft)] text-[var(--a-accent)]"><FiClock /></span>
        <div className="mr-auto">
          <h2 className="text-[17px] font-semibold">Clinic hours</h2>
          <p className="text-[13.5px] text-[var(--a-muted)]">Set timings for weekdays and weekends. A closed day takes appointments only by phone.</p>
        </div>
        <Button variant="secondary" onClick={copyToWeekdays} disabled={!week}>Copy Monday to all weekdays</Button>
        <Button onClick={save} disabled={!week || busy}>{busy ? 'Saving…' : 'Save hours'}</Button>
      </div>
      <div className="mt-5 divide-y divide-[var(--a-border)]">
        {(week || []).map((d, i) => (
          <div key={d.day} className={cx('flex flex-wrap items-center gap-3 py-2.5', i >= 5 && 'bg-[#fafafa] -mx-2 px-2')}>
            <span className="w-[110px] text-[14px]">{d.day}{i >= 5 && <span className="block text-[11px] text-[#999]">Weekend</span>}</span>
            <label className="flex items-center gap-2 w-[90px] text-[13px] text-[#555]">
              <input type="checkbox" checked={!d.sessions.length}
                onChange={(e) => setDay(i, e.target.checked ? [] : [{ from: '10:00', to: '13:00' }])} /> Closed
            </label>
            {d.sessions.map((s, k) => (
              <span key={k} className="flex items-center gap-1">
                <input type="time" value={s.from} className={cell} onChange={(e) => setDay(i, d.sessions.map((x, j) => (j === k ? { ...x, from: e.target.value } : x)))} />
                <span className="text-[#888]">–</span>
                <input type="time" value={s.to} className={cell} onChange={(e) => setDay(i, d.sessions.map((x, j) => (j === k ? { ...x, to: e.target.value } : x)))} />
                <button onClick={() => setDay(i, d.sessions.filter((_, j) => j !== k))} aria-label="Remove session" className="p-1 text-[#999] hover:text-[#d93a46]"><FiX /></button>
              </span>
            ))}
            {d.sessions.length > 0 && d.sessions.length < 4 && (
              <button onClick={() => setDay(i, [...d.sessions, { from: '16:30', to: '20:00' }])} className="flex items-center gap-1 text-[13px] text-[var(--a-link)] hover:underline"><FiPlus /> Session</button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
