# Scroll performance: JPEG stills vs WebCodecs (proof of concept)

This is a standalone proof of concept on one street, `plazabotero-start-carabobo`
(378 stills, about 123 m). It does not change the app. It compares today's
image-swap walk against a WebCodecs player that reads the
[activeframe](https://github.com/activetheory/activeframe) `.af` format.

## How the walk works today

- `models/Stills.js` loads **one JPEG per still**: 378 requests for this street
  and 26,039 across the 75 streets. It loads 7 at a time, in the order every
  20th, 10th, 5th, 2nd, then all.
- The walk opens once **a third of the stills** have loaded. Until the rest
  arrive, scrolling shows the closest earlier still that has loaded, so the
  picture freezes and then jumps.
- `streetwalk.renderImg` swaps the source of one image element to the 500×281
  still on every step. When scrolling stops for 100 ms, `renderImgHighRes`
  fetches a **1920×1080 still (~300 KB)** and fades it in. Scrolling again hides it.
- Measured on this street, from the real files: the low-res stills weigh
  **12.7 MB**, and the high-res set weighs 109 MB, fetched one at a time on idle.

## What activeframe is

- It is version 0.0.1 on npm, released in April 2026 by Active Theory under the MIT
  license. It is about 250 lines of browser code plus an ffmpeg/mp4box packing
  script.
- The `.af` format holds the encoded H.264/H.265 samples, a JSON manifest, and a
  4-byte footer. The browser feeds the samples to `VideoDecoder`, with no
  `<video>` element and no wasm, and gets frame-accurate `setFrame(i)`.
- The format is sound and simple. The player needs work before it fits this site:
  - It downloads the whole file before showing anything (no range requests).
  - Every non-sequential seek resets the decoder while frames are queued, so fast
    scrolling thrashes.
  - It only takes the fast path for exactly `+1` frames.
  - It needs `ffmpeg-static`, which downloads a binary from GitHub at install.
- **Recommendation: keep the `.af` format and own a small player.** That player is
  [`src/StillsPlayer.js`](src/StillsPlayer.js), about 200 lines, plain ES2017,
  with credit to activeframe in the header. It:
  - coalesces requests, because only the newest target still matters,
  - continues forward inside a GOP instead of re-decoding from the keyframe,
  - draws to a 2D canvas.

## Other approaches considered

| Approach | Verdict |
| --- | --- |
| `<video>` + `currentTime` | Seeking is asynchronous and imprecise, and very laggy on iOS Safari. It is the reason image sequences were used in 2015. Rejected. |
| WebCodecs + `.af` (this PoC) | Frame-accurate, hardware decode, one request per street, 2–3× fewer bytes at better quality. Needs a JPEG fallback where `VideoDecoder` is missing. |
| [`@plutotcool/fsv`](https://www.npmjs.com/package/@plutotcool/fsv) "Fast Scrubbing Video" | The same idea, packaged. Worth a look if we'd rather not own a player. |
| Mediabunny (WebCodecs + MP4 demux) | Heavier, but streams standard MP4 with range requests. A good fit if progressive streaming becomes the priority. |
| Keep stills, re-encode as AVIF/WebP | The cheapest change: roughly 30–50% fewer bytes. It keeps the 378 requests per street and the freeze-then-jump loading. |

## Results on the real Plaza Botero stills

### Size at equal quality

SSIM is measured against the 1920px high-res stills, with everything compared at
1000px wide. Encodes come from `tools/build_af.mjs`.

| Encoding | Size | Files | Width | SSIM |
| --- | ---: | ---: | ---: | ---: |
| **Today: low-res JPEG** (shown while moving) | **12.7 MB** | 378 | 500 | 0.865 |
| Today: high-res JPEG (one per idle stop) | 109 MB | 378 | 1920 | reference |
| H.264, GOP 5, CRF 32 | 3.9 MB | 1 | 1000 | 0.867 |
| **H.264, GOP 5, CRF 29** (recommended) | **6.0 MB** | 1 | 1000 | **0.900** |
| H.264, GOP 15, CRF 29 | 4.9 MB | 1 | 1000 | 0.890 |
| H.264, all-intra, CRF 29 | 6.2 MB | 1 | 1000 | 0.859 |
| H.264, GOP 5, CRF 23 | 13.3 MB | 1 | 1000 | 0.950 |
| H.264, GOP 5, CRF 26 | 13.7 MB | 1 | 1280 | 0.949 |
| VP9, GOP 5, CRF 50 (used in the browser runs) | 5.9 MB | 1 | 1000 | 0.895 |
| VP9, GOP 15, CRF 50 | 4.3 MB | 1 | 1000 | 0.879 |
| VP9, all-intra, CRF 50 | 17.6 MB | 1 | 1000 | 0.948 |

At the same quality as today's low-res stills, one H.264 file is **3.3× smaller
at twice the width** (3.9 MB against 12.7 MB). The recommended setting spends
6 MB for visibly sharper frames, which is still under half of today's bytes. It
also removes the 1920px swap on idle, which today costs about 300 KB every time
the user stops.

GOP (the keyframe interval) trades size against how many frames a backward step
or a jump has to decode. GOP 5 means at most 5 decodes.

### Scrolling in the browser

The page is `index.html` and the driver is `tools/bench.mjs`. The run uses headless
Chromium 141 and median values over 3 runs. The scripted scrub is:

1. walk the whole street forward,
2. flick back over half of it,
3. make 25 random jumps.

- **Fast 4G** means 9 Mbps and 60 ms RTT with the CPU slowed 4×, as a stand-in for a mid-range phone.
- **Cable** means 50 Mbps and 20 ms RTT with the CPU unthrottled.
- "Stale" counts animation frames where the picture sits more than 3 stills
  (about 1 m) away from the scroll position.

| Profile | Variant | Walk opens | Whole street loaded | MB downloaded | Stale frames | Stills behind p50 / p95 | Decode p50 / p95 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Fast 4G | Today (JPEG) | 5.5 s (⅓ of stills) | 16.0 s | 13.1 | 0% | 0 / 1 | n/a |
| Fast 4G | VP9 GOP 5 | 5.8 s | **5.8 s** | 5.9 | 56% | 4 / 45 | 27 / 43 ms |
| Fast 4G | VP9 GOP 15 | 4.2 s | 4.2 s | 4.3 | 53% | 4 / 58 | 24 / 60 ms |
| Fast 4G | VP9 all-intra | 17.0 s | 17.0 s | 17.6 | 54% | 4 / 37 | 25 / 32 ms |
| Cable | Today (JPEG) | 1.9 s (⅓ of stills) | 5.5 s | 14.5 | 0% | 0 / 1 | n/a |
| Cable | VP9 GOP 5 | 1.1 s | **1.1 s** | 5.9 | 34% | 1 / 17 | 11 / 21 ms |
| Cable | VP9 GOP 15 | 0.9 s | 0.9 s | 4.3 | 41% | 1 / 36 | 9 / 37 ms |
| Cable | VP9 all-intra | 3.3 s | 3.3 s | 17.6 | 26% | 1 / 14 | 11 / 15 ms |

Main-thread jank was zero in every run: no long tasks and no animation frames
over 50 ms. The WebCodecs runs use 12–40 MB of JS heap for the encoded file,
against about 2 MB for today's code, which keeps decoded images outside the JS heap.

**What this says:**
- **Loading is clearly better.** The whole street, at twice the resolution, is
  playable before today's code opens the walk on Fast 4G (5.8 s against 5.5 s
  for a third of the stills and 16 s for all of them). It takes one request
  instead of 378 and less than half the bytes.
- **Responsiveness is not proven yet.** With software VP9 in headless Chromium,
  the picture runs about 1 still behind on cable and 4 behind on the throttled
  profile. Right after a jump it takes one or two animation frames to catch up.
  That is where the p95 comes from. Today's code looks perfect here only because
  it is counted as shown the moment the image source changes.
- The deciding test is H.264 hardware decode on a real phone and a Mac, which
  this sandbox cannot run. Open `index.html` on the device and read the numbers
  it reports on screen.

How to read the numbers:
- This Chromium build has no H.264, so the browser runs use **VP9 decoded in
  software**. That is the worst case. The real target is H.264, which Safari, iOS
  and Android decode in hardware, so decode latency there should be lower.
- For today's code, a still counts as shown the moment its source is set. That is
  generous: Chromium decodes JPEGs off the main thread and can paint them later.

## What it would take to ship

1. **Encode every street.** Run `tools/build_af.mjs` over each street's high-res
   stills to produce one `.af` per street: H.264 at 1000px, GOP 5, CRF about 29.
   For 26k stills that is roughly 75 × 6 MB.
2. **Host it with CORS.** `images.pregonerosdemedellin.com` sends no CORS headers
   today. `fetch()` of a `.af` from the site origin will fail unless the host adds
   `Access-Control-Allow-Origin`, or the files are served from the same origin
   as the site.
3. **Wire it in behind a check.** In `Stills.fetch` / `streetwalk.renderImg`, when
   `StillsPlayer.isSupported()` and the `.af` loads, call
   `player.setFrame(imgNb)` instead of swapping the image source. Keep the JPEG
   path as the fallback. Map, sounds and characters already key off `imgNb` and
   stay as they are.
4. **Stream it (next step).** Put the manifest first, or in a sidecar `.json`, and
   fetch GOP byte ranges around the current position, like today's progressive
   loader. The walk could then open after the first GOPs instead of the whole file.

## Reproduce

```sh
cd poc/scroll-webcodecs
npm install                    # mp4box, playwright-core
python3 -m pip install imageio-ffmpeg pillow numpy   # ffmpeg with libx264/libvpx
export FFMPEG=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")

tools/fetch_way.sh plazabotero-start-carabobo street     # real stills (or tools/make_synthetic_street.py)
mkdir -p street/af
AF_REF=street/highres node tools/build_af.mjs street/highres street/af/h264-1000-g5.af h264 5 29 1000
node tools/build_af.mjs street/highres street/af/vp9-1000-g5.af vp9 5 50 1000

python3 -m http.server 8765 &   # from a folder with ./poc -> this folder and ./street -> the stills
open "http://localhost:8765/poc/index.html?mode=webcodecs&af=http://localhost:8765/street/af/h264-1000-g5.af"
node tools/bench.mjs http://localhost:8765 3
```

`tools/make_synthetic_street.py` renders a stand-in street for when the media
host is unreachable. Real stills give very different compression numbers, so use
it only to exercise the pipeline.
