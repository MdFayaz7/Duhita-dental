import { Children, useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * Horizontal scroll-snap row that advances one card every `interval` ms and wraps to the start.
 *
 * It is a real scroller, so it can be swiped on phones and the cards stay in the prerendered HTML for SEO. It pauses
 * while hovered, touched, focused or off-screen, and does not auto-advance for people who ask for reduced motion.
 */
export default function AutoSlider({ children, interval = 3200, label }) {
  const ref = useRef(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);

  const step = (dir) => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const by = (card?.offsetWidth || el.clientWidth) + gap;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir > 0 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir < 0 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    else el.scrollBy({ left: dir * by, behavior: 'smooth' });
  };

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !visible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => step(1), interval);
    return () => clearInterval(id);
  }, [paused, visible, interval]);

  const hold = () => setPaused(true);
  const release = () => setPaused(false);

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}
      onMouseEnter={hold} onMouseLeave={release} onFocus={hold} onBlur={release}
      onTouchStart={hold} onTouchEnd={() => setTimeout(release, 4000)}>
      <ul ref={ref}
        className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-[18px] px-[18px] scroll-px-[18px] md:mx-0 md:px-0 md:scroll-px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Children.map(children, (child) => (
          <li className="snap-start shrink-0 w-[78%] min-[480px]:w-[46%] lg:w-[calc((100%-2.5rem)/3)] xl:w-[calc((100%-3.75rem)/4)]">{child}</li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={() => step(-1)} aria-label="Previous"
          className="w-11 h-11 rounded-full border border-line bg-white text-ink grid place-items-center hover:bg-slate hover:text-white hover:border-slate transition-colors">
          <FiChevronLeft className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => step(1)} aria-label="Next"
          className="w-11 h-11 rounded-full border border-line bg-white text-ink grid place-items-center hover:bg-slate hover:text-white hover:border-slate transition-colors">
          <FiChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
