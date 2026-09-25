// Frame-accurate still sequence player on top of WebCodecs.
//
// Reads the .af container from github.com/activetheory/activeframe (MIT,
// Active Theory): encoded samples + JSON manifest + uint32 LE manifest offset.
// Changes from upstream ActiveFrame.js, all driven by how the street walk
// scrubs (forward, backward, and big jumps when a scroll lands far away):
//   - only the latest requested still matters: requests that arrive while a
//     decode is in flight are coalesced instead of resetting the decoder
//   - moving forward inside the same GOP continues from the current frame
//     instead of re-decoding from the keyframe
//   - draws straight into a canvas (no WebGL needed) and reports metrics
//   - plain ES2017 so it can be dropped next to the RequireJS app
(function (root) {
    'use strict';

    function StillsPlayer(canvas, opts) {
        opts = opts || {};
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        this.hardwareAcceleration = opts.hardwareAcceleration || 'no-preference';
        this.onFrame = opts.onFrame || function () {};
        this.manifest = null;
        this.decoder = null;
        this.shown = -1;          // still currently on the canvas
        this.decoded = -1;        // last still the decoder produced (decoder state)
        this.target = 0;          // still the user wants
        this.busy = false;        // a decode batch is in flight
        this.batchEnd = -1;       // the still that ends the batch in flight
        this.requestedAt = 0;
        this.stats = { decodes: 0, batches: 0, resets: 0, latencies: [] };
    }

    StillsPlayer.isSupported = function () {
        return typeof root.VideoDecoder === 'function';
    };

    StillsPlayer.prototype.load = async function (url, onProgress) {
        var res = await fetch(url);
        var total = Number(res.headers.get('content-length')) || 0;
        var buf;
        if (res.body && onProgress && total) {
            var reader = res.body.getReader();
            var bytes = new Uint8Array(total);
            var got = 0;
            for (;;) {
                var r = await reader.read();
                if (r.done) break;
                bytes.set(r.value, got);
                got += r.value.length;
                onProgress(got / total);
            }
            buf = bytes.buffer;
        } else {
            buf = await res.arrayBuffer();
        }
        this.bytes = buf.byteLength;

        var manifestOffset = new DataView(buf, buf.byteLength - 4).getUint32(0, true);
        var manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, manifestOffset, buf.byteLength - 4 - manifestOffset)));
        this.byTimestamp = new Map();
        for (var i = 0; i < manifest.frames.length; i++) {
            var f = manifest.frames[i];
            f.chunk = new EncodedVideoChunk({ type: f.ty, timestamp: f.t, data: new Uint8Array(buf, f.o, f.l) });
            this.byTimestamp.set(f.t, i);
        }
        this.manifest = manifest;
        this.canvas.width = manifest.width;
        this.canvas.height = manifest.height;
        await this._configure();
    };

    StillsPlayer.prototype._configure = async function () {
        var m = this.manifest;
        var base = { codec: m.codec, codedWidth: m.width, codedHeight: m.height };
        if (m.description) {
            base.description = Uint8Array.from(atob(m.description), function (c) { return c.charCodeAt(0); });
        }
        var candidates = [
            Object.assign({ hardwareAcceleration: this.hardwareAcceleration, optimizeForLatency: true }, base),
            Object.assign({ optimizeForLatency: true }, base),
            base
        ];
        for (var i = 0; i < candidates.length; i++) {
            if ((await VideoDecoder.isConfigSupported(candidates[i])).supported) {
                this.config = candidates[i];
                break;
            }
        }
        if (!this.config) throw new Error('No decoder for ' + m.codec);
        var self = this;
        this.decoder = new VideoDecoder({
            output: function (frame) { self._output(frame); },
            error: function (e) { console.error('decoder error', e); self.busy = false; self._reset(); }
        });
        this.decoder.configure(this.config);
    };

    StillsPlayer.prototype._reset = function () {
        this.stats.resets++;
        if (this.decoder.state !== 'closed') {
            this.decoder.reset();
            this.decoder.configure(this.config);
        }
        this.decoded = -1;
    };

    StillsPlayer.prototype._output = function (frame) {
        var idx = this.byTimestamp.get(frame.timestamp);
        this.decoded = idx;
        if (idx === this.batchEnd) {
            // Draw only the frame the batch was for; intermediate GOP frames are just decoder warm-up
            this.ctx.drawImage(frame, 0, 0);
            this.shown = idx;
            this.busy = false;
            this.stats.latencies.push(performance.now() - this.requestedAt);
            this.onFrame(idx);
        }
        frame.close();
        if (!this.busy && this.target !== this.shown) this._decodeTo(this.target);
    };

    StillsPlayer.prototype.setFrame = function (i) {
        if (!this.manifest) return;
        i = Math.max(0, Math.min(this.manifest.totalFrames - 1, Math.round(i)));
        this.target = i;
        // Coalesce: while a batch is decoding, just remember the newest target
        if (this.busy || i === this.shown) return;
        this._decodeTo(i);
    };

    StillsPlayer.prototype._decodeTo = function (i) {
        var frames = this.manifest.frames;
        var start;
        // Continue forward from the decoder state when we can (same GOP, ahead of us)
        var key = i;
        while (key > 0 && frames[key].ty !== 'key') key--;
        if (this.decoded >= key && this.decoded < i) {
            start = this.decoded + 1;
        } else {
            if (this.decoded !== -1) this._reset();
            start = key;
        }
        this.busy = true;
        this.batchEnd = i;
        this.requestedAt = performance.now();
        this.stats.batches++;
        for (var j = start; j <= i; j++) {
            this.decoder.decode(frames[j].chunk);
            this.stats.decodes++;
        }
        // With optimizeForLatency and no B-frames the frame normally comes out right away.
        // Some decoders still hold it back; flushing forces it out, but after a flush
        // the next chunk must be a keyframe, so we forget the decoder state.
        var self = this, batch = this.stats.batches;
        clearTimeout(this.flushTimer);
        this.flushTimer = setTimeout(function () {
            if (!self.busy || self.stats.batches !== batch) return;
            self.stats.flushes = (self.stats.flushes || 0) + 1;
            self.decoder.flush().then(function () { self.decoded = -1; }, function () {});
            self.decoded = -1;
        }, 50);
    };

    StillsPlayer.prototype.destroy = function () {
        if (this.decoder && this.decoder.state !== 'closed') this.decoder.close();
        this.manifest = null;
    };

    root.StillsPlayer = StillsPlayer;
})(typeof window !== 'undefined' ? window : this);
