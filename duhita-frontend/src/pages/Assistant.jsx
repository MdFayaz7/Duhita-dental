import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
  idle: 'Type or tap mic',
  listening: 'Listening… tap ■',
  thinking: 'Thinking…',
  speaking: 'Speaking',
};
const uid = () => Math.random().toString(36).slice(2, 10);

export default function Assistant() {
  useSeo(
    'Duhita AI — Ask a Dental Question | Duhita Dental, Vijayawada',
    'Chat with Duhita AI, a friendly dental assistant, in English or Telugu. General guidance only — for treatment, book a visit at Duhita Dental, Vijayawada.',
    { image: '/images/brand/duhita-ai-avatar.png' }
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
  const bottomRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    } else if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40)));
    } catch { /* ignore */ }
    // Small timeout ensures DOM reflow is complete before scrolling
    const t = setTimeout(() => scrollToBottom(true), 40);
    return () => clearTimeout(t);
  }, [messages, phase, scrollToBottom]);

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
      rec.start(250);
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
    <div className="bg-[#eef8fb] h-[calc(100svh-69px)] md:h-[calc(100svh-76px)] overflow-hidden flex flex-col">
      <div className="container-x flex-1 min-h-0 py-3 sm:py-5 flex flex-col">
        <div className="max-w-6xl mx-auto w-full flex-1 min-h-0 grid gap-4 lg:gap-6 lg:grid-cols-[320px_1fr] items-stretch">
          {/* Avatar + controls sidebar */}
          <div className="flex flex-col h-full min-h-0 justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-[22px] sm:text-[26px] text-[#0b7d88]" style={{ fontFamily: 'var(--font-display)' }}>Duhita AI</h1>
                  <p className="text-[12.5px] text-[#4c5b70]">AI Dental Assistant · English | తెలుగు</p>
                </div>
                <button
                  onClick={reset}
                  aria-label="New conversation"
                  title="New conversation"
                  className="w-9 h-9 grid place-items-center rounded-full bg-white border border-[#cfe0ea] text-[#0b7d88] hover:bg-[#d9f3f7] transition-colors shadow-2xs"
                >
                  <FiRotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="relative aspect-[4/3] sm:aspect-square lg:aspect-[4/5] rounded-[22px] overflow-hidden bg-[#d9f3f7] shadow-[0_20px_50px_-25px_rgba(14,154,167,0.5)] border border-white">
                <DuhitaAvatar ref={avatar} onEvent={onAvatarEvent} />
                {!avatarReady && (
                  <div className="absolute inset-0 grid place-items-center pointer-events-none">
                    <span className="w-8 h-8 rounded-full border-[3px] border-[#0e9aa7]/30 border-t-[#0e9aa7] animate-spin" />
                  </div>
                )}
                <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-1.5">
                  <div className="flex bg-white/95 backdrop-blur-sm rounded-xl p-0.5 shadow-xs">
                    {['en-IN', 'te-IN'].map((l) => (
                      <button
                        key={l}
                        onClick={() => chooseLang(l)}
                        className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-colors ${
                          lang === l ? 'bg-[#0e9aa7] text-white' : 'text-[#0b7d88] hover:bg-[#eef8fb]'
                        }`}
                      >
                        {l === 'en-IN' ? 'English' : 'తెలుగు'}
                      </button>
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11.5px] font-medium text-[#0b7d88] shadow-xs">
                    {busy ? (
                      <span className="w-2 h-2 rounded-full bg-[#0e9aa7] animate-pulse" />
                    ) : (
                      <span className={`w-2 h-2 rounded-full ${recording ? 'bg-[#e5484d]' : 'bg-[#12b76a]'}`} />
                    )}
                    {STATUS[phase]}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 text-[11px] text-[#4c5b70] leading-relaxed text-center lg:text-left bg-white/70 p-2.5 rounded-xl border border-line/60">
              <p>
                <strong>AI Dental Assistant Disclaimer:</strong> Duhita AI provides general oral health and appointment guidance only. It is <strong>not a doctor or dentist</strong> and does not provide a medical diagnosis.
              </p>
              <p className="mt-1">
                In an emergency, visit a hospital casualty. Read our{' '}
                <Link to="/medical-disclaimer" className="text-[#0b7d88] underline font-medium hover:text-ink">
                  Medical &amp; AI Disclaimer
                </Link>.
              </p>
            </div>
          </div>

          {/* Chat Window: Full-height fit, scrollable messages, pinned input bar */}
          <div className="card h-full min-h-0 flex flex-col overflow-hidden bg-white shadow-xl rounded-[22px] border border-line">

            {/* Scrollable messages container */}
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6 flex flex-col gap-3.5 overscroll-contain"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#cfe0ea transparent',
              }}
            >
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] sm:max-w-[78%] px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed whitespace-pre-wrap shadow-2xs ${
                      isUser
                        ? 'self-end bg-[#0e9aa7] text-white rounded-br-xs'
                        : 'self-start bg-[#eef8fb] text-ink rounded-bl-xs border border-[#cfe0ea]/60'
                    }`}
                  >
                    {m.content}
                  </div>
                );
              })}

              {busy && (
                <div className="self-start flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-xs bg-[#eef8fb] text-[#0b7d88] border border-[#cfe0ea]/60 shadow-2xs">
                  <span className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-[#0e9aa7] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-[#0e9aa7] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-[#0e9aa7] animate-bounce" />
                  </span>
                  <span className="text-[13px] font-medium">Duhita AI is thinking…</span>
                </div>
              )}

              <div ref={bottomRef} className="h-0" />
            </div>

            {/* Suggestions Chips */}
            {messages.length <= 1 && phase === 'idle' && (
              <div className="shrink-0 px-4 sm:px-6 py-2.5 flex gap-2 overflow-x-auto no-scrollbar border-t border-line/40 bg-[#fbfdfd]">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="shrink-0 rounded-full border border-[#0e9aa7]/35 bg-white text-[#0b7d88] text-[12.5px] font-medium px-3.5 py-1.5 hover:bg-[#d9f3f7] transition-colors shadow-2xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Notices / Errors */}
            {notice && (
              <div className="shrink-0 mx-4 sm:mx-6 my-2 text-[12.5px] text-[#b42318] bg-[#fef3f2] px-3.5 py-2 rounded-xl border border-[#fee4e2] flex items-center justify-between">
                <span>{notice}</span>
                <button onClick={() => setNotice('')} className="font-semibold underline ml-2 text-xs">Dismiss</button>
              </div>
            )}

            {/* Pinned Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="shrink-0 flex items-center gap-2 p-3 sm:p-4 border-t border-line bg-white"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={500}
                disabled={recording}
                placeholder={recording ? 'Listening… tap ■ when done' : 'Type in English or తెలుగు…'}
                className="field flex-1 h-12 rounded-xl border-[#d0dbe2] focus:border-[#0e9aa7] focus:ring-[#0e9aa7]/20 text-[14.5px] px-4"
              />
              {input.trim() && !recording ? (
                <button
                  type="submit"
                  aria-label="Send"
                  className="w-12 h-12 shrink-0 rounded-xl bg-[#0e9aa7] text-white grid place-items-center hover:bg-[#0b7d88] transition-colors shadow-sm"
                >
                  <FiSend className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={busy}
                  aria-label={recording ? 'Stop listening' : 'Talk to Duhita AI'}
                  className={`w-12 h-12 shrink-0 rounded-xl grid place-items-center text-white transition-colors shadow-sm ${
                    recording ? 'bg-[#e5484d] animate-pulse' : 'bg-[#0e9aa7] hover:bg-[#0b7d88]'
                  } disabled:opacity-50`}
                >
                  {recording ? <FiSquare className="w-4 h-4" /> : <FiMic className="w-5 h-5" />}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
