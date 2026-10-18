#!/usr/bin/env python3
"""Packs compressed CC0 assets into a few JSON packs ({name: base64}) so they can be committed
through a text-only API and fetched progressively (hero -> interior -> river -> sky4k)."""
import base64, json, os
SRC = "/workspace/clinicpad-src-assets/out"
PACKS = {  # each pack kept under ~2.4 MB so it fits one API request
  "hero1": ["symmetrical_garden_02_1k.hdr"],
  "hero2": ["garden_bg_2k.webp", "marble_diff.webp", "marble_nor.webp", "marble_rough.webp", "oak_diff.webp", "oak_nor.webp", "oak_rough.webp"],
  "interior1": ["white_studio_06_1k.hdr"],
  "interior2": ["potted_plant_02.glb", "fern_02.glb"],
  "river1": ["grass_diff.webp", "grass_nor.webp", "pebbles_diff.webp", "pebbles_nor.webp", "water_nor1.webp", "water_nor2.webp"],
  "river2": ["rock_moss_set_01.glb", "shrub_01.glb"],
  "river3": ["boulder_01.glb"],
  "sky4k": ["garden_bg_4k.webp"],
}
out = os.path.join(os.path.dirname(__file__), "..", "assets")
for f in os.listdir(out):
    if f.endswith(".b64") or f.endswith(".pack.json"): os.remove(os.path.join(out, f))
for pack, names in PACKS.items():
    d = {n: base64.b64encode(open(os.path.join(SRC, n), "rb").read()).decode() for n in names}
    p = os.path.join(out, f"{pack}.pack.json"); json.dump(d, open(p, "w"), separators=(",", ":"))
    print(pack, os.path.getsize(p))
print("PACK_OF =", json.dumps({n: p for p, ns in PACKS.items() for n in ns}))
