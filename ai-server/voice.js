import { EdgeTTS } from 'edge-tts-universal';
import { pcmToMp3Base64 } from './audio.js';

// Free Microsoft Edge neural voices (no key). Indian female voices by default.
const VOICES = {
  'en-IN': process.env.VOICE_EN ?? 'en-IN-NeerjaExpressiveNeural',
  'te-IN': process.env.VOICE_TE ?? 'te-IN-ShrutiNeural',
};
const RATE = process.env.VOICE_RATE ?? '+0%';
const PITCH = process.env.VOICE_PITCH ?? '+0Hz';
// Edge's free endpoint sometimes accepts the socket and never answers; give up so the text reply still goes out.
const TTS_TIMEOUT_MS = Number(process.env.TTS_TIMEOUT_MS ?? 5000);
// When Edge fails, use Gemini's voice and leave Edge alone for a while instead of waiting on it every reply.
const EDGE_RETRY_MS = 10 * 60 * 1000;
let edgeDownUntil = 0;
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL ?? 'gemini-2.5-flash-preview-tts';
const GEMINI_VOICE = process.env.GEMINI_VOICE ?? 'Kore'; // warm, clear female voice

export const isTelugu = (text) => /[ఀ-౿]/.test(text);

/**
 * Text → mp3 (base64). Sentences are synthesized in parallel and joined (MP3 frames concatenate cleanly),
 * so a 3-sentence reply takes about as long as its longest sentence.
 */
async function edgeSynthesize(text) {
  const lang = isTelugu(text) ? 'te-IN' : 'en-IN';
  const sentences = text.match(/[^.!?।]+[.!?।]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`TTS timed out after ${TTS_TIMEOUT_MS} ms`)), TTS_TIMEOUT_MS); });
  const parts = await Promise.race([timeout, Promise.all(
    sentences.map(async (s) => {
      const r = await new EdgeTTS(s, VOICES[lang], { rate: RATE, pitch: PITCH }).synthesize();
      return Buffer.from(await r.audio.arrayBuffer());
    }),
  )]).finally(() => clearTimeout(timer));
  return { audio: Buffer.concat(parts).toString('base64'), mime: 'audio/mpeg', lang };
}


/** Gemini text-to-speech (same API key as the chat model): PCM → mp3. */
async function geminiSynthesize(text, lang) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('no GEMINI_API_KEY for the fallback voice');
  const style = lang === 'te-IN' ? 'Say warmly and clearly, in natural Telugu:' : 'Say warmly and clearly, in a friendly Indian English accent:';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${style} ${text}` }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE } } } },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Gemini TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const part = (await res.json())?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error('Gemini TTS returned no audio');
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000);
  return { audio: await pcmToMp3Base64(Buffer.from(part.inlineData.data, 'base64'), rate), mime: 'audio/mpeg', lang };
}

/** Text → mp3 (base64): Microsoft Edge voice first, Gemini's voice when Edge is down. */
export async function synthesize(text) {
  const lang = isTelugu(text) ? 'te-IN' : 'en-IN';
  if (Date.now() >= edgeDownUntil) {
    try {
      return await edgeSynthesize(text);
    } catch (e) {
      edgeDownUntil = Date.now() + EDGE_RETRY_MS;
      console.warn('[tts] Edge voice failed, using Gemini for 10 min:', e.message);
    }
  }
  return geminiSynthesize(text, lang);
}
