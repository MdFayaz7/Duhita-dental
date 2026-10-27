import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiSearch, FiUser, FiX } from 'react-icons/fi';
import { api } from './api';
import { Button, ErrorNote, Skeleton, cx, todayIso, useToast } from './ui';
import { PaymentModal, inr, invoiceTotals, lineAmounts } from './billingUi';

// FDI tooth numbers, laid out as on Practo's chart: patient's right on the left.
const PERMANENT = [[[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28]], [[48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]]];
const PRIMARY = [[[55, 54, 53, 52, 51], [61, 62, 63, 64, 65]], [[85, 84, 83, 82, 81], [71, 72, 73, 74, 75]]];
const ALL_PERMANENT = PERMANENT.flat(2);

let keySeq = 0;
const newKey = () => `l${++keySeq}`;

const blankLine = (defaults) => ({
  key: newKey(), procedure_id: null, name: '', doctor_id: defaults.doctorId || '', date: defaults.date,
  teeth: [], unit_cost: '0', qty: '1', discount_value: '0', discount_type: 'pct', tax_pct: '0', notes: '',
  showTeeth: false, showNotes: false, showTax: false, multiply: false, child: false,
});

const fromItem = (item) => ({
  ...blankLine({}), ...item, key: newKey(), doctor_id: item.doctor_id ? String(item.doctor_id) : '',
  unit_cost: String(item.unit_cost), qty: String(item.qty), discount_value: String(item.discount_value),
  tax_pct: String(item.tax_pct), notes: item.notes || '',
  showNotes: !!item.notes, showTax: Number(item.tax_pct) > 0,
});

const cell = 'h-[30px] rounded-[2px] border border-[#c8c8c8] bg-white px-2 text-[13px] outline-none focus:border-[var(--a-link)]';

export default function InvoiceEditor() {
  const { patientId: patientParam, invoiceId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [patient, setPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [number, setNumber] = useState('');
  const [editingNumber, setEditingNumber] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [doctorId, setDoctorId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [status, setStatus] = useState('active');
  const [paid, setPaid] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [payFor, setPayFor] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [docs, procs] = await Promise.all([api.doctors(), api.procedures()]);
        const calendarDoctors = docs.items.filter((d) => d.in_calendar !== false);
        if (!alive) return;
        setDoctors(calendarDoctors);
        setProcedures(procs.items);
        if (invoiceId) {
          const inv = await api.invoice(invoiceId);
          if (!alive) return;
          setPatient(inv.patient);
          setNumber(String(inv.number));
          setDate(inv.date);
          setDoctorId(inv.doctor_id ? String(inv.doctor_id) : '');
          setNotes(inv.notes || '');
          setLines(inv.items.map(fromItem));
          setStatus(inv.status);
          setPaid(Number(inv.paid));
        } else {
          const [billing, next] = await Promise.all([api.patientBilling(patientParam), api.nextInvoiceNumber()]);
          if (!alive) return;
          setPatient(billing.patient);
          setNumber(String(next.number));
          setDoctorId(calendarDoctors[0] ? String(calendarDoctors[0].id) : '');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [invoiceId, patientParam]);

  const totals = useMemo(() => invoiceTotals(lines), [lines]);
  const patientId = patient?.patient_id || patientParam;
  const readOnly = status === 'cancelled';

  const update = (key, changes) => setLines((ls) => ls.map((l) => {
    if (l.key !== key) return l;
    const next = { ...l, ...changes };
    if (next.multiply && ('teeth' in changes || 'multiply' in changes)) next.qty = String(Math.max(1, next.teeth.length));
    return next;
  }));
  const remove = (key) => setLines((ls) => ls.filter((l) => l.key !== key));

  const addProcedure = (proc) => setLines((ls) => [...ls, {
    ...blankLine({ doctorId, date }), procedure_id: proc.id, name: proc.name.toUpperCase(), unit_cost: String(Number(proc.cost)),
  }]);
  const addBlank = (name = '') => setLines((ls) => [...ls, { ...blankLine({ doctorId, date }), name: name.toUpperCase() }]);

  const save = async (withPayment) => {
    setError('');
    if (!lines.length) return setError('Add at least one treatment from the list on the right.');
    const nameless = lines.find((l) => !l.name.trim());
    if (nameless) return setError('Every line needs a treatment name.');
    const body = {
      patient_id: patientId,
      number: editingNumber || invoiceId ? Number(number) || null : null,
      date,
      doctor_id: doctorId ? Number(doctorId) : null,
      notes: notes.trim() || null,
      items: lines.map((l) => ({
        procedure_id: l.procedure_id || null, name: l.name.trim(), doctor_id: l.doctor_id ? Number(l.doctor_id) : null,
        date: l.date || date, teeth: l.teeth, unit_cost: Number(l.unit_cost || 0).toFixed(2), qty: Math.max(1, parseInt(l.qty, 10) || 1),
        discount_value: Number(l.discount_value || 0).toFixed(2), discount_type: l.discount_type,
        tax_pct: Number(l.tax_pct || 0).toFixed(2), notes: l.notes.trim() || null, treatment_id: l.treatment_id || null,
      })),
    };
    setBusy(true);
    try {
      const saved = invoiceId ? await api.updateInvoice(invoiceId, body) : await api.createInvoice(body);
      toast(`Invoice ${saved.number} saved`);
      if (withPayment && Number(saved.due) > 0) setPayFor(saved);
      else navigate(`/admin/patients/${patientId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <div className="grid gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] lg:min-h-[calc(100vh-60px)] bg-white">
      {/* Patient strip */}
      <div className="flex items-center gap-3 px-4 sm:px-5 h-[46px] border-b border-[var(--a-border)] bg-[var(--a-toolbar)]">
        <span className="w-7 h-7 grid place-items-center rounded bg-[#d8d8d8] text-[#777]"><FiUser /></span>
        <Link to={`/admin/patients/${patientId}`} className="text-[14px] uppercase text-[#1a9ad6] hover:underline">{patient?.name || '—'}</Link>
        <span className="text-[13px] text-[#1a9ad6]">(ID : {patientId})</span>
        {patient?.age != null && <span className="text-[13px] text-[#777]">{patient.age}y {patient.sex || ''}</span>}
      </div>

      {/* Invoice bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-2 border-b border-[var(--a-border)]">
        <span className="text-[14px] font-medium tracking-wide">INVOICE</span>
        {readOnly && <span className="rounded-[3px] bg-[#bdbdbd] px-2 py-0.5 text-[12px] text-white">Cancelled</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/patients/${patientId}`)}>Cancel</Button>
          {!readOnly && <Button size="sm" variant="secondary" disabled={busy} onClick={() => save(false)}>Save Invoice</Button>}
          {!readOnly && (
            <Button size="sm" disabled={busy} onClick={() => save(true)} className="!bg-[var(--a-done)] !border-[var(--a-done)] hover:!bg-[#158a22]">
              Save &amp; Create Payment
            </Button>
          )}
        </div>
      </div>
      {error && <div className="px-5 pt-3"><ErrorNote>{error}</ErrorNote></div>}

      <div className="flex flex-1 min-h-0 flex-col xl:flex-row">
        {/* Lines */}
        <section className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 sm:px-5 py-2.5 text-[13px] text-[#555]">
            <span className="flex items-center gap-2">
              Bill Number
              {editingNumber ? (
                <input type="number" min="1" value={number} onChange={(e) => setNumber(e.target.value)} onFocus={(e) => e.target.select()} className={cx(cell, 'w-[100px]')} autoFocus />
              ) : (
                <><b className="font-medium text-[#333]">{number}</b>{!readOnly && <button onClick={() => setEditingNumber(true)} className="text-[#1a9ad6] hover:underline">Edit</button>}</>
              )}
            </span>
            <label className="flex items-center gap-2">Date <input type="date" value={date} disabled={readOnly} onChange={(e) => setDate(e.target.value)} className={cell} /></label>
            <label className="flex items-center gap-2">By
              <select value={doctorId} disabled={readOnly} onChange={(e) => setDoctorId(e.target.value)} className={cx(cell, 'max-w-[220px]')}>
                <option value="">—</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            {paid > 0 && <span className="text-[#137a1e]">₹{inr(paid)} already received</span>}
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[780px] text-[13px]">
              <thead>
                <tr className="border-y border-[var(--a-border)] text-[12px] uppercase text-[#444]">
                  <th className="px-4 py-2 text-left font-medium min-w-[280px]">Treatments &amp; Products</th>
                  <th className="px-2 py-2 text-right font-medium w-[78px]">Unit*</th>
                  <th className="px-2 py-2 text-right font-medium w-[104px]">Cost (INR)</th>
                  <th className="px-2 py-2 text-right font-medium w-[138px]">Discount (INR)</th>
                  <th className="px-2 py-2 text-center font-medium w-[86px]">Taxes (INR)</th>
                  <th className="px-4 py-2 text-right font-medium w-[118px] whitespace-nowrap">Total (INR)</th>
                  <th className="w-[30px]" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <Line key={l.key} line={l} doctors={doctors} readOnly={readOnly}
                    onChange={(changes) => update(l.key, changes)} onRemove={() => remove(l.key)} />
                ))}
                {!lines.length && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[14px] text-[#888]">
                    Pick treatments from the procedure list to add them to this invoice.
                  </td></tr>
                )}
              </tbody>
            </table>
            {!readOnly && (
              <button onClick={() => addBlank()} className="m-4 inline-flex items-center gap-1.5 text-[13px] text-[#1a9ad6] hover:underline">
                <FiPlus /> Add a line by hand
              </button>
            )}
            <div className="px-4 pb-4">
              <textarea value={notes} disabled={readOnly} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="+ add notes for this invoice"
                className="w-full max-w-[520px] rounded-[2px] border border-dashed border-[#c8c8c8] px-3 py-2 text-[13px] outline-none focus:border-[var(--a-link)]" />
            </div>
          </div>

          {/* Totals */}
          <div className="sticky bottom-0 grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.2fr] items-end gap-x-4 gap-y-2 px-4 sm:px-5 py-3 border-t border-[var(--a-border)] bg-[var(--a-panel)] text-[13px]">
            <Total label="Total cost" value={totals.subtotal} />
            <span className="hidden sm:block pb-0.5 text-[#999]">—</span>
            <Total label="Total discount" value={totals.discount} />
            <span className="hidden sm:block pb-0.5 text-[#999]">+</span>
            <Total label="Total tax" value={totals.tax} />
            <span className="hidden sm:block pb-0.5 text-[#999]">=</span>
            <Total label="Grand total" value={totals.total} strong />
          </div>
        </section>

        {/* Procedures */}
        {!readOnly && <ProcedurePicker procedures={procedures} onPick={addProcedure} onCustom={addBlank} onCreated={(p) => setProcedures((ps) => [...ps, p])} />}
      </div>

      <PaymentModal invoice={payFor} onClose={() => navigate(`/admin/patients/${patientId}`)}
        onSaved={() => navigate(`/admin/patients/${patientId}`)} />
    </div>
  );
}

function Total({ label, value, strong }) {
  return (
    <div>
      <p className="text-[11.5px] uppercase text-[#666]">{label}</p>
      <p className={cx('tabular-nums', strong ? 'text-[15px] font-medium text-[#137a1e]' : 'text-[#333]')}>INR {inr(value)}</p>
    </div>
  );
}

function Line({ line: l, doctors, readOnly, onChange, onRemove }) {
  const { total } = lineAmounts(l);
  const set = (k) => (e) => onChange({ [k]: e.target.value });

  return (
    <>
      <tr className="align-top border-l-[3px] border-l-[var(--a-accent)]">
        <td className="px-4 pt-2.5 pb-1">
          <input value={l.name} disabled={readOnly} onChange={(e) => onChange({ name: e.target.value })} className={cx(cell, 'w-full max-w-[360px] uppercase')} />
          <p className="mt-1 flex items-center gap-1 whitespace-nowrap text-[12px] text-[#555]">
            by
            <select value={l.doctor_id} disabled={readOnly} onChange={set('doctor_id')} className="bg-transparent text-[#1a9ad6] outline-none max-w-[150px] truncate">
              <option value="">no doctor</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            on
            <input type="date" value={l.date} disabled={readOnly} onChange={set('date')} className="bg-transparent text-[#1a9ad6] outline-none" />
          </p>
          {l.teeth.length > 0 && !l.showTeeth && <p className="text-[12px] text-[#555]">Teeth: {l.teeth.join(', ')}</p>}
          {l.showNotes ? (
            <input value={l.notes} disabled={readOnly} onChange={set('notes')} placeholder="Notes" className={cx(cell, 'mt-1 w-full max-w-[360px]')} />
          ) : !readOnly && (
            <button onClick={() => onChange({ showNotes: true })} className="text-[12px] text-[#1a9ad6] hover:underline">+ add notes</button>
          )}
        </td>
        <td className="px-2 pt-2.5 text-right">
          <input type="number" min="1" value={l.qty} disabled={readOnly || l.multiply} onChange={set('qty')} className={cx(cell, 'w-full text-right')} />
          {!readOnly && (
            <button onClick={() => onChange({ showTeeth: !l.showTeeth })} className="mt-1 text-[12px] text-[#1a9ad6] hover:underline">
              {l.showTeeth ? 'Hide teeth' : 'Show teeth'}
            </button>
          )}
        </td>
        <td className="px-2 pt-2.5">
          <input type="number" min="0" step="0.01" value={l.unit_cost} disabled={readOnly} onChange={set('unit_cost')} className={cx(cell, 'w-full text-right')} />
        </td>
        <td className="px-2 pt-2.5">
          <span className="flex gap-1">
            <input type="number" min="0" step="0.01" value={l.discount_value} disabled={readOnly} onChange={set('discount_value')} className={cx(cell, 'w-full text-right')} />
            <select value={l.discount_type} disabled={readOnly} onChange={set('discount_type')} className={cx(cell, 'px-1')}>
              <option value="pct">%</option><option value="inr">INR</option>
            </select>
          </span>
        </td>
        <td className="px-2 pt-2.5 text-center">
          {l.showTax ? (
            <span className="inline-flex items-center gap-1">
              <input type="number" min="0" max="100" step="0.01" value={l.tax_pct} disabled={readOnly} onChange={set('tax_pct')} className={cx(cell, 'w-[60px] text-right')} />%
            </span>
          ) : !readOnly && (
            <button onClick={() => onChange({ showTax: true })} className="pt-1.5 text-[12px] text-[#1a9ad6] hover:underline">+ add tax</button>
          )}
        </td>
        <td className="px-4 pt-3.5 text-right tabular-nums whitespace-nowrap text-[#137a1e]">INR {inr(total)}</td>
        <td className="pt-2.5">
          {!readOnly && <button onClick={onRemove} aria-label="Remove line" className="w-6 h-6 grid place-items-center text-[#d93a46] hover:bg-[#fdecee] rounded"><FiX /></button>}
        </td>
      </tr>
      {l.showTeeth && (
        <tr className="border-l-[3px] border-l-[var(--a-accent)]">
          <td colSpan={7} className="pb-3">
            <TeethChart line={l} onChange={onChange} />
          </td>
        </tr>
      )}
      <tr aria-hidden="true"><td colSpan={7} className="border-b border-[var(--a-border)] pt-2" /></tr>
    </>
  );
}

export function TeethChart({ line, onChange }) {
  const selected = new Set(line.teeth);
  const toggle = (t) => onChange({ teeth: selected.has(t) ? line.teeth.filter((x) => x !== t) : [...line.teeth, t].sort((a, b) => a - b) });
  const full = ALL_PERMANENT.every((t) => selected.has(t));
  const rows = line.child ? [...PERMANENT, ...PRIMARY] : PERMANENT;

  return (
    <div className="mx-auto w-fit grid gap-2">
      <div className="flex items-center gap-5 text-[12.5px] text-[#444]">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={line.multiply} onChange={(e) => onChange({ multiply: e.target.checked })} /> Multiply cost</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={full} onChange={(e) => onChange({ teeth: e.target.checked ? [...ALL_PERMANENT].sort((a, b) => a - b) : [] })} /> Full mouth</label>
        <Button size="sm" className="ml-6 !min-h-[26px] !py-0.5 !bg-[var(--a-done)] !border-[var(--a-done)]" onClick={() => onChange({ showTeeth: false })}>Done</Button>
      </div>
      {rows.map((halves, r) => (
        <div key={r} className={cx('flex gap-3', r === 1 && 'mb-1')}>
          {halves.map((half, h) => (
            <div key={h} className={cx('flex', h === 0 && 'justify-end', 'min-w-[184px]')}>
              {half.map((t) => (
                <button key={t} type="button" onClick={() => toggle(t)}
                  className={cx('w-[23px] h-[23px] -ml-px first:ml-0 border text-[11.5px] tabular-nums transition-colors',
                    selected.has(t) ? 'relative z-[1] border-[var(--a-accent)] bg-[var(--a-accent)] text-white' : 'border-[#c8c8c8] bg-white text-[#444] hover:bg-[#fff3e3]')}>
                  {t}
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
      <button onClick={() => onChange({ child: !line.child })} className="justify-self-center text-[12px] text-[#1a9ad6] hover:underline">
        {line.child ? 'Hide child teeth' : 'Show child teeth'}
      </button>
    </div>
  );
}

function ProcedurePicker({ procedures, onPick, onCustom, onCreated }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const input = useRef(null);
  const term = q.trim().toLowerCase();
  const list = useMemo(() => (term ? procedures.filter((p) => p.name.toLowerCase().includes(term)) : procedures)
    .slice().sort((a, b) => a.name.localeCompare(b.name)), [procedures, term]);

  const saveToList = async () => {
    try {
      const created = await api.addProcedure({ name: q.trim(), cost: '0' });
      onCreated(created);
      onPick(created);
      toast(`“${created.name}” added to the procedure list`);
      setQ('');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <aside className="xl:w-[300px] shrink-0 border-t xl:border-t-0 xl:border-l border-[var(--a-border)] flex flex-col max-h-[60vh] xl:max-h-none">
      <div className="flex gap-4 px-3 pt-2 border-b border-[var(--a-border)] text-[13px]">
        <span className="pb-1.5 border-b-2 border-[var(--a-accent)] text-[#333]">Procedures</span>
      </div>
      <div className="p-3 border-b border-[var(--a-border)] bg-[var(--a-panel)]">
        <span className="relative block">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999] w-3.5 h-3.5" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search procedures"
            onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) { onPick(list[0]); setQ(''); } }}
            className={cx(cell, 'w-full pl-8')} />
        </span>
      </div>
      <ul className="flex-1 overflow-y-auto text-[12.5px]">
        {list.map((p) => (
          <li key={p.id}>
            <button onClick={() => { onPick(p); setQ(''); input.current?.focus(); }}
              className="w-full flex items-center justify-between gap-3 px-3 py-[7px] border-b border-[#efefef] text-left hover:bg-[#fff3e3]">
              <span className="uppercase text-[#444] truncate">{p.name}</span>
              <span className="tabular-nums text-[#555]">{Number(p.cost) ? Number(p.cost).toLocaleString('en-IN') : 0}</span>
            </button>
          </li>
        ))}
        {term && !list.some((p) => p.name.toLowerCase() === term) && (
          <li className="p-3 grid gap-2 text-[12.5px]">
            <button onClick={() => { onCustom(q.trim()); setQ(''); }} className="text-left text-[#1a9ad6] hover:underline">+ Add “{q.trim()}” to this invoice only</button>
            <button onClick={saveToList} className="text-left text-[#1a9ad6] hover:underline">+ Save “{q.trim()}” to the procedure list</button>
          </li>
        )}
      </ul>
    </aside>
  );
}
