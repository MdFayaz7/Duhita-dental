// Native builds: the avatar WebView plays audio itself (autoplay is allowed there), so these are no-ops.
// The web implementation lives in webVoice.web.ts.
type Drive = { speaking: boolean; level: number; vis: Record<string, number> };

export function unlockWebAudio() {}
export function stopWebVoice(_drive: (d: Drive) => void) {}
export async function playWebVoice(_b64: string, _drive: (d: Drive) => void, _onStart: () => void, _onEnd: () => void) {}
