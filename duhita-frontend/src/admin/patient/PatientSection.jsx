import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  FiActivity, FiCalendar, FiCheckCircle, FiChevronsLeft, FiChevronsRight, FiClipboard, FiClock, FiCreditCard, FiDollarSign,
  FiFileText, FiImage, FiList, FiMessageSquare, FiUser, FiUsers,
} from 'react-icons/fi';
import { api } from '../api';
import { ErrorNote, Skeleton, cx } from '../ui';
import { useLiveEvents } from '../../lib/useLiveEvents';
import { PatientCtx, ageSex } from './shared';
import PatientList from './PatientList';

const PatientRecord = lazy(() => import('../PatientRecord'));
const Profile = lazy(() => import('./Profile'));
const Appointments = lazy(() => import('./Profile').then((m) => ({ default: m.Appointments })));
const Communications = lazy(() => import('./Profile').then((m) => ({ default: m.Communications })));
const Vitals = lazy(() => import('./Clinical'));
const Notes = lazy(() => import('./Clinical').then((m) => ({ default: m.ClinicalNotes })));
const Treatments = lazy(() => import('./Treatments'));
const Files = lazy(() => import('./Files'));
const Prescriptions = lazy(() => import('./Prescriptions'));
const Ledger = lazy(() => import('./Ledger'));
const PastBills = lazy(() => import('./Ledger').then((m) => ({ default: m.PastBills })));
const AllAppointments = lazy(() => import('./AllLists'));
const AllInvoices = lazy(() => import('./AllLists').then((m) => ({ default: m.AllInvoices })));
const AllPayments = lazy(() => import('./AllLists').then((m) => ({ default: m.AllPayments })));

// [heading, [slug, label, icon, works for all patients]]
const NAV = [
  ['Patient', [['profile', 'Profile', FiUser, true], ['appointments', 'Appointments', FiCalendar, true], ['communications', 'Communications', FiMessageSquare]]],
  ['EMR', [
    ['vital-signs', 'Vital Signs', FiActivity, true], ['clinical-notes', 'Clinical Notes', FiClipboard, true],
    ['treatment-plans', 'Treatment Plans', FiList, true], ['completed-procedures', 'Completed Procedures', FiCheckCircle, true],
    ['files', 'Files', FiImage, true], ['prescriptions', 'Prescriptions', FiFileText, true], ['timeline', 'Timeline', FiClock],
  ]],
  ['Billing', [['invoices', 'Invoices', FiDollarSign, true], ['payments', 'Payments', FiCreditCard, true], ['ledger', 'Ledger', FiList], ['past-bills', 'Past Bills', FiFileText]]],
];

function render(section, pid) {
  if (!pid) {
    // Sections that are lists across every patient when no patient is open.
    if (section === 'appointments') return <AllAppointments />;
    if (section === 'invoices') return <AllInvoices />;
    if (section === 'payments') return <AllPayments />;
  }
  switch (section) {
    case 'profile': return <Profile />;
    case 'appointments': return <Appointments />;
    case 'communications': return <Communications />;
    case 'vital-signs': return <Vitals />;
    case 'clinical-notes': return <Notes />;
    case 'treatment-plans': return <Treatments status="planned" />;
    case 'completed-procedures': return <Treatments status="completed" />;
    case 'files': return <Files />;
    case 'prescriptions': return <Prescriptions />;
    case 'timeline': case 'invoices': case 'payments': return <PatientRecord key={`${pid}-${section}`} section={section} />;
    case 'ledger': return <Ledger />;
    case 'past-bills': return <PastBills />;
    default: return null;
  }
}

/** Practo's Patients area: groups + cards, and every section of one patient's record behind a left menu. */
export default function PatientSection() {
  const { patientId, section: sectionParam } = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const [doctors, setDoctors] = useState({});
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');
  const section = sectionParam || (patientId ? 'profile' : null);

  useEffect(() => {
    api.doctors().then((d) => setDoctors(Object.fromEntries(d.items.map((x) => [String(x.id), x])))).catch(() => {});
  }, []);

  const reload = useCallback(() => {
    if (!patientId) return setPatient(null);
    return api.patient(patientId).then((d) => { setPatient(d); setError(''); }).catch((e) => setError(e.message));
  }, [patientId]);
  useEffect(() => { setPatient(null); reload(); }, [reload]);
  useLiveEvents((e) => patientId && ['patient_updated', 'appointment_updated', 'record_updated'].includes(e.type) && reload());

  const p = patient?.patient;
  const href = (slug) => (patientId ? `/admin/patients/${patientId}/${slug}` : slug === 'profile' ? '/admin/patients' : `/admin/patients/all/${slug}`);

  return (
    <PatientCtx.Provider value={{ doctors, patient, reload }}>
      <div className="border-b border-[#d8d8d8] bg-[#f4f4f4]">
        <div className="flex items-center gap-3 border-b border-[#d8d8d8] bg-white px-3 h-[44px] text-[13px]">
          <Link to="/admin/patients" className="flex items-center gap-2 font-medium text-[#1a5fa0]"><FiUsers className="w-5 h-5" /> All Patients</Link>
          {p && (
            <>
              <span className="h-full w-px bg-[#ddd]" />
              <span className="w-[30px] h-[30px] grid place-items-center bg-[#d5d5d5] text-white"><FiUser /></span>
              <span className="uppercase text-[#1a5fa0]">{p.name}</span>
              <span className="text-[#1a5fa0]">{ageSex(p)}</span>
              <span className="text-[#1a5fa0]">(ID : {p.patient_id})</span>
              {p.phone && <a href={`tel:+91${p.phone}`} className="hidden sm:inline text-[#777]">+91 {p.phone}</a>}
            </>
          )}
        </div>
        <div className="flex min-h-[calc(100vh-104px)]">
          <nav className={cx('shrink-0 border-r border-[#d8d8d8] bg-white transition-[width]', collapsed ? 'w-[46px]' : 'w-[46px] md:w-[220px]')}>
            <button onClick={() => setCollapsed((c) => !c)} aria-label="Collapse menu" className="hidden md:flex w-full justify-end px-3 pt-2 text-[#777]">
              {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
            </button>
            {NAV.map(([heading, items]) => (
              <div key={heading} className="mb-2">
                <p className={cx('px-3 pt-2 pb-1 text-[12px] font-semibold text-[#1a73a8]', collapsed && 'md:hidden', 'hidden md:block')}>{heading}</p>
                {items.map(([slug, label, Icon, forAll]) => {
                  const enabled = patientId || forAll;
                  return enabled ? (
                    <NavLink key={slug} to={href(slug)} title={label}
                      className={() => cx('flex items-center gap-3 px-3 py-[7px] text-[13.5px]',
                        (section || 'profile') === slug ? 'bg-[#1a7fb5] text-white font-medium' : 'text-[#333] hover:bg-[#f1f6fa]')}>
                      <Icon className="w-4 h-4 shrink-0" /><span className={cx('truncate', collapsed ? 'hidden' : 'hidden md:inline')}>{label}</span>
                    </NavLink>
                  ) : (
                    <span key={slug} title={`${label}: open a patient first`} className="flex items-center gap-3 px-3 py-[7px] text-[13.5px] text-[#aaa] cursor-not-allowed">
                      <Icon className="w-4 h-4 shrink-0" /><span className={cx('truncate', collapsed ? 'hidden' : 'hidden md:inline')}>{label}</span>
                    </span>
                  );
                })}
              </div>
            ))}
          </nav>
          <main className="min-w-0 flex-1 bg-[#e9e9e9]">
            <ErrorNote>{error}</ErrorNote>
            {!section || (!patientId && section === 'profile') ? <PatientList /> : patientId && !patient ? <Skeleton className="m-4 h-60" /> : (
              <Suspense fallback={<Skeleton className="m-4 h-60" />}>{render(section, patientId)}</Suspense>
            )}
          </main>
        </div>
      </div>
    </PatientCtx.Provider>
  );
}
