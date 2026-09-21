import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiCopy } from 'react-icons/fi';
import PageHero from '../components/PageHero';
import PatientAside from '../components/PatientAside';
import MultiSelect from '../components/MultiSelect';
import { Field, FormSection, Chip, invalid } from '../components/Form';
import useSeo from '../hooks/useSeo';
import { medicalConditions, referralSources, complaintChips } from '../data/patients';
import { registerPatient } from '../lib/patientStore';
import { registerPatientApi } from '../lib/publicApi';

const empty = {
  name: '', age: '', sex: '', phone: '', address: '', referral: '', referralName: '',
  profession: '', conditions: [], conditionNotes: {}, pregnant: '', complaint: '', consent: false,
};

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Please enter the patient’s full name.';
  if (!f.age || f.age < 1 || f.age > 110) e.age = 'Enter a valid age.';
  if (!f.sex) e.sex = 'Please select one.';
  if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a valid 10-digit mobile number.';
  if (f.address.trim().length < 5) e.address = 'Please enter your address.';
  if (!f.conditions.length) e.conditions = 'Select any conditions, or choose “No known medical conditions”.';
  medicalConditions.forEach((c) => {
    if (c.detail && f.conditions.includes(c.id) && !f.conditionNotes[c.id]?.trim()) e[`note-${c.id}`] = 'Please add details.';
  });
  if (f.complaint.trim().length < 3) e.complaint = 'Tell us briefly why you are visiting.';
  if (!f.consent) e.consent = 'Consent is required to register.';
  return e;
}

export default function Register() {
  useSeo(
    'New Patient Registration | Duhita Dental, Vijayawada',
    'Register as a new patient at Duhita Multispeciality Dental Centre, Benz Circle, Vijayawada. Save time at the clinic by sharing your details and medical history online.',
  );
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [patientId, setPatientId] = useState(null);
  const [copied, setCopied] = useState(false);

  const set = (k) => (e) => {
    const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest);
  };
  const setNote = (id, v) => setForm((f) => ({ ...f, conditionNotes: { ...f.conditionNotes, [id]: v } }));
  const addComplaint = (c) =>
    setForm((f) => ({ ...f, complaint: f.complaint.includes(c) ? f.complaint : [f.complaint.trim(), c].filter(Boolean).join(', ') }));

  const askPregnancy = form.sex === 'Female' && form.age >= 12 && form.age <= 55;

  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() =>
        document.querySelector('[role="alert"]')?.closest('label, [role="group"], fieldset')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setSaving(true);
    try {
      const { patient_id } = await registerPatientApi(form);
      setPatientId(patient_id);
    } catch {
      setPatientId(registerPatient(form)); // API offline — keep the visit usable
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const copyId = () => {
    navigator.clipboard?.writeText(patientId).then(() => setCopied(true), () => {});
  };

  return (
    <>
      <PageHero eyebrow="For Patients" title="New Patient Registration" image="/images/services/oral_medicine_diagnosis/diagnosis_home.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'For Patients', to: '/patient-info' }, { label: 'Registration' }]}>
        Register once and skip the paperwork at the front desk. It takes about two minutes.
      </PageHero>

      <section className="section-y bg-ivory">
        <div className="container-x grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px] lg:gap-14 items-start [&>*]:min-w-0">
          {patientId ? (
            <div className="card p-7 sm:p-10 md:p-12 text-center gallery-fade">
              <FiCheckCircle className="w-14 h-14 mx-auto text-slate" />
              <h2 className="text-[26px] sm:text-[31px] md:text-[40px] mt-5">Registration complete</h2>
              <p className="mt-3">Welcome to Duhita Dental, {form.name.split(' ')[0]}. Please keep your Patient ID for bookings and visits.</p>
              <div className="mt-8 inline-flex items-center gap-4 bg-ivory px-6 py-4">
                <div className="text-left">
                  <p className="text-[12px] uppercase tracking-[0.14em]">Your Patient ID</p>
                  <p className="font-display text-[34px] text-ink tracking-wide">{patientId}</p>
                </div>
                <button type="button" onClick={copyId} className="btn btn-outline !px-3" aria-label="Copy patient ID">
                  <FiCopy /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link to="/patients/book-appointment" state={{ patientId, name: form.name, phone: form.phone }} className="btn btn-solid !px-7 !py-3">
                  Book Your Appointment
                </Link>
                <button type="button" onClick={() => { setForm(empty); setPatientId(null); setCopied(false); }} className="btn btn-outline !py-3">
                  Register Another Patient
                </button>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} className="card p-5 sm:p-8 md:p-10 grid gap-9">
              <FormSection step="1" title="Personal details">
                <div className="grid sm:grid-cols-[1fr_120px] gap-5">
                  <Field label="Full name" required error={errors.name}>
                    <input className={`field ${invalid(errors.name)}`} value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} />
                  </Field>
                  <Field label="Age" required error={errors.age}>
                    <input type="number" inputMode="numeric" min="1" max="110" className={`field ${invalid(errors.age)}`} value={form.age}
                      onChange={(e) => set('age')(e.target.value.slice(0, 3))} aria-invalid={!!errors.age} />
                  </Field>
                </div>
                <div className="grid gap-1.5 text-[14px] text-ink" role="group" aria-label="Sex">
                  <span>Sex <span className="text-[#b42318]">*</span></span>
                  <div className="flex flex-wrap gap-2">
                    {['Male', 'Female', 'Other'].map((s) => <Chip key={s} active={form.sex === s} onClick={() => set('sex')(s)}>{s}</Chip>)}
                  </div>
                  {errors.sex && <span className="text-[12.5px] text-[#b42318]" role="alert">{errors.sex}</span>}
                </div>
                <Field label="Profession" hint="Helps us plan appointment timings around your work or school.">
                  <input className="field" value={form.profession} onChange={set('profession')} placeholder="e.g. Teacher, Student, Business" />
                </Field>
              </FormSection>

              <FormSection step="2" title="Contact details">
                <Field label="Mobile number" required error={errors.phone} hint="We’ll send appointment reminders to this number.">
                  <div className="flex">
                    <span className="field !w-auto border-r-0 bg-ivory text-body">+91</span>
                    <input type="tel" inputMode="numeric" className={`field ${invalid(errors.phone)}`} value={form.phone}
                      onChange={(e) => set('phone')(e.target.value.replace(/\D/g, '').slice(0, 10))} autoComplete="tel-national" aria-invalid={!!errors.phone} />
                  </div>
                </Field>
                <Field label="Address" required error={errors.address}>
                  <textarea rows={2} className={`field resize-y ${invalid(errors.address)}`} value={form.address} onChange={set('address')}
                    autoComplete="street-address" placeholder="House no., street, area, city" aria-invalid={!!errors.address} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="How did you hear about us? (Reference)">
                    <select className="field" value={form.referral} onChange={set('referral')}>
                      <option value="">Select an option</option>
                      {referralSources.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                  {['Friend or family', 'Existing Duhita patient', 'Doctor / dentist referral', 'Other'].includes(form.referral) && (
                    <Field label={form.referral === 'Other' ? 'Please specify' : 'Referred by (name)'}>
                      <input className="field" value={form.referralName} onChange={set('referralName')} />
                    </Field>
                  )}
                </div>
              </FormSection>

              <FormSection step="3" title="General health">
                <Field label="Do you have any of these medical conditions?" required error={errors.conditions}
                  hint="Some conditions and medicines change how we plan treatment and anaesthesia, so please be thorough.">
                  <MultiSelect options={medicalConditions} value={form.conditions} onChange={set('conditions')}
                    none={form.conditions.includes('none')} noneLabel="No known medical conditions"
                    placeholder="Select all that apply" error={errors.conditions} />
                </Field>
                {medicalConditions.filter((c) => c.detail && form.conditions.includes(c.id)).map((c) => (
                  <Field key={c.id} label={`${c.label} — details`} required error={errors[`note-${c.id}`]}>
                    <input className={`field ${invalid(errors[`note-${c.id}`])}`} placeholder={c.detail}
                      value={form.conditionNotes[c.id] || ''} onChange={(e) => setNote(c.id, e.target.value)} />
                  </Field>
                ))}
                {askPregnancy && (
                  <div className="grid gap-1.5 text-[14px] text-ink" role="group" aria-label="Pregnancy">
                    <span>Are you pregnant or breastfeeding?</span>
                    <div className="flex flex-wrap gap-2">
                      {['No', 'Pregnant', 'Breastfeeding'].map((s) => <Chip key={s} active={form.pregnant === s} onClick={() => set('pregnant')(s)}>{s}</Chip>)}
                    </div>
                    <span className="text-[12.5px] text-body">We take extra care with X-rays and medicines during pregnancy.</span>
                  </div>
                )}
              </FormSection>

              <FormSection step="4" title="Reason for visit">
                <Field label="Chief complaint" required error={errors.complaint}>
                  <textarea rows={3} className={`field resize-y ${invalid(errors.complaint)}`} value={form.complaint} onChange={set('complaint')}
                    placeholder="e.g. Pain in lower right back tooth for 3 days" aria-invalid={!!errors.complaint} />
                </Field>
                <div className="flex flex-wrap gap-2 -mt-2">
                  {complaintChips.map((c) => <Chip key={c} active={form.complaint.includes(c)} onClick={() => addComplaint(c)}>{c}</Chip>)}
                </div>
              </FormSection>

              <div className="border-t border-line pt-7 grid gap-5">
                <label className="flex gap-3 text-[13px] leading-relaxed">
                  <input type="checkbox" className="mt-1 accent-slate w-4 h-4 shrink-0" checked={form.consent} onChange={set('consent')} />
                  <span>
                    I confirm the information above is correct to the best of my knowledge, and I agree to be contacted by Duhita Dental
                    by phone, SMS or WhatsApp about my care.
                    {errors.consent && <span className="block text-[#b42318] mt-1" role="alert">{errors.consent}</span>}
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <button type="submit" disabled={saving} className="btn btn-solid !px-8 !py-3.5 disabled:opacity-60">{saving ? 'Saving…' : 'Complete Registration'}</button>
                  <span className="text-[13.5px]">Already registered? <Link to="/patients/book-appointment" className="text-ink underline underline-offset-4">Book an appointment</Link></span>
                </div>
              </div>
            </form>
          )}

          <PatientAside
            title="How registration works"
            steps={[
              'Fill in your personal details, medical history and reason for visit.',
              'Receive your unique Duhita Patient ID instantly.',
              'Use your Patient ID to book appointments online in seconds.',
              'Arrive 10 minutes early — no paperwork needed at the desk.',
            ]}
          />
        </div>
      </section>
    </>
  );
}
