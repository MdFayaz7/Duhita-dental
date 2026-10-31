/**
 * Build-time prerender entry (see scripts/prerender.mjs). Renders one public URL to static HTML so
 * search engines, AI crawlers and link previews get each page's real content and <head>, not an
 * empty <div id="root">. The browser then hydrates it (src/main.jsx).
 */
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router-dom';
import { AppProviders, AppRoutes } from './App';
import { ssrHead } from './lib/ssrHead';
import { categories } from './data/services';

/** Every public, indexable page. The sitemap is generated from this same list. */
export const routes = [
  '/',
  '/about',
  '/about/dr-nalluru-sasidhar',
  '/about/clinic-gallery',
  '/about/reviews',
  '/about/our-research',
  '/services',
  ...categories.flatMap((c) => [`/services/${c.slug}`, ...c.treatments.map((t) => `/services/${c.slug}/${t.slug}`)]),
  '/services/community-dentistry',
  '/patient-info',
  '/contact',
  '/patients/book-appointment',
  '/patients/register',
  '/home-service',
  '/assistant',
  '/privacy-policy',
  '/terms-conditions',
  '/medical-disclaimer',
  '/appointment-policy',
];

async function streamToString(stream) {
  let out = '';
  for await (const chunk of stream) out += chunk;
  return out;
}

export async function render(url) {
  for (const key of Object.keys(ssrHead)) delete ssrHead[key];
  const { prelude } = await prerenderToNodeStream(
    <AppProviders>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </AppProviders>,
  );
  return { html: await streamToString(prelude), head: { ...ssrHead } };
}
