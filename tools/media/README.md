# Media v2: video frame files

`encode-v2.mjs` turns each street's stills into one video file per codec,
plus an index the player reads first. The 2015 media (`lowres/`,
`highres/`) is not touched, so the classic site keeps working.

```
data/<way>/v2/index.json     frame byte offsets for each file (~14 KB)
data/<way>/v2/h264-1000.af   H.264, 1000px, keyframe every 5 stills (~6 MB for a 378-still street)
data/<way>/v2/vp9-1000.af    VP9 at about the same quality, for browsers without H.264 in WebCodecs
```

The `.af` container is the one from
[activeframe](https://github.com/activetheory/activeframe): the encoded samples,
then a JSON manifest, then a 4-byte footer. `index.json` repeats the offsets
up front, so `m/js/frames-video.js` can decode while the file downloads.

## Run it

```sh
cd tools/media
npm install
export FFMPEG=/path/to/ffmpeg     # needs libx264 and libvpx; `pip install imageio-ffmpeg` ships one
node encode-v2.mjs --out ../../dist-media --ways plazabotero-start-carabobo --ssim
node encode-v2.mjs --out ../../dist-media --all          # all 75 streets
```

- **Source stills.** It reads `--src <dir>/<way>/highres/wayNNN.jpg` when
  present. Otherwise it downloads the 1920px stills from the media host into
  `.cache/`, which is 7.8 GB for all streets.
- **Re-running.** A street that already has an `index.json` is skipped unless
  you pass `--force`.
- **Time.** About 35 s per street on 4 cores, so roughly 45 minutes for all 75.
- **Output.** About 12 MB per street for both codecs, so roughly 0.9 GB in total.
- **Original footage.** When it turns up, extract stills with the same names and
  point `--src` at them.

The defaults came out of the Plaza Botero benchmark in
`poc/scroll-webcodecs/README.md`. At `--crf-h264 29`, the H.264 file scores
SSIM 0.900 against the 1920px stills. Today's 500px JPEGs score 0.865 while
weighing 12.7 MB.

## Hosting

The browser has to `fetch()` these files, so they need either:

- CORS on the media host: `Access-Control-Allow-Origin` for the site's origin on
  `data/*/v2/*`, or
- a same-origin route. The `/frames/*` rewrite in draft PRs #2 and #3 already
  proxies `images.pregonerosdemedellin.com`, and the mobile app uses it by default.

Serve `.af` files as `application/octet-stream`. They are already compressed,
so they don't need gzip.
