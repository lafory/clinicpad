import { initUI } from "./ui.js";
import { initPlates } from "./plates.js";

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
const plates = initPlates({ reduced });
const heroShown = Promise.race([plates.heroReady, new Promise((r) => setTimeout(r, 6000))]).catch((e) => console.warn("plates", e));

if (params.has("no3d") || !webglOK()) {
  document.documentElement.classList.add("no3d");
  heroShown.then(done);
} else {
  import("./scene.js")
    .then((m) => { const r = m.startScene({ lite: lowPower, reduced }); return Promise.all([heroShown, Promise.race([r, new Promise((res) => setTimeout(res, 4500))])]); })
    .then(done)
    .catch((err) => { console.warn("3D disabled:", err); document.documentElement.classList.add("no3d"); heroShown.then(done); });
}
window.__platesReady = plates.allReady;

// fallback: hide the CSS tablet once we leave the hero
addEventListener("scroll", () => {
  if (!document.documentElement.classList.contains("no3d")) return;
  document.documentElement.classList.toggle("past-hero", scrollY > innerHeight * 1.2);
}, { passive: true });
