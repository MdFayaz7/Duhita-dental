import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiCreditCard, FiDownload, FiPlus, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { api } from './api';
import { PageHead } from './AdminLayout';
import {
  Button, EmptyState, ErrorNote, Field, Panel, SearchInput, Segmented, Skeleton, Table, cx, exportCsv, inputClass,
  todayIso, useConfirm, useToast,
} from './ui';
import { useLiveEvents } from '../lib/useLiveEvents';
import { PaymentModal, inr, longDate } from './billingUi';

const TABS = [{ value: 'invoices', label: 'Invoices' }, { value: 'procedures', label: 'Procedures & fees' }];
const monthStart = () => `${todayIso().slice(0, 8)}01`;

export default function Billing() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'procedures' ? 'procedures' : 'invoices');
  return (
    <>
      <PageHead title="Billing" subtitle="Invoices, payments received and the clinic’s procedure fees" />
      <Segmented options={TABS} value={tab} onChange={setTab} />
      <div className="mt-5">{tab === 'invoices' ? <Invoices /> : <Procedures />}</div>
    </>
  );
}

export function Invoices() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [q, setQ] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [payFor, setPayFor] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api.invoices({ limit: 200, ...(from ? { date_from: from } : {}), ...(to ? { date_to: to } : {}), ...(q ? { q } : {}), ...(dueOnly ? { due_only: true } : {}) }));
      setError('');
    } catch (e) {
      setError(e.message);
      setData({ items: [], total: 0, summary: { billed: 0, received: 0, due: 0 } });
    }
  }, [from, to, q, dueOnly]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  useLiveEvents((e) => e.type === 'billing_updated' && load());

  const download = () => exportCsv(`duhita-invoices-${from || 'all'}-to-${to || 'today'}.csv`, data.items.map((i) => ({
    Invoice: i.number, Date: i.date, Patient: i.patient_name, 'Patient ID': i.patient_id, Phone: i.patient_phone || '',
    Treatments: i.items.map((x) => x.name).join('; '), Total: i.total, Paid: i.paid, Due: i.due,
  })));

  const s = data?.summary;
  return (
    <>
      <ErrorNote>{error}</ErrorNote>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Billed" value={s?.billed} />
        <Stat label="Received" value={s?.received} tone="text-[#137a1e]" />
        <Stat label="Outstanding" value={s?.due} tone="text-[#d93a46]" />
      </div>

      <Panel className="mt-4 p-4 flex flex-wrap items-end gap-4">
        <Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} /></Field>
        <Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} /></Field>
        <Field label="Search" className="flex-1 min-w-[220px]"><SearchInput value={q} onChange={setQ} placeholder="Patient, mobile, patient ID or bill number" /></Field>
        <label className="flex items-center gap-2 h-[38px] text-[14px] text-[#555]"><input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} /> Only with dues</label>
        <Button variant="secondary" onClick={() => { setFrom(''); setTo(''); }}>All dates</Button>
        <Button variant="secondary" onClick={download} disabled={!data?.items.length}><FiDownload /> Export CSV</Button>
      </Panel>

      <Panel className="mt-4 overflow-hidden">
        {!data ? (
          <div className="p-5 grid gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={FiCreditCard} title="No invoices in this period." hint="Create one from a patient’s record: Patients → open a patient → New invoice." />
        ) : (
          <Table head={['Invoice', 'Date', 'Patient', 'Treatments', 'Amount', 'Paid', 'Due', '']} minWidth={1000}>
            {data.items.map((i) => (
              <tr key={i.id} className="hover:bg-[#fafafa]">
                <td className="px-5 py-3">#{i.number}</td>
                <td className="px-5 py-3 whitespace-nowrap">{longDate(i.date)}</td>
                <td className="px-5 py-3">
                  <Link to={`/admin/patients/${i.patient_id}`} className="uppercase text-[#1a9ad6] hover:underline">{i.patient_name || i.patient_id}</Link>
                  <p className="text-[12px] text-[#888]">{i.patient_id}</p>
                </td>
                <td className="px-5 py-3 max-w-[240px] truncate text-[13px] uppercase text-[#555]">{i.items.map((x) => x.name).join(', ')}</td>
                <td className="px-5 py-3 tabular-nums">₹{inr(i.total)}</td>
                <td className="px-5 py-3 tabular-nums text-[#137a1e]">₹{inr(i.paid)}</td>
                <td className={cx('px-5 py-3 tabular-nums', Number(i.due) > 0 && 'text-[#d93a46]')}>₹{inr(i.due)}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1.5">
                    {Number(i.due) > 0 && <Button size="sm" onClick={() => setPayFor(i)} className="!bg-[var(--a-done)] !border-[var(--a-done)]">Accept payment</Button>}
                    <Button size="sm" variant="secondary" onClick={() => window.open(`/admin/print/invoice/${i.id}`, '_blank', 'noopener')} title="Print"><FiPrinter /></Button>
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/invoices/${i.id}/edit`)}>Edit</Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {data && data.total > data.items.length && (
          <p className="px-5 py-3 text-[13px] text-[#777] border-t border-[var(--a-border)]">Showing the latest {data.items.length} of {data.total} invoices — narrow the dates to see older ones.</p>
        )}
      </Panel>

      <PaymentModal invoice={payFor} onClose={() => setPayFor(null)} onSaved={() => { setPayFor(null); load(); }} />
    </>
  );
}

function Stat({ label, value, tone = 'text-[#333]' }) {
  return (
    <Panel className="p-4">
      <p className="text-[12px] uppercase text-[#888]">{label}</p>
      <p className={cx('mt-1 text-[22px] tabular-nums', tone)}>{value == null ? '—' : `₹${inr(value)}`}</p>
    </Panel>
  );
}

function Procedures() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState({ name: '', cost: '' });
  const [error, setError] = useState('');

  const load = () => api.procedures(true).then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (proc, changes) => {
    const next = { name: proc.name, cost: proc.cost, active: proc.active, category: proc.category ?? null, ...changes };
    setItems((list) => list.map((p) => (p.id === proc.id ? { ...p, ...next } : p)));
    try {
      await api.updateProcedure(proc.id, { ...next, cost: Number(next.cost || 0).toFixed(2) });
    } catch (e) {
      toast(e.message, 'error');
      load();
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (draft.name.trim().length < 2) return;
    try {
      await api.addProcedure({ name: draft.name.trim(), cost: Number(draft.cost || 0).toFixed(2) });
      toast(`${draft.name.trim()} added`);
      setDraft({ name: '', cost: '' });
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (proc) => {
    const ok = await confirm({ title: 'Remove procedure', message: `Remove ${proc.name} from the list? Invoices that already use it keep it.`, confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    await api.deleteProcedure(proc.id).catch((e) => toast(e.message, 'error'));
    load();
  };

  const shown = (items || []).filter((p) => `${p.name} ${p.category || ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <ErrorNote>{error}</ErrorNote>
      <Panel className="p-4 flex flex-wrap items-end gap-4">
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <Field label="New procedure"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Root canal treatment" className={cx(inputClass, 'w-[260px]')} /></Field>
          <Field label="Fee (INR)"><input type="number" min="0" step="0.01" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} className={cx(inputClass, 'w-[130px]')} /></Field>
          <Button type="submit"><FiPlus /> Add</Button>
        </form>
        <Field label="Search" className="ml-auto min-w-[220px]"><SearchInput value={q} onChange={setQ} placeholder="Find a procedure" /></Field>
      </Panel>

      <Panel className="mt-4 overflow-hidden">
        {!items ? <div className="p-5"><Skeleton className="h-40" /></div> : (
          <Table head={['Procedure', 'Group', 'Standard fee (INR)', 'In use', '']} minWidth={760}>
            {shown.map((p) => (
              <tr key={p.id} className={cx('hover:bg-[#fafafa]', !p.active && 'opacity-55')}>
                <td className="px-5 py-2">
                  <input defaultValue={p.name} onBlur={(e) => e.target.value.trim() !== p.name && e.target.value.trim().length >= 2 && save(p, { name: e.target.value.trim() })}
                    className="w-full max-w-[340px] h-[32px] rounded-[2px] border border-transparent hover:border-[#c8c8c8] focus:border-[var(--a-link)] px-2 uppercase text-[13.5px] outline-none" />
                </td>
                <td className="px-5 py-2">
                  <input defaultValue={p.category || ''} onBlur={(e) => e.target.value.trim() !== (p.category || '') && save(p, { category: e.target.value.trim() || null })}
                    placeholder="—" className="w-[170px] h-[32px] rounded-[2px] border border-transparent hover:border-[#c8c8c8] focus:border-[var(--a-link)] px-2 text-[13px] outline-none" />
                </td>
                <td className="px-5 py-2">
                  <input type="number" min="0" step="0.01" defaultValue={Number(p.cost)} onBlur={(e) => Number(e.target.value) !== Number(p.cost) && save(p, { cost: e.target.value })}
                    className="w-[130px] h-[32px] rounded-[2px] border border-transparent hover:border-[#c8c8c8] focus:border-[var(--a-link)] px-2 text-right tabular-nums text-[13.5px] outline-none" />
                </td>
                <td className="px-5 py-2">
                  <label className="flex items-center gap-2 text-[13px] text-[#555]">
                    <input type="checkbox" checked={p.active} onChange={(e) => save(p, { active: e.target.checked })} /> {p.active ? 'Shown' : 'Hidden'}
                  </label>
                </td>
                <td className="px-5 py-2 text-right">
                  <Button size="sm" variant="danger" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}><FiTrash2 /></Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
