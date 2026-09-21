import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiMaximize2 } from 'react-icons/fi';
import { galleryImages } from '../data/gallery';

const AUTOPLAY_MS = 3500;

function Lightbox({ images, index, onClose, onNav }) {
  const img = images[index];
  const closeRef = useRef(null);
  const touchX = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNav(1);
      if (e.key === 'ArrowLeft') onNav(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onNav]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
      className="fixed inset-0 z-[70] bg-[#1c2027]/[0.97] backdrop-blur-sm flex flex-col gallery-fade"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-5 py-4 text-white/80 text-[14px]" onClick={(e) => e.stopPropagation()}>
        <span>{index + 1} / {images.length}</span>
        <button ref={closeRef} onClick={onClose} aria-label="Close gallery" className="w-10 h-10 grid place-items-center rounded-full hover:bg-white/10">
          <FiX className="w-6 h-6" />
        </button>
      </div>

      <div
        className="relative flex-1 flex items-center justify-center px-4 md:px-20 min-h-0"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) onNav(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <figure key={img.src} className="max-h-full flex flex-col items-center gallery-fade" onClick={(e) => e.stopPropagation()}>
          <img src={img.src} alt={img.caption} className="no-zoom max-h-[72vh] max-w-full object-contain shadow-2xl" />
          <figcaption className="mt-4 text-center text-white/85 text-[15px] max-w-2xl">{img.caption}</figcaption>
        </figure>
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onNav(-1); }} aria-label="Previous photo"
              className="hidden md:grid absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 place-items-center rounded-full border border-white/30 text-white hover:bg-white hover:text-ink transition-colors">
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onNav(1); }} aria-label="Next photo"
              className="hidden md:grid absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 place-items-center rounded-full border border-white/30 text-white hover:bg-white hover:text-ink transition-colors">
              <FiChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-4 justify-start md:justify-center" onClick={(e) => e.stopPropagation()}>
        {images.map((t, i) => (
          <button key={t.src} onClick={() => onNav(i - index)} aria-label={`View photo ${i + 1}`}
            className={`shrink-0 w-16 h-12 overflow-hidden transition-opacity ${i === index ? 'opacity-100 ring-2 ring-white' : 'opacity-45 hover:opacity-80'}`}>
            <img src={t.src} alt="" className="no-zoom w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Gallery({ id, category, heading, children, className = 'bg-ivory', layout = 'slider' }) {
  const images = useMemo(() => galleryImages.filter((g) => g.category === category), [category]);
  const [lightbox, setLightbox] = useState(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const track = useRef(null);

  const slideWidth = () => track.current?.firstElementChild?.getBoundingClientRect().width + 16 || 1;

  const go = useCallback((dir) => {
    const el = track.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const atStart = el.scrollLeft <= 4;
    if (dir > 0 && atEnd) el.scrollTo({ left: 0 });
    else if (dir < 0 && atStart) el.scrollTo({ left: el.scrollWidth });
    else el.scrollBy({ left: dir * slideWidth() });
  }, []);

  // Autoplay — pauses on hover/focus, while the lightbox is open, and for reduced-motion users.
  useEffect(() => {
    if (paused || lightbox !== null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => !document.hidden && go(1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, lightbox, go]);

  const onScroll = () => setActive(Math.round(track.current.scrollLeft / slideWidth()));

  const nav = useCallback(
    (step) => setLightbox((i) => (i === null ? i : (i + step + images.length) % images.length)),
    [images.length],
  );
  const close = useCallback(() => setLightbox(null), []);

  if (!images.length) return null;

  if (layout === 'grid') {
    return (
      <section id={id} className={`${className} section-y scroll-mt-24`} aria-labelledby={`${id}-heading`}>
        <div className="container-x">
          <div className="max-w-2xl reveal">
            <h2 id={`${id}-heading`} className="text-[28px] sm:text-[34px] md:text-[48px] leading-[1.1]">{heading}</h2>
            <p className="mt-4 leading-relaxed">{children}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {images.map((img, i) => (
              <button key={img.src} onClick={() => setLightbox(i)}
                aria-label={`Open photo ${i + 1} of ${images.length}: ${img.caption}`}
                className="reveal group relative aspect-[4/3] overflow-hidden rounded-[18px] bg-mist text-left shadow-[0_10px_30px_-20px_rgba(16,24,40,0.5)]">
                <img src={img.src} alt={img.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pt-12 bg-gradient-to-t from-black/75 to-transparent text-white text-[13.5px] leading-snug opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300">
                  {img.caption}
                </span>
                <FiMaximize2 className="pointer-events-none absolute top-3 right-3 w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
        {lightbox !== null && <Lightbox images={images} index={lightbox} onClose={close} onNav={nav} />}
      </section>
    );
  }


  return (
    <section id={id} className={`${className} section-y scroll-mt-24 overflow-hidden`} aria-labelledby={`${id}-heading`}>
      <div className="container-x">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 reveal">
          <div className="max-w-2xl">
            <h2 id={`${id}-heading`} className="text-[28px] sm:text-[34px] md:text-[48px] leading-[1.1]">{heading}</h2>
            <p className="mt-4 leading-relaxed">{children}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[14px] text-ink tabular-nums mr-2">
              {String(Math.min(active + 1, images.length)).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
            </span>
            <button onClick={() => go(-1)} aria-label="Previous photos"
              className="w-12 h-12 rounded-full border border-slate text-slate grid place-items-center hover:bg-slate hover:text-white transition-colors">
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => go(1)} aria-label="Next photos"
              className="w-12 h-12 rounded-full border border-slate text-slate grid place-items-center hover:bg-slate hover:text-white transition-colors">
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          ref={track}
          onScroll={onScroll}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          className="slider-track no-scrollbar mt-12 flex gap-4 overflow-x-auto"
          aria-roledescription="carousel"
        >
          {images.map((img, i) => (
            <button
              key={img.src}
              onClick={() => setLightbox(i)}
              aria-label={`Open photo ${i + 1} of ${images.length}: ${img.caption}`}
              className="group relative shrink-0 w-[88%] sm:w-[calc((100%-16px)/1.6)] lg:w-[calc((100%-16px)/2.4)] aspect-[4/3] overflow-hidden rounded-[18px] bg-mist text-left shadow-[0_10px_30px_-20px_rgba(16,24,40,0.5)]"
            >
              <img src={img.src} alt={img.caption} loading="lazy" draggable="false" className="absolute inset-0 w-full h-full object-cover" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pt-12 bg-gradient-to-t from-black/70 to-transparent text-white text-[13.5px] leading-snug opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-300">
                {img.caption}
              </span>
              <FiMaximize2 className="pointer-events-none absolute top-3 right-3 w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        <div className="mt-6 h-[2px] bg-black/10 relative overflow-hidden" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 bg-slate transition-all duration-500"
            style={{ width: `${((Math.min(active, images.length - 1) + 1) / images.length) * 100}%` }} />
        </div>
      </div>

      {lightbox !== null && <Lightbox images={images} index={lightbox} onClose={close} onNav={nav} />}
    </section>
  );
}
