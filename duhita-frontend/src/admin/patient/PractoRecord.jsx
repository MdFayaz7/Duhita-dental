import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  FiCheckCircle, FiChevronDown, FiClock, FiCreditCard, FiDollarSign, FiFileText, FiList, FiPrinter, FiUser, FiUsers,
} from 'react-icons/fi';
import { api } from '../api';
import { Button, EmptyState, ErrorNote, Field, Modal, Skeleton, cx, inputClass, useConfirm, useToast } from '../ui';
import { inr, longDate, modeLabel } from '../billingUi';
import { SectionBar, escapeHtml as esc, printHtml } from './shared';

const NAV = [
  ['Patient', [['profile', 'Profile', FiUser]]],
  ['EMR', [['treatments', 'Completed Procedures', FiCheckCircle], ['timeline', 'Timeline', FiClock]]],
  ['Billing', [['invoices', 'Invoices', FiDollarSign], ['payments', 'Payments', FiCreditCard], ['ledger', 'Ledger', FiList]]],
];
const disc = (r) => (Number(r.discount) ? `${inr(r.discount)}${r.discount_type === 'NUMBER' ? '' : '%'}` : '0.00');
const day = (d) => (d ? longDate(d) : '—');

/** Invoice lines grouped into bills: by invoice number, or by date + doctor for Practo's unnumbered bills. */
function bills(lines) {
  const out = new Map();
  for (const l of lines) {
    const key = l.invoice_number ? `#${l.invoice_number}` : `${l.date}|${l.doctor || ''}`;
    if (!out.has(key)) out.set(key, { key, number: l.invoice_number, date: l.date, doctor: l.doctor, lines: [], cancelled: true });
    const b = out.get(key);
    b.lines.push(l);
    b.cancelled &&= l.cancelled;
  }
  return [...out.values()].map((b) => ({ ...b, total: b.lines.filter((l) => !l.cancelled).reduce((s, l) => s + Number(l.total), 0) }));
}

/** One patient's history as exported from Practo — read only, in the same layout as a clinic patient. */
export default function PractoRecord() {
  const { number, section = 'treatments' } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { kind, row }
  const load = useCallback(() => api.practoPatient(number).then(setD).catch((e) => setError(e.message)), [number]);
  useEffect(() => { setD(null); load(); }, [load]);
  const act = useRowActions(load);
  const invoiceBills = useMemo(() => (d ? bills(d.invoices) : []), [d]);

  if (error) return <div className="p-4"><ErrorNote>{error}</ErrorNote></div>;
  if (!d) return <Skeleton className="m-4 h-60" />;
  const p = d.patient;
  const who = `<p><b>${esc(p.name.toUpperCase())}</b> · ${esc([p.gender, p.age != null && `${p.age} yrs`].filter(Boolean).join(', '))}${p.mobile ? ` · +91 ${esc(p.mobile)}` : ''}<br><span class="muted">Practo patient no. ${esc(p.number)}</span></p>`;
  const ctx = { d, p, who, invoiceBills, act: { ...act, edit: (kind, row) => setEditing({ kind, row }) } };

  return (
    <div className="border-b border-[#d8d8d8] bg-[#f4f4f4]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#d8d8d8] bg-white px-3 min-h-[44px] text-[13px]">
        <Link to="/admin/patients?list=practo" className="flex items-center gap-2 font-medium text-[#1a5fa0]"><FiUsers className="w-5 h-5" /> Practo Patients</Link>
        <span className="h-6 w-px bg-[#ddd]" />
        <span className="w-[30px] h-[30px] grid place-items-center bg-[#d5d5d5] text-white"><FiUser /></span>
        <span className="uppercase text-[#1a5fa0]">{p.name}</span>
        <span className="text-[#1a5fa0]">{[p.gender, p.age != null && `${p.age} Years`].filter(Boolean).join(', ')}</span>
        <span className="text-[#1a5fa0]">{p.number.startsWith('NA-') ? '(no Practo number)' : `(Practo # ${p.number})`}</span>
        {p.mobile && <span className="hidden sm:inline text-[#777]">+91 {p.mobile}</span>}
        <span className="ml-auto flex gap-5 py-1">
          <Money label="Billed" v={d.summary.billed} /><Money label="Paid" v={d.summary.paid} tone="text-[#137a1e]" />
          <Money label="Due" v={d.summary.due} tone={Number(d.summary.due) > 0 ? 'text-[#d93a46]' : ''} />
        </span>
      </div>
      <div className="flex min-h-[calc(100vh-104px)]">
        <nav className="w-[46px] md:w-[220px] shrink-0 border-r border-[#d8d8d8] bg-white pt-2">
          {NAV.map(([heading, items]) => (
            <div key={heading} className="mb-2">
              <p className="hidden md:block px-3 pt-2 pb-1 text-[12px] font-semibold text-[#1a73a8]">{heading}</p>
              {items.map(([slug, label, Icon]) => (
                <NavLink key={slug} to={`/admin/patients/practo/${number}/${slug}`} title={label}
                  className={cx('flex items-center gap-3 px-3 py-[7px] text-[13.5px]', section === slug ? 'bg-[#1a7fb5] text-white font-medium' : 'text-[#333] hover:bg-[#f1f6fa]')}>
                  <Icon className="w-4 h-4 shrink-0" /><span className="hidden md:inline truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <p className="hidden md:block px-3 pt-3 text-[11.5px] text-[#888]">Imported from Practo · read only</p>
        </nav>
        <main className="min-w-0 flex-1 bg-[#e9e9e9]">
          {section === 'profile' && <Profile {...ctx} />}
          {section === 'treatments' && <Procedures {...ctx} />}
          {section === 'timeline' && <Timeline {...ctx} />}
          {section === 'invoices' && <Invoices {...ctx} />}
          {section === 'payments' && <Payments {...ctx} />}
          {section === 'ledger' && <Ledger {...ctx} />}
        </main>
      </div>
      <EditRow editing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </div>
  );
}

const PrintBtn = ({ onClick, label = 'Print / PDF' }) => (
  <Button size="sm" variant="secondary" onClick={onClick}><FiPrinter /> {label}</Button>
);

/** Items grouped date-wise: one date heading, then a bordered card per item, as in Practo. */
function ByDate({ items, render }) {
  const days = [];
  for (const it of items) {
    if (days.at(-1)?.date !== it.date) days.push({ date: it.date, items: [] });
    days.at(-1).items.push(it);
  }
  return days.map((g) => (
    <section key={g.date || 'none'} className="px-2 pb-2">
      <p className="pt-3 pb-1 text-[11.5px] font-medium text-[#444]">{day(g.date)}</p>
      <div className="grid gap-2">{g.items.map((it, i) => <article key={it.key ?? i} className="border border-[#dcdcdc] bg-white">{render(it)}</article>)}</div>
    </section>
  ));
}

function procTable(rows) {
  return `<table><tr><th>#</th><th>Procedure</th><th>Teeth</th><th style="text-align:right">Cost</th><th style="text-align:right">Discount</th><th style="text-align:right">Total</th></tr>${rows.map((t, i) => `<tr><td>${i + 1}</td><td>${esc((t.name || t.treatment || '').toUpperCase())}${t.notes ? `<br><span class="muted">${esc(t.notes)}</span>` : ''}</td><td>${esc(t.teeth || '')}</td><td style="text-align:right">${inr(t.cost ?? t.unit_cost ?? 0)}</td><td style="text-align:right">${disc(t)}</td><td style="text-align:right">${inr(t.amount ?? t.total ?? 0)}</td></tr>`).join('')}</table>`;
}

function Procedures({ d, p, who, act }) {
  const billed = useMemo(() => new Set(d.invoices.filter((l) => !l.cancelled).map((l) => (l.treatment || '').trim().toUpperCase())), [d]);
  const days = useMemo(() => {
    const m = new Map();
    for (const t of d.treatments) {
      const k = `${t.date}|${t.doctor || ''}`;
      if (!m.has(k)) m.set(k, { key: k, date: t.date, doctor: t.doctor, rows: [] });
      m.get(k).rows.push(t);
    }
    return [...m.values()];
  }, [d]);
  const print = (groups, title) => printHtml(`${title} · ${p.name}`, `${who}<h3>${title}</h3>${groups.map((g) =>
    `<p style="margin:14px 0 0"><b>${day(g.date)}</b>${g.doctor ? ` · ${esc(g.doctor)}` : ''}</p>${procTable(g.rows)}`).join('')}`);
  return (
    <>
      <SectionBar title="Completed Procedures">{days.length > 0 && <PrintBtn label="Print all" onClick={() => print(days, 'Completed Procedures')} />}</SectionBar>
      {!days.length ? <EmptyState title="No treatments in the Practo export." /> : <ByDate items={days} render={(g) => (
        <>
          <div className="overflow-x-auto border-l-4 border-[#e9573f]">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead><tr className="border-b border-[#e3e3e3] text-[10.5px] font-semibold uppercase">
                <th className="px-2 py-1.5 text-left">Procedure</th><th className="px-2 text-right">Cost</th><th className="px-2 text-right">Discount</th>
                <th className="px-2 text-right">Total</th><th className="px-2 text-left">Notes</th><th className="w-[40px]" />
              </tr></thead>
              <tbody>
                {g.rows.map((t) => (
                  <tr key={t.id} className="align-top">
                    <td className="px-2 py-2 uppercase"><span className="flex items-center gap-2">
                      {billed.has((t.name || '').trim().toUpperCase())
                        ? <span title="Invoiced" className="grid w-[16px] h-[18px] place-items-center border border-[#777] text-[10px] text-[#555]">$</span>
                        : <FiCheckCircle className="text-[#777]" />}
                      {t.name}</span></td>
                    <td className="px-2 py-2 text-right tabular-nums">{inr(t.cost ?? 0)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{disc(t)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{inr(t.amount ?? 0)}</td>
                    <td className="px-2 py-2">
                      {t.teeth && <span className="flex flex-wrap items-center gap-1">Teeth: {t.teeth.split(', ').map((x) => <span key={x} className="border border-[#bbb] px-1 text-[11px]">{x}</span>)}</span>}
                      {t.notes && <span className="block text-[#666]">{t.notes}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <RowMenu items={[['Edit', () => act.edit('treatments', t)], ['Delete', () => act.remove('treatments', t, t.name)]]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#e3e3e3] px-3 py-2 text-[12.5px]">
            <span>Completed by <b>{g.doctor || '—'}</b></span>
            <span className="flex items-center gap-3 font-semibold">Total: {inr(g.rows.reduce((s, t) => s + Number(t.amount || 0), 0))}
              <button onClick={() => print([g], 'Treatment Summary')} title="Print" className="p-1 text-[#555]"><FiPrinter /></button></span>
          </div>
        </>
      )} />}
    </>
  );
}

function printInvoice(b, d, who) {
  const paid = d.payments.filter((x) => !x.cancelled && b.number && x.invoice_number === b.number).reduce((s, x) => s + Number(x.amount || 0), 0);
  printHtml(`Invoice ${b.number || ''}`, `${who}
    <div style="display:flex;justify-content:space-between;margin-top:10px"><b style="font-size:15px">Invoice${b.cancelled ? ' (CANCELLED)' : ''}</b>
    <span>Date: ${day(b.date)}${b.number ? `<br>Invoice Number: <b>${esc(b.number)}</b>` : ''}</span></div>
    ${b.doctor ? `<p>By: <b>${esc(b.doctor)}</b></p>` : ''}
    <table><tr><th>#</th><th>Treatments &amp; Products</th><th style="text-align:right">Unit Cost INR</th><th style="text-align:right">Qty</th><th style="text-align:right">Discount</th><th style="text-align:right">Total Cost INR</th></tr>
    ${b.lines.map((l, i) => `<tr${l.cancelled ? ' style="text-decoration:line-through;color:#999"' : ''}><td>${i + 1}</td><td><b>${esc((l.treatment || '').toUpperCase())}</b></td><td style="text-align:right">${inr(l.unit_cost ?? 0)}</td><td style="text-align:right">${Number(l.qty ?? 1)}</td><td style="text-align:right">${disc(l)}</td><td style="text-align:right">${inr(l.total)}</td></tr>`).join('')}</table>
    <table style="width:300px;margin-left:auto;margin-top:12px">
      <tr><td style="text-align:right"><b>Grand Total:</b></td><td style="text-align:right"><b>${inr(b.total)} INR</b></td></tr>
      ${b.number ? `<tr><td style="text-align:right">Amount Received:</td><td style="text-align:right">${inr(paid)} INR</td></tr><tr><td style="text-align:right"><b>Balance:</b></td><td style="text-align:right"><b>${inr(Math.max(0, b.total - paid))} INR</b></td></tr>` : ''}
    </table><p class="muted" style="margin-top:30px">Imported from Practo records.</p>`);
}

function Invoices({ d, who, invoiceBills, act }) {
  const th = 'px-2 py-2 text-[10.5px] font-semibold uppercase text-[#333]';
  return (
    <>
      <SectionBar title="Invoices" />
      {!invoiceBills.length ? <EmptyState title="No invoices in the Practo export." /> : <ByDate items={[...invoiceBills].sort((a, b) => (a.date < b.date ? 1 : -1))} render={(b) => {
        const paid = paidOn(d, b.number);
        return (
          <>
            <div className={cx('overflow-x-auto', b.cancelled && 'opacity-60')}>
              <table className="w-full min-w-[900px] text-[13px]">
                <thead><tr className="border-b border-[#e3e3e3]">
                  <th className={cx(th, 'w-[22%] text-left')}>Invoice Number</th><th className={cx(th, 'text-left')}>Treatments &amp; Products</th>
                  <th className={cx(th, 'text-right')}>Cost</th><th className={cx(th, 'text-right')}>Discount</th><th className={cx(th, 'text-right')}>Tax</th>
                  <th className={cx(th, 'text-right')}>Total</th>
                  <th className="w-[90px] pr-2">
                    <span className="flex justify-end">
                      <button onClick={() => printInvoice(b, d, who)} title="Print / PDF" className="rounded-l border border-[#ccc] p-1.5 text-[#444] hover:bg-[#f5f5f5]"><FiPrinter /></button>
                      <RowMenu joined items={[
                        [b.cancelled ? 'Restore invoice' : 'Cancel invoice', () => act.setCancelled('invoices', b.lines, !b.cancelled, `invoice ${b.number || ''}`)],
                        ['Delete invoice', () => act.removeMany('invoices', b.lines, `invoice ${b.number || ''}`)],
                      ]} />
                    </span>
                  </th>
                </tr></thead>
                <tbody>
                  {b.lines.map((l, k) => (
                    <tr key={l.id} className="align-top">
                      {k === 0 && (
                        <td rowSpan={b.lines.length} className="px-2 py-2 align-top">
                          <p className="text-[14px] text-[#1a9ad6]">{b.number || '—'}{b.cancelled && <span className="ml-2 text-[12px] text-[#d93a46]">Cancelled</span>}</p>
                          <p className="mt-1 text-[#555]">Balance</p>
                          <p className="text-[#d93a46] tabular-nums">{inr(Math.max(0, b.total - paid))}</p>
                          <p className="mt-1 flex gap-3 text-[#555]"><span>Total</span><span>Paid</span></p>
                          <p className="flex gap-3 tabular-nums"><span>{inr(b.total)}</span><span>{inr(paid)}</span></p>
                        </td>
                      )}
                      <td className={cx('border-b border-[#e8e8e8] px-2 py-2', l.cancelled && 'line-through text-[#999]')}>
                        <span className="uppercase text-[#1a9ad6]">{l.treatment}</span>
                        {Number(l.qty) > 1 && <span className="ml-1 text-[#777]">× {Number(l.qty)}</span>}
                        <span className="block pt-2 text-[12.5px] text-[#444]">{(l.doctor || b.doctor) && <>Completed by <b>{l.doctor || b.doctor}</b></>}</span>
                      </td>
                      <td className="border-b border-[#e8e8e8] px-2 py-2 text-right tabular-nums">{inr(Number(l.unit_cost ?? 0) * Number(l.qty ?? 1))}</td>
                      <td className="border-b border-[#e8e8e8] px-2 py-2 text-right tabular-nums">{Number(l.discount) ? disc(l) : '0.00'}</td>
                      <td className="border-b border-[#e8e8e8] px-2 py-2 text-right tabular-nums">{Number(l.tax_percent) ? `${Number(l.tax_percent)}%` : '0.00'}</td>
                      <td className="border-b border-[#e8e8e8] px-2 py-2 text-right tabular-nums">{inr(l.total)}</td>
                      <td className="border-b border-[#e8e8e8] px-2 py-1.5 text-right">
                        <RowMenu items={[['Edit', () => act.edit('invoices', l)], ['Delete line', () => act.remove('invoices', l, l.treatment)]]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      }} />}
    </>
  );
}

const towards = (t) => (t || '').split(/\s*,\s*/).filter(Boolean);
const paidOn = (d, number) => d.payments.filter((x) => !x.cancelled && number && x.invoice_number === number).reduce((s, x) => s + Number(x.amount || 0), 0);

function Payments({ d, who, act }) {
  const receipt = (x) => printHtml(`Receipt · ${d.patient.name}`, `${who}<h3>Payment Receipt${x.cancelled ? ' (CANCELLED)' : ''}</h3>
    <p>Date: ${day(x.date)}${x.receipt_number ? ` · Receipt No. ${esc(x.receipt_number)}` : ''}</p>
    <table><tr><th>Amount Paid INR</th><th>Invoice</th><th>Towards</th><th>Mode of Payment</th></tr>
    <tr><td><b>${inr(x.amount ?? 0)}</b></td><td>${esc(x.invoice_number || '—')}</td><td>${towards(x.treatment).map((t) => esc(t.toUpperCase())).join('<br>')}</td><td>${esc(modeLabel(x.mode || ''))}</td></tr></table>
    ${x.notes ? `<p>${esc(x.notes)}</p>` : ''}<p style="margin-top:40px;text-align:right">Received with thanks</p>`);
  const th = 'px-2 py-2 text-[10.5px] font-semibold uppercase text-[#333] text-left';
  return (
    <>
      <SectionBar title="Payments" />
      {!d.payments.length ? <EmptyState title="No payments in the Practo export." /> : (
        <ByDate items={(() => {
          // One card per date holding that day's receipts, as in Practo.
          const days = [];
          for (const x of d.payments) {
            if (days.at(-1)?.date !== x.date) days.push({ key: x.date, date: x.date, rows: [] });
            days.at(-1).rows.push(x);
          }
          return days;
        })()} render={(g) => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead><tr className="border-b border-[#e3e3e3]">
                <th className={th}>Receipt Number</th><th className={cx(th, 'text-right')}>Amount Paid</th><th className={th}>Invoices</th>
                <th className={th}>Towards</th><th className={th}>Mode of Payment</th><th className="w-[100px]" />
              </tr></thead>
              <tbody>
                {g.rows.map((x) => (
                  <tr key={x.id} className={cx('align-top border-b border-[#e8e8e8] last:border-0', x.cancelled && 'bg-[#efefef] text-[#aaa] line-through')}>
                    <td className="px-2 py-2.5">{x.receipt_number || ''}</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{inr(x.amount ?? 0)}</td>
                    <td className={cx('px-2 py-2.5', !x.cancelled && 'text-[#1a9ad6]')}>{x.invoice_number || ''}</td>
                    <td className="px-2 py-2.5 uppercase leading-[1.45]">{towards(x.treatment).map((t, k) => <span key={k} className="block">{t}</span>)}</td>
                    <td className="px-2 py-2.5 capitalize">{modeLabel(x.mode || '')}{x.notes && <span className="block normal-case text-[#777]">{x.notes}</span>}</td>
                    <td className="px-2 py-2 text-right no-underline">
                      <span className="flex items-center justify-end gap-1" style={{ textDecoration: 'none' }}>
                        {x.cancelled
                          ? <span className="text-[11px] font-semibold text-[#999]">Cancelled</span>
                          : <button onClick={() => receipt(x)} title="Print receipt" className="rounded-l border border-[#ccc] p-1.5 text-[#444] hover:bg-[#f5f5f5]"><FiPrinter /></button>}
                        <RowMenu joined={!x.cancelled} items={[
                          ['Edit', () => act.edit('payments', x)],
                          [x.cancelled ? 'Restore payment' : 'Cancel payment', () => act.setCancelled('payments', [x], !x.cancelled, 'payment')],
                          ['Delete', () => act.remove('payments', x, `₹${inr(x.amount ?? 0)} payment`)],
                        ]} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )} />
      )}
    </>
  );
}

/** Practo's "All Transactions": invoices credit what is owed, payments debit it; cancelled rows stay, struck through. */
function transactions(d, invoiceBills) {
  const rows = [
    ...invoiceBills.map((b) => ({ key: `i${b.key}`, date: b.date, number: b.number || '', details: b.lines.map((l) => l.treatment).join(', '), type: 'Invoice', credit: b.total, debit: 0, cancelled: b.cancelled })),
    ...d.payments.map((x) => ({ key: `p${x.id}`, date: x.date, number: x.receipt_number || '', details: x.invoice_number || towards(x.treatment).join(', '), type: 'Payment', credit: 0, debit: Number(x.amount || 0), cancelled: x.cancelled })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.debit - b.debit));
  let bal = 0;
  for (const r of rows) if (!r.cancelled) r.balance = (bal += r.credit - r.debit);
  return rows;
}

function Ledger({ d, p, who, invoiceBills }) {
  const rows = useMemo(() => transactions(d, invoiceBills), [d, invoiceBills]);
  const [picked, setPicked] = useState(new Set());
  const live = rows.filter((r) => !r.cancelled);
  const credit = live.reduce((s, r) => s + r.credit, 0);
  const debit = live.reduce((s, r) => s + r.debit, 0);
  const print = (only) => {
    const list = only ? rows.filter((r) => picked.has(r.key)) : rows;
    printHtml(`Billing summary · ${p.name}`, `${who}<h3>All Transactions</h3><table><tr><th>Date</th><th>Invoice/Receipt No.</th><th>Details</th><th>Type</th><th style="text-align:right">Credit (INR)</th><th style="text-align:right">Debit (INR)</th><th style="text-align:right">Balance (INR)</th></tr>
      ${list.map((r) => `<tr${r.cancelled ? ' style="text-decoration:line-through;color:#999"' : ''}><td>${day(r.date)}</td><td>${esc(r.number)}</td><td>${esc(r.details.toUpperCase())}</td><td>${r.type}</td><td style="text-align:right">${inr(r.credit)}</td><td style="text-align:right">${inr(r.debit)}</td><td style="text-align:right">${r.cancelled ? 'Cancelled' : inr(r.balance)}</td></tr>`).join('')}
      <tr><td colspan="4"></td><td style="text-align:right"><b>${inr(credit)}</b></td><td style="text-align:right"><b>${inr(debit)}</b></td><td style="text-align:right"><b>${inr(credit - debit)}</b></td></tr></table>`);
  };
  const toggle = (k) => setPicked((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const th = 'px-3 py-2.5 text-[11px] font-semibold uppercase text-[#444]';
  return (
    <>
      <SectionBar title="All Transactions">
        <Button size="sm" variant="secondary" disabled={!picked.size} onClick={() => print(true)}>Print billing summary</Button>
        <Button size="sm" variant="secondary" disabled={!rows.length} onClick={() => print(false)}>Print</Button>
      </SectionBar>
      <div className="bg-white p-3">
        {!rows.length ? <EmptyState title="No bills or payments in the Practo export." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead><tr className="bg-[#f2f2f2]">
                <th className="w-[36px] px-3"><input type="checkbox" checked={picked.size === rows.length} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.key)) : new Set())} aria-label="Select all" /></th>
                <th className={cx(th, 'text-left')}>Date ↑</th><th className={cx(th, 'text-left')}>Invoice / Receipt Number</th><th className={cx(th, 'text-left')}>Details</th>
                <th className={cx(th, 'text-left')}>Type</th><th className={cx(th, 'text-right')}>Credit (INR)</th><th className={cx(th, 'text-right')}>Debit (INR)</th><th className={cx(th, 'text-right')}>Balance (INR)</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className={cx('border-b border-[#e8e8e8] align-top', r.cancelled && 'bg-[#efefef] text-[#aaa] line-through')}>
                    <td className="px-3 py-3">{!r.cancelled && <input type="checkbox" checked={picked.has(r.key)} onChange={() => toggle(r.key)} aria-label="Select" />}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{day(r.date)}</td>
                    <td className={cx('px-3 py-3', r.type === 'Invoice' && !r.cancelled && 'text-[#1a9ad6]')}>{r.number}</td>
                    <td className="px-3 py-3 uppercase max-w-[360px]">{r.details}</td>
                    <td className="px-3 py-3">{r.type}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{inr(r.credit)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{inr(r.debit)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.cancelled ? <span className="font-semibold" style={{ textDecoration: 'none' }}>Cancelled</span> : inr(r.balance)}</td>
                  </tr>
                ))}
                <tr className="text-[15px] font-semibold">
                  <td colSpan={5} /><td className="px-3 py-3 text-right tabular-nums">{inr(credit)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{inr(debit)}</td><td className="px-3 py-3 text-right tabular-nums">{inr(credit - debit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/** Practo's case sheet: big date, events newest first; tick the ones to print. */
function Timeline({ d, p, who, invoiceBills }) {
  const days = useMemo(() => {
    const order = { invoice: 0, payment: 1, procedure: 2 };
    const ev = [
      ...invoiceBills.map((b) => ({ key: `i${b.key}`, kind: 'invoice', date: b.date, b, paid: paidOn(d, b.number) })),
      ...d.payments.map((x) => ({ key: `p${x.id}`, kind: 'payment', date: x.date, x })),
      ...d.treatments.map((t) => ({ key: `t${t.id}`, kind: 'procedure', date: t.date, t })),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : order[a.kind] - order[b.kind]));
    const out = [];
    for (const e of ev) {
      if (out.at(-1)?.date !== e.date) out.push({ date: e.date, events: [] });
      out.at(-1).events.push(e);
    }
    return out;
  }, [d, invoiceBills]);
  const all = days.flatMap((g) => g.events.map((e) => e.key));
  const [picked, setPicked] = useState(() => new Set());
  const toggle = (k) => setPicked((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const html = (e) => {
    if (e.kind === 'invoice') {
      return `<b>Invoice${e.b.cancelled ? ' (cancelled)' : ''}</b><br>${esc(e.b.lines.map((l) => (l.treatment || '').toUpperCase()).join(', '))}<br>${e.b.number ? `<b>${esc(e.b.number)}</b><br>` : ''}Invoice Amount : INR ${inr(e.b.total)}<br>Paid Amount : ${e.paid ? `INR ${inr(e.paid)}` : ''}<br>Due Amount : INR ${inr(Math.max(0, e.b.total - e.paid))}`;
    }
    if (e.kind === 'payment') return `<b>Payment${e.x.cancelled ? ' (cancelled)' : ''}</b><br>Amount Paid : ${inr(e.x.amount ?? 0)}<br>via ${esc(modeLabel(e.x.mode || ''))}`;
    return `<b>Procedure Performed</b>${e.t.doctor ? `<br>${esc(e.t.doctor)}` : ''}<br>${esc((e.t.name || '').toUpperCase())}${e.t.teeth ? ` · Teeth ${esc(e.t.teeth)}` : ''}${e.t.notes ? `<br><span class="muted">${esc(e.t.notes)}</span>` : ''}`;
  };
  const printCase = () => {
    const chosen = picked.size ? picked : new Set(all);
    printHtml(`Case sheet · ${p.name}`, `${who}<h3>Case Sheet</h3>${days.map((g) => {
      const ev = g.events.filter((e) => chosen.has(e.key));
      return ev.length ? `<p style="margin:14px 0 4px;color:#2f8fa3"><b>${day(g.date)}</b></p>${ev.map((e) => `<div style="border:1px solid #ccc;padding:8px 10px;margin:6px 0">${html(e)}</div>`).join('')}` : '';
    }).join('')}`);
  };

  const card = (e) => {
    const box = (icon, title, body) => (
      <article className="relative rounded-[3px] border border-[#dcdcdc] bg-white px-4 py-3">
        <span className="absolute -left-[21px] top-4 w-[9px] h-[9px] rounded-full bg-[#2f8fa3] ring-2 ring-white" aria-hidden="true" />
        <input type="checkbox" checked={picked.has(e.key)} onChange={() => toggle(e.key)} aria-label="Select for print" className="absolute right-3 top-3" />
        <p className="flex items-center gap-2 text-[16px] text-[#444]">{icon}{title}</p>
        <div className="mt-1 grid gap-0.5 text-[13px] text-[#555]">{body}</div>
      </article>
    );
    if (e.kind === 'invoice') {
      return box(<FiFileText className="text-[#777]" />, <>Invoice{e.b.cancelled && <span className="text-[12px] text-[#999]">(cancelled)</span>}</>, <>
        <p className="uppercase">{e.b.lines.map((l) => l.treatment).join(' , ')}</p>
        {e.b.number && <p className="mt-1 font-semibold text-[#333]">{e.b.number}</p>}
        <p className="font-semibold text-[#333]">Invoice Amount : INR {inr(e.b.total)}</p>
        <p className="font-semibold text-[#333]">Paid Amount : {e.paid ? `INR ${inr(e.paid)}` : ''}</p>
        <p className="font-semibold text-[#333]">Due Amount : INR {inr(Math.max(0, e.b.total - e.paid))}</p>
      </>);
    }
    if (e.kind === 'payment') {
      return box(<FiCreditCard className="text-[#777]" />, <>Payment{e.x.cancelled && <span className="text-[12px] text-[#999]">(cancelled)</span>}</>, <>
        <p className="font-semibold text-[#333]">Amount Paid : {inr(e.x.amount ?? 0)}</p>
        <p className="font-semibold text-[#333]">via {modeLabel(e.x.mode || '')}</p>
      </>);
    }
    return box(<FiCheckCircle className="text-[#777]" />, 'Procedure Performed', <>
      {e.t.doctor && <p className="flex items-center gap-2 text-[13.5px]"><span className="w-[3px] h-3.5 bg-[#e0662b]" />{e.t.doctor}</p>}
      <p className="uppercase">{e.t.name}{e.t.teeth && <span className="normal-case text-[#777]"> · Teeth {e.t.teeth}</span>}</p>
      {e.t.notes && <p className="text-[#777]">{e.t.notes}</p>}
    </>);
  };

  return (
    <>
      <SectionBar title="Timeline">
        <Button size="sm" disabled={!all.length} onClick={printCase} className="!bg-[#1a73e8] !border-[#1a73e8]">Print Case Sheet</Button>
      </SectionBar>
      {!days.length ? <EmptyState title="Nothing in the Practo export for this patient." /> : (
        <div className="bg-white px-3 py-3">
          <div className="mb-2 flex justify-between text-[12.5px] text-[#1a9ad6]">
            <button onClick={() => setPicked(new Set())}>De-select All</button>
            <button onClick={() => setPicked(new Set(all))}>Select All</button>
          </div>
          <div className="relative pl-8">
            <span className="absolute left-[13px] top-2 bottom-2 w-[3px] rounded bg-[#bcd9de]" aria-hidden="true" />
            {days.map((g) => {
              const dt = g.date ? new Date(`${g.date}T00:00:00`) : null;
              return (
                <section key={g.date || 'none'} className="mb-6">
                  <h3 className="mb-2 -ml-1 flex items-end gap-2">
                    <span className="text-[26px] leading-none font-light text-[#2f8fa3] tabular-nums">{dt ? String(dt.getDate()).padStart(2, '0') : '—'}</span>
                    {dt && (
                      <span className="leading-tight">
                        <span className="block text-[12px] text-[#666]">{dt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                        <span className="block text-[12px] font-medium text-[#444]">{dt.toLocaleDateString('en-IN', { weekday: 'long' })}</span>
                      </span>
                    )}
                  </h3>
                  <div className="grid gap-2.5">{g.events.map((e) => <div key={e.key}>{card(e)}</div>)}</div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function Profile({ p }) {
  const rows = [['Practo number', p.number.startsWith('NA-') ? 'Not given in Practo' : p.number], ['Name', p.name], ['Mobile', p.mobile], ['Gender', p.gender], ['Age', p.age],
    ['Date of birth', p.dob && longDate(p.dob)], ['Email', p.email], ['Address', p.address], ...Object.entries(p.details || {})];
  return (
    <>
      <SectionBar title="Profile" />
      <dl className="grid gap-x-6 gap-y-2 bg-white p-4 text-[13.5px] sm:grid-cols-[180px_1fr]">
        {rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => <div key={k} className="contents"><dt className="text-[#777]">{k}</dt><dd>{String(v)}</dd></div>)}
      </dl>
    </>
  );
}

/** Practo's ▾ menu on a row. */
function RowMenu({ items, joined }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <span ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} aria-label="More actions"
        className={cx('border border-[#ccc] p-1.5 text-[#444] hover:bg-[#f5f5f5]', joined ? 'rounded-r border-l-0' : 'rounded')}><FiChevronDown /></button>
      {open && (
        <span className="absolute right-0 z-20 mt-1 block min-w-[150px] border border-[#ccc] bg-white py-1 text-left shadow-lg">
          {items.map(([label, fn]) => (
            <button key={label} onClick={() => { setOpen(false); fn(); }}
              className={cx('block w-full px-3 py-1.5 text-left text-[13px] font-normal normal-case hover:bg-[#f1f6fa]', /delete/i.test(label) && 'text-[#d93a46]')}>{label}</button>
          ))}
        </span>
      )}
    </span>
  );
}

function useRowActions(reload) {
  const toast = useToast();
  const confirm = useConfirm();
  const run = async (fn, done) => {
    try {
      await fn();
      toast(done);
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return {
    remove: async (kind, row, what) => {
      if (await confirm({ title: 'Delete', message: `Delete ${what || 'this record'} from the Practo history? This can't be undone.`, confirmLabel: 'Delete', tone: 'danger' })) {
        run(() => api.practoDelete(kind, row.id), 'Deleted');
      }
    },
    removeMany: async (kind, rows, what) => {
      if (await confirm({ title: 'Delete', message: `Delete ${what} (${rows.length} line${rows.length > 1 ? 's' : ''})? This can't be undone.`, confirmLabel: 'Delete', tone: 'danger' })) {
        run(() => Promise.all(rows.map((r) => api.practoDelete(kind, r.id))), 'Deleted');
      }
    },
    setCancelled: async (kind, rows, cancelled, what) => {
      if (!cancelled || await confirm({ title: `Cancel ${what}`, message: `Mark this ${what} as cancelled? It stays visible, struck through, and stops counting in totals.`, confirmLabel: 'Cancel it', tone: 'danger' })) {
        run(() => Promise.all(rows.map((r) => api.practoEdit(kind, r.id, { cancelled }))), cancelled ? 'Cancelled' : 'Restored');
      }
    },
  };
}

// [field, label, type] per record kind; type: text | number | date | discount
const FORMS = {
  treatments: [['date', 'Date', 'date'], ['name', 'Treatment', 'text'], ['doctor', 'Doctor', 'text'], ['teeth', 'Teeth', 'text'], ['qty', 'Quantity', 'number'],
    ['cost', 'Cost', 'number'], ['discount', 'Discount', 'number'], ['discount_type', 'Discount type', 'discount'], ['notes', 'Notes', 'text']],
  invoices: [['date', 'Date', 'date'], ['invoice_number', 'Invoice number', 'text'], ['treatment', 'Treatment', 'text'], ['doctor', 'Doctor', 'text'],
    ['unit_cost', 'Unit cost', 'number'], ['qty', 'Quantity', 'number'], ['discount', 'Discount', 'number'], ['discount_type', 'Discount type', 'discount'], ['notes', 'Notes', 'text']],
  payments: [['date', 'Date', 'date'], ['amount', 'Amount paid', 'number'], ['mode', 'Mode of payment', 'mode'], ['invoice_number', 'Invoice number', 'text'],
    ['receipt_number', 'Receipt number', 'text'], ['treatment', 'Towards', 'text'], ['notes', 'Notes', 'text']],
};
const TITLES = { treatments: 'Edit procedure', invoices: 'Edit invoice line', payments: 'Edit payment' };

function EditRow({ editing, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (editing) setF({ discount_type: 'PERCENT', ...editing.row }); }, [editing]);
  if (!editing) return null;
  const fields = FORMS[editing.kind];
  const save = async (e) => {
    e.preventDefault();
    const body = {};
    for (const [k, , type] of fields) {
      const v = f[k] === '' || f[k] == null ? null : f[k];
      body[k] = type === 'number' && v != null ? Number(v).toFixed(2) : v;
    }
    if (editing.kind === 'treatments') {
      // Practo's Amount = cost × qty − discount
      const gross = Number(body.cost || 0) * Number(body.qty || 1);
      const off = body.discount_type === 'NUMBER' ? Number(body.discount || 0) : (gross * Number(body.discount || 0)) / 100;
      body.amount = Math.max(0, gross - off).toFixed(2);
    }
    setBusy(true);
    try {
      await api.practoEdit(editing.kind, editing.row.id, body);
      toast('Saved');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={TITLES[editing.kind]} subtitle="Correcting the imported Practo record" onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {fields.map(([k, label, type]) => (
          <Field key={k} label={label} className={type === 'text' && /notes|treatment|name/.test(k) ? 'sm:col-span-2' : ''}>
            {type === 'discount' ? (
              <select value={f[k] || 'PERCENT'} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputClass}>
                <option value="PERCENT">%</option><option value="NUMBER">INR</option>
              </select>
            ) : type === 'mode' ? (
              <select value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputClass}>
                {['cash', 'card', 'upi', 'cheque', 'bank', 'unknown'].map((m) => <option key={m} value={m}>{modeLabel(m)}</option>)}
              </select>
            ) : (
              <input type={type === 'number' ? 'number' : type} step="any" min={type === 'number' ? 0 : undefined} value={f[k] ?? ''}
                onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputClass} />
            )}
          </Field>
        ))}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
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
