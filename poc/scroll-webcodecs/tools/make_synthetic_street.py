"""Render a synthetic street walk as numbered JPEG stills (wayNNN.jpg).

The real stills live on images.pregonerosdemedellin.com, which the benchmark
environment could not reach. This produces a stand-in with the same layout
(lowres/ + highres/ folders, 3 stills per metre, plus a near-lossless
master/ used as the quality reference) and deliberately busy
textures plus sensor noise, so video compression is not flattered.

usage: python3 make_synthetic_street.py <out_dir> [nb_stills=378] [width=1000]
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

rng = np.random.default_rng(42)
np.seterr(all="ignore")  # rays parallel to a wall divide by zero; masked out below


def facade(length_px, height_px):
    img = Image.new("RGB", (length_px, height_px))
    d = ImageDraw.Draw(img)
    x = 0
    while x < length_px:
        w = int(rng.integers(180, 420))
        base = tuple(int(c) for c in rng.integers(60, 230, 3))
        d.rectangle([x, 0, x + w, height_px], fill=base)
        # windows, doors, signs
        for _ in range(int(rng.integers(6, 18))):
            wx = x + int(rng.integers(0, w - 20))
            wy = int(rng.integers(0, height_px - 30))
            ww, wh = int(rng.integers(12, 60)), int(rng.integers(15, 70))
            col = tuple(int(c) for c in rng.integers(0, 255, 3))
            d.rectangle([wx, wy, wx + ww, wy + wh], fill=col, outline=(20, 20, 20))
        x += w
    arr = np.asarray(img).astype(np.int16)
    arr += rng.integers(-10, 10, arr.shape, dtype=np.int16)  # plaster grain
    # a touch of blur, like a GoPro frame after lens softness and downscaling
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    return np.asarray(img)


def ground(size):
    arr = rng.integers(90, 150, (size, size, 1)).repeat(3, 2).astype(np.int16)
    arr[::64, :, :] = 60
    arr[:, ::64, :] = 60
    img = Image.fromarray(arr.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    return np.asarray(img)


def render(W, H, cam_z, shake, walls, gtex):
    fx = W * 0.55
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = (xs - W / 2) / fx + shake[0]
    dy = -(ys - H / 2) / fx + shake[1]
    out = np.zeros((H, W, 3), np.uint8)
    # sky gradient
    out[:] = np.stack([150 + ys / H * 60, 180 + ys / H * 40, 220 + 0 * ys], -1).astype(np.uint8)
    cam_y, half_w, wall_h = 1.6, 6.0, 14.0
    best_t = np.full((H, W), np.inf, np.float32)
    for side, tex in ((-1, walls[0]), (1, walls[1])):
        with np.errstate(divide="ignore", invalid="ignore"):
            t = (side * half_w) / dx
        hy = cam_y + t * dy
        ok = (t > 0) & (hy > 0) & (hy < wall_h)
        z = cam_z + t
        u = (z * 40).astype(np.int64) % tex.shape[1]
        v = ((wall_h - hy) / wall_h * (tex.shape[0] - 1)).clip(0, tex.shape[0] - 1).astype(np.int64)
        m = ok & (t < best_t)
        out[m] = tex[v[m], u[m]]
        best_t[m] = t[m]
    with np.errstate(divide="ignore", invalid="ignore"):
        t = -cam_y / dy
    m = (t > 0) & (t < best_t)
    gx = ((dx * t) * 40).astype(np.int64) % gtex.shape[1]
    gz = ((cam_z + t) * 40).astype(np.int64) % gtex.shape[0]
    out[m] = gtex[gz[m], gx[m]]
    noise = rng.normal(0, 1.5, out.shape)
    return np.clip(out + noise, 0, 255).astype(np.uint8)


def main():
    out_dir = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 378
    W = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
    H = int(W * 9 / 16) // 2 * 2
    for sub in ("master", "highres", "lowres"):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)
    walls = (facade(8000, 560), facade(8000, 560))
    gtex = ground(1024)
    for i in range(n):
        z = i / 3.0  # ~3 stills per metre, as on plazabotero-start-carabobo
        shake = (0.01 * np.sin(i * 0.9), 0.008 * np.sin(i * 1.7))
        frame = Image.fromarray(render(W, H, z, shake, walls, gtex))
        # master = near-lossless reference for quality (SSIM) comparisons
        frame.save(os.path.join(out_dir, "master", "way%03d.jpg" % i), quality=97)
        frame.save(os.path.join(out_dir, "highres", "way%03d.jpg" % i), quality=80)
        frame.resize((W // 2, H // 2), Image.LANCZOS).save(
            os.path.join(out_dir, "lowres", "way%03d.jpg" % i), quality=75)
    print("wrote %d stills to %s" % (n, out_dir))


if __name__ == "__main__":
    main()
