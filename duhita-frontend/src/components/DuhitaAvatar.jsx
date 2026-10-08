import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { AI_BASE } from '../lib/patientApi';
import { playDuhitaVoice, stopDuhitaVoice } from '../lib/duhitaVoice';

const AVATAR_PAGE = `${AI_BASE}/avatar/?v=11&external=1`;

/**
 * The talking-avatar page Duhita AI's server already serves, in an iframe.
 * The website plays the reply audio itself (so the browser never blocks it)
 * and streams lip-sync values to the page — same approach as the app's web build.
 */
const DuhitaAvatar = forwardRef(function DuhitaAvatar({ onEvent }, ref) {
  const frameRef = useRef(null);

  const send = (cmd) => frameRef.current?.contentWindow?.postMessage(JSON.stringify(cmd), '*');
  const drive = (d) => send({ type: 'drive', ...d });

  useImperativeHandle(ref, () => ({
    speak: (speech) => {
      playDuhitaVoice(speech.audio, drive, () => onEvent({ type: 'speaking' }), () => onEvent({ type: 'done' })).catch((e) => {
        onEvent({ type: 'error', message: String(e?.message ?? e) });
        onEvent({ type: 'done' });
      });
    },
    stop: () => stopDuhitaVoice(drive),
    listening: (on) => send({ type: 'listening', on }),
  }));

  useEffect(() => {
    const origin = new URL(AI_BASE).origin;
    const fn = (e) => {
      if (e.origin !== origin || typeof e.data !== 'string') return;
      try {
        onEvent(JSON.parse(e.data));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('message', fn);
    return () => window.removeEventListener('message', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <iframe ref={frameRef} src={AVATAR_PAGE} title="Duhita AI" allow="autoplay"
      className="w-full h-full border-0" />
  );
});

export default DuhitaAvatar;
