/**
 * The clinic's patient API — the same backend the app uses (register, login,
 * profile, appointments, records). Nothing here is new on the server; this
 * just gives the website a client for endpoints that already work and are
 * already tested via the app.
 */
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
// Duhita AI has her own small server, separate from the clinic API.
const AI_BASE = (import.meta.env.VITE_AI_URL || 'http://localhost:8787').replace(/\/+$/, '');

export { AI_BASE };

/** Turns a stored path (/api/files/…) into a full URL on the clinic API. */
export const fileUrl = (path) =>
  path && (path.startsWith('/api/files/') || path.startsWith('/uploads/')) ? `${BASE}${path}` : path;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function detail(data) {
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) return data.detail[0]?.msg?.replace(/^Value error, /, '');
  return undefined;
}

async function call(path, { token, body, method, headers } = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      ...(isForm ? {} : body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new ApiError('No connection to the clinic server.', 0);
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(detail(data) || `Something went wrong (${res.status}).`, res.status);
  return data;
}

// ---------------------------------------------------------------- account

export const checkNumber = (phone) => call(`/api/app/check?phone=${phone}`);
export const register = (body) => call('/api/app/register', { body });
export const login = (phone, password) => call('/api/app/login', { body: { phone, password } });
export const getProfile = (token) => call('/api/app/me', { token });
export const updateProfile = (token, body) => call('/api/app/me', { token, method: 'PATCH', body });
export const changePassword = (token, current_password, new_password) =>
  call('/api/app/me/password', { token, body: { current_password, new_password } });

export const uploadPhoto = (token, file) => {
  const form = new FormData();
  form.append('file', file);
  return call('/api/app/me/photo', { token, body: form });
};
export const removePhoto = (token) => call('/api/app/me/photo', { token, method: 'DELETE' });

// ---------------------------------------------------------------- records

export const myRecords = (token) => call('/api/app/me/records', { token });
export const addRecord = (token, { kind, title, notes, date, file }) => {
  const form = new FormData();
  form.append('kind', kind);
  form.append('title', title);
  if (notes) form.append('notes', notes);
  if (date) form.append('date', date);
  if (file) form.append('file', file);
  return call('/api/app/me/records', { token, body: form });
};
export const deleteRecord = (token, id) => call(`/api/app/me/records/${id}`, { token, method: 'DELETE' });

// ---------------------------------------------------------------- appointments

export const getSlots = (date) => call(`/api/app/slots?date=${date}`);
export const myAppointments = (token) => call('/api/app/me/appointments', { token });
export const bookAppointment = (token, body) => call('/api/app/me/appointments', { token, body });
export const cancelAppointment = (token, id) => call(`/api/app/me/appointments/${id}/cancel`, { token, method: 'POST' });

// ---------------------------------------------------------------- helpers

export const formatSlot = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const formatDate = (iso, long = false) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Today in the clinic's timezone (IST), as YYYY-MM-DD. */
export const todayIso = () => {
  const now = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60_000);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
