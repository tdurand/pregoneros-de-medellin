// Pregoneros de Medellín, mobile walk.
// Swipe up/down to walk the street, sideways to look around the wide GoPro
// frame, tap a vendor's sign to watch their story, pick a direction at corners.

import { framePositions, bearing, distance } from './geo.js';
import { FrameLoader, connectionIsConstrained } from './frames.js';
import { Soundscape } from './audio.js';
import { MiniMap } from './minimap.js';
import * as stories from './stories.js';

const params = new URLSearchParams(location.search);
// Where stills, sounds live. Overridable for local testing: ?assets=http://...
const ASSETS = (params.get('assets') || 'https://images.pregonerosdemedellin.com').replace(/\/$/, '');
const FIRST_WAY = 'plazabotero-start-carabobo';
const LANGS = ['es', 'en', 'fr'];

const UI_TEXT = {
  es: {
    start: 'Empezar a caminar', headphones: 'Mejor con audífonos',
    swipe: 'Desliza hacia arriba para caminar', look: 'Desliza a los lados para mirar alrededor',
    tapSign: 'Toca el letrero para ver su historia', choose: '¿Por dónde seguimos?',
    trailer: 'Ver el tráiler', close: 'Cerrar', map: 'Mapa', sound: 'Sonido', menu: 'Menú',
    language: 'Idioma', desktop: 'La experiencia completa, con mapa y editor de sonido, está en computador.',
    dirs: { forward: 'Adelante', 'forward-left': 'Adelante a la izquierda', 'forward-right': 'Adelante a la derecha', left: 'Izquierda', right: 'Derecha', backward: 'Atrás', 'backward-left': 'Atrás a la izquierda', 'backward-right': 'Atrás a la derecha' },
  },
  en: {
    start: 'Start walking', headphones: 'Best with headphones',
    swipe: 'Swipe up to walk', look: 'Swipe sideways to look around',
    tapSign: 'Tap the sign to watch their story', choose: 'Which way now?',
    trailer: 'Watch the trailer', close: 'Close', map: 'Map', sound: 'Sound', menu: 'Menu',
    language: 'Language', desktop: 'The full experience, with the map and sound editor, is on desktop.',
    dirs: { forward: 'Straight on', 'forward-left': 'Ahead left', 'forward-right': 'Ahead right', left: 'Left', right: 'Right', backward: 'Back', 'backward-left': 'Back left', 'backward-right': 'Back right' },
  },
  fr: {
    start: 'Commencer la balade', headphones: 'Mieux avec un casque',
    swipe: 'Glissez vers le haut pour marcher', look: 'Glissez sur les côtés pour regarder autour',
    tapSign: "Touchez le panneau pour voir son histoire", choose: 'Par où continuer ?',
    trailer: 'Voir la bande-annonce', close: 'Fermer', map: 'Carte', sound: 'Son', menu: 'Menu',
    language: 'Langue', desktop: "L'expérience complète, avec la carte et l'éditeur de sons, est sur ordinateur.",
    dirs: { forward: 'Tout droit', 'forward-left': 'Devant à gauche', 'forward-right': 'Devant à droite', left: 'Gauche', right: 'Droite', backward: 'Demi-tour', 'backward-left': 'Derrière à gauche', 'backward-right': 'Derrière à droite' },
  },
};

const DIR_ANGLE = { forward: 0, 'forward-right': 45, right: 90, 'backward-right': 135, backward: 180, 'backward-left': 225, left: 270, 'forward-left': 315 };

const $ = (s) => document.querySelector(s);
const el = {
  app: $('#app'), canvas: $('#frame'), stage: $('#stage'),
  start: $('#start'), startBtn: $('#start-btn'),
  loading: $('#loading'), loadingBar: $('#loading-bar'),
  area: $('#area'), found: $('#found'),
  sign: $('#sign'), hint: $('#hint'), chooser: $('#chooser'),
  mapBtn: $('#map-btn'), map: $('#map'), soundBtn: $('#sound-btn'),
  menuBtn: $('#menu-btn'), menu: $('#menu'),
  video: $('#video'), videoEl: $('#video video'), videoClose: $('#video-close'),
};
const ctx = el.canvas.getContext('2d', { alpha: false });

const state = {
  ways: {}, way: null, positions: [], loader: null,
  pos: 0, vel: 0, pan: 0, shown: -1, hiImg: null, hiIndex: -1,
  lastMove: 0, dirty: true, lang: 'es', str: {}, walked: 0,
  lastSoundPos: null, dir: 1, panTarget: null,
};
const sound = new Soundscape(ASSETS);
let minimap;
if (params.has('debug')) window.__walk = state;

// ---------- language ----------

function pickLang() {
  const fromHash = location.hash.split('/')[1];
  if (LANGS.includes(fromHash)) return fromHash;
  const nav = (navigator.language || 'es').slice(0, 2);
  return LANGS.includes(nav) ? nav : 'es';
}

async function setLang(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  try {
    state.str = await (await fetch(`../content/content/string_${lang}.json`)).json();
  } catch (e) { state.str = {}; }
  const t = UI_TEXT[lang];
  document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = t[n.dataset.t] || ''; });
  document.querySelectorAll('[data-s]').forEach((n) => { n.textContent = state.str[n.dataset.s] || n.textContent; });
  document.querySelectorAll('[data-aria]').forEach((n) => n.setAttribute('aria-label', t[n.dataset.aria]));
  document.querySelectorAll('[data-lang]').forEach((n) => n.setAttribute('aria-pressed', n.dataset.lang === lang));
  if (state.way) { updateHash(); renderChooser(state.chooserFor); }
}

// ---------- streets ----------

function updateHash() {
  history.replaceState(null, '', `#${state.way.wayName}/${state.lang}`);
}

function loadWay(name) {
  const way = state.ways[name] || state.ways[FIRST_WAY];
  if (state.loader) state.loader.stop();

  state.way = way;
  state.positions = framePositions(way.wayPath, way.nbStills, way.wayPathSyncPoints);
  state.pos = 0; state.vel = 0; state.pan = 0; state.panTarget = null; state.shown = -1;
  state.hiImg = null; state.hiIndex = -1; state.chooserFor = null;
  state.lastSoundPos = null; state.leftStart = false;
  el.chooser.hidden = true;
  el.sign.hidden = true;
  el.area.textContent = way.wayArea;
  updateHash();
  stories.rememberStreet(way.wayName);
  sound.setWay(way.waySounds);
  if (minimap) {
    minimap.setWay(way.wayName, []);
    minimap.setPosition(state.positions[0]);
  }
  if (way.characterDefinition) loadSign(way.characterDefinition.name);

  el.loading.hidden = false;
  el.loadingBar.style.transform = 'scaleX(0)';
  state.loader = new FrameLoader({
    base: ASSETS,
    way: way.wayName,
    count: way.nbStills,
    concurrency: connectionIsConstrained() ? 4 : 6,
    onProgress: (p) => {
      el.loadingBar.style.transform = `scaleX(${p})`;
      if (state.shown < 0 && state.loader.frames[0]) state.dirty = true;
    },
    onReady: () => {
      el.loading.hidden = true;
      state.dirty = true;
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

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  el.canvas.width = Math.round(w * dpr);
  el.canvas.height = Math.round(h * dpr);
  el.canvas.style.width = w + 'px';
  el.canvas.style.height = h + 'px';
  state.dpr = dpr;
  state.dirty = true;
}

// Where the still lands on screen: cover the viewport, then shift by `pan`
// (-1 = left edge of the frame, 1 = right edge). In portrait most of the
// 16:9 frame is off-screen, which is what sideways swipes reveal.
function drawRect(img) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const iw = img.naturalWidth || 16;
  const ih = img.naturalHeight || 9;
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
  if (!c || !at || i < c.startFrame || i > c.endFrame || !el.chooser.hidden) {
    el.sign.hidden = true;
    return;
  }
  const r = state.rect;
  const t = (i - c.startFrame) / Math.max(1, c.endFrame - c.startFrame);
  const widthPct = c.framestartWidth + t * (c.framefullWidth - c.framestartWidth);
  const width = Math.max(72, widthPct * r.h / 100);
  let x = r.x + at.left / 100 * r.w;
  const y = r.y + at.top / 100 * r.h;
  const W = window.innerWidth;
  // In portrait the vendor can be outside the visible slice: pin the sign to
  // the edge so it stays findable, and let a tap pan towards it.
  const edge = x < width / 2 ? 'left' : x > W - width / 2 ? 'right' : '';
  x = Math.min(Math.max(x, width / 2), W - width / 2);
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
  if (!state.lastSoundPos || distance(state.lastSoundPos, here) > 1.5) {
    sound.update(here, heading);
    state.lastSoundPos = here;
  }
  if (minimap) minimap.setPosition(here);

  // The "start" chooser only appears when walking back to the beginning, not
  // on arrival, so a new street opens on the view rather than on a menu.
  if (i > 5) state.leftStart = true;
  const want = i >= n - 1 ? 'end' : i <= 0 && state.leftStart && state.way.wayConnectionsStart ? 'start' : null;
  if (want !== state.chooserFor) renderChooser(want);

  if (!el.hint.hidden && Math.abs(state.walked) > 12) el.hint.hidden = true;
}

function renderChooser(which) {
  state.chooserFor = which;
  const list = which === 'end' ? state.way.wayConnectionsEnd : which === 'start' ? state.way.wayConnectionsStart : null;
  if (!list || !list.length) {
    el.chooser.hidden = true;
    if (minimap) minimap.setWay(state.way.wayName, []);
    return;
  }
  const t = UI_TEXT[state.lang];
  el.chooser.querySelector('.chooser-title').textContent = t.choose;
  const box = el.chooser.querySelector('.chooser-options');
  box.innerHTML = '';
  list.filter((c) => state.ways[c.name]).forEach((c) => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.innerHTML = `<span class="arrow" style="transform:rotate(${DIR_ANGLE[c.direction] || 0}deg)">↑</span><span></span>`;
    b.lastChild.textContent = t.dirs[c.direction] || c.direction;
    b.addEventListener('click', () => loadWay(c.name));
    box.appendChild(b);
  });
  el.chooser.hidden = false;
  if (minimap) minimap.setWay(state.way.wayName, list.map((c) => c.name));
}

function maybeLoadHighRes(now) {
  const i = Math.round(state.pos);
  if (state.vel !== 0 || now - state.lastMove < 250 || state.hiIndex === i || state.hiPending === i) return;
  if (connectionIsConstrained()) return;
  state.hiPending = i;
  state.loader.loadHighRes(i).then((img) => {
    state.hiPending = -1;
    if (img && Math.round(state.pos) === i) {
      state.hiImg = img;
      state.hiIndex = i;
      state.dirty = true;
    }
  });
}

let lastT = performance.now();
function tick(now) {
  const dt = Math.min(50, now - lastT) / 16.67;
  lastT = now;

  if (state.way && state.loader && state.loader.ready) {
    if (!state.dragging && state.vel !== 0) {
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

  if (state.dirty && state.loader) {
    state.dirty = false;
    draw();
  }
  requestAnimationFrame(tick);
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

  // Desktop / trackpad testing.
  el.stage.addEventListener('wheel', (e) => {
    if (!state.loader || !state.loader.ready) return;
    e.preventDefault();
    moveBy(e.deltaY * framesPerPx() * 0.5);
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (!state.loader || !state.loader.ready) return;
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

function openStory(character) {
  const video = stories.storyFor(character, state.way.wayName);
  playVideo(stories.videoUrl(character, video), stories.subtitlesUrl(character, video, state.lang));
  updateFound();
}

function playVideo(src, subs) {
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
}

function closeVideo() {
  el.videoEl.pause();
  el.videoEl.removeAttribute('src');
  el.videoEl.load();
  el.video.hidden = true;
  sound.setPaused(false);
}

function updateFound() {
  el.found.textContent = `${stories.storiesFound()}/${stories.TOTAL_STORIES}`;
}

// ---------- boot ----------

async function boot() {
  const ways = await (await fetch('../content/ways.json')).json();
  ways.forEach((w) => { state.ways[w.wayName] = w; });
  minimap = new MiniMap(el.map.querySelector('svg'), ways);

  await setLang(pickLang());
  updateFound();
  resize();
  window.addEventListener('resize', resize);
  setupGestures();
  requestAnimationFrame(tick);

  const hashWay = decodeURIComponent(location.hash.slice(1).split('/')[0] || '');
  const firstWay = state.ways[hashWay] ? hashWay : stories.lastStreet() || FIRST_WAY;
  // Start fetching stills while the start screen is up.
  loadWay(firstWay);

  el.startBtn.addEventListener('click', () => {
    sound.unlock();
    sound.setWay(state.way.waySounds);
    state.lastSoundPos = null;
    if (state.loader.ready) onFrameChange(Math.round(state.pos));
    el.start.hidden = true;
    el.hint.hidden = false;
  });

  el.sign.addEventListener('click', () => {
    if (el.sign.dataset.edge) {
      // First tap on an edge-pinned sign turns to face the vendor.
      turnTowardsVendor();
      return;
    }
    openStory(state.way.characterDefinition.name);
  });

  el.soundBtn.addEventListener('click', () => {
    const muted = !sound.muted;
    sound.setMuted(muted);
    el.soundBtn.setAttribute('aria-pressed', String(muted));
  });
  el.mapBtn.addEventListener('click', () => { el.map.hidden = !el.map.hidden; });
  el.map.addEventListener('click', () => { el.map.hidden = true; });
  el.menuBtn.addEventListener('click', () => { el.menu.hidden = !el.menu.hidden; });
  el.menu.querySelector('.menu-close').addEventListener('click', () => { el.menu.hidden = true; });
  el.menu.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  el.menu.querySelector('.menu-trailer').addEventListener('click', () => {
    el.menu.hidden = true;
    playVideo('https://images.pregonerosdemedellin.com/video/mobile.mp4', `../content/subtitles/jale/mobilebonus/${state.lang}.vtt`);
  });
  el.videoClose.addEventListener('click', closeVideo);
  el.videoEl.addEventListener('ended', closeVideo);

  window.addEventListener('hashchange', () => {
    const name = decodeURIComponent(location.hash.slice(1).split('/')[0]);
    if (state.ways[name] && name !== state.way.wayName) loadWay(name);
  });
}

boot();
