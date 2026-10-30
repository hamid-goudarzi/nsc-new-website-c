// Every public page, for Google, Bing and other search engines.
import { content } from '../lib/content.mjs';
import { abs } from '../lib/seo.mjs';
export async function GET() {
  const c = await content();
  const s = c.settings;
  const today = new Date().toISOString().slice(0, 10);
  const day = d => (d || today).slice(0, 10);
  const newest = ds => ds.map(d => d?._updatedAt).filter(Boolean).sort().at(-1);
  const img = i => i?.local ? `<image:image><image:loc>${abs(s, `media/${i.local}-2560.webp`)}</image:loc></image:image>` : '';
  const rows = [
    ['', newest([c.home, s, ...c.projects]), '1.0', img(c.home.featureImage)],
    ['projects/index.html', newest([c.projectsPage, ...c.projects]), '0.9', img(c.projectsPage.hero?.image)],
    ...c.pages.map(p => [`${p.slug.current}.html`, p._updatedAt, '0.8', img(p.hero?.image)]),
    ...c.projects.map(p => [`projects/${p.slug.current}.html`, p._updatedAt, p.live ? '0.8' : '0.7', [p.heroImage, ...(p.gallery || [])].slice(0, 8).map(img).join('')]),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${rows.map(([p, m, pr, im]) => `<url><loc>${abs(s, p)}</loc><lastmod>${day(m)}</lastmod><priority>${pr}</priority>${im}</url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
