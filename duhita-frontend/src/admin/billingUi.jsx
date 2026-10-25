import { useEffect, useState } from 'react';
import { api } from './api';
import { Button, ErrorNote, Field, Modal, inputClass, todayIso, useToast } from './ui';

export const PAYMENT_MODES = [
  { id: 'cash', label: 'Cash' }, { id: 'upi', label: 'UPI' }, { id: 'card', label: 'Card' },
  { id: 'cheque', label: 'Cheque' }, { id: 'bank', label: 'Bank transfer' }, { id: 'other', label: 'Other' },
];
export const modeLabel = (id) => PAYMENT_MODES.find((m) => m.id === id)?.label || id;

/** 23000 -> "23,000.00" (Indian grouping). */
export const inr = (value) =>
  Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Live preview of one line — the same formula the server uses (backend/app/billing.py), which has the final say. */
export function lineAmounts(line) {
  const gross = round2((Number(line.unit_cost) || 0) * (Number(line.qty) || 0));
  const value = Number(line.discount_value) || 0;
  const discount = Math.min(gross, round2(line.discount_type === 'pct' ? (gross * value) / 100 : value));
  const tax = round2(((gross - discount) * (Number(line.tax_pct) || 0)) / 100);
  return { gross, discount, tax, total: round2(gross - discount + tax) };
}

export function invoiceTotals(lines) {
  return lines.reduce((t, line) => {
    const a = lineAmounts(line);
    return { subtotal: t.subtotal + a.gross, discount: t.discount + a.discount, tax: t.tax + a.tax, total: t.total + a.total };
  }, { subtotal: 0, discount: 0, tax: 0, total: 0 });
}

export const longDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Record a payment against an invoice; the amount defaults to what is still due. */
export function PaymentModal({ invoice, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (invoice) {
      setForm({ amount: String(Number(invoice.due || 0)), mode: 'cash', date: todayIso(), reference: '' });
      setError('');
    }
  }, [invoice]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) return setError('Enter an amount above zero.');
    setBusy(true);
    try {
      const saved = await api.addPayment(invoice.id, {
        amount: amount.toFixed(2), mode: form.mode, date: form.date || null, reference: form.reference.trim() || null,
      });
      toast(`₹${inr(amount)} received`);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!invoice} title="Accept payment" subtitle={invoice ? `Invoice ${invoice.number} · due ₹${inr(invoice.due)}` : ''} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (INR)"><input type="number" min="0.01" step="0.01" value={form.amount || ''} onChange={set('amount')} className={inputClass} autoFocus /></Field>
          <Field label="Date"><input type="date" value={form.date || ''} onChange={set('date')} className={inputClass} /></Field>
        </div>
        <Field label="Paid by">
          <div className="flex flex-wrap gap-2">
            {PAYMENT_MODES.map((m) => (
              <button key={m.id} type="button" onClick={() => setForm((f) => ({ ...f, mode: m.id }))}
                className={`px-3 h-[34px] rounded-[3px] border text-[13px] ${form.mode === m.id ? 'border-[var(--a-done)] bg-[#e9f7ea] text-[#137a1e]' : 'border-[#c8c8c8] text-[#555] hover:bg-[#f5f5f5]'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </Field>
        {form.mode !== 'cash' && (
          <Field label="Reference" hint="UTR / transaction ID / cheque number">
            <input value={form.reference || ''} onChange={set('reference')} className={inputClass} />
          </Field>
        )}
        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={busy} className="flex-1 !bg-[var(--a-done)] !border-[var(--a-done)] hover:!bg-[#158a22]">
            {busy ? 'Saving…' : 'Accept payment'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
