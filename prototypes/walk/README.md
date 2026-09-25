# Walk comparison

`/prototypes/walk/` compares ways of walking a street. All modes walk exactly like the 2015 site. The page is really tall, native scroll moves you (100 px = 1 m), and the loop (same easing as `app/views/streetwalk.js`) swaps the `src` of one `<img>` between stills that are already loaded. Nothing else runs while you move.

| Mode | What it adds |
| --- | --- |
| A · Original | Nothing. It rebuilds the production walk as a baseline. |
| B · Depth on stop | After 0.7 s without scrolling, the high-res still fades into a WebGL depth mesh (Depth Anything V2 in a Web Worker) with a slow drift. Drag or tilt the phone to look around. Any scroll hides it instantly. |
| C · Denser frames | Two generated frames between each pair of stills for the first 150 Plaza Botero stills (`interp/`). |
| D · Old depth walk | The earlier `/prototypes/immersive/` walk, in 3D the whole time. |

`?mode=flat|depth|interp`, `?way=<wayName>`, `?base=<frame host>` and `?hfov=<degrees>` are all supported.

## The in-between frames

`interp/` was made by `make_interp.py` with classic optical flow (OpenCV DIS, bidirectional warp and blend), because RIFE and FILM weights couldn't be downloaded from the build environment. They are 500×281 JPEGs, 13 MB for 448 frames. A learned model (RIFE 4.x) would handle the hard cases better. Those hard cases are the people close to the camera: stills are about 30 cm apart, so nearby pedestrians move a lot between two stills and ghost in the in-betweens. The background interpolates well, with a median motion of about 2 px between stills.

This is a sample for comparison. Don't ship it as is.
