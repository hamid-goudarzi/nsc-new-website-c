// NSC website admin. Plain JavaScript, no build step: forms are generated from schema.js.
import { TYPES, BLOCKS, NAV } from './schema.js';

// ---------------------------------------------------------------- helpers
const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const clone = o => JSON.parse(JSON.stringify(o ?? null));
const rid = () => Math.random().toString(36).slice(2, 14);
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const SITE = location.origin + '/';
const ago = d => { if (!d) return ''; const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };

async function api(op, body, query = '') {
  const r = await fetch(`/api/admin?op=${op}${query}`, body !== undefined
    ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-NSC-Admin': '1' }, body: JSON.stringify(body), credentials: 'same-origin' }
    : { credentials: 'same-origin' });
  let data = {};
  try { data = await r.json(); } catch { data = { error: r.status === 413 ? 'That upload is too large.' : `The server did not answer (${r.status}).` }; }
  if (r.status === 401 && op !== 'login' && op !== 'me') { state.me = null; render(); }
  if (!r.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: r.status });
  return data;
}
function toast(msg, kind = 'ok', ms = 4200) {
  const t = h('div', { class: `toast ${kind}`, role: 'status' }, msg);
  $('#toasts').append(t); setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 400);
}
function modal(title, body, actions = []) {
  let close = () => wrap.remove();
  const wrap = h('div', { class: 'modal-wrap', onclick: e => { if (e.target === wrap) close(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'modal-h' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, '✕')),
      h('div', { class: 'modal-b' }, body),
      actions.length ? h('div', { class: 'modal-f' }, actions.map(a => h('button', { class: `btn ${a.kind || ''}`, onclick: () => a.run(close) }, a.label))) : null));
  document.body.append(wrap);
  const esc = e => { if (e.key === 'Escape' && document.body.lastElementChild === wrap) close(); };
  document.addEventListener('keydown', esc);
  const _close = close; close = () => { document.removeEventListener('keydown', esc); _close(); };
  setTimeout(() => wrap.querySelector('input,button.btn,textarea')?.focus(), 30);
  return close;
}
const confirmBox = (title, text, label = 'Delete', kind = 'danger') => new Promise(res => {
  const close = modal(title, h('p', {}, text), [{ label: 'Cancel', run: c => { c(); res(false); } }, { label, kind, run: c => { c(); res(true); } }]);
});

// ---------------------------------------------------------------- state
const state = { me: null, needsSetup: false, docs: [], media: null, preview: new Map(), view: null, work: null, base: null, advanced: false, publish: null };
const byType = t => state.docs.filter(d => d._type === t).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(label(a)).localeCompare(String(label(b))));
const label = d => d?.name || d?.title || d?.heroTitle || d?.companyName || d?._id || '';
// Compare without empty lists/groups, so just opening a form never counts as a change.
const norm = o => JSON.stringify(o, (k, v) => (Array.isArray(v) && !v.length) || (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) || v === '' ? undefined : v);
const dirty = () => !!state.work && !!state.touched && norm(state.work) !== state.base;
const thumb = (img, w = 1280) => img?.local ? (state.preview.get(img.local) || `${SITE}media/${img.local}-${w}.webp`) : null;
function projectGroups() {
  const pp = state.docs.find(d => d._type === 'projectsPage');
  return (pp?.groups || []).map(g => [g.group, g.title]);
}
addEventListener('beforeunload', e => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
addEventListener('hashchange', () => route());

// ---------------------------------------------------------------- app start
async function start() {
  try {
    const r = await api('me');
    state.me = r.user; state.needsSetup = r.needsSetup;
    if (state.me) await loadDocs();
  } catch (e) { state.error = e.message; }
  route();
}
async function loadDocs() { state.docs = (await api('all')).docs; }

function route() {
  if (state.work && dirty() && state.view && location.hash !== state.view.hash) {
    if (!confirm('You have unsaved changes. Leave without saving?')) { history.replaceState(null, '', state.view.hash); return; }
  }
  const [, type, id] = (location.hash || '#/').split('/');
  state.view = { type: type || '', id: id ? decodeURIComponent(id) : '', hash: location.hash || '#/' };
  state.work = null; state.base = null;
  if (state.me && TYPES[type]) {
    const def = TYPES[type];
    if (def.singleton) openDoc(state.docs.find(d => d._type === type) || { _type: type, _id: def.singleton });
    else if (id === 'new') openDoc(newDoc(type));
    else if (id) { const d = state.docs.find(x => x._type === type && x._id === state.view.id); if (d) openDoc(d); }
  }
  render();
}
function openDoc(d) { state.work = clone(d); state.base = norm(state.work); state.touched = false; }
function newDoc(type) {
  const d = { _type: type, _id: '' };
  for (const f of TYPES[type].fields) if (f.default !== undefined) d[f.name] = f.default;
  const all = byType(type);
  if (TYPES[type].ordered) d.order = (Math.max(0, ...all.map(x => x.order || 0)) + 10);
  if (type === 'job') d.datePosted = new Date().toISOString().slice(0, 10);
  if (type === 'page') d.blocks = [{ _type: 'richText', _key: rid(), title: '', body: '' }, { _type: 'cta', _key: rid() }];
  return d;
}

// ---------------------------------------------------------------- render
function render() {
  const app = $('#app'); app.innerHTML = '';
  if (state.error && !state.me) return app.append(screenMsg('The admin could not start', state.error));
  if (!state.me) return app.append(state.needsSetup ? setupScreen() : loginScreen());
  app.append(shell());
}
const screenMsg = (t, m) => h('div', { class: 'auth' }, h('div', { class: 'auth-card' }, logo(), h('h1', {}, t), h('p', { class: 'muted' }, m)));
const logo = () => h('div', { class: 'auth-logo' }, h('img', { src: '/nsc-logo.jpg', alt: '' }), h('b', {}, 'Neil Smith Construction'), h('span', {}, 'Website admin'));

function loginScreen() {
  const err = h('p', { class: 'err', role: 'alert' });
  const f = h('form', { class: 'auth-card', onsubmit: async e => {
      e.preventDefault(); err.textContent = ''; const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Signing in…';
      try { const r = await api('login', { email: f.email.value, password: f.password.value }); state.me = r.user; await loadDocs(); route(); }
      catch (x) { err.textContent = x.message; b.disabled = false; b.textContent = 'Sign in'; }
    } },
    logo(), h('h1', {}, 'Sign in'),
    h('label', {}, 'Email', h('input', { name: 'email', type: 'email', autocomplete: 'username', required: true })),
    h('label', {}, 'Password', h('input', { name: 'password', type: 'password', autocomplete: 'current-password', required: true })),
    err, h('button', { class: 'btn primary wide', type: 'submit' }, 'Sign in'),
    h('p', { class: 'muted small' }, 'Forgot your password? Ask the site owner to reset it.'));
  return h('div', { class: 'auth' }, f);
}
function setupScreen() {
  const err = h('p', { class: 'err', role: 'alert' });
  const f = h('form', { class: 'auth-card', onsubmit: async e => {
      e.preventDefault(); err.textContent = '';
      if (f.password.value !== f.password2.value) { err.textContent = 'The two passwords do not match.'; return; }
      try { const r = await api('setup', { code: f.code.value, name: f.name.value, email: f.email.value, password: f.password.value }); state.me = r.user; await loadDocs(); route(); toast('Owner account created. Welcome!'); }
      catch (x) { err.textContent = x.message; }
    } },
    logo(), h('h1', {}, 'Create the owner account'),
    h('p', { class: 'muted' }, 'This only happens once. Use the setup code you saved in Vercel. The owner can then invite everyone else.'),
    h('label', {}, 'Setup code', h('input', { name: 'code', required: true, autocomplete: 'off' })),
    h('label', {}, 'Your name', h('input', { name: 'name', required: true, autocomplete: 'name' })),
    h('label', {}, 'Email', h('input', { name: 'email', type: 'email', required: true, autocomplete: 'username' })),
    h('label', {}, 'Password (10+ characters)', h('input', { name: 'password', type: 'password', required: true, minlength: 10, autocomplete: 'new-password' })),
    h('label', {}, 'Password again', h('input', { name: 'password2', type: 'password', required: true, autocomplete: 'new-password' })),
    err, h('button', { class: 'btn primary wide', type: 'submit' }, 'Create account'));
  return h('div', { class: 'auth' }, f);
}

function shell() {
  const v = state.view;
  const navLink = (t) => { const d = TYPES[t]; const on = v.type === t; return h('a', { href: `#/${t}`, class: on ? 'on' : '', 'aria-current': on ? 'page' : null }, h('i', { 'aria-hidden': 'true' }, d.icon), d.title); };
  const side = h('aside', { class: 'side' },
    h('a', { class: 'brand', href: '#/' }, h('img', { src: '/nsc-logo.jpg', alt: '' }), h('span', {}, h('b', {}, 'NSC website'), h('small', {}, 'Admin'))),
    NAV.map(([g, ts]) => h('nav', {}, h('p', {}, g), ts.map(navLink))),
    h('nav', {}, h('p', {}, 'Account'),
      state.me.role === 'owner' ? h('a', { href: '#/users', class: v.type === 'users' ? 'on' : '' }, h('i', {}, '☷'), 'Users') : null,
      h('a', { href: '#/account', class: v.type === 'account' ? 'on' : '' }, h('i', {}, '⚿'), 'My account'),
      h('a', { href: SITE, target: '_blank', rel: 'noopener' }, h('i', {}, '↗'), 'View website')),
    h('div', { class: 'side-foot' }, h('span', {}, state.me.name), h('button', { class: 'link', onclick: async () => { await api('logout', {}); state.me = null; render(); } }, 'Sign out')));
  let main;
  if (v.type === 'users' && state.me.role === 'owner') main = usersView();
  else if (v.type === 'account') main = accountView();
  else if (TYPES[v.type] && state.work) main = editorView();
  else if (TYPES[v.type] && !TYPES[v.type].singleton && !v.id) main = listView(v.type);
  else if (TYPES[v.type]) main = h('div', { class: 'main' }, h('div', { class: 'empty' }, 'That item no longer exists. ', h('a', { href: `#/${v.type}` }, 'Back to the list')));
  else main = dashboard();
  const burger = h('button', { class: 'burger', 'aria-label': 'Menu', onclick: () => document.body.classList.toggle('side-open') }, '☰');
  side.addEventListener('click', e => { if (e.target.closest('a')) document.body.classList.remove('side-open'); });
  return h('div', { class: 'shell' }, side, burger, main);
}

// ---------------------------------------------------------------- dashboard
function dashboard() {
  const recent = [...state.docs].filter(d => d._updatedAt).sort((a, b) => b._updatedAt.localeCompare(a._updatedAt)).slice(0, 8);
  const card = (t, text) => h('a', { class: 'dcard', href: `#/${t}${TYPES[t].singleton ? '' : '/new'}` }, h('i', {}, TYPES[t].icon), h('b', {}, text));
  return h('div', { class: 'main' },
    h('header', { class: 'top' }, h('div', {}, h('h1', {}, `Hi ${String(state.me.name).split(' ')[0]}`), h('p', { class: 'muted' }, 'What would you like to update?'))),
    h('div', { class: 'dgrid' }, card('project', 'Add a project'), card('job', 'Post a job'), card('page', 'Create a page'), card('home', 'Edit the home page'), card('person', 'Add a person'), card('siteSettings', 'Phone, email and offices')),
    h('section', { class: 'panel' }, h('h2', {}, 'Recently changed'),
      recent.length ? h('ul', { class: 'rows' }, recent.map(d => h('li', {}, h('a', { href: hrefOf(d) }, h('span', { class: 'r-t' }, label(d)), h('span', { class: 'r-s' }, `${TYPES[d._type]?.one || TYPES[d._type]?.title} · ${d._updatedBy || ''} · ${ago(d._updatedAt)}`)))))
        : h('p', { class: 'muted' }, 'Nothing has been changed in the admin yet.')),
    h('section', { class: 'panel tips' }, h('h2', {}, 'Good to know'),
      h('ul', {}, h('li', {}, 'Click Save and the live website updates in about a minute.'), h('li', {}, 'Every save is kept. Use History on any item to see or restore an earlier version.'),
        h('li', {}, 'Photos are resized for the web automatically. Upload the best quality you have.'), h('li', {}, 'Only show NSC crews in full PPE, and never the paving subcontractor’s crew.'))));
}
const hrefOf = d => TYPES[d._type]?.singleton ? `#/${d._type}` : `#/${d._type}/${encodeURIComponent(d._id)}`;

// ---------------------------------------------------------------- list
function listView(type) {
  const def = TYPES[type];
  let q = '';
  const ul = h('ul', { class: 'rows big' });
  const fill = () => {
    ul.innerHTML = '';
    const all = byType(type);
    const items = all.filter(d => !q || JSON.stringify([label(d), def.list.sub?.(d)]).toLowerCase().includes(q));
    if (!items.length) ul.append(h('li', { class: 'empty' }, q ? 'Nothing matches your search.' : `No ${def.title.toLowerCase()} yet.`));
    items.forEach(d => {
      const i = all.indexOf(d);
      const im = def.list.image ? thumb(d[def.list.image]) : null;
      ul.append(h('li', {},
        h('a', { href: hrefOf(d) },
          def.list.image ? h('span', { class: 'r-img' }, im ? h('img', { src: im, alt: '', loading: 'lazy' }) : null) : null,
          h('span', { class: 'r-tx' }, h('span', { class: 'r-t' }, label(d) || '(untitled)', d.hidden ? h('em', { class: 'pill' }, 'Hidden') : null, d.live ? h('em', { class: 'pill live' }, 'Underway') : null),
            h('span', { class: 'r-s' }, def.list.sub?.(d) || ''))),
        def.ordered && !q ? h('span', { class: 'r-ord' },
          h('button', { class: 'icon-btn', title: 'Move up', 'aria-label': `Move ${label(d)} up`, disabled: i === 0, onclick: () => move(type, i, -1) }, '↑'),
          h('button', { class: 'icon-btn', title: 'Move down', 'aria-label': `Move ${label(d)} down`, disabled: i === all.length - 1, onclick: () => move(type, i, 1) }, '↓')) : null));
    });
  };
  fill();
  return h('div', { class: 'main' },
    h('header', { class: 'top' }, h('div', {}, h('h1', {}, def.title), h('p', { class: 'muted' }, def.ordered ? 'Shown on the website in this order. Use the arrows to change it.' : '')),
      h('a', { class: 'btn primary', href: `#/${type}/new` }, `+ New ${def.one}`)),
    h('input', { class: 'search', type: 'search', placeholder: `Search ${def.title.toLowerCase()}…`, 'aria-label': 'Search', oninput: e => { q = e.target.value.toLowerCase(); fill(); } }),
    ul);
}
async function move(type, i, dir) {
  const all = byType(type).map(clone);
  const [d] = all.splice(i, 1); all.splice(i + dir, 0, d);
  const changed = [];
  all.forEach((x, k) => { const o = (k + 1) * 10; if (x.order !== o) { x.order = o; changed.push(x); } });
  try {
    await api('save', { docs: changed });
    for (const c of changed) { const j = state.docs.findIndex(x => x._id === c._id && x._type === c._type); state.docs[j] = c; }
    render(); publishing();
  } catch (e) { toast(e.message, 'err'); }
}

// ---------------------------------------------------------------- editor
function editorView() {
  const d = state.work, def = TYPES[d._type];
  const isNew = !d._id;
  const status = h('span', { class: 'status', 'aria-live': 'polite' });
  const upd = () => { status.textContent = dirty() ? 'Unsaved changes' : (state.publish?.id === d._id ? state.publish.text : (d._updatedAt ? `Saved ${ago(d._updatedAt)}${d._updatedBy ? ' by ' + d._updatedBy : ''}` : '')); status.className = 'status' + (dirty() ? ' dirty' : ''); saveBtn.disabled = !dirty(); };
  const saveBtn = h('button', { class: 'btn primary', onclick: () => save() }, 'Save');
  const form = h('div', { class: 'form' + (state.advanced ? ' show-adv' : '') });
  renderFields(form, def.fields, d, () => { state.touched = true; upd(); });
  const advCount = def.fields.filter(f => f.advanced).length;
  const url = d._id && def.url ? SITE + def.url(d) : null;
  setTimeout(upd);
  const bar = h('header', { class: 'top sticky' },
    h('div', { class: 'crumbs' }, def.singleton ? null : h('a', { href: `#/${d._type}` }, '← ', def.title), h('h1', {}, isNew ? `New ${def.one}` : (def.singleton ? def.title : (label(d) || def.title))), status),
    h('div', { class: 'acts' },
      !isNew ? h('button', { class: 'btn ghost', onclick: () => historyModal(d) }, 'History') : null,
      url && !isNew ? h('a', { class: 'btn ghost', href: url, target: '_blank', rel: 'noopener' }, 'View on site ↗') : null,
      !isNew && !def.singleton ? h('button', { class: 'btn ghost danger', onclick: () => remove(d) }, 'Delete') : null,
      saveBtn));
  document.onkeydown = e => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (dirty()) save(); } };
  return h('div', { class: 'main' }, bar, form,
    advCount ? h('label', { class: 'adv-toggle' }, h('input', { type: 'checkbox', checked: state.advanced, onchange: e => { state.advanced = e.target.checked; form.classList.toggle('show-adv', state.advanced); } }), ' Show advanced options') : null);
}
function validate(d) {
  const def = TYPES[d._type]; const miss = [];
  for (const f of def.fields) if (f.required) { const v = d[f.name]; if (v == null || v === '' || (f.type === 'slug' && !v?.current) || (f.type === 'image' && !v?.local)) miss.push(f.label); }
  return miss;
}
async function save() {
  const d = state.work;
  const miss = validate(d);
  if (miss.length) return toast('Please fill in: ' + miss.join(', '), 'err', 6000);
  if (!d._id) {
    const base = d.slug?.current || slugify(label(d)) || rid();
    let id = `${d._type}-${base}`.slice(0, 90), n = 2;
    while (state.docs.some(x => x._type === d._type && x._id === id)) id = `${d._type}-${base}-${n++}`;
    d._id = id;
  }
  try {
    const r = await api('save', { doc: JSON.parse(norm(d)) });
    const saved = r.docs[0];
    const i = state.docs.findIndex(x => x._type === saved._type && x._id === saved._id);
    if (i >= 0) state.docs[i] = saved; else state.docs.push(saved);
    openDoc(saved);
    toast('Saved. The live site updates in about a minute.');
    publishing(saved._id);
    const want = hrefOf(saved);
    if (location.hash !== want) { state.view.hash = want; history.replaceState(null, '', want); }
    render();
  } catch (e) { if (!TYPES[d._type].singleton && state.work && !state.docs.some(x => x._id === d._id)) d._id = ''; toast(e.message, 'err', 7000); }
}
async function remove(d) {
  const refs = state.docs.filter(x => x._id !== d._id && JSON.stringify(x).includes(`"_ref":"${d._id}"`));
  const ok = await confirmBox(`Delete “${label(d)}”?`, refs.length ? `It is linked from: ${refs.map(label).join(', ')}. Those links will disappear. You can bring it back later from GitHub history.` : 'It will be removed from the website in about a minute.');
  if (!ok) return;
  try { await api('remove', { _type: d._type, _id: d._id }); state.docs = state.docs.filter(x => !(x._type === d._type && x._id === d._id)); state.work = null; state.base = null; location.hash = `#/${d._type}`; toast('Deleted.'); publishing(); }
  catch (e) { toast(e.message, 'err'); }
}
// After a save, watch the live site until the new version is out.
async function publishing(id = null) {
  const since = Date.now();
  state.publish = { id, text: 'Publishing… (about a minute)' };
  const set = t => { state.publish.text = t; const s = $('.status'); if (s && !dirty() && (!id || state.work?._id === id)) s.textContent = t; };
  set(state.publish.text);
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 8000));
    try { const b = await (await fetch(SITE + 'build.json?t=' + Date.now(), { cache: 'no-store' })).json(); if (new Date(b.builtAt).getTime() > since - 5000) { set('Live on the website ✓'); toast('Your change is live on the website.'); return; } } catch { }
  }
  set('Saved. Still publishing, check again in a few minutes.');
}

// ---------------------------------------------------------------- history
async function historyModal(d) {
  const body = h('div', {}, h('p', { class: 'muted' }, 'Loading…'));
  const close = modal(`History: ${label(d)}`, body);
  try {
    const { history: hs } = await api('history', undefined, `&type=${d._type}&id=${encodeURIComponent(d._id)}`);
    body.innerHTML = '';
    if (!hs.length) return body.append(h('p', { class: 'muted' }, 'No earlier versions yet.'));
    body.append(h('p', { class: 'muted' }, 'Pick a version to load it into the editor. Nothing changes on the website until you click Save.'),
      h('ul', { class: 'rows' }, hs.map((x, i) => h('li', {}, h('button', { class: 'row-btn', onclick: async () => {
        try { const { doc } = await api('version', undefined, `&type=${d._type}&id=${encodeURIComponent(d._id)}&sha=${x.sha}`); state.work = doc; state.touched = true; close(); render(); toast('Earlier version loaded. Click Save to put it back on the website.', 'ok', 6000); }
        catch (e) { toast(e.message, 'err'); }
      } }, h('span', { class: 'r-t' }, i === 0 ? 'Current version' : new Date(x.date).toLocaleString()), h('span', { class: 'r-s' }, `${x.by || ''} · ${x.message}`))))));
  } catch (e) { body.innerHTML = ''; body.append(h('p', { class: 'err' }, e.message)); }
}

// ---------------------------------------------------------------- fields
function renderFields(container, fields, obj, onChange) {
  for (const f of fields) {
    const el = field(f, obj, onChange);
    if (el && f.name) el.dataset.name = f.name;
    if (el) { if (f.advanced) el.classList.add('adv'); container.append(el); }
  }
}
function wrapField(f, input, extra) {
  return h('div', { class: `field f-${f.type}` },
    h('label', { class: 'f-l' }, f.label, f.required ? h('span', { class: 'req', title: 'Required' }, ' *') : null),
    f.help ? h('p', { class: 'f-help' }, f.help) : null, input, extra || null);
}
function counter(f, input) {
  if (!f.max) return null;
  const c = h('span', { class: 'count' });
  const upd = () => { const n = input.value.length; c.textContent = `${n} / ${f.max}`; c.classList.toggle('over', n > f.max); };
  input.addEventListener('input', upd); upd(); return c;
}
function field(f, obj, onChange) {
  const set = v => { if (v === '' || v == null || (Array.isArray(v) && !v.length)) delete obj[f.name]; else obj[f.name] = v; onChange(); };
  switch (f.type) {
    case 'heading': return h('h2', { class: 'f-head' }, f.label);
    case 'string': case 'date': {
      const i = h('input', { type: f.type === 'date' ? 'date' : 'text', value: obj[f.name] ?? '', oninput: e => set(e.target.value) });
      return wrapField(f, i, counter(f, i));
    }
    case 'number': return wrapField(f, h('input', { type: 'number', value: obj[f.name] ?? '', step: 'any', oninput: e => set(e.target.value === '' ? null : +e.target.value) }));
    case 'text': case 'md': {
      const t = h('textarea', { rows: f.rows || (f.type === 'md' ? 10 : 4), oninput: e => set(e.target.value) }); t.value = obj[f.name] ?? '';
      const tip = f.type === 'md' ? h('p', { class: 'f-tip' }, 'Formatting: ## Heading · - list item · **bold** · *italic* · [link text](contact.html). Leave a blank line between paragraphs.') : null;
      return wrapField(f, t, h('div', {}, counter(f, t), tip));
    }
    case 'bool': {
      const c = h('input', { type: 'checkbox', checked: obj[f.name] ?? f.default ?? false, onchange: e => { obj[f.name] = e.target.checked; onChange(); } });
      return h('div', { class: 'field f-bool' }, h('label', {}, c, ' ', f.label), f.help ? h('p', { class: 'f-help' }, f.help) : null);
    }
    case 'select': {
      const opts = f.options === 'projectGroups' ? projectGroups() : f.options;
      const s = h('select', { onchange: e => set(e.target.value) }, h('option', { value: '' }, f.blank || '— Choose —'), opts.map(([v, l]) => h('option', { value: v, selected: obj[f.name] === v }, l)));
      return wrapField(f, s);
    }
    case 'slug': {
      const cur = () => (f.name === 'anchor' ? obj[f.name] : obj[f.name]?.current) || '';
      const put = v => { v = slugify(v); if (f.name === 'anchor') set(v); else set(v ? { _type: 'slug', current: v } : null); i.value = v; };
      const i = h('input', { type: 'text', value: cur(), oninput: e => put(e.target.value) });
      const locked = !!state.base && !!JSON.parse(state.base)?._id;
      const gen = h('button', { class: 'btn ghost sm', type: 'button', onclick: () => put(obj[f.from] || '') }, 'Make from name');
      if (!locked && f.from) { // fill automatically while typing the name of a new item
        setTimeout(() => { const src = document.querySelector(`[data-name="${f.from}"] input`); src?.addEventListener('input', () => { if (!cur() || cur() === slugify(src.dataset.prev || '')) put(src.value); src.dataset.prev = src.value; }); });
      }
      return wrapField({ ...f, help: f.help || (locked ? 'Changing this changes the page’s web address. Old links will stop working.' : null) },
        h('div', { class: 'slug' }, f.prefix ? h('span', {}, '/' + f.prefix) : h('span', {}, '/'), i, f.suffix ? h('span', {}, f.suffix) : null, gen));
    }
    case 'image': return wrapField(f, imageInput(f, obj[f.name], v => set(v)));
    case 'images': return wrapField(f, imagesInput(f, obj, onChange));
    case 'strings': {
      const t = h('textarea', { rows: Math.max(3, Math.min(14, (obj[f.name] || []).length + 1)), oninput: e => set(e.target.value.split('\n').map(s => s.trim()).filter(Boolean)) });
      t.value = (obj[f.name] || []).join('\n');
      return wrapField(f, t);
    }
    case 'ref': {
      const opts = byType(f.to);
      const s = h('select', { onchange: e => set(e.target.value ? { _type: 'reference', _ref: e.target.value } : null) }, h('option', { value: '' }, '— None —'), opts.map(o => h('option', { value: o._id, selected: obj[f.name]?._ref === o._id }, label(o))));
      return wrapField(f, s);
    }
    case 'refs': return wrapField(f, refsInput(f, obj, onChange));
    case 'object': {
      obj[f.name] = obj[f.name] || {};
      const box = h('div', { class: 'group' });
      renderFields(box, f.fields, obj[f.name], onChange);
      return h('fieldset', { class: 'field f-object' }, h('legend', {}, f.label), box);
    }
    case 'list': return listInput(f, obj, onChange);
    case 'blocks': return blocksInput(f, obj, onChange);
  }
  return null;
}

function imageInput(f, img, set) {
  const box = h('div', { class: 'img-in' });
  const draw = () => {
    box.innerHTML = '';
    const src = thumb(img);
    box.append(
      h('div', { class: 'img-prev' + (src ? '' : ' none') }, src ? h('img', { src, alt: '', style: img.focus ? `object-position:${img.focus}` : null }) : h('span', {}, 'No photo')),
      h('div', { class: 'img-side' },
        h('div', { class: 'row' },
          h('button', { class: 'btn sm', type: 'button', onclick: () => pickImage(k => { img = { ...(img || {}), _type: 'image', local: k.key, alt: img?.alt || k.alt || '' }; set(img); draw(); }) }, src ? 'Change photo' : 'Add photo'),
          src ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { img = null; set(null); draw(); } }, 'Remove') : null),
        src ? h('label', {}, 'Describe the photo (for Google and screen readers)', h('input', { type: 'text', value: img.alt || '', placeholder: 'e.g. NSC excavator setting a manhole on Kingston Road', oninput: e => { img.alt = e.target.value; set(img); } })) : null,
        src ? h('div', { class: 'row' },
          h('label', {}, 'Keep in view when cropped ', h('select', { onchange: e => { img.focus = e.target.value || undefined; if (!img.focus) delete img.focus; set(img); draw(); } },
            [['', 'Centre'], ['50% 15%', 'Top'], ['50% 85%', 'Bottom'], ['15% 50%', 'Left'], ['85% 50%', 'Right']].map(([v, l]) => h('option', { value: v, selected: (img.focus || '') === v }, l)))),
          f.tag ? h('label', {}, 'Type ', h('select', { onchange: e => { if (e.target.value) img.tag = e.target.value; else delete img.tag; set(img); } },
            [['', 'Photo'], ['drawing', 'Drawing'], ['illustration', 'Illustration']].map(([v, l]) => h('option', { value: v, selected: (img.tag || '') === v }, l)))) : null) : null));
  };
  draw();
  return box;
}
function imagesInput(f, obj, onChange) {
  const box = h('div', { class: 'imgs' });
  const list = () => obj[f.name] || (obj[f.name] = []);
  const draw = () => {
    box.innerHTML = '';
    list().forEach((im, i) => {
      box.append(h('div', { class: 'imgs-it' },
        h('img', { src: thumb(im), alt: '', loading: 'lazy' }),
        h('input', { type: 'text', value: im.alt || '', placeholder: 'Describe the photo', 'aria-label': 'Photo description', oninput: e => { im.alt = e.target.value; onChange(); } }),
        h('div', { class: 'imgs-b' },
          h('button', { class: 'icon-btn', type: 'button', title: 'Move left', disabled: i === 0, onclick: () => { const a = list(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(); draw(); } }, '←'),
          h('button', { class: 'icon-btn', type: 'button', title: 'Move right', disabled: i === list().length - 1, onclick: () => { const a = list(); [a[i + 1], a[i]] = [a[i], a[i + 1]]; onChange(); draw(); } }, '→'),
          h('button', { class: 'icon-btn danger', type: 'button', title: 'Remove', onclick: () => { list().splice(i, 1); if (!list().length) delete obj[f.name]; onChange(); draw(); } }, '✕'))));
    });
    box.append(h('button', { class: 'imgs-add', type: 'button', onclick: () => pickImage(k => { list().push({ _type: 'image', _key: rid(), local: k.key, alt: k.alt || '' }); onChange(); draw(); }, true) }, '+ Add photos'));
  };
  draw();
  return box;
}
function refsInput(f, obj, onChange) {
  const box = h('div', { class: 'refs' });
  const list = () => obj[f.name] || (obj[f.name] = []);
  const draw = () => {
    box.innerHTML = '';
    const chosen = list().map(r => r._ref);
    list().forEach((r, i) => {
      const d = state.docs.find(x => x._id === r._ref);
      box.append(h('div', { class: 'ref-it' }, h('span', {}, d ? label(d) : '(deleted)'),
        h('button', { class: 'icon-btn', type: 'button', disabled: i === 0, onclick: () => { const a = list(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(); draw(); } }, '↑'),
        h('button', { class: 'icon-btn danger', type: 'button', onclick: () => { list().splice(i, 1); if (!list().length) delete obj[f.name]; onChange(); draw(); } }, '✕')));
    });
    const opts = byType(f.to).filter(d => !chosen.includes(d._id));
    box.append(h('select', { onchange: e => { if (!e.target.value) return; list().push({ _type: 'reference', _ref: e.target.value, _key: rid() }); onChange(); draw(); } },
      h('option', { value: '' }, `+ Add a ${TYPES[f.to].one}…`), opts.map(o => h('option', { value: o._id }, label(o)))));
  };
  draw();
  return box;
}
function listInput(f, obj, onChange) {
  const box = h('div', { class: 'list' + (f.inline ? ' inline' : '') });
  const arr = () => obj[f.name] || (obj[f.name] = []);
  const draw = (openKey) => {
    box.innerHTML = '';
    arr().forEach((it, i) => {
      it._key ||= rid();
      const body = h('div', { class: 'li-b' });
      renderFields(body, f.fields, it, () => { onChange(); title.textContent = it[f.itemLabel] || `Item ${i + 1}`; });
      const title = h('span', { class: 'li-t' }, it[f.itemLabel] || it.title || it.label || `Item ${i + 1}`);
      if (f.inline) {
        body.className = 'row-f';
        box.append(h('div', { class: 'li-row' }, body, h('span', { class: 'li-a' },
          h('button', { class: 'icon-btn', type: 'button', title: 'Move up', 'aria-label': 'Move up', disabled: i === 0, onclick: () => { const a = arr(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(); draw(); } }, '↑'),
          h('button', { class: 'icon-btn danger', type: 'button', title: 'Remove', 'aria-label': 'Remove', onclick: () => { arr().splice(i, 1); if (!arr().length) delete obj[f.name]; onChange(); draw(); } }, '✕'))));
        return;
      }
      const card = h('details', { class: 'li', open: openKey === it._key || null },
        h('summary', {}, title, h('span', { class: 'li-a' },
          h('button', { class: 'icon-btn', type: 'button', title: 'Move up', disabled: i === 0, onclick: e => { e.preventDefault(); const a = arr(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(); draw(); } }, '↑'),
          h('button', { class: 'icon-btn', type: 'button', title: 'Move down', disabled: i === arr().length - 1, onclick: e => { e.preventDefault(); const a = arr(); [a[i + 1], a[i]] = [a[i], a[i + 1]]; onChange(); draw(); } }, '↓'),
          h('button', { class: 'icon-btn danger', type: 'button', title: 'Remove', onclick: e => { e.preventDefault(); arr().splice(i, 1); if (!arr().length) delete obj[f.name]; onChange(); draw(); } }, '✕'))),
        body);
      box.append(card);
    });
    if (!f.max || arr().length < f.max) box.append(h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { const it = { _key: rid() }; arr().push(it); onChange(); draw(it._key); } }, '+ Add'));
  };
  draw();
  return h('fieldset', { class: 'field f-list' }, h('legend', {}, f.label), f.help ? h('p', { class: 'f-help' }, f.help) : null, box);
}
function blocksInput(f, obj, onChange) {
  const box = h('div', { class: 'blocks' });
  const arr = () => obj[f.name] || (obj[f.name] = []);
  const addMenu = (at) => {
    const close = modal('Add a section', h('div', { class: 'bpick' }, Object.entries(BLOCKS).map(([t, b]) => h('button', { type: 'button', class: 'bpick-it', onclick: () => { const nb = { _type: t, _key: rid() }; if (t === 'numberedList') nb.columns = '3'; arr().splice(at, 0, nb); onChange(); close(); draw(nb._key); } },
      h('i', {}, b.icon), h('b', {}, b.title), h('span', {}, b.help)))));
  };
  const draw = (openKey) => {
    box.innerHTML = '';
    arr().forEach((b, i) => {
      const def = BLOCKS[b._type] || { title: b._type, fields: [] };
      const body = h('div', { class: 'li-b' });
      if (def.fields.length) renderFields(body, def.fields, b, () => { onChange(); sub.textContent = b.title || b.kicker || ''; });
      else body.append(h('p', { class: 'muted' }, def.help + ' Nothing to fill in here.'));
      const sub = h('span', { class: 'li-sub' }, b.title || b.kicker || '');
      box.append(h('div', { class: 'between' }, h('button', { type: 'button', class: 'add-between', onclick: () => addMenu(i) }, '+ Add section here')));
      box.append(h('details', { class: 'li block', open: openKey === b._key || null },
        h('summary', {}, h('i', { class: 'b-ico' }, def.icon), h('span', { class: 'li-t' }, def.title), sub, h('span', { class: 'li-a' },
          h('button', { class: 'icon-btn', type: 'button', title: 'Move up', disabled: i === 0, onclick: e => { e.preventDefault(); const a = arr(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(); draw(); } }, '↑'),
          h('button', { class: 'icon-btn', type: 'button', title: 'Move down', disabled: i === arr().length - 1, onclick: e => { e.preventDefault(); const a = arr(); [a[i + 1], a[i]] = [a[i], a[i + 1]]; onChange(); draw(); } }, '↓'),
          h('button', { class: 'icon-btn danger', type: 'button', title: 'Remove section', onclick: async e => { e.preventDefault(); if (await confirmBox('Remove this section?', `“${def.title}${b.title ? ': ' + b.title : ''}” will be removed from the page when you save.`, 'Remove')) { arr().splice(i, 1); onChange(); draw(); } } }, '✕'))),
        body));
    });
    box.append(h('button', { class: 'btn sm', type: 'button', onclick: () => addMenu(arr().length) }, '+ Add a section'));
  };
  draw();
  return h('fieldset', { class: 'field f-blocks' }, h('legend', {}, f.label), box);
}

// ---------------------------------------------------------------- photos
async function pickImage(done, multi = false) {
  let close;
  const status = h('p', { class: 'muted' });
  const file = h('input', { type: 'file', accept: 'image/*', multiple: multi, hidden: true, onchange: () => upload([...file.files]) });
  const drop = h('div', { class: 'drop', tabindex: 0, onclick: () => file.click(), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') file.click(); } },
    h('b', {}, multi ? 'Upload photos' : 'Upload a photo'), h('span', {}, 'Click to choose, or drag photos here. JPG, PNG, WebP or iPhone photos.'), file);
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => upload([...e.dataTransfer.files].filter(f => f.type.startsWith('image/') || /\.hei[cf]$/i.test(f.name))));
  const lib = h('div', { class: 'lib' }, h('p', { class: 'muted' }, 'Loading photos…'));
  async function upload(files) {
    if (!files.length) return;
    for (const [n, fl] of files.entries()) {
      status.textContent = `Preparing photo ${n + 1} of ${files.length}…`;
      try {
        const { big, small, tiny, previewUrl } = await resize(fl);
        status.textContent = `Uploading photo ${n + 1} of ${files.length}…`;
        const { key } = await api('upload', { name: fl.name, size: 2560, data: big });
        await api('upload', { key, size: 1280, data: small });
        await api('upload', { key, size: 640, data: tiny });
        state.preview.set(key, previewUrl); state.media?.unshift(key);
        done({ key, alt: '' });
      } catch (e) { toast(`${fl.name}: ${e.message}`, 'err', 8000); }
    }
    status.textContent = '';
    if (!multi || files.length) close();
  }
  close = modal(multi ? 'Add photos' : 'Choose a photo', h('div', {}, drop, status, h('h3', { class: 'lib-h' }, 'Or pick one already on the website'), lib));
  try {
    state.media ||= (await api('media')).keys;
    lib.innerHTML = '';
    let shown = 0;
    const more = () => {
      state.media.slice(shown, shown + 60).forEach(k => lib.append(h('button', { type: 'button', class: 'lib-it', title: k, onclick: () => { done({ key: k }); if (!multi) close(); else toast('Photo added.'); } }, h('img', { src: state.preview.get(k) || `${SITE}media/${k}-1280.webp`, alt: k, loading: 'lazy' }))));
      shown += 60;
      if (shown < state.media.length) lib.append(h('button', { type: 'button', class: 'btn ghost sm lib-more', onclick: e => { e.target.remove(); more(); } }, 'Show more'));
    };
    more();
  } catch (e) { lib.innerHTML = ''; lib.append(h('p', { class: 'err' }, e.message)); }
}
// Resize in the browser to 2560, 1280 and 640 px WebP, so uploads are fast and the site stays sharp.
async function resize(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('This browser cannot open that photo. iPhone photos open in Safari; on other browsers, export as JPG first.'); }
  if (Math.max(bmp.width, bmp.height) < 900) toast(`${file.name} is small (${bmp.width}×${bmp.height}). It may look blurry on large screens.`, 'warn', 7000);
  const out = async (max, q) => {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', q));
    if (!blob || blob.type !== 'image/webp') throw new Error('This browser cannot make WebP photos. Please use Chrome, Edge, Firefox or Safari 17+.');
    return blob;
  };
  let big = await out(2560, 0.82);
  if (big.size > 3e6) big = await out(2560, 0.7);
  const small = await out(1280, 0.82);
  const tiny = await out(640, 0.8);
  const b64 = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(b); });
  return { big: await b64(big), small: await b64(small), tiny: await b64(tiny), previewUrl: URL.createObjectURL(small) };
}

// ---------------------------------------------------------------- users
function usersView() {
  const box = h('div', {}, h('p', { class: 'muted' }, 'Loading…'));
  const load = async () => {
    try {
      const { users } = await api('users');
      box.innerHTML = '';
      box.append(h('ul', { class: 'rows big' }, users.map(u => h('li', {}, h('button', { class: 'row-btn', onclick: () => userModal(u, load) },
        h('span', { class: 'r-tx' }, h('span', { class: 'r-t' }, u.name || u.email, u.role === 'owner' ? h('em', { class: 'pill' }, 'Owner') : null, u.disabled ? h('em', { class: 'pill off' }, 'Disabled') : null),
          h('span', { class: 'r-s' }, `${u.email}${u.created ? ' · added ' + ago(u.created) : ''}`)))))));
    } catch (e) { box.innerHTML = ''; box.append(h('p', { class: 'err' }, e.message)); }
  };
  load();
  return h('div', { class: 'main' }, h('header', { class: 'top' }, h('div', {}, h('h1', {}, 'Users'), h('p', { class: 'muted' }, 'People who can sign in to this admin. Owners can also manage users.')),
    h('button', { class: 'btn primary', onclick: () => userModal(null, load) }, '+ Add user')), box);
}
function userModal(u, reload) {
  const isNew = !u;
  const err = h('p', { class: 'err' });
  const f = h('form', { class: 'stack', onsubmit: e => e.preventDefault() },
    h('label', {}, 'Name', h('input', { name: 'name', value: u?.name || '' })),
    h('label', {}, 'Email', h('input', { name: 'email', type: 'email', value: u?.email || '', disabled: !isNew })),
    h('label', {}, 'Role', h('select', { name: 'role' }, h('option', { value: 'editor', selected: u?.role !== 'owner' }, 'Editor: can edit everything on the website'), h('option', { value: 'owner', selected: u?.role === 'owner' }, 'Owner: can also manage users'))),
    h('label', {}, isNew ? 'Password (10+ characters). Share it with them privately.' : 'New password (leave empty to keep the current one)', h('input', { name: 'password', type: 'text', autocomplete: 'off' })),
    h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { f.password.value = genPassword(); } }, 'Suggest a strong password'),
    !isNew && u.email !== state.me.email ? h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'disabled', checked: !!u.disabled }), ' Disabled (cannot sign in)') : null,
    err);
  const actions = [
    !isNew && u.email !== state.me.email ? { label: 'Remove user', kind: 'danger ghost', run: async c => { if (await confirmBox(`Remove ${u.email}?`, 'They will no longer be able to sign in.', 'Remove')) { try { await api('userRemove', { email: u.email }); c(); reload(); toast('User removed.'); } catch (e) { err.textContent = e.message; } } } } : null,
    { label: 'Cancel', run: c => c() },
    { label: isNew ? 'Add user' : 'Save', kind: 'primary', run: async c => {
      try { await api('userSave', { email: isNew ? f.email.value : u.email, name: f.name.value, role: f.role.value, password: f.password.value || undefined, disabled: f.disabled ? f.disabled.checked : undefined }); c(); reload(); toast(isNew ? 'User added. Send them the website address /admin, their email and password.' : 'User updated.', 'ok', 7000); }
      catch (e) { err.textContent = e.message; }
    } },
  ].filter(Boolean);
  modal(isNew ? 'Add a user' : `Edit ${u.name || u.email}`, f, actions);
}
const genPassword = () => { const w = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; const a = crypto.getRandomValues(new Uint32Array(16)); return [...a].map(x => w[x % w.length]).join('').replace(/(.{4})(?!$)/g, '$1-'); };

function accountView() {
  const err = h('p', { class: 'err' });
  const f = h('form', { class: 'panel stack narrow', onsubmit: async e => {
      e.preventDefault(); err.textContent = '';
      if (f.password.value !== f.password2.value) { err.textContent = 'The new passwords do not match.'; return; }
      try { await api('password', { current: f.current.value, password: f.password.value }); toast('Password changed. Please sign in again.'); state.me = null; render(); }
      catch (x) { err.textContent = x.message; }
    } },
    h('h2', {}, 'Change password'),
    h('label', {}, 'Current password', h('input', { name: 'current', type: 'password', autocomplete: 'current-password', required: true })),
    h('label', {}, 'New password (10+ characters)', h('input', { name: 'password', type: 'password', autocomplete: 'new-password', required: true, minlength: 10 })),
    h('label', {}, 'New password again', h('input', { name: 'password2', type: 'password', autocomplete: 'new-password', required: true })),
    err, h('button', { class: 'btn primary', type: 'submit' }, 'Change password'));
  return h('div', { class: 'main' }, h('header', { class: 'top' }, h('div', {}, h('h1', {}, 'My account'), h('p', { class: 'muted' }, `${state.me.name} · ${state.me.email} · ${state.me.role === 'owner' ? 'Owner' : 'Editor'}`))), f);
}

window.nscAdmin = { state, norm };   // handy for support in the browser console
start();
