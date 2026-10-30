// Short guide for AI assistants (https://llmstxt.org): who NSC is and where the details are.
import { content } from '../lib/content.mjs';
import { abs } from '../lib/seo.mjs';
export async function GET() {
  const { settings: s, home: h, pages, projects, markets } = await content();
  const u = p => abs(s, p);
  const lines = [
    `# ${s.companyName}`, '',
    `> ${s.description}`, '',
    s.aiSummary ? s.aiSummary.trim() + '\n' : `${h.heroText || ''}\n`,
    `Phone ${s.phone} · Email ${s.email} · Head office ${String(s.offices?.[0]?.address || '').replace(/\n/g, ', ')}`, '',
    '## Main pages', '',
    `- [Home](${u('')}): overview, services, selected projects and contact`,
    ...pages.map(p => `- [${p.title}](${u(p.slug.current + '.html')})${p.description ? ': ' + p.description : ''}`),
    `- [All projects](${u('projects/index.html')}): every project with scope, client and photos`, '',
    '## Markets', '',
    ...markets.map(m => `- [${m.title}](${u('markets.html#' + m.anchor)}): ${m.homeText || ''}`), '',
    '## Projects', '',
    ...projects.map(p => `- [${p.name}](${u(`projects/${p.slug.current}.html`)}): ${p.type}, ${p.city}, ${p.live ? 'in progress' : p.year || 'completed'}`), '',
    '## Optional', '',
    `- [Full company profile in plain text](${u('llms-full.txt')}): everything above with full project details, team and careers`,
    `- [Sitemap](${u('sitemap.xml')})`, '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
