import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { reply, talk, modelName, available } from './llm.js';
import { toMp3Base64 } from './audio.js';
import { transcribe, sttAvailable } from './stt.js';
import { synthesize } from './voice.js';

const PORT = Number(process.env.PORT ?? 8787);
const APP_TOKEN = process.env.APP_TOKEN; // optional shared secret sent by the app
const MAX_TURNS = 12;
const MAX_CHARS = 1500;

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.use(express.json({ limit: '64kb' }));

// CORS for the web build (native apps don't need it).
app.use((req, res, next) => {
  res.set({ 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, x-app-token' });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Avatar page loaded by the app's WebView.
app.use(
  '/avatar',
  express.static(fileURLToPath(new URL('./public', import.meta.url)), {
    setHeaders: (res, path) => res.set('cache-control', path.endsWith('.png') ? 'public, max-age=604800' : 'no-cache'),
  }),
);

// Optional token + tiny per-IP rate limit (30 req/min).
const hits = new Map();
app.use('/api', (req, res, next) => {
  if (APP_TOKEN && req.get('x-app-token') !== APP_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  const now = Date.now();
  const recent = (hits.get(req.ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 30) return res.status(429).json({ error: 'Too many requests, please wait a moment.' });
  recent.push(now);
  hits.set(req.ip, recent);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, model: modelName, llm: available().length > 0, stt: sttAvailable() ? 'groq' : 'gemini' }));

/** Keep only well-formed alternating turns ending with the user. */
function sanitize(messages) {
  const out = [];
  for (const m of Array.isArray(messages) ? messages.slice(-MAX_TURNS) : []) {
    if ((m?.role !== 'user' && m?.role !== 'assistant') || typeof m.content !== 'string') continue;
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    if (out.length && out.at(-1).role === m.role) out.at(-1).content += `\n${content}`;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out.at(-1)?.role === 'user' ? out : [];
}

// Conversation → short reply + speech audio.
app.post('/api/respond', async (req, res) => {
  const messages = sanitize(req.body?.messages);
  if (!messages.length) return res.status(400).json({ error: 'messages must end with a user turn' });
  if (!available().length) return res.status(503).json({ error: 'Server has no AI key (set GEMINI_API_KEY or OPENROUTER_API_KEY).' });
  let text;
  try {
    text = await reply(messages, req.body?.lang === 'te-IN' ? 'te-IN' : 'en-IN');
  } catch (e) {
    console.error('[LLM]', e.message);
    return res.status(502).json({ error: 'The AI is busy right now. Please try again in a moment.' });
  }
  if (req.body?.speak === false) return res.json({ reply: text });
  try {
    res.json({ reply: text, speech: await synthesize(text) });
  } catch (e) {
    console.error('[TTS]', e.message);
    res.json({ reply: text, ttsError: 'Voice unavailable right now.' });
  }
});

// Voice turn: recording in → transcript + reply + speech out (one round trip).
app.post('/api/talk', upload.single('audio'), async (req, res) => {
  if (!req.file?.buffer?.length) return res.status(400).json({ error: 'audio missing' });
  let history = [];
  try {
    history = sanitize([...JSON.parse(req.body?.history ?? '[]'), { role: 'user', content: '.' }]).slice(0, -1);
  } catch {}
  const hint = req.body?.lang === 'te-IN' ? 'te-IN' : 'en-IN';
  let result;
  try {
    // Fast path: Groq Whisper (~0.5 s) then a text reply. Fallback: Gemini hears and replies in one call.
    let heard = null;
    if (sttAvailable()) {
      try {
        heard = await transcribe(req.file.buffer, req.file.mimetype, hint);
      } catch (e) {
        console.warn('[stt]', e.message);
      }
    }
    if (heard && !heard.text) result = { heard: '', reply: hint === 'te-IN' ? 'క్షమించండి, సరిగ్గా వినపడలేదు. మళ్ళీ ఒకసారి చెప్తారా?' : "Sorry, I couldn't hear that clearly. Could you say it again?", lang: hint };
    else if (heard) result = { heard: heard.text, reply: await reply([...history, { role: 'user', content: heard.text }], heard.lang), lang: heard.lang };
    else result = await talk(history, await toMp3Base64(req.file.buffer), hint);
  } catch (e) {
    console.error('[talk]', e.message);
    const quota = /quota|rate.?limit|429/i.test(e.message);
    return res.status(quota ? 429 : 502).json({
      error: /GEMINI_API_KEY/.test(e.message) ? e.message : quota ? 'Free Gemini limit reached. Please wait a minute and try again.' : "Sorry, I couldn't process that. Please try again.",
    });
  }
  try {
    res.json({ ...result, speech: await synthesize(result.reply) });
  } catch (e) {
    console.error('[TTS]', e.message);
    res.json({ ...result, ttsError: 'Voice unavailable right now.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Duhita AI server on :${PORT}  llm=${modelName}`);
  if (!available().length) console.warn('⚠ Set GEMINI_API_KEY (free: https://aistudio.google.com/apikey) or OPENROUTER_API_KEY in server/.env');
});
