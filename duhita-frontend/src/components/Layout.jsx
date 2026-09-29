import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
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
      <div className="fixed bottom-4 right-4 lg:bottom-5 lg:right-5 z-40 flex flex-col items-end gap-3"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        {pathname !== '/assistant' && (
          <Link to="/assistant" aria-label="Ask Duhita AI, our dental assistant"
            className="grid w-[52px] h-[52px] lg:w-14 lg:h-14 rounded-full bg-[#0e9aa7] text-white place-items-center shadow-lg ring-2 ring-white hover:scale-105 transition-transform overflow-hidden">
            <img src="/images/brand/duhita-ai-avatar.png" alt="" className="w-full h-full object-cover" />
          </Link>
        )}
        <a href={site.whatsapp} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
          className="grid w-[52px] h-[52px] lg:w-14 lg:h-14 rounded-full bg-[#25d366] text-white place-items-center shadow-lg hover:scale-105 transition-transform">
          <FaWhatsapp className="w-7 h-7" />
        </a>
      </div>
    </>
  );
}
