import { useCallback, useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPause, FiPlay, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { apiFileUrl, useLiveList } from '../lib/content';

const toClip = (c) => ({ ...c, src: apiFileUrl(c.src) });
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Patient feedback videos (portrait 9:16), managed in Admin → Patient Feedback.
 * Plays one clip after another like stories: muted autoplay while on screen,
 * tap to pause, unmute once and it stays unmuted for the following clips.
 */
export default function FeedbackReel() {
  const clips = useLiveList('/api/feedback', toClip, []);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [inView, setInView] = useState(false);
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  const count = clips.length;
  const go = useCallback((delta) => {
    setProgress(0);
    setIndex((i) => (i + delta + count) % count);
  }, [count]);

  // Keep the index valid if clips are removed in the admin
  useEffect(() => { if (index >= count && count) setIndex(0); }, [count, index]);

  // Only play while the reel is on screen and the tab is visible — saves data and battery
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    const onVisibility = () => document.hidden && videoRef.current?.pause();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [count]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (inView && !paused) {
      v.play().catch((err) => {
        // Only a policy block means "can't autoplay" — show the play button then.
        // AbortError just means a newer load/pause interrupted this attempt; the next run retries.
        if (err?.name === 'NotAllowedError') setPaused(true);
      });
    }
    else v.pause();
  }, [index, inView, paused, muted, count]);

  if (!count) return null;

  const clip = clips[index % count];
  const prev = clips[(index - 1 + count) % count];
  const next = clips[(index + 1) % count];

  const Peek = ({ item, delta, side }) =>
    count > 1 && (
      <button onClick={() => go(delta)} aria-label={delta < 0 ? 'Previous clip' : 'Next clip'}
        className={`hidden md:block absolute top-1/2 -translate-y-1/2 ${side} w-[200px] aspect-[9/16] rounded-[22px] overflow-hidden bg-ink/80 opacity-45 hover:opacity-70 transition-opacity scale-[0.86]`}>
        <video key={item.id} src={`${item.src}#t=0.1`} preload="metadata" muted playsInline className="no-zoom w-full h-full object-cover pointer-events-none" />
      </button>
    );

  return (
    <section ref={sectionRef} className="bg-ivory section-y" aria-labelledby="feedback-heading">
      <div className="container-x">
        <div className="max-w-2xl mx-auto text-center reveal">
          <h2 id="feedback-heading" className="text-[27px] sm:text-[33px] md:text-[44px]">Patient Feedback</h2>
          <p className="mt-4 leading-relaxed">In their own words — patients share their experience of treatment at Duhita Dental.</p>
        </div>

        <div className="relative mt-10 flex items-center justify-center min-h-[420px]">
          <Peek item={prev} delta={-1} side="left-[calc(50%-400px)]" />
          <Peek item={next} delta={1} side="right-[calc(50%-400px)]" />

          <figure className="relative w-[min(340px,82vw)] aspect-[9/16] rounded-[24px] overflow-hidden bg-ink shadow-[0_30px_60px_-25px_rgba(16,24,40,0.55)]">
            <video
              key={clip.id}
              ref={videoRef}
              src={clip.src}
              playsInline
              muted={muted}
              preload="auto"
              onCanPlay={(e) => {
                // A play() issued before the clip had loaded can be discarded by the browser — start it once it's ready.
                if (inView && !paused && e.currentTarget.paused) e.currentTarget.play().catch(() => {});
              }}
              onClick={() => setPaused((p) => !p)}
              onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
              onEnded={() => (count > 1 ? go(1) : (videoRef.current.currentTime = 0, videoRef.current.play()))}
              onError={() => count > 1 && setTimeout(() => go(1), 800)}
              className="no-zoom absolute inset-0 w-full h-full object-cover cursor-pointer"
            />

            {/* stories-style progress, one segment per clip */}
            <div className="absolute inset-x-3 top-3 flex gap-1.5" aria-hidden="true">
              {clips.map((c, i) => (
                <span key={c.id} className="h-[3px] flex-1 rounded-full bg-white/35 overflow-hidden">
                  <span className="block h-full bg-white transition-[width] duration-300 ease-linear"
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

            {paused && (
              <button onClick={() => setPaused(false)} aria-label="Play video"
                className="absolute inset-0 m-auto w-16 h-16 grid place-items-center rounded-full bg-white/90 text-ink shadow-lg">
                <FiPlay className="w-7 h-7 translate-x-0.5" />
              </button>
            )}

            {(clip.patient_name || clip.caption) && (
              <figcaption className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
                {clip.patient_name && <p className="font-medium text-[15px]">{clip.patient_name}</p>}
                {clip.caption && <p className="text-[13px] text-white/80 mt-0.5">{clip.caption}</p>}
              </figcaption>
            )}
          </figure>
        </div>

        {count > 1 && (
          <div className="mt-7 flex items-center justify-center gap-4">
            <button onClick={() => go(-1)} aria-label="Previous clip"
              className="w-12 h-12 rounded-full border border-slate text-slate grid place-items-center hover:bg-slate hover:text-white transition-colors">
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[14px] text-ink tabular-nums w-16 text-center">{index + 1} / {count}</span>
            <button onClick={() => go(1)} aria-label="Next clip"
              className="w-12 h-12 rounded-full border border-slate text-slate grid place-items-center hover:bg-slate hover:text-white transition-colors">
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
