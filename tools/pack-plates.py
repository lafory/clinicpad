#!/usr/bin/env python3
"""Encodes the clean photo plates (src-plates/*.png, made from the user's mockups with LaMa inpainting,
see tools/masks.py + tools/lama*.py) to AVIF + WebP at 3 widths, then writes each as base64 text
(assets/plates/<name>-<w>.<fmt>.txt) because the publishing API is text-only. js/plates.js picks
one format/width per device and decodes it to a blob URL."""
import base64, io, os
from PIL import Image, ImageFilter
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "assets", "plates"); os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
total = {}
for name in ("hero", "hall", "river"):
    im = Image.open(os.path.join(ROOT, "src-plates", f"{name}.png")).convert("RGB")
    for w in (1920, 1280, 960):
        r = im.resize((w, round(w * 9 / 16)), Image.LANCZOS)
        if w > im.width: r = r.filter(ImageFilter.UnsharpMask(radius=1.2, percent=45, threshold=2))
        for fmt, kw in (("avif", dict(quality=68, speed=4)), ("webp", dict(quality=84, method=6))):
            b = io.BytesIO(); r.save(b, fmt.upper(), **kw)
            open(os.path.join(OUT, f"{name}-{w}.{fmt}.txt"), "w").write(base64.b64encode(b.getvalue()).decode())
            total[(fmt, w)] = total.get((fmt, w), 0) + b.tell()
            print(f"{name}-{w}.{fmt}", b.tell())
m = open(os.path.join(ROOT, "src-plates", "water-mask.webp"), "rb").read()
open(os.path.join(OUT, "water-mask.webp.txt"), "w").write(base64.b64encode(m).decode())
print({f"{k[0]}-{k[1]}": v for k, v in total.items()})
