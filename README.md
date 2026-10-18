# ClinicPad landing page (static)
- Rename the product: edit `js/config.js` (`BRAND`).
- Texts EN/ES: `js/i18n.js`. 3D scene: `js/scene.js`. UI (checklist demo, form, reveals): `js/ui.js`.
- Serve: `python3 -m http.server 8787` in this folder. Deploy: upload everything except `node_modules/`, `test/`, `shots/`.
- URL flags: `?lite` (low-power 3D), `?no3d` (CSS fallback), `?lang=es`.
- Tests: `node test/shoot.mjs [url] [--mobile]`, `node test/interact.mjs`.
