import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  FiCheckCircle, FiClock, FiCreditCard, FiDollarSign, FiFileText, FiList, FiPrinter, FiUser, FiUsers,
} from 'react-icons/fi';
import { api } from '../api';
import { Button, EmptyState, ErrorNote, Field, Modal, Skeleton, Table, cx, useToast } from '../ui';
import { inr, longDate, modeLabel } from '../billingUi';
import { SectionBar, escapeHtml as esc, printHtml } from './shared';

const NAV = [
  ['Patient', [['profile', 'Profile', FiUser]]],
  ['EMR', [['treatments', 'Completed Procedures', FiCheckCircle], ['timeline', 'Timeline', FiClock]]],
  ['Billing', [['invoices', 'Invoices', FiDollarSign], ['payments', 'Payments', FiCreditCard], ['ledger', 'Ledger', FiList]]],
];
const td = 'px-4 py-2.5';
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
  useEffect(() => { setD(null); api.practoPatient(number).then(setD).catch((e) => setError(e.message)); }, [number]);
  const invoiceBills = useMemo(() => (d ? bills(d.invoices) : []), [d]);

  if (error) return <div className="p-4"><ErrorNote>{error}</ErrorNote></div>;
  if (!d) return <Skeleton className="m-4 h-60" />;
  const p = d.patient;
  const who = `<p><b>${esc(p.name.toUpperCase())}</b> · ${esc([p.gender, p.age != null && `${p.age} yrs`].filter(Boolean).join(', '))}${p.mobile ? ` · +91 ${esc(p.mobile)}` : ''}<br><span class="muted">Practo patient no. ${esc(p.number)}</span></p>`;
  const ctx = { d, p, who, invoiceBills };

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

function Procedures({ d, p, who }) {
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
                <th className="px-2 text-right">Total</th><th className="px-2 text-left">Notes</th>
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

function Invoices({ d, who, invoiceBills }) {
  const paidFor = (b) => (b.number ? d.payments.filter((x) => !x.cancelled && x.invoice_number === b.number).reduce((s, x) => s + Number(x.amount || 0), 0) : 0);
  const th = 'px-2 py-2 text-[10.5px] font-semibold uppercase text-[#333]';
  return (
    <>
      <SectionBar title="Invoices" />
      {!invoiceBills.length ? <EmptyState title="No invoices in the Practo export." /> : <ByDate items={[...invoiceBills].sort((a, b) => (a.date < b.date ? 1 : -1))} render={(b) => {
        const paid = paidFor(b);
        return (
          <>
            <div className={cx('overflow-x-auto', b.cancelled && 'opacity-60')}>
              <table className="w-full min-w-[900px] text-[13px]">
                <thead><tr className="border-b border-[#e3e3e3]">
                  <th className={cx(th, 'w-[22%] text-left')}>Invoice Number</th><th className={cx(th, 'text-left')}>Treatments &amp; Products</th>
                  <th className={cx(th, 'text-right')}>Cost</th><th className={cx(th, 'text-right')}>Discount</th><th className={cx(th, 'text-right')}>Tax</th>
                  <th className={cx(th, 'text-right')}>Total</th>
                  <th className="w-[44px] text-right pr-2"><button onClick={() => printInvoice(b, d, who)} title="Print / PDF" className="rounded border border-[#ccc] p-1.5 text-[#444] hover:bg-[#f5f5f5]"><FiPrinter /></button></th>
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
                      <td />
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

function Payments({ d, who }) {
  const receipt = (x) => printHtml(`Receipt · ${d.patient.name}`, `${who}<h3>Payment Receipt</h3>
    <table><tr><th>Date</th><th>Mode</th><th>Invoice</th><th>For</th><th style="text-align:right">Amount INR</th></tr>
    <tr><td>${day(x.date)}</td><td>${esc(modeLabel(x.mode || ''))}</td><td>${esc(x.invoice_number || '—')}</td><td>${esc(x.treatment || '')}</td><td style="text-align:right"><b>${inr(x.amount ?? 0)}</b></td></tr></table>
    <p style="margin-top:40px;text-align:right">Received with thanks</p>`);
  return (
    <>
      <SectionBar title="Payments" />
      {!d.payments.length ? <EmptyState title="No payments in the Practo export." /> : <ByDate items={d.payments.map((x) => ({ ...x, key: x.id }))} render={(x) => (
        <div className={cx('flex flex-wrap items-center gap-x-6 gap-y-1 border-l-4 border-[#3cae4c] px-3 py-2.5 text-[13px]', x.cancelled && 'opacity-50 line-through')}>
          <span className="w-[110px] text-[15px] tabular-nums text-[#137a1e]">₹{inr(x.amount ?? 0)}</span>
          <span>{modeLabel(x.mode || '')}</span>
          <span className="text-[#555]">{x.invoice_number ? `Invoice #${x.invoice_number}` : 'No invoice'}</span>
          {x.treatment && <span className="uppercase text-[#1a9ad6]">{x.treatment}</span>}
          {x.notes && <span className="text-[#777]">{x.notes}</span>}
          <button onClick={() => receipt(x)} title="Print receipt" className="ml-auto rounded border border-[#ccc] p-1.5 text-[#444] hover:bg-[#f5f5f5]"><FiPrinter /></button>
        </div>
      )} />}
    </>
  );
}

function ledgerRows(d, invoiceBills) {
  const rows = [
    ...invoiceBills.filter((b) => !b.cancelled).map((b) => ({ date: b.date, text: `${b.number ? `Invoice #${b.number}` : 'Invoice'} · ${b.lines.map((l) => l.treatment).join(', ')}`, debit: b.total, credit: 0 })),
    ...d.payments.filter((x) => !x.cancelled).map((x) => ({ date: x.date, text: `Payment · ${modeLabel(x.mode || '')}${x.invoice_number ? ` · invoice #${x.invoice_number}` : ''}`, debit: 0, credit: Number(x.amount || 0) })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.credit - b.credit));
  let bal = 0;
  return rows.map((r) => ({ ...r, balance: (bal += r.debit - r.credit) }));
}

function Ledger({ d, p, who, invoiceBills }) {
  const rows = useMemo(() => ledgerRows(d, invoiceBills), [d, invoiceBills]);
  const print = () => printHtml(`Ledger · ${p.name}`, `${who}<h3>Ledger</h3><table><tr><th>Date</th><th>Particulars</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr>
    ${rows.map((r) => `<tr><td>${day(r.date)}</td><td>${esc(r.text)}</td><td style="text-align:right">${r.debit ? inr(r.debit) : ''}</td><td style="text-align:right">${r.credit ? inr(r.credit) : ''}</td><td style="text-align:right">${inr(r.balance)}</td></tr>`).join('')}</table>`);
  return (
    <>
      <SectionBar title="Ledger">{rows.length > 0 && <PrintBtn onClick={print} />}</SectionBar>
      <div className="bg-white">
        {!rows.length ? <EmptyState title="No bills or payments in the Practo export." /> : (
          <Table head={['Date', 'Particulars', 'Debit (INR)', 'Credit (INR)', 'Balance (INR)']} minWidth={760}>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className={cx(td, 'whitespace-nowrap')}>{day(r.date)}</td><td className={cx(td, 'uppercase text-[13px]')}>{r.text}</td>
                <td className={cx(td, 'tabular-nums')}>{r.debit ? inr(r.debit) : ''}</td><td className={cx(td, 'tabular-nums text-[#137a1e]')}>{r.credit ? inr(r.credit) : ''}</td>
                <td className={cx(td, 'tabular-nums font-medium', r.balance > 0 && 'text-[#d93a46]')}>{inr(r.balance)}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}

function Timeline({ d, invoiceBills }) {
  const days = useMemo(() => {
    const ev = [
      ...d.treatments.map((t) => ({ date: t.date, icon: FiCheckCircle, title: 'Procedure Performed', body: `${t.name}${t.teeth ? ` · Teeth ${t.teeth}` : ''}`, by: t.doctor })),
      ...invoiceBills.map((b) => ({ date: b.date, icon: FiFileText, title: `Invoice${b.number ? ` #${b.number}` : ''}${b.cancelled ? ' (cancelled)' : ''}`, body: `${b.lines.map((l) => l.treatment).join(', ')} · ₹${inr(b.total)}`, by: b.doctor })),
      ...d.payments.map((x) => ({ date: x.date, icon: FiCreditCard, title: 'Payment', body: `₹${inr(x.amount ?? 0)} via ${modeLabel(x.mode || '')}${x.cancelled ? ' (cancelled)' : ''}` })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
    const out = [];
    for (const e of ev) {
      if (out.at(-1)?.date !== e.date) out.push({ date: e.date, events: [] });
      out.at(-1).events.push(e);
    }
    return out;
  }, [d, invoiceBills]);
  return (
    <>
      <SectionBar title="Timeline" />
      {!days.length ? <EmptyState title="Nothing in the Practo export for this patient." /> : (
        <div className="relative py-2 pl-8 pr-2">
          <span className="absolute left-[13px] top-2 bottom-2 w-[3px] rounded bg-[#bcd9de]" aria-hidden="true" />
          {days.map((g) => (
            <section key={g.date} className="mb-4">
              <p className="mb-1.5 text-[13px] font-medium text-[#2f8fa3]">{day(g.date)}</p>
              <div className="grid gap-2">
                {g.events.map((e, i) => (
                  <article key={i} className="rounded-[3px] border border-[#dcdcdc] bg-white px-4 py-2.5 text-[13.5px]">
                    <p className="flex items-center gap-2 text-[15px] text-[#444]"><e.icon className="text-[#777]" />{e.title}</p>
                    <p className="uppercase text-[#555]">{e.body}</p>
                    {e.by && <p className="text-[12.5px] text-[#777]">{e.by}</p>}
                  </article>
                ))}
              </div>
            </section>
          ))}
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
