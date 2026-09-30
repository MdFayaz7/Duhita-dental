/**
 * The clinic's own backend (the same one the website and the admin dashboard use).
 * Public content needs no sign-in; anything under /api/app/me needs the patient's token.
 */
import { Linking } from 'react-native';
import { uploadFile } from './upload';

// The clinic's API. Set EXPO_PUBLIC_CLINIC_API_URL to point at a laptop while developing.
export const CLINIC_API = process.env.EXPO_PUBLIC_CLINIC_API_URL ?? 'https://api.duhitadental.com';

export type MedicalRecord = {
  id: string;
  kind: 'prescription' | 'xray' | 'report' | 'note';
  title: string;
  notes?: string;
  date: string;
  file?: string | null;
  file_type?: 'image' | 'pdf' | null;
  added_by: 'clinic' | 'patient';
  doctor?: string;
};

export type Patient = {
  id: string;
  patient_id: string;
  name: string;
  phone: string;
  age?: number;
  sex?: 'Male' | 'Female' | 'Other';
  email?: string;
  address?: string;
  profession?: string;
  conditions?: string[];
  complaint?: string;
  photo?: string;
  allergies?: string;
  medications?: string;
  blood_group?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  created_at?: string;
};

export type Appointment = {
  id: string;
  patient_id?: string;
  name: string;
  phone: string;
  date: string;
  slot: string;
  doctor?: string;
  reason?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  created_at?: string;
};

export type SlotDay = {
  date: string;
  closed: boolean;
  sessions: { id: string; label: string; range: string; slots: { time: string; available: boolean }[] }[];
};

export type Doctor = { id: string; name: string; qualification?: string; role?: string; photo?: string; bio?: string };
export type GalleryImage = { id: string; src: string; caption?: string };
export type FeedbackClip = { id: string; src: string; poster?: string; patient_name?: string; caption?: string };

/** Turns the API's stored paths (/api/files/…) into full URLs. */
export const fileUrl = (path?: string) =>
  path && (path.startsWith('/api/files/') || path.startsWith('/uploads/')) ? `${CLINIC_API}${path}` : path;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init: RequestInit = {}, token?: string, timeoutMs = 20_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${CLINIC_API}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(detail(data) ?? `Something went wrong (${res.status}).`, res.status);
    return data as T;
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new ApiError('The clinic server took too long to answer. Please try again.', 0);
    }
    if (e instanceof TypeError) throw new ApiError('No connection to the clinic server.', 0);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** FastAPI puts the message in `detail`, which is a string or a list of field errors. */
function detail(data: any): string | undefined {
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) return data.detail[0]?.msg?.replace(/^Value error, /, '');
  return undefined;
}

// ---------------------------------------------------------------- account

export type Session = { access_token: string; patient: Patient };

export type RegisterInput = {
  name: string;
  phone: string;
  password: string;
  patient_id?: string;
  age?: number;
  sex?: Patient['sex'];
  email?: string;
  address?: string;
};

/** Is this number already known to the clinic, and does it have an app login yet? */
export const checkNumber = (phone: string) =>
  call<{ registered: boolean; has_login: boolean }>(`/api/app/check?phone=${phone}`, {}, undefined, 8_000);

export const register = (body: RegisterInput) =>
  call<Session>('/api/app/register', { method: 'POST', body: JSON.stringify(body) });

export const login = (phone: string, password: string) =>
  call<Session>('/api/app/login', { method: 'POST', body: JSON.stringify({ phone, password }) });

export const getProfile = (token: string) => call<Patient>('/api/app/me', {}, token);

export const updateProfile = (token: string, body: Partial<Patient>) =>
  call<Patient>('/api/app/me', { method: 'PATCH', body: JSON.stringify(body) }, token);

export const changePassword = (token: string, current_password: string, new_password: string) =>
  call<{ ok: boolean }>('/api/app/me/password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  }, token);

/** Upload a profile picture. */
export function uploadPhoto(token: string, uri: string) {
  const name = uri.split('/').pop() || 'photo.jpg';
  return uploadFile<{ photo: string }>(
    `${CLINIC_API}/api/app/me/photo`,
    { uri, name, type: mimeOf(name) },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

/** Best guess at a file's type from its name. */
const mimeOf = (name: string) => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

export const removePhoto = (token: string) =>
  call<{ ok: boolean }>('/api/app/me/photo', { method: 'DELETE' }, token);

// ---------------------------------------------------------------- records

export const myRecords = (token: string) =>
  call<{ items: MedicalRecord[] }>('/api/app/me/records', {}, token);

export async function addRecord(
  token: string,
  body: { kind: string; title: string; notes?: string; date?: string; fileUri?: string; fileName?: string },
): Promise<MedicalRecord> {
  const fields: Record<string, string> = { kind: body.kind, title: body.title };
  if (body.notes) fields.notes = body.notes;
  if (body.date) fields.date = body.date;
  const headers = { Authorization: `Bearer ${token}` };

  if (!body.fileUri) {
    // No attachment: a plain multipart post is enough.
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    const res = await fetch(`${CLINIC_API}/api/app/me/records`, { method: 'POST', body: form, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(detail(data) ?? `Could not save (${res.status}).`, res.status);
    return data as MedicalRecord;
  }

  const name = body.fileName || body.fileUri.split('/').pop() || 'file.jpg';
  return uploadFile<MedicalRecord>(
    `${CLINIC_API}/api/app/me/records`,
    { uri: body.fileUri, name, type: mimeOf(name) },
    { fields, headers },
  );
}

export const deleteRecord = (token: string, id: string) =>
  call<{ ok: boolean }>(`/api/app/me/records/${id}`, { method: 'DELETE' }, token);

// ---------------------------------------------------------------- appointments

export const getSlots = (date: string) => call<SlotDay>(`/api/app/slots?date=${date}`);

export const myAppointments = (token: string) =>
  call<{ upcoming: Appointment[]; past: Appointment[] }>('/api/app/me/appointments', {}, token);

export const bookAppointment = (
  token: string,
  body: { date: string; slot: string; reason?: string; notes?: string },
) => call<Appointment>('/api/app/me/appointments', { method: 'POST', body: JSON.stringify(body) }, token);

export const cancelAppointment = (token: string, id: string) =>
  call<Appointment>(`/api/app/me/appointments/${id}/cancel`, { method: 'POST' }, token);

// ---------------------------------------------------------------- public content

export const getDoctors = () => call<{ items: Doctor[] }>('/api/doctors');
export const getGallery = (category: 'clinic' | 'infrastructure' | 'camps') =>
  call<{ items: GalleryImage[] }>(`/api/gallery?category=${category}`);
export const getFeedback = () => call<{ items: FeedbackClip[] }>('/api/feedback');

/** Opens a stored file (a PDF, say) in the phone's own viewer. */
export const openFile = (path: string) => Linking.openURL(fileUrl(path) as string).catch(() => {});

// ---------------------------------------------------------------- helpers

/** "14:30" → "2:30 PM" */
export const formatSlot = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** "2026-09-28" → "Mon, 28 Sep" */
export const formatDate = (iso: string, long = false) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Today in the clinic's timezone, as YYYY-MM-DD. */
export const todayIso = () => {
  const now = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60_000);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
