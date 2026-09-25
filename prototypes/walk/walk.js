// Walk comparison. All three modes walk exactly like the 2015 site:
// the page is really tall, native scrolling moves you (100 px = 1 m of street),
// and the rAF loop swaps the src of one <img> between stills that are already
// loaded. Nothing else runs while you move.
//
//   A · Original              the production behaviour, rebuilt as a baseline
//   B · Depth when stopped    same walk; after you stop, the still fades into 3D
//   C · In-between frames     same walk over 3x more frames (optical-flow
//                             in-betweens for the first 150 Plaza Botero stills)
import { createDepthView, depthFor, initDepthModel, depthBackend } from './depth.js';

const params = new URLSearchParams(location.search);
const FRAME_BASE = params.get('base') || '/frames/';
const INTERP = { way: 'plazabotero-start-carabobo', stills: 150, x: 3, base: 'interp/plazabotero-start-carabobo/' };
const HIRES_AFTER_MS = 100;  // same as production
const DEPTH_AFTER_MS = 700;  // how long you must stay still before depth appears
const $ = (id) => document.getElementById(id);
const flat = $('flat'), hires = $('hires'), gl = $('gl'), track = $('track');

const NOTES = {
  flat: '<b>A · Original.</b> The 2015 walk rebuilt as it is: native scroll, 100 px per metre, one image swapped per still. This is the baseline to compare against.',
  depth: '<b>B · Depth on stop.</b> Walks exactly like A. Stop for a moment and the still turns 3D with a slow drift; drag or tilt your phone to look around. Scroll again and it snaps straight back to the photo. <i>Clean edges</i> tears the 3D surface around people instead of stretching them; <i>Look around</i> keeps the photo flat.',
  interp: `<b>C · Denser frames.</b> Walks like A, with two generated frames between each pair of stills (3x denser). Only the first ${INTERP.stills} stills of Plaza Botero have them; after that it falls back to A.`,
};

// --- streets -----------------------------------------------------------------
function metres([lon1, lat1], [lon2, lat2]) {
  const R = 6371000, r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const ways = await fetch('/content/ways.json').then((r) => r.json());
function wayInfo(w) {
  let len = 0;
  try { const p = JSON.parse(w.wayPath); for (let k = 1; k < p.length; k++) len += metres(p[k - 1], p[k]); } catch {}
  return { name: w.wayName, count: +w.nbStills, length: len || +w.nbStills / 3 };
}
for (const w of ways) {
  const o = document.createElement('option'); o.value = w.wayName;
  o.textContent = `${w.wayArea ? w.wayArea + ' · ' : ''}${w.wayName}`;
  $('way').append(o);
}

// --- frames: preload like production (coarse to fine), nearest-first ----------
class Frames {
  constructor(urls) {
    this.urls = urls; this.n = urls.length;
    this.ok = new Uint8Array(this.n); this.imgs = new Array(this.n);
    this.busy = 0; this.cur = 0; this.dead = false;
    const seen = new Uint8Array(this.n); this.coarse = [];
    for (const step of [20, 10, 5, 2, 1]) for (let i = 0; i < this.n; i += step) if (!seen[i]) { seen[i] = 1; this.coarse.push(i); }
    this.cp = 0; this.requested = new Uint8Array(this.n);
    this.pump();
  }
  next() {
    // what you're about to see first, then the rest coarse-to-fine
    for (let d = 0; d < 40; d++) for (const i of [this.cur + d, this.cur - (d >> 2)]) {
      if (i >= 0 && i < this.n && !this.requested[i]) return i;
    }
    while (this.cp < this.coarse.length && this.requested[this.coarse[this.cp]]) this.cp++;
    return this.cp < this.coarse.length ? this.coarse[this.cp] : -1;
  }
  pump() {
    while (!this.dead && this.busy < 6) {
      const i = this.next(); if (i < 0) return;
      this.requested[i] = 1; this.busy++;
      const img = new Image(); img.src = this.urls[i];
      img.decode().then(() => { this.imgs[i] = img; this.ok[i] = 1; }, () => {})
        .finally(() => { this.busy--; this.pump(); });
    }
  }
  // Never wait for the network: show the nearest still that is ready.
  nearest(i) {
    for (let d = 0; d < this.n; d++) {
      if (i - d >= 0 && this.ok[i - d]) return i - d;
      if (i + d < this.n && this.ok[i + d]) return i + d;
    }
    return -1;
  }
  get loaded() { let c = 0; for (const v of this.ok) c += v; return c; }
}

// --- state ---------------------------------------------------------------------
let way, stills, inter = null, mode = 'flat';
let current = 0, shown = -1, lastMove = performance.now();
let hiresFor = -1, depthFor_ = -1;
const depthView = createDepthView(gl, { hfov: +(params.get('hfov') || 100), tear: +(params.get('tear') || 0.05) });
function setStyle(st) {
  if (!['clean', 'stretch', 'look'].includes(st)) st = 'clean';
  depthView.setStyle(st);
  document.querySelectorAll('#styles button').forEach((b) => b.classList.toggle('on', b.dataset.style === st));
  const u = new URL(location.href); u.searchParams.set('style', st); history.replaceState(null, '', u);
}
document.querySelectorAll('#styles button').forEach((b) => b.addEventListener('click', () => setStyle(b.dataset.style)));

function setWay(name) {
  const w = ways.find((x) => x.wayName === name) || ways[0];
  way = wayInfo(w);
  if (stills) stills.dead = true;
  const pad = (i) => String(i).padStart(3, '0');
  stills = new Frames(Array.from({ length: way.count }, (_, i) => `${FRAME_BASE}${way.name}/lowres/way${pad(i)}.jpg`));
  if (inter) inter.dead = true;
  inter = null;
  if (way.name === INTERP.way && mode === 'interp') makeInter();
  $('way').value = way.name;
  track.style.height = `${Math.round(way.length * 100 + innerHeight)}px`; // 1 m = 100 px, like production
  scrollTo(0, 0); current = 0; shown = -1; hiresFor = depthFor_ = -1;
  hideExtras(true);
  const u = new URL(location.href); u.searchParams.set('way', way.name); history.replaceState(null, '', u);
}
function makeInter() {
  const n = (INTERP.stills - 1) * INTERP.x + 1;
  inter = new Frames(Array.from({ length: n }, (_, i) => `${INTERP.base}${String(i).padStart(4, '0')}.jpg`));
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  document.body.classList.toggle('depth', m === 'depth');
  $('noteText').innerHTML = NOTES[m];
  if (m === 'interp' && way.name !== INTERP.way) { setWay(INTERP.way); }
  else if (m === 'interp' && !inter) makeInter();
  if (m === 'depth') initDepthModel().catch(() => {});
  shown = -1; hideExtras(true); lastMove = performance.now();
  const u = new URL(location.href); u.searchParams.set('mode', m); history.replaceState(null, '', u);
}
document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('close').addEventListener('click', () => $('note').classList.toggle('min'));
if (matchMedia('(max-width: 600px)').matches) setTimeout(() => $('note').classList.add('min'), 6000);
$('way').addEventListener('change', (e) => setWay(e.target.value));
$('gyro').addEventListener('click', async () => {
  const b = $('gyro');
  if (b.classList.toggle('on')) { if (!(await depthView.enableGyro())) b.classList.remove('on'); }
  else depthView.disableGyro();
});

function hideExtras(now) {
  hires.classList.remove('on'); hiresFor = -1;
  if (gl.classList.contains('on') || now) {
    gl.classList.add('off-now'); gl.classList.remove('on'); depthView.hide(); depthFor_ = -1;
    requestAnimationFrame(() => gl.classList.remove('off-now'));
  }
}
// Any scroll drops the high-res and depth layers immediately, before the next frame.
addEventListener('scroll', () => { lastMove = performance.now(); if (hiresFor >= 0 || depthFor_ >= 0) hideExtras(false); }, { passive: true });

// --- the loop (same easing as app/views/streetwalk.js computeAnimation) ----------
let fpsN = 0, fpsT = performance.now(), fps = 0;
function tick() {
  const target = scrollY;
  if (Math.floor(target) !== Math.floor(current)) {
    const deaccelerate = Math.max(Math.min(Math.abs(target - current) * 5000, 10), 2);
    current += (target - current) / deaccelerate;
    current = target > current ? Math.ceil(current) : Math.floor(current);
    lastMove = performance.now();
  }
  const available = Math.max(1, track.offsetHeight - innerHeight);
  const s = Math.min(Math.max(current / available, 0), 1) * (way.count - 1); // fractional still

  let src = stills, idx = Math.round(s);
  if (mode === 'interp' && inter && s <= INTERP.stills - 1) { src = inter; idx = Math.round(s * INTERP.x); }
  src.cur = idx;
  const pick = src.nearest(idx);
  const key = (src === inter ? 'i' : 's') + pick;
  if (pick >= 0 && key !== shown) { flat.src = src.imgs[pick].src; shown = key; }

  const still = src === inter ? Math.round(pick / INTERP.x) : pick;
  const exact = src !== inter || pick % INTERP.x === 0;
  const idle = performance.now() - lastMove;
  if (still >= 0 && exact && idle > HIRES_AFTER_MS && hiresFor !== still) showHires(still);
  if (mode === 'depth' && still >= 0 && idle > DEPTH_AFTER_MS && depthFor_ !== still) showDepth(still);

  fpsN++; const now = performance.now();
  if (now - fpsT > 500) { fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now; }
  $('info').textContent = `still ${Math.max(still, 0)} / ${way.count - 1} · ${stills.loaded} loaded · ${fps} fps` +
    (mode === 'depth' ? ` · depth ${depthBackend()}` : '');
  requestAnimationFrame(tick);
}

const pad3 = (i) => String(i).padStart(3, '0');
function showHires(still) {
  hiresFor = still;
  const url = `${FRAME_BASE}${way.name}/highres/way${pad3(still)}.jpg`;
  const img = new Image(); img.src = url;
  img.decode().then(() => { if (hiresFor === still) { hires.src = url; hires.classList.add('on'); } }, () => {});
}
async function showDepth(still) {
  depthFor_ = still;
  const img = new Image(); img.src = `${FRAME_BASE}${way.name}/highres/way${pad3(still)}.jpg`;
  let depth = null;
  try {
    [depth] = await Promise.all([depthFor(`${FRAME_BASE}${way.name}/lowres/way${pad3(still)}.jpg`), img.decode()]);
  } catch (e) {
    console.warn('depth unavailable, using a street-shape guess', e);
    try { await img.decode(); } catch { return; }
  }
  if (depthFor_ !== still) return; // walked on meanwhile
  depthView.show(img, depth);
  gl.classList.add('on');
}

setWay(params.get('way') || 'plazabotero-start-carabobo');
setStyle(params.get('style') || 'clean');
setMode(['flat', 'depth', 'interp'].includes(params.get('mode')) ? params.get('mode') : 'flat');
requestAnimationFrame(tick);
