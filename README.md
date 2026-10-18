# ClinicPad landing page (static)
- Rename the product: edit `js/config.js` (`BRAND`).
- Texts EN/ES: `js/i18n.js`. UI (checklist demo, form, reveals): `js/ui.js`.
- Photoreal 3D scene source: `src/scene.src.js` (+ `src/screens.js` for the tablet screens). `js/scene.js` is the built bundle:
  `npm i three@0.169.0 esbuild`, copy `node_modules/three/examples/jsm` to `vendor/jsm`, then run `tools/build.sh`.
- 3D: Three.js r169 PBR + HDRI lighting, ACES tone mapping, soft shadows, transmission glass doors, Water2 river with flowing normal maps, bokeh DOF + bloom (desktop).
- Assets: `assets/*.pack.json` = base64 of WebP textures, 1K HDRIs and meshopt GLB models (Poly Haven, CC0). Loaded progressively: hero → interior → river → 4K sky. Rebuild with `tools/pack-assets.py`. Credits: `assets/CREDITS.md`.
- URL flags: `?lite` (low-power: no post-processing/shadows, simple water), `?no3d` (CSS fallback), `?lang=es`, `?shot` (single-frame mode for automated screenshots).
- `app/` is the separate prototype; it is not part of the landing build.
