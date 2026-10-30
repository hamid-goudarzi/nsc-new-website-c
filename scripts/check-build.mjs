// Runs after every build. If a page links to a missing page or photo, the build fails and
// Vercel keeps the last good version of the site online.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const problems = [];
const warn = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(DIST);
const html = files.filter(f => f.endsWith('.html') && !f.includes(`${path.sep}admin${path.sep}`));

for (const need of ['index.html', 'projects/index.html', 'sitemap.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', 'build.json']) {
  if (!fs.existsSync(path.join(DIST, need))) problems.push(`missing ${need}`);
}
for (const f of html) {
  const t = fs.readFileSync(f, 'utf8');
  const rel = path.relative(DIST, f);
  if (!/<title>[^<]{5,}<\/title>/.test(t)) problems.push(`${rel}: no title`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(t)) warn.push(`${rel}: no search description`);
  if ((t.match(/<h1[\s>]/g) || []).length !== 1) warn.push(`${rel}: should have exactly one main heading`);
  for (const m of t.matchAll(/\s(?:href|src|data-full)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(u) || u === '') continue;
    const target = u.startsWith('/') ? path.join(DIST, u) : path.resolve(path.dirname(f), u);
    if (!fs.existsSync(target)) problems.push(`${rel}: broken link or photo → ${u}`);
  }
  for (const m of t.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (/^https?:/.test(u)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(f), u))) problems.push(`${rel}: missing photo size → ${u}`);
    }
  }
  for (const m of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { problems.push(`${rel}: broken structured data`); }
  }
}
if (warn.length) console.log('Check warnings:\n  ' + [...new Set(warn)].join('\n  '));
if (problems.length) {
  console.error(`\nBuild check failed (${problems.length}):\n  ` + [...new Set(problems)].slice(0, 60).join('\n  '));
  process.exit(1);
}
console.log(`Build check passed: ${html.length} pages, every link and photo found.`);
