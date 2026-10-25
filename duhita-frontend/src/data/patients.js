export const medicalConditions = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'htn', label: 'Hypertension (BP)' },
  { id: 'cardiac', label: 'Cardiac / heart condition' },
  { id: 'resp', label: 'Respiratory (asthma, TB, COPD)' },
  { id: 'allergy', label: 'Allergy', detail: 'Allergic to (medicine, latex, food…)' },
  { id: 'gi', label: 'Gastro-intestinal (G.I.)' },
  { id: 'bleeding', label: 'Bleeding disorder' },
  { id: 'thyroid', label: 'Thyroid' },
  { id: 'renal', label: 'Renal / kidney' },
  { id: 'drugs', label: 'Regular medicines (drugs)', detail: 'Medicines you take (e.g. aspirin, blood thinners)' },
  { id: 'others', label: 'Others', detail: 'Please specify' },
];

export const referralSources = [
  'Friend or family',
  'Existing Duhita patient',
  'Doctor / dentist referral',
  'Google search / Maps',
  'Facebook / Instagram',
  'Free dental camp',
  'Saw the clinic signboard',
  'Other',
];

export const complaintChips = [
  'Toothache',
  'Sensitivity',
  'Bleeding gums',
  'Broken tooth',
  'Missing teeth',
  'Crooked teeth',
  'Bad breath',
  'Swelling',
  'Routine check-up',
  'Child’s dental visit',
];

// Half-hour starts within clinic hours (same as backend/app/clinic.py and the patient app).
const slots = (from, to) => {
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const out = [];
  for (let m = toMin(from); m < toMin(to); m += 30) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  return out;
};

export const sessions = [
  { id: 'morning', label: 'Morning', range: '10:00 AM – 1:00 PM', slots: slots('10:00', '13:00') },
  { id: 'evening', label: 'Evening', range: '4:30 PM – 8:00 PM', slots: slots('16:30', '20:00') },
];

export const formatSlot = (t) => {
  if (!t) return '—';
  if (!t.includes(':')) return t;
  const parts = t.split(':').map(Number);
  if (isNaN(parts[0]) || isNaN(parts[1])) return t;
  const [h, m] = parts;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
