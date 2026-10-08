import { Link } from 'react-router-dom';
import { FiChevronDown } from 'react-icons/fi';
import { FiMail, FiPhone, FiMapPin, FiClock, FiInstagram, FiFacebook } from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';
import Logo from './Logo';
import { site } from '../data/site';
import { categories } from '../data/services';
import { usePhone } from '../hooks/useMediaQuery';

function ServiceGroup({ category, extra }) {
  const phone = usePhone();
  const links = (
    <ul className="pb-3 sm:pb-0 space-y-1 sm:space-y-2 text-[13.5px] text-white/70 max-sm:[&_a]:inline-flex max-sm:[&_a]:items-center max-sm:[&_a]:min-h-[38px]">
      {category.treatments.map((t) => (
        <li key={t.slug}><Link to={`/services/${category.slug}/${t.slug}`} className="hover:text-white transition-colors">{t.title}</Link></li>
      ))}
      {extra.length > 0 && (
        <div className="border-t border-white/10 pt-2.5 mt-2.5 space-y-1 sm:space-y-2">
          {extra.map((e) => (
            <li key={e.slug}><Link to={`/services/${e.slug}`} className="font-semibold text-white/90 hover:text-white transition-colors">{e.name}</Link></li>
          ))}
        </div>
      )}
    </ul>
  );

  if (!phone) {
    return (
      <div>
        <Link to={`/services/${category.slug}`} className="block font-semibold text-white text-[14.5px] mb-3 hover:text-white/80 transition-colors">{category.name}</Link>
        {links}
      </div>
    );
  }

  return (
    <details className="group">
      <summary className="flex items-center justify-between min-h-[48px] font-semibold text-white text-[14.5px] cursor-pointer list-none marker:hidden">
        {category.name}
        <FiChevronDown className="transition-transform group-open:rotate-180" />
      </summary>
      <Link to={`/services/${category.slug}`} className="inline-flex items-center min-h-[38px] text-[13.5px] text-white underline underline-offset-4">
        All {category.name}
      </Link>
      {links}
    </details>
  );
}

export default function Footer() {
  const cols = categories.slice(0, 3);
  const extra = categories.slice(3);
  return (
    <footer className="bg-slate text-white/85">
      <div className="container-x pt-8 pb-6 sm:pt-14 sm:pb-10">
        {/* Top Navigation Strip */}
        <nav aria-label="Quick links" className="border-b border-white/15 pb-6 mb-8 sm:mb-11">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3 text-[13.5px] sm:text-[14px] font-medium text-white/85">
            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link to="/about/dr-nalluru-sasidhar" className="hover:text-white transition-colors">Meet Dr. Sasidhar</Link></li>
            <li><Link to="/about/clinic-gallery" className="hover:text-white transition-colors">Clinic Gallery</Link></li>
            <li><Link to="/about/reviews" className="hover:text-white transition-colors">Patient Reviews</Link></li>
            <li><Link to="/about/our-research" className="hover:text-white transition-colors">Our Research</Link></li>
            <li><Link to="/services/community-dentistry" className="hover:text-white transition-colors">Free Dental Camps</Link></li>
            <li><Link to="/patient-info" className="hover:text-white transition-colors">For Patients</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </nav>

        <div className="grid gap-7 sm:gap-12 lg:grid-cols-[1.1fr_1fr_2.4fr]">
          <div>
            <Logo light />
            <p className="mt-4 sm:mt-5 text-[13.5px] sm:text-[14px] leading-relaxed text-white/70 max-w-xs">
              Specialist dental care for families across Vijayawada since 1997 — led by an MDS endodontist and implantologist.
            </p>
            <div className="flex gap-3 mt-4 sm:mt-6">
              {[
                [FiFacebook, site.social.facebook, 'Facebook'],
                [FiInstagram, site.social.instagram, 'Instagram'],
                [FaGoogle, site.social.google, 'Google reviews'],
              ].map(([I, href, label]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
                  className="w-11 h-11 sm:w-9 sm:h-9 grid place-items-center rounded-full border border-white/30 hover:bg-white hover:text-slate transition-colors">
                  <I className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <ul className="space-y-2.5 sm:space-y-3.5 text-[13.5px] sm:text-[14px] max-sm:[&_a]:inline-block max-sm:[&_a]:py-0.5">
            <li className="flex gap-3"><FiMail className="mt-0.5 shrink-0" /><a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a></li>
            <li className="flex gap-3"><FiPhone className="mt-0.5 shrink-0" /><a href={`tel:${site.phone}`} className="hover:text-white">{site.phoneDisplay}</a></li>
            <li className="flex gap-3"><FiMapPin className="mt-0.5 shrink-0" /><span>{site.addressLines.join(', ')}</span></li>
            <li className="flex gap-3"><FiClock className="mt-0.5 shrink-0" />
              <span>{site.hours.map((h) => <span key={h.label} className="block">{h.label}: {h.value}</span>)}</span>
            </li>
          </ul>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50 mb-3.5 sm:mb-5">Treatments &amp; Specialities</p>
            {/* Phones get accordions so the footer stays short; desktop keeps the three columns. */}
            <div className="grid sm:grid-cols-3 gap-2 sm:gap-8 divide-y divide-white/10 sm:divide-y-0">
              {cols.map((c, i) => (
                <ServiceGroup key={c.slug} category={c} extra={i === 2 ? extra : []} />
              ))}
            </div>
          </div>
        </div>

        {/* Refined single-tier bottom bar */}
        <div className="mt-10 sm:mt-14 pt-6 sm:pt-7 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] sm:text-[12.5px] text-white/55">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 text-center sm:text-left">
            <span>© {new Date().getFullYear()} {site.fullName}.</span>
            <span className="hidden sm:inline text-white/20">·</span>
            <span>All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-white/70">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span className="text-white/25">|</span>
            <Link to="/terms-conditions" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
            <span className="text-white/25">|</span>
            <Link to="/medical-disclaimer" className="hover:text-white transition-colors">Medical &amp; AI Disclaimer</Link>
            <span className="text-white/25">|</span>
            <Link to="/appointment-policy" className="hover:text-white transition-colors">Appointment Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
