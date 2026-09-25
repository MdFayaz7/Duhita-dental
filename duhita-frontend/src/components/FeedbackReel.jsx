import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiChevronLeft, FiChevronRight, FiPause, FiPlay, FiRotateCw, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { apiFileUrl, useLiveList } from '../lib/content';

const toClip = (c) => ({ ...c, src: apiFileUrl(c.src), poster: c.poster || '' });
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const VISIBLE = 2; // cards kept either side of the active one
const SWIPE = 45; // px of drag that counts as a swipe

/** Shortest distance from the active card, so the slider wraps around. */
const offsetOf = (i, index, count) => {
  const d = i - index;
  return d > count / 2 ? d - count : d < -count / 2 ? d + count : d;
};

/** Coverflow placement: the active card is full size, its neighbours step back. */
const cardStyle = (offset) => {
  const depth = Math.abs(offset);
  return {
    transform: `translate(-50%, -50%) translateX(${offset * 58}%) scale(${1 - depth * 0.17})`,
    opacity: depth > VISIBLE ? 0 : 1 - depth * 0.35,
    zIndex: 10 - depth,
    pointerEvents: depth > VISIBLE ? 'none' : 'auto',
  };
};

/**
 * Patient feedback videos (portrait 9:16), managed in Admin → Patient Feedback.
 *
 * A coverflow slider: the playing clip sits centre stage, the clips either side
 * are scaled back, and swiping or the arrows brings the next one forward. Only
 * the active card holds a <video>, and it gets its source only once the section
 * nears the screen — the neighbours are still posters, so the page stays light.
 */
export default function FeedbackReel() {
  const clips = useLiveList('/api/feedback', toClip, []);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [near, setNear] = useState(false); // close enough to start loading
  const [inView, setInView] = useState(false); // visible enough to play
  const [status, setStatus] = useState('loading'); // loading | ready | playing | error
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const skipTimer = useRef(null);
  const drag = useRef(null);

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

  // Swipe / drag between clips, without pulling in a carousel library.
  const onPointerDown = (e) => { drag.current = { x: e.clientX, moved: false }; };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) > 8) d.moved = true;
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d || count < 2) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) >= SWIPE) select(index + (dx < 0 ? 1 : -1));
  };
  const dragged = () => drag.current?.moved;

  return (
    <section ref={sectionRef} className="bg-ivory section-y overflow-hidden" aria-labelledby="feedback-heading">
      <div className="container-x">
        <div className="max-w-2xl mx-auto text-center reveal">
          <h2 id="feedback-heading" className="text-[27px] sm:text-[33px] md:text-[44px]">Patient Feedback</h2>
          <p className="mt-4 leading-relaxed">In their own words — patients share their experience of treatment at Duhita Dental.</p>
        </div>

        <div
          className="reel-stage relative mt-10 md:mt-12 mx-auto touch-pan-y select-none"
          role="group"
          aria-roledescription="carousel"
          aria-label="Patient feedback videos"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { drag.current = null; }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') select(index + 1);
            if (e.key === 'ArrowLeft') select(index - 1);
          }}
          tabIndex={0}
        >
          {clips.map((c, i) => {
            const offset = offsetOf(i, index, count);
            if (Math.abs(offset) > VISIBLE) return null;
            const active = offset === 0;
            return (
              <figure key={c.id} style={cardStyle(offset)} aria-hidden={!active}
                className="reel-card absolute left-1/2 top-1/2 rounded-[26px] overflow-hidden bg-[#0f1720] shadow-[0_30px_60px_-25px_rgba(16,24,40,0.55)] ring-1 ring-black/5">
                {active ? (
                  <>
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
                      onClick={() => !dragged() && setPaused((p) => !p)}
                      className="no-zoom absolute inset-0 w-full h-full object-cover cursor-pointer"
                    />

                    {/* stories-style progress */}
                    <div className="absolute inset-x-3 top-3 flex gap-1.5" aria-hidden="true">
                      {clips.map((s, j) => (
                        <span key={s.id} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
                          <span className="block h-full bg-white"
                            style={{ width: `${j < index ? 100 : j === index ? progress * 100 : 0}%` }} />
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
                  </>
                ) : (
                  // Neighbour: a still card that brings its clip forward when tapped
                  <button onClick={() => !dragged() && select(i)} tabIndex={-1}
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#24384a] to-[#0f1720]"
                    aria-label={`Play ${c.patient_name || `patient story ${i + 1}`}`}>
                    {c.poster && <img src={c.poster} alt="" loading="lazy" className="no-zoom w-full h-full object-cover" />}
                    <span className="absolute inset-0 grid content-center justify-items-center gap-3 p-4 text-white">
                      <span className="w-14 h-14 grid place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
                        <FiPlay className="w-6 h-6 translate-x-0.5" />
                      </span>
                      <span className="text-[14px] font-medium text-center line-clamp-2">{c.patient_name || `Patient story ${i + 1}`}</span>
                      {c.caption && <span className="text-[12px] text-white/70 text-center line-clamp-1">{c.caption}</span>}
                    </span>
                    <span className="absolute inset-0 bg-ivory/20" />
                  </button>
                )}

                {active && (clip.patient_name || clip.caption) && (
                  <figcaption className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
                    {clip.patient_name && <p className="font-medium text-[15px]">{clip.patient_name}</p>}
                    {clip.caption && <p className="text-[13px] text-white/80 mt-0.5">{clip.caption}</p>}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>

        {count > 1 && (
          <div className="mt-8 flex items-center justify-center gap-5">
            <button onClick={() => select(index - 1)} aria-label="Previous clip"
              className="w-12 h-12 rounded-full border border-slate/40 text-ink grid place-items-center hover:bg-ink hover:text-white hover:border-ink transition-colors">
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose a clip">
              {clips.map((c, i) => (
                <button key={c.id} onClick={() => select(i)} role="tab" aria-selected={i === index}
                  aria-label={c.patient_name || `Patient story ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-7 bg-ink' : 'w-2 bg-slate/35 hover:bg-slate/60'}`} />
              ))}
            </div>
            <button onClick={() => select(index + 1)} aria-label="Next clip"
              className="w-12 h-12 rounded-full border border-slate/40 text-ink grid place-items-center hover:bg-ink hover:text-white hover:border-ink transition-colors">
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
