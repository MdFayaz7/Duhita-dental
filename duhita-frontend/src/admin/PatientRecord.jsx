import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiActivity, FiArrowLeft, FiCalendar, FiClipboard, FiCheckCircle, FiCircle, FiCreditCard, FiEdit2, FiFileText, FiImage, FiPhone, FiPlus,
  FiPrinter, FiTrash2, FiXCircle,
} from 'react-icons/fi';
import { api } from './api';
import { Button, EmptyState, ErrorNote, Panel, Segmented, Skeleton, StatusPill, Table, cx, formatSlot, useConfirm, useToast } from './ui';
import { useLiveEvents } from '../lib/useLiveEvents';
import { PaymentModal, inr, longDate, modeLabel } from './billingUi';

const TABS = [{ value: 'timeline', label: 'Timeline' }, { value: 'invoices', label: 'Invoices' }, { value: 'payments', label: 'Payments' }];
const RECORD_KINDS = { prescription: 'Prescription', xray: 'X-ray / scan', report: 'Report', note: 'Note' };

/** Timeline / invoices / payments of one patient. Inside the patient section `section` picks one and the shell draws the header. */
export default function PatientRecord({ section }) {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState(section || 'timeline');
  useEffect(() => { if (section) setTab(section); }, [section]);
  const [billing, setBilling] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [colors, setColors] = useState({});
  const [error, setError] = useState('');
  const [payFor, setPayFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const [b, t] = await Promise.all([api.patientBilling(patientId), api.patientTimeline(patientId)]);
      setBilling(b);
      setTimeline(t.events);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.doctors().then((d) => setColors(Object.fromEntries(d.items.map((x) => [String(x.id), x.color])))).catch(() => {});
  }, []);
  useLiveEvents((e) => {
    if (['billing_updated', 'appointment_updated', 'appointment_created', 'record_updated'].includes(e.type)) load();
  });

  const invoicesById = useMemo(() => Object.fromEntries((billing?.invoices || []).map((i) => [i.id, i])), [billing]);
  const p = billing?.patient;

  const cancelInvoice = async (inv) => {
    const ok = await confirm({
      title: `Cancel invoice ${inv.number}`,
      message: 'The bill number stays used, but the invoice no longer counts towards what the patient owes.',
      confirmLabel: 'Cancel invoice', tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.cancelInvoice(inv.id);
      toast(`Invoice ${inv.number} cancelled`);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const deletePayment = async (pay) => {
    const ok = await confirm({ title: 'Delete payment', message: `Delete the ₹${inr(pay.amount)} payment? The invoice will show it as due again.`, confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      await api.deletePayment(pay.id);
      toast('Payment deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const print = (id) => window.open(`/admin/print/invoice/${id}`, '_blank', 'noopener');

  if (error && !billing) return <ErrorNote>{error}</ErrorNote>;
  if (!billing) return <div className="grid gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <>
      {!section && <>
      {/* Patient header */}
      <Panel className="p-4 sm:p-5 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate(-1)} aria-label="Back" className="w-8 h-8 grid place-items-center rounded text-[#777] hover:bg-black/5"><FiArrowLeft /></button>
        <span className="w-12 h-12 grid place-items-center rounded-full bg-[var(--a-rail)] text-[18px] text-white">{p.name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="text-[20px] font-normal uppercase">{p.name}</h1>
          <p className="text-[13px] text-[#777]">
            ID: {p.patient_id}{p.age != null ? ` · ${p.age}y` : ''}{p.sex ? ` ${p.sex}` : ''}
            {p.phone && <> · <a href={`tel:+91${p.phone}`} className="text-[#1a9ad6] inline-flex items-center gap-1"><FiPhone className="w-3 h-3" />+91 {p.phone}</a></>}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Money label="Billed" value={billing.summary.billed} />
          <Money label="Received" value={billing.summary.received} tone="text-[#137a1e]" />
          <Money label="Due" value={billing.summary.due} tone={Number(billing.summary.due) > 0 ? 'text-[#d93a46]' : 'text-[#333]'} />
          <Button onClick={() => navigate(`/admin/patients/${p.patient_id}/invoices/new`)}><FiPlus /> New invoice</Button>
        </div>
      </Panel>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Segmented options={TABS} value={tab} onChange={setTab} />
        <Link to="/admin/appointments" className="text-[13px] text-[#1a9ad6] hover:underline">Book an appointment in the calendar →</Link>
      </div>
      </>}
      {section && section !== 'timeline' && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <Money label="Billed" value={billing.summary.billed} />
          <Money label="Received" value={billing.summary.received} tone="text-[#137a1e]" />
          <Money label="Due" value={billing.summary.due} tone={Number(billing.summary.due) > 0 ? 'text-[#d93a46]' : 'text-[#333]'} />
          <Button className="ml-auto" onClick={() => navigate(`/admin/patients/${p.patient_id}/invoices/new`)}><FiPlus /> New invoice</Button>
        </div>
      )}

      <div className={section ? '' : 'mt-4'}>
        {tab === 'timeline' && (
          <Timeline events={timeline} colors={colors} invoices={invoicesById}
            onPrint={print} onEdit={(id) => navigate(`/admin/invoices/${id}/edit`)} onPay={setPayFor} />
        )}

        {tab === 'invoices' && (
          <Panel className="overflow-hidden">
            {billing.invoices.length === 0 ? (
              <EmptyState icon={FiFileText} title="No invoices yet." action={<Button onClick={() => navigate(`/admin/patients/${p.patient_id}/invoices/new`)}><FiPlus /> New invoice</Button>} />
            ) : (
              <Table head={['Invoice', 'Date', 'Treatments', 'Amount', 'Paid', 'Due', '']} minWidth={900}>
                {billing.invoices.map((inv) => (
                  <tr key={inv.id} className={cx('hover:bg-[#fafafa]', inv.status === 'cancelled' && 'opacity-55')}>
                    <td className="px-5 py-3">#{inv.number}{inv.status === 'cancelled' && <span className="ml-2 text-[12px] text-[#999]">cancelled</span>}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{longDate(inv.date)}</td>
                    <td className="px-5 py-3 max-w-[260px] truncate uppercase text-[13px] text-[#555]">{inv.items.map((i) => i.name).join(', ')}</td>
                    <td className="px-5 py-3 tabular-nums">₹{inr(inv.total)}</td>
                    <td className="px-5 py-3 tabular-nums text-[#137a1e]">₹{inr(inv.paid)}</td>
                    <td className={cx('px-5 py-3 tabular-nums', Number(inv.due) > 0 && inv.status === 'active' ? 'text-[#d93a46]' : '')}>₹{inr(inv.due)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        {inv.status === 'active' && Number(inv.due) > 0 && <Button size="sm" onClick={() => setPayFor(inv)} className="!bg-[var(--a-done)] !border-[var(--a-done)]">Accept payment</Button>}
                        <Button size="sm" variant="secondary" onClick={() => print(inv.id)}><FiPrinter /></Button>
                        {inv.status === 'active' && <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/invoices/${inv.id}/edit`)}><FiEdit2 /></Button>}
                        {inv.status === 'active' && Number(inv.paid) === 0 && <Button size="sm" variant="danger" onClick={() => cancelInvoice(inv)} title="Cancel invoice"><FiXCircle /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        )}

        {tab === 'payments' && (
          <Panel className="overflow-hidden">
            {billing.payments.length === 0 ? (
              <EmptyState icon={FiCreditCard} title="No payments yet." hint="Use “Accept payment” on an invoice." />
            ) : (
              <Table head={['Date', 'Amount', 'Mode', 'Reference', 'For invoice', '']} minWidth={760}>
                {billing.payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-[#fafafa]">
                    <td className="px-5 py-3 whitespace-nowrap">{longDate(pay.date)}</td>
                    <td className="px-5 py-3 tabular-nums text-[#137a1e]">₹{inr(pay.amount)}</td>
                    <td className="px-5 py-3">{modeLabel(pay.mode)}</td>
                    <td className="px-5 py-3 text-[#777]">{pay.reference || '—'}</td>
                    <td className="px-5 py-3">{invoicesById[pay.invoice_id] ? `#${invoicesById[pay.invoice_id].number}` : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="danger" onClick={() => deletePayment(pay)} aria-label="Delete payment"><FiTrash2 /></Button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        )}
      </div>

      <PaymentModal invoice={payFor} onClose={() => setPayFor(null)} onSaved={() => { setPayFor(null); load(); }} />
    </>
  );
}

function Money({ label, value, tone = 'text-[#333]' }) {
  return (
    <div className="px-3 text-right">
      <p className="text-[11px] uppercase text-[#888]">{label}</p>
      <p className={cx('text-[16px] tabular-nums', tone)}>₹{inr(value)}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- timeline (Practo's patient history) */

function Timeline({ events, colors, invoices, onPrint, onEdit, onPay }) {
  if (!events) return <Skeleton className="h-40" />;
  if (!events.length) return <Panel><EmptyState icon={FiCalendar} title="Nothing on this patient’s record yet." hint="Appointments, treatments, invoices and payments will appear here." /></Panel>;

  const days = [];
  events.forEach((e) => {
    if (days[days.length - 1]?.date !== e.date) days.push({ date: e.date, events: [] });
    days[days.length - 1].events.push(e);
  });

  return (
    <div className="relative pl-6 sm:pl-8">
      <span className="absolute left-[9px] sm:left-[13px] top-2 bottom-2 w-[3px] rounded bg-[#bcd9de]" aria-hidden="true" />
      {days.map((day) => {
        const d = new Date(`${day.date}T00:00:00`);
        return (
          <section key={day.date} className="mb-6">
            <h3 className="flex items-end gap-2 mb-2 -ml-1">
              <span className="text-[26px] leading-none font-light text-[#2f8fa3] tabular-nums">{String(d.getDate()).padStart(2, '0')}</span>
              <span className="leading-tight">
                <span className="block text-[12px] text-[#666]">{d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                <span className="block text-[12px] font-medium text-[#444]">{d.toLocaleDateString('en-IN', { weekday: 'long' })}</span>
              </span>
            </h3>
            <div className="grid gap-2.5">
              {day.events.map((e) => (
                <EventCard key={`${e.type}-${e.id}`} e={e} color={colors[String(e.doctor_id)]} invoice={invoices[e.id]}
                  onPrint={onPrint} onEdit={onEdit} onPay={onPay} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Doctor({ name, color }) {
  if (!name) return null;
  return <p className="flex items-center gap-2 text-[13.5px] text-[#555]"><span className="w-[3px] h-3.5" style={{ background: color || '#e0662b' }} />{name}</p>;
}

function EventCard({ e, color, invoice, onPrint, onEdit, onPay }) {
  const card = (icon, title, body, actions) => (
    <article className="relative rounded-[3px] border border-[#dcdcdc] bg-white px-4 py-3 shadow-[0_1px_1px_rgba(0,0,0,0.03)]">
      <span className="absolute -left-[21px] sm:-left-[25px] top-4 w-[9px] h-[9px] rounded-full bg-[#2f8fa3] ring-2 ring-white" aria-hidden="true" />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[16px] text-[#444]">{icon}{title}</p>
          <div className="mt-1 grid gap-0.5 text-[13.5px] text-[#555]">{body}</div>
        </div>
        {actions && <div className="flex flex-wrap justify-end gap-1.5">{actions}</div>}
      </div>
    </article>
  );

  switch (e.type) {
    case 'invoice':
      return card(<FiFileText className="text-[#777]" />, <>Invoice {e.status === 'cancelled' && <span className="text-[12px] text-[#999]">(cancelled)</span>}</>, <>
        <p className="uppercase">{e.items.join(', ')}</p>
        <p className="mt-1 font-medium text-[#333]">{e.number}</p>
        <p className="font-medium text-[#333]">Invoice Amount : INR {inr(e.total)}</p>
        <p className="font-medium text-[#333]">Paid Amount : {Number(e.paid) ? `INR ${inr(e.paid)}` : ''}</p>
        <p className="font-medium text-[#333]">Due Amount : INR {inr(e.due)}</p>
      </>, <>
        {e.status === 'active' && Number(e.due) > 0 && invoice && (
          <Button size="sm" onClick={() => onPay(invoice)} className="!bg-[var(--a-done)] !border-[var(--a-done)]">Accept payment</Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => onPrint(e.id)} title="Print"><FiPrinter /></Button>
        {e.status === 'active' && <Button size="sm" variant="secondary" onClick={() => onEdit(e.id)} title="Edit"><FiEdit2 /></Button>}
      </>);
    case 'payment':
      return card(<FiCreditCard className="text-[#777]" />, 'Payment', <>
        <p className="font-medium text-[#333]">Amount Paid : {inr(e.amount)}</p>
        <p>via {modeLabel(e.mode)}{e.reference ? ` · ${e.reference}` : ''}{e.invoice_number ? ` · invoice ${e.invoice_number}` : ''}</p>
      </>);
    case 'procedure':
      return card(<FiCheckCircle className="text-[#777]" />, 'Procedure Performed', <>
        <Doctor name={e.doctor} color={color} />
        <p className="uppercase">{e.name}{e.teeth?.length ? <span className="normal-case text-[#777]"> · Teeth: {e.teeth.join(', ')}</span> : ''}</p>
        {e.notes && <p className="text-[#777]">{e.notes}</p>}
      </>);
    case 'plan':
      return card(<FiCircle className="text-[#777]" />, 'Treatment Planned', <>
        <Doctor name={e.doctor} color={color} />
        <p className="uppercase">{e.name}{e.teeth?.length ? <span className="normal-case text-[#777]"> · Teeth: {e.teeth.join(', ')}</span> : ''} · ₹{inr(e.total)}</p>
      </>);
    case 'vitals':
      return card(<FiActivity className="text-[#777]" />, 'Vital Signs', <>
        <p>{[e.pulse && `Pulse ${e.pulse}/min`, e.temperature && `Temp ${Number(e.temperature)}°F`, e.bp_systolic && `BP ${e.bp_systolic}/${e.bp_diastolic ?? '–'}`,
          e.weight && `Weight ${Number(e.weight)} kg`, e.resp_rate && `Resp. ${e.resp_rate}/min`].filter(Boolean).join(' · ')}</p>
      </>);
    case 'note':
      return card(<FiClipboard className="text-[#777]" />, 'Clinical Notes', <>
        <Doctor name={e.doctor} color={color} />
        {[['complaints', 'Complaints'], ['observations', 'Observations'], ['investigations', 'Investigations'], ['diagnoses', 'Diagnoses'], ['notes', 'Notes']]
          .filter(([k]) => e[k]?.length).map(([k, l]) => <p key={k}><span className="text-[#888]">{l}:</span> {e[k].join(', ')}</p>)}
      </>);
    case 'prescription':
      return card(<FiFileText className="text-[#777]" />, 'Prescription', <>
        <Doctor name={e.doctor} color={color} />
        {e.items.map((i, n) => <p key={n}><span className="uppercase">{i.drug}</span> <span className="text-[#777]">{[i.frequency, i.days && `${i.days} days`].filter(Boolean).join(' · ')}</span></p>)}
      </>);
    case 'appointment':
      return card(<FiCalendar className="text-[#777]" />, <>Appointment <StatusPill status={e.status} /></>, <>
        <Doctor name={e.doctor} color={color} />
        <p>{formatSlot(e.slot)}{e.procedures ? ` · ${e.procedures}` : ''}</p>
      </>);
    case 'record':
      return card(e.file_type === 'image' ? <FiImage className="text-[#777]" /> : <FiCircle className="text-[#777]" />, RECORD_KINDS[e.kind] || 'Record', <>
        <p>{e.title}</p>
        {e.file && <a href={api.url(e.file)} target="_blank" rel="noreferrer" className="text-[#1a9ad6] hover:underline">Open file</a>}
      </>);
    default:
      return null;
  }
}
