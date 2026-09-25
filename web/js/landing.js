// Landing (#index).
// Desktop: the 2015 landing, rendered from its original templates and styled by
// the 2015 stylesheet (logo bar, green menu, description, ENTRAR, background video).
// Touch: a compact start screen that fits one phone screen, portrait or landscape.

import { render } from './tpl.js';
import { emit, on } from './bus.js';
import * as stories from './stories.js';

const root = document.getElementById('landing');

// Same words as the walk's start button (UI_TEXT in main.js, which we can't import).
const TEXT = {
  es: { start: 'Empezar a caminar', headphones: 'Mejor con audífonos', trailer: 'Ver el tráiler', found: 'historias encontradas' },
  en: { start: 'Start walking', headphones: 'Best with headphones', trailer: 'Watch the trailer', found: 'stories found' },
  fr: { start: 'Commencer la balade', headphones: 'Mieux avec un casque', trailer: 'Voir la bande-annonce', found: 'histoires trouvées' },
};
const LANG_NAMES = { es: 'selectLanguageSpanish', en: 'selectLanguageEnglish', fr: 'selectLanguageFrench' };
const PAGES = [
  ['transmedia', 'menuBtnLabelTransmedia'], ['music', 'menuBtnLabelMusic'], ['team', 'menuBtnLabelCredits'],
  ['makingof', 'menuBtnLabelMakingOf'], ['presskit', 'menuBtnLabelPressKit'],
];
const SITE = 'https://www.pregonerosdemedellin.com';
const TRAILER = 'https://images.pregonerosdemedellin.com/video/mobile.mp4';
const MUSIC_VOLUME = 0.7;

let current = null; // { lang, str, desktop, enter } while the landing is shown
let gen = 0; // bumped by every show/hide: a slower render that lost the race is dropped
let offWindow = []; // window listeners to remove on hide

// ---------- intro music ----------
// 2015 played content/music/intro.mp3 in a loop on the landing. Browsers only
// let it start from a gesture, so it starts on the first click or key press.

let music = null;
let muted = false; // 2015 Sounds.userMuted: kept while the app runs
let fadeTimer = 0;

function startMusic() {
  if (muted || !current || !current.desktop) return;
  if (!music) {
    music = new Audio('content/music/intro.mp3');
    music.loop = true;
  }
  clearInterval(fadeTimer);
  music.volume = MUSIC_VOLUME;
  music.play().catch(() => {});
}

// A short fade rather than a cut when leaving for the walk (2015 faded over 3 s).
// iOS ignores volume, so the pause at the end is what actually stops it.
function stopMusic(fade = 0) {
  clearInterval(fadeTimer);
  if (!music || music.paused) return;
  const a = music;
  if (!fade) { a.pause(); return; }
  const t0 = performance.now();
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / fade);
    a.volume = MUSIC_VOLUME * (1 - k);
    if (k === 1) { clearInterval(fadeTimer); a.pause(); a.volume = MUSIC_VOLUME; }
  }, 40);
}

// The walk's sound button and this toggle are one preference, as in 2015.
on('muted', ({ muted: m }) => { muted = m; syncToggle(); });

function setMuted(m) {
  muted = m;
  if (m) stopMusic(); else startMusic();
  syncToggle();
  // For main.js to mute the walk too (not handled there yet).
  emit('set-muted', { muted: m });
}

function syncToggle() {
  const t = root.querySelector('.toggle-sounds');
  if (t) t.dataset.state = muted ? 'muted' : 'normal';
}

// ---------- show / hide ----------

export async function show({ lang, str, desktop, enter }) {
  const my = ++gen;
  current = { lang, str, desktop, enter };
  const html = desktop ? await renderDesktop(lang, str) : renderTouch(lang, str);
  if (my !== gen) return;
  root.innerHTML = html;
  root.className = desktop ? 'landing-desktop' : 'landing-touch';
  if (desktop) setupDesktop(lang);
  else stopMusic();
  if (!offWindow.length) listenWindow();
}

export function hide() {
  gen++;
  current = null;
  stopMusic(600);
  offWindow.forEach((off) => off());
  offWindow = [];
  // Drops the background video with the markup, so it stops downloading.
  root.innerHTML = '';
  root.className = '';
}

// The layout follows the window (a narrow desktop window becomes "touch").
on('layout', ({ desktop }) => {
  if (current && current.desktop !== desktop) show({ ...current, desktop });
});

function listenWindow() {
  const gesture = (e) => {
    // Links and ENTRAR leave the landing; the toggle handles itself.
    if (e.target.closest && e.target.closest('a, .btn-enter, .toggle-sounds, .btn-share')) return;
    startMusic();
  };
  window.addEventListener('pointerdown', gesture, true);
  window.addEventListener('keydown', gesture, true);
  offWindow.push(
    () => window.removeEventListener('pointerdown', gesture, true),
    () => window.removeEventListener('keydown', gesture, true),
  );
}

// ---------- desktop: the 2015 landing ----------

async function renderDesktop(lang, str) {
  const [page, menu, enter] = await Promise.all([
    render('index/indexViewTemplate', { STR: str, lang }),
    render('index/indexMenuViewTemplate', { STR: str, lang }),
    render('index/indexBtnEnterViewTemplate', { STR: str, translationLoaded: lang }),
  ]);
  const doc = document.createElement('div');
  doc.innerHTML = page;
  doc.querySelector('.menu').innerHTML = menu;
  doc.querySelector('.description-btnenter').innerHTML = enter;
  return doc.innerHTML;
}

function setupDesktop(lang) {
  localizeLinks(root, lang);
  syncToggle();

  // video.js is gone: a muted native video may autoplay; the first frame
  // stays in front of it until it has something to show (as in 2015).
  const v = root.querySelector('#video-landing');
  v.removeAttribute('class');
  v.muted = true;
  v.playsInline = true;
  v.addEventListener('loadeddata', () => {
    root.classList.add('video-ready');
    v.play().catch(() => {});
  }, { once: true });
  v.play().catch(() => {});
}

// The 2015 menu links carry no language (its router added it): keep the current one.
export function localizeLinks(el, lang) {
  el.querySelectorAll('a[href^="#"]').forEach((a) => {
    const h = a.getAttribute('href');
    if (h !== '#streetwalk') a.setAttribute('href', `${h}/${lang}`);
  });
}

// ---------- touch: compact start screen ----------

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function renderTouch(lang, str) {
  const t = TEXT[lang] || TEXT.es;
  const found = stories.storiesFound();
  const langs = Object.keys(TEXT).map((l) =>
    `<button data-lang="${l}" lang="${l}" title="${esc(str[LANG_NAMES[l]])}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`,
  ).join('');
  const pages = PAGES.map(([name, key]) => `<a href="#page/${name}/${lang}">${esc(str[key] || name)}</a>`).join('');
  return `
    <div class="st">
      <nav class="st-langs">${langs}</nav>
      <div class="st-head">
        <img class="st-logo" src="images/logo.png" alt="Pregoneros de Medellín">
        <p class="st-headline">${esc(str.landingDescriptionHeadline)}</p>
      </div>
      <div class="st-go">
        <button class="cta btn-enter">${esc(t.start)}</button>
        <p class="st-hint">🎧 ${esc(t.headphones)}</p>
        ${found ? `<p class="st-found">★ ${found}/${stories.TOTAL_STORIES} ${esc(t.found)}</p>` : ''}
      </div>
      <nav class="st-pages">
        <button class="st-trailer">▶ ${esc(t.trailer)}</button>${pages}
      </nav>
    </div>`;
}

// ---------- clicks (one delegated listener on the landing) ----------

root.addEventListener('click', (e) => {
  if (!current) return;
  const { lang, str, enter } = current;
  const hit = (sel) => e.target.closest(sel);

  if (hit('.btn-enter')) {
    // Synchronously inside the click: enter() unlocks audio, which needs the gesture.
    e.preventDefault();
    enter();
  } else if (hit('.toggle-sounds')) {
    setMuted(!muted);
  } else if (hit('.btn-shareonfacebook')) {
    share(`https://www.facebook.com/sharer.php?u=${encodeURIComponent(SITE)}`);
  } else if (hit('.btn-shareontwitter')) {
    share(`https://twitter.com/intent/tweet?text=${encodeURIComponent(str.shareTweetContent || SITE)}`);
  } else if (hit('[data-lang]')) {
    const l = hit('[data-lang]').dataset.lang;
    if (l !== lang) emit('set-lang', { lang: l });
  } else if (hit('.st-trailer')) {
    emit('play-video', { src: TRAILER, subs: `content/subtitles/jale/mobilebonus/${lang}.vtt` });
  }
});

root.addEventListener('change', (e) => {
  if (current && e.target.matches('.language-selection')) emit('set-lang', { lang: e.target.value });
});

function share(url) {
  const w = window.open(url, 'popupwindow', 'scrollbars=yes,width=800,height=400');
  if (w) w.focus();
}
