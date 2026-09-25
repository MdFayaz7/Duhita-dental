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
        <li key={t.slug}><Link to={`/services/${category.slug}/${t.slug}`} className="hover:text-white">{t.title}</Link></li>
      ))}
      {extra.map((e) => (
        <li key={e.slug} className="pt-1 sm:pt-2"><Link to={`/services/${e.slug}`} className="font-semibold text-white">{e.name}</Link></li>
      ))}
    </ul>
  );

  if (!phone) {
    return (
      <div>
        <Link to={`/services/${category.slug}`} className="block font-semibold text-white text-[14px] mb-3">{category.name}</Link>
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
      <div className="container-x pt-12 pb-9 sm:pt-16 sm:pb-10">
        <div className="grid gap-10 sm:gap-12 lg:grid-cols-[1.1fr_1fr_2.4fr]">
          <div>
            <Logo light />
            <p className="mt-5 text-[14px] leading-relaxed text-white/70 max-w-xs">
              Specialist dental care for families across Vijayawada since 1997 — led by an M.D.S oral &amp; maxillofacial surgeon.
            </p>
            <div className="flex gap-3 mt-6">
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

          <ul className="space-y-3.5 text-[14px] max-sm:[&_a]:inline-block max-sm:[&_a]:py-1">
            <li className="flex gap-3"><FiMail className="mt-0.5 shrink-0" /><a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a></li>
            <li className="flex gap-3"><FiPhone className="mt-0.5 shrink-0" /><a href={`tel:${site.phone}`} className="hover:text-white">{site.phoneDisplay}</a></li>
            <li className="flex gap-3"><FiMapPin className="mt-0.5 shrink-0" /><span>{site.addressLines.join(', ')}</span></li>
            <li className="flex gap-3"><FiClock className="mt-0.5 shrink-0" />
              <span>{site.hours.map((h) => <span key={h.label} className="block">{h.label}: {h.value}</span>)}</span>
            </li>
          </ul>

          <div>
            <ul className="grid grid-cols-2 gap-x-4 sm:flex sm:flex-wrap sm:gap-x-6 text-[14px] font-semibold text-white mb-7 sm:mb-8 max-sm:[&_a]:inline-flex max-sm:[&_a]:items-center max-sm:[&_a]:min-h-[40px]">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/about/dr-nalluru-sasidhar">Meet Dr. Sasidhar</Link></li>
              <li><Link to="/about/clinic-gallery">Clinic Gallery</Link></li>
              <li><Link to="/about/reviews">Reviews</Link></li>
              <li><Link to="/about/our-research">Our Research</Link></li>
              <li><Link to="/services/community-dentistry">Free Dental Camps</Link></li>
              <li><Link to="/patient-info">For Patients</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
            {/* Phones get accordions so the footer stays short; desktop keeps the three columns. */}
            <div className="grid sm:grid-cols-3 gap-2 sm:gap-8 divide-y divide-white/10 sm:divide-y-0">
              {cols.map((c, i) => (
                <ServiceGroup key={c.slug} category={c} extra={i === 2 ? extra : []} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-14 pt-6 border-t border-white/20 flex flex-col md:flex-row gap-2.5 justify-between text-[12.5px] sm:text-[13px] text-white/60">
          <p>© {new Date().getFullYear()} {site.fullName}, Vijayawada. All rights reserved.</p>
          <p>Serving {site.areas.slice(0, 5).join(', ')} &amp; all of Vijayawada.</p>
        </div>
      </div>
    </footer>
  );
}
