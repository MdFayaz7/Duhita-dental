import { Link } from 'react-router-dom';

/** Inner-page hero: image band with overlay, eyebrow, H1 and breadcrumbs. */
export default function PageHero({ eyebrow, title, image, crumbs = [], children }) {
  return (
    <section className="relative isolate overflow-hidden bg-slate">
      {image && <img src={image} alt="" className="absolute inset-0 -z-10 w-full h-full object-cover opacity-40" />}
      <div className="absolute inset-0 -z-10 bg-slate/85 md:bg-transparent md:bg-gradient-to-r md:from-slate md:via-slate/85 md:to-slate/30" />
      <div className="container-x py-11 sm:py-20 md:py-28 text-white">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-white/70 mb-4 sm:mb-5">
            <ol className="flex flex-wrap gap-x-2 gap-y-1">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex gap-2">
                  {c.to ? <Link to={c.to} className="inline-block max-sm:py-1 hover:text-white">{c.label}</Link> : <span className="inline-block max-sm:py-1 text-white">{c.label}</span>}
                  {i < crumbs.length - 1 && <span className="max-sm:py-1">/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="text-[14px] font-semibold tracking-wide mb-4">{eyebrow}</p>}
        <h1 className="!text-white text-[28px] min-[390px]:text-[32px] sm:text-[40px] md:text-[60px] leading-[1.1] sm:leading-[1.05] max-w-3xl">{title}</h1>
        {children && <div className="mt-4 sm:mt-5 max-w-2xl text-[15px] sm:text-[17px] leading-relaxed text-white/85">{children}</div>}
      </div>
    </section>
  );
}
