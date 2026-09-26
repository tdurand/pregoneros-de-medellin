// Video frame source for the walk: same interface as FrameLoader (frames.js),
// but a street is one H.264/VP9 file decoded with WebCodecs instead of one
// JPEG per still.
//
// Media layout (built by tools/media/encode-v2.mjs):
//   data/<way>/v2/index.json    codecs available + byte offsets of every still
//   data/<way>/v2/h264-1000.af  preferred (hardware decode on iOS/macOS/Android/Windows)
//   data/<way>/v2/vp9-1000.af   for browsers without H.264 in WebCodecs
//
// Stills are stored in walking order, so the file is decoded while it streams
// in: the street is walkable once the first READY_SHARE of it has arrived, and
// walking past what has arrived holds the last available still (like the JPEG
// loader holds the nearest loaded one). High-res stills on stop still come
// from the 1920px JPEGs.
//
// If anything is missing (no WebCodecs, no v2 files for this street, no
// supported codec, a decode error), it falls back to the JPEG FrameLoader
// with the same options, so callers can use it unconditionally.
//
// One addition to the FrameLoader options: `onFrame(index)` is called when a
// newly decoded still is ready to draw. Decoding is asynchronous, so the
// caller should redraw then (in main.js: `onFrame: () => { state.dirty = true; }`).
import { FrameLoader, highResUrl, loadHighResInto, release } from './frames.js';

// Share of the street (in stills) that must have arrived before it is walkable.
const READY_SHARE = 0.1;
// If a decoder holds back the last frame of a batch, flush after this long.
const FLUSH_AFTER_MS = 50;

export function v2Url(base, way, file) {
  return `${base}/data/${way}/v2/${file}`;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class VideoFrameLoader {
  static isSupported() {
    return typeof VideoDecoder === 'function' && typeof EncodedVideoChunk === 'function';
  }

  constructor(opts) {
    this.opts = opts;
    this.base = opts.base;
    this.way = opts.way;
    this.count = opts.count;
    this.onProgress = opts.onProgress || (() => {});
    this.onReady = opts.onReady || (() => {});
    this.onFrame = opts.onFrame || (() => {});

    this._frames = new Array(this.count).fill(null); // true once a still's bytes are in
    this._ready = false;
    this.readyCount = Math.max(1, Math.ceil(this.count * READY_SHARE));
    this.available = 0; // stills 0..available-1 have fully arrived
    this.stopped = false;
    this.fallback = null;

    // Decoder state
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.shown = -1; // still currently in this.canvas
    this.decoded = -1; // last still the decoder produced (its reference state)
    this.target = 0; // still the walker is on
    this.busy = false; // a decode batch is in flight
    this.batchEnd = -1;
    this.needKey = true; // after configure or flush the next chunk must be a keyframe

    this.hi = { index: -1, img: null };
    this.source = null; // which .af file is playing, for debugging
  }

  // ---- FrameLoader interface ----

  get frames() { return this.fallback ? this.fallback.frames : this._frames; }
  get ready() { return this.fallback ? this.fallback.ready : this._ready; }
  get loadedCount() { return this.fallback ? this.fallback.loadedCount : this.available; }

  start() {
    this._start().catch((e) => this._fallBack(e));
  }

  stop() {
    this.stopped = true;
    if (this.abort) this.abort.abort();
    this._closeDecoder();
    if (this.hi.img) this.hi.img.src = '';
    release(this.hi.bitmap);
    if (this.fallback) this.fallback.stop();
  }

  setFocus(index, direction) {
    if (this.fallback) return this.fallback.setFocus(index, direction);
    this._request(index);
  }

  progress() {
    if (this.fallback) return this.fallback.progress();
    return Math.min(1, this.available / this.readyCount);
  }

  // The still to draw for `i`: the decoded one closest to it. Asking also moves
  // the decoder towards `i`; onFrame fires when it gets there.
  nearest(i) {
    if (this.fallback) return this.fallback.nearest(i);
    this._request(i);
    return this.shown < 0 ? null : { index: this.shown, img: this.canvas };
  }

  loadHighRes(i) {
    if (this.fallback) return this.fallback.loadHighRes(i);
    return loadHighResInto(this, highResUrl(this.base, this.way, i), i);
  }

  // ---- loading ----

  async _start() {
    if (!VideoFrameLoader.isSupported()) throw new Error('WebCodecs unavailable');
    this.abort = new AbortController();
    const signal = this.abort.signal;

    const res = await fetch(v2Url(this.base, this.way, 'index.json'), { signal });
    if (!res.ok) throw new Error(`no v2 media for ${this.way} (${res.status})`);
    const index = await res.json();
    if (index.stills !== this.count) throw new Error(`v2 has ${index.stills} stills, expected ${this.count}`);

    const source = await this._pickSource(index.sources);
    if (!source) throw new Error('no supported codec');
    if (this.stopped) return;
    this.source = source;
    this.canvas.width = source.width;
    this.canvas.height = source.height;
    // main.js sizes the drawing from naturalWidth/Height, like an <img>
    this.canvas.naturalWidth = source.width;
    this.canvas.naturalHeight = source.height;

    this.decoder = new VideoDecoder({
      output: (frame) => this._output(frame),
      error: (e) => this._fallBack(e),
    });
    this.decoder.configure(source.config);

    const file = await fetch(v2Url(this.base, this.way, source.file), { signal });
    if (!file.ok || !file.body) throw new Error(`${source.file}: ${file.status}`);
    const last = source.frames[source.frames.length - 1];
    const dataBytes = last[0] + last[1]; // the manifest and footer after this aren't needed
    this.bytes = new Uint8Array(dataBytes);
    let received = 0;
    const reader = file.body.getReader();
    while (received < dataBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const n = Math.min(value.length, dataBytes - received);
      this.bytes.set(n === value.length ? value : value.subarray(0, n), received);
      received += n;
      this._arrived(received);
    }
    reader.cancel().catch(() => {});
    if (this.available < this.count) throw new Error(`${source.file} ended early`);
  }

  async _pickSource(sources) {
    for (const s of sources || []) {
      const config = { codec: s.codec, codedWidth: s.width, codedHeight: s.height, optimizeForLatency: true };
      if (s.description) config.description = base64ToBytes(s.description);
      try {
        const support = await VideoDecoder.isConfigSupported(config);
        if (support.supported) return { ...s, config };
      } catch (e) {
        // unknown codec string in this browser: try the next one
      }
    }
    return null;
  }

  _arrived(received) {
    if (this.stopped) return;
    const frames = this.source.frames;
    while (this.available < this.count && frames[this.available][0] + frames[this.available][1] <= received) {
      this._frames[this.available] = true;
      this.available++;
    }
    this.onProgress(this.progress());
    if (!this._ready && this.available >= this.readyCount) {
      this._ready = true;
      this.onReady();
    }
    // The walker may be waiting past the end of what had arrived
    if (!this.busy && this.shown !== Math.min(this.target, this.available - 1)) this._request(this.target);
  }

  _fallBack(err) {
    if (this.stopped || this.fallback) return;
    console.warn(`frames-video: using JPEG stills for ${this.way}:`, err && err.message ? err.message : err);
    if (this.abort) this.abort.abort();
    this._closeDecoder();
    const wasReady = this._ready;
    this.fallback = new FrameLoader({
      ...this.opts,
      // If the video already made the street walkable, don't announce it twice
      onReady: wasReady ? () => {} : this.onReady,
    });
    this.fallback.start();
    this.fallback.setFocus(this.target, 1);
  }

  _closeDecoder() {
    clearTimeout(this.flushTimer);
    if (this.decoder && this.decoder.state !== 'closed') this.decoder.close();
    this.decoder = null;
    this.busy = false;
  }

  // ---- decoding ----

  _request(i) {
    if (!this.decoder || this.available === 0) {
      this.target = i;
      return;
    }
    this.target = Math.max(0, Math.min(this.count - 1, Math.round(i)));
    // Only the newest target matters: while a batch decodes, just remember it
    if (this.busy) return;
    const reachable = Math.min(this.target, this.available - 1);
    if (reachable !== this.shown) this._decodeTo(reachable);
  }

  _decodeTo(i) {
    const frames = this.source.frames;
    let key = i;
    while (key > 0 && !frames[key][2]) key--;
    let start;
    if (!this.needKey && this.decoded >= key && this.decoded < i) {
      // Same GOP, ahead of the decoder: carry on from where it is
      start = this.decoded + 1;
    } else {
      if (this.decoded !== -1 && !this.needKey) {
        this.decoder.reset();
        this.decoder.configure(this.source.config);
      }
      start = key;
    }
    this.busy = true;
    this.batchEnd = i;
    this.needKey = false;
    try {
      for (let j = start; j <= i; j++) {
        const [o, l, isKey] = frames[j];
        this.decoder.decode(new EncodedVideoChunk({
          type: isKey ? 'key' : 'delta',
          timestamp: j, // the still index comes back on the decoded frame
          data: this.bytes.subarray(o, o + l),
        }));
      }
    } catch (e) {
      this._fallBack(e);
      return;
    }
    // With optimizeForLatency and no B-frames the frame normally comes out
    // at once. Some decoders hold it back; a flush forces it out, but the
    // next chunk after a flush must be a keyframe, so forget the decoder state.
    clearTimeout(this.flushTimer);
    const batch = i;
    const check = () => {
      if (!this.busy || this.batchEnd !== batch || !this.decoder) return;
      // Still working through the batch (slow device): not held back, wait more
      if (this.decoder.decodeQueueSize > 0) {
        this.flushTimer = setTimeout(check, FLUSH_AFTER_MS);
        return;
      }
      this.needKey = true;
      this.decoder.flush().catch(() => {});
    };
    this.flushTimer = setTimeout(check, FLUSH_AFTER_MS);
  }

  _output(frame) {
    const idx = frame.timestamp;
    if (!this.stopped) {
      this.decoded = idx;
      if (idx === this.batchEnd) {
        // Intermediate frames of a GOP only warm the decoder up; draw the one asked for
        this.ctx.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
        this.shown = idx;
        this.busy = false;
        this.onFrame(idx);
      }
    }
    frame.close();
    if (!this.busy && !this.stopped) this._request(this.target);
  }
}
