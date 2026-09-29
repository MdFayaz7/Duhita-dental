/** Duhita AI's own small server — the same one the app talks to. */
import { AI_BASE } from './patientApi';

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Duhita AI is unavailable right now (${res.status}).`);
  return data;
}

/** Typed turn: history ends with the new user message. */
export async function respond(messages, lang) {
  const res = await fetch(`${AI_BASE}/api/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, speak: true, lang }),
  }).catch(() => {
    throw new Error("Can't reach Duhita AI. Please check your connection.");
  });
  return parse(res);
}

/** Voice turn: the server transcribes the recording and replies in one round trip. */
export async function talk(blob, history, lang) {
  const form = new FormData();
  form.append('audio', blob, 'speech.webm');
  form.append('history', JSON.stringify(history));
  form.append('lang', lang);
  const res = await fetch(`${AI_BASE}/api/talk`, { method: 'POST', body: form }).catch(() => {
    throw new Error("Can't reach Duhita AI. Please check your connection.");
  });
  return parse(res);
}
