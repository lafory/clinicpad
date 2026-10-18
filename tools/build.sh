#!/bin/bash
# Bundles the 3D scene (src/ + vendor/jsm addons) into js/scene.js. three, i18n and config stay external
# so the page shares one instance of each with main.js/ui.js.
set -e
cd "$(dirname "$0")/.."
npx esbuild src/scene.src.js --bundle --format=esm --minify --target=es2020 \
  --external:three --external:./i18n.js --external:./config.js --outfile=js/scene.js \
  --banner:js="/* ClinicPad photoreal scene — built from src/scene.src.js (three.js addons MIT, assets CC0 Poly Haven) */"
ls -l js/scene.js
