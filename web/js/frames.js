// Loads the stills of one street for the mobile walk.
//
// The desktop version requests every low-res still in stride order and only
// starts once a third of them are in. On a phone that is too much to wait for,
// so here:
//   1. a coarse pass (every COARSE-th still) makes the street walkable quickly,
//   2. then stills nearest to where the walker is (ahead first) fill in, up
//      to AHEAD stills away,
//   3. a high-res still is fetched only when the walker stops, and only when the
//      connection is not flagged as slow or data-saving.
// Keeping "which still, at what quality" in this one module is deliberate: a
// different frame source (video, sprite sheets, activeframe) can replace it
// without touching the rest of the mobile app.
//
// Decoding. A canvas decodes a plain <img> JPEG again, on the main thread,
// each time it draws a still it hasn't drawn recently (img.decode() doesn't
// help: the canvas keeps its own decode cache). That was most of the main
// thread's time while swiping on a throttled phone. When the media host
// answers with CORS headers, stills are fetched as bytes instead and decoded
// with createImageBitmap(blob), which runs off the main thread; only the
// stills around the walker (WINDOW_*) are kept decoded, so memory stays flat
// however long the street. Without CORS the bytes can't be read, so stills
// stay plain images drawn as before. createImageBitmap(img) is no way out:
// Chrome decodes an <img> source synchronously on the main thread.

const COARSE = 8;
// Beyond the coarse pass, only fetch stills this close to the walker, so a
// visitor who stops halfway down a street does not download all of it.
const AHEAD = 90;
// Stills kept decoded around the walker (in the walking direction / behind).
// A 500×281 bitmap is ~0.56 MB, so 120 of them ≈ 67 MB whatever the street.
const WINDOW_AHEAD = 80;
const WINDOW_BEHIND = 40;
const DECODE_CONCURRENCY = 4;

export function lowResUrl(base, way, i) {
  return `${base}/data/${way}/lowres/way${String(i).padStart(3, '0')}.jpg`;
}

export function highResUrl(base, way, i) {
  return `${base}/data/${way}/highres/way${String(i).padStart(3, '0')}.jpg`;
}

export function connectionIsConstrained() {
  const c = navigator.connection;
  if (!c) return false;
  return !!c.saveData || /2g|3g/.test(c.effectiveType || '');
}

export function release(drawable) {
  if (drawable && typeof drawable.close === 'function') drawable.close();
}

// Whether stills from `base` can be read as bytes (CORS), asked once per host.
const corsProbes = {};
function mediaIsReadable(url) {
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return Promise.resolve(false);
  const origin = new URL(url, location.href).origin;
  if (!(origin in corsProbes)) {
    corsProbes[origin] = fetch(url, { mode: 'cors' })
      .then((r) => r.ok && r.blob())
      .then((b) => !!b && createImageBitmap(b).then((bm) => { bm.close(); return true; }))
      .catch(() => false);
  }
  return corsProbes[origin];
}

export class FrameLoader {
  constructor({ base, way, count, concurrency = 6, onProgress, onReady, onFrame }) {
    this.base = base;
    this.way = way;
    this.count = count;
    this.concurrency = concurrency;
    this.onProgress = onProgress || (() => {});
    this.onReady = onReady || (() => {});
    this.onFrame = onFrame || (() => {});

    // Per still, once loaded: an HTMLImageElement, or a Blob (encoded JPEG)
    // when the host allows reading bytes.
    this.frames = new Array(count).fill(null);
    this.bitmaps = new Array(count).fill(null); // decoded stills near the walker (Blob mode)
    this.live = new Set(); // indices with a bitmap or a decode in flight
    this.decoding = 0;
    this.requested = new Uint8Array(count);
    this.inFlight = 0;
    this.loadedCount = 0;
    this.focus = 0;
    this.direction = 1;
    this.stopped = false;
    this.ready = false;
    this.readBytes = false;
    this.abort = typeof AbortController === 'function' ? new AbortController() : null;
    this.pending = new Set(); // images still downloading, cancelled by stop()

    this.coarse = [];
    for (let i = 0; i < count; i += COARSE) this.coarse.push(i);
    if (this.coarse[this.coarse.length - 1] !== count - 1) this.coarse.push(count - 1);
    this.coarseLeft = new Set(this.coarse);

    this.hi = { index: -1, img: null };
  }

  start() {
    mediaIsReadable(lowResUrl(this.base, this.way, 0)).then((ok) => {
      this.readBytes = ok;
      this.pump();
    });
  }

  stop() {
    this.stopped = true;
    // Cancel what is still downloading, then free what was decoded.
    if (this.abort) this.abort.abort();
    for (const img of this.pending) img.src = '';
    this.pending.clear();
    for (const i of this.live) { release(this.bitmaps[i]); this.bitmaps[i] = null; }
    this.live.clear();
    this.frames.fill(null);
    if (this.hi.img) this.hi.img.src = '';
    if (this.hi.abort) this.hi.abort.abort();
    release(this.hi.bitmap);
    this.hi = { index: -1, img: null };
  }

  setFocus(index, direction) {
    this.focus = index;
    if (direction) this.direction = direction;
    this.pump();
    this.decodeAround();
  }

  nextIndex() {
    // Coarse pass first, from the start of the street.
    for (const i of this.coarse) if (!this.requested[i]) return i;
    // Then nearest to the walker, looking ahead twice as far as behind.
    let best = -1;
    let bestCost = Infinity;
    for (let i = 0; i < this.count; i++) {
      if (this.requested[i]) continue;
      const delta = (i - this.focus) * this.direction;
      const cost = delta >= 0 ? delta : -delta * 2;
      if (cost < bestCost) { bestCost = cost; best = i; }
    }
    return bestCost <= AHEAD ? best : -1;
  }

  pump() {
    while (!this.stopped && this.inFlight < this.concurrency) {
      const i = this.nextIndex();
      if (i < 0) return;
      this.requested[i] = 1;
      this.inFlight++;
      this.load(i);
    }
  }

  load(i) {
    const done = (still) => {
      if (this.stopped) return;
      this.inFlight--;
      if (still) {
        this.frames[i] = still;
        this.loadedCount++;
        this.decodeAround();
      }
      if (this.coarseLeft.delete(i) && this.coarseLeft.size === 0 && !this.ready) {
        this.ready = true;
        this.onReady();
      }
      this.onProgress(this.progress());
      this.pump();
    };
    const url = lowResUrl(this.base, this.way, i);
    if (this.readBytes) {
      fetch(url, { mode: 'cors', signal: this.abort && this.abort.signal })
        .then((r) => (r.ok ? r.blob() : null))
        .then(done, () => done(null));
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    this.pending.add(img);
    img.onload = () => { this.pending.delete(img); done(img); };
    img.onerror = () => { this.pending.delete(img); done(null); };
    img.src = url;
  }

  // Keeps [focus - behind, focus + ahead] decoded (ahead = walking direction),
  // nearest first, and frees bitmaps that fell outside it.
  decodeAround() {
    if (this.stopped || !this.readBytes) return;
    const d = this.direction;
    const lo = this.focus - (d > 0 ? WINDOW_BEHIND : WINDOW_AHEAD);
    const hi = this.focus + (d > 0 ? WINDOW_AHEAD : WINDOW_BEHIND);
    for (const i of this.live) {
      if (i < lo || i > hi) {
        release(this.bitmaps[i]);
        this.bitmaps[i] = null;
        this.live.delete(i);
      }
    }
    for (let k = 0; k <= Math.max(WINDOW_AHEAD, WINDOW_BEHIND) && this.decoding < DECODE_CONCURRENCY; k++) {
      for (const i of k ? [this.focus + k * d, this.focus - k * d] : [this.focus]) {
        if (i < lo || i > hi || i < 0 || i >= this.count) continue;
        if (!this.frames[i] || this.live.has(i) || this.decoding >= DECODE_CONCURRENCY) continue;
        this.decode(i);
      }
    }
  }

  decode(i) {
    this.live.add(i);
    this.decoding++;
    createImageBitmap(this.frames[i]).then((b) => {
      this.decoding--;
      if (this.stopped || !this.live.has(i)) {
        b.close(); // fell out of the window meanwhile
      } else {
        this.bitmaps[i] = b;
        if (Math.abs(i - this.focus) <= 2) this.onFrame(i);
      }
      this.decodeAround();
    }, () => {
      this.decoding--; // corrupt still: stays in `live` so it isn't retried
    });
  }

  // Share of the coarse pass that is done, which is what gates "walkable".
  progress() {
    return 1 - this.coarseLeft.size / this.coarse.length;
  }

  // Closest drawable still to `i`, preferring the one just behind (like
  // desktop): a loaded image, or with byte loading a decoded bitmap.
  nearest(i) {
    const store = this.readBytes ? this.bitmaps : this.frames;
    if (store[i]) return { index: i, img: store[i] };
    for (let d = 1; d < this.count; d++) {
      if (i - d >= 0 && store[i - d]) return { index: i - d, img: store[i - d] };
      if (i + d < this.count && store[i + d]) return { index: i + d, img: store[i + d] };
    }
    return null;
  }

  // Resolves with a high-res still for `i`, or null when superseded or failed.
  loadHighRes(i) {
    return loadHighResInto(this, highResUrl(this.base, this.way, i), i, this.readBytes);
  }
}

// Shared by both frame sources. One high-res still at a time (8 MB decoded):
// the previous one is cancelled or freed when another is asked for. With
// `readBytes` it's decoded off the main thread, like the low-res stills.
export function loadHighResInto(owner, url, i, readBytes) {
  const cur = owner.hi;
  if (cur.index === i && cur.bitmap) return Promise.resolve(cur.bitmap);
  if (cur.img) cur.img.src = '';
  if (cur.abort) cur.abort.abort();
  release(cur.bitmap);
  const hi = owner.hi = { index: i, img: null, bitmap: null, abort: null };
  const settle = (still) => {
    if (owner.hi !== hi || owner.stopped) { if (still) release(still); return null; }
    hi.bitmap = still;
    return still;
  };
  if (readBytes) {
    hi.abort = new AbortController();
    return fetch(url, { mode: 'cors', signal: hi.abort.signal })
      .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
      .then((b) => createImageBitmap(b))
      .then(settle, () => null);
  }
  const img = hi.img = new Image();
  return new Promise((resolve) => {
    img.onload = () => resolve(settle(img));
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
