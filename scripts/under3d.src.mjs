// Source of public/assets/under3d.js: the interactive 3D model in the home page's "Under the street" section.
// Rebuild after editing:  npm run build:3d   (bundles this file with three.js into public/assets/under3d.js)
// The model is a schematic of the Kingston Road sewer separation (not to scale). What it shows comes from the project record:
// new sanitary and storm mains side by side, manholes set in pairs, catch basins and storm leads, service connections to
// every property, water services and a hydrant, then the restored street.
import * as THREE from 'three';

export function mount(root) {
  const stage = root.querySelector('.u3-stage'), cv = root.querySelector('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070a10, 95, 190);
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 500);
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x05070b, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(30, 60, 25); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x4f86ff, 1.2); rim.position.set(-40, 10, -30); scene.add(rim);

  // layers: every material belongs to one layer so a layer can be dimmed or lit as a whole
  const layers = { soil: [], surface: [], sanitary: [], storm: [], water: [] };
  const dim = { soil: 1, surface: 1, sanitary: 1, storm: 1, water: 1 }, dimTo = { ...dim };
  const grow = [];   // pipes that extend along their length on first view
  const world = new THREE.Group(); scene.add(world);
  const mat = (layer, color, opacity = 1, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: .55, metalness: .08, ...extra }); m.userData.base = opacity; layers[layer].push(m); return m; };
  const lineMat = (layer, color, opacity = 1) => { const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity }); m.userData.base = opacity; layers[layer].push(m); return m; };
  function box(layer, w, h, d, x, y, z, color, opacity, edge, edgeOpacity = .9, extra = {}) {
    const g = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(g, mat(layer, color, opacity, extra)); m.position.set(x, y, z); world.add(m);
    if (edge != null) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), lineMat(layer, edge, edgeOpacity)); e.position.copy(m.position); world.add(e); }
    return m;
  }
  const UP = new THREE.Vector3(0, 1, 0);
  function pipe(layer, a, b, r, material, delay = 0, seg = 28) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg, 1), material);
    m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize()); world.add(m);
    grow.push({ m, delay }); return m;
  }
  const L = 68, H = L / 2;

  // ground block (cut away so the pipes show) and the street on top
  const soil = box('soil', L, 7.2, 13, 0, -3.75, 0, 0x0b1322, .3, 0x3d5c92, .7, { depthWrite: false, roughness: 1 }); soil.renderOrder = -2;
  const S = { depthWrite: false };
  box('surface', L, .3, 8, 0, 0, 0, 0x1c222d, .5, 0x6f86b3, .8, S);                                   // road
  for (const s of [-1, 1]) {
    box('surface', L, .42, 2, 0, .06, s * 5, 0x566070, .62, 0x8ea3c8, .7, S);                           // sidewalk
    box('surface', L, .22, 10, 0, .04, s * 11, 0x0f1620, .5, 0x2c3d5e, .6, S);                           // lots
    for (const x of [-25, -8.5, 8.5, 25]) box('surface', 10, 3, 6.4, x, 1.65, s * 11.4, 0x141b27, .42, 0x8198c6, .5, S);   // houses as plain massing
  }
  for (let x = -H + 2.5; x < H; x += 5) box('surface', 2.2, .02, .16, x, .17, 0, 0xe6ebf3, .9, null, 0, S);   // centre line

  // mains: storm and sanitary side by side, on a slight grade
  // colour code: sanitary red, storm green, water blue
  const mSan = mat('sanitary', 0xe5483b, 1, { emissive: 0x6a1410, roughness: .38 });
  const mStorm = mat('storm', 0x2fbf6a, 1, { emissive: 0x0d5a2c, roughness: .35 });
  const mWater = mat('water', 0x2f8bff, 1, { emissive: 0x0d3a8a, roughness: .3 });
  const mMhS = mat('sanitary', 0xb9c0cb, .96, { roughness: .9 }), mMhT = mat('storm', 0xb9c0cb, .96, { roughness: .9 });
  const sanY = x => -4.75 + (x + H) * .006, stY = x => -3.75 + (x + H) * .006, sanZ = -1.45, stZ = 1.45;
  pipe('sanitary', [-H, sanY(-H), sanZ], [H, sanY(H), sanZ], .44, mSan, .2);
  pipe('storm', [-H, stY(-H), stZ], [H, stY(H), stZ], .58, mStorm, 0);
  // manholes in pairs, with lids in the road
  for (const x of [-21, 0, 21]) {
    for (const [layer, z, y0, mm, ring] of [['sanitary', sanZ, sanY(x) - .5, mMhS, 0xe5483b], ['storm', stZ, stY(x) - .6, mMhT, 0x2fbf6a]]) {
      const h = .12 - y0, c = new THREE.Mesh(new THREE.CylinderGeometry(.7, .95, h, 32), mm); c.position.set(x, y0 + h / 2, z); world.add(c); grow.push({ m: c, delay: .9, pop: true });
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .08, 32), mat('surface', 0x0a0d13, 1)); lid.position.set(x, .2, z); world.add(lid);
      const tr = new THREE.Mesh(new THREE.TorusGeometry(.66, .05, 10, 40), mat(layer, ring, 1, { emissive: ring, emissiveIntensity: .5 })); tr.rotation.x = Math.PI / 2; tr.position.set(x, .25, z); world.add(tr);
    }
  }
  // catch basins at the curb with storm leads
  for (const [x, s] of [[-12, 1], [-12, -1], [12, 1], [12, -1]]) {
    box('storm', .95, 1.5, .95, x, -.62, s * 3.6, 0xb9c0cb, .96, null, 0, { roughness: .9 });
    box('storm', .8, .04, .6, x, .18, s * 3.6, 0x0a0d13, 1, 0x2fbf6a, 1);
    pipe('storm', [x, -1.15, s * 3.6], [x, stY(x), stZ], .2, mStorm, 1.3, 16);
  }
  // sanitary and storm service connections to every property
  for (const s of [-1, 1]) for (const x of [-25, -8.5, 8.5, 25]) {
    pipe('sanitary', [x - 1.2, sanY(x), sanZ], [x - 1.2, -1.7, s * 6.3], .16, mSan, 1.5, 14);
    pipe('storm', [x + 1.2, stY(x), stZ], [x + 1.2, -1.5, s * 6.3], .16, mStorm, 1.6, 14);
    pipe('water', [x + 3, -1.55, 3.1], [x + 3, -1.25, s * 6.3], .09, mWater, 1.9, 10);
  }
  // water main, services and the hydrant
  pipe('water', [-H, -1.55, 3.1], [H, -1.55, 3.1], .24, mWater, .5, 20);
  pipe('water', [-16, -1.55, 3.1], [-16, -1.55, 5], .12, mWater, 1.9, 14);
  pipe('water', [-16, -1.55, 5], [-16, .3, 5], .12, mWater, 2, 14);
  const hyd = new THREE.Mesh(new THREE.CylinderGeometry(.2, .24, 1.05, 18), mat('water', 0xffc233, 1, { emissive: 0x5a3f05 })); hyd.position.set(-16, .8, 5); world.add(hyd);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 10), mat('water', 0xffc233, 1, { emissive: 0x5a3f05 })); cap.position.set(-16, 1.36, 5); world.add(cap);

  // labels: text lives in the page (so it is readable without WebGL); here they are pinned to points on the model
  const labels = [...root.querySelectorAll('.u3-labels [data-at]')].map(el => ({ el, p: new THREE.Vector3(...el.dataset.at.split(',').map(Number)), layer: el.dataset.l || '' }));
  const infos = [...root.querySelectorAll('.u3-info [data-for]')], tabs = [...root.querySelectorAll('.u3-tabs button')];
  let active = 'all';
  function setLayer(name) {
    active = name;
    for (const k of ['surface', 'sanitary', 'storm', 'water']) dimTo[k] = name === 'all' || name === k ? 1 : (k === 'surface' ? .28 : .07);
    if (name !== 'all' && name !== 'surface') dimTo.surface = .22;
    dimTo.soil = 1;
    tabs.forEach(b => { const on = b.dataset.layer === name; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on) });
    infos.forEach(i => i.classList.toggle('on', i.dataset.for === name));
    labels.forEach(l => l.el.classList.toggle('off', !(name === 'all' || !l.layer || l.layer.split(' ').includes(name))));
  }
  tabs.forEach(b => b.addEventListener('click', () => setLayer(b.dataset.layer)));
  setLayer('all');

  // camera: slow sway on its own, drag sideways to turn the model
  let yaw = .38, pitch = .36, yawTo = yaw, pitchTo = pitch, drag = null, W = 1, Hh = 1, radius = 80;
  const target = new THREE.Vector3(0, -2.2, 0), v = new THREE.Vector3();
  function size() { W = stage.clientWidth; Hh = stage.clientHeight; renderer.setSize(W, Hh, false); cam.aspect = W / Hh; radius = cam.aspect < .9 ? 168 : cam.aspect < 1.5 ? 96 : 80; scene.fog.near = radius * 1.2; scene.fog.far = radius * 2.5; cam.updateProjectionMatrix(); }
  new ResizeObserver(size).observe(stage); size();
  stage.addEventListener('pointerdown', e => { if (e.target.closest('button,a')) return; drag = { x: e.clientX, y: e.clientY, yaw: yawTo, pitch: pitchTo }; stage.classList.add('drag') });
  addEventListener('pointermove', e => { if (!drag) return; yawTo = drag.yaw - (e.clientX - drag.x) * .006; pitchTo = Math.min(1.25, Math.max(.12, drag.pitch + (e.clientY - drag.y) * .004)) });
  addEventListener('pointerup', () => { drag = null; stage.classList.remove('drag') });
  addEventListener('pointercancel', () => { drag = null; stage.classList.remove('drag') });
  stage.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') yawTo += .2; else if (e.key === 'ArrowRight') yawTo -= .2; else return; e.preventDefault() });

  const ease = t => 1 - Math.pow(1 - t, 3), cl = t => Math.min(1, Math.max(0, t));
  let vis = false, running = false, t0 = -1, last = 0;
  function frame(now) {
    if (!vis || document.hidden) { running = false; return }
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000, dt = Math.min(.1, (now - last) / 1000); last = now;
    const k = reduced ? 1 : cl(t / 1.1);
    for (const g of grow) { const s = reduced ? 1 : ease(cl((t - .25 - g.delay) / 1.5)); g.m.scale.y = Math.max(.0001, s); g.m.visible = s > .001; }
    for (const key in layers) { dim[key] += (dimTo[key] - dim[key]) * Math.min(1, dt * 6); const f = dim[key] * (key === 'soil' || key === 'surface' ? k : 1); for (const m of layers[key]) m.opacity = m.userData.base * f; }
    const sway = reduced || drag ? 0 : Math.sin(t * .16) * .3;
    yaw += (yawTo + sway - yaw) * Math.min(1, dt * 4); pitch += (pitchTo - pitch) * Math.min(1, dt * 4);
    const intro = reduced ? 0 : (1 - ease(cl(t / 2.6)));
    const r = radius * (1 + intro * .35), py = pitch + intro * .35;
    cam.position.set(target.x + Math.sin(yaw) * Math.cos(py) * r, target.y + Math.sin(py) * r, target.z + Math.cos(yaw) * Math.cos(py) * r);
    cam.lookAt(target);
    renderer.render(scene, cam);
    for (const l of labels) { v.copy(l.p).project(cam); l.el.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px,${((1 - v.y) / 2 * Hh).toFixed(1)}px)`; }
    if (!root.classList.contains('ready')) root.classList.add('ready');
    requestAnimationFrame(frame);
  }
  const play = () => { if (running || !vis) return; running = true; last = performance.now(); requestAnimationFrame(frame) };
  const seen = () => { const r = stage.getBoundingClientRect(); vis = r.top < innerHeight && r.bottom > 0; play() };
  addEventListener('scroll', seen, { passive: true }); addEventListener('resize', seen); seen();
  document.addEventListener('visibilitychange', play);
}
