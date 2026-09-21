import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiArrowUpRight } from 'react-icons/fi';
import { googlePlace, googleReviews } from '../data/reviews';

const AVATAR_COLORS = ['#1a73e8', '#e8710a', '#188038', '#a142f4', '#d93025', '#12848f'];

export function GoogleG({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function Stars({ value, className = 'w-4 h-4' }) {
  return (
    <span className="flex" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <svg key={i} viewBox="0 0 24 24" className={className} aria-hidden="true">
            <defs>
              <linearGradient id={`s${i}-${fill}`}>
                <stop offset={fill} stopColor="#fbbc04" />
                <stop offset={fill} stopColor="#dadce0" />
              </linearGradient>
            </defs>
            <path fill={`url(#s${i}-${fill})`} d="M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.2-.6L12 2 9.2 8.7 2 9.3l5.4 4.7-1.6 7z" />
          </svg>
        );
      })}
    </span>
  );
}

function timeAgo(ym) {
  const [y, m] = ym.split('-').map(Number);
  const now = new Date();
  const months = (now.getFullYear() - y) * 12 + now.getMonth() + 1 - m;
  if (months < 1) return 'this month';
  if (months < 12) return months === 1 ? 'a month ago' : `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'a year ago' : `${years} years ago`;
}

function ReviewCard({ review, index }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, []);

  return (
    <article className="snap-start shrink-0 w-[86%] sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)] card p-6 flex flex-col">
      <header className="flex items-center gap-3.5">
        <span className="w-12 h-12 shrink-0 rounded-full grid place-items-center text-white text-[20px] font-medium"
          style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }} aria-hidden="true">
          {review.author.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="text-[15.5px] font-semibold text-ink truncate">{review.author}</p>
          <p className="text-[13px] text-body mt-0.5">{review.meta}</p>
        </div>
      </header>
      <div className="flex items-center gap-2 mt-4">
        <Stars value={review.rating} />
        <span className="text-[13px] text-body">{timeAgo(review.date)}</span>
      </div>
      <p ref={textRef} lang={review.translation && !showTranslation ? 'te' : undefined}
        className={`mt-3 text-[15px] leading-relaxed text-ink/85 ${expanded ? '' : 'line-clamp-4'}`}>
        {showTranslation ? review.translation : review.text}
      </p>
      <div className="flex flex-wrap gap-x-4 mt-1.5">
        {clamped && (
          <button onClick={() => setExpanded((e) => !e)} className="text-[14px] text-body hover:text-ink">
            {expanded ? 'Read less' : 'Read more'}
          </button>
        )}
        {review.translation && (
          <button onClick={() => setShowTranslation((t) => !t)} className="text-[14px] text-[#1a73e8] hover:underline">
            {showTranslation ? 'See original (Telugu)' : 'See translation (English)'}
          </button>
        )}
      </div>
      <a href={googlePlace.url} target="_blank" rel="noreferrer" className="mt-auto pt-6 flex items-center gap-2.5 group/g w-fit">
        <GoogleG className="w-7 h-7" />
        <span className="leading-tight">
          <span className="block text-[12px] text-body">Posted on</span>
          <span className="block text-[14px] text-[#1a73e8] group-hover/g:underline">Google</span>
        </span>
      </a>
    </article>
  );
}

export default function GoogleReviews() {
  const track = useRef(null);
  const [paused, setPaused] = useState(false);

  const scroll = useCallback((dir) => {
    const el = track.current;
    if (!el) return;
    const step = el.firstElementChild.getBoundingClientRect().width + 20;
    if (dir > 0 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir < 0 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    else el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  // Auto-slide; pauses on hover, focus or touch, and for reduced-motion users.
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => !document.hidden && scroll(1), 4500);
    return () => clearInterval(t);
  }, [paused, scroll]);

  return (
    <section className="bg-white section-y" aria-labelledby="reviews-heading">
      <div className="container-x">
        <div className="reveal flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 id="reviews-heading" className="text-[28px] sm:text-[34px] md:text-[48px] leading-[1.1]">What Our Patients Say</h2>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <GoogleG className="w-7 h-7" />
              <span className="text-[16px] text-ink font-medium">Google Rating</span>
              <span className="text-[26px] font-semibold text-ink leading-none">{googlePlace.rating.toFixed(1)}</span>
              <Stars value={googlePlace.rating} className="w-5 h-5" />
              <a href={googlePlace.url} target="_blank" rel="noreferrer" className="text-[14px] text-body hover:text-ink underline-offset-4 hover:underline">
                {googlePlace.total} reviews
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={googlePlace.url} target="_blank" rel="noreferrer" className="btn btn-solid !px-5 !py-3 grow sm:grow-0">Write a Review</a>
            <button onClick={() => scroll(-1)} aria-label="Previous reviews"
              className="hidden sm:grid w-11 h-11 rounded-full border border-slate text-slate place-items-center hover:bg-slate hover:text-white transition-colors">
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => scroll(1)} aria-label="Next reviews"
              className="hidden sm:grid w-11 h-11 rounded-full border border-slate text-slate place-items-center hover:bg-slate hover:text-white transition-colors">
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div ref={track} className="slider-track no-scrollbar mt-12 flex gap-5 overflow-x-auto reveal"
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onTouchStart={() => setPaused(true)}>
          {googleReviews.map((r, i) => <ReviewCard key={r.author} review={r} index={i} />)}
          <a href={googlePlace.url} target="_blank" rel="noreferrer"
            className="snap-start shrink-0 w-[86%] sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)] bg-slate text-white p-7 rounded-[18px] flex flex-col justify-between group min-h-[280px]">
            <GoogleG className="w-10 h-10 bg-white rounded-full p-1.5" />
            <div>
              <p className="font-display text-[30px] leading-tight">{googlePlace.rating.toFixed(1)} out of 5</p>
              <p className="mt-2 text-white/80 text-[15px]">from {googlePlace.total} patient reviews on Google</p>
              <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium">
                Read all reviews <FiArrowUpRight className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
