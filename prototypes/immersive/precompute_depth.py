"""Precompute depth maps for a street so the browser doesn't run the model.

Writes <out>/<way>/depth/wayNNN.png (8-bit grayscale, 255 = nearest), which the
prototype loads with ?precomputed. Serve <out> at the prototype's frame base.

    pip install torch transformers pillow
    python precompute_depth.py --frames data/ --out data/ --way plazabotero-start-carabobo

--frames must contain <way>/highres/wayNNN.jpg (the same layout as the image CDN).
For flicker-free depth over a whole street, swap the model for Video Depth
Anything or Depth Anything 3, which see several frames at once.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from transformers import pipeline


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--way", required=True, action="append")
    ap.add_argument("--model", default="depth-anything/Depth-Anything-V2-Base-hf")
    ap.add_argument("--width", type=int, default=512, help="width of the saved depth PNG")
    args = ap.parse_args()

    depth = pipeline("depth-estimation", model=args.model)
    for way in args.way:
        src = args.frames / way / "highres"
        dst = args.out / way / "depth"
        dst.mkdir(parents=True, exist_ok=True)
        frames = sorted(src.glob("way*.jpg"))
        for i, f in enumerate(frames):
            d = np.asarray(depth(Image.open(f).convert("RGB"))["predicted_depth"], dtype=np.float32).squeeze()
            # normalise with a fixed percentile window so brightness doesn't pump frame to frame
            lo, hi = np.percentile(d, 1), np.percentile(d, 99.5)
            d = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
            img = Image.fromarray((d * 255).astype(np.uint8))
            h = round(args.width * img.height / img.width)
            img.resize((args.width, h), Image.BILINEAR).save(dst / f.name.replace(".jpg", ".png"))
            print(f"{way} {i + 1}/{len(frames)}", end="\r")
        print()


if __name__ == "__main__":
    main()
