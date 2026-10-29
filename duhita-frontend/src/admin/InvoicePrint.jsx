import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getToken } from './api';
import { site } from '../data/site';
import { inr, longDate } from './billingUi';
import useSeo from '../hooks/useSeo';
import { headerOf, setLetterhead } from './patient/shared';

/** A4 invoice in the layout of Practo's printout. Opens the print dialog once loaded (Save as PDF from there). */
export default function InvoicePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState(null);
  const [doctors, setDoctors] = useState({});
  const [error, setError] = useState('');
  useSeo(inv ? `Invoice ${inv.number} · ${inv.patient.name}` : 'Invoice', undefined, { noindex: true });

  useEffect(() => {
    if (!getToken()) { navigate('/admin/login', { replace: true }); return; }
    Promise.all([api.invoice(id), api.doctors(), api.printout().catch(() => null)])
      .then(([invoice, docs, printout]) => {
        setLetterhead(printout);
        setInv(invoice);
        setDoctors(Object.fromEntries(docs.items.map((d) => [String(d.id), d.name])));
      })
      .catch((e) => setError(e.message));
  }, [id, navigate]);

  useEffect(() => {
    if (!inv) return undefined;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [inv]);

  if (error) return <p style={{ padding: 40, fontFamily: 'Arial' }}>{error}</p>;
  if (!inv) return <p style={{ padding: 40, fontFamily: 'Arial', color: '#777' }}>Preparing invoice…</p>;

  const p = inv.patient;
  const h = headerOf();
  const by = doctors[String(inv.doctor_id)];
  const hasDiscount = Number(inv.discount) > 0;
  const hasTax = Number(inv.tax) > 0;

  return (
    <div className="invoice-page">
      <style>{`
        @page { size: A4; margin: 14mm 12mm; }
        body { background: #f2f2f2; }
        .invoice-page { font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; font-size: 12.5px; }
        .sheet { width: 186mm; min-height: 265mm; margin: 24px auto; background: #fff; padding: 12mm 12mm 10mm; box-shadow: 0 2px 12px rgba(0,0,0,.12); display: flex; flex-direction: column; }
        .toolbar { position: sticky; top: 0; display: flex; gap: 8px; justify-content: center; padding: 10px; background: #3c4bb5; }
        .toolbar button { font: inherit; padding: 7px 16px; border-radius: 3px; border: 1px solid #fff; background: #fff; color: #333; cursor: pointer; }
        .toolbar button.primary { background: #f39a2b; border-color: #f39a2b; color: #fff; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-weight: 600; padding: 7px 6px; border-bottom: 1px solid #999; font-size: 12px; }
        td { padding: 7px 6px 2px; vertical-align: top; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .sub td { padding-top: 0; padding-bottom: 8px; color: #555; font-size: 11.5px; border-bottom: 1px solid #e3e3e3; }
        .totals td { padding: 3px 6px; }
        @media print {
          body { background: #fff; }
          .toolbar { display: none; }
          .sheet { margin: 0; padding: 0; width: auto; min-height: calc(297mm - 28mm); box-shadow: none; }
        }
      `}</style>

      <div className="toolbar">
        <button className="primary" onClick={() => window.print()}>Print / Save as PDF</button>
        <button onClick={() => window.close()}>Close</button>
      </div>

      <div className="sheet">
        <header style={{ textAlign: 'center', borderBottom: '2px solid #222', paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            {h.logo && <img src="/images/brand/duhita-logo-sm.png" alt="" style={{ height: 46 }} />}
            <h1 style={{ margin: 0, fontSize: 19, letterSpacing: '.04em', fontWeight: 700 }}>{h.name.toUpperCase()}</h1>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 8, textAlign: 'left', fontSize: 11.5, color: '#444' }}>
            <div style={{ maxWidth: 360 }}>{h.address}{h.registration && <div>{h.registration}</div>}</div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              {h.phone && <div>Phone: {h.phone}</div>}
              {h.email && <div>Email: {h.email}</div>}
              <div>Website: {h.website}</div>
            </div>
          </div>
        </header>

        <section style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name.toUpperCase()}</div>
            <div style={{ color: '#555', marginTop: 2 }}>Patient ID: {p.patient_id}{p.phone ? ` · +91 ${p.phone}` : ''}</div>
            {p.address && <div style={{ color: '#555' }}>{p.address}</div>}
          </div>
          <div style={{ textAlign: 'right', color: '#444' }}>{[p.sex, p.age != null ? `${p.age} yrs` : null].filter(Boolean).join(', ')}</div>
        </section>

        {by && <div style={{ marginTop: 12 }}>By: <b>{by}</b></div>}

        <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '14px 0 6px' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Invoice{inv.status === 'cancelled' ? ' (CANCELLED)' : ''}</div>
          <div style={{ textAlign: 'right' }}>
            <div>Date: {longDate(inv.date)}</div>
            <div>Invoice Number: <b>{inv.number}</b></div>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Treatments &amp; Products</th>
              <th className="num">Unit Cost INR</th>
              <th className="num" style={{ width: 48 }}>Qty</th>
              {hasDiscount && <th className="num">Discount INR</th>}
              {hasTax && <th className="num">Tax %</th>}
              <th className="num">Total Cost INR</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => {
              const gross = Number(it.unit_cost) * it.qty;
              const discount = it.discount_type === 'pct' ? (gross * Number(it.discount_value)) / 100 : Number(it.discount_value);
              return [
                <tr key={`${it.id}-a`}>
                  <td>{i + 1}.</td>
                  <td style={{ fontWeight: 600 }}>{it.name.toUpperCase()}</td>
                  <td className="num">{inr(it.unit_cost)}</td>
                  <td className="num">{it.qty}</td>
                  {hasDiscount && <td className="num">{discount ? inr(discount) : '—'}</td>}
                  {hasTax && <td className="num">{Number(it.tax_pct) ? Number(it.tax_pct) : '—'}</td>}
                  <td className="num">{inr(it.total)}</td>
                </tr>,
                <tr key={`${it.id}-b`} className="sub">
                  <td />
                  <td colSpan={4 + (hasDiscount ? 1 : 0) + (hasTax ? 1 : 0)}>
                    Date&nbsp;&nbsp;{longDate(it.date)}
                    {it.teeth?.length ? <><br />Teeth: {it.teeth.join(', ')}</> : null}
                    {doctors[String(it.doctor_id)] && it.doctor_id !== inv.doctor_id ? <><br />By {doctors[String(it.doctor_id)]}</> : null}
                    {it.notes ? <><br />{it.notes}</> : null}
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </table>

        <table className="totals" style={{ width: 300, marginLeft: 'auto', marginTop: 14 }}>
          <tbody>
            <tr><td className="num">Total Cost:</td><td className="num">{inr(inv.subtotal)} INR</td></tr>
            {hasDiscount && <tr><td className="num">Total Discount:</td><td className="num">− {inr(inv.discount)} INR</td></tr>}
            {hasTax && <tr><td className="num">Total Tax:</td><td className="num">{inr(inv.tax)} INR</td></tr>}
            <tr><td className="num" style={{ fontWeight: 700 }}>Grand Total:</td><td className="num" style={{ fontWeight: 700 }}>{inr(inv.total)} INR</td></tr>
            <tr><td className="num">Amount Received:</td><td className="num">{inr(inv.paid)} INR</td></tr>
            <tr><td className="num" style={{ fontWeight: 700 }}>Balance Amount:</td><td className="num" style={{ fontWeight: 700 }}>{inr(inv.due)} INR</td></tr>
          </tbody>
        </table>

        {inv.payments?.length > 0 && (
          <div style={{ marginTop: 14, fontSize: 11.5, color: '#444' }}>
            Payments: {inv.payments.map((pay) => `${inr(pay.amount)} on ${longDate(pay.date)} (${pay.mode.toUpperCase()})`).join(' · ')}
          </div>
        )}
        {inv.notes && <div style={{ marginTop: 10, fontSize: 11.5, color: '#444' }}>Notes: {inv.notes}</div>}

        <footer style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666' }}>
          <span>Generated On: {longDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))}</span>
          <span>{h.footer || `Thank you for choosing ${site.name}`}</span>
        </footer>
      </div>
    </div>
  );
}
