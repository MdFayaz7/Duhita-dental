const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'duhita.admin.token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode — the session simply won't persist */
  }
};

/** Thrown for any non-2xx response so callers can show the server's message. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {};
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined),
  });

  if (res.status === 401 && auth) {
    setToken(null);
    if (!location.pathname.endsWith('/admin/login')) location.assign('/admin/login');
    throw new ApiError('Session expired. Please sign in again.', 401);
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = Array.isArray(data.detail) ? data.detail[0]?.msg || detail : data.detail || detail;
    } catch { /* non-JSON error body */ }
    throw new ApiError(detail, res.status);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  base: BASE,
  url: (path) => (path?.startsWith('/uploads') ? `${BASE}${path}` : path),

  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => request('/api/auth/me'),
  changePassword: (password) => request('/api/auth/change-password', { method: 'POST', body: { username: '', password } }),

  overview: () => request('/api/stats/overview'),

  dashboard: () => request('/api/stats/dashboard'),

  patients: (params = {}) => request(`/api/patients?${new URLSearchParams(params)}`),
  patient: (patientId) => request(`/api/patients/${patientId}`),
  deletePatient: (patientId) => request(`/api/patients/${patientId}`, { method: 'DELETE' }),

  appointments: (params = {}) => request(`/api/appointments?${new URLSearchParams(params)}`),
  updateAppointment: (id, body) => request(`/api/appointments/${id}`, { method: 'PATCH', body }),
  deleteAppointment: (id) => request(`/api/appointments/${id}`, { method: 'DELETE' }),

  schedule: (date) => request(`/api/schedule?date=${date}`),
  addSchedule: (body) => request('/api/schedule', { method: 'POST', body }),
  copySchedule: (date) => request(`/api/schedule/copy-appointments?date=${date}`, { method: 'POST' }),
  updateSchedule: (id, body) => request(`/api/schedule/${id}`, { method: 'PATCH', body }),
  deleteSchedule: (id) => request(`/api/schedule/${id}`, { method: 'DELETE' }),

  doctors: () => request('/api/doctors?include_inactive=true'),
  addDoctor: (body) => request('/api/doctors', { method: 'POST', body }),
  updateDoctor: (id, body) => request(`/api/doctors/${id}`, { method: 'PATCH', body }),
  deleteDoctor: (id) => request(`/api/doctors/${id}`, { method: 'DELETE' }),
  doctorPhoto: (id, form) => request(`/api/doctors/${id}/photo`, { method: 'POST', form }),

  research: () => request('/api/research'),
  addResearch: (form) => request('/api/research', { method: 'POST', form }),
  updateResearch: (id, form) => request(`/api/research/${id}`, { method: 'PATCH', form }),
  deleteResearch: (id) => request(`/api/research/${id}`, { method: 'DELETE' }),

  gallery: (category) => request(`/api/gallery?category=${category}`),
  addImage: (form) => request('/api/gallery', { method: 'POST', form }),
  updateImage: (id, body) => request(`/api/gallery/${id}`, { method: 'PATCH', body }),
  deleteImage: (id) => request(`/api/gallery/${id}`, { method: 'DELETE' }),
  reorderImages: (ids) => request('/api/gallery/reorder', { method: 'POST', body: ids }),
};
