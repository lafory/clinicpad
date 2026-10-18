// Photo-plate backgrounds (hero lobby -> glass doors -> hallway -> river) driven by scroll.
// Plates are clean versions of the user's mockups; stored as base64 text (text-only publishing API),
// decoded to blob URLs. One format (AVIF, else WebP) and one width per device.
const AVIF_PROBE = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAKAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAMG1kYXQSAAoIGAAGiAhoNCAyGhlHh4Yhh5555oAAAJBAyRxhSytNj1FFTqSg";
const WIDTHS = [960, 1280, 1920];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// shared scroll state (also read by the 3D tablet scene)
export const S = { rise: 0, fall: 0, approach: 0, door: 0, enter: 0, walk: 0, river: 0 };
// current river layer transform, read by the water-shimmer shader
export const L = { riverScale: 1, riverOpacity: 0, riverOrigin: [0.5, 0.62] };
export const urls = {};

let fmtP = null;
const fmt = () => (fmtP ||= new Promise((res) => { const i = new Image(); i.onload = () => res(i.width > 0 ? "avif" : "webp"); i.onerror = () => res("webp"); i.src = AVIF_PROBE; }));
function pickWidth() {
  const coverW = Math.max(innerWidth, innerHeight * 16 / 9);
  const need = coverW * Math.min(devicePixelRatio || 1, 1.25);
  return WIDTHS.find((w) => w >= need * 0.92) || WIDTHS[WIDTHS.length - 1];
}
const b64 = (file, mime) => fetch(`assets/plates/${file}.txt`).then((r) => { if (!r.ok) throw new Error(file + " " + r.status); return r.text(); })
  .then((t) => fetch(`data:${mime};base64,${t}`)).then((r) => r.blob()).then((b) => URL.createObjectURL(b));
async function loadPlate(name) {
  const f = await fmt(), w = pickWidth();
  urls[name] = await b64(`${name}-${w}.${f}`, `image/${f}`);
  return urls[name];
}
export const loadMask = () => (urls.mask ||= b64("water-mask.webp", "image/webp"));

function setImgs(name, url) {
  document.querySelectorAll(`[data-plate="${name}"]`).forEach((img) => (img.src = url));
  return Promise.all([...document.querySelectorAll(`[data-plate="${name}"]`)].map((img) => img.decode?.().catch(() => {})));
}

export function initPlates({ reduced = false } = {}) {
  const { gsap, ScrollTrigger } = window;
  const shot = new URLSearchParams(location.search).has("shot");
  const drive = (key, trigger, start, end, scrub = 1) => gsap.to(S, { [key]: 1, ease: "none", scrollTrigger: { trigger, start, end, scrub: reduced || shot ? true : scrub } });
  drive("rise", "#hero", "top top", "bottom top", 1);
  drive("fall", "#stage-rise", "18% top", "42% top", 0.4);
  drive("approach", "#stage-rise", "42% top", "bottom top", 1);
  drive("door", "#stage-doors", "5% top", "45% top", 0.8);
  drive("enter", "#stage-doors", "35% top", "bottom top", 1);
  drive("walk", "#content", "top top", "bottom bottom", 1.2);
  drive("river", "#demo", "top bottom", "top 20%", 1.2);

  const el = (s) => document.querySelector(s);
  const hero = el("#p-hero"), hall = el("#p-hall"), river = el("#p-river");
  const heroBox = hero.querySelector(".box"), hallBox = hall.querySelector(".box"), riverBox = river.querySelector(".box");
  const halfL = hero.querySelector(".half.l"), halfR = hero.querySelector(".half.r"), seam = hero.querySelector(".seam"), veil = hero.querySelector(".veil");
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced) addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  const t0 = performance.now();

  function frame() {
    if (!shot) { mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06; }
    const time = shot ? 4 : (performance.now() - t0) / 1000;
    const r = ease(S.rise), a = ease(S.approach), d = ease(S.door), e = ease(S.enter), w = S.walk, rv = ease(S.river);
    // lobby: slow breathing zoom + mouse parallax, then push toward the glass doors (door seam ~45.4% x, 31% y)
    const breathe = reduced ? 0 : Math.sin(time * 0.25) * 0.006;
    const hs = 1.03 + breathe + r * 0.06 + a * 0.62 + d * 0.2;
    heroBox.style.transformOrigin = `45.4% ${lerp(48, 33, sstep(0, 0.6, a))}%`;
    heroBox.style.transform = `translate3d(${-mouse.x * 10 * (1 - a)}px, ${-mouse.y * 6 * (1 - a)}px, 0) scale(${hs})`;
    // split-image doors: the two halves of the lobby slide apart at the door seam
    halfL.style.transform = `translate3d(${-d * 62}%,0,0)`;
    halfR.style.transform = `translate3d(${d * 62}%,0,0)`;
    seam.style.opacity = (0.6 * sstep(0.7, 1, a) * (1 - sstep(0, 0.2, d))).toFixed(3);
    veil.style.opacity = (1 - sstep(0, 0.6, S.rise)).toFixed(3);
    hero.style.opacity = (1 - sstep(0.75, 1, d)).toFixed(3);
    hero.style.visibility = d >= 1 ? "hidden" : "visible";
    // hallway behind the doors: starts slightly wide, then we walk in
    hall.style.visibility = a > 0.3 && rv < 1 ? "visible" : "hidden";
    const hsc = 1.02 + (1 - sstep(0, 1, d)) * 0.06 + e * 0.28 + w * 0.45;
    hallBox.style.transform = `translate3d(${Math.sin(w * Math.PI * 2) * 6}px, ${w * -10}px, 0) scale(${hsc})`;
    hall.style.filter = `brightness(${(1 + e * 0.04).toFixed(3)})`;
    // river: crossfade in, gentle settle
    river.style.opacity = rv.toFixed(3);
    river.style.visibility = rv > 0.001 ? "visible" : "hidden";
    L.riverScale = 1.12 - rv * 0.1 + breathe;
    L.riverOpacity = rv;
    riverBox.style.transform = `scale(${L.riverScale})`;
  }
  gsap.ticker.add(frame);
  window.__plates = { S, L, frame };

  // hero first (it gates the loader), then the rest
  const heroReady = loadPlate("hero").then((u) => setImgs("hero", u));
  const rest = heroReady.then(() => Promise.all([loadPlate("hall").then((u) => setImgs("hall", u)), loadPlate("river").then((u) => setImgs("river", u))]));
  return { heroReady, allReady: rest };
}
