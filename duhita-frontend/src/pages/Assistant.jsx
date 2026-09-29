import { useCallback, useEffect, useRef, useState } from 'react';
import { FiMic, FiRotateCcw, FiSend, FiSquare } from 'react-icons/fi';
import DuhitaAvatar from '../components/DuhitaAvatar';
import useSeo from '../hooks/useSeo';
import { respond, talk } from '../lib/duhitaApi';
import { unlockDuhitaAudio } from '../lib/duhitaVoice';

const STORE_KEY = 'duhita.web.chat.v1';
const LANG_KEY = 'duhita.web.lang';
const GREETING = {
  id: 'greet',
  role: 'assistant',
  content: 'Namaskaram! I’m Duhita AI. Type or tap the mic and tell me about your teeth, in English or Telugu.',
};
const SUGGESTIONS = ['I have a toothache', 'పంటి నొప్పిగా ఉంది', 'Why do my gums bleed?', 'Sensitive teeth', 'I need a check-up'];
const STATUS = {
  idle: 'Type or tap the mic to talk',
  listening: 'Listening… tap to stop',
  thinking: 'Thinking…',
  speaking: 'Speaking',
};
const uid = () => Math.random().toString(36).slice(2, 10);

export default function Assistant() {
  useSeo(
    'Duhita AI — Ask a Dental Question | Duhita Dental, Vijayawada',
    'Chat with Duhita AI, a friendly dental assistant, in English or Telugu. General guidance only — for treatment, book a visit at Duhita Dental, Vijayawada.',
  );

  const avatar = useRef(null);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState('idle');
  const [avatarReady, setAvatarReady] = useState(false);
  const [lang, setLang] = useState('en-IN');
  const [notice, setNotice] = useState('');
  const [recording, setRecording] = useState(false);
  const messagesRef = useRef(messages);
  const requestId = useRef(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimeout = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    messagesRef.current = messages;
    sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40)));
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) setMessages(JSON.parse(saved));
      const l = localStorage.getItem(LANG_KEY);
      if (l === 'en-IN' || l === 'te-IN') setLang(l);
    } catch { /* ignore */ }
  }, []);

  const chooseLang = (l) => {
    setLang(l);
    localStorage.setItem(LANG_KEY, l);
  };

  const ask = useCallback(async (text) => {
    const content = text.trim();
    if (!content) return;
    unlockDuhitaAudio();
    const id = ++requestId.current;
    avatar.current?.stop();
    const user = { id: uid(), role: 'user', content };
    const history = [...messagesRef.current.filter((m) => m.id !== GREETING.id), user].map(({ role, content: c }) => ({ role, content: c }));
    setMessages((prev) => [...prev, user]);
    setInput('');
    setNotice('');
    setPhase('thinking');
    try {
      const res = await respond(history, lang);
      if (id !== requestId.current) return;
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: res.reply }]);
      if (res.speech && avatarReady) avatar.current?.speak(res.speech);
      else setPhase('idle');
      if (res.ttsError) setNotice(res.ttsError);
    } catch (e) {
      if (id !== requestId.current) return;
      setNotice(e.message);
      setPhase('idle');
    }
  }, [lang, avatarReady]);

  const onRecorded = useCallback(async (blob) => {
    const id = ++requestId.current;
    const history = messagesRef.current.filter((m) => m.id !== GREETING.id).map(({ role, content }) => ({ role, content }));
    const pending = { id: uid(), role: 'user', content: '🎙 …' };
    setMessages((prev) => [...prev, pending]);
    setNotice('');
    setPhase('thinking');
    try {
      const res = await talk(blob, history, lang);
      if (id !== requestId.current) return;
      setMessages((prev) => [
        ...prev.map((m) => (m.id === pending.id ? { ...m, content: res.heard || '🎙 (unclear)' } : m)),
        { id: uid(), role: 'assistant', content: res.reply },
      ]);
      if (res.speech && avatarReady) avatar.current?.speak(res.speech);
      else setPhase('idle');
      if (res.ttsError) setNotice(res.ttsError);
    } catch (e) {
      if (id !== requestId.current) return;
      setMessages((prev) => prev.filter((m) => m.id !== pending.id));
      setNotice(e.message);
      setPhase('idle');
    }
  }, [lang, avatarReady]);

  const stopMic = useCallback((discard = false) => {
    clearTimeout(recTimeout.current);
    const rec = mediaRef.current;
    if (!rec || rec.state === 'inactive') return;
    rec.discard = discard;
    rec.stop();
    rec.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }, []);

  const startMic = useCallback(async () => {
    setNotice('');
    if (!navigator.mediaDevices?.getUserMedia) {
      // Browsers only expose the mic API on secure origins (https, or localhost). On a plain
      // http test URL there's no permission prompt to show — this isn't a "denied" case.
      setNotice(
        window.isSecureContext
          ? "This browser doesn't support voice input. Please type your message instead."
          : 'Voice input needs a secure (https) connection — please type your message for now.',
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        if (!rec.discard && chunksRef.current.length) onRecorded(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
      setPhase('listening');
      recTimeout.current = setTimeout(() => stopMic(), 30_000);
    } catch {
      setNotice('Please allow microphone access to talk to Duhita AI.');
    }
  }, [onRecorded, stopMic]);

  const toggleMic = () => {
    unlockDuhitaAudio();
    if (recording) return stopMic();
    avatar.current?.stop();
    requestId.current++;
    startMic();
  };

  const onAvatarEvent = useCallback((e) => {
    if (e.type === 'ready') setAvatarReady(true);
    else if (e.type === 'speaking') setPhase('speaking');
    else if (e.type === 'done') setPhase((p) => (p === 'speaking' ? 'idle' : p));
    else if (e.type === 'error') setNotice(`Avatar: ${e.message}`);
  }, []);

  const reset = () => {
    avatar.current?.stop();
    requestId.current++;
    setPhase('idle');
    setMessages([GREETING]);
  };

  const busy = phase === 'thinking';

  return (
    <div className="bg-[#eef8fb] min-h-[calc(100vh-69px)] md:min-h-[calc(100vh-76px)]">
      <div className="container-x py-6 sm:py-10">
        <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-[320px_1fr] items-start">
          {/* Avatar + status */}
          <div className="lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-[24px] sm:text-[28px] text-[#0b7d88]" style={{ fontFamily: 'var(--font-display)' }}>Duhita AI</h1>
                <p className="text-[13px] text-[#4c5b70]">AI Dental Assistant · English | తెలుగు</p>
              </div>
              <button onClick={reset} aria-label="New conversation"
                className="w-9 h-9 grid place-items-center rounded-full bg-white border border-[#cfe0ea] text-[#0b7d88] hover:bg-[#d9f3f7]">
                <FiRotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-[3/4] sm:aspect-square rounded-[22px] overflow-hidden bg-[#d9f3f7] shadow-[0_20px_50px_-25px_rgba(14,154,167,0.5)]">
              <DuhitaAvatar ref={avatar} onEvent={onAvatarEvent} />
              {!avatarReady && (
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <span className="w-8 h-8 rounded-full border-[3px] border-[#0e9aa7]/30 border-t-[#0e9aa7] animate-spin" />
                </div>
              )}
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
                <div className="flex bg-white/90 backdrop-blur-sm rounded-xl p-1">
                  {['en-IN', 'te-IN'].map((l) => (
                    <button key={l} onClick={() => chooseLang(l)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${lang === l ? 'bg-[#0e9aa7] text-white' : 'text-[#0b7d88]'}`}>
                      {l === 'en-IN' ? 'English' : 'తెలుగు'}
                    </button>
                  ))}
                </div>
                <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-[12px] font-medium text-[#0b7d88]">
                  {busy ? <span className="w-2 h-2 rounded-full bg-[#0e9aa7] animate-pulse" /> : <span className={`w-2 h-2 rounded-full ${recording ? 'bg-[#e5484d]' : 'bg-[#0e9aa7]'}`} />}
                  {STATUS[phase]}
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] text-[#4c5b70] leading-relaxed text-center lg:text-left">
              General guidance only — not a diagnosis. In an emergency, visit a hospital.
            </p>
          </div>

          {/* Chat */}
          <div className="card min-h-[60vh] lg:min-h-[70vh] flex flex-col overflow-hidden">
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' ? 'self-end bg-[#0e9aa7] text-white rounded-br-md' : 'self-start bg-[#eef8fb] text-ink rounded-bl-md'
                }`}>
                  {m.content}
                </div>
              ))}
            </div>

            {messages.length <= 1 && phase === 'idle' && (
              <div className="px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)}
                    className="shrink-0 rounded-full border border-[#0e9aa7]/40 text-[#0b7d88] text-[13px] px-3.5 py-2 hover:bg-[#d9f3f7]">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {notice && (
              <button onClick={() => setNotice('')} className="mx-4 sm:mx-6 mb-2 text-[12.5px] text-[#b42318] text-left">{notice}</button>
            )}

            <form onSubmit={(e) => { e.preventDefault(); ask(input); }}
              className="flex items-center gap-2 p-3 sm:p-4 border-t border-line">
              <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500}
                disabled={recording}
                placeholder={recording ? 'Listening… tap ■ when done' : 'Type in English or తెలుగు…'}
                className="field flex-1" />
              {input.trim() && !recording ? (
                <button type="submit" aria-label="Send" className="w-11 h-11 shrink-0 rounded-full bg-[#0e9aa7] text-white grid place-items-center hover:bg-[#0b7d88]">
                  <FiSend className="w-[18px] h-[18px]" />
                </button>
              ) : (
                <button type="button" onClick={toggleMic} disabled={busy} aria-label={recording ? 'Stop listening' : 'Talk to Duhita AI'}
                  className={`w-11 h-11 shrink-0 rounded-full grid place-items-center text-white transition-colors ${recording ? 'bg-[#e5484d]' : 'bg-[#0e9aa7] hover:bg-[#0b7d88]'} disabled:opacity-50`}>
                  {recording ? <FiSquare className="w-4 h-4" /> : <FiMic className="w-[18px] h-[18px]" />}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
