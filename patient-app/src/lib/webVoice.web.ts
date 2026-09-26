// Web only: plays Duhita AI's replies with a plain <audio> element in the app's own page (the page the
// user taps), which every browser — including Safari — allows once it has been "unlocked" by a tap.
// Lip-sync is precomputed from the decoded audio (loudness + brightness per 20 ms frame) and streamed
// to the avatar iframe in time with playback.

type Drive = { speaking: boolean; level: number; vis: Record<string, number> };
type Frame = { level: number; bright: number };

const FRAME_S = 0.02;
const LEAD_S = 0.06; // lips move slightly before the sound, like real speech

let player: HTMLAudioElement | null = null;
let unlocked = false;
let raf = 0;
let objectUrl: string | null = null;

/** A few ms of silence as a WAV blob, used to unlock the <audio> element inside a user gesture. */
function silentWavUrl() {
  const rate = 8000;
  const n = 80;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function getPlayer() {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
    player.setAttribute('playsinline', '');
  }
  return player;
}

/** Call from any user tap: "blesses" the audio element so later replies can play without a tap. */
export function unlockWebAudio() {
  if (unlocked) return;
  const p = getPlayer();
  p.src = silentWavUrl();
  p.play()
    .then(() => {
      unlocked = true;
      p.pause();
    })
    .catch(() => {});
}

if (typeof window !== 'undefined') {
  const once = () => unlockWebAudio();
  window.addEventListener('pointerdown', once, { capture: true, passive: true });
  window.addEventListener('touchend', once, { capture: true, passive: true });
  window.addEventListener('keydown', once, { capture: true });
}

/** Decode the mp3 and compute a per-frame loudness / brightness envelope for lip-sync. */
async function envelope(bytes: Uint8Array): Promise<Frame[]> {
  const Offline = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const audio = await new Offline(1, 1, 22050).decodeAudioData(bytes.slice().buffer);
  const data = audio.getChannelData(0);
  const step = Math.round(audio.sampleRate * FRAME_S);
  const frames: Frame[] = [];
  for (let i = 0; i < data.length; i += step) {
    let sum = 0;
    let crossings = 0;
    const end = Math.min(data.length, i + step);
    for (let j = i; j < end; j++) {
      sum += data[j] * data[j];
      if (j > i && data[j] >= 0 !== data[j - 1] >= 0) crossings++;
    }
    frames.push({ level: Math.sqrt(sum / Math.max(1, end - i)), bright: crossings / Math.max(1, end - i) });
  }
  return frames;
}

export function stopWebVoice(drive: (d: Drive) => void) {
  cancelAnimationFrame(raf);
  const p = getPlayer();
  p.onended = null;
  p.pause();
  drive({ speaking: false, level: 0, vis: {} });
}

export async function playWebVoice(base64: string, drive: (d: Drive) => void, onStart: () => void, onEnd: () => void) {
  stopWebVoice(drive);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const frames = await envelope(bytes).catch(() => [] as Frame[]);
  const p = getPlayer();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  p.src = objectUrl;

  const finish = () => {
    cancelAnimationFrame(raf);
    drive({ speaking: false, level: 0, vis: {} });
    onEnd();
  };
  const tick = () => {
    const f = frames[Math.floor((p.currentTime + LEAD_S) / FRAME_S)];
    if (f) {
      // Bright (hissy) frames → narrow "s/sh" shapes; loud darker frames → open vowels.
      const sib = Math.min(1, Math.max(0, (f.bright - 0.12) * 4));
      const loud = Math.min(1, f.level * 6);
      drive({
        speaking: true,
        level: f.level,
        vis: { viseme_aa: loud * (1 - sib) * 0.65, viseme_E: sib * 0.5, viseme_SS: sib * 0.4, viseme_O: loud * 0.15 },
      });
    }
    raf = requestAnimationFrame(tick);
  };
  p.onended = finish;
  await p.play(); // throws if the browser still blocks audio (no tap yet)
  onStart();
  raf = requestAnimationFrame(tick);
}
