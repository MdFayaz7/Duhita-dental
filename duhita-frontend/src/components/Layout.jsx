import { useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { FiPhone, FiCalendar } from 'react-icons/fi';
import Header from './Header';
import Footer from './Footer';
import useReveal from '../hooks/useReveal';
import { site } from '../data/site';

/** Thumb-reach action bar for phones: call, WhatsApp, book — always one tap away. */
function MobileActionBar() {
  const item = 'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11.5px] font-medium min-h-[56px]';
  return (
    <nav aria-label="Quick contact"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex bg-white border-t border-line shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
      <a href={`tel:${site.phone}`} className={`${item} text-ink`}>
        <FiPhone className="w-[18px] h-[18px]" /> Call
      </a>
      <a href={site.whatsapp} target="_blank" rel="noreferrer" className={`${item} text-ink border-x border-line`}>
        <FaWhatsapp className="w-[18px] h-[18px] text-[#25d366]" /> WhatsApp
      </a>
      <Link to="/patients/book-appointment" className={`${item} bg-slate text-white`}>
        <FiCalendar className="w-[18px] h-[18px]" /> Book
      </Link>
    </nav>
  );
}

export default function Layout() {
  const { pathname, hash } = useLocation();
  const isHome = pathname === '/';

  useEffect(() => {
    const el = hash && document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  useReveal([pathname]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] bg-white p-2">Skip to content</a>
      <Header />
      <main id="main" className="pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0"><Outlet /></main>
      {!isHome && <Footer />}
      <MobileActionBar />
      <a href={site.whatsapp} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
        className="hidden lg:grid fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25d366] text-white place-items-center shadow-lg hover:scale-105 transition-transform">
        <FaWhatsapp className="w-7 h-7" />
      </a>
    </>
  );
}
