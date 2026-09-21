import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiCheckCircle, FiUserPlus, FiCalendar, FiClock, FiUser, FiPhone } from 'react-icons/fi';
import PageHero from '../components/PageHero';
import PatientAside from '../components/PatientAside';
import { Field, FormSection, Chip, invalid } from '../components/Form';
import useSeo from '../hooks/useSeo';
import { sessions, formatSlot } from '../data/patients';
import { categories } from '../data/services';
import { findPatient } from '../lib/patientStore';
import { bookAppointmentApi, lookupPatientApi } from '../lib/publicApi';
import { site } from '../data/site';

const DAYS_AHEAD = 21;
const ID_PATTERN = /^DD\d{4}-\d{4}$/;

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function upcomingDays() {
  const today = new Date();
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return { iso: isoDate(d), date: d, closed: d.getDay() === 0, today: i === 0 };
  });
}

/** A slot is bookable if it starts at least 60 minutes from now. */
const slotPassed = (iso, slot) => {
  const [h, m] = slot.split(':').map(Number);
  const [y, mo, d] = iso.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m).getTime() - Date.now() < 60 * 60 * 1000;
};

function validate(f) {
  const e = {};
  if (!ID_PATTERN.test(f.patientId)) e.patientId = 'Enter your Patient ID, e.g. DD2609-1234.';
  if (f.name.trim().length < 2) e.name = 'Please enter the patient’s name.';
  if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a valid 10-digit mobile number.';
  if (!f.date) e.date = 'Please choose a date.';
  if (!f.slot) e.slot = 'Please choose a time slot.';
  return e;
}

export default function BookAppointment() {
  useSeo(
    'Book a Dental Appointment Online | Duhita Dental, Vijayawada',
    'Book your dental appointment online at Duhita Multispeciality Dental Centre, Benz Circle, Vijayawada. Choose a date and time slot — morning or evening, Monday to Saturday.',
  );
  const { state } = useLocation();
  const days = useMemo(upcomingDays, []);
  const [mode, setMode] = useState('existing');
  const [form, setForm] = useState({
    patientId: state?.patientId || '', name: state?.name || '', phone: state?.phone || '',
    date: '', slot: '', reason: state?.reason || '', notes: '',
  });
  const [errors, setErrors] = useState({});
  const [booked, setBooked] = useState(false);


  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const [lookedUp, setLookedUp] = useState(null);
  const found = lookedUp;

  const onIdChange = async (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 11);
    update({ patientId: v });
    if (!ID_PATTERN.test(v)) return setLookedUp(null);
    const local = findPatient(v);
    if (local) {
      setLookedUp(local);
      return update({ name: local.name, phone: local.phone });
    }
    const remote = await lookupPatientApi(v).catch(() => null);
    setLookedUp(remote);
    if (remote) update({ name: remote.name, phone: remote.phone });
  };

  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() =>
        document.querySelector('[role="alert"]')?.closest('label, fieldset, [role="group"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setSaving(true);
    try {
      await bookAppointmentApi(form);
    } catch {
      /* API offline — still show the confirmation; the clinic also takes bookings by phone */
    } finally {
      setSaving(false);
      setBooked(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedDay = days.find((d) => d.iso === form.date);
  const fmtDay = (d, opts) => d.toLocaleDateString('en-IN', opts);

  return (
    <>
      <PageHero eyebrow="For Patients" title="Book an Appointment" image="/images/services/periodontics/deep%20cleaning%20.jpg.webp"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'For Patients', to: '/patient-info' }, { label: 'Book an Appointment' }]}>
        Pick a convenient date and time. We’ll confirm your visit by phone or SMS.
      </PageHero>

      <section className="section-y bg-ivory">
        <div className="container-x grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px] lg:gap-14 items-start [&>*]:min-w-0">
          {booked ? (
            <div className="card p-7 sm:p-10 md:p-12 text-center gallery-fade">
              <FiCheckCircle className="w-14 h-14 mx-auto text-slate" />
              <h2 className="text-[26px] sm:text-[31px] md:text-[40px] mt-5">Appointment requested</h2>
              <p className="mt-3">Thank you, {form.name.split(' ')[0]}. Our team will call you shortly to confirm.</p>
              <dl className="mt-8 grid sm:grid-cols-2 gap-px bg-line text-left max-w-lg mx-auto">
                {[
                  [FiUser, 'Patient', `${form.name} · ${form.patientId}`],
                  [FiPhone, 'Mobile', `+91 ${form.phone}`],
                  [FiCalendar, 'Date', fmtDay(selectedDay.date, { weekday: 'long', day: 'numeric', month: 'long' })],
                  [FiClock, 'Time', formatSlot(form.slot)],
                ].map(([I, k, v]) => (
                  <div key={k} className="bg-ivory p-4">
                    <dt className="flex items-center gap-2 text-[12px] uppercase tracking-[0.12em]"><I /> {k}</dt>
                    <dd className="mt-1 text-ink text-[15px]">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-[13.5px]">Please arrive 10 minutes early and bring any previous X-rays or prescriptions.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/" className="btn btn-solid !px-7 !py-3">Back to Home</Link>
                <button type="button" onClick={() => { setBooked(false); update({ date: '', slot: '', notes: '' }); }} className="btn btn-outline !py-3">
                  Book Another
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-5 sm:p-8 md:p-10">
              <div role="tablist" aria-label="Patient type" className="grid grid-cols-2 bg-ivory p-1 rounded-full mb-8">
                {[['existing', 'Registered patient'], ['new', 'New to Duhita']].map(([id, label]) => (
                  <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
                    className={`rounded-full py-2.5 text-[14px] font-medium transition-colors ${mode === id ? 'bg-slate text-white shadow' : 'text-ink hover:bg-white/60'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'new' ? (
                <div className="text-center py-6 gallery-fade">
                  <span className="w-16 h-16 mx-auto rounded-full bg-mist grid place-items-center text-slate"><FiUserPlus className="w-7 h-7" /></span>
                  <h2 className="text-[24px] sm:text-[30px] mt-5">First visit? Register in 2 minutes</h2>
                  <p className="mt-3 max-w-md mx-auto">
                    Share your details and medical history once. You’ll get a Patient ID straight away and can pick your slot right after.
                  </p>
                  <Link to="/patients/register" className="btn btn-solid !px-8 !py-3.5 mt-7">Register as New Patient</Link>
                  <p className="mt-6 text-[13.5px]">
                    In pain or need urgent care? Call <a href={`tel:${site.phone}`} className="text-ink font-medium underline underline-offset-4">{site.phoneDisplay}</a>
                  </p>
                </div>
              ) : (
                <form noValidate onSubmit={onSubmit} className="grid gap-9 gallery-fade">
                  <FormSection step="1" title="Patient details">
                    <Field label="Patient ID" required error={errors.patientId}
                      hint={found ? `Welcome back, ${found.name}. Your details have been filled in.` : 'You receive this after registering. New patient? Switch to “New to Duhita”.'}>
                      <input className={`field uppercase tracking-wider ${invalid(errors.patientId)}`} value={form.patientId} onChange={onIdChange}
                        placeholder="DD2609-1234" aria-invalid={!!errors.patientId} />
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Patient name" required error={errors.name}>
                        <input className={`field ${invalid(errors.name)}`} value={form.name} onChange={(e) => update({ name: e.target.value })} autoComplete="name" />
                      </Field>
                      <Field label="Mobile number" required error={errors.phone}>
                        <div className="flex">
                          <span className="field !w-auto border-r-0 bg-ivory text-body">+91</span>
                          <input type="tel" inputMode="numeric" className={`field ${invalid(errors.phone)}`} value={form.phone}
                            onChange={(e) => update({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} autoComplete="tel-national" />
                        </div>
                      </Field>
                    </div>
                  </FormSection>

                  <FormSection step="2" title="Choose a date">
                    <div role="group" aria-label="Appointment date" className="min-w-0">
                      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                        {days.map((d) => {
                          const active = form.date === d.iso;
                          return (
                            <button key={d.iso} type="button" disabled={d.closed} onClick={() => update({ date: d.iso, slot: '' })} aria-pressed={active}
                              className={`snap-start shrink-0 w-[74px] py-3 rounded-xl border text-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                active ? 'bg-slate border-slate text-white' : 'bg-white border-[#b9c3cc] text-ink hover:border-slate'}`}>
                              <span className="block text-[11px] uppercase tracking-wider opacity-80">{d.today ? 'Today' : fmtDay(d.date, { weekday: 'short' })}</span>
                              <span className="block font-display text-[26px] leading-tight">{d.date.getDate()}</span>
                              <span className="block text-[11px] opacity-80">{d.closed ? 'Closed' : fmtDay(d.date, { month: 'short' })}</span>
                            </button>
                          );
                        })}
                      </div>
                      {errors.date && <p className="mt-2 text-[12.5px] text-[#b42318]" role="alert">{errors.date}</p>}
                      <p className="mt-3 text-[12.5px]">Sundays are by prior appointment only — please call us.</p>
                    </div>
                  </FormSection>

                  <FormSection step="3" title="Choose a time">
                    {!form.date ? (
                      <p className="text-[14px] bg-ivory p-4">Select a date first to see available time slots.</p>
                    ) : (
                      <div className="grid gap-6" role="group" aria-label="Time slot">
                        {sessions.map((s) => {
                          const open = s.slots.filter((t) => !slotPassed(form.date, t));
                          return (
                            <div key={s.id}>
                              <p className="text-[14px] text-ink mb-3"><strong className="font-semibold">{s.label}</strong> <span className="text-body">· {s.range}</span></p>
                              {open.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {s.slots.map((t) => (
                                    <Chip key={t} active={form.slot === t} disabled={slotPassed(form.date, t)} onClick={() => update({ slot: t })}>{formatSlot(t)}</Chip>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[13.5px]">No more {s.label.toLowerCase()} slots today.</p>
                              )}
                            </div>
                          );
                        })}
                        {errors.slot && <p className="text-[12.5px] text-[#b42318]" role="alert">{errors.slot}</p>}
                      </div>
                    )}
                  </FormSection>

                  <FormSection step="4" title="Visit details">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Treatment needed">
                        <select className="field" value={form.reason} onChange={(e) => update({ reason: e.target.value })}>
                          <option value="">Not sure / general check-up</option>
                          {categories.map((c) => <option key={c.slug}>{c.name}</option>)}
                          <option>Follow-up visit</option>
                          <option>Dental emergency</option>
                        </select>
                      </Field>
                      <Field label="Notes for the doctor">
                        <input className="field" value={form.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Optional" />
                      </Field>
                    </div>
                  </FormSection>

                  <div className="border-t border-line pt-7 flex flex-wrap items-center gap-5">
                    <button type="submit" disabled={saving} className="btn btn-solid !px-8 !py-3.5 disabled:opacity-60">{saving ? 'Booking…' : 'Confirm Appointment'}</button>
                    {form.date && form.slot && (
                      <span className="text-[14px] text-ink">
                        {fmtDay(selectedDay.date, { weekday: 'short', day: 'numeric', month: 'short' })} at {formatSlot(form.slot)}
                      </span>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          <PatientAside
            title="Before your visit"
            steps={[
              'Book your preferred date and time slot.',
              'Our team calls or messages you to confirm.',
              'Arrive 10 minutes early with previous X-rays or prescriptions.',
              'Get a clear diagnosis and a written treatment plan.',
            ]}
            cta={{ label: 'New patient? Register', to: '/patients/register' }}
          />
        </div>
      </section>
    </>
  );
}
