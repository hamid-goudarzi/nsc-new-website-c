// Where admin edits are saved.
// In production: commits to the GitHub repo through the GitHub API (env GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH).
// For local testing: a folder on disk (env LOCAL_REPO_DIR).
import fs from 'node:fs/promises';
import path from 'node:path';

const GH = 'https://api.github.com';

class GitHubStore {
  constructor({ token, repo, branch }) {
    Object.assign(this, { token, repo, branch });
    this.blobCache = new Map();   // blob sha -> text (blobs never change, so this is always safe)
  }
  async gh(p, opts = {}) {
    const r = await fetch(GH + p, {
      ...opts,
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'nsc-admin', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    if (r.status === 404) return null;
    if (!r.ok) { const e = new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 300)}`); e.status = r.status; throw e; }
    return r.status === 204 ? {} : r.json();
  }
  async head() {
    const ref = await this.gh(`/repos/${this.repo}/git/ref/heads/${this.branch}`);
    if (!ref) throw new Error(`Branch ${this.branch} not found in ${this.repo}`);
    const commit = await this.gh(`/repos/${this.repo}/git/commits/${ref.object.sha}`);
    return { commit: ref.object.sha, tree: commit.tree.sha };
  }
  async readText(p, ref = this.branch) {
    const f = await this.gh(`/repos/${this.repo}/contents/${encodeURI(p)}?ref=${encodeURIComponent(ref)}`);
    if (!f || Array.isArray(f)) return null;
    if (f.content) return Buffer.from(f.content, 'base64').toString('utf8');
    return this.blob(f.sha);
  }
  async blob(sha) {
    if (this.blobCache.has(sha)) return this.blobCache.get(sha);
    const b = await this.gh(`/repos/${this.repo}/git/blobs/${sha}`);
    const t = Buffer.from(b.content, 'base64').toString('utf8');
    this.blobCache.set(sha, t);
    return t;
  }
  /** All JSON files under a folder, as {path: text}. */
  async readAll(prefix) {
    const { tree } = await this.head();
    const t = await this.gh(`/repos/${this.repo}/git/trees/${tree}?recursive=1`);
    const files = t.tree.filter(x => x.type === 'blob' && x.path.startsWith(prefix) && x.path.endsWith('.json'));
    const out = {};
    for (let i = 0; i < files.length; i += 12) {
      await Promise.all(files.slice(i, i + 12).map(async f => { out[f.path] = await this.blob(f.sha); }));
    }
    return out;
  }
  async list(prefix) {
    const { tree } = await this.head();
    const t = await this.gh(`/repos/${this.repo}/git/trees/${tree}?recursive=1`);
    return t.tree.filter(x => x.type === 'blob' && x.path.startsWith(prefix)).map(x => x.path);
  }
  async exists(p) {
    return !!(await this.gh(`/repos/${this.repo}/contents/${encodeURI(p)}?ref=${encodeURIComponent(this.branch)}`));
  }
  /** One commit with several files. files: [{path, text} | {path, base64} | {path, delete: true}] */
  async commit(files, message, author) {
    const blobs = await Promise.all(files.map(async f => {
      if (f.delete) return { path: f.path, mode: '100644', type: 'blob', sha: null };
      const b = await this.gh(`/repos/${this.repo}/git/blobs`, { method: 'POST', body: JSON.stringify(f.base64 != null ? { content: f.base64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' }) });
      return { path: f.path, mode: '100644', type: 'blob', sha: b.sha };
    }));
    for (let attempt = 0; attempt < 4; attempt++) {
      const h = await this.head();
      const tree = await this.gh(`/repos/${this.repo}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: h.tree, tree: blobs }) });
      const c = await this.gh(`/repos/${this.repo}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [h.commit], ...(author ? { author: { ...author, date: new Date().toISOString() } } : {}) }) });
      try {
        await this.gh(`/repos/${this.repo}/git/refs/heads/${this.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
        return c.sha;
      } catch (e) {
        if (e.status !== 422 || attempt === 3) throw e;   // someone else saved at the same moment: retry on top of theirs
        await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
      }
    }
  }
  async history(p, n = 20) {
    const cs = await this.gh(`/repos/${this.repo}/commits?sha=${encodeURIComponent(this.branch)}&path=${encodeURIComponent(p)}&per_page=${n}`) || [];
    return cs.map(c => ({ sha: c.sha, date: c.commit.author?.date, by: c.commit.author?.name, message: c.commit.message.split('\n')[0] }));
  }
}

class LocalStore {
  constructor(dir) { this.dir = dir; this.log = []; }
  abs(p) { const a = path.resolve(this.dir, p); if (!a.startsWith(path.resolve(this.dir))) throw new Error('bad path'); return a; }
  async readText(p, ref) {
    if (ref && ref !== 'HEAD') { const e = this.log.find(l => l.sha === ref); return e?.snap?.[p] ?? null; }
    try { return await fs.readFile(this.abs(p), 'utf8'); } catch { return null; }
  }
  async readAll(prefix) {
    const out = {};
    const walk = async d => {
      for (const e of await fs.readdir(this.abs(d), { withFileTypes: true }).catch(() => [])) {
        const rel = path.posix.join(d, e.name);
        if (e.isDirectory()) await walk(rel); else if (rel.endsWith('.json')) out[rel] = await fs.readFile(this.abs(rel), 'utf8');
      }
    };
    await walk(prefix.replace(/\/$/, ''));
    return out;
  }
  async list(prefix) {
    const d = prefix.replace(/\/$/, '');
    return (await fs.readdir(this.abs(d)).catch(() => [])).map(f => `${d}/${f}`);
  }
  async exists(p) { try { await fs.access(this.abs(p)); return true; } catch { return false; } }
  async commit(files, message, author) {
    const snap = {};
    for (const f of files) {
      const a = this.abs(f.path);
      if (f.delete) { await fs.rm(a, { force: true }); continue; }
      await fs.mkdir(path.dirname(a), { recursive: true });
      await fs.writeFile(a, f.base64 != null ? Buffer.from(f.base64, 'base64') : f.text);
      if (f.text != null) snap[f.path] = f.text;
    }
    const sha = Math.random().toString(16).slice(2).padEnd(40, '0');
    this.log.unshift({ sha, date: new Date().toISOString(), by: author?.name, message, paths: files.map(f => f.path), snap });
    return sha;
  }
  async history(p) { return this.log.filter(l => l.paths.includes(p)).map(({ sha, date, by, message }) => ({ sha, date, by, message })); }
}

let store;
export function getStore() {
  if (store) return store;
  if (process.env.LOCAL_REPO_DIR) return (store = new LocalStore(process.env.LOCAL_REPO_DIR));
  const e = process.env;
  const token = e.GITHUB_TOKEN;
  // Save to the same repo and branch this deployment was built from (preview branches edit their own copy).
  const repo = e.GITHUB_REPO || (e.VERCEL_GIT_REPO_OWNER && e.VERCEL_GIT_REPO_SLUG ? `${e.VERCEL_GIT_REPO_OWNER}/${e.VERCEL_GIT_REPO_SLUG}` : 'NeilSmithConstructionLtd/nsc-new-website');
  const branch = e.GITHUB_BRANCH || e.VERCEL_GIT_COMMIT_REF || 'master';
  if (!token) throw Object.assign(new Error('The site is not connected to GitHub yet (GITHUB_TOKEN is missing in Vercel settings).'), { status: 503 });
  return (store = new GitHubStore({ token, repo, branch }));
}
