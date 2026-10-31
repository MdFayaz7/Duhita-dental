/**
 * Runs after `vite build` + `vite build --ssr` (see package.json "build").
 *
 * For every public route it writes dist/<route>/index.html with that page's own <title>, description,
 * canonical, Open Graph / Twitter tags, page JSON-LD and the rendered body, so crawlers that don't run
 * JavaScript (and link previews) see real content. Also writes:
 *   dist/404.html   — served by nginx with a real 404 status for unknown URLs
 *   dist/spa.html   — the empty, noindex shell for client-only routes (/admin, /account)
 *   dist/sitemap.xml — generated from the same route list, so it can't drift from the site
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const SSR_DIR = resolve(ROOT, 'dist-ssr');
const DOMAIN = 'https://duhitadental.com';

const { render, routes } = await import(pathToFileURL(resolve(SSR_DIR, 'entry-server.js')).href);
const template = await readFile(resolve(DIST, 'index.html'), 'utf8');

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Tags the template carries for the homepage that each page replaces with its own.
const PER_PAGE_META = /<meta\s+(?:name|property)="(?:description|robots|og:type|og:url|og:title|og:description|og:image|og:image:secure_url|og:image:width|og:image:height|og:image:alt|twitter:card|twitter:title|twitter:description|twitter:image)"[^>]*>\s*/g;
const TITLE = /<title>[\s\S]*?<\/title>/;
const CANONICAL = /<link\s+rel="canonical"[^>]*>\s*/g;
const base = template.replace(PER_PAGE_META, '').replace(CANONICAL, '');

function headTags(h) {
  const tags = [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}" />`,
    `<meta name="robots" content="${esc(h.robots)}" />`,
    // A noindex page (the 404) points nowhere: a canonical would contradict it.
    h.robots.startsWith('noindex') ? null : `<link rel="canonical" href="${esc(h.canonical)}" />`,
    `<meta property="og:type" content="${esc(h.type)}" />`,
    `<meta property="og:url" content="${esc(h.canonical)}" />`,
    `<meta property="og:title" content="${esc(h.title)}" />`,
    `<meta property="og:description" content="${esc(h.description)}" />`,
    `<meta property="og:image" content="${esc(h.image)}" />`,
    `<meta property="og:image:secure_url" content="${esc(h.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(h.title)}" />`,
    `<meta name="twitter:description" content="${esc(h.description)}" />`,
    `<meta name="twitter:image" content="${esc(h.image)}" />`,
  ].filter(Boolean);
  // Same id useSeo uses, so the browser updates this script instead of adding a second copy.
  if (h.schema) tags.push(`<script type="application/ld+json" id="page-schema-ld">${JSON.stringify(h.schema).replace(/</g, '\\u003c')}</script>`);
  return tags.join('\n    ');
}

function page(head, body) {
  return base
    .replace(TITLE, headTags(head))
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

const outFile = (route) =>
  route === '/' ? resolve(DIST, 'index.html') : resolve(DIST, `.${route}`, 'index.html');

// Client-only shell first, before dist/index.html is overwritten by the prerendered homepage.
await writeFile(
  resolve(DIST, 'spa.html'),
  base.replace(TITLE, '<title>Duhita Dental</title>\n    <meta name="robots" content="noindex, nofollow" />'),
);

for (const route of routes) {
  const { html, head } = await render(route);
  if (!head.title) throw new Error(`${route}: page did not call useSeo`);
  if (head.robots.startsWith('noindex')) throw new Error(`${route}: listed as public but is noindex`);
  const file = outFile(route);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page(head, html));
}

const notFound = await render('/404');
await writeFile(resolve(DIST, '404.html'), page(notFound.head, notFound.html));

await writeFile(
  resolve(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${DOMAIN}${r === '/' ? '/' : r}</loc></url>`).join('\n')}
</urlset>
`,
);

await rm(SSR_DIR, { recursive: true, force: true });
console.log(`prerendered ${routes.length} pages + 404.html, spa.html, sitemap.xml`);
