import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUser } from 'react-icons/fi';
import { Button, EmptyState, Skeleton, cx } from '../ui';
import { longDate } from '../billingUi';
import { site } from '../../data/site';

/** Doctors (id → {name, color}) and the open patient, shared by every section. */
export const PatientCtx = createContext({ doctors: {}, patient: null, reload: () => {} });
export const usePatientCtx = () => useContext(PatientCtx);

export const ageSex = (p) => [p?.sex ?? p?.patient_sex, (p?.age ?? p?.patient_age) != null ? `${p.age ?? p.patient_age} Years` : null].filter(Boolean).join(', ');

/** Paged list with Practo's "Get more" button. `fetcher(params)` → {items, more}. */
export function usePaged(fetcher, deps) {
  const [items, setItems] = useState(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (skip = 0) => {
    try {
      const res = await fetcher({ limit: 30, skip });
      setItems((prev) => (skip ? [...(prev || []), ...res.items] : res.items));
      setMore(res.more);
      setError('');
    } catch (e) {
      setError(e.message);
      setItems((prev) => prev || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { setItems(null); load(0); }, [load]);
  return { items, more, error, reload: () => load(0), loadMore: () => load(items?.length || 0), setItems };
}

/** Groups rows by date, then by patient within the day (Practo's all-patients lists). */
export function groupRows(items, key = (r) => r.patient_id) {
  const days = [];
  for (const r of items) {
    let day = days.at(-1);
    if (day?.date !== r.date) days.push((day = { date: r.date, groups: [] }));
    let g = day.groups.find((x) => x.key === key(r));
    if (!g) day.groups.push((g = { key: key(r), first: r, rows: [] }));
    g.rows.push(r);
  }
  return days;
}

export function PatientStrip({ row, showPatient }) {
  if (!showPatient) return null;
  return (
    <div className="flex items-center gap-6 border-b border-[#e3e3e3] bg-white pr-3 text-[13px]">
      <span className="w-[30px] h-[30px] grid place-items-center bg-[#d5d5d5] text-white"><FiUser /></span>
      <Link to={`/admin/patients/${row.patient_id}`} className="text-[#1a9ad6] uppercase hover:underline">{row.patient_name || row.patient_id}</Link>
      <span className="text-[#1a9ad6]">{ageSex(row)}</span>
      <span className="text-[#1a9ad6]">(ID : {row.patient_id})</span>
    </div>
  );
}

/** Date header + one bordered card per patient, as on Practo. */
export function DayGroups({ items, showPatient, render, empty }) {
  if (!items) return <div className="grid gap-3 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (!items.length) return <EmptyState title={empty} />;
  return groupRows(items).map((day) => (
    <section key={day.date} className="px-2 pb-2">
      <p className="pt-3 pb-1 text-[11.5px] font-medium text-[#444]">{longDate(day.date)}</p>
      <div className="grid gap-3">
        {day.groups.map((g) => (
          <article key={g.key} className="border border-[#dcdcdc] bg-white">
            <PatientStrip row={g.first} showPatient={showPatient} />
            {render(g.rows)}
          </article>
        ))}
      </div>
    </section>
  ));
}

export function MoreButton({ more, onClick }) {
  return more ? <div className="py-4 text-center"><Button size="sm" onClick={onClick} className="!bg-[#2aa7c9] !border-[#2aa7c9]">Get more</Button></div> : null;
}

/** Section title bar: "VITAL SIGNS" on the left, actions on the right. */
export function SectionBar({ title, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#d8d8d8] bg-white px-3 py-2.5 min-h-[50px]">
      <h2 className="mr-auto text-[13px] font-medium uppercase tracking-wide text-[#333]">{title}</h2>
      {children}
    </div>
  );
}

export const Signed = ({ label = 'by', doctor, right }) => (
  <div className="flex items-center justify-between gap-3 border-t border-[#e3e3e3] px-3 py-2 text-[12.5px] text-[#444]">
    <span>{doctor ? <>{label} <b>{doctor}</b></> : null}</span>{right}
  </div>
);

export const smallInput = 'h-[32px] rounded-[2px] border border-[#c8c8c8] bg-white px-2 text-[13px] outline-none focus:border-[var(--a-link)]';

export const AddButton = (props) => <Button size="sm" className={cx('!bg-[#1a73e8] !border-[#1a73e8]', props.className)} {...props} />;

/** Opens a print window with the clinic letterhead around `body` (HTML string). */
export function printHtml(title, body, { label = false } = {}) {
  const w = window.open('', '_blank', 'noopener=no,width=820,height=900');
  if (!w) return;
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:Helvetica,Arial,sans-serif;color:#222;font-size:13px;margin:${label ? '4mm' : '14mm'}}
    h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{text-align:left;padding:6px;border-bottom:1px solid #ddd;font-size:12.5px}th{border-bottom:1px solid #888}
    .head{border-bottom:2px solid #222;padding-bottom:8px;margin-bottom:12px}.muted{color:#666}
    @page{size:${label ? '90mm 40mm' : 'A4'};margin:${label ? '2mm' : '12mm'}}</style></head><body>
    ${label ? '' : `<div class="head"><h1>${esc(site.fullName.toUpperCase())}</h1><div class="muted">${site.addressLines.map(esc).join(', ')} · ${esc(site.phoneDisplay)}</div></div>`}
    ${body}<script>setTimeout(()=>print(),300)</script></body></html>`);
  w.document.close();
}

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
