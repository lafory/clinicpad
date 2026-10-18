import { initUI } from "./ui.js";

const params = new URLSearchParams(location.search);
function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}

window.gsap.registerPlugin(window.ScrollTrigger);
initUI();

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowPower =
  params.has("lite") ||
  navigator.connection?.saveData === true ||
  (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

const done = () => document.getElementById("loader").classList.add("gone");

if (params.has("no3d") || !webglOK()) {
  document.documentElement.classList.add("no3d");
  done();
} else {
  import("./scene.js")
    .then((m) => { const r = m.startScene({ lite: lowPower, reduced }); Promise.race([r, new Promise((res) => setTimeout(res, 4500))]).then(done); })
    .catch((err) => { console.warn("3D disabled:", err); document.documentElement.classList.add("no3d"); done(); });
}

// fallback: show the CSS river near the bottom of the page
addEventListener("scroll", () => {
  if (!document.documentElement.classList.contains("no3d")) return;
  const demo = document.getElementById("demo");
  document.documentElement.classList.toggle("at-river", demo.getBoundingClientRect().top < innerHeight * 0.6);
}, { passive: true });
