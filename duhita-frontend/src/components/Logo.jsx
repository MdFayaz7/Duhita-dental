import { Link } from 'react-router-dom';

export default function Logo({ light = false, size = 'md' }) {
  const img = size === 'lg' ? 'h-20' : 'h-12 md:h-14';
  return (
    <Link to="/" className="group flex items-center gap-3" aria-label="Duhita Dental home">
      <span className={`logo-mark shrink-0 ${light ? 'bg-white rounded-2xl p-2' : ''}`}>
        <img src="/images/brand/duhita-logo-sm.png" alt="Duhita Dental Care logo" width="120" height="145"
          className={`no-zoom ${img} w-auto`} />
      </span>
      <span className="leading-none">
        <span className={`block font-display text-[18px] min-[380px]:text-[21px] md:text-[23px] tracking-wide uppercase ${light ? 'text-white' : 'text-ink'}`}>Duhita Dental</span>
        <span className={`hidden min-[380px]:block mt-1 text-[10px] md:text-[10.5px] tracking-[0.16em] uppercase ${light ? 'text-white/70' : 'text-stone'}`}>
          Multispeciality Dental Centre
        </span>
      </span>
    </Link>
  );
}
