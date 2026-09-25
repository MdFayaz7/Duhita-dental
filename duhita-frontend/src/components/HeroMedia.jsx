import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Full-bleed hero photo, shown exactly as supplied, with a glint of light on the
 * tooth jewel that is already in the photograph — no drawn gem, only a bloom and
 * a lens-style star flare that catches every few seconds.
 *
 * The photo is laid out like `object-fit: cover`, but by hand, so the glint can be
 * pinned to one point of the photo and stay on the tooth at every screen size.
 */
const PHOTO = { webp: '/images/hero-smile.webp', jpg: '/images/hero-smile.jpg', w: 1870, h: 841 };
const FOCUS = { x: 0.76, y: 0.5 };            // part of the photo kept in view when cropped
const JEWEL = { x: 0.6647, y: 0.4887, size: 0.012 }; // measured centre; size = share of photo width

export default function HeroMedia({ alt }) {
  const boxRef = useRef(null);
  const [stage, setStage] = useState(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const fit = () => {
      const { width: cw, height: ch } = box.getBoundingClientRect();
      const scale = Math.max(cw / PHOTO.w, ch / PHOTO.h);
      const w = PHOTO.w * scale;
      const h = PHOTO.h * scale;
      setStage({ width: w, height: h, left: (cw - w) * FOCUS.x, top: (ch - h) * FOCUS.y });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="absolute inset-0 -z-10 overflow-hidden">
      <div className="hero-media absolute" style={stage || { inset: 0 }}>
        <picture>
          <source srcSet={PHOTO.webp} type="image/webp" />
          <img src={PHOTO.jpg} alt={alt} width={PHOTO.w} height={PHOTO.h} fetchPriority="high"
            className="block w-full h-full object-cover" />
        </picture>

        {stage && (
          <span className="jewel-glint" aria-hidden="true"
            style={{ left: `${JEWEL.x * 100}%`, top: `${JEWEL.y * 100}%`, width: `${JEWEL.size * 100}%` }}>
            <span className="jewel-bloom" />
            <span className="jewel-star" />
          </span>
        )}
      </div>
    </div>
  );
}
