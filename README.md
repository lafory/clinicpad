# ClinicPad landing page (static)
- Rename the product: edit `js/config.js` (`BRAND`).
- Texts EN/ES: `js/i18n.js`. Photoreal 3D scene: `js/scene.js` (tablet screens: `js/screens.js`). UI (checklist demo, form, reveals): `js/ui.js`.
- 3D: Three.js r169 PBR + HDRI lighting (Poly Haven CC0), ACES tone mapping, soft shadows, transmission glass, Water2 river, bokeh DOF + bloom (desktop).
- Assets live in `assets/*.b64` (base64 of WebP / HDR / meshopt GLB) and load progressively: hero → interior → river. Credits: `assets/CREDITS.md`.
- Serve: `python3 -m http.server 8787` in this folder.
- URL flags: `?lite` (low-power: no post-processing/shadows, simple water), `?no3d` (CSS fallback), `?lang=es`, `?shot` (single-frame mode for automated screenshots).
- `app/` is the separate prototype — not part of this landing build.
