// Spatial street sound for the mobile walk.
//
// The desktop build creates one Howler sound per source (up to 13 per street),
// starts them all at page load and sets `volume` on HTML5 audio. On phones that
// fails three ways: autoplay is blocked until a tap, iOS ignores
// HTMLMediaElement.volume, and 13 parallel streams cost data and battery.
//
// Here a small pool of <audio> elements is unlocked during the start tap and
// reused: only the VOICES loudest sources at the walker's position play. Volume
// and stereo pan go through Web Audio gain/panner nodes, which iOS honours.
// If the sound host does not send CORS headers, Web Audio would output silence,
// so we probe once and fall back to plain element volume. iOS ignores element
// volume, so in that fallback only the single loudest source plays there.

import { distance, bearing } from './geo.js';

const VOICES = 5;
const MIN_AUDIBLE = 0.01;

// 0.1s of silence, used to unlock pool elements inside the user gesture.
function silentWav() {
  const n = 800;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true);
  v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  let bin = '';
  new Uint8Array(buf).forEach((b) => { bin += String.fromCharCode(b); });
  return 'data:audio/wav;base64,' + btoa(bin);
}

// Same curve as the desktop Sound model.
export function volumeAt(sound, dist) {
  const maxVol = (sound.maxvol === undefined ? 100 : Number(sound.maxvol)) / 100;
  const d = Math.max(dist, 0.5);
  const v = sound.type === 'punctual' ? maxVol / (d * d) : maxVol / d;
  return Math.min(v * (sound.db || 1), maxVol);
}

export function panAt(soundPos, userPos, heading) {
  let angle = bearing(userPos, soundPos) - heading;
  if (angle < -180) angle += 360; else if (angle > 180) angle -= 360;
  let p = angle / 90;
  if (Math.abs(p) > 1) {
    const x = Math.abs(p) - 1;
    p = p > 0 ? 1 - x : -1 + x;
  }
  return p;
}

export class Soundscape {
  constructor(base) {
    this.base = base;
    this.sounds = [];
    this.voices = [];
    this.muted = false;
    this.started = false;
    this.webAudio = false;
  }

  // Must run synchronously inside a tap handler.
  unlock() {
    if (this.started) return;
    this.started = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* iOS 17+ only */ }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.ctx.resume();
    }

    // iOS keeps HTMLMediaElement.volume at 1 whatever is set.
    const probeEl = new Audio();
    probeEl.volume = 0.5;
    this.elementVolume = probeEl.volume !== 1;

    const silence = silentWav();
    for (let i = 0; i < VOICES; i++) {
      const el = new Audio();
      el.loop = true;
      el.preload = 'auto';
      el.setAttribute('playsinline', '');
      el.src = silence;
      const p = el.play();
      if (p && p.then) p.then(() => el.pause()).catch(() => {});
      this.voices.push({ el, sound: null, gain: null, pan: null });
    }

    document.addEventListener('visibilitychange', () => this.applyPlayback());
  }

  // Decide once whether Web Audio routing will be audible (needs CORS).
  async probe(sampleUrl) {
    if (!this.ctx || this.probed) return;
    this.probed = true;
    let cors = false;
    try {
      const r = await fetch(sampleUrl, { method: 'HEAD', mode: 'cors' });
      cors = r.ok;
    } catch (e) { cors = false; }
    if (!cors) return;
    this.webAudio = true;
    for (const v of this.voices) {
      v.el.crossOrigin = 'anonymous';
      const src = this.ctx.createMediaElementSource(v.el);
      v.gain = this.ctx.createGain();
      v.gain.gain.value = 0;
      let node = src;
      if (this.ctx.createStereoPanner) {
        v.pan = this.ctx.createStereoPanner();
        node.connect(v.pan);
        node = v.pan;
      }
      node.connect(v.gain);
      v.gain.connect(this.master);
      // A source picked before the probe finished was fetched without CORS.
      if (v.sound) { v.el.src = this.url(v.sound); this.setLevel(v, 0); }
    }
    if (this.userPos) this.update(this.userPos, this.heading);
  }

  url(sound) {
    return `${this.base}/sounds/${sound.path}.mp3`;
  }

  setWay(waySounds) {
    this.sounds = (waySounds || []).map((s) => ({ ...s, pos: s.position }));
    if (this.started && this.sounds.length) this.probe(this.url(this.sounds[0]));
  }

  // Called as the walker moves. `heading` in degrees, 0 = north.
  update(userPos, heading) {
    this.userPos = userPos;
    this.heading = heading;
    if (!this.started) return;

    const ranked = this.sounds
      .map((s) => {
        const vol = volumeAt(s, distance(s.pos, userPos));
        return { s, vol };
      })
      .filter((x) => x.vol > MIN_AUDIBLE)
      .sort((a, b) => b.vol - a.vol)
      .slice(0, this.webAudio || this.elementVolume ? VOICES : 1);

    const wanted = new Map(ranked.map((x) => [x.s.path, x]));

    // Free voices whose source is no longer among the loudest.
    for (const v of this.voices) {
      if (v.sound && !wanted.has(v.sound.path)) {
        this.setLevel(v, 0);
        v.el.pause();
        v.sound = null;
      }
    }

    for (const { s, vol } of ranked) {
      let v = this.voices.find((x) => x.sound && x.sound.path === s.path);
      if (!v) {
        v = this.voices.find((x) => !x.sound);
        if (!v) continue;
        v.sound = s;
        v.el.src = this.url(s);
        this.setLevel(v, 0);
      }
      this.setLevel(v, vol);
      if (v.pan && s.type === 'punctual') v.pan.pan.setTargetAtTime(panAt(s.pos, userPos, heading), this.ctx.currentTime, 0.1);
    }
    this.applyPlayback();
  }

  setLevel(v, vol) {
    if (v.gain) v.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.25);
    else v.el.volume = Math.max(0, Math.min(1, vol));
  }

  setMuted(muted) {
    this.muted = muted;
    this.applyPlayback();
  }

  // Suspend everything while muted, while a story video plays or in background.
  setPaused(paused) {
    this.paused = paused;
    this.applyPlayback();
  }

  applyPlayback() {
    if (!this.started) return;
    const silent = this.muted || this.paused || document.hidden;
    if (this.ctx) {
      if (silent) this.ctx.suspend(); else this.ctx.resume();
    }
    for (const v of this.voices) {
      if (!v.sound || silent) v.el.pause();
      else if (v.el.paused) v.el.play().catch(() => {});
    }
  }
}
