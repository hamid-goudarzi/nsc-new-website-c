// Loads all site content once per build from content/<type>/<id>.json (edited through /admin).
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'content');
let cache;

function loadDocs() {
  const docs = [];
  for (const t of fs.readdirSync(DIR, { withFileTypes: true })) {
    if (!t.isDirectory() || t.name.startsWith('_')) continue;
    for (const f of fs.readdirSync(path.join(DIR, t.name))) {
      if (f.endsWith('.json')) docs.push(JSON.parse(fs.readFileSync(path.join(DIR, t.name, f), 'utf8')));
    }
  }
  return docs;
}

function deref(x, byId, depth = 0) {
  if (Array.isArray(x)) return x.map(v => deref(v, byId, depth)).filter(v => v !== undefined);
  if (x && typeof x === 'object') {
    if (x._type === 'reference') {
      const d = byId.get(x._ref);
      if (!d || d.hidden) return undefined;            // deleted or hidden: drop it
      return depth > 2 ? d : deref(d, byId, depth + 1);
    }
    const o = {};
    for (const [k, v] of Object.entries(x)) o[k] = deref(v, byId, depth);
    return o;
  }
  return x;
}

const byOrder = (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''));

export async function content() {
  if (cache) return cache;
  const raw = loadDocs();
  const byId = new Map(raw.map(d => [d._id, d]));
  const docs = raw.map(d => deref(d, byId));
  const of = t => docs.filter(d => d._type === t && !d.hidden).sort(byOrder);
  const one = t => docs.find(d => d._type === t) || {};
  cache = {
    settings: one('siteSettings'),
    home: one('home'),
    projectsPage: one('projectsPage'),
    pages: of('page').filter(p => p.slug?.current && !['index', 'projects', 'admin', 'api', 'media', 'assets'].includes(p.slug.current)),
    projects: of('project').filter(p => p.slug?.current),
    markets: of('market'),
    people: of('person'),
    jobs: of('job').filter(j => j.open !== false),
  };
  return cache;
}
