import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiChevronDown, FiMenu, FiX } from 'react-icons/fi';
import Logo from './Logo';
import { site } from '../data/site';
import { categories } from '../data/services';

const menu = [
  { label: 'Home', to: '/' },
  {
    label: 'About Us',
    to: '/about',
    children: [
      { label: 'About Duhita', to: '/about' },
      { label: 'Meet Dr. Sasidhar', to: '/about/dr-nalluru-sasidhar' },
      { label: 'Clinic Gallery', to: '/about/clinic-gallery' },
      { label: 'Patient Reviews', to: '/about/reviews' },
      { label: 'Our Research', to: '/about/our-research' },
    ],
  },
  { label: 'Services', to: '/services', mega: true },
  {
    label: 'For Patients',
    to: '/patient-info',
    children: [
      { label: 'New Patient Registration', to: '/patients/register' },
      { label: 'Book an Appointment', to: '/patients/book-appointment' },
      { label: 'FAQs', to: '/patient-info#faqs' },
    ],
  },
  { label: 'Contact', to: '/contact' },
];

function Dropdown({ item }) {
  if (item.mega) {
    return (
      <div className="absolute right-0 top-full pt-3 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 transition-all duration-200">
        <div className="w-[860px] bg-white shadow-xl border border-line p-8 grid grid-cols-3 gap-x-8 gap-y-6">
          {categories.map((c) => (
            <div key={c.slug}>
              <Link to={`/services/${c.slug}`} className="block text-[14px] font-semibold text-ink hover:text-slate mb-2">
                {c.name}
              </Link>
              <ul className="space-y-1.5">
                {c.treatments.map((t) => (
                  <li key={t.slug}>
                    <Link to={`/services/${c.slug}/${t.slug}`} className="text-[13px] text-body hover:text-slate">
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col justify-end gap-3">
            <Link to="/services/community-dentistry" className="block text-[14px] font-semibold text-ink hover:text-slate">
              Community Dentistry
              <span className="block text-[13px] font-normal text-body mt-1">Free dental camps</span>
            </Link>
            <Link to="/services" className="btn btn-outline">View All Services</Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="absolute left-0 top-full pt-3 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 transition-all duration-200">
      <ul className="min-w-[220px] bg-white shadow-xl border border-line py-2">
        {item.children.map((c) => (
          <li key={c.to}>
            <Link to={c.to} className="block px-5 py-2.5 text-[14px] text-body hover:bg-ivory hover:text-slate">
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    setOpen(false);
    setExpanded(null);
  }, [pathname, hash]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-ivory border-b border-black/5">
      <div className="container-x flex items-center justify-between py-2.5">
        <Logo />

        {/* Desktop */}
        <div className="hidden lg:block">
          <nav aria-label="Main">
            <ul className="flex items-center gap-7">
              {menu.map((item) => (
                <li key={item.label} className="relative group">
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-1 text-[15px] py-2 transition-colors ${
                        isActive ? 'text-ink font-medium' : 'text-body hover:text-ink'
                      }`
                    }
                  >
                    {item.label}
                    {(item.children || item.mega) && (
                      <FiChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                    )}
                  </NavLink>
                  {(item.children || item.mega) && <Dropdown item={item} />}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Mobile toggle */}
        <div className="flex lg:hidden items-center">
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-10 h-10 grid place-items-center text-ink"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden absolute inset-x-0 top-full h-[calc(100dvh-4.5rem)] bg-ivory overflow-y-auto overscroll-contain border-t border-black/5">
          <nav className="container-x py-6" aria-label="Mobile">
            <ul className="divide-y divide-black/10">
              {menu.map((item) => {
                const subs = item.mega
                  ? categories
                      .map((c) => ({ label: c.name, to: `/services/${c.slug}` }))
                      .concat(
                        { label: 'Community Dentistry (Free Dental Camps)', to: '/services/community-dentistry' },
                        { label: 'All Services', to: '/services' },
                      )
                  : item.children;
                return (
                  <li key={item.label} className="py-1">
                    {subs ? (
                      <>
                        <button
                          className="w-full flex items-center justify-between py-3 text-[17px] text-ink"
                          onClick={() => setExpanded(expanded === item.label ? null : item.label)}
                          aria-expanded={expanded === item.label}
                        >
                          {item.label}
                          <FiChevronDown className={`transition-transform ${expanded === item.label ? 'rotate-180' : ''}`} />
                        </button>
                        {expanded === item.label && (
                          <ul className="pb-3 pl-3 space-y-2.5">
                            {subs.map((s) => (
                              <li key={s.to}>
                                <Link to={s.to} className="text-[15px] text-body">{s.label}</Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link to={item.to} className="block py-3 text-[17px] text-ink">{item.label}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 grid gap-3">
              <a href={`tel:${site.phone}`} className="btn btn-solid">Call {site.phoneDisplay}</a>
              <Link to="/patients/book-appointment" className="btn btn-outline">Book An Appointment</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
