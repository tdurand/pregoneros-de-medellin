# Immersive walk prototype

`index.html` turns the existing GoPro stills into a walkable 2.5D scene:

- Depth Anything V2 (small) runs in the browser (transformers.js, WebGPU, WASM fallback) on each frame.
- Each frame becomes a mesh pushed out along its view rays by that depth, using a GoPro fisheye lens model.
- Walking between two stills moves the camera forward through the first frame's mesh while crossfading into the next one, so the flipbook becomes continuous motion.
- Drag, or tilt the phone ("Look with phone"), to look around. The mouse nudges the head for parallax.
- Outside the camera's field of view, the frame's blurred edge colours are smeared around you. This is a cheap stand-in for AI panorama outpainting.

Open `/prototypes/immersive/` on a deployment. `/frames/*` is a same-origin rewrite to
`images.pregonerosdemedellin.com/data/*` (see `vercel.json`), needed because WebGL can't read cross-origin
pixels without CORS headers.

URL options:

| Option | Effect |
| --- | --- |
| `?way=<wayName>` | Start on a given street. |
| `?base=https://…/data/` | Use another frame host (it must send CORS headers). |
| `?precomputed` | Load `<way>/depth/wayNNN.png` from the frame host instead of running the model (see `precompute_depth.py`). |
| `?model=<hf id>` | Use another transformers.js depth model. |
| `?res=lowres` | Use smaller textures. |

You can also drag a folder of frames onto the page, for example frames re-extracted from the original
high-res footage.

## Where this goes next

1. **Depth parallax (this prototype).** Works with the web frames as they are. Nothing is invented, so the
   documentary stays faithful. Ship precomputed depth PNGs (about 20 KB per frame) rather than running
   the model on phones. Use Video Depth Anything or Depth Anything 3 for flicker-free depth across a street.
2. **Gaussian splats from the original video.** Undistort the fisheye footage, estimate poses
   (GLOMAP, or feed-forward models such as Depth Anything 3 or HY-World 2.0 WorldMirror), then train with
   gsplat. Play the result in Spark (three.js) along the recorded path with a little freedom to look
   and step aside. This is real 3D, but it needs the high-res video: the web stills are about one per step,
   which is too sparse. The per-frame GPS in `ways.json` can help anchor the poses.
3. **Generated worlds or 360° outpainting** (World Labs Marble, HY-World, CubeDiff). Most of what you'd see
   would be invented, and it changes from frame to frame. Use it only for a clearly labelled artistic scene,
   not the main walk.
