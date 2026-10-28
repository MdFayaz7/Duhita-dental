import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiUser } from 'react-icons/fi';
import { api } from '../api';
import { Button, EmptyState, ErrorNote, Field, Modal, Segmented, Skeleton, Table, cx, useToast } from '../ui';
import { inr, longDate } from '../billingUi';

const TABS = [{ value: 'treatments', label: 'Treatments' }, { value: 'invoices', label: 'Invoices' }, { value: 'payments', label: 'Payments' }, { value: 'profile', label: 'Profile' }];
const td = 'px-4 py-2.5';

/** One patient's history as exported from Practo — read only, looked up by Practo's patient number. */
export default function PractoRecord() {
  const { number } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('treatments');
  useEffect(() => { api.practoPatient(number).then(setD).catch((e) => setError(e.message)); }, [number]);

  if (error) return <div className="p-4"><ErrorNote>{error}</ErrorNote></div>;
  if (!d) return <Skeleton className="m-4 h-60" />;
  const p = d.patient;
  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#e9e9e9]">
      <div className="flex flex-wrap items-center gap-4 border-b border-[#d8d8d8] bg-white px-3 py-2 text-[13px]">
        <Link to="/admin/patients?list=practo" className="flex items-center gap-1.5 text-[#1a5fa0]"><FiArrowLeft /> Practo Patients</Link>
        <span className="w-[30px] h-[30px] grid place-items-center bg-[#d5d5d5] text-white"><FiUser /></span>
        <span className="uppercase text-[#1a5fa0]">{p.name}</span>
        <span className="text-[#1a5fa0]">{[p.gender, p.age != null && `${p.age} Years`].filter(Boolean).join(', ')}</span>
        <span className="text-[#1a5fa0]">{p.number.startsWith('NA-') ? '(no Practo number)' : `(Practo # ${p.number})`}</span>
        {p.mobile && <span className="text-[#777]">+91 {p.mobile}</span>}
        <span className="ml-auto flex gap-5">
          <Money label="Billed" v={d.summary.billed} /><Money label="Paid" v={d.summary.paid} tone="text-[#137a1e]" />
          <Money label="Due" v={d.summary.due} tone={Number(d.summary.due) > 0 ? 'text-[#d93a46]' : ''} />
        </span>
      </div>
      <div className="p-3">
        <div className="mb-3 flex items-center gap-3"><Segmented options={TABS} value={tab} onChange={setTab} /><span className="text-[12px] text-[#777]">Imported from Practo · read only</span></div>
        <div className="bg-white">
          {tab === 'treatments' && (d.treatments.length ? (
            <Table head={['Date', 'Treatment', 'Teeth', 'Qty', 'Cost', 'Discount', 'Amount', 'Doctor', 'Notes']} minWidth={980}>
              {d.treatments.map((t) => (
                <tr key={t.id}>
                  <td className={cx(td, 'whitespace-nowrap')}>{t.date ? longDate(t.date) : '—'}</td><td className={cx(td, 'uppercase')}>{t.name}</td>
                  <td className={td}>{t.teeth || ''}</td><td className={td}>{Number(t.qty ?? 1)}</td><td className={cx(td, 'tabular-nums')}>{inr(t.cost ?? 0)}</td>
                  <td className={td}>{Number(t.discount) ? `${Number(t.discount)}${t.discount_type === 'NUMBER' ? ' ₹' : '%'}` : ''}</td>
                  <td className={cx(td, 'tabular-nums')}>{inr(t.amount ?? 0)}</td><td className={td}>{t.doctor || ''}</td><td className={cx(td, 'text-[#666]')}>{t.notes || ''}</td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No treatments in the Practo export." />)}
          {tab === 'invoices' && (d.invoices.length ? (
            <Table head={['Date', 'Invoice', 'Treatment', 'Unit cost', 'Qty', 'Discount', 'Total', 'Doctor']} minWidth={900}>
              {d.invoices.map((i) => (
                <tr key={i.id} className={cx(i.cancelled && 'opacity-50 line-through')}>
                  <td className={cx(td, 'whitespace-nowrap')}>{i.date ? longDate(i.date) : '—'}</td><td className={td}>{i.invoice_number ? `#${i.invoice_number}` : '—'}</td>
                  <td className={cx(td, 'uppercase')}>{i.treatment}</td><td className={cx(td, 'tabular-nums')}>{inr(i.unit_cost ?? 0)}</td><td className={td}>{Number(i.qty ?? 1)}</td>
                  <td className={td}>{Number(i.discount) ? `${Number(i.discount)}${i.discount_type === 'NUMBER' ? ' ₹' : '%'}` : ''}</td>
                  <td className={cx(td, 'tabular-nums')}>{inr(i.total)}</td><td className={td}>{i.doctor || ''}</td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No invoices in the Practo export." />)}
          {tab === 'payments' && (d.payments.length ? (
            <Table head={['Date', 'Amount', 'Mode', 'Invoice', 'For', 'Notes']} minWidth={760}>
              {d.payments.map((x) => (
                <tr key={x.id} className={cx(x.cancelled && 'opacity-50 line-through')}>
                  <td className={cx(td, 'whitespace-nowrap')}>{x.date ? longDate(x.date) : '—'}</td><td className={cx(td, 'tabular-nums text-[#137a1e]')}>₹{inr(x.amount ?? 0)}</td>
                  <td className={cx(td, 'capitalize')}>{x.mode || ''}</td><td className={td}>{x.invoice_number ? `#${x.invoice_number}` : '—'}</td>
                  <td className={cx(td, 'uppercase')}>{x.treatment || ''}</td><td className={cx(td, 'text-[#666]')}>{x.notes || ''}</td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No payments in the Practo export." />)}
          {tab === 'profile' && (
            <dl className="grid gap-x-6 gap-y-2 p-4 text-[13.5px] sm:grid-cols-[180px_1fr]">
              {[['Practo number', p.number], ['Name', p.name], ['Mobile', p.mobile], ['Gender', p.gender], ['Age', p.age], ['Date of birth', p.dob && longDate(p.dob)],
                ['Email', p.email], ['Address', p.address], ...Object.entries(p.details || {})].filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-[#777]">{k}</dt><dd>{String(v)}</dd></div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

const Money = ({ label, v, tone = '' }) => (
  <span className="text-right"><span className="block text-[10.5px] uppercase text-[#888]">{label}</span><span className={cx('tabular-nums text-[15px]', tone)}>₹{inr(v)}</span></span>
);

const KINDS = [['patients', 'Patients'], ['treatments', 'Treatments'], ['invoices', 'Invoices'], ['payments', 'Payments']];

/** Upload any of the four Practo exports; each one replaces its part of the archive. */
export function PractoImport({ open, onClose, onDone }) {
  const toast = useToast();
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const upload = async () => {
    const form = new FormData();
    Object.entries(files).forEach(([k, f]) => f && form.append(k, f));
    setBusy(true);
    try {
      const r = await api.practoImport(form);
      toast(`Imported ${Object.entries(r.imported).map(([k, n]) => `${n} ${k}`).join(', ')}`);
      setFiles({});
      onDone();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} title="Import Practo data" subtitle="Upload Practo’s exports as they are (CSV or Excel). Each file replaces its earlier import." onClose={onClose}>
      <div className="grid gap-4">
        {KINDS.map(([k, label]) => (
          <Field key={k} label={label}><input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFiles({ ...files, [k]: e.target.files[0] })} /></Field>
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={upload} disabled={busy || !Object.values(files).some(Boolean)}>{busy ? 'Importing…' : 'Import'}</Button>
        </div>
      </div>
    </Modal>
  );
}
