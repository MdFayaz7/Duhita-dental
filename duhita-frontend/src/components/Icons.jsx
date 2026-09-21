/* Thin line icons drawn for Duhita Dental (stroke = currentColor). */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const paths = {
  tooth: (
    <path d="M12 5c-2-1.6-5.2-1.8-6.8.3-1.5 2-.9 5 .1 7.5.8 2 .9 4 1.4 6.4.3 1.4 1.9 1.6 2.4.2l1.1-3.6c.4-1.2 1.2-1.2 1.6 0l1.1 3.6c.5 1.4 2.1 1.2 2.4-.2.5-2.4.6-4.4 1.4-6.4 1-2.5 1.6-5.5.1-7.5C17.2 3.2 14 3.4 12 5z" />
  ),
  root: (
    <>
      <path d="M12 4.5c-1.8-1.3-4.6-1.4-6 .3-1.3 1.7-.8 4.3.1 6.4.7 1.8.8 3.6 1.3 5.7.3 1.2 1.7 1.4 2.1.2l1-3.1c.4-1 1.1-1 1.5 0l1 3.1c.4 1.2 1.8 1 2.1-.2.5-2.1.6-3.9 1.3-5.7.9-2.1 1.4-4.7.1-6.4-1.4-1.7-4.2-1.6-6-.3z" />
      <path d="M10.2 8.5v5.5M13.8 8.5v5.5" />
    </>
  ),
  implant: (
    <>
      <path d="M8 4h8c.8 0 1.5.7 1.3 1.5l-.8 3.5H7.5l-.8-3.5C6.5 4.7 7.2 4 8 4z" />
      <path d="M9 9h6M9.5 11.5h5M10 14h4M10.5 16.5h3M11 19h2l-1 1.5z" />
    </>
  ),
  braces: (
    <>
      <path d="M3 12c3-2 15-2 18 0" />
      <rect x="5" y="9.5" width="3" height="3.5" rx=".6" />
      <rect x="10.5" y="9" width="3" height="3.5" rx=".6" />
      <rect x="16" y="9.5" width="3" height="3.5" rx=".6" />
    </>
  ),
  child: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M10 8.5h.01M14 8.5h.01M10.2 11a2.4 2.4 0 003.6 0M6.5 20c1-2.6 3-4 5.5-4s4.5 1.4 5.5 4" />
    </>
  ),
  gum: (
    <>
      <path d="M3 9c2.5 2 15.5 2 18 0" />
      <path d="M6 10.5c0 3 .6 6 1.6 6s1-3 1.9-3 .9 3 1.9 3 .9-3 1.9-3 .9 3 1.9 3 1.6-3 1.6-6" />
    </>
  ),
  surgery: (
    <>
      <path d="M4 20l9-9M13 11l3-6 3 3-6 3" />
      <path d="M9 4v4M7 6h4" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
      <path d="M12 8c-1.2-.9-3-.9-3.8.2-.8 1.1-.4 2.8.1 4 .4 1 .5 2 .8 3 .2.6.9.7 1.1.1l.6-1.8c.2-.6.6-.6.8 0l.6 1.8c.2.6.9.5 1.1-.1.3-1 .4-2 .8-3 .5-1.2.9-2.9.1-4C15 7.1 13.2 7.1 12 8z" />
    </>
  ),
  surgeon: (
    <>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20c.6-3.7 3.3-6 7-6s6.4 2.3 7 6M12 14v3M10.5 15.5h3" />
    </>
  ),
  comfort: (
    <>
      <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  rupee: (
    <>
      <path d="M7 5h10M7 9h10M7 5c5 0 5 8 0 8l7 6" />
    </>
  ),
};

export default function Icon({ name, className = 'w-10 h-10' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      {paths[name] || paths.tooth}
    </svg>
  );
}
