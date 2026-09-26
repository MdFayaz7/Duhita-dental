// LLM providers (all free keys), tried in order until one answers:
//   English: Groq (≈0.5 s) → Gemini → OpenRouter
//   Telugu:  Gemini (best Telugu) → Groq → OpenRouter
const env = process.env;
const list = (v, d) => (v ?? d).split(',').map((s) => s.trim()).filter(Boolean);

const PROVIDERS = [
  {
    name: 'gemini',
    key: () => env.GEMINI_API_KEY,
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    // Hedged (see hedge()): latency swings with Google's load and each model has its own free quota.
    // Free tier is ~20 requests/day per model, so all free Flash models are used (fastest first).
    models: list(env.GEMINI_MODELS, 'gemini-3.6-flash,gemini-3-flash-preview,gemini-3.5-flash,gemini-3.8-flash,gemini-3.7-flash'),
    race: true,
    extra: { reasoning_effort: env.GEMINI_REASONING ?? 'minimal' },
  },
  {
    name: 'groq',
    key: () => env.GROQ_API_KEY,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: list(env.GROQ_MODELS, 'openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b'),
    modelsTe: list(env.GROQ_MODELS_TE, 'qwen/qwen3.8-27b,openai/gpt-oss-120b'),
    extra: { reasoning_effort: 'low' },
  },
  {
    name: 'openrouter',
    key: () => env.OPENROUTER_API_KEY,
    url: 'https://openrouter.ai/api/v1/chat/completions',
    // Ranked by a Telugu/English benchmark of all free models (2026-09-25). Gemma/Qwen are best but often
    // rate-limited (they fail in <1 s, so trying them first costs little); nex-n2.5-pro has the best Telugu but is slow.
    models: list(env.OPENROUTER_MODELS, 'google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,qwen/qwen3.8-27b:free,nex-agi/nex-n2.5-mini:free,nvidia/nemotron-3-super-120b-a12b:free'),
    modelsTe: list(env.OPENROUTER_MODELS_TE, 'google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,qwen/qwen3.8-27b:free,nex-agi/nex-n2.5-mini:free,nvidia/nemotron-3-ultra-550b-a55b:free,nex-agi/nex-n2.5-pro:free'),
    extra: { reasoning: { effort: 'low', exclude: true } },
  },
];

const CLINIC = env.CLINIC_NAME ?? 'Duhita Dental Care';
const CITY = env.CLINIC_CITY ?? 'Vijayawada';
const CLINIC_TE = env.CLINIC_NAME_TE ?? 'విజయవాడలోని దుహిత డెంటల్ కేర్';

const SYSTEM = `You are Duhita AI, a senior dental surgeon (MDS, 15 years in clinical practice in Andhra Pradesh) doing a voice consultation through a talking avatar. You talk exactly like an experienced, kind dentist in the chair: you listen, ask smart questions, explain clearly, reassure, and give real, practical advice. You are the dentist the patient is talking to, not a receptionist and not a search engine.

CONSULTATION FLOW (follow it across turns; read the whole conversation first and never ask something the patient already told you):
1. Chief complaint: acknowledge it with empathy in a few words, then ask the single most useful question.
2. History (one or two short questions per turn, only what changes your advice): which tooth or area, since when, type of pain (sharp, throbbing, dull), what triggers it (cold, sweet, chewing, lying down), does it linger, night pain, gum swelling or pus, bad taste, fever, mouth opening, recent dental work.
3. Assessment: once you have 2 or 3 key facts, tell them what it most likely is in simple words ("this sounds like...", "most likely...") and why, briefly.
4. Plan for today: concrete steps they can do at home right now. Examples: warm salt-water rinses 3 to 4 times a day, cleaning the gum flap gently, a desensitising toothpaste, avoiding chewing on that side, a cold compress for swelling, common over-the-counter pain relief such as paracetamol or ibuprofen as per the pack if they have no allergy, ulcer or kidney problem.
5. Follow-up: tell them what to watch for, and invite them to ask anything else.

WHEN TO REFER (only then):
- Refer ONLY if clinical treatment is truly required and home care cannot solve it: for example deep decay or nerve pain that lingers or wakes them at night (needs a filling or root canal), an abscess or pus, a partially erupted wisdom tooth with swelling or limited mouth opening, a broken or knocked-out tooth, loose teeth, bleeding gums that did not improve after two weeks of good brushing, or anything that needs an X-ray.
- When you refer, recommend exactly this clinic: "${CLINIC}, ${CITY}". Say why the visit is needed, what they will likely do (for example an X-ray and cleaning, a filling, a root canal, wisdom tooth removal), and how soon (today, within 2 or 3 days, or at a routine check-up). Mention the clinic at most once in the conversation unless the patient asks again.
- Never refer in your first reply unless there are danger signs. Never refer for things home care handles (mild sensitivity, bleeding gums on the first mention, food stuck, mild ulcers, brushing questions).
- Danger signs (swelling spreading to the eye, neck or under the jaw, trouble breathing or swallowing, cannot open the mouth, high fever, heavy bleeding that will not stop, jaw injury, knocked-out tooth): tell them calmly but clearly to go to the nearest hospital emergency or ${CLINIC} immediately.
- Never prescribe antibiotics or prescription medicines or doses; say the dentist will decide after examining.

HOW YOU SPEAK (this is read aloud):
- 2 or 3 short, natural spoken sentences, under 45 words. Warm, confident, never robotic. Vary your openings; do not start every reply with sympathy words.
- Plain speech only: no lists, markdown, emojis, symbols or URLs.
- Reply in simple Indian English unless told to use Telugu.
- Understand dental terms and tooth numbering: "lower seven eight" means the lower second and third molars (the wisdom tooth area); "upper six" is the upper first molar.
- Politely steer non-dental topics back to oral health.

EXAMPLE CONSULTATION (style only; do not copy the words):
Patient: My lower back tooth is paining a lot.
Duhita AI: That sounds really uncomfortable. Is it the very last tooth at the back, and does the gum around it look swollen?
Patient: Yes, the last one, gum is swollen, since two days. Opening mouth is a bit tight.
Duhita AI: This is most likely a gum infection around a wisdom tooth that is still coming out, we call it pericoronitis. Rinse with warm salt water four times a day and keep that area clean; paracetamol as per the pack will ease the pain.
Patient: Will it go by itself?
Duhita AI: The rinses often calm it in a day or two, but since your mouth opening is tight, the flap needs a proper clean and an X-ray. Please visit ${CLINIC}, ${CITY} within two days; if the swelling spreads to your cheek or neck, go the same day.

Patient: My teeth feel sensitive with cold water.
Duhita AI: Is it a quick sharp zing that goes away in a few seconds, or does the pain linger after the cold is gone?
Patient: Goes away quickly.
Duhita AI: That is typical dentine sensitivity, usually from enamel wear or slight gum recession. Use a desensitising toothpaste like Sensodyne twice daily, brush gently with a soft brush, and dab a little paste on the area at night; it should improve in two weeks.`;

const TELUGU_RULE = `The patient is speaking Telugu. Reply ONLY in natural, grammatically correct spoken Telugu in Telugu script (తెలుగు లిపి), the way a friendly Vijayawada dentist talks to patients, using everyday words people actually say. Never use English letters; common words people say in English (root canal, cavity, wisdom tooth, X-ray, paracetamol) may be written in Telugu script. Keep it to 2 or 3 short sentences. When you refer, say "${CLINIC_TE}".`;

// Emergency words (English + Telugu) that justify an immediate referral even in the first reply.
const DANGER = /swell.*(eye|neck|throat)|breath|swallow|can'?t open|high fever|bleeding.*(stop|heavy)|knocked|accident|jaw.*(broke|fracture)|శ్వాస|మింగ|జ్వరం ఎక్కువ|దవడ విరిగ|రక్తం ఆగడం లేదు/i;

export const isTeluguScript = (t) => /[ఀ-౿]/.test(t);

export const available = () => PROVIDERS.filter((p) => p.key()).map((p) => p.name);
export const modelName = PROVIDERS.filter((p) => p.key()).map((p) => `${p.name}:${p.models[0]}`).join(' → ') || 'none';


/**
 * Hedged requests: start the first model; if it hasn't answered within `delayMs` (or fails),
 * also start the next one. First valid answer wins and the rest are cancelled.
 * Keeps latency low without spending free quota on every model for every question.
 */
// Models that hit their quota are skipped until the cooldown ends (daily quota → 1 h, per-minute → 1 min).
const cooldownUntil = new Map();
const available_ = (models) => {
  const now = Date.now();
  const ok = models.filter((m) => (cooldownUntil.get(m) ?? 0) < now);
  return ok.length ? ok : models; // all cooling down: try anyway
};
function noteFailure(model, e) {
  if (e.status === 429 || /quota|rate.?limit/i.test(e.message)) cooldownUntil.set(model, Date.now() + (/per ?day|daily/i.test(e.message) ? 3_600_000 : 60_000));
}

function hedge(allModels, run, delayMs = 3500) {
  const models = available_(allModels);
  const ctrl = new AbortController();
  return new Promise((resolve, reject) => {
    const errors = [];
    let started = 0;
    let settled = false;
    let timer;
    const next = () => {
      if (settled || started >= models.length) return;
      const model = models[started++];
      clearTimeout(timer);
      timer = setTimeout(next, delayMs);
      run(model, ctrl.signal).then(
        (v) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          ctrl.abort();
          resolve(v);
        },
        (e) => {
          if (settled) return; // cancelled after another model answered
          noteFailure(model, e);
          errors.push(e);
          console.warn(`[LLM] ${e.message.slice(0, 160)}`);
          if (errors.length === models.length) {
            settled = true;
            clearTimeout(timer);
            reject(errors[0]);
          } else next(); // failed fast: try the next model right away
        },
      );
    };
    next();
  });
}

async function complete(provider, model, messages, telugu, signal) {
  const res = await fetch(provider.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${provider.key()}`, 'content-type': 'application/json', 'x-title': 'Duhita AI Dental Assistant' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: telugu ? `${SYSTEM}\n\n${TELUGU_RULE}` : SYSTEM }, ...messages],
      max_tokens: 2000, // Telugu uses many tokens; low limits cut replies off
      temperature: 0.4,
      ...provider.extra,
    }),
    signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(signal ? [signal] : [])]),
  });
  const data = await res.json().catch(() => ({}));
  const err = Array.isArray(data) ? data[0]?.error : data.error;
  if (!res.ok || err) {
    const quotaId = (err?.details ?? []).flatMap((d) => d.violations ?? []).map((v) => v.quotaId).join(' ');
    const msg = `${err?.metadata?.raw ?? err?.message ?? `HTTP ${res.status}`} ${quotaId.includes('PerDay') ? '(per day quota)' : ''}`;
    throw Object.assign(new Error(`${provider.name}/${model}: ${msg}`), { status: err?.code ?? res.status });
  }
  const choice = data.choices?.[0];
  const text = choice?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, '').trim(); // some open models inline their reasoning
  if (choice?.finish_reason === 'length') throw new Error(`${provider.name}/${model}: reply cut off`);
  if (!text) throw new Error(`${provider.name}/${model}: empty reply`);
  // Reject replies that drift into other scripts, or English when Telugu was required.
  if (/[Ѐ-ӿ؀-ۿ぀-ヿ一-鿿가-힯]/.test(text)) throw new Error(`${provider.name}/${model}: garbled reply`);
  if (telugu && !isTeluguScript(text)) throw new Error(`${provider.name}/${model}: not in Telugu script`);
  return text.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ');
}

/**
 * @param {{role:'user'|'assistant', content:string}[]} messages
 * @param {'en-IN'|'te-IN'} [lang] language the patient chose / spoke
 */
export async function reply(messages, lang) {
  const telugu = lang === 'te-IN' || isTeluguScript(messages.at(-1)?.content ?? '');
  // First reply of a consultation: understand the problem before advising a visit.
  if (!messages.some((m) => m.role === 'assistant') && !DANGER.test(messages.at(-1)?.content ?? '')) {
    messages = [...messages.slice(0, -1), { ...messages.at(-1), content: `${messages.at(-1).content}\n\n[Note to Duhita AI: this is your first reply. Show empathy, give one quick relief tip if useful, and ask 1 or 2 focused questions. Do not mention the clinic or a dentist visit yet.]` }];
  }
  let lastErr = new Error('No LLM provider configured (set GEMINI_API_KEY or OPENROUTER_API_KEY)');
  const order = telugu ? ['gemini', 'groq', 'openrouter'] : ['groq', 'gemini', 'openrouter'];
  for (const provider of order.map((n) => PROVIDERS.find((p) => p.name === n))) {
    if (!provider?.key()) continue;
    const models = (telugu && provider.modelsTe) || provider.models;
    if (provider.race) {
      try {
        return await hedge(models, (m, signal) => complete(provider, m, messages, telugu, signal));
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    for (const model of models) {
      try {
        return await complete(provider, model, messages, telugu);
      } catch (e) {
        lastErr = e;
        console.warn(`[LLM] ${e.message.slice(0, 140)}`);
        if (e.status === 401 || e.status === 403) break; // bad key: skip this provider
      }
    }
  }
  throw lastErr;
}

// ---------- Voice turn: audio in → { heard, reply } in a single Gemini call ----------

const TALK_RULES = `The last user message is a voice recording from the patient (English, Telugu, or a mix).
Return JSON only: {"heard": "<exact transcript of what the patient said, Telugu words in Telugu script>", "lang": "te" or "en", "reply": "<your spoken reply>"}.
If the patient spoke Telugu (even mixed with English), "lang" is "te" and "reply" must be natural spoken Telugu in Telugu script.
If the recording is silent or unclear, set "heard" to "" and "reply" to a short request to repeat.`;

/**
 * @param {{role:'user'|'assistant', content:string}[]} history earlier turns (text)
 * @param {string} audioMp3 base64 mp3 of the patient's question
 * @param {'en-IN'|'te-IN'} hint language the patient selected
 */
export async function talk(history, audioMp3, hint) {
  const gemini = PROVIDERS.find((p) => p.name === 'gemini');
  if (!gemini?.key()) throw new Error('Voice input needs GEMINI_API_KEY');
  const system = `${SYSTEM}\n\n${TALK_RULES}${hint === 'te-IN' ? '\nThe patient selected Telugu, so expect Telugu speech.' : ''}`;
  const messages = [
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: [{ type: 'input_audio', input_audio: { data: audioMp3, format: 'mp3' } }] },
  ];
  const one = async (model, signal) => {
    const res = await fetch(gemini.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${gemini.key()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: 1000, temperature: 0.3, response_format: { type: 'json_object' }, ...gemini.extra }),
      signal: AbortSignal.any([AbortSignal.timeout(25_000), signal]),
    });
    const data = await res.json().catch(() => ({}));
    const err = Array.isArray(data) ? data[0]?.error : data.error;
    const perDay = JSON.stringify(err?.details ?? '').includes('PerDay') ? ' (per day quota)' : '';
    if (!res.ok || err) throw Object.assign(new Error(`gemini/${model}: ${err?.message ?? res.status}${perDay}`), { status: err?.code ?? res.status });
    const raw = data.choices?.[0]?.message?.content ?? '';
    let out;
    try {
      out = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim());
    } catch {
      throw new Error(`gemini/${model}: bad JSON`);
    }
    const reply = String(out.reply ?? '').replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();
    if (!reply) throw new Error(`gemini/${model}: empty reply`);
    if (out.lang === 'te' && !isTeluguScript(reply)) throw new Error(`gemini/${model}: reply not in Telugu script`);
    return { heard: String(out.heard ?? '').trim(), reply, lang: out.lang === 'te' ? 'te-IN' : 'en-IN' };
  };
  return hedge(gemini.models, one);
}
