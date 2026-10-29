import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiCircle, FiDollarSign, FiPlusCircle, FiPrinter, FiTrash2, FiX } from 'react-icons/fi';
import { api } from '../api';
import { Button, Field, Modal, cx, inputClass, todayIso, useConfirm, useToast } from '../ui';
import { inr, lineAmounts, longDate } from '../billingUi';
import { TeethChart } from '../InvoiceEditor';
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
      <SectionBar title={title} share="treatments">
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
const blank = (proc = {}, defaults = {}) => ({
  key: ++seq, procedure_id: proc.id || null, name: (proc.name || '').toUpperCase(), unit_cost: String(Number(proc.cost || 0)), qty: '1',
  discount_value: '0', discount_type: 'pct', tax_pct: '0', teeth: [], notes: '', child: false, multiply: false,
  showTeeth: true, showNotes: false, showDiscount: false, doctor: defaults.doctor || '', date: defaults.date || todayIso(),
});

/** Practo's procedure entry: lines on the left (teeth, qty × cost, discount), the fee list on the right, totals at the bottom. */
function TreatmentForm({ status, pid, onCancel, onSaved }) {
  const completed = status === 'completed';
  const toast = useToast();
  const navigate = useNavigate();
  const { doctors } = usePatientCtx();
  const doctorList = Object.values(doctors).filter((d) => d.in_calendar !== false);
  const [procs, setProcs] = useState([]);
  const [q, setQ] = useState('');
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const loadProcs = () => api.procedures().then((r) => setProcs(r.items)).catch(() => {});
  useEffect(() => { loadProcs(); }, []);

  const shown = useMemo(() => procs.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())), [procs, q]);
  const groups = useMemo(() => shown.reduce((m, p) => ((m[p.category || 'Other'] ||= []).push(p), m), {}), [shown]);
  const upd = (key, ch) => setLines((ls) => ls.map((l) => {
    if (l.key !== key) return l;
    const next = { ...l, ...ch };
    if (next.multiply && ('teeth' in ch || 'multiply' in ch)) next.qty = String(Math.max(1, next.teeth.length));
    return next;
  }));
  const add = (proc) => setLines((ls) => [...ls.map((l) => ({ ...l, showTeeth: false })),
    blank(proc, { doctor: ls.at(-1)?.doctor || (doctorList[0] ? String(doctorList[0].id) : ''), date: ls.at(-1)?.date })]);
  const totals = lines.reduce((t, l) => {
    const a = lineAmounts(l);
    return { gross: t.gross + a.gross, discount: t.discount + a.discount, total: t.total + a.total };
  }, { gross: 0, discount: 0, total: 0 });

  const save = async (andInvoice) => {
    if (!lines.length) return toast('Pick a procedure from the list on the right.', 'error');
    setBusy(true);
    try {
      const ids = [];
      for (const l of lines) {
        const row = await api.saveEmr('treatments', {
          patient_id: pid, status, date: l.date, doctor_id: l.doctor ? Number(l.doctor) : null, procedure_id: l.procedure_id,
          name: l.name.trim() || 'PROCEDURE', unit_cost: Number(l.unit_cost || 0).toFixed(2), qty: Math.max(1, parseInt(l.qty, 10) || 1),
          discount_value: Number(l.discount_value || 0).toFixed(2), discount_type: l.discount_type, teeth: l.teeth, notes: l.notes.trim() || null,
        });
        ids.push(Number(row.id));
      }
      if (andInvoice) {
        const inv = await api.billTreatments(ids);
        toast(`Invoice ${inv.number} created`);
        return navigate(`/admin/invoices/${inv.id}/edit`);
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
    <div className="flex min-h-[calc(100vh-104px)] flex-col bg-white">
      <SectionBar title={completed ? 'Completed Procedures' : 'Treatment Plans'}>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="secondary" onClick={() => save(false)} disabled={busy}>{completed ? 'Save Completed Procedures' : 'Save Treatment Plan'}</Button>
        {completed && <Button size="sm" onClick={() => save(true)} disabled={busy} className="!bg-[#3cae4c] !border-[#3cae4c]">Save &amp; Create Invoice</Button>}
      </SectionBar>
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="grid grid-cols-[1fr_190px_150px_90px_24px] gap-2 border-b border-[#e3e3e3] px-3 py-1.5 text-[10.5px] uppercase text-[#444]">
            <span>Treatments</span><span>Qty &nbsp;×&nbsp; Cost</span><span>Discount</span><span className="text-right">Total</span><span />
          </div>
          <div className="flex-1">
            {!lines.length && <p className="p-6 text-[13px] text-[#777]">Select procedures from the list on the right. You can add multiple items.</p>}
            {lines.map((l) => (
              <div key={l.key} className="border-b border-[#e3e3e3] border-l-4 border-l-[#e9573f]">
                <div className="grid grid-cols-[1fr_190px_150px_90px_24px] items-start gap-2 px-3 py-3 text-[13px]">
                  <div className="min-w-0">
                    <input value={l.name} onChange={(e) => upd(l.key, { name: e.target.value.toUpperCase() })} className="w-full font-semibold uppercase outline-none" />
                    <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[12.5px]">
                      by <select value={l.doctor} onChange={(e) => upd(l.key, { doctor: e.target.value })} className="max-w-[170px] text-[#1a9ad6] outline-none">
                        <option value="">—</option>{doctorList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      on <input type="date" value={l.date} onChange={(e) => upd(l.key, { date: e.target.value })} className="text-[#1a9ad6] outline-none" />
                    </p>
                    {l.showNotes || l.notes
                      ? <input autoFocus={l.showNotes && !l.notes} value={l.notes} onChange={(e) => upd(l.key, { notes: e.target.value })} placeholder="Notes" className={cx(smallInput, 'mt-1 w-full')} />
                      : <button onClick={() => upd(l.key, { showNotes: true })} className="mt-0.5 text-[12.5px] text-[#1a9ad6]">+add notes</button>}
                    <button onClick={() => upd(l.key, { showTeeth: !l.showTeeth })} className="mt-0.5 block text-[12.5px] text-[#1a9ad6]">
                      {l.teeth.length ? `Teeth: ${l.teeth.join(', ')}` : '+select teeth'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min="1" value={l.qty} onChange={(e) => upd(l.key, { qty: e.target.value })} className={cx(smallInput, 'w-[56px]')} />
                    <span>×</span>
                    <input type="number" min="0" value={l.unit_cost} onChange={(e) => upd(l.key, { unit_cost: e.target.value })} className={cx(smallInput, 'w-[100px]')} />
                  </div>
                  <div>
                    {l.showDiscount || Number(l.discount_value) ? (
                      <span className="flex items-center gap-1">
                        <input type="number" min="0" value={l.discount_value} onChange={(e) => upd(l.key, { discount_value: e.target.value })} className={cx(smallInput, 'w-[70px]')} />
                        <select value={l.discount_type} onChange={(e) => upd(l.key, { discount_type: e.target.value })} className={smallInput}><option value="pct">%</option><option value="inr">INR</option></select>
                      </span>
                    ) : <button onClick={() => upd(l.key, { showDiscount: true })} className="pt-1.5 text-[12.5px] text-[#1a9ad6]">+ add discount</button>}
                  </div>
                  <span className="pt-1.5 text-right text-[15px] font-semibold tabular-nums text-[#3c8d2f]">{inr(lineAmounts(l).total)}</span>
                  <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove" className="pt-1.5 text-[#e05a5a]"><FiX /></button>
                </div>
                {l.showTeeth && <div className="px-3 pb-4"><TeethChart line={l} onChange={(ch) => upd(l.key, ch)} /></div>}
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 flex items-end justify-center gap-6 border-t border-[#d8d8d8] bg-[#f2f2f2] px-3 py-2.5 text-center">
            <span><span className="block text-[14px] font-semibold text-[#555]">Total Cost</span><span className="tabular-nums">INR {inr(totals.gross)}</span></span>
            <span className="pb-1 text-[#777]">—</span>
            <span><span className="block text-[14px] font-semibold text-[#555]">Total Discount</span><span className="tabular-nums">INR {inr(totals.discount)}</span></span>
            <span className="pb-1 text-[#777]">=</span>
            <span><span className="block text-[14px] font-semibold text-[#555]">Grand Total</span><span className="font-semibold tabular-nums text-[#3c8d2f]">INR {inr(totals.total)}</span></span>
          </div>
        </div>
        <aside className="flex lg:w-[400px] shrink-0 flex-col border-l border-[#ddd] bg-[#f4f4f4]">
          <div className="flex items-center justify-between px-2 py-2 text-[14px] text-[#555]">
            Procedures ( in INR )
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><FiPlusCircle /> Add</Button>
          </div>
          <div className="px-2 pb-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className={cx(smallInput, 'w-full')} /></div>
          <div className="flex-1 overflow-y-auto bg-white lg:max-h-[calc(100vh-230px)]">
            {Object.entries(groups).map(([cat, list]) => (
              <div key={cat}>
                <p className="sticky top-0 bg-[#e9e9e9] px-2 py-1 text-[11.5px] font-semibold uppercase text-[#555]">{cat}</p>
                {list.map((p) => (
                  <button key={p.id} onClick={() => add(p)} className="flex w-full justify-between gap-3 border-b border-[#eee] px-2 py-1.5 text-left text-[13.5px] hover:bg-[#f1f6fa]">
                    <span>{p.name}</span><span className="tabular-nums text-[#555]">{Number(p.cost)}</span>
                  </button>
                ))}
              </div>
            ))}
            {q.trim() && !shown.length && (
              <button onClick={() => add({ name: q })} className="block w-full px-2 py-2 text-left text-[13px] text-[#1a9ad6]">+ Use “{q}” as a custom procedure</button>
            )}
          </div>
        </aside>
      </div>
      <NewProcedure open={adding} onClose={() => setAdding(false)} onSaved={(p) => { setAdding(false); loadProcs(); add(p); }} />
    </div>
  );
}

/** Add a procedure to the clinic's fee list from the entry screen (Practo's "Add"). */
export function NewProcedure({ open, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', cost: '', category: '' });
  const save = async (e) => {
    e.preventDefault();
    try {
      const p = await api.addProcedure({ name: f.name.trim(), cost: Number(f.cost || 0).toFixed(2), category: f.category.trim() || null });
      toast(`${p.name} added to the fee list`);
      setF({ name: '', cost: '', category: '' });
      onSaved(p);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <Modal open={open} title="Add procedure" subtitle="Added to the clinic's fee list" onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        <Field label="Procedure name"><input required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputClass} /></Field>
        <Field label="Fee (INR)"><input type="number" min="0" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} className={inputClass} /></Field>
        <Field label="Group (optional)" hint="e.g. Oral Surgery, Periodontics"><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inputClass} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Add</Button></div>
      </form>
    </Modal>
  );
}
