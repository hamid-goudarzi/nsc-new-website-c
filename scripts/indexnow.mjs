// After a production build on Vercel, tell Bing, Yandex and other IndexNow search engines which pages exist,
// so new and changed pages are picked up quickly (Bing's index also feeds ChatGPT search and Copilot).
// Never fails the build.
import fs from 'node:fs';

const KEY = '07718281179c3d1bfd8ca8be13da7fe9';
if (process.env.VERCEL_ENV !== 'production') { console.log('IndexNow: skipped (not a production build).'); process.exit(0); }
try {
  const xml = fs.readFileSync('dist/sitemap.xml', 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const host = new URL(urls[0]).host;
  const ctl = new AbortController(); setTimeout(() => ctl.abort(), 8000);
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: KEY, keyLocation: `https://${host}/${KEY}.txt`, urlList: urls }),
  });
  console.log(`IndexNow: sent ${urls.length} addresses, answer ${r.status}.`);
} catch (e) { console.log('IndexNow: could not send (' + e.message + '). The site is still published.'); }
