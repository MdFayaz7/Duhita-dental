/**
 * Public site → backend API.
 * If the API is unreachable the caller falls back to the local demo store,
 * so the site keeps working while the backend is being set up.
 */
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
    throw new Error(detail || 'Something went wrong. Please try again or call the clinic.');
  }
  return data;
}

export const registerPatientApi = (form) =>
  post('/api/patients', {
    name: form.name.trim(),
    age: Number(form.age),
    sex: form.sex,
    phone: form.phone,
    address: form.address.trim(),
    referral: form.referral || null,
    referral_name: form.referralName || null,
    profession: form.profession || null,
    conditions: form.conditions,
    condition_notes: form.conditionNotes,
    pregnant: form.pregnant || null,
    complaint: form.complaint.trim(),
  });

export const bookAppointmentApi = (form) =>
  post('/api/appointments', {
    patient_id: form.patientId || null,
    name: form.name.trim(),
    phone: form.phone,
    date: form.date,
    slot: form.slot,
    reason: form.reason || null,
    notes: form.notes || null,
  });

export async function lookupPatientApi(patientId) {
  const res = await fetch(`${BASE}/api/patients/lookup/${encodeURIComponent(patientId)}`);
  if (!res.ok) return null;
  return res.json();
}
