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

RESULTS_SIZE

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

RESULTS_BENCH

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
node tools/build_af.mjs street/highres street/af/vp9-1000-g5.af vp9 5 42 1000

python3 -m http.server 8765 &   # from a folder with ./poc -> this folder and ./street -> the stills
open "http://localhost:8765/poc/index.html?mode=webcodecs&af=http://localhost:8765/street/af/h264-1000-g5.af"
node tools/bench.mjs http://localhost:8765 3
```

`tools/make_synthetic_street.py` renders a stand-in street for when the media
host is unreachable. Real stills give very different compression numbers, so use
it only to exercise the pipeline.
