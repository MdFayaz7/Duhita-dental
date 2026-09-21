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

const slots = (from, to) => {
  const out = [];
  for (let m = from * 60; m < to * 60; m += 30) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  return out;
};

export const sessions = [
  { id: 'morning', label: 'Morning', range: '9:00 AM – 1:00 PM', slots: slots(9, 13) },
  { id: 'evening', label: 'Evening', range: '3:00 PM – 9:00 PM', slots: slots(15, 21) },
];

export const formatSlot = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
