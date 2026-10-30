// The full company profile in plain text, for AI assistants and answer engines.
import { content } from '../lib/content.mjs';
import { fullText } from '../lib/seo.mjs';
export async function GET() {
  return new Response(fullText(await content()), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
