import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { EmptyState, ErrorNote, STATUS_LABELS, Skeleton, StatusPill, Table, cx, formatSlot, todayIso } from '../ui';
import { inr, longDate, modeLabel } from '../billingUi';
import { Invoices } from '../Billing';
import { MoreButton, SectionBar, smallInput, usePaged, usePatientCtx } from './shared';

const PatientLink = ({ id, name }) => (id
  ? <Link to={`/admin/patients/${id}`} className="uppercase text-[#1a9ad6] hover:underline">{name || id}</Link>
  : <span className="uppercase">{name}</span>);

/** Every patient's appointments on one day. */
export default function AllAppointments() {
  const { doctors } = usePatientCtx();
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState('all');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setItems(null);
    api.appointments({ date, status }).then((r) => { setItems(r.items); setError(''); })
      .catch((e) => { setError(e.message); setItems([]); });
  }, [date, status]);
  useEffect(load, [load]);

  return (
    <>
      <SectionBar title="Appointments">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={smallInput} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={smallInput}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <Link to="/admin/appointments" className="text-[13px] text-[#1a9ad6] hover:underline">Open calendar →</Link>
      </SectionBar>
      <div className="bg-white">
        <ErrorNote>{error}</ErrorNote>
        {!items ? <Skeleton className="m-3 h-40" /> : !items.length ? <EmptyState title={`No appointments on ${longDate(date)}.`} /> : (
          <Table head={['Time', 'Patient', 'Mobile', 'Doctor', 'For', 'Status']} minWidth={820}>
            {items.map((a) => (
              <tr key={a.id} className="hover:bg-[#fafafa]">
                <td className="px-5 py-2.5 whitespace-nowrap">{formatSlot(a.slot)}</td>
                <td className="px-5 py-2.5"><PatientLink id={a.patient_id} name={a.name} /><span className="block text-[12px] text-[#888]">{a.patient_id}</span></td>
                <td className="px-5 py-2.5">{a.phone}</td>
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

/** Every patient's invoices (the Billing page's list, inside the Patients section). */
export function AllInvoices() {
  return (
    <>
      <SectionBar title="Invoices"><Link to="/admin/billing" className="text-[13px] text-[#1a9ad6] hover:underline">Fee list →</Link></SectionBar>
      <div className="p-3"><Invoices /></div>
    </>
  );
}

/** Every patient's payments, newest first. */
export function AllPayments() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const list = usePaged((p) => api.payments({ ...p, ...(from ? { date_from: from } : {}), ...(to ? { date_to: to } : {}) }), [from, to]);
  const total = (list.items || []).reduce((s, p) => s + Number(p.amount), 0);
  return (
    <>
      <SectionBar title="Payments">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={smallInput} aria-label="From" />
        <span className="text-[#888]">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={smallInput} aria-label="To" />
        {list.items?.length > 0 && <span className="text-[13px]">Shown: <b className="text-[#137a1e]">₹{inr(total)}</b></span>}
      </SectionBar>
      <div className="bg-white">
        <ErrorNote>{list.error}</ErrorNote>
        {!list.items ? <Skeleton className="m-3 h-40" /> : !list.items.length ? <EmptyState title="No payments." /> : (
          <Table head={['Date', 'Patient', 'Amount', 'Mode', 'Reference', 'Invoice']} minWidth={760}>
            {list.items.map((p) => (
              <tr key={p.id} className="hover:bg-[#fafafa]">
                <td className="px-5 py-2.5 whitespace-nowrap">{longDate(p.date)}</td>
                <td className="px-5 py-2.5"><PatientLink id={p.patient_id} name={p.patient_name} /><span className="block text-[12px] text-[#888]">{p.patient_id}</span></td>
                <td className={cx('px-5 py-2.5 tabular-nums text-[#137a1e]')}>₹{inr(p.amount)}</td>
                <td className="px-5 py-2.5">{modeLabel(p.mode)}</td>
                <td className="px-5 py-2.5 text-[#777]">{p.reference || '—'}</td>
                <td className="px-5 py-2.5">{p.invoice_number ? `#${p.invoice_number}` : '—'}</td>
              </tr>
            ))}
          </Table>
        )}
        <MoreButton more={list.more} onClick={list.loadMore} />
      </div>
    </>
  );
}
