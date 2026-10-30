// Run the whole site and admin on your own computer, saving to this folder instead of GitHub.
//   ADMIN_SECRET=dev-secret-dev-secret-dev-secret ADMIN_SETUP_CODE=1234 npm run admin:local
// Then open http://localhost:4321/admin/. After each save the site is rebuilt, like Vercel does.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(process.env.LOCAL_REPO_DIR || process.cwd());
process.env.LOCAL_REPO_DIR = ROOT;
const PORT = +process.env.PORT || 4321;
const { default: handler } = await import(path.join(process.cwd(), 'api/admin.js'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

let building = null, again = false;
function build() {
  if (building) { again = true; return; }
  building = spawn('npx', ['astro', 'build'], { stdio: 'inherit', cwd: ROOT });
  building.on('exit', () => { building = null; if (again) { again = false; build(); } });
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/admin')) {
    const end = res.end.bind(res);
    res.end = (...a) => { end(...a); if (res.statusCode === 200 && /op=(save|remove)/.test(req.url)) build(); };
    return handler(req, res);
  }
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(ROOT, 'dist', p);
  if (!f.startsWith(path.join(ROOT, 'dist'))) { res.statusCode = 403; return res.end(); }
  if (!fs.existsSync(f) && p.startsWith('/media/')) f = path.join(ROOT, 'public', p);   // new uploads before the rebuild
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`Site and admin: http://localhost:${PORT}/  (admin at /admin/)`));
