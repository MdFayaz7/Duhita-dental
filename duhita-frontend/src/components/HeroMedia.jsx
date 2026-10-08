import { useLayoutEffect, useRef, useState } from 'react';
import { usePhone } from '../hooks/useMediaQuery';

/**
 * Full-bleed hero photo with a glint of light on the tooth jewel that is already
 * in the photograph — no drawn gem, only a bloom and a lens-style star flare.
 *
 * Phones get the upright 9:16 photo so it fills the screen without a hard crop;
 * wider screens keep the landscape one. Each photo is laid out like
 * `object-fit: cover`, but by hand, so the glint stays on the tooth at any size.
 */
const LANDSCAPE = {
  webp: '/images/hero-smile.webp',
  jpg: '/images/hero-smile.jpg',
  w: 1870,
  h: 841,
  focus: { x: 0.76, y: 0.5 },            // part of the photo kept in view when cropped
  jewel: { x: 0.6647, y: 0.4887, size: 0.012 }, // measured centre; size = share of photo width
};

const PORTRAIT = {
  webp: '/images/hero-smile-portrait.webp',
  jpg: '/images/hero-smile-portrait.jpg',
  w: 941,
  h: 1671,
  focus: { x: 0.5, y: 0.42 },
  jewel: { x: 0.6249, y: 0.5667, size: 0.014 },
};

// Persistent memory retention: keeps decoded image buffers in browser memory
// so returning to the home page paints instantly with zero network or decode delay.
if (typeof window !== 'undefined') {
  const p1 = new Image();
  p1.src = LANDSCAPE.webp;
  const p2 = new Image();
  p2.src = LANDSCAPE.jpg;
  const p3 = new Image();
  p3.src = PORTRAIT.webp;
  const p4 = new Image();
  p4.src = PORTRAIT.jpg;
}

let cachedStage = null;
let cachedPhotoType = null;

export default function HeroMedia({ alt }) {
  const phone = usePhone();
  const photo = phone ? PORTRAIT : LANDSCAPE;
  const photoType = phone ? 'portrait' : 'landscape';
  const boxRef = useRef(null);

  // Initialize immediately from cached stage if available to eliminate layout jump and delay
  const [stage, setStage] = useState(() => (cachedPhotoType === photoType ? cachedStage : null));

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => {
      const { width: cw, height: ch } = box.getBoundingClientRect();
      if (!cw || !ch) return;
      const scale = Math.max(cw / photo.w, ch / photo.h);
      const w = photo.w * scale;
      const h = photo.h * scale;
      const nextStage = { width: w, height: h, left: (cw - w) * photo.focus.x, top: (ch - h) * photo.focus.y };
      cachedStage = nextStage;
      cachedPhotoType = photoType;
      setStage(nextStage);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [photo, photoType]);

  return (
    <div ref={boxRef} className="absolute inset-0 -z-10 overflow-hidden">
      <div className="hero-media absolute" style={stage || { inset: 0 }}>
        <picture>
          <source srcSet={photo.webp} type="image/webp" />
          <img
            src={photo.jpg}
            alt={alt}
            width={photo.w}
            height={photo.h}
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="no-zoom block w-full h-full object-cover"
          />
        </picture>

        {stage && (
          <span className="jewel-glint" aria-hidden="true"
            style={{ left: `${photo.jewel.x * 100}%`, top: `${photo.jewel.y * 100}%`, width: `${photo.jewel.size * 100}%` }}>
            <span className="jewel-bloom" />
            <span className="jewel-star" />
          </span>
        )}
      </div>
    </div>
  );
}
