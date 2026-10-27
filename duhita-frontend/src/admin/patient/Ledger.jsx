import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPrinter } from 'react-icons/fi';
import { api } from '../api';
import { EmptyState, Table, cx } from '../ui';
import { inr, longDate, modeLabel } from '../billingUi';
import { SectionBar, usePatientCtx } from './shared';

function useBilling() {
  const { patient } = usePatientCtx();
  const [b, setB] = useState(null);
  useEffect(() => { api.patientBilling(patient.patient.patient_id).then(setB).catch(() => setB({ invoices: [], payments: [] })); }, [patient]);
  return b;
}

/** Debits (invoices) and credits (payments) in date order with a running balance. */
export default function Ledger() {
  const b = useBilling();
  if (!b) return null;
  const entries = [
    ...b.invoices.filter((i) => i.status === 'active').map((i) => ({ date: i.date, key: `i${i.id}`, text: <>Invoice <Link to={`/admin/invoices/${i.id}/edit`} className="text-[#1a9ad6]">#{i.number}</Link> · <span className="uppercase">{i.items.map((x) => x.name).join(', ')}</span></>, debit: Number(i.total), credit: 0 })),
    ...b.payments.map((p) => ({ date: p.date, key: `p${p.id}`, text: `Payment · ${modeLabel(p.mode)}${p.reference ? ` · ${p.reference}` : ''}`, debit: 0, credit: Number(p.amount) })),
  ].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.credit - y.credit));
  let bal = 0;
  return (
    <>
      <SectionBar title="Ledger" share="billing" />
      <div className="bg-white">
        {!entries.length ? <EmptyState title="No bills or payments yet." /> : (
          <Table head={['Date', 'Particulars', 'Debit (INR)', 'Credit (INR)', 'Balance (INR)']} minWidth={760}>
            {entries.map((e) => {
              bal += e.debit - e.credit;
              return (
                <tr key={e.key}>
                  <td className="px-5 py-2.5 whitespace-nowrap">{longDate(e.date)}</td>
                  <td className="px-5 py-2.5">{e.text}</td>
                  <td className="px-5 py-2.5 tabular-nums">{e.debit ? inr(e.debit) : ''}</td>
                  <td className="px-5 py-2.5 tabular-nums text-[#137a1e]">{e.credit ? inr(e.credit) : ''}</td>
                  <td className={cx('px-5 py-2.5 tabular-nums font-medium', bal > 0 && 'text-[#d93a46]')}>{inr(bal)}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}

/** Cancelled and fully settled bills, kept for reference and reprinting. */
export function PastBills() {
  const b = useBilling();
  if (!b) return null;
  const past = b.invoices.filter((i) => i.status === 'cancelled' || Number(i.due) <= 0);
  return (
    <>
      <SectionBar title="Past Bills" />
      <div className="bg-white">
        {!past.length ? <EmptyState title="No settled or cancelled bills." /> : (
          <Table head={['Bill', 'Date', 'Treatments', 'Amount', 'Status', '']} minWidth={760}>
            {past.map((i) => (
              <tr key={i.id} className={cx(i.status === 'cancelled' && 'opacity-60')}>
                <td className="px-5 py-2.5">#{i.number}</td>
                <td className="px-5 py-2.5 whitespace-nowrap">{longDate(i.date)}</td>
                <td className="px-5 py-2.5 uppercase text-[13px] text-[#555]">{i.items.map((x) => x.name).join(', ')}</td>
                <td className="px-5 py-2.5 tabular-nums">₹{inr(i.total)}</td>
                <td className="px-5 py-2.5">{i.status === 'cancelled' ? 'Cancelled' : 'Paid'}</td>
                <td className="px-5 py-2.5 text-right"><button onClick={() => window.open(`/admin/print/invoice/${i.id}`, '_blank', 'noopener')} aria-label="Print"><FiPrinter /></button></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
