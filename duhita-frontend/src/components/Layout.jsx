import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import Header from './Header';
import Footer from './Footer';
import useReveal from '../hooks/useReveal';
import { site } from '../data/site';

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
      <main id="main"><Outlet /></main>
      {!isHome && <Footer />}
      <a href={site.whatsapp} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
        className="hidden lg:grid fixed bottom-5 right-4 lg:right-5 z-40 w-[52px] h-[52px] lg:w-14 lg:h-14 rounded-full bg-[#25d366] text-white place-items-center shadow-lg hover:scale-105 transition-transform"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <FaWhatsapp className="w-7 h-7" />
      </a>
    </>
  );
}
