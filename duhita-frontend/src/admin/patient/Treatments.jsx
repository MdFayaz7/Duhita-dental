import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiCircle, FiDollarSign, FiPrinter, FiTrash2, FiX } from 'react-icons/fi';
import { api } from '../api';
import { Button, cx, todayIso, useConfirm, useToast } from '../ui';
import { inr, lineAmounts, longDate } from '../billingUi';
import { TeethChart } from '../InvoiceEditor';
import { DoctorSelect } from './Clinical';
import { AddButton, DayGroups, MoreButton, SectionBar, escapeHtml, printHtml, smallInput, usePaged, usePatientCtx } from './shared';

const discountText = (r) => {
  const gross = Number(r.unit_cost) * r.qty;
  const off = r.discount_type === 'pct' ? (gross * Number(r.discount_value)) / 100 : Number(r.discount_value);
  return `${inr(off)} (${gross ? Math.round((off / gross) * 100) : 0}%)`;
};

/** Treatment plans (status "planned") or completed procedures (status "completed"). */
export default function Treatments({ status }) {
  const planned = status === 'planned';
  const { patient, doctors } = usePatientCtx();
  const pid = patient?.patient.patient_id;
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState(new Set());
  const list = usePaged((p) => (planned
    ? api.emr('treatments', { ...p, status, ...(pid ? { patient_id: pid } : {}) })
    : api.completedProcedures({ ...p, ...(pid ? { patient_id: pid } : {}) })), [status, pid]);
  useEffect(() => setPicked(new Set()), [status, pid]);

  const title = planned ? 'Treatment Plans' : 'Completed Procedures';
  const rowId = (r) => (planned ? r.id : r.row_id);
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const complete = async (ids) => {
    await api.completeTreatments(ids.map(Number)).then(() => { toast('Marked as completed'); setPicked(new Set()); list.reload(); }).catch((e) => toast(e.message, 'error'));
  };
  const bill = async () => {
    try {
      const inv = await api.billTreatments([...picked].map(Number));
      toast(`Invoice ${inv.number} created`);
      navigate(`/admin/invoices/${inv.id}/edit`);
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  const remove = async (r) => {
    if (!(await confirm({ title: 'Delete', message: `Delete ${r.name}?`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    await api.deleteEmr('treatments', rowId(r)).then(list.reload).catch((e) => toast(e.message, 'error'));
  };
  const print = (rows) => {
    const r0 = rows[0];
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    printHtml(title, `<p><b>${escapeHtml((r0.patient_name || patient?.patient.name || '').toUpperCase())}</b> · ID ${escapeHtml(r0.patient_id || pid)} · ${longDate(r0.date)}</p>
      <h3>${planned ? 'Treatment Plan' : 'Completed Procedures'}</h3><table><tr><th>Procedure</th><th>Teeth</th><th style="text-align:right">Cost</th><th style="text-align:right">Discount</th><th style="text-align:right">Total</th></tr>
      ${rows.map((r) => `<tr><td>${escapeHtml(r.name.toUpperCase())}</td><td>${(r.teeth || []).join(', ')}</td><td style="text-align:right">${inr(Number(r.unit_cost) * r.qty)}</td><td style="text-align:right">${discountText(r)}</td><td style="text-align:right">${inr(r.total)}</td></tr>`).join('')}
      </table><p style="text-align:right"><b>${planned ? 'Estimated amount' : 'Total'}: INR ${inr(total)}</b></p>
      <p class="muted">${escapeHtml(doctors[String(r0.doctor_id)]?.name || '')}</p>`);
  };

  if (adding) return <TreatmentForm status={status} pid={pid} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); list.reload(); }} />;

  return (
    <>
      <SectionBar title={title}>
        {picked.size > 0 && (planned
          ? <Button size="sm" onClick={() => complete([...picked])} className="!bg-[#3cae4c] !border-[#3cae4c]">Mark {picked.size} completed</Button>
          : <Button size="sm" onClick={bill} className="!bg-[#3cae4c] !border-[#3cae4c]">Generate invoice ({picked.size})</Button>)}
        {pid && <AddButton onClick={() => setAdding(true)}>+ Add</AddButton>}
      </SectionBar>
      <DayGroups items={list.items} showPatient={!pid} empty={planned ? 'No treatment plans.' : 'No completed procedures.'}
        render={(rows) => {
          const byDoctor = Object.values(rows.reduce((m, r) => ((m[r.doctor_id || 0] ||= []).push(r), m), {}));
          return (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead><tr className="border-b border-[#e3e3e3] text-[10.5px] font-semibold uppercase text-[#333]">
                  <th className="px-2 py-1.5 text-left">Procedure</th><th className="px-2 text-right">Cost</th><th className="px-2 text-right">Discount</th>
                  <th className="px-2 text-right">Total</th><th className="px-2 text-left">Notes</th><th className="w-[90px]" />
                </tr></thead>
                {byDoctor.map((grp) => (
                  <tbody key={grp[0].id} className="border-l-4 border-[#e9573f]">
                    {grp.map((r) => {
                      const selectable = planned || (r.source === 'treatment' && !r.invoice_id);
                      const billed = !planned && (r.source === 'invoice' || r.invoice_id);
                      return (
                        <tr key={r.id} className="align-top">
                          <td className="px-2 py-2 uppercase">
                            <span className="flex items-center gap-2">
                              {billed ? (
                                <Link to={`/admin/invoices/${r.invoice_id}/edit`} title="On an invoice" className="grid w-[18px] h-[18px] place-items-center border border-[#777] text-[#555]"><FiDollarSign className="w-3 h-3" /></Link>
                              ) : selectable && (pid || planned) ? (
                                <button onClick={() => toggle(rowId(r))} aria-label="Select" className="text-[#555]">{picked.has(rowId(r)) ? <FiCheckCircle className="text-[#1a9ad6]" /> : <FiCircle />}</button>
                              ) : <FiCheckCircle className="text-[#777]" />}
                              {r.name}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{inr(Number(r.unit_cost) * r.qty)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{discountText(r)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{inr(r.total)}</td>
                          <td className="px-2 py-2">
                            {r.teeth?.length > 0 && <span className="flex flex-wrap items-center gap-1">Teeth: {r.teeth.map((t) => <span key={t} className="border border-[#bbb] px-1 text-[11px]">{t}</span>)}</span>}
                            {r.notes && <span className="block text-[#666]">{r.notes}</span>}
                          </td>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap">
                            {planned && <button onClick={() => complete([r.id])} title="Mark completed" className="p-1 text-[#3cae4c]"><FiCheckCircle /></button>}
                            {selectable && <button onClick={() => remove(r)} title="Delete" className="p-1 text-[#999] hover:text-[#d93a46]"><FiTrash2 /></button>}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-[#e3e3e3] text-[12.5px]">
                      <td className="px-2 py-2">{planned ? 'Planned' : 'Completed'} by <b>{doctors[String(grp[0].doctor_id)]?.name || '—'}</b></td>
                      <td colSpan={3} className="px-2 text-right font-semibold">{planned ? 'Estimated amount' : 'Total'}: {inr(grp.reduce((s, r) => s + Number(r.total), 0))}</td>
                      <td />
                      <td className="px-2 text-right"><button onClick={() => print(grp)} title="Print" className="p-1 text-[#555]"><FiPrinter /></button></td>
                    </tr>
                  </tbody>
                ))}
              </table>
            </div>
          );
        }} />
      <MoreButton more={list.more} onClick={list.loadMore} />
    </>
  );
}

let seq = 0;
const blank = (proc = {}) => ({ key: ++seq, procedure_id: proc.id || null, name: (proc.name || '').toUpperCase(), unit_cost: String(Number(proc.cost || 0)), qty: '1', discount_value: '0', discount_type: 'pct', tax_pct: '0', teeth: [], notes: '', child: false, showTeeth: false });

function TreatmentForm({ status, pid, onCancel, onSaved }) {
  const toast = useToast();
  const [procs, setProcs] = useState([]);
  const [q, setQ] = useState('');
  const [lines, setLines] = useState([]);
  const [date, setDate] = useState(todayIso());
  const [doctor, setDoctor] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.procedures().then((r) => setProcs(r.items)).catch(() => {}); }, []);
  const shown = useMemo(() => procs.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())), [procs, q]);
  const upd = (key, ch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...ch } : l)));
  const total = lines.reduce((s, l) => s + lineAmounts(l).total, 0);

  const save = async () => {
    if (!lines.length) return toast('Pick a procedure from the list on the right.', 'error');
    setBusy(true);
    try {
      for (const l of lines) {
        await api.saveEmr('treatments', {
          patient_id: pid, status, date, doctor_id: doctor ? Number(doctor) : null, procedure_id: l.procedure_id, name: l.name.trim() || 'PROCEDURE',
          unit_cost: Number(l.unit_cost || 0).toFixed(2), qty: Math.max(1, parseInt(l.qty, 10) || 1),
          discount_value: Number(l.discount_value || 0).toFixed(2), discount_type: l.discount_type, teeth: l.teeth, notes: l.notes.trim() || null,
        });
      }
      toast('Saved');
      onSaved();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionBar title={status === 'planned' ? 'Treatment Plans' : 'Completed Procedures'}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={smallInput} />
        <DoctorSelect value={doctor} onChange={setDoctor} />
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={save} disabled={busy} className="!bg-[#3cae4c] !border-[#3cae4c]">{status === 'planned' ? 'Save Treatment Plan' : 'Save Procedures'}</Button>
      </SectionBar>
      <div className="flex flex-col lg:flex-row bg-white">
        <div className="flex-1 p-3">
          {!lines.length && <p className="p-4 text-[13px] text-[#777]">Select procedures from the right. You can add multiple items.</p>}
          {lines.map((l) => (
            <div key={l.key} className="mb-2 border border-[#ddd] p-2 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <input value={l.name} onChange={(e) => upd(l.key, { name: e.target.value })} className={cx(smallInput, 'flex-1 min-w-[180px] uppercase')} />
                <label>Cost <input type="number" min="0" value={l.unit_cost} onChange={(e) => upd(l.key, { unit_cost: e.target.value })} className={cx(smallInput, 'w-[100px]')} /></label>
                <label>Qty <input type="number" min="1" value={l.qty} onChange={(e) => upd(l.key, { qty: e.target.value })} className={cx(smallInput, 'w-[60px]')} /></label>
                <label>Discount <input type="number" min="0" value={l.discount_value} onChange={(e) => upd(l.key, { discount_value: e.target.value })} className={cx(smallInput, 'w-[80px]')} /></label>
                <select value={l.discount_type} onChange={(e) => upd(l.key, { discount_type: e.target.value })} className={smallInput}><option value="pct">%</option><option value="inr">INR</option></select>
                <span className="w-[90px] text-right tabular-nums font-medium">{inr(lineAmounts(l).total)}</span>
                <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove" className="p-1 text-[#999] hover:text-[#d93a46]"><FiX /></button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button onClick={() => upd(l.key, { showTeeth: !l.showTeeth })} className="text-[#1a9ad6]">Teeth{l.teeth.length ? `: ${l.teeth.join(', ')}` : ''}</button>
                <input value={l.notes} onChange={(e) => upd(l.key, { notes: e.target.value })} placeholder="Notes" className={cx(smallInput, 'flex-1')} />
              </div>
              {l.showTeeth && <div className="mt-2"><TeethChart line={l} onChange={(ch) => upd(l.key, ch)} /></div>}
            </div>
          ))}
          {lines.length > 0 && <p className="px-2 text-right text-[14px] font-semibold">{status === 'planned' ? 'Estimated amount' : 'Total'}: ₹{inr(total)}</p>}
        </div>
        <aside className="lg:w-[380px] shrink-0 border-l border-[#ddd] p-2">
          <div className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search procedures" className={cx(smallInput, 'flex-1')} />
            <Button size="sm" variant="secondary" onClick={() => setLines((ls) => [...ls, blank({ name: q })])}>Custom</Button>
          </div>
          <div className="mt-2 max-h-[560px] overflow-y-auto border border-[#ddd]">
            {shown.map((p) => (
              <button key={p.id} onClick={() => setLines((ls) => [...ls, blank(p)])} className="flex w-full justify-between border-b border-[#eee] px-2 py-1.5 text-left text-[13px] uppercase hover:bg-[#f1f6fa]">
                <span>{p.name}</span><span className="tabular-nums text-[#777]">{inr(p.cost)}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
