// Project pages (#page/<name>): transmedia, music, team, making of, press kit.
// Rendered from the 2015 templates and styled by the 2015 stylesheet; phones
// get readable overrides in css/site.css.

import { render } from './tpl.js';
import { emit, on } from './bus.js';
import { localizeLinks } from './landing.js';

const root = document.getElementById('page');

const TEMPLATES = {
  transmedia: 'transmediaViewTemplate',
  music: 'musicViewTemplate',
  team: 'teamViewTemplate',
  makingof: 'makingOfViewTemplate',
  presskit: 'pressKitViewTemplate',
};

const CLOSE = { es: 'Cerrar', en: 'Close', fr: 'Fermer' };

let current = null; // { name, lang } while a page is shown
let gen = 0; // bumped by every show/hide: a slower render that lost the race is dropped
let offWindow = []; // window listeners to remove on hide

// 2015 pages were a layer over the screen they were opened from, and the close
// button went back to it. Remember that screen to return there.
let returnTo = null;
on('view', ({ view }) => { if (view !== 'page') returnTo = location.hash; });

export async function show(name, { lang, str }) {
  const my = ++gen;
  if (!TEMPLATES[name]) {
    location.replace(`#index/${lang}`);
    return;
  }
  const [html, menu] = await Promise.all([
    render(`page/${TEMPLATES[name]}`, { STR: str, lang, soundsMuted: false }),
    render('index/indexMenuViewTemplate', { STR: str, lang }),
  ]);
  if (my !== gen) return;
  // A language change re-renders the same page: keep the reading position.
  const keep = current && current.name === name ? root.scrollTop : 0;
  current = { name, lang };
  root.innerHTML = html;
  root.dataset.name = name;

  // Nothing plays on pages any more (2015 kept the landing music going under them).
  root.querySelectorAll('.toggle-sounds').forEach((n) => n.remove());

  // The 2015 menu (home, pages, language) in the green bar, beside the close button.
  const nav = document.createElement('nav');
  nav.className = 'page-menu';
  nav.innerHTML = menu;
  localizeLinks(nav, lang);
  nav.querySelector(`a[href^="#page/${name}/"]`)?.classList.add('current');
  root.querySelector('.page-topbar').after(nav);

  const close = root.querySelector('.page-btnclose');
  close.setAttribute('role', 'button');
  close.setAttribute('tabindex', '0');
  close.setAttribute('aria-label', CLOSE[lang] || CLOSE.es);
  root.scrollTop = keep;

  if (!offWindow.length) {
    const onKey = (e) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && e.target === root.querySelector('.page-btnclose'))) closePage();
    };
    window.addEventListener('keydown', onKey);
    offWindow.push(() => window.removeEventListener('keydown', onKey));
  }
}

export function hide() {
  gen++;
  current = null;
  offWindow.forEach((off) => off());
  offWindow = [];
  // Removing the markup also stops the YouTube, SoundCloud and Vimeo players.
  root.innerHTML = '';
  delete root.dataset.name;
}

function closePage() {
  if (!current) return;
  const { lang } = current;
  const walk = /^#\/?streetwalk\/([^/]+)/.exec(returnTo || '');
  location.hash = walk ? `#streetwalk/${walk[1]}/${lang}` : `#index/${lang}`;
}

root.addEventListener('click', (e) => {
  if (!current) return;
  if (e.target.closest('.page-btnclose')) closePage();
});

root.addEventListener('change', (e) => {
  if (current && e.target.matches('.language-selection')) emit('set-lang', { lang: e.target.value });
});
