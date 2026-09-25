// The 2015 street furniture: signs, vendor sign, junction arrows, bottom bar
// (map, menu, characters, sound, fullscreen) and loading screen, drawn from
// the original templates so style/css/main.css styles them as in 2015.
// Desktop and touch share it; css/hud.css fits it to phones, where the
// engine's own vendor sign (#sign) replaces the 2015 one so it can stay
// pinned on screen in portrait.
//
// What keeps scrolling smooth (the 2015 view re-rendered templates on every
// still): templates render only when their data changes (language, street,
// junction, progress); per-still work is a transform, a class or an attribute.

import { on, emit } from './bus.js';
import { render } from './tpl.js';
import { MiniMap } from './minimap.js';
import { framePositions } from './geo.js';

const VIDEOS = ['video1', 'video2', 'video3'];
const NOT_MOVING_DELAY = 1100; // 2015: high-res after 100 ms, then "not moving" 1 s later
const TUTORIAL_FRAMES = 30; // 2015: the "scroll the page" tutorial stops at still 30

// The chooser template calls _.find(list, {direction: 'x'}, 'name'). tpl.js
// only takes function predicates; templates run inside `with (data)`, so a
// `_` passed in the data wins over tpl.js's own helper.
const LODASH = {
  find: (list, pred) => (list || []).find(typeof pred === 'function'
    ? pred : (o) => Object.keys(pred).every((k) => o[k] === pred[k])),
};

const SKELETON = `
<div class="streetwalk-tutorial-wrapper" hidden>
  <div class="streetwalk-tutorial-scrollotherside-tooltip"></div>
  <div class="streetwalk-tutorial"></div>
</div>
<div class="streetwalk-chooseway-wrapper" hidden></div>
<div class="streetwalk-bottombar">
  <div class="streetwalk-map">
    <div class="streetwalk-mapcontainer"><svg class="hud-minimap" aria-hidden="true"></svg></div>
    <div class="streetwalk-btnmenu-wrapper"><button class="streetwalk-btnmenu" type="button"></button></div>
    <div class="streetwalk-map-btnfullscreen" role="button"></div>
  </div>
  <div class="streetwalk-menucharacters"></div>
  <div class="streetwalk-bottombar-separator"></div>
  <div class="streetwalk-control">
    <div class="toggle-sounds" role="button" data-state="normal"></div>
    <div class="toggle-fullscreen" role="button" data-state="normal"></div>
  </div>
</div>
<div class="streetwalk-menubottom"></div>
<div class="streetwalk-textcharacter" hidden>
  <div class="img-container character-sign"></div>
  <div class="mask-character character-sign"></div>
</div>
<div class="streetwalk-area streetwalk-sign"></div>
<div class="streetwalk-progress streetwalk-sign"></div>
<div class="streetwalk-loading" hidden></div>
<div class="hud-callout" hidden>
  <p class="hud-callout-title"></p>
  <p class="hud-callout-text"></p>
  <p class="hud-callout-actions"><button type="button" class="hud-callout-go"></button> <button type="button" class="hud-callout-close"></button></p>
</div>`;

let ctx;
let root;
let scroller;
let el = {};
let built = false;
let minimap = null;

// Remembered so a rebuild (after Home) redraws everything.
let chooser = { which: null, list: [] };
let lastSign = { visible: false };
let loading = null; // { way, full, ... } while a street loads
let lastProgress = 0;
let firstLoad = true; // 2015 shows the full loading page once per visit (and after Home)
let tutorialWay = null; // the visit's first street gets the "scroll the page" tutorial
let videoOpen = false;
let countPending = false;
let notMoving = false;
let notMovingTimer = 0;
let chooserTimer = 0;
let signName = null;
let signBase = 0;
let mapBig = false;
let mapFramed = null;
let mapBox = null;
let mapIcons = [];
let menuOpen = false;
let charOpen = false;
let callout = null;

// ---------- setup ----------

export function init(c) {
  ctx = c;
  root = document.getElementById('hud');
  scroller = document.getElementById('scroller');
  if (!root) return;

  on('layout', () => { if (built) { placeSign(lastSign); updateTutorial(Math.round(ctx.state.pos), 1); } });
  on('lang', () => { if (built) renderText(); });
  on('way', ({ way }) => {
    chooser = { which: null, list: [] };
    lastSign = { visible: false };
    loading = { way: way.wayName, full: firstLoad };
    firstLoad = false;
    if (!tutorialWay) tutorialWay = way.wayName;
    if (built) applyWay();
  });
  on('loading', ({ progress }) => { if (built) updateLoading(progress); });
  on('ready', () => { loading = null; if (built) hideLoading(); });
  on('frame', onFrame);
  on('sign', (s) => { lastSign = s; if (built) placeSign(s); });
  on('chooser', (c2) => { chooser = c2; if (built) renderChooser(); });
  on('found', () => {
    // 2015 updates the counter once the story's video is closed.
    if (videoOpen) countPending = true;
    else if (built) updateCount();
  });
  on('story', ({ character }) => { if (built) { renderCharacter(character); updateMapIcons(); } });
  on('muted', ({ muted }) => { if (built) el.sound.dataset.state = muted ? 'muted' : 'normal'; });
  on('video', ({ open }) => {
    videoOpen = open;
    if (!open && built) {
      if (countPending) { countPending = false; updateCount(); }
      focusWalk();
    }
  });
  on('view', () => { if (built) { closeMenus(); hideCallout(); } });
  document.addEventListener('fullscreenchange', () => {
    if (built) el.fullscreen.dataset.state = document.fullscreenElement ? 'fullscreen' : 'normal';
  });

  // The HUD sits above the scroller: hand the wheel over so the street keeps
  // walking wherever the pointer is (bottom bar, signs, junction arrows).
  // Not passive: Chrome sometimes also scrolls the scroller natively under
  // SVG (the map), which would walk twice as far.
  root.addEventListener('wheel', (e) => {
    if (!built || e.ctrlKey) return;
    e.preventDefault();
    if (!e.deltaY || loading) return;
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    scroller.scrollTop += e.deltaY * k;
  }, { passive: false });
  root.addEventListener('click', onClick);
  root.addEventListener('mouseover', (e) => highlightWay(e, true));
  root.addEventListener('mouseout', (e) => highlightWay(e, false));
  root.addEventListener('change', (e) => {
    if (e.target.matches('.language-selection')) {
      emit('set-lang', { lang: e.target.value });
      focusWalk();
    }
  });

  build();
}

function build() {
  built = true;
  root.innerHTML = SKELETON;
  const $ = (s) => root.querySelector(s);
  el = {
    tutorialWrap: $('.streetwalk-tutorial-wrapper'),
    tutorial: $('.streetwalk-tutorial'),
    otherWay: $('.streetwalk-tutorial-scrollotherside-tooltip'),
    chooser: $('.streetwalk-chooseway-wrapper'),
    map: $('.streetwalk-map'),
    mapSvg: $('.hud-minimap'),
    menuBtn: $('.streetwalk-btnmenu'),
    characters: $('.streetwalk-menucharacters'),
    sound: $('.toggle-sounds'),
    fullscreen: $('.toggle-fullscreen'),
    menu: $('.streetwalk-menubottom'),
    sign: $('.streetwalk-textcharacter'),
    signImg: $('.streetwalk-textcharacter .img-container'),
    area: $('.streetwalk-area'),
    progress: $('.streetwalk-progress'),
    loading: $('.streetwalk-loading'),
    callout: $('.hud-callout'),
  };
  signName = null; signBase = 0; mapBig = false; menuOpen = false; charOpen = false;
  mapFramed = null; mapBox = null; callout = null;
  el.sound.dataset.state = ctx.isMuted() ? 'muted' : 'normal';
  el.fullscreen.dataset.state = document.fullscreenElement ? 'fullscreen' : 'normal';
  el.fullscreen.hidden = !document.fullscreenEnabled; // iPhone Safari

  minimap = new MiniMap(el.mapSvg, ctx.ways);
  addMapIcons();

  // Bars and signs slide in while the walk rests, as in 2015 (body.not-moving).
  setNotMoving(true);
  renderCharacters();
  renderText();
  if (ctx.state.way) applyWay();
}

// Renders a template into a node, dropping results that arrive after the
// data changed again (street or language moved on) or the HUD went away.
const tokens = {};
async function paint(slot, node, path, data) {
  const t = tokens[slot] = (tokens[slot] || 0) + 1;
  let html;
  try {
    html = await render(path, data);
  } catch (e) {
    console.warn(e);
    return false;
  }
  if (tokens[slot] !== t || !node.isConnected) return false;
  node.innerHTML = html;
  return true;
}

const strLoaded = () => ctx.state.str && ctx.state.str.loaded;

// ---------- street and language ----------

// Everything that depends on the street: area sign, vendor sign art, map, tutorial.
function applyWay() {
  const way = ctx.state.way;
  hideChooser(true);
  hideCallout();
  el.sign.hidden = true;
  renderArea();
  const def = way.characterDefinition;
  if (def && def.name !== signName) {
    signName = def.name;
    signBase = 0;
    el.signImg.innerHTML = '';
    paint('sign', el.signImg, `svg/svgFrame${cap(def.name)}Template`, {});
  }
  setMapWay([]);
  const here = ctx.state.positions[Math.round(ctx.state.pos)];
  if (here) minimap.setPosition(here);
  updateTutorial(Math.round(ctx.state.pos), 1);
  if (loading) updateLoading(lastProgress);
  if (lastSign.visible) placeSign(lastSign);
  if (chooser.which) renderChooser();
}

// Pieces that carry text: re-rendered on language change only.
function renderText() {
  const s = ctx.state;
  if (!strLoaded()) return;
  el.menuBtn.textContent = s.str.streetWalkBtnMenuLabel || 'MENU';
  updateCount();
  if (s.way) renderArea();
  paint('menu', el.menu, 'streetwalk/menu/menuStreetWalkViewTemplate', { STR: s.str, lang: s.lang });
  renderTutorial();
  if (loading && !el.loading.hidden) { el.loading.dataset.way = ''; updateLoading(lastProgress); }
  if (chooser.which) renderChooser();
  hideCallout();
}

function renderArea() {
  const s = ctx.state;
  if (!strLoaded() || !s.way) return;
  paint('area', el.area, 'svg/svgSignTopAreaTemplate', {
    area: s.way.wayArea,
    fontSizeArea: s.way.wayArea === 'PARQUE DE LAS LUCES' ? 37 : 45.688,
    STR: s.str,
  });
}

function renderTutorial() {
  const s = ctx.state;
  if (!strLoaded() || el.tutorialWrap.hidden) return;
  paint('tutorial', el.tutorial, 'svg/svgScrollToStart', { lang: s.lang });
  paint('otherway', el.otherWay, 'svg/svgScrollOtherWay', { lang: s.lang });
}

function unlocked() {
  return ctx.stories.unlockedStories ? ctx.stories.unlockedStories() : {};
}

// Stories found, without Pajarito's bonus: the 2015 sign reads "N DE 15".
function foundCount() {
  const u = unlocked();
  return Object.keys(ctx.stories.CHARACTERS).reduce((n, c) => n + VIDEOS.filter((v) => u[c] && u[c][v]).length, 0);
}

function updateCount() {
  const s = ctx.state;
  if (!strLoaded()) return;
  paint('progress', el.progress, 'svg/svgSignTopProgressTemplate', { nbItemUnlocked: foundCount(), lang: s.lang, STR: s.str });
}

const cap = (name) => name[0].toUpperCase() + name.slice(1);

// ---------- walking ----------

function onFrame({ i, dir }) {
  if (!built) return;
  // 2015 closes the menus as soon as the walk moves.
  if (menuOpen || charOpen) closeMenus();
  if (callout) hideCallout();
  if (notMoving) setNotMoving(false);
  clearTimeout(notMovingTimer);
  notMovingTimer = setTimeout(() => setNotMoving(true), NOT_MOVING_DELAY);
  const here = ctx.state.positions[i];
  if (here) minimap.setPosition(here);
  updateTutorial(i, dir);
}

function setNotMoving(v) {
  notMoving = v;
  document.body.classList.toggle('not-moving', v);
}

// "Scroll the page" on the visit's first street until still 30, and the
// "Oops! other way" tooltip when walking back into its beginning.
function updateTutorial(i, dir) {
  const way = ctx.state.way;
  const show = !!way && way.wayName === tutorialWay && i < TUTORIAL_FRAMES;
  if (el.tutorialWrap.hidden === show) {
    el.tutorialWrap.hidden = !show;
    if (show && !el.tutorial.firstChild) renderTutorial();
  }
  const otherWay = show && i === 0 && dir < 0 && !chooser.which;
  if (otherWay !== el.otherWay.classList.contains('hud-show')) {
    el.otherWay.classList.toggle('hud-show', otherWay);
    el.tutorial.classList.toggle('hud-hide', otherWay);
  }
}

// The vendor's hanging sign. Only transforms change per still: the art is
// laid out once at its full width and scaled down while approaching, which
// is 2015's width interpolation (framestartWidth → framefullWidth, in % of
// the image height), anchored at its bottom centre like 2015's
// translate(-50%, -100% + offsetTopCenter).
function placeSign(s) {
  if (!ctx.state.desktop || !s.visible || !signName || s.character !== signName) {
    if (!el.sign.hidden) el.sign.hidden = true;
    return;
  }
  const def = s.def;
  const base = def.framefullWidth * s.rect.h / 100;
  if (Math.abs(base - signBase) > 0.5) {
    signBase = base;
    el.signImg.style.width = base.toFixed(1) + 'px';
  }
  const width = s.widthPct * s.rect.h / 100;
  el.sign.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
  el.signImg.style.transform = `scale(${(width / signBase).toFixed(4)}) translate(-50%, ${-100 + (def.offsetTopCenter || 0)}%)`;
  if (el.sign.hidden) el.sign.hidden = false;
}

// ---------- junctions ----------

async function renderChooser() {
  const c = chooser;
  if (!c.which) { hideChooser(); return; }
  closeMenus();
  const ok = await paint('chooser', el.chooser, 'streetwalk/streetWalkChoosePathViewTemplate', {
    wayConnections: c.list, lang: ctx.state.lang, _: LODASH,
  });
  if (!ok || chooser !== c) return;
  clearTimeout(chooserTimer);
  el.chooser.classList.remove('hud-out');
  el.chooser.hidden = false;
  updateTutorial(Math.round(ctx.state.pos), 1);
  setMapWay(c.list.map((w) => w.name));
}

function hideChooser(now) {
  tokens.chooser = (tokens.chooser || 0) + 1;
  clearTimeout(chooserTimer);
  clearHighlight();
  if (ctx.state.way && minimap) setMapWay([]);
  if (el.chooser.hidden) return;
  if (now) { el.chooser.hidden = true; return; }
  // 2015 shrinks the arrows away in 0.3 s.
  el.chooser.classList.add('hud-out');
  chooserTimer = setTimeout(() => { el.chooser.hidden = true; el.chooser.classList.remove('hud-out'); }, 300);
}

function linkedWay(a) {
  const href = a.getAttribute('xlink:href') || a.getAttribute('href') || '';
  return href.split('/')[1] || null;
}

function reverseWay(name) {
  const p = name.split('-');
  return p.length === 2 ? `${p[1]}-${p[0]}` : `${p[0]}-${p[2]}-${p[1]}`;
}

// Hovering an arrow lights up that street on the map, as in 2015.
function highlightWay(e, onOff) {
  if (!built) return;
  const a = e.target.closest && e.target.closest('.btn-chooseway');
  if (!a) return;
  const name = linkedWay(a);
  [name, name && reverseWay(name)].forEach((n) => {
    if (minimap.paths[n]) minimap.paths[n].classList.toggle('highlight', onOff);
  });
}

function clearHighlight() {
  if (minimap) Object.values(minimap.paths).forEach((p) => p.classList.remove('highlight'));
}

// ---------- map ----------

function setMapWay(next) {
  minimap.setWay(ctx.state.way.wayName, next);
  if (minimap.framed !== mapFramed) {
    mapFramed = minimap.framed;
    mapBox = el.mapSvg.getAttribute('viewBox').split(' ').map(Number);
    zoomMap();
  }
}

// The enlarged map shows more of the city at the same scale, like 2015's
// Mapbox map, rather than magnifying the same few blocks.
function zoomMap() {
  if (!mapBox) return;
  const [x, y, w, h] = mapBox;
  const k = mapBig ? 2.5 : 1;
  const cx = x + w / 2;
  const cy = y + h / 2;
  el.mapSvg.setAttribute('viewBox', [cx - w * k / 2, cy - h * k / 2, w * k, h * k].map((n) => n.toFixed(0)).join(' '));
}

function toggleMap() {
  mapBig = !mapBig;
  el.map.classList.toggle('enlarged', mapBig);
  zoomMap();
}

// Vendor icons where each vendor stands (one per street pair), greyed until found there.
function addMapIcons() {
  const NS = 'http://www.w3.org/2000/svg';
  const seen = new Set();
  const g = document.createElementNS(NS, 'g');
  mapIcons = [];
  ctx.ways.forEach((way) => {
    const def = way.characterDefinition;
    if (!def || seen.has(reverseWay(way.wayName))) return;
    seen.add(way.wayName);
    const at = framePositions(way.wayPath, way.nbStills, way.wayPathSyncPoints)[Math.min(def.endFrame, way.nbStills - 1)];
    if (!at) return;
    const [x, y] = minimap.project(at);
    const img = document.createElementNS(NS, 'image');
    img.setAttribute('x', (x - 35).toFixed(1));
    img.setAttribute('y', (y - 35).toFixed(1));
    img.setAttribute('width', '70');
    img.setAttribute('height', '70');
    img.setAttribute('class', 'hud-map-icon');
    img.dataset.way = way.wayName;
    img.dataset.character = def.name;
    g.appendChild(img);
    mapIcons.push(img);
  });
  el.mapSvg.insertBefore(g, minimap.dot);
  updateMapIcons();
}

function updateMapIcons() {
  const u = unlocked();
  mapIcons.forEach((img) => {
    const w = img.dataset.way;
    const found = Object.values(u[img.dataset.character] || {}).some((v) => v === w || v === reverseWay(w));
    img.setAttribute('href', `images/map/${img.dataset.character}${found ? '' : '-locked'}.png`);
  });
}

// ---------- characters menu ----------

function characterState(name) {
  const mine = unlocked()[name] || {};
  const st = { character: { locked: !VIDEOS.some((v) => mine[v]) } };
  VIDEOS.forEach((v) => { st[v] = { locked: !mine[v] }; });
  return st;
}

async function renderCharacters() {
  if (!await paint('characters', el.characters, 'streetwalk/menuCharactersViewTemplate', {})) return;
  Object.keys(ctx.stories.CHARACTERS).forEach(renderCharacter);
}

async function renderCharacter(name) {
  const box = el.characters.querySelector(`.streetwalk-menucharacter[data-character="${name}"]`);
  if (!box) return;
  const st = characterState(name);
  if (!await paint('menu-' + name, box, `svg/svgMenu${cap(name)}Template`, { state: st })) return;
  // 2015's updateMenuCharactersStates: drop the lock drawn over what is found.
  Object.keys(st).forEach((k) => {
    if (!st[k].locked) box.querySelectorAll(`.${k}-locked`).forEach((n) => { n.style.display = 'none'; });
  });
}

function toggleCharacter(name) {
  const box = el.characters.querySelector(`.streetwalk-menucharacter[data-character="${name}"]`);
  const open = box && box.dataset.state === 'open';
  closeMenus();
  if (!box || open) return;
  box.dataset.state = 'open';
  charOpen = true;
  const sub = box.querySelector('.submenu');
  if (sub) sub.dataset.state = 'open';
}

function closeMenus() {
  charOpen = false;
  el.characters.querySelectorAll('[data-state="open"]').forEach((n) => { n.dataset.state = 'closed'; });
  if (menuOpen) {
    menuOpen = false;
    root.classList.remove('hud-menu-open');
    el.menu.classList.remove('open');
  }
}

// A locked story: say how to unlock it and offer a street where this vendor
// is still to be found (2015 showed the same hint over the lock).
function showLocker(character, anchor) {
  const u = unlocked()[character] || {};
  const found = new Set(Object.values(u).flatMap((w) => [w, reverseWay(w)]));
  const way = ctx.ways.find((w) => w.characterDefinition && w.characterDefinition.name === character &&
    !found.has(w.wayName) && !/^cl56-/.test(w.wayName));
  showCallout(anchor, 'tutorialDirectUnlockTitle', 'tutorialDirectUnlockDescription', way && way.wayName);
}

function showCallout(anchor, titleKey, textKey, goTo) {
  const str = ctx.state.str;
  const c = el.callout;
  c.querySelector('.hud-callout-title').textContent = str[titleKey] || '';
  c.querySelector('.hud-callout-text').textContent = str[textKey] || '';
  const go = c.querySelector('.hud-callout-go');
  go.textContent = str.tutorialDirectUnlockBtnGoDirectly || 'OK';
  go.hidden = !goTo;
  c.querySelector('.hud-callout-close').textContent = str.tutorialDirectUnlockBtnPreferSearch || '×';
  c.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = c.offsetWidth;
  const left = Math.max(10, Math.min(window.innerWidth - w - 10, r.left + r.width / 2 - w / 2));
  c.style.left = left + 'px';
  c.style.bottom = (window.innerHeight - r.top + 14) + 'px';
  c.style.setProperty('--arrow', (r.left + r.width / 2 - left) + 'px');
  callout = { goTo };
}

function hideCallout() {
  if (el.callout) el.callout.hidden = true;
  callout = null;
}

// ---------- loading ----------

// First visit: the full 2015 loading page (headset, then the cart along its
// line); later streets: the small wheel over the last view.
async function updateLoading(p) {
  lastProgress = p;
  const l = loading;
  if (!l) return;
  if (el.loading.dataset.way !== l.way) {
    el.loading.dataset.way = l.way;
    root.classList.toggle('hud-firstload', l.full);
    el.loading.className = 'streetwalk-loading' + (l.full ? ' hud-full' : '');
    el.loading.hidden = false;
    el.loading.innerHTML = '';
    l.pct = null;
    const path = l.full ? 'streetwalk/streetWalkLoadingViewTemplate' : 'streetwalk/streetWalkLoadingSimpleViewTemplate';
    if (!await paint('loading', el.loading, path, { STR: ctx.state.str || {}, lang: ctx.state.lang })) return;
    if (loading !== l) return;
    l.line = el.loading.querySelector('#loadingLine, .loading-line');
    l.len = l.line ? l.line.getTotalLength() : 0;
    if (l.line) l.line.setAttribute('stroke-dasharray', `${l.len} ${l.len}`);
    l.cart = el.loading.querySelector('#carito');
    l.pct = el.loading.querySelector('.loadingIndicator');
  }
  if (!l.pct) return;
  const pct = Math.min(100, Math.max(1, Math.round(lastProgress * 100)));
  l.pct.textContent = pct;
  if (l.line) l.line.setAttribute('stroke-dashoffset', (l.len - pct * l.len / 100).toFixed(1));
  if (l.cart) l.cart.style.transform = `translateX(${(pct * l.len / 100).toFixed(1)}px)`;
}

function hideLoading() {
  tokens.loading = (tokens.loading || 0) + 1;
  el.loading.hidden = true;
  el.loading.innerHTML = '';
  el.loading.dataset.way = '';
  root.classList.remove('hud-firstload');
}

// ---------- clicks ----------

function onClick(e) {
  if (!built) return;
  const t = e.target;
  const hit = (s) => t.closest(s);
  let keepFocus = false;
  let n;

  if (callout && !hit('.hud-callout')) hideCallout();

  if (hit('.character-sign')) {
    const def = ctx.state.way && ctx.state.way.characterDefinition;
    if (def) ctx.openStory(def.name);
  } else if ((n = hit('.btn-chooseway'))) {
    e.preventDefault();
    const name = linkedWay(n);
    if (name) ctx.chooseWay(name);
  } else if (hit('.streetwalk-btnmenu')) {
    // 2015 lifts the bottom bar by 5% to uncover the menu line.
    menuOpen = !menuOpen;
    root.classList.toggle('hud-menu-open', menuOpen);
    el.menu.classList.toggle('open', menuOpen);
  } else if (hit('.streetwalk-map-btnfullscreen')) {
    toggleMap();
  } else if ((n = hit('.hud-map-icon'))) {
    showCallout(n, 'tutorialShortCutMapTitle', 'tutorialShortCutMapDescription', n.dataset.way);
  } else if (hit('.toggle-sounds')) {
    ctx.setMuted(!ctx.isMuted());
  } else if (hit('.toggle-fullscreen')) {
    toggleFullscreen();
  } else if ((n = hit('.streetwalk-menubottom a[href^="#"]'))) {
    e.preventDefault();
    const page = n.getAttribute('href').slice(1);
    if (page === 'index') firstLoad = true;
    ctx.go(`#${page}/${ctx.state.lang}`);
  } else if (hit('.language-selection')) {
    keepFocus = true; // the select is opening
  } else if (hit('.streetwalk-menucharacters')) {
    onCharactersClick(t);
  } else if (hit('.hud-callout-go')) {
    const to = callout && callout.goTo;
    hideCallout();
    if (to) ctx.chooseWay(to);
  } else if (hit('.hud-callout-close')) {
    hideCallout();
  }
  if (!keepFocus) focusWalk();
}

function onCharactersClick(t) {
  let n;
  if (t.closest('.btn-close')) closeMenus();
  else if ((n = t.closest('.video'))) {
    if (n.dataset.type === 'video') {
      closeMenus();
      ctx.replayStory(n.dataset.character, n.dataset.content);
    } else {
      showLocker(n.dataset.character, n);
    }
  } else if ((n = t.closest('.character'))) {
    toggleCharacter(n.closest('.streetwalk-menucharacter').dataset.character);
  } else {
    // A click on the drawing around the buttons closes the menu (2015's clickOnMenuHack).
    closeMenus();
  }
}

function toggleFullscreen() {
  const d = document;
  const req = d.fullscreenElement
    ? d.exitFullscreen && d.exitFullscreen()
    : d.documentElement.requestFullscreen && d.documentElement.requestFullscreen();
  if (req && req.catch) req.catch(() => {});
}

// Arrow keys walk through the scroller: give it the focus back after a click.
function focusWalk() {
  if (ctx.state.desktop && ctx.state.view === 'walk' && scroller) scroller.focus({ preventScroll: true });
}
