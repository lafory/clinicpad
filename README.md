# ClinicPad landing page (static)
- Rename the product: edit `js/config.js` (`BRAND`).
- Texts EN/ES: `js/i18n.js`. UI (checklist demo, form, reveals): `js/ui.js`.
- Backgrounds: real photo plates (lobby, hallway, river) made from the owner's mockups: UI baked into the mockups was removed with LaMa inpainting (`tools/masks.py`, `tools/lama.py`, `tools/lama2.py`), then encoded to AVIF + WebP at 960/1280/1920 px (`tools/pack-plates.py`). They are stored as base64 text in `assets/plates/` (the publishing API is text-only); `js/plates.js` picks one format and width per device, and drives the scroll story (gentle zoom capped at ~1.15x, a blurred bloom crossfade from the lobby doors into the hallway photo, hallway walk, river crossfade); every background pixel comes from the owner's three photos.
- 3D: `src/scene.src.js` (+ `src/screens.js`) → `js/scene.js` via `tools/build.sh` (esbuild, three external). It draws only the tablet + pencil (transparent canvas with a floor shadow) and a water-shimmer shader over the river plate.
- URL flags: `?lite` (no shadows, no water shimmer), `?no3d` (photo plates + CSS tablet), `?lang=es`, `?shot` (deterministic frames for screenshots).
- `assets/*.pack.json` are from the previous all-3D version and are no longer loaded.
- `app/` is the separate prototype; it is not part of the landing build.
