// The admin API: one endpoint, /api/admin?op=...
// Everything an editor saves becomes a commit in the GitHub repo; Vercel then rebuilds the site (about a minute).
import crypto from 'node:crypto';
import { getStore } from './_lib/store.mjs';
import {
  loadUsers, saveUsers, publicUser, hashPassword, checkPassword, passwordProblem,
  sessionCookie, clearCookie, currentUser, tooManyAttempts, noteFailure, noteSuccess,
} from './_lib/auth.mjs';

const TYPES = ['siteSettings', 'home', 'projectsPage', 'page', 'project', 'market', 'person', 'job'];
const SINGLETONS = { siteSettings: 'siteSettings', home: 'home', projectsPage: 'projectsPage' };
const RESERVED = ['index', 'projects', 'admin', 'api', 'media', 'assets', 'sitemap', 'robots', 'llms', 'llms-full', 'cms-assets'];
const ID_RE = /^[a-z0-9][a-z0-9-]{1,90}$/i;
const docPath = d => `content/${d._type}/${d._id}.json`;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (s, m) => { throw new HttpError(s, m); };

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > 4.4e6) fail(413, 'Upload too large.'); chunks.push(c); }
  const t = Buffer.concat(chunks).toString('utf8');
  return t ? JSON.parse(t) : {};
}
function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}
const author = u => ({ name: u.name || u.email, email: u.email });
const label = d => d.name || d.title || d.heroTitle || d.companyName || d._id;
const typeName = { siteSettings: 'site settings', home: 'home page', projectsPage: 'projects page', page: 'page', project: 'project', market: 'market', person: 'person', job: 'job' };

async function allDocs() {
  const files = await getStore().readAll('content/');
  const docs = [];
  for (const [p, t] of Object.entries(files)) { try { docs.push(JSON.parse(t)); } catch { /* skip broken file */ } }
  return docs;
}

function cleanDoc(doc, docs) {
  if (!doc || typeof doc !== 'object') fail(400, 'Nothing to save.');
  if (!TYPES.includes(doc._type)) fail(400, 'Unknown content type.');
  if (SINGLETONS[doc._type]) doc._id = SINGLETONS[doc._type];
  if (!ID_RE.test(doc._id || '')) fail(400, 'Bad id.');
  if (doc._type === 'page' || doc._type === 'project') {
    const s = String(doc.slug?.current || '').toLowerCase().trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) fail(400, 'The web address may only use lowercase letters, numbers and dashes.');
    if (doc._type === 'page' && RESERVED.includes(s)) fail(400, `"${s}" is reserved. Choose another web address.`);
    if (docs.some(d => d._type === doc._type && d._id !== doc._id && d.slug?.current === s)) fail(409, `Another ${doc._type} already uses the address "${s}".`);
    doc.slug = { _type: 'slug', current: s };
  }
  const text = JSON.stringify(doc, null, 2) + '\n';
  if (text.length > 900_000) fail(413, 'This item is too large to save.');
  return text;
}

const isWebp = b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';

const handlers = {
  // ----- session -----
  async me({ user }) {
    const users = await loadUsers();
    return { user: publicUser(user), needsSetup: users.length === 0 };
  },
  async setup({ body, res }) {
    const users = await loadUsers(true);
    if (users.length) fail(409, 'The owner account already exists. Sign in instead.');
    const code = process.env.ADMIN_SETUP_CODE;
    if (!code) fail(503, 'ADMIN_SETUP_CODE is not set in Vercel settings.');
    const a = Buffer.from(String(body.code || '')), b = Buffer.from(code);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) fail(403, 'That setup code is not right.');
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, 'Enter a valid email.');
    const p = passwordProblem(body.password); if (p) fail(400, p);
    const u = { email, name: String(body.name || '').trim() || email, role: 'owner', hash: hashPassword(body.password), v: 1, created: new Date().toISOString() };
    await saveUsers([u], u, 'Create owner account');
    res.setHeader('Set-Cookie', sessionCookie(u));
    return { user: publicUser(u) };
  },
  async login({ body, res, ip }) {
    const email = String(body.email || '').trim().toLowerCase();
    const id = ip + '|' + email;
    if (tooManyAttempts(id)) fail(429, 'Too many attempts. Try again in 15 minutes.');
    const users = await loadUsers(true);
    const u = users.find(x => x.email === email && !x.disabled);
    const ok = u ? checkPassword(body.password || '', u.hash) : (checkPassword('x', 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '=='), false);
    if (!ok) { noteFailure(id); await new Promise(r => setTimeout(r, 500)); fail(401, 'Email or password is not right.'); }
    noteSuccess(id);
    res.setHeader('Set-Cookie', sessionCookie(u));
    return { user: publicUser(u) };
  },
  async logout({ res }) { res.setHeader('Set-Cookie', clearCookie()); return { ok: true }; },
  async password({ user, body }) {
    if (!checkPassword(body.current || '', user.hash)) fail(403, 'Your current password is not right.');
    const p = passwordProblem(body.password); if (p) fail(400, p);
    const users = await loadUsers(true);
    const u = users.find(x => x.email === user.email);
    Object.assign(u, { hash: hashPassword(body.password), v: (u.v || 1) + 1 });
    await saveUsers(users, user, `Password changed: ${u.email}`);
    return { ok: true, relogin: true };
  },

  // ----- content -----
  async all() { return { docs: await allDocs() }; },
  async save({ user, body }) {
    const list = Array.isArray(body.docs) ? body.docs : [body.doc];
    if (!list.length || list.length > 60) fail(400, 'Nothing to save.');
    const docs = await allDocs();
    const now = new Date().toISOString();
    const files = list.map(d => {
      d._updatedAt = now; d._updatedBy = user.name || user.email;
      return { path: docPath(d), text: cleanDoc(d, docs) };
    });
    const msg = list.length === 1 ? `Update ${typeName[list[0]._type]}: ${label(list[0])}` : `Reorder ${list.length} ${typeName[list[0]._type]}s`;
    const sha = await getStore().commit(files, msg, author(user));
    return { ok: true, sha, docs: list };
  },
  async remove({ user, body }) {
    const { _type, _id } = body;
    if (!TYPES.includes(_type) || SINGLETONS[_type] || !ID_RE.test(_id || '')) fail(400, 'This item cannot be deleted.');
    const docs = await allDocs();
    const d = docs.find(x => x._type === _type && x._id === _id);
    if (!d) fail(404, 'Already deleted.');
    await getStore().commit([{ path: docPath(d), delete: true }], `Delete ${typeName[_type]}: ${label(d)}`, author(user));
    return { ok: true };
  },
  async history({ query }) {
    const { type, id } = query;
    if (!TYPES.includes(type) || !ID_RE.test(id || '')) fail(400, 'Bad request.');
    return { history: await getStore().history(`content/${type}/${id}.json`) };
  },
  async version({ query }) {
    const { type, id, sha } = query;
    if (!TYPES.includes(type) || !ID_RE.test(id || '') || !/^[a-f0-9]{7,40}$/.test(sha || '')) fail(400, 'Bad request.');
    const t = await getStore().readText(`content/${type}/${id}.json`, sha);
    if (!t) fail(404, 'That version could not be found.');
    return { doc: JSON.parse(t) };
  },
  // Photos arrive one size per request (2560, 1280 and 640 px WebP made in the browser), so no request is too large.
  async upload({ user, body }) {
    const size = +body.size;
    if (![2560, 1920, 1280, 640].includes(size)) fail(400, 'Unknown photo size.');
    const data = Buffer.from(String(body.data || ''), 'base64');
    if (!isWebp(data)) fail(400, 'Photos must be converted in the browser first. Try another photo.');
    if (data.length > { 2560: 3.2e6, 1920: 2e6, 1280: 1.5e6, 640: 6e5 }[size]) fail(413, 'That photo is too large.');
    let key = String(body.key || '');
    if (key) { if (!/^u-[a-z0-9-]{3,70}$/.test(key)) fail(400, 'Bad photo name.'); }
    else {
      const base = String(body.name || 'photo').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'photo';
      key = `u-${base}-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
    }
    await getStore().commit([{ path: `public/media/${key}-${size}.webp`, base64: data.toString('base64') }], `[media] Upload photo ${key} (${size}px)`, author(user));
    return { key };
  },
  async media() {
    const files = await getStore().list('public/media/');
    const keys = files.filter(f => f.endsWith('-1280.webp')).map(f => f.slice('public/media/'.length, -'-1280.webp'.length));
    return { keys: keys.filter(k => !k.startsWith('film') && !k.startsWith('ill-')).concat(keys.filter(k => k.startsWith('ill-'))) };
  },

  // ----- users (owner only) -----
  async users() { return { users: (await loadUsers(true)).map(u => ({ ...publicUser(u), disabled: !!u.disabled })) }; },
  async userSave({ user, body }) {
    const users = await loadUsers(true);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, 'Enter a valid email.');
    const role = body.role === 'owner' ? 'owner' : 'editor';
    let u = users.find(x => x.email === email);
    const isNew = !u;
    if (isNew) {
      const p = passwordProblem(body.password); if (p) fail(400, 'Password: ' + p);
      u = { email, created: new Date().toISOString(), v: 1 };
      users.push(u);
    }
    if (body.name != null) u.name = String(body.name).trim() || email;
    if (u.email === user.email && role !== 'owner') fail(400, 'You cannot remove your own owner role.');
    u.role = role;
    if (body.disabled != null) {
      if (u.email === user.email && body.disabled) fail(400, 'You cannot disable your own account.');
      u.disabled = !!body.disabled; if (u.disabled) u.v = (u.v || 1) + 1;
    }
    if (body.password && !isNew) {
      const p = passwordProblem(body.password); if (p) fail(400, 'Password: ' + p);
      u.hash = hashPassword(body.password); u.v = (u.v || 1) + 1;
    } else if (isNew) u.hash = hashPassword(body.password);
    if (!users.some(x => x.role === 'owner' && !x.disabled)) fail(400, 'There must always be at least one owner.');
    await saveUsers(users, user, `${isNew ? 'Add' : 'Update'} user: ${email}`);
    return { ok: true };
  },
  async userRemove({ user, body }) {
    const users = await loadUsers(true);
    const email = String(body.email || '').toLowerCase();
    if (email === user.email) fail(400, 'You cannot remove yourself.');
    const rest = users.filter(x => x.email !== email);
    if (rest.length === users.length) fail(404, 'No such user.');
    if (!rest.some(x => x.role === 'owner' && !x.disabled)) fail(400, 'There must always be at least one owner.');
    await saveUsers(rest, user, `Remove user: ${email}`);
    return { ok: true };
  },
};
const PUBLIC = new Set(['me', 'setup', 'login', 'logout']);
const OWNER = new Set(['users', 'userSave', 'userRemove']);
const POST = new Set(['setup', 'login', 'logout', 'password', 'save', 'remove', 'upload', 'userSave', 'userRemove']);

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const query = Object.fromEntries(url.searchParams);
    const op = query.op;
    const h = handlers[op];
    if (!h) fail(404, 'Unknown action.');
    if (POST.has(op)) {
      if (req.method !== 'POST') fail(405, 'Use POST.');
      if (req.headers['x-nsc-admin'] !== '1') fail(403, 'Blocked.');           // plus SameSite cookies: no cross-site requests
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) fail(403, 'Blocked.');
    }
    const user = await currentUser(req);
    if (!PUBLIC.has(op) && !user) fail(401, 'Please sign in.');
    if (OWNER.has(op) && user.role !== 'owner') fail(403, 'Only an owner can manage users.');
    const body = POST.has(op) ? await readBody(req) : {};
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    send(res, 200, await h({ req, res, user, body, query, ip }));
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    send(res, status, { error: status >= 500 && !e.status ? 'Something went wrong on the server. Try again in a minute.' : e.message });
  }
}
export const config = { api: { bodyParser: { sizeLimit: '4.4mb' } } };
