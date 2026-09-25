// Which character story plays where, kept in localStorage.
// Mirrors the desktop ProgressionModel: each character's videos unlock in order,
// one per street, and a street always replays the story first found there.

const VIDEO_BASE = 'https://images.pregonerosdemedellin.com/video';
const KEY = 'pregoneros-mobile-progress';

export const CHARACTERS = {
  jale: ['video1', 'video2', 'video3'],
  pajarito: ['video1', 'video2', 'video3'],
  lider: ['video1', 'video2', 'video3'],
  gaucho: ['video1', 'video2', 'video3'],
  papavanegas: ['video1', 'video2', 'video3'],
};

// Pajarito's bonus story lives on calle 56 (both directions), as on desktop.
const BONUS_WAYS = { 'cl56-cr47-cr48': 'videobonus', 'cl56-cr48-cr47': 'videobonus' };

export const TOTAL_STORIES = Object.values(CHARACTERS).reduce((n, v) => n + v.length, 0) + 1;

function reverseWay(name) {
  const p = name.split('-');
  return p.length === 2 ? `${p[1]}-${p[0]}` : `${p[0]}-${p[2]}-${p[1]}`;
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}

function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

export function videoUrl(character, video) {
  const n = video === 'videobonus' ? 'videobonus' : `${character}-0${video.slice(-1)}`;
  return `${VIDEO_BASE}/${n}.mp4`;
}

export function subtitlesUrl(character, video, lang) {
  return `content/subtitles/${character}/${video}/${lang}.vtt`;
}

export function storiesFound() {
  const s = load();
  return Object.values(s.unlocked || {}).reduce((n, c) => n + Object.keys(c).length, 0);
}

// Read-only view of what has been found: { character: { videoN: wayName } }.
// The desktop characters menu and map draw locked/unlocked states from it.
export function unlockedStories() {
  return load().unlocked || {};
}

export function lastStreet() {
  return load().street || null;
}

export function rememberStreet(way) {
  const s = load();
  s.street = way;
  save(s);
}

// Returns the video to play for `character` on `way` and records it as found.
export function storyFor(character, way) {
  const s = load();
  s.unlocked = s.unlocked || {};
  const mine = (s.unlocked[character] = s.unlocked[character] || {});

  const bonus = BONUS_WAYS[way];
  if (bonus) {
    mine[bonus] = way;
    save(s);
    return bonus;
  }

  const here = Object.keys(mine).find((v) => mine[v] === way || mine[v] === reverseWay(way));
  if (here) return here;

  const next = CHARACTERS[character].find((v) => !mine[v]);
  // Everything found: replay the first story.
  if (!next) return CHARACTERS[character][0];
  mine[next] = way;
  save(s);
  return next;
}
