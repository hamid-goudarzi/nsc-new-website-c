// Small helpers shared by all templates: images, text, links.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export { esc };

/** Responsive <img> attributes for an image object {local, alt, focus}. Every photo exists at 1280 and 2560 px. */
export function img(image, pre = '', { sizes = '100vw', eager = false } = {}) {
  if (!image?.local) return null;
  const k = image.local;
  return {
    src: `${pre}media/${k}-1280.webp`,
    srcset: `${pre}media/${k}-1280.webp 1280w, ${pre}media/${k}-2560.webp 2560w`,
    sizes, alt: image.alt || '', loading: eager ? undefined : 'lazy', decoding: 'async',
    style: image.focus ? `object-position:${image.focus}` : undefined,
  };
}
export const imgUrl = (image, pre = '', w = 1280) => image?.local ? `${pre}media/${image.local}-${w > 1280 ? 2560 : 1280}.webp` : '';
export const tagOf = image => image?.tag === 'drawing' ? 'Drawing' : image?.tag === 'illustration' ? 'Illustration' : '';

/** Split a plain-text field into paragraphs (blank line = new paragraph). */
export const paras = t => String(t || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

/** Escape text, keep line breaks, and turn emails, phone numbers and web links into links. */
export function linkify(t) {
  return esc(t)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(>])([\w.+-]+@[\w-]+\.[\w.-]*\w)/g, '$1<a href="mailto:$2">$2</a>')
    .replace(/\b(\d{3})[-. ](\d{3})[-. ](\d{4})\b/g, (m, a, b, c) => `<a href="tel:${a}${b}${c}">${m}</a>`)
    .replace(/\n/g, '<br>');
}
export const tel = p => 'tel:' + String(p || '').replace(/[^\d+]/g, '');

/** Resolve a link typed by editors: page names (about.html), full URLs, emails or phone numbers. */
export function href(link, pre = '') {
  if (!link) return '#';
  const l = String(link).trim();
  if (/^(https?:|mailto:|tel:|#)/i.test(l)) return l;
  if (/^[a-z][a-z0-9+.-]*:/i.test(l)) return '#';            // block javascript:, data: and other unsafe links
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(l)) return 'mailto:' + l;
  if (/^[\d\s().+-]{10,}$/.test(l)) return tel(l);
  return pre + l.replace(/^\//, '');
}
export const pad2 = i => String(i + 1).padStart(2, '0');
export const initials = n => String(n || '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('');
export const projUrl = (p, pre = '') => `${pre}projects/${p.slug.current}.html`;

/** Minimal Markdown for editor text: ## headings, - and 1. lists, **bold**, *italic*, [links](url), blank line = paragraph. */
export function md(src) {
  const inline = s => {
    const links = [];
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => { links.push([t, u]); return `\u0000${links.length - 1}\u0000`; });
    return linkify(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
      .replace(/\u0000(\d+)\u0000/g, (m, i) => { const [t, u] = links[i]; const h = href(u); return `<a href="${esc(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}>${esc(t)}</a>`; });
  };
  const out = [];
  for (const block of String(src || '').replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n').filter(l => l.trim());
    if (!lines.length) continue;
    const h = lines[0].match(/^(#{2,4})\s+(.*)$/);
    if (h && lines.length === 1) { const n = h[1].length + 1; out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
    if (lines.every(l => /^\s*[-*]\s+/.test(l))) { out.push('<ul>' + lines.map(l => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('') + '</ul>'); continue; }
    if (lines.every(l => /^\s*\d+[.)]\s+/.test(l))) { out.push('<ol>' + lines.map(l => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('') + '</ol>'); continue; }
    out.push(`<p>${lines.map(inline).join('<br>')}</p>`);
  }
  return out.join('');
}

/** Turn a YouTube or Vimeo page link into an embeddable player link. */
export function embedUrl(u) {
  const s = String(u || '');
  let m = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = s.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return /^https:\/\//i.test(s) ? s : 'about:blank';
}
