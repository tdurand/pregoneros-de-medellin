// Pregoneros de Medellín.
// One app for every screen: a landing, the street walk and the project pages.
// The walk is the same engine everywhere; only the controls around it change:
//   - desktop: scroll the page to walk (1 m of street = 100 px, like 2015),
//     with the original street furniture (signs, bottom bar, characters),
//   - touch: swipe up to walk, sideways to look around the wide GoPro frame.

import { framePositions, bearing, distance, wayLength } from './geo.js';
import { FrameLoader, connectionIsConstrained } from './frames.js';
import { VideoFrameLoader } from './frames-video.js';
import { Soundscape } from './audio.js';
import * as stories from './stories.js';
import { emit, on } from './bus.js';
import * as landing from './landing.js';
import * as pages from './pages.js';
import * as hud from './hud.js';

const params = new URLSearchParams(location.search);
// Where stills, sounds live. Overridable for local testing: ?assets=http://...
const ASSETS = (params.get('assets') || 'https://images.pregonerosdemedellin.com').replace(/\/$/, '');
// Sounds go through the site's own origin (a /frames/ proxy route in
// vercel.json): the media host sends no CORS headers, and without them Web
// Audio outputs silence, which would lose distance mixing and panning on iOS.
const SOUND_BASE = params.get('assets') ? `${ASSETS}/data` : `${location.origin}/frames`;
const FIRST_WAY = 'plazabotero-start-carabobo';
// Streets as one video file each (tools/media/encode-v2.mjs), decoded with
// WebCodecs. Opt-in with ?video until the v2 files are published with CORS;
// the loader falls back to the JPEG stills whenever they're missing.
const VIDEO_FRAMES = params.has('video');
const LANGS = ['es', 'en', 'fr'];

// Desktop keeps the 2015 layout and page scrolling; everything else is touch.
const desktopQuery = matchMedia('(min-width: 996px) and (hover: hover) and (pointer: fine)');
const isDesktop = () => (desktopQuery.matches || params.has('desktop')) && !params.has('touch');

export const UI_TEXT = {
  es: {
    start: 'Empezar a caminar', headphones: 'Mejor con audífonos',
    swipe: 'Desliza hacia arriba para caminar', look: 'Desliza a los lados para mirar alrededor',
    scroll: 'Haz scroll para caminar',
    tapSign: 'Toca el letrero para ver su historia', choose: '¿Por dónde seguimos?',
    trailer: 'Ver el tráiler', close: 'Cerrar', map: 'Mapa', sound: 'Sonido', menu: 'Menú',
    language: 'Idioma', home: 'Inicio',
  },
  en: {
    start: 'Start walking', headphones: 'Best with headphones',
    swipe: 'Swipe up to walk', look: 'Swipe sideways to look around',
    scroll: 'Scroll to walk',
    tapSign: 'Tap the sign to watch their story', choose: 'Which way now?',
    trailer: 'Watch the trailer', close: 'Close', map: 'Map', sound: 'Sound', menu: 'Menu',
    language: 'Language', home: 'Home',
  },
  fr: {
    start: 'Commencer la balade', headphones: 'Mieux avec un casque',
    swipe: 'Glissez vers le haut pour marcher', look: 'Glissez sur les côtés pour regarder autour',
    scroll: 'Faites défiler pour marcher',
    tapSign: "Touchez le panneau pour voir son histoire", choose: 'Par où continuer ?',
    trailer: 'Voir la bande-annonce', close: 'Fermer', map: 'Carte', sound: 'Son', menu: 'Menu',
    language: 'Langue', home: 'Accueil',
  },
};

const $ = (s) => document.querySelector(s);
const el = {
  app: $('#app'), canvas: $('#frame'), stage: $('#stage'),
  scroller: $('#scroller'), scrollSpace: $('#scroll-space'),
  start: $('#start'), startBtn: $('#start-btn'),
  loading: $('#loading'), loadingBar: $('#loading-bar'),
  sign: $('#sign'), hint: $('#hint'),
  video: $('#video'), videoEl: $('#video video'), videoClose: $('#video-close'),
  landing: $('#landing'), page: $('#page'),
};
const ctx = el.canvas.getContext('2d', { alpha: false });

export const state = {
  ways: {}, waysList: [], way: null, positions: [], loader: null,
  pos: 0, vel: 0, pan: 0, shown: -1, hiImg: null, hiIndex: -1,
  lastMove: 0, dirty: true, lang: 'es', str: {}, walked: 0,
  lastSoundPos: null, dir: 1, panTarget: null,
  view: null, unlocked: false, desktop: false,
  // Desktop scrolling: where the page is, and where the walk has eased to.
  scrollTarget: 0, scrollCur: 0, scrollRange: 1, length: 0,
};
const sound = new Soundscape(SOUND_BASE);
if (params.has('debug')) { window.__walk = state; window.__sound = sound; }

// ---------- language ----------

function pickLang(wanted) {
  if (LANGS.includes(wanted)) return wanted;
  if (state.str.loaded) return state.lang;
  const nav = (navigator.language || 'es').slice(0, 2);
  return LANGS.includes(nav) ? nav : 'es';
}

async function setLang(lang) {
  if (lang === state.lang && state.str.loaded) return;
  state.lang = lang;
  document.documentElement.lang = lang;
  const url = `content/content/string_${lang}.json`;
  const load = async () => { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json(); };
  // Retry once; on a second failure keep the previous strings rather than blank labels.
  try {
    state.str = await load().catch(load);
  } catch (e) { state.str = { ...state.str }; }
  if (state.lang !== lang) return; // a newer language change won the race
  state.str.loaded = true;
  const t = UI_TEXT[lang];
  document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = t[n.dataset.t] || ''; });
  document.querySelectorAll('[data-s]').forEach((n) => { n.textContent = state.str[n.dataset.s] || n.textContent; });
  document.querySelectorAll('[data-aria]').forEach((n) => n.setAttribute('aria-label', t[n.dataset.aria]));
  el.startBtn.querySelector('img').src = `images/${lang}/btn-enter.svg`;
  emit('lang', { lang, str: state.str, ui: t });
  if (state.way && state.view === 'walk') { updateHash(); renderChooser(state.chooserFor); }
}

// ---------- routing ----------
// Keeps the 2015 URLs working: #index/es, #streetwalk/<way>/<lang>,
// #page/<name>/<lang>, #es, and the #<way>/<lang> links of the first mobile walk.

function parseRoute(hash) {
  const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (!p.length || p[0] === 'mobile') return { view: 'index' };
  if (p[0] === 'index') return { view: 'index', lang: p[1] };
  if (p[0] === 'streetwalk') return { view: 'walk', way: p[1], lang: p[2] };
  if (p[0] === 'page') return { view: 'page', name: p[1], lang: p[2] };
  if (LANGS.includes(p[0])) return { view: 'index', lang: p[0] };
  return { view: 'walk', way: p[0], lang: p[1] };
}

export function walkHash(way, lang = state.lang) {
  return `#streetwalk/${way}/${lang}`;
}

async function route() {
  const r = parseRoute(location.hash);
  await setLang(pickLang(r.lang));
  showView(r.view);
  if (r.view === 'index') {
    await landing.show({ lang: state.lang, str: state.str, desktop: state.desktop, enter: enterWalk });
  } else if (r.view === 'page') {
    await pages.show(r.name, { lang: state.lang, str: state.str, desktop: state.desktop });
  } else {
    const name = state.ways[r.way] ? r.way : stories.lastStreet() || FIRST_WAY;
    if (!state.way || state.way.wayName !== name) loadWay(name);
    else updateHash();
    // Sound can only start from a tap or click: ask for one when the walk
    // was opened from a link rather than from the landing's button.
    el.start.hidden = state.unlocked;
    if (state.desktop) el.scroller.focus({ preventScroll: true });
  }
}

function showView(view) {
  state.view = view;
  document.body.dataset.view = view;
  el.landing.hidden = view !== 'index';
  el.page.hidden = view !== 'page';
  el.app.hidden = view !== 'walk';
  if (view !== 'index') landing.hide();
  if (view !== 'page') pages.hide();
  sound.setPaused(view !== 'walk' || !el.video.hidden);
  emit('view', { view });
}

// Called from a click (landing button, start button): unlocks sound, then walks.
export function enterWalk(way) {
  unlockSound();
  const name = way || stories.lastStreet() || FIRST_WAY;
  if (location.hash === walkHash(name)) route();
  else location.hash = walkHash(name);
}

function unlockSound() {
  if (state.unlocked) return;
  state.unlocked = true;
  sound.unlock();
  if (state.way) sound.setWay(state.way.waySounds);
  state.lastSoundPos = null;
  if (state.loader && state.loader.ready) onFrameChange(Math.round(state.pos));
}

export function go(hash) {
  location.hash = hash;
}

// ---------- streets ----------

function updateHash() {
  history.replaceState(null, '', walkHash(state.way.wayName));
}

export function loadWay(name) {
  const way = state.ways[name] || state.ways[FIRST_WAY];
  if (state.loader) state.loader.stop();

  state.way = way;
  state.positions = framePositions(way.wayPath, way.nbStills, way.wayPathSyncPoints);
  state.length = wayLength(way.wayPath);
  state.pos = 0; state.vel = 0; state.pan = 0; state.panTarget = null; state.shown = -1;
  state.hiImg = null; state.hiIndex = -1; state.chooserFor = null;
  state.lastSoundPos = null; state.leftStart = false;
  el.sign.hidden = true;
  if (state.view === 'walk') updateHash();
  stories.rememberStreet(way.wayName);
  if (state.unlocked) sound.setWay(way.waySounds);
  if (way.characterDefinition) loadSign(way.characterDefinition.name);
  resetScroll();

  el.loading.hidden = false;
  el.loadingBar.style.transform = 'scaleX(0)';
  emit('way', { way, positions: state.positions, length: state.length });
  emit('chooser', { which: null, list: [] });
  emit('loading', { progress: 0 });
  const Loader = VIDEO_FRAMES ? VideoFrameLoader : FrameLoader;
  state.loader = new Loader({
    // Decoding is asynchronous with video: redraw when a still is ready.
    onFrame: () => { state.dirty = true; },
    base: ASSETS,
    way: way.wayName,
    count: way.nbStills,
    concurrency: connectionIsConstrained() ? 4 : 6,
    onProgress: (p) => {
      el.loadingBar.style.transform = `scaleX(${p})`;
      emit('loading', { progress: p });
      if (state.shown < 0 && state.loader.frames[0]) state.dirty = true;
    },
    onReady: () => {
      el.loading.hidden = true;
      state.dirty = true;
      emit('ready', { way });
      onFrameChange(0);
    },
  });
  state.loader.start();
}

const signCache = {};
async function loadSign(name) {
  if (!signCache[name]) {
    signCache[name] = fetch(`signs/${name}.svg`).then((r) => r.text()).catch(() => '');
  }
  const svg = await signCache[name];
  if (state.way.characterDefinition && state.way.characterDefinition.name === name) {
    el.sign.querySelector('.sign-art').innerHTML = svg;
  }
}

// ---------- drawing ----------

// Widest still the walk ever draws (high-res). The canvas never needs more
// pixels than that still has on screen: in portrait a 1920 px still covers
// ~1500 CSS px, so 1.3 canvas pixels per CSS pixel already show every source
// pixel, where the screen's 2-3× would only make a bigger canvas to fill each
// frame (2.5× fewer pixels on a 393×851 phone). The compositor scales it up.
const SOURCE_WIDTH = 1920;
const SOURCE_HEIGHT = 1080;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cover = Math.max(w / SOURCE_WIDTH, h / SOURCE_HEIGHT); // CSS px per source px
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, 1 / cover));
  el.canvas.width = Math.round(w * dpr);
  el.canvas.height = Math.round(h * dpr);
  el.canvas.style.width = w + 'px';
  el.canvas.style.height = h + 'px';
  state.dpr = dpr;
  state.dirty = true;
  const desktop = isDesktop();
  if (desktop !== state.desktop || !document.documentElement.classList.contains(desktop ? 'desktop' : 'touch')) {
    state.desktop = desktop;
    document.documentElement.classList.toggle('desktop', desktop);
    document.documentElement.classList.toggle('touch', !desktop);
    emit('layout', { desktop });
  }
  if (state.way) sizeScrollSpace();
}

// Where the still lands on screen: cover the viewport, then shift by `pan`
// (-1 = left edge of the frame, 1 = right edge). In portrait most of the
// 16:9 frame is off-screen, which is what sideways swipes reveal.
function drawRect(img) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const iw = img.naturalWidth || img.width || 16;
  const ih = img.naturalHeight || img.height || 9;
  const s = Math.max(W / iw, H / ih);
  const w = iw * s;
  const h = ih * s;
  const slackX = w - W;
  const slackY = h - H;
  return { x: -slackX / 2 - state.pan * slackX / 2, y: -slackY / 2, w, h };
}

function draw() {
  const i = Math.round(state.pos);
  const lo = state.loader && state.loader.nearest(i);
  if (!lo) return;
  const img = state.hiIndex === i && state.hiImg ? state.hiImg : lo.img;
  const r = drawRect(lo.img);
  const d = state.dpr;
  ctx.drawImage(img, r.x * d, r.y * d, r.w * d, r.h * d);
  state.rect = r;
  placeSign(i);
}

function placeSign(i) {
  const c = state.way.characterDefinition;
  const at = c && state.way.characterPosition && state.way.characterPosition[i];
  // Desktop shows the sign over the 2015 window (startFrame..endFrame). A
  // phone swipe covers ~45 stills, so there the sign stays up wherever the
  // vendor is placed in the frame (about 10 m) and isn't flicked past unseen.
  const inWindow = !c || !state.desktop || (i >= c.startFrame && i <= c.endFrame);
  if (!c || !at || !inWindow || (state.chooserFor && !state.desktop)) {
    el.sign.hidden = true;
    emit('sign', { visible: false });
    return;
  }
  const r = state.rect;
  const t = Math.min(1, Math.max(0, (i - c.startFrame) / Math.max(1, c.endFrame - c.startFrame)));
  const widthPct = c.framestartWidth + t * (c.framefullWidth - c.framestartWidth);
  const width = Math.max(64, widthPct * r.h / 100 * (state.desktop ? 1 : 0.7)); // smaller on phones
  const rawX = r.x + at.left / 100 * r.w;
  const y = r.y + at.top / 100 * r.h;
  const W = window.innerWidth;
  emit('sign', { visible: true, character: c.name, x: rawX, y, width, widthPct, rect: r, def: c, frame: i });
  // Desktop draws the 2015 sign instead (hud.js).
  if (state.desktop) { el.sign.hidden = true; return; }
  // In portrait the vendor can be outside the visible slice: pin the sign to
  // the edge so it stays findable, and let a tap pan towards it.
  const edge = rawX < width / 2 ? 'left' : rawX > W - width / 2 ? 'right' : '';
  const x = Math.min(Math.max(rawX, width / 2), W - width / 2);
  el.sign.style.width = width + 'px';
  el.sign.style.transform = `translate(${x - width / 2}px, ${y}px) translateY(${-100 + (c.offsetTopCenter || 0)}%)`;
  el.sign.dataset.edge = edge;
  el.sign.hidden = false;
}

// ---------- walking ----------

function onFrameChange(i) {
  const n = state.way.nbStills;
  const dir = state.dir;
  state.loader.setFocus(i, dir);

  // Heading follows the direction of travel, for stereo panning.
  const a = state.positions[Math.max(0, Math.min(n - 1, i - 2))];
  const b = state.positions[Math.max(0, Math.min(n - 1, i + 2))];
  const heading = dir >= 0 ? bearing(a, b) : bearing(b, a);
  const here = state.positions[i];
  if (state.unlocked && (!state.lastSoundPos || distance(state.lastSoundPos, here) > 1.5)) {
    sound.update(here, heading);
    state.lastSoundPos = here;
  }

  // The "start" chooser only appears when walking back to the beginning, not
  // on arrival, so a new street opens on the view rather than on a menu.
  if (i > 5) state.leftStart = true;
  const want = i >= n - 1 ? 'end' : i <= 0 && state.leftStart && state.way.wayConnectionsStart ? 'start' : null;
  if (want !== state.chooserFor) renderChooser(want);

  if (!el.hint.hidden && Math.abs(state.walked) > 12) el.hint.hidden = true;
  emit('frame', { i, n, here, heading, dir, way: state.way });
}

// The junction arrows are drawn by hud.js from the 2015 template.
function renderChooser(which) {
  const all = which === 'end' ? state.way.wayConnectionsEnd : which === 'start' ? state.way.wayConnectionsStart : null;
  const list = (all || []).filter((c) => state.ways[c.name]);
  state.chooserFor = list.length ? which : null;
  emit('chooser', { which: state.chooserFor, list });
}

export function chooseWay(name) {
  loadWay(name);
}

function maybeLoadHighRes(now) {
  const i = Math.round(state.pos);
  if (state.vel !== 0 || now - state.lastMove < 250 || state.hiIndex === i || state.hiPending === i) return;
  if (state.hiTried === i || connectionIsConstrained()) return;
  state.hiPending = i;
  state.hiTried = i; // once per stop: a missing still isn't asked for again every frame
  // The loader frees the previous high-res bitmap when asked for another one.
  state.hiImg = null;
  state.hiIndex = -1;
  state.loader.loadHighRes(i).then((img) => {
    state.hiPending = -1;
    if (img && Math.round(state.pos) === i) {
      state.hiImg = img;
      state.hiIndex = i;
      state.dirty = true;
    } else if (img && state.hiTried === i) {
      state.hiTried = -1; // arrived after the walker moved on: fine to ask again later
    }
  });
}

// The loop only runs while something moves or needs drawing, so a walker
// standing still (or the landing and pages) costs no frame callbacks at all.
// Writing any of the fields below wakes it.
let lastT = performance.now();
let ticking = false;
function wake() {
  if (ticking) return;
  ticking = true;
  lastT = performance.now() - 16.67;
  requestAnimationFrame(tick);
}
for (const key of ['dirty', 'vel', 'pos', 'pan', 'panTarget', 'scrollTarget', 'view', 'dragging']) {
  let value = state[key];
  Object.defineProperty(state, key, {
    enumerable: true,
    get: () => value,
    set: (v) => { if (v !== value) { value = v; wake(); } },
  });
}

// Whether the loop has more to do on the next frame.
function busy(now) {
  if (state.view !== 'walk' || !state.way || !state.loader) return false;
  if (state.dirty || state.dragging || state.vel !== 0 || state.panTarget !== null) return true;
  if (state.desktop && state.scrollTarget !== state.scrollCur) return true;
  // Waiting to fetch the high-res still of where the walker stopped.
  const i = Math.round(state.pos);
  return state.loader.ready && state.hiIndex !== i && state.hiPending !== i && state.hiTried !== i
    && !connectionIsConstrained() && now - state.lastMove < 1000;
}

function tick(now) {
  const dt = Math.min(50, now - lastT) / 16.67;
  lastT = now;

  if (state.view === 'walk' && state.way && state.loader && state.loader.ready) {
    if (state.desktop) followScroll(dt);
    else if (!state.dragging && state.vel !== 0) {
      moveBy(state.vel * dt);
      state.vel *= Math.pow(0.93, dt);
      if (Math.abs(state.vel) < 0.02) state.vel = 0;
    }
    const i = Math.round(state.pos);
    if (i !== state.shown) {
      state.shown = i;
      state.dirty = true;
      onFrameChange(i);
    }
    maybeLoadHighRes(now);
  }

  if (state.panTarget !== null) {
    state.pan += (state.panTarget - state.pan) * Math.min(1, 0.2 * dt);
    if (Math.abs(state.panTarget - state.pan) < 0.005) { state.pan = state.panTarget; state.panTarget = null; }
    state.dirty = true;
  }

  if (state.dirty && state.loader && state.view === 'walk') {
    state.dirty = false;
    draw();
  }
  if (busy(now)) requestAnimationFrame(tick);
  else ticking = false;
}

function moveBy(frames) {
  const n = state.way.nbStills;
  const before = state.pos;
  state.pos = Math.max(0, Math.min(n - 1, state.pos + frames));
  if (state.pos === before && frames !== 0) state.vel = 0;
  if (frames) state.dir = frames > 0 ? 1 : -1;
  state.walked += state.pos - before;
  state.lastMove = performance.now();
}

// ---------- desktop: page scroll drives the walk ----------
// Same rules as the 2015 site (views/streetwalk.js): the page is
// wayLength × 100 px tall, the walk eases a tenth of the way to the scroll
// position each frame, and the still is scrollTop / (height − viewport) × nbStills.

const PX_PER_METRE = 100;

function sizeScrollSpace() {
  const h = Math.max(window.innerHeight + 1, Math.round(state.length * PX_PER_METRE));
  el.scrollSpace.style.height = h + 'px';
  state.scrollRange = h - window.innerHeight;
}

function resetScroll() {
  sizeScrollSpace();
  el.scroller.scrollTop = 0;
  state.scrollTarget = state.scrollCur = 0;
}

function followScroll(dt) {
  const diff = state.scrollTarget - state.scrollCur;
  if (diff === 0) return;
  state.scrollCur += diff * (1 - Math.pow(0.9, dt));
  if (Math.abs(state.scrollTarget - state.scrollCur) < 0.5) state.scrollCur = state.scrollTarget;
  const n = state.way.nbStills;
  const target = Math.min(n - 1, state.scrollCur / Math.max(1, state.scrollRange) * n);
  moveBy(target - state.pos);
}

function setupScroll() {
  el.scroller.addEventListener('scroll', () => {
    if (!state.desktop) return;
    state.scrollTarget = el.scroller.scrollTop;
  }, { passive: true });
  // Arrow keys step 50 px, like the 2015 site.
  el.scroller.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      el.scroller.scrollTop += e.key === 'ArrowDown' ? 50 : -50;
    }
  });
}

// ---------- touch ----------

function setupGestures() {
  let start = null;
  let last = null;
  let axis = null;
  const samples = [];

  el.stage.addEventListener('pointerdown', (e) => {
    if (!state.loader || !state.loader.ready) return;
    el.stage.setPointerCapture(e.pointerId);
    start = last = { x: e.clientX, y: e.clientY };
    axis = null;
    state.vel = 0;
    state.dragging = true;
    samples.length = 0;
  });

  el.stage.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if (!axis) {
      const tx = e.clientX - start.x;
      const ty = e.clientY - start.y;
      if (Math.hypot(tx, ty) < 8) return;
      axis = Math.abs(ty) >= Math.abs(tx) ? 'y' : 'x';
    }
    last = { x: e.clientX, y: e.clientY };
    if (axis === 'y') {
      const f = -dy * framesPerPx();
      moveBy(f);
      samples.push({ t: e.timeStamp, f });
      while (samples.length && e.timeStamp - samples[0].t > 100) samples.shift();
    } else {
      const r = state.rect;
      const slack = r ? r.w - window.innerWidth : 0;
      if (slack > 1) {
        state.panTarget = null;
        state.pan = Math.max(-1, Math.min(1, state.pan - dx / (slack / 2)));
        state.dirty = true;
      }
    }
  });

  const end = () => {
    if (!start) return;
    if (axis === 'y' && samples.length > 1) {
      const span = samples[samples.length - 1].t - samples[0].t || 16;
      const total = samples.reduce((s, x) => s + x.f, 0);
      state.vel = Math.max(-6, Math.min(6, total / span * 16.67));
    }
    start = null;
    state.dragging = false;
  };
  el.stage.addEventListener('pointerup', end);
  el.stage.addEventListener('pointercancel', end);

  // Tablets with a trackpad or mouse wheel.
  el.stage.addEventListener('wheel', (e) => {
    if (!state.loader || !state.loader.ready) return;
    e.preventDefault();
    moveBy(e.deltaY * framesPerPx() * 0.5);
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (state.desktop || state.view !== 'walk' || !state.loader || !state.loader.ready) return;
    if (e.key === 'ArrowUp') state.vel = 1.5;
    if (e.key === 'ArrowDown') state.vel = -1.5;
    if (e.key === 'ArrowLeft') { state.pan = Math.max(-1, state.pan - 0.2); state.dirty = true; }
    if (e.key === 'ArrowRight') { state.pan = Math.min(1, state.pan + 0.2); state.dirty = true; }
  });
}

// Pan so the vendor of this street sits in the middle of the screen.
function turnTowardsVendor() {
  const r = state.rect;
  const at = state.way.characterPosition[Math.round(state.pos)];
  const slack = r.w - window.innerWidth;
  if (!at || slack <= 1) return;
  const target = (at.left / 100 * r.w - slack / 2 - window.innerWidth / 2) * 2 / slack;
  state.panTarget = Math.max(-1, Math.min(1, target));
}

// One screen-height swipe walks about 45 stills (a few metres).
function framesPerPx() {
  return 45 / window.innerHeight;
}

// ---------- stories ----------

export function openStory(character) {
  const video = stories.storyFor(character, state.way.wayName);
  playVideo(stories.videoUrl(character, video), stories.subtitlesUrl(character, video, state.lang));
  updateFound();
  emit('story', { character, video });
}

// Replays a story already found (desktop characters menu).
export function replayStory(character, video) {
  playVideo(stories.videoUrl(character, video), stories.subtitlesUrl(character, video, state.lang));
}

export function playVideo(src, subs) {
  const v = el.videoEl;
  v.innerHTML = '';
  v.src = src;
  if (subs) {
    const tr = document.createElement('track');
    tr.kind = 'captions'; tr.srclang = state.lang; tr.src = subs; tr.default = true;
    v.appendChild(tr);
  }
  el.video.hidden = false;
  sound.setPaused(true);
  v.play().catch(() => {});
  emit('video', { open: true });
}

function closeVideo() {
  el.videoEl.pause();
  el.videoEl.removeAttribute('src');
  el.videoEl.load();
  el.video.hidden = true;
  sound.setPaused(state.view !== 'walk');
  emit('video', { open: false });
  if (state.desktop && state.view === 'walk') el.scroller.focus({ preventScroll: true });
}

function updateFound() {
  emit('found', { count: stories.storiesFound(), total: stories.TOTAL_STORIES });
}

export function setMuted(muted) {
  sound.setMuted(muted);
  emit('muted', { muted });
}

export function isMuted() {
  return sound.muted;
}

// ---------- boot ----------

async function boot() {
  const ways = await (await fetch('content/ways.json')).json();
  state.waysList = ways;
  ways.forEach((w) => { state.ways[w.wayName] = w; });

  resize();
  window.addEventListener('resize', resize);
  desktopQuery.addEventListener('change', resize);
  setupGestures();
  setupScroll();
  hud.init({ state, ways, stories, openStory, replayStory, chooseWay, setMuted, isMuted, go, walkHash, UI_TEXT, playVideo });
  wake();

  el.startBtn.addEventListener('click', () => {
    unlockSound();
    el.start.hidden = true;
    el.hint.hidden = false;
    if (state.desktop) el.scroller.focus({ preventScroll: true });
  });

  // The sign moves every frame, so act on a clean pointer tap rather than
  // relying on the browser's click synthesis (missed taps right after a swipe).
  let signDown = null;
  el.sign.addEventListener('pointerdown', (e) => { signDown = { x: e.clientX, y: e.clientY }; });
  el.sign.addEventListener('pointerup', (e) => {
    if (signDown && Math.hypot(e.clientX - signDown.x, e.clientY - signDown.y) < 12) activateSign();
    signDown = null;
  });
  el.sign.addEventListener('click', (e) => { if (e.detail === 0) activateSign(); }); // keyboard
  function activateSign() {
    if (el.sign.dataset.edge) {
      // First tap on an edge-pinned sign turns to face the vendor.
      turnTowardsVendor();
      return;
    }
    openStory(state.way.characterDefinition.name);
  }

  el.videoClose.addEventListener('click', closeVideo);
  el.videoEl.addEventListener('ended', closeVideo);
  on('play-video', ({ src, subs }) => playVideo(src, subs));
  on('set-muted', ({ muted }) => setMuted(muted));
  on('set-lang', ({ lang }) => {
    const r = parseRoute(location.hash);
    // Language lives in the URL: rewrite it, keeping the current screen.
    if (r.view === 'walk') setLang(lang);
    else if (r.view === 'page') go(`#page/${r.name}/${lang}`);
    else go(`#index/${lang}`);
  });

  window.addEventListener('hashchange', route);
  updateFound();
  await route();
}

boot();
