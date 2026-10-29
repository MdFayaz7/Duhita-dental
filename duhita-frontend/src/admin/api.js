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

/** POST a FormData with upload progress (fetch can't report upload progress). */
export function uploadWithProgress(path, form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}${path}`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || '{}'); } catch { /* non-JSON */ }
      if (xhr.status === 401) {
        setToken(null);
        location.assign('/admin/login');
        return reject(new ApiError('Session expired. Please sign in again.', 401));
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
      reject(new ApiError(detail || `Upload failed (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('Network error — check your connection and try again.', 0));
    xhr.send(form);
  });
}

export const api = {
  base: BASE,
  /** Files stored by the API (or legacy /uploads) live on the API host, not the website. */
  url: (path) => (path?.startsWith('/api/files/') || path?.startsWith('/uploads/') ? `${BASE}${path}` : path),

  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => request('/api/auth/me'),
  changePassword: (password) => request('/api/auth/change-password', { method: 'POST', body: { username: '', password } }),

  overview: () => request('/api/stats/overview'),

  dashboard: () => request('/api/stats/dashboard'),

  patients: (params = {}) => request(`/api/patients?${new URLSearchParams(params)}`),
  patient: (patientId) => request(`/api/patients/${patientId}`),
  importPreview: (form) => request('/api/patients/import/preview', { method: 'POST', form }),
  importCommit: (form) => request('/api/patients/import/commit', { method: 'POST', form }),
  deletePatient: (patientId) => request(`/api/patients/${patientId}`, { method: 'DELETE' }),
  addPatientRecord: (patientId, form) => request(`/api/patients/${patientId}/records`, { method: 'POST', form }),
  deletePatientRecord: (patientId, recordId) => request(`/api/patients/${patientId}/records/${recordId}`, { method: 'DELETE' }),

  appointments: (params = {}) => request(`/api/appointments?${new URLSearchParams(params)}`),
  calendar: (params) => request(`/api/appointments/calendar?${new URLSearchParams(params)}`),
  bookAppointment: (body) => request('/api/appointments/admin', { method: 'POST', body }),
  clinicHours: () => request('/api/clinic/hours', { auth: false }),
  updateAppointment: (id, body) => request(`/api/appointments/${id}`, { method: 'PATCH', body }),
  deleteAppointment: (id) => request(`/api/appointments/${id}`, { method: 'DELETE' }),

  schedule: (date) => request(`/api/schedule?date=${date}`),
  addSchedule: (body) => request('/api/schedule', { method: 'POST', body }),
  copySchedule: (date) => request(`/api/schedule/copy-appointments?date=${date}`, { method: 'POST' }),
  updateSchedule: (id, body) => request(`/api/schedule/${id}`, { method: 'PATCH', body }),
  deleteSchedule: (id) => request(`/api/schedule/${id}`, { method: 'DELETE' }),

  procedures: (all = false) => request(`/api/procedures${all ? '?include_inactive=true' : ''}`),
  addProcedure: (body) => request('/api/procedures', { method: 'POST', body }),
  updateProcedure: (id, body) => request(`/api/procedures/${id}`, { method: 'PATCH', body }),
  deleteProcedure: (id) => request(`/api/procedures/${id}`, { method: 'DELETE' }),

  invoices: (params = {}) => request(`/api/invoices?${new URLSearchParams(params)}`),
  invoice: (id) => request(`/api/invoices/${id}`),
  nextInvoiceNumber: () => request('/api/invoices/next-number'),
  createInvoice: (body) => request('/api/invoices', { method: 'POST', body }),
  updateInvoice: (id, body) => request(`/api/invoices/${id}`, { method: 'PUT', body }),
  cancelInvoice: (id) => request(`/api/invoices/${id}/cancel`, { method: 'POST' }),
  deleteInvoice: (id) => request(`/api/invoices/${id}`, { method: 'DELETE' }),
  addPayment: (invoiceId, body) => request(`/api/invoices/${invoiceId}/payments`, { method: 'POST', body }),
  payments: (params = {}) => request(`/api/payments?${new URLSearchParams(params)}`),
  deletePayment: (id) => request(`/api/payments/${id}`, { method: 'DELETE' }),
  patientBilling: (patientId) => request(`/api/patients/${patientId}/billing`),
  patientTimeline: (patientId) => request(`/api/patients/${patientId}/timeline`),

  practoSummary: () => request('/api/practo/summary'),
  practoPatients: (params = {}) => request(`/api/practo/patients?${new URLSearchParams(params)}`),
  practoPatient: (number) => request(`/api/practo/patients/${encodeURIComponent(number)}`),
  practoEdit: (kind, id, body) => request(`/api/practo/${kind}/${id}`, { method: 'PATCH', body }),
  practoDelete: (kind, id) => request(`/api/practo/${kind}/${id}`, { method: 'DELETE' }),
  practoClear: () => request('/api/practo', { method: 'DELETE' }),
  practoImport: (form) => request('/api/practo/import', { method: 'POST', form }),
  printout: () => request('/api/settings/printout'),
  savePrintout: (body) => request('/api/settings/printout', { method: 'PUT', body }),
  patientGroups: () => request('/api/patients/groups'),
  addPatient: (body) => request('/api/patients', { method: 'POST', body, auth: false }),
  updatePatient: (patientId, body) => request(`/api/patients/${patientId}`, { method: 'PATCH', body }),
  setShare: (patientId, section, on) => request(`/api/patients/${patientId}/share`, { method: 'PUT', body: { section, on } }),
  mergePatients: (keep, remove) => request('/api/patients/merge', { method: 'POST', body: { keep, remove } }),
  communications: (patientId) => request(`/api/patients/${patientId}/communications`),
  saveClinicHours: (week) => request('/api/clinic/hours', { method: 'PUT', body: { week } }),
  /** kind: vitals | notes | treatments | prescriptions */
  emr: (kind, params = {}) => request(`/api/emr/${kind}?${new URLSearchParams(params)}`),
  saveEmr: (kind, body, id) => request(`/api/emr/${kind}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body }),
  deleteEmr: (kind, id) => request(`/api/emr/${kind}/${id}`, { method: 'DELETE' }),
  completedProcedures: (params = {}) => request(`/api/emr/procedures/completed?${new URLSearchParams(params)}`),
  completeTreatments: (ids) => request('/api/emr/treatments/complete', { method: 'POST', body: { ids } }),
  billTreatments: (ids) => request('/api/emr/treatments/invoice', { method: 'POST', body: { ids } }),
  emrFiles: (params = {}) => request(`/api/emr/files?${new URLSearchParams(params)}`),
  terms: (kind) => request(`/api/emr/terms?kind=${kind}`),
  addTerm: (body) => request('/api/emr/terms', { method: 'POST', body }),
  updateTerm: (id, body) => request(`/api/emr/terms/${id}`, { method: 'PUT', body }),
  deleteTerm: (id) => request(`/api/emr/terms/${id}`, { method: 'DELETE' }),

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

  feedback: () => request('/api/feedback/all'),
  uploadFeedback: (form, onProgress) => uploadWithProgress('/api/feedback', form, onProgress),
  updateFeedback: (id, body) => request(`/api/feedback/${id}`, { method: 'PATCH', body }),
  reorderFeedback: (ids) => request('/api/feedback/reorder', { method: 'POST', body: ids }),
  deleteFeedback: (id) => request(`/api/feedback/${id}`, { method: 'DELETE' }),
};
