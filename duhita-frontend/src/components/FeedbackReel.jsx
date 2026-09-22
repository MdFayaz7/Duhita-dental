import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiChevronLeft, FiChevronRight, FiPause, FiPlay, FiRotateCw, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { apiFileUrl, useLiveList } from '../lib/content';

const toClip = (c) => ({ ...c, src: apiFileUrl(c.src), poster: c.poster || '' });
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Patient feedback videos (portrait 9:16), managed in Admin → Patient Feedback.
 *
 * Only one <video> ever exists, and it gets its source only when the section
 * nears the screen — the rest of the page never waits on video. Clips play one
 * after another; the playlist beside the player uses still posters, not videos.
 */
export default function FeedbackReel() {
  const clips = useLiveList('/api/feedback', toClip, []);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [near, setNear] = useState(false); // close enough to start loading
  const [inView, setInView] = useState(false); // visible enough to play
  const [status, setStatus] = useState('loading'); // loading | playing | error
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const skipTimer = useRef(null);

  const count = clips.length;
  const clip = count ? clips[index % count] : null;

  const select = useCallback((i) => {
    clearTimeout(skipTimer.current);
    setProgress(0);
    setStatus('loading');
    setIndex(((i % count) + count) % count);
  }, [count]);

  useEffect(() => { if (index >= count && count) setIndex(0); }, [count, index]);
  useEffect(() => () => clearTimeout(skipTimer.current), []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const nearIo = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '300px 0px' });
    const viewIo = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    nearIo.observe(el);
    viewIo.observe(el);
    const onVisibility = () => document.hidden && videoRef.current?.pause();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { nearIo.disconnect(); viewIo.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [count]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (inView && !paused && status !== 'error') {
      v.play().catch((err) => { if (err?.name === 'NotAllowedError') setPaused(true); });
    } else {
      v.pause();
    }
  }, [index, inView, paused, muted, status, near]);

  if (!count) return null;

  const onError = () => {
    setStatus('error');
    if (count > 1) skipTimer.current = setTimeout(() => select(index + 1), 4000);
  };
  const retry = () => {
    clearTimeout(skipTimer.current);
    setStatus('loading');
    videoRef.current?.load();
  };

  return (
    <section ref={sectionRef} className="bg-ivory section-y" aria-labelledby="feedback-heading">
      <div className="container-x">
        <div className="max-w-2xl mx-auto text-center reveal">
          <h2 id="feedback-heading" className="text-[27px] sm:text-[33px] md:text-[44px]">Patient Feedback</h2>
          <p className="mt-4 leading-relaxed">In their own words — patients share their experience of treatment at Duhita Dental.</p>
        </div>

        <div className={`mt-10 md:mt-12 grid gap-6 md:gap-10 justify-center items-center ${count > 1 ? 'md:grid-cols-[minmax(0,340px)_minmax(0,420px)]' : ''}`}>
          {/* Player */}
          <figure className="relative mx-auto w-[min(340px,84vw)] aspect-[9/16] rounded-[26px] overflow-hidden bg-[#0f1720] shadow-[0_30px_60px_-25px_rgba(16,24,40,0.55)] ring-1 ring-black/5">
            {clip.poster && (
              <img src={clip.poster} alt="" aria-hidden="true" loading="lazy"
                className="no-zoom absolute inset-0 w-full h-full object-cover" />
            )}
            <video
              key={clip.id}
              ref={videoRef}
              src={near ? (clip.poster ? clip.src : `${clip.src}#t=0.1`) : undefined}
              poster={clip.poster || undefined}
              playsInline
              muted={muted}
              preload={near ? 'auto' : 'none'}
              onLoadStart={() => setStatus('loading')}
              onWaiting={() => setStatus('loading')}
              onPlaying={() => setStatus('playing')}
              onCanPlay={(e) => {
                if (status !== 'playing' && e.currentTarget.paused) setStatus('ready');
                if (inView && !paused && e.currentTarget.paused) e.currentTarget.play().catch(() => {});
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                setProgress(v.duration ? v.currentTime / v.duration : 0);
              }}
              onEnded={() => (count > 1 ? select(index + 1) : (videoRef.current.currentTime = 0, videoRef.current.play()))}
              onError={onError}
              onClick={() => setPaused((p) => !p)}
              className="no-zoom absolute inset-0 w-full h-full object-cover cursor-pointer"
            />

            {/* stories-style progress */}
            <div className="absolute inset-x-3 top-3 flex gap-1.5" aria-hidden="true">
              {clips.map((c, i) => (
                <span key={c.id} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
                  <span className="block h-full bg-white"
                    style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} />
                </span>
              ))}
            </div>

            <div className="absolute top-7 right-3 flex gap-2">
              <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play' : 'Pause'}
                className="w-10 h-10 grid place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60">
                {paused ? <FiPlay /> : <FiPause />}
              </button>
              <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}
                className="w-10 h-10 grid place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60">
                {muted ? <FiVolumeX /> : <FiVolume2 />}
              </button>
            </div>

            {muted && status === 'playing' && (
              <button onClick={() => setMuted(false)}
                className="absolute left-1/2 -translate-x-1/2 top-[18%] inline-flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-[13px] text-white backdrop-blur-sm">
                <FiVolume2 /> Tap for sound
              </button>
            )}

            {status === 'loading' && !paused && (
              <span className="absolute inset-0 m-auto w-12 h-12 rounded-full border-[3px] border-white/25 border-t-white animate-spin" role="status" aria-label="Loading video" />
            )}

            {paused && status !== 'error' && (
              <button onClick={() => setPaused(false)} aria-label="Play video"
                className="absolute inset-0 m-auto w-16 h-16 grid place-items-center rounded-full bg-white/90 text-ink shadow-lg">
                <FiPlay className="w-7 h-7 translate-x-0.5" />
              </button>
            )}

            {status === 'error' && (
              <div className="absolute inset-0 grid place-items-center bg-black/60 p-6 text-center text-white">
                <div>
                  <FiAlertCircle className="mx-auto w-8 h-8 text-white/80" />
                  <p className="mt-3 text-[15px]">This video couldn’t load.</p>
                  {count > 1 && <p className="mt-1 text-[13px] text-white/70">Moving to the next one…</p>}
                  <button onClick={retry} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] text-ink">
                    <FiRotateCw /> Try again
                  </button>
                </div>
              </div>
            )}

            {(clip.patient_name || clip.caption) && (
              <figcaption className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
                {clip.patient_name && <p className="font-medium text-[15px]">{clip.patient_name}</p>}
                {clip.caption && <p className="text-[13px] text-white/80 mt-0.5">{clip.caption}</p>}
              </figcaption>
            )}
          </figure>

          {/* Playlist */}
          {count > 1 && (
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] uppercase tracking-[0.14em] text-slate">
                  Clip <span className="tabular-nums text-ink">{index + 1}</span> of {count}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => select(index - 1)} aria-label="Previous clip"
                    className="w-11 h-11 rounded-full border border-slate/40 text-ink grid place-items-center hover:bg-ink hover:text-white hover:border-ink transition-colors">
                    <FiChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => select(index + 1)} aria-label="Next clip"
                    className="w-11 h-11 rounded-full border border-slate/40 text-ink grid place-items-center hover:bg-ink hover:text-white hover:border-ink transition-colors">
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <ol className="mt-4 flex md:flex-col gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 md:max-h-[520px] md:overflow-y-auto">
                {clips.map((c, i) => {
                  const active = i === index;
                  return (
                    <li key={c.id} className="snap-start shrink-0 w-[100px] md:w-auto">
                      <button onClick={() => select(i)} aria-current={active}
                        className={`w-full flex flex-col md:flex-row md:items-center gap-3 rounded-2xl p-2 text-left transition-colors ${active ? 'bg-white shadow-[0_10px_30px_-18px_rgba(16,24,40,0.5)] ring-1 ring-black/5' : 'hover:bg-white/70'}`}>
                        <span className="relative w-full md:w-[68px] aspect-[9/16] shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#1b2a38] to-[#0f1720]">
                          {c.poster
                            ? <img src={c.poster} alt="" loading="lazy" className="no-zoom w-full h-full object-cover" />
                            : <span className="absolute inset-0 grid place-items-center text-white/85"><FiPlay className="w-5 h-5" /></span>}
                          {active && <span className="absolute inset-0 ring-2 ring-inset ring-slate rounded-xl" />}
                        </span>
                        <span className="min-w-0 px-1 md:px-0">
                          <span className="block text-[14px] text-ink truncate">{c.patient_name || `Patient story ${i + 1}`}</span>
                          <span className="block text-[12.5px] text-slate truncate">{active ? (paused ? 'Paused' : 'Now playing') : c.caption || 'Tap to watch'}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
