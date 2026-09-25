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

const COARSE = 8;
// Beyond the coarse pass, only fetch stills this close to the walker, so a
// visitor who stops halfway down a street does not download all of it.
const AHEAD = 90;

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

export class FrameLoader {
  constructor({ base, way, count, concurrency = 6, onProgress, onReady }) {
    this.base = base;
    this.way = way;
    this.count = count;
    this.concurrency = concurrency;
    this.onProgress = onProgress || (() => {});
    this.onReady = onReady || (() => {});

    this.frames = new Array(count).fill(null); // HTMLImageElement once decoded
    this.requested = new Uint8Array(count);
    this.inFlight = 0;
    this.loadedCount = 0;
    this.focus = 0;
    this.direction = 1;
    this.stopped = false;
    this.ready = false;

    this.coarse = [];
    for (let i = 0; i < count; i += COARSE) this.coarse.push(i);
    if (this.coarse[this.coarse.length - 1] !== count - 1) this.coarse.push(count - 1);
    this.coarseLeft = new Set(this.coarse);

    this.hi = { index: -1, img: null };
  }

  start() {
    this.pump();
  }

  stop() {
    this.stopped = true;
    if (this.hi.img) this.hi.img.src = '';
  }

  setFocus(index, direction) {
    this.focus = index;
    if (direction) this.direction = direction;
    this.pump();
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
    const img = new Image();
    img.decoding = 'async';
    const done = (ok) => {
      if (this.stopped) return;
      this.inFlight--;
      if (ok) {
        this.frames[i] = img;
        this.loadedCount++;
      }
      if (this.coarseLeft.delete(i) && this.coarseLeft.size === 0 && !this.ready) {
        this.ready = true;
        this.onReady();
      }
      this.onProgress(this.progress());
      this.pump();
    };
    img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => done(true));
    img.onerror = () => done(false);
    img.src = lowResUrl(this.base, this.way, i);
  }

  // Share of the coarse pass that is done, which is what gates "walkable".
  progress() {
    return 1 - this.coarseLeft.size / this.coarse.length;
  }

  // Closest decoded still to `i`, preferring the one just behind (like desktop).
  nearest(i) {
    if (this.frames[i]) return { index: i, img: this.frames[i] };
    for (let d = 1; d < this.count; d++) {
      if (i - d >= 0 && this.frames[i - d]) return { index: i - d, img: this.frames[i - d] };
      if (i + d < this.count && this.frames[i + d]) return { index: i + d, img: this.frames[i + d] };
    }
    return null;
  }

  // Resolves with a high-res image for `i`, or null when superseded or failed.
  loadHighRes(i) {
    if (this.hi.index === i && this.hi.img && this.hi.img.complete) return Promise.resolve(this.hi.img);
    if (this.hi.img) this.hi.img.src = '';
    const img = new Image();
    this.hi = { index: i, img };
    return new Promise((resolve) => {
      img.onload = () => resolve(this.hi.img === img ? img : null);
      img.onerror = () => resolve(null);
      img.src = highResUrl(this.base, this.way, i);
    });
  }
}
