/**
 * Tells IndexNow search engines (Bing, Yandex, Seznam, Naver…) that the site's pages changed.
 * Run after a deploy has finished:  node scripts/indexnow.mjs
 * Reads the live sitemap, so it always submits exactly the pages that are published.
 * The key file public/42cd3a92898d747320e6d849563bc504.txt proves we own the domain — keep it deployed.
 */
const HOST = 'duhitadental.com';
const KEY = '42cd3a92898d747320e6d849563bc504';

const sitemap = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error('no URLs found in the live sitemap');

const keyLive = await fetch(`https://${HOST}/${KEY}.txt`).then((r) => (r.ok ? r.text() : ''));
if (keyLive.trim() !== KEY) throw new Error('key file is not live yet — deploy first');

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: submitted ${urlList.length} URLs → HTTP ${res.status} ${res.statusText}`);
if (!res.ok && res.status !== 202) process.exit(1);
