import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { uploadFile } from './upload';

export type Role = 'user' | 'assistant';
export type ChatMessage = { id: string; role: Role; content: string };

/** Spoken reply: mp3 audio (base64) plus word timings. The avatar lip-syncs from the audio itself. */
export type Speech = {
  audio: string;
  mime: string;
  lang: 'en-IN' | 'te-IN';
  words?: { text: string; start: number; dur: number }[];
};

// In dev, reach the backend on the same machine that serves the JS bundle.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (devHost ? `http://${devHost}:8787` : 'http://localhost:8787');
const headers: Record<string, string> = process.env.EXPO_PUBLIC_APP_TOKEN
  ? { 'x-app-token': process.env.EXPO_PUBLIC_APP_TOKEN }
  : {};

async function call<T>(path: string, init: RequestInit, timeoutMs = 60_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...headers, ...init.headers }, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? `Server error ${res.status}`);
    return data as T;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('The server took too long to respond.');
    if (e instanceof TypeError) throw new Error(`Can't reach the server at ${API_URL}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const getHealth = () => call<{ ok: boolean; llm: boolean }>('/health', { method: 'GET' }, 8_000);

export const respond = (history: ChatMessage[], speak: boolean, lang: 'en-IN' | 'te-IN') =>
  call<{ reply: string; speech?: Speech; ttsError?: string }>('/api/respond', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), speak, lang }),
  });

/** Voice turn: the server transcribes the recording and replies in one round trip. */
export async function talk(uri: string, history: ChatMessage[], lang: 'en-IN' | 'te-IN') {
  const web = Platform.OS === 'web';
  return uploadFile<{ heard: string; reply: string; lang: 'en-IN' | 'te-IN'; speech?: Speech; ttsError?: string }>(
    `${API_URL}/api/talk`,
    { uri, name: web ? 'speech.webm' : 'speech.m4a', type: web ? 'audio/webm' : 'audio/m4a' },
    {
      field: 'audio',
      fields: {
        history: JSON.stringify(history.map(({ role, content }) => ({ role, content }))),
        lang,
      },
      headers,
    },
  );
}
