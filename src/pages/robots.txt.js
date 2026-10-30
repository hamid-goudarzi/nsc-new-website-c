// Search engines and AI assistants are welcome everywhere except the admin.
import { content } from '../lib/content.mjs';
import { abs } from '../lib/seo.mjs';
const AI = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'Bingbot', 'Googlebot', 'DuckAssistBot', 'meta-externalagent', 'Amazonbot', 'CCBot', 'cohere-ai', 'MistralAI-User'];
export async function GET() {
  const { settings: s } = await content();
  const txt = `# ${s.companyName}
# Search engines and AI assistants are welcome to read and cite this site.
# A plain-text company summary for AI assistants: ${abs(s, 'llms.txt')}

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

${AI.map(a => `User-agent: ${a}\nAllow: /\nDisallow: /admin/\nDisallow: /api/`).join('\n\n')}

Sitemap: ${abs(s, 'sitemap.xml')}
`;
  return new Response(txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
