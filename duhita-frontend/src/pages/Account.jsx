import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity, FiCalendar, FiCamera, FiCheckCircle, FiChevronLeft, FiClock, FiFile, FiFolder,
  FiHeart, FiImage, FiLogOut, FiTrash2, FiUser,
} from 'react-icons/fi';
import { Field, Chip, invalid } from '../components/Form';
import useSeo from '../hooks/useSeo';
import { usePatientAuth } from '../lib/patientAuth';
import {
  ApiError, bookAppointment, cancelAppointment, checkNumber, deleteRecord, fileUrl,
  formatDate, formatSlot, getSlots, myAppointments, myRecords, removePhoto, todayIso,
  updateProfile, uploadPhoto,
} from '../lib/patientApi';
import { complaintChips } from '../data/patients';
import { site } from '../data/site';

const PHONE = /^[6-9]\d{9}$/;
const DAYS_AHEAD = 21;
const CONDITIONS = ['Diabetes', 'Blood pressure', 'Heart condition', 'Asthma', 'Thyroid', 'Bleeding disorder', 'Kidney disease', 'Pregnancy'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RECORD_KINDS = [
  { id: 'prescription', label: 'Prescription', icon: '℞' },
  { id: 'xray', label: 'X-ray / scan', icon: '🦴' },
  { id: 'report', label: 'Report', icon: '📄' },
  { id: 'note', label: 'Note', icon: '📝' },
];

export default function Account() {
  useSeo('My Account | Duhita Dental, Vijayawada', 'Sign in to book appointments, see your dental record and manage your Duhita Dental profile.');
  const { ready, token, patient } = usePatientAuth();

  if (!ready) {
    return (
      <div className="section-y bg-ivory min-h-[50vh] grid place-items-center">
        <span className="w-8 h-8 rounded-full border-[3px] border-slate/25 border-t-slate animate-spin" />
      </div>
    );
  }
  return token && patient ? <Dashboard /> : <AuthPanel />;
}

// ---------------------------------------------------------------- sign in / register

function AuthPanel() {
  const { signIn, signUp } = usePatientAuth();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', phone: '', password: '', patientId: '', age: '', sex: '' });
  const [known, setKnown] = useState(null);
  const [errors, setErrors] = useState({});
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setKnown(null);
    if (!PHONE.test(form.phone)) return undefined;
    const t = setTimeout(() => checkNumber(form.phone).then(setKnown).catch(() => {}), 350);
    return () => clearTimeout(t);
  }, [form.phone]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const validate = () => {
    const e = {};
    if (!PHONE.test(form.phone)) e.phone = 'Enter a 10-digit mobile number.';
    if (form.password.length < 6) e.password = 'At least 6 characters.';
    if (mode === 'signup' && form.name.trim().length < 2) e.name = 'Please enter your full name.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    setFailed('');
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(form.phone, form.password);
      else await signUp({
        name: form.name.trim(), phone: form.phone, password: form.password,
        patient_id: form.patientId.trim() || undefined,
        age: form.age ? Number(form.age) : undefined, sex: form.sex || undefined,
      });
    } catch (err) {
      setFailed(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section-y bg-ivory">
      <div className="container-x max-w-xl mx-auto">
        <div className="bg-slate text-white rounded-[18px] p-7 sm:p-8 reveal">
          <p className="text-[11.5px] font-semibold tracking-[0.14em] uppercase text-white/70">Your account</p>
          <h1 className="!text-white text-[26px] sm:text-[30px] mt-2">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="text-white/80 text-[14.5px] mt-2 leading-relaxed">
            {mode === 'signin' ? 'Sign in to book visits and see your dental record.' : 'Visited us before? Use the same mobile number — your Patient ID and visit history come with you.'}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {['📅 Book in seconds', '🗂 Your visit history', '🪪 Your Patient ID'].map((t) => (
              <span key={t} className="bg-white/12 rounded-full px-3 py-1.5 text-[12.5px] font-medium">{t}</span>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="card p-6 sm:p-8 mt-6 grid gap-5 reveal">
          {mode === 'signup' && (
            <Field label="Full name" required error={errors.name}>
              <input className={`field ${invalid(errors.name)}`} value={form.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" />
            </Field>
          )}
          <Field label="Mobile number" required error={errors.phone}>
            <input className={`field ${invalid(errors.phone)}`} value={form.phone} inputMode="numeric"
              onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} autoComplete="tel-national" />
          </Field>

          {known && mode === 'signup' && known.registered && !known.has_login && (
            <p className="text-[13px] text-[#127a4b] bg-[#e7f5ee] rounded-lg px-3 py-2">We found your clinic record — creating a password keeps your Patient ID and past visits.</p>
          )}
          {known && mode === 'signup' && known.has_login && (
            <p className="text-[13px] text-[#b42318] bg-[#fdecec] rounded-lg px-3 py-2">This number already has an account. Please sign in instead.</p>
          )}
          {known && mode === 'signin' && known.registered === false && (
            <p className="text-[13px] text-[#b42318] bg-[#fdecec] rounded-lg px-3 py-2">We have no record for this number. Create an account below.</p>
          )}

          <Field label="Password" required error={errors.password} hint={mode === 'signup' ? 'At least 6 characters.' : undefined}>
            <input type="password" className={`field ${invalid(errors.password)}`} value={form.password} onChange={(e) => set({ password: e.target.value })}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          </Field>

          {mode === 'signup' && (
            <>
              <Field label="Patient ID (optional)" hint="On your clinic receipt, like DD2609-1234. Only needed if your number has changed.">
                <input className="field uppercase tracking-wider" value={form.patientId} onChange={(e) => set({ patientId: e.target.value.toUpperCase() })} placeholder="DD2609-1234" />
              </Field>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Age (optional)">
                  <input className="field" value={form.age} inputMode="numeric" onChange={(e) => set({ age: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
                </Field>
                <Field label="Sex (optional)">
                  <div className="flex gap-2">
                    {['Male', 'Female', 'Other'].map((s) => (
                      <Chip key={s} active={form.sex === s} onClick={() => set({ sex: form.sex === s ? '' : s })}>{s}</Chip>
                    ))}
                  </div>
                </Field>
              </div>
            </>
          )}

          {failed && <p className="text-[13px] text-[#b42318]" role="alert">{failed}</p>}

          <button type="submit" disabled={busy} className="btn btn-solid w-full !py-3.5 disabled:opacity-60">
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrors({}); setFailed(''); }}
            className="text-[14px] text-slate font-semibold text-center hover:underline">
            {mode === 'signin' ? 'New patient? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>

        <p className="text-[13px] text-center mt-5">
          Forgot your password, or changed your number? Call the clinic on{' '}
          <a href={`tel:${site.phone}`} className="text-ink font-medium underline underline-offset-4">{site.phoneDisplay}</a> and we’ll reset it.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- dashboard

const MENU = [
  { id: 'book', label: 'Book a visit', icon: FiCalendar },
  { id: 'appointments', label: 'My appointments', icon: FiClock },
  { id: 'record', label: 'My dental record', icon: FiActivity },
  { id: 'medical', label: 'Medical history', icon: FiHeart },
  { id: 'records', label: 'Records & documents', icon: FiFolder },
  { id: 'details', label: 'Personal details', icon: FiUser },
];

function SectionHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={onBack} aria-label="Back" className="w-9 h-9 shrink-0 rounded-full bg-white border border-line grid place-items-center text-ink hover:bg-mist">
        <FiChevronLeft className="w-5 h-5" />
      </button>
      <h2 className="text-[20px] text-ink">{title}</h2>
    </div>
  );
}

function Dashboard() {
  const { token, patient, setPatient, signOut } = usePatientAuth();
  const [view, setView] = useState('menu');
  const [appointments, setAppointments] = useState(null);
  const [records, setRecords] = useState(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editingMedical, setEditingMedical] = useState(false);

  const load = () => {
    myAppointments(token).then(setAppointments).catch(() => setAppointments({ upcoming: [], past: [] }));
    myRecords(token).then((d) => setRecords(d.items)).catch(() => setRecords([]));
  };
  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const visits = (appointments?.past ?? []).filter((a) => a.status === 'completed');
  const next = appointments?.upcoming?.[0];
  const back = () => setView('menu');

  return (
    <section className="section-y bg-ivory">
      <div className="container-x max-w-3xl mx-auto">
        {view === 'menu' && (
          <div className="grid gap-6 reveal">
            {/* Patient card */}
            <div className="bg-slate rounded-[18px] overflow-hidden text-white">
              <div className="p-6 sm:p-7 flex items-center gap-4">
                <PhotoPicker patient={patient} token={token} onChange={setPatient} />
                <div className="min-w-0">
                  <p className="text-[19px] font-semibold truncate">{patient.name}</p>
                  <p className="text-white/70 text-[13px] mt-0.5">
                    +91 {patient.phone}{patient.age ? ` · ${patient.age} yrs` : ''}{patient.sex ? ` · ${patient.sex}` : ''}
                  </p>
                </div>
              </div>
              <div className="bg-black/15 px-6 sm:px-7 py-3 flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/70">Patient ID</span>
                <span className="text-[17px] font-bold tracking-wider">{patient.patient_id}</span>
              </div>
            </div>

            {next && (
              <div className="card p-0 overflow-hidden">
                <div className="p-5 flex items-center gap-4">
                  <div className="w-16 rounded-xl bg-mist text-center py-2.5 shrink-0">
                    <span className="block text-[22px] font-display leading-none text-ink">{next.date.slice(8, 10)}</span>
                    <span className="block text-[10.5px] font-bold text-slate mt-1">{formatDate(next.date).split(', ')[0].split(' ').pop()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold text-ink">{formatSlot(next.slot)}</p>
                    <p className="text-[13px] text-body mt-0.5">{formatDate(next.date, true)}{next.reason ? ` · ${next.reason}` : ''}</p>
                  </div>
                  <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${next.status === 'confirmed' ? 'bg-[#e7f5ee] text-[#127a4b]' : 'bg-[#fff4e5] text-[#a15c07]'}`}>
                    {next.status}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {MENU.map(({ id, label, icon: I }) => (
                <button key={id} onClick={() => setView(id)}
                  className="card p-5 text-center hover:-translate-y-0.5 transition-transform">
                  <I className="w-5 h-5 mx-auto text-slate" />
                  <span className="block mt-2 text-[13.5px] font-semibold text-ink">{label}</span>
                </button>
              ))}
            </div>

            <button onClick={signOut} className="text-[14px] font-semibold text-[#b42318] py-2 flex items-center justify-center gap-2">
              <FiLogOut /> Sign out
            </button>
          </div>
        )}

        {view === 'book' && (
          <div className="reveal">
            <SectionHeader title="Book a visit" onBack={back} />
            <div className="card p-6 sm:p-7">
              <BookForm token={token} onBooked={() => { load(); }} />
            </div>
          </div>
        )}

        {view === 'appointments' && (
          <div className="reveal">
            <SectionHeader title="My appointments" onBack={back} />
            {!appointments ? (
              <Loading />
            ) : appointments.upcoming.length === 0 && appointments.past.length === 0 ? (
              <p className="card p-6 text-[14px]">No appointments yet — book your first visit.</p>
            ) : (
              <div className="grid gap-3">
                {appointments.upcoming.map((a) => (
                  <AppointmentRow key={a.id} a={a} onCancel={async () => { await cancelAppointment(token, a.id); load(); }} />
                ))}
                {appointments.past.map((a) => <AppointmentRow key={a.id} a={a} past />)}
              </div>
            )}
          </div>
        )}

        {view === 'record' && (
          <div className="reveal">
            <SectionHeader title="My dental record" onBack={back} />
            {!appointments ? (
              <Loading />
            ) : visits.length === 0 ? (
              <p className="card p-6 text-[14px]">Your treatment history appears here after your first completed visit.</p>
            ) : (
              <div className="card p-6 sm:p-7">
                {visits.map((v, i) => (
                  <div key={v.id} className={`flex gap-3 ${i > 0 ? 'pt-4 mt-4 border-t border-line' : ''}`}>
                    <span className="w-2 h-2 rounded-full bg-slate mt-2 shrink-0" />
                    <div>
                      <p className="text-[14.5px] font-semibold text-ink">{v.reason || 'Dental visit'}</p>
                      <p className="text-[13px] text-body mt-0.5">{formatDate(v.date, true)} · {formatSlot(v.slot)}{v.doctor ? ` · ${v.doctor}` : ''}</p>
                      {v.notes && <p className="text-[13px] text-body mt-1">{v.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'medical' && (
          <div className="reveal">
            <SectionHeader title="Medical history" onBack={back} />
            {editingMedical ? (
              <MedicalForm patient={patient} token={token} onDone={(p) => { setPatient(p); setEditingMedical(false); }} onCancel={() => setEditingMedical(false)} />
            ) : (
              <div className="card p-6 sm:p-7">
                {[
                  ['Blood group', patient.blood_group || '—'],
                  ['Conditions', patient.conditions?.length ? patient.conditions.join(', ') : 'None reported'],
                  ['Allergies', patient.allergies || 'None reported'],
                  ['Medicines', patient.medications || 'None reported'],
                  ['Emergency contact', patient.emergency_contact ? `${patient.emergency_contact}${patient.emergency_phone ? ` · +91 ${patient.emergency_phone}` : ''}` : '—'],
                ].map(([k, v], i) => (
                  <div key={k} className={`flex gap-4 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}>
                    <span className="w-40 shrink-0 text-[11.5px] font-bold uppercase tracking-wide text-stone">{k}</span>
                    <span className="text-[14px] text-ink">{v}</span>
                  </div>
                ))}
                <button onClick={() => setEditingMedical(true)} className="btn btn-outline mt-5">Update medical history</button>
              </div>
            )}
          </div>
        )}

        {view === 'records' && (
          <div className="reveal">
            <SectionHeader title="Records & documents" onBack={back} />
            {records === null ? <Loading /> : (
              <div className="grid gap-3">
                {records.map((r) => (
                  <RecordRow key={r.id} r={r} onDelete={r.added_by === 'patient' ? async () => { await deleteRecord(token, r.id); load(); } : undefined} />
                ))}
                {records.length === 0 && (
                  <p className="card p-6 text-[14px]">
                    Nothing here yet. Prescriptions, X-rays and reports the clinic files for you appear here automatically.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'details' && (
          <div className="reveal">
            <SectionHeader title="Personal details" onBack={back} />
            {editingDetails ? (
              <DetailsForm patient={patient} token={token} onDone={(p) => { setPatient(p); setEditingDetails(false); }} onCancel={() => setEditingDetails(false)} />
            ) : (
              <div className="card p-6 sm:p-7">
                {[
                  ['Name', patient.name], ['Mobile', `+91 ${patient.phone}`], ['Age', patient.age || '—'], ['Sex', patient.sex || '—'],
                  ['Email', patient.email || '—'], ['Address', patient.address || '—'],
                ].map(([k, v], i) => (
                  <div key={k} className={`flex gap-4 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}>
                    <span className="w-24 shrink-0 text-[11.5px] font-bold uppercase tracking-wide text-stone">{k}</span>
                    <span className="text-[14px] text-ink">{v}</span>
                  </div>
                ))}
                <button onClick={() => setEditingDetails(true)} className="btn btn-outline mt-5">Edit details</button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const Loading = () => <div className="card p-6 grid place-items-center"><span className="w-6 h-6 rounded-full border-[3px] border-slate/25 border-t-slate animate-spin" /></div>;

function AppointmentRow({ a, past, onCancel }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="card p-4 sm:p-5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-ink">{formatDate(a.date, true)} · {formatSlot(a.slot)}</p>
        <p className="text-[13px] text-body mt-0.5 truncate">{a.reason || 'General visit'}</p>
      </div>
      <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0 ${
        a.status === 'confirmed' || a.status === 'completed' ? 'bg-[#e7f5ee] text-[#127a4b]' :
        a.status === 'cancelled' || a.status === 'no_show' ? 'bg-[#fdecec] text-[#b42318]' : 'bg-[#fff4e5] text-[#a15c07]'
      }`}>{a.status.replace('_', ' ')}</span>
      {!past && ['pending', 'confirmed'].includes(a.status) && onCancel && (
        <button disabled={busy} onClick={async () => { setBusy(true); await onCancel(); }} className="text-[13px] text-body hover:text-[#b42318] shrink-0">
          {busy ? '…' : 'Cancel'}
        </button>
      )}
    </div>
  );
}

function RecordRow({ r, onDelete }) {
  const icon = RECORD_KINDS.find((k) => k.id === r.kind)?.icon || '📄';
  return (
    <div className="card p-4 sm:p-5 flex items-center gap-4">
      <span className="w-10 h-10 shrink-0 rounded-xl bg-mist grid place-items-center text-[16px]">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-ink truncate">{r.title}</p>
        <p className="text-[13px] text-body mt-0.5">
          {RECORD_KINDS.find((k) => k.id === r.kind)?.label} · {formatDate(r.date, true)}
          {r.added_by === 'patient' ? ' · added by you' : ' · from the clinic'}
        </p>
      </div>
      {r.file && (
        <a href={fileUrl(r.file)} target="_blank" rel="noreferrer" className="text-slate shrink-0" aria-label="View file">
          {r.file_type === 'image' ? <FiImage className="w-5 h-5" /> : <FiFile className="w-5 h-5" />}
        </a>
      )}
      {onDelete && (
        <button onClick={onDelete} aria-label="Remove" className="text-body hover:text-[#b42318] shrink-0"><FiTrash2 className="w-[18px] h-[18px]" /></button>
      )}
    </div>
  );
}

function PhotoPicker({ patient, token, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const { photo } = await uploadPhoto(token, file);
      onChange({ ...patient, photo });
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <div className="relative w-16 h-16 shrink-0">
      <button onClick={() => inputRef.current?.click()} className="w-16 h-16 rounded-full overflow-hidden bg-white/15 ring-1 ring-white/30 grid place-items-center">
        {patient.photo ? <img src={fileUrl(patient.photo)} alt="" className="w-full h-full object-cover" /> : <span className="text-[24px] font-semibold">{patient.name.charAt(0).toUpperCase()}</span>}
      </button>
      <button onClick={() => inputRef.current?.click()} aria-label="Change profile picture"
        className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-white text-slate grid place-items-center shadow">
        {busy ? '…' : <FiCamera className="w-3.5 h-3.5" />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      {patient.photo && (
        <button onClick={async () => { await removePhoto(token); onChange({ ...patient, photo: undefined }); }}
          className="absolute inset-x-0 -bottom-6 text-[10.5px] text-white/70 underline">remove</button>
      )}
    </div>
  );
}

function BookForm({ token, onBooked }) {
  const days = useMemo(() => {
    const today = todayIso();
    const [y, m, d] = today.split('-').map(Number);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const date = new Date(y, m - 1, d + i);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { iso, date, closed: date.getDay() === 0, today: i === 0 };
    });
  }, []);

  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [day, setDay] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    if (!date) return;
    setSlot('');
    setLoadingSlots(true);
    getSlots(date).then(setDay).catch((e) => setFailed(e.message)).finally(() => setLoadingSlots(false));
  }, [date]);

  const submit = async () => {
    setFailed('');
    if (!date || !slot) return setFailed('Please choose a date and time.');
    setBusy(true);
    try {
      const a = await bookAppointment(token, { date, slot, reason: reason || undefined, notes: notes || undefined });
      setBooked(a);
      onBooked();
    } catch (e) {
      setFailed(e.message);
      if (date) getSlots(date).then(setDay).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  if (booked) {
    return (
      <div className="text-center py-6 gallery-fade">
        <FiCheckCircle className="w-12 h-12 mx-auto text-slate" />
        <p className="text-[18px] text-ink mt-4">Appointment requested</p>
        <p className="text-[14px] mt-2">{formatDate(booked.date, true)} at {formatSlot(booked.slot)}. We’ll call to confirm.</p>
        <button onClick={() => { setBooked(null); setDate(''); setSlot(''); setReason(''); setNotes(''); }} className="btn btn-outline mt-5">Book another</button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 mt-5">
      <div>
        <p className="text-[13px] font-semibold text-ink mb-3">Choose a date</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x" style={{ touchAction: 'pan-x' }}>
          {days.map((d) => (
            <button key={d.iso} type="button" disabled={d.closed} onClick={() => setDate(d.iso)}
              className={`snap-start shrink-0 w-[70px] py-2.5 rounded-xl border text-center transition-colors disabled:opacity-40 ${
                date === d.iso ? 'bg-slate border-slate text-white' : 'bg-white border-[#b9c3cc] text-ink hover:border-slate'}`}>
              <span className="block text-[10.5px] uppercase tracking-wider opacity-80">{d.today ? 'Today' : d.date.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
              <span className="block font-display text-[22px] leading-tight">{d.date.getDate()}</span>
              <span className="block text-[10.5px] opacity-80">{d.closed ? 'Closed' : d.date.toLocaleDateString('en-IN', { month: 'short' })}</span>
            </button>
          ))}
        </div>
      </div>

      {date && (
        <div>
          <p className="text-[13px] font-semibold text-ink mb-3">Choose a time</p>
          {loadingSlots ? <Loading /> : day?.sessions.map((s) => {
            const open = s.slots.filter((t) => t.available);
            return (
              <div key={s.id} className="mb-4">
                <p className="text-[13.5px] text-ink mb-2"><strong>{s.label}</strong> <span className="text-body">· {s.range}</span></p>
                {open.length ? (
                  <div className="flex flex-wrap gap-2">
                    {open.map((t) => <Chip key={t.time} active={slot === t.time} onClick={() => setSlot(t.time)}>{formatSlot(t.time)}</Chip>)}
                  </div>
                ) : <p className="text-[13px]">No more {s.label.toLowerCase()} slots.</p>}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <p className="text-[13px] font-semibold text-ink mb-3">Why are you coming in? (optional)</p>
        <div className="flex flex-wrap gap-2">
          {complaintChips.map((c) => <Chip key={c} active={reason === c} onClick={() => setReason(reason === c ? '' : c)}>{c}</Chip>)}
        </div>
      </div>

      <Field label="Anything else? (optional)">
        <textarea className="field min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {failed && <p className="text-[13px] text-[#b42318]" role="alert">{failed}</p>}
      <button onClick={submit} disabled={!date || !slot || busy} className="btn btn-solid disabled:opacity-50">
        {busy ? 'Booking…' : date && slot ? `Request ${formatDate(date)} · ${formatSlot(slot)}` : 'Request appointment'}
      </button>
    </div>
  );
}

function MedicalForm({ patient, token, onDone, onCancel }) {
  const [form, setForm] = useState({
    conditions: patient.conditions || [], blood_group: patient.blood_group || '', allergies: patient.allergies || '',
    medications: patient.medications || '', emergency_contact: patient.emergency_contact || '', emergency_phone: patient.emergency_phone || '',
  });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const toggle = (c) => setForm((f) => ({ ...f, conditions: f.conditions.includes(c) ? f.conditions.filter((x) => x !== c) : [...f.conditions, c] }));

  const save = async () => {
    setBusy(true);
    setFailed('');
    try {
      onDone(await updateProfile(token, {
        conditions: form.conditions, blood_group: form.blood_group || undefined, allergies: form.allergies.trim() || undefined,
        medications: form.medications.trim() || undefined, emergency_contact: form.emergency_contact.trim() || undefined,
        emergency_phone: form.emergency_phone || undefined,
      }));
    } catch (e) { setFailed(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="card p-6 sm:p-7 grid gap-5">
      <Field label="Conditions" hint="Tap any that apply to you.">
        <div className="flex flex-wrap gap-2">{CONDITIONS.map((c) => <Chip key={c} active={form.conditions.includes(c)} onClick={() => toggle(c)}>{c}</Chip>)}</div>
      </Field>
      <Field label="Blood group">
        <div className="flex flex-wrap gap-2">{BLOOD_GROUPS.map((b) => <Chip key={b} active={form.blood_group === b} onClick={() => setForm({ ...form, blood_group: form.blood_group === b ? '' : b })}>{b}</Chip>)}</div>
      </Field>
      <Field label="Allergies"><input className="field" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="None" /></Field>
      <Field label="Medicines you take"><input className="field" value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} placeholder="None" /></Field>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Emergency contact"><input className="field" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></Field>
        <Field label="Emergency number"><input className="field" value={form.emergency_phone} inputMode="numeric" onChange={(e) => setForm({ ...form, emergency_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></Field>
      </div>
      {failed && <p className="text-[13px] text-[#b42318]" role="alert">{failed}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className="btn btn-solid flex-1">{busy ? 'Saving…' : 'Save'}</button>
        <button onClick={onCancel} className="btn btn-outline">Cancel</button>
      </div>
    </div>
  );
}

function DetailsForm({ patient, token, onDone, onCancel }) {
  const [form, setForm] = useState({ name: patient.name, age: patient.age || '', email: patient.email || '', address: patient.address || '', profession: patient.profession || '' });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  const save = async () => {
    setBusy(true);
    setFailed('');
    try {
      onDone(await updateProfile(token, {
        name: form.name.trim(), age: form.age ? Number(form.age) : undefined, email: form.email.trim() || undefined,
        address: form.address.trim() || undefined, profession: form.profession.trim() || undefined,
      }));
    } catch (e) {
      setFailed(e instanceof ApiError ? e.message : 'Could not save changes.');
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-6 sm:p-7 grid gap-5">
      <Field label="Full name"><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Age"><input className="field" value={form.age} inputMode="numeric" onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, '').slice(0, 3) })} /></Field>
      <Field label="Email"><input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Address"><textarea className="field min-h-[80px]" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      <Field label="Profession"><input className="field" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} /></Field>
      {failed && <p className="text-[13px] text-[#b42318]" role="alert">{failed}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className="btn btn-solid flex-1">{busy ? 'Saving…' : 'Save changes'}</button>
        <button onClick={onCancel} className="btn btn-outline">Cancel</button>
      </div>
    </div>
  );
}

