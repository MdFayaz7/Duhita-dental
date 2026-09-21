import { Link } from 'react-router-dom';

/** Inner-page hero: image band with overlay, eyebrow, H1 and breadcrumbs. */
export default function PageHero({ eyebrow, title, image, crumbs = [], children }) {
  return (
    <section className="relative isolate overflow-hidden bg-slate">
      {image && <img src={image} alt="" className="absolute inset-0 -z-10 w-full h-full object-cover opacity-40" />}
      <div className="absolute inset-0 -z-10 bg-slate/85 md:bg-transparent md:bg-gradient-to-r md:from-slate md:via-slate/85 md:to-slate/30" />
      <div className="container-x py-14 sm:py-20 md:py-28 text-white">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="text-[12px] text-white/70 mb-5">
            <ol className="flex flex-wrap gap-2">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex gap-2">
                  {c.to ? <Link to={c.to} className="hover:text-white">{c.label}</Link> : <span className="text-white">{c.label}</span>}
                  {i < crumbs.length - 1 && <span>/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="text-[14px] font-semibold tracking-wide mb-4">{eyebrow}</p>}
        <h1 className="!text-white text-[30px] sm:text-[40px] md:text-[60px] leading-[1.05] max-w-3xl">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-[15.5px] sm:text-[17px] leading-relaxed text-white/85">{children}</div>}
      </div>
    </section>
  );
}
