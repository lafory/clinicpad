// Photo-plate backgrounds (owner's lobby -> hallway -> river photos only) driven by scroll.
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
  drive("door", "#stage-doors", "top top", "55% top", 0.8);
  drive("enter", "#stage-doors", "55% top", "bottom top", 1);
  drive("walk", "#content", "top top", "bottom bottom", 1.2);
  drive("river", "#demo", "top bottom", "top 20%", 1.2);

  const el = (s) => document.querySelector(s);
  const hero = el("#p-hero"), hall = el("#p-hall"), river = el("#p-river");
  const heroBox = hero.querySelector(".box"), hallBox = hall.querySelector(".box"), riverBox = river.querySelector(".box");
  const veil = hero.querySelector(".veil"), bloom = el("#bloom");
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced) addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  const t0 = performance.now();

  function frame() {
    if (!shot) { mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06; }
    const time = shot ? 4 : (performance.now() - t0) / 1000;
    const r = ease(S.rise), a = ease(S.approach), d = ease(S.door), e = ease(S.enter), w = S.walk, rv = ease(S.river);
    // Only the owner's photos are used. Lobby: slow push toward its real glass doors, capped at 1.15x so it stays sharp.
    const breathe = reduced ? 0 : Math.sin(time * 0.25) * 0.006;
    const T = S.door;                                   // lobby -> hallway "walk through the doors" transition
    const tq = T < 0.5 ? 4 * T * T * T : 1 - Math.pow(-2 * T + 2, 3) / 2;
    const xf = sstep(0.22, 0.78, T);                    // crossfade weight
    const haze = Math.sin(Math.PI * clamp(T)) ** 2;     // blur / exposure bloom peaks mid-transition
    const hs = Math.min(1.15, 1.03 + breathe + r * 0.04 + a * 0.08) * (1 + tq * 1.25);   // beyond 1.15x only while blurred + fading
    heroBox.style.transformOrigin = "45.4% 30%";        // the lobby's door opening
    heroBox.style.transform = `translate3d(${-mouse.x * 10 * (1 - a)}px, ${-mouse.y * 6 * (1 - a)}px, 0) scale(${hs.toFixed(4)})`;
    veil.style.opacity = (1 - sstep(0, 0.6, S.rise)).toFixed(3);
    hero.style.opacity = (1 - xf).toFixed(3);
    hero.style.filter = haze > 0.01 ? `blur(${(haze * 7 * (0.4 + tq)).toFixed(2)}px) brightness(${(1 + haze * 0.28).toFixed(3)})` : "none";
    hero.style.visibility = xf >= 1 ? "hidden" : "visible";
    bloom.style.opacity = (haze * 0.42).toFixed(3);
    // hallway (owner's photo, its own open glass doors kept): arrives slightly too close and blurred, settles, then we walk in
    hall.style.visibility = T > 0.05 && rv < 1 ? "visible" : "hidden";
    const hsc = lerp(1.32, 1.0, tq) + e * 0.22 + w * 0.4;
    hallBox.style.transform = `translate3d(${Math.sin(w * Math.PI * 2) * 6}px, ${w * -10}px, 0) scale(${hsc.toFixed(4)})`;
    hall.style.filter = haze > 0.01 ? `blur(${(haze * 6 * (1 - tq * 0.7)).toFixed(2)}px) brightness(${(1 + haze * 0.22).toFixed(3)})` : "none";
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
