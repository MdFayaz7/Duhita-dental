import { EdgeTTS } from 'edge-tts-universal';

// Free Microsoft Edge neural voices (no key). Indian female voices by default.
const VOICES = {
  'en-IN': process.env.VOICE_EN ?? 'en-IN-NeerjaExpressiveNeural',
  'te-IN': process.env.VOICE_TE ?? 'te-IN-ShrutiNeural',
};
const RATE = process.env.VOICE_RATE ?? '+0%';
const PITCH = process.env.VOICE_PITCH ?? '+0Hz';

export const isTelugu = (text) => /[ఀ-౿]/.test(text);

/**
 * Text → mp3 (base64). Sentences are synthesized in parallel and joined (MP3 frames concatenate cleanly),
 * so a 3-sentence reply takes about as long as its longest sentence.
 */
export async function synthesize(text) {
  const lang = isTelugu(text) ? 'te-IN' : 'en-IN';
  const sentences = text.match(/[^.!?।]+[.!?।]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const parts = await Promise.all(
    sentences.map(async (s) => {
      const r = await new EdgeTTS(s, VOICES[lang], { rate: RATE, pitch: PITCH }).synthesize();
      return Buffer.from(await r.audio.arrayBuffer());
    }),
  );
  return { audio: Buffer.concat(parts).toString('base64'), mime: 'audio/mpeg', lang };
}
