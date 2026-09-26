// Speech-to-text with Groq Whisper large-v3 (free key, ~0.5 s). The "turbo" variant misdetects Telugu as Tamil.
const URL_ = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODEL = process.env.GROQ_STT_MODEL ?? 'whisper-large-v3';

export const sttAvailable = () => !!process.env.GROQ_API_KEY;

/**
 * @param {Buffer} audio recording in any common format (m4a, webm, mp3, wav)
 * @param {string} mimetype
 * @param {'en-IN'|'te-IN'} hint language the patient selected (Telugu is pinned; English auto-detects)
 * @returns {Promise<{ text: string, lang: 'en-IN'|'te-IN' }>}
 */
export async function transcribe(audio, mimetype, hint) {
  const ext = /webm/.test(mimetype) ? 'webm' : /mp4|m4a|aac/.test(mimetype) ? 'm4a' : /wav/.test(mimetype) ? 'wav' : /mpeg|mp3/.test(mimetype) ? 'mp3' : 'webm';
  const form = new FormData();
  form.append('file', new Blob([audio], { type: mimetype || 'audio/webm' }), `speech.${ext}`);
  form.append('model', MODEL);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  if (hint === 'te-IN') form.append('language', 'te');
  // Vocabulary hint improves dental terms in both languages.
  form.append('prompt', 'Dental consultation. Tooth pain, gums, cavity, root canal, wisdom tooth, lower seven eight, పంటి నొప్పి, చిగుళ్ళు.');
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`groq-stt: ${data?.error?.message ?? res.status}`), { status: res.status });
  const text = String(data.text ?? '').trim();
  const lang = /telugu/i.test(data.language ?? '') || /[ఀ-౿]/.test(text) ? 'te-IN' : 'en-IN';
  return { text, lang };
}
