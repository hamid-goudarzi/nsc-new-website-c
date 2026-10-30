// Accounts and sessions for the admin.
// Users live in the repo at .admin/users.enc: passwords are hashed with scrypt, and the whole file is
// encrypted with AES-256-GCM using ADMIN_SECRET, so nothing readable is stored even in a public repo.
// Sessions are signed, HttpOnly cookies that expire after 12 hours.
import crypto from 'node:crypto';
import { getStore } from './store.mjs';

export const USERS_PATH = '.admin/users.enc';
const COOKIE = 'nsc_admin';
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.ADMIN_SECRET;
  if (!s || s.length < 24) throw Object.assign(new Error('ADMIN_SECRET is missing or too short in Vercel settings (use 32+ random characters).'), { status: 503 });
  return s;
}
const key = purpose => crypto.createHash('sha256').update(purpose + ':' + secret()).digest();

// ---------- passwords ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${h.toString('base64')}`;
}
export function checkPassword(pw, stored) {
  const [, salt, h] = String(stored).split('$');
  if (!salt || !h) return false;
  const a = crypto.scryptSync(String(pw), Buffer.from(salt, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  const b = Buffer.from(h, 'base64');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function passwordProblem(pw) {
  if (!pw || pw.length < 10) return 'Use at least 10 characters.';
  if (/^(.)\1+$/.test(pw)) return 'That password is too simple.';
  if (['password12', 'password123', '1234567890', 'qwertyuiop', 'neilsmith1'].includes(pw.toLowerCase())) return 'That password is too common.';
  return null;
}

// ---------- users file ----------
function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key('users'), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') });
}
function decrypt(text) {
  const { iv, tag, data } = JSON.parse(text);
  const d = crypto.createDecipheriv('aes-256-gcm', key('users'), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8'));
}
let usersCache = { at: 0, users: null };
export async function loadUsers(fresh = false) {
  if (!fresh && usersCache.users && Date.now() - usersCache.at < 20000) return usersCache.users;
  const t = await getStore().readText(USERS_PATH);
  let users = [];
  if (t) {
    try { users = decrypt(t).users || []; }
    catch { throw Object.assign(new Error('The user list cannot be opened. ADMIN_SECRET in Vercel may have changed.'), { status: 500 }); }
  }
  usersCache = { at: Date.now(), users };
  return users;
}
export async function saveUsers(users, actor, message) {
  await getStore().commit([{ path: USERS_PATH, text: encrypt({ users }) + '\n' }], `[admin] ${message}`, actor ? { name: actor.name, email: actor.email } : undefined);
  usersCache = { at: Date.now(), users };
}
export const publicUser = u => u && ({ email: u.email, name: u.name, role: u.role, created: u.created, lastLogin: u.lastLogin });

// ---------- sessions ----------
const b64u = b => Buffer.from(b).toString('base64url');
function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', key('session')).update(body).digest('base64url');
  return `${body}.${mac}`;
}
function verify(token) {
  const [body, mac] = String(token || '').split('.');
  if (!body || !mac) return null;
  const want = crypto.createHmac('sha256', key('session')).update(body).digest('base64url');
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  return p.exp > Date.now() ? p : null;
}
const isLocal = () => !!process.env.LOCAL_REPO_DIR;
export function sessionCookie(user) {
  const tok = sign({ email: user.email, v: user.v || 1, exp: Date.now() + SESSION_HOURS * 3600e3 });
  return `${COOKIE}=${tok}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${isLocal() ? '' : '; Secure'}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isLocal() ? '' : '; Secure'}`;
export async function currentUser(req) {
  const c = Object.fromEntries(String(req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, v.join('=')]));
  const p = verify(c[COOKIE]);
  if (!p) return null;
  const u = (await loadUsers()).find(x => x.email === p.email);
  return u && (u.v || 1) === p.v && !u.disabled ? u : null;     // password change or removal ends old sessions
}

// ---------- simple login throttling (per server instance) ----------
const fails = new Map();
export function tooManyAttempts(id) {
  const f = fails.get(id);
  return f && f.n >= 6 && Date.now() - f.t < 15 * 60e3;
}
export function noteFailure(id) { const f = fails.get(id) || { n: 0, t: 0 }; fails.set(id, { n: f.n + 1, t: Date.now() }); }
export function noteSuccess(id) { fails.delete(id); }
