import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Full-bleed hero photo with a sparkling diamond set on the patient's tooth jewel.
 *
 * The photo is laid out like `object-fit: cover`, but by hand, so the diamond can be
 * pinned to an exact point of the photo and stay on the tooth at every screen size
 * (and move with the hero's slow zoom, which animates this whole stage).
 */
const PHOTO = { webp: '/images/hero-smile.webp', jpg: '/images/hero-smile.jpg', w: 1870, h: 841 };
const FOCUS = { x: 0.76, y: 0.5 };                       // which part of the photo stays in view when cropped
const JEWEL = { x: 0.6649, y: 0.4889, size: 0.0125 };    // measured centre of the jewel; size = share of photo width

function Diamond() {
  return (
    <svg viewBox="0 0 100 100" className="block w-full h-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="dm-body" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f2fbff" />
          <stop offset="0.35" stopColor="#7cc8ff" />
          <stop offset="0.75" stopColor="#1f7de6" />
          <stop offset="1" stopColor="#0a3f99" />
        </radialGradient>
        <linearGradient id="dm-table" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8fd3ff" />
        </linearGradient>
      </defs>

      {/* girdle + pavilion */}
      <circle cx="50" cy="50" r="46" fill="url(#dm-body)" stroke="#dff3ff" strokeWidth="2.5" />
      {/* crown facets radiating from the table */}
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.6" fill="none">
        <path d="M50 4 L64 24 L50 30 L36 24 Z M96 50 L76 64 L70 50 L76 36 Z M50 96 L36 76 L50 70 L64 76 Z M4 50 L24 36 L30 50 L24 64 Z" />
        <path d="M17 17 L36 24 L24 36 Z M83 17 L76 36 L64 24 Z M83 83 L64 76 L76 64 Z M17 83 L24 64 L36 76 Z" />
      </g>
      {/* table */}
      <polygon points="36,24 64,24 76,36 76,64 64,76 36,76 24,64 24,36" fill="url(#dm-table)" fillOpacity="0.85"
        stroke="#ffffff" strokeWidth="1.8" className="diamond-table" />
      {/* specular highlight */}
      <ellipse cx="38" cy="33" rx="11" ry="6" fill="#ffffff" opacity="0.9" transform="rotate(-30 38 33)" />
    </svg>
  );
}

function Sparkle({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M50 0 C53 38 62 47 100 50 C62 53 53 62 50 100 C47 62 38 53 0 50 C38 47 47 38 50 0 Z" fill="#ffffff" />
    </svg>
  );
}

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
          <span
            className="diamond absolute pointer-events-none"
            style={{
              left: `${JEWEL.x * 100}%`,
              top: `${JEWEL.y * 100}%`,
              width: `${JEWEL.size * 100}%`,
              aspectRatio: '1 / 1',
            }}
          >
            <span className="diamond-glow" />
            <Diamond />
            <Sparkle className="diamond-sparkle" />
            <Sparkle className="diamond-sparkle diamond-sparkle--small" />
          </span>
        )}
      </div>
    </div>
  );
}
