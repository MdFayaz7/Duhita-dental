import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import Header from './Header';
import Footer from './Footer';
import useReveal from '../hooks/useReveal';
import { site } from '../data/site';

import { preloadRoute } from '../lib/preloadRoute';

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

  // Proactive preloading of routes on hover/pointerdown and idle time
  useEffect(() => {
    const handlePointerEnter = (e) => {
      const anchor = e.target.closest?.('a[href^="/"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && !href.startsWith('//')) {
          preloadRoute(href);
        }
      }
    };

    document.addEventListener('pointerenter', handlePointerEnter, { passive: true, capture: true });

    // Idle-load high traffic routes
    let idleId;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => {
        preloadRoute('/services');
        preloadRoute('/patients/book-appointment');
        preloadRoute('/about');
      }, { timeout: 2500 });
    }

    return () => {
      document.removeEventListener('pointerenter', handlePointerEnter, { capture: true });
      if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  useReveal([pathname]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] bg-white p-2">Skip to content</a>
      <Header />
      <main id="main"><Outlet /></main>
      {!isHome && pathname !== '/assistant' && <Footer />}
      {pathname !== '/assistant' && (
        <div className={`fixed right-4 lg:bottom-5 lg:right-5 z-40 flex flex-col items-end gap-3 ${isHome ? 'bottom-24' : 'bottom-4'}`}
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          <Link to="/assistant" aria-label="Ask Duhita AI, our dental assistant"
            className="grid w-[52px] h-[52px] lg:w-14 lg:h-14 rounded-full bg-[#0e9aa7] text-white place-items-center shadow-lg ring-2 ring-white hover:scale-105 transition-transform overflow-hidden">
            <img src="/images/brand/duhita-ai-avatar.png" alt="Duhita AI Dental Assistant" width="56" height="56" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </Link>
          <a href={site.whatsapp} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
            className="grid w-[52px] h-[52px] lg:w-14 lg:h-14 rounded-full bg-[#25d366] text-white place-items-center shadow-lg hover:scale-105 transition-transform">
            <FaWhatsapp className="w-7 h-7" />
          </a>
        </div>
      )}
    </>
  );
}
