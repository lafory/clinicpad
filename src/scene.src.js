// ClinicPad — one continuous camera walk built ONLY from the owner's three photos.
// Technique: camera-projection mapping (film matte-painting style). Each photo is projected from its own
// camera onto proxy geometry (floor, walls, doors, pots, plant cards, desk, river bank). Seen from that camera
// the frame IS the photo; moving the camera gives real parallax. Hidden areas were inpainted (LaMa) from the
// same photo. The glass doors are the photo's own door pixels on sliding leaves; the river is a live
// reflective/refractive water surface whose base colour is the photo's water.
import * as THREE from "three";
import { Reflector } from "../vendor/jsm/objects/Reflector.js";
import { onLang } from "./i18n.js";
import { roundedRect, screenPatient, screenProvider } from "./screens.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const smoother = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- photo cameras (pixel coords on a 1024x576 frame) ----------
const F = 720; // focal length in px (≈71° horizontal FOV)
const HERO = { pos: V3(0, 0.75, 0), cx: 470, cy: 205, floor: 0 };
const HALL = { pos: V3(0, 1.245, -4.1), cx: 498, cy: 325, floor: 0 };
const RIVER = { pos: V3(0, 0.85, -35.5), cx: 512, cy: 250, floor: -0.35 };
const toWorld = (C, x, y, d) => V3(C.pos.x + (x - C.cx) * d / F, C.pos.y + (C.cy - y) * d / F, C.pos.z - d);
const floorDepth = (C, y) => F * (C.pos.y - C.floor) / (y - C.cy);
const WALL_Z = -6, DOOR_L = -1.06, DOOR_R = 1.017, DOOR_H = 2.75, DOOR_MID = -0.04;
const HALL_X = 1.99, HALL_H = 3.0, HALL_END = -33, WIN = { x0: -1.73, x1: 1.69, y1: 2.57 };
const BANK_Z = RIVER.pos.z - F * 1.2 / (362 - RIVER.cy), WATER_Y = RIVER.floor;

// ---------- assets: base64 JSON packs -> blob URLs ----------
const packCache = new Map();
const loadPack = (name) => { if (!packCache.has(name)) packCache.set(name, fetch(`assets/photo-${name}.pack.json`).then((r) => { if (!r.ok) throw new Error(name + " " + r.status); return r.json(); })); return packCache.get(name); };
async function packTextures(name, renderer, maxAniso) {
  const d = await loadPack(name), out = {};
  await Promise.all(Object.entries(d).map(async ([k, b64]) => {
    const mime = k.endsWith(".png") ? "image/png" : "image/webp";
    const blob = await (await fetch(`data:${mime};base64,${b64}`)).blob();
    const img = await createImageBitmap(blob, { imageOrientation: "flipY", premultiplyAlpha: "none", colorSpaceConversion: "none" });
    const t = new THREE.Texture(img); t.flipY = false;
    const isData = k.includes("_id") || k.includes("nor");
    t.colorSpace = isData ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    if (k.includes("_id")) { t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; }
    else { t.anisotropy = maxAniso; t.minFilter = THREE.LinearMipmapLinearFilter; }
    t.wrapS = t.wrapT = k.includes("nor") ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.needsUpdate = true; renderer.initTexture(t); out[k.replace(/\.(webp|png)$/, "")] = t;
  }));
  return out;
}

// ---------- projection material ----------
const projVert = `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const projFrag = `
uniform sampler2D uMap, uId; uniform mat4 uView; uniform vec4 uK, uPad, uRect, uOccl; uniform vec3 uSlide, uFallback, uShift;
uniform float uMode, uIdv, uOpacity, uGain, uUseOccl, uSoft; uniform vec3 uP0;
varying vec3 vW;
vec2 imgOf(vec3 w){ vec4 p = uView*vec4(w,1.); float iz = 1./max(-p.z, 1e-3); return vec2(uK.z + uK.x*p.x*iz, uK.w - uK.y*p.y*iz); }
vec2 texOf(vec2 img){ return vec2(img.x*uPad.x + uPad.y, 1. - (img.y*uPad.z + uPad.w)); }
// 0 = the photo camera saw this point, 1 = it did not (outside the frame or behind the door jambs)
float hidden(vec3 w, vec2 img){
  float outF = max(max(-img.x, img.x-1.), max(-img.y, img.y-1.));
  float h = smoothstep(-.004, .012, outF);
  if (uUseOccl > .5) { float t = (uOccl.x - uP0.z)/(w.z - uP0.z);
    if (t > 0. && t < 1.) { vec3 X = mix(uP0, w, t); float o = max(max(uOccl.y - X.x, X.x - uOccl.z), X.y - uOccl.w); h = max(h, smoothstep(-.03, .08, o)); } }
  return h;
}
void main(){
  vec3 w = vW - uSlide;
  vec2 img = imgOf(w), uv = texOf(img);
  // where the camera is far closer than the photo camera was, photo pixels get stretched into streaks:
  // soften them (higher mip) instead of showing smeared pixel rows
  vec2 pp = img*vec2(1500., 844.); float foot = min(length(dFdx(pp)), length(dFdy(pp)));
  float bias = clamp(-log2(max(foot, 1e-4)) - 1.6, 0., 3.5) * uSoft;
  vec4 c = texture(uMap, uv, bias);
  vec3 col = c.rgb; float a = 1.;
  if (uMode > 1.5) a = uOpacity;                                       // constant-opacity glass ghost
  else if (uMode > 0.5) {                                              // cut-out from the photo's alpha
    a = c.a * step(uRect.x, img.x) * step(img.x, uRect.z) * step(uRect.y, img.y) * step(img.y, uRect.w);
    if (uIdv > 0.) a *= step(abs(texture2D(uId, uv).r*255./50. - uIdv), .4);
    if (a < .03) discard;
  }
  float h = hidden(w, img);
  if (h > 0.) {
    // borrow the same surface a little further along (same floor tiles / wall panels) instead of a flat colour
    vec3 w2 = w + uShift; vec2 i2 = imgOf(w2); vec3 c2 = texture2D(uMap, texOf(i2)).rgb; float h2 = hidden(w2, i2);
    vec3 w3 = w + uShift*2.; vec2 i3 = imgOf(w3); vec3 c3 = texture2D(uMap, texOf(i3)).rgb; float h3 = hidden(w3, i3);
    vec3 alt = mix(c2, mix(c3, uFallback, h3), h2);
    col = mix(col, alt, h);
  }
  gl_FragColor = vec4(col*uGain, a);
  #include <colorspace_fragment>
}`;
function intrUniforms(C, pad = [1, 0, 1, 0]) {
  const view = new THREE.Matrix4().makeTranslation(-C.pos.x, -C.pos.y, -C.pos.z);
  return { uP0: { value: C.pos.clone() }, uView: { value: view }, uK: { value: new THREE.Vector4(F / 1024, F / 576, C.cx / 1024, C.cy / 576) }, uPad: { value: new THREE.Vector4(...pad) } };
}
function projMat(C, map, o = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map }, uId: { value: o.id || map }, ...intrUniforms(C, o.pad),
      uRect: { value: new THREE.Vector4(...(o.rect || [0, 0, 1, 1])) }, uOccl: { value: new THREE.Vector4(...(o.occl || [0, 0, 0, 0])) },
      uSlide: { value: new THREE.Vector3() }, uShift: { value: new THREE.Vector3(...(o.shift || [0, 0, 0])) }, uFallback: { value: new THREE.Color(o.fallback || "#d9d2c6") },
      uMode: { value: o.mode || 0 }, uSoft: { value: o.soft ?? 1 }, uIdv: { value: o.idv || 0 }, uOpacity: { value: o.opacity ?? 1 }, uGain: { value: o.gain ?? 1 }, uUseOccl: { value: o.occl ? 1 : 0 },
    },
    vertexShader: projVert, fragmentShader: projFrag, transparent: !!o.mode, depthWrite: !o.mode, side: o.side ?? THREE.FrontSide,
  });
  m.userData.setMap = (t) => { m.uniforms.uMap.value = t; }; return m;
}

// ---------- water (Reflector + flowing normals + photo base colour + foam) ----------
const WaterShader = {
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uReflOn: { value: 1 }, uTime: { value: 0 },
    uNor: { value: null }, uPhoto: { value: null }, uView: { value: new THREE.Matrix4() }, uK: { value: new THREE.Vector4() }, uPad: { value: new THREE.Vector4() },
    uRocks: { value: [] }, uSun: { value: new THREE.Vector3(-0.35, 0.55, -0.75).normalize() }, uBankZ: { value: 0 },
  },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUvR; varying vec3 vW;
    void main(){ vUvR = textureMatrix*vec4(position,1.); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform sampler2D tDiffuse, uNor, uPhoto; uniform float uReflOn, uTime, uBankZ; uniform mat4 uView; uniform vec4 uK, uPad; uniform vec4 uRocks[9]; uniform vec3 uSun;
    varying vec4 vUvR; varying vec3 vW;
    vec2 projUV(vec3 w){ vec4 p = uView*vec4(w,1.); float iz = 1./max(-p.z,1e-3); vec2 img = vec2(uK.z + uK.x*p.x*iz, uK.w - uK.y*p.y*iz); return vec2(img.x*uPad.x+uPad.y, 1.-(img.y*uPad.z+uPad.w)); }
    vec4 nor(vec2 p){ return texture2D(uNor, p); }
    void main(){
      vec2 p = vW.xz; float t = uTime;
      vec2 cur = vec2(0.28, 0.025);                              // gentle current, left -> right
      // rocks disturb the surface: faster, finer ripples just around and downstream of each rock
      float turb = 0.; float foam = 0.;
      for (int i = 0; i < 9; i++) { vec4 r = uRocks[i]; vec2 d = p - r.xy; float dist = length(d*vec2(1., 1.7)) - r.z;
        float ring = smoothstep(.1 + .12*r.w, 0., dist) * smoothstep(-.06, 0., dist);
        float trail = smoothstep(r.z*.9 + .04, 0., abs(d.y)) * smoothstep(-.05, .12, d.x) * smoothstep(.35 + .5*r.w, 0., d.x);
        foam += (ring + trail*.4) * r.w; turb += smoothstep(.9, 0., dist) * r.w; }
      float bank = smoothstep(.45, 0., uBankZ - vW.z + .05) * smoothstep(-.2, .05, uBankZ - vW.z + .05); foam += bank*.12; turb += bank*.4;
      vec4 n1 = nor(p*.16 + cur*t*.16), n2 = nor(p*.43 + vec2(.31,.17) + cur*t*.52*vec2(1.,-.6)), n3 = nor(p*1.25 + vec2(.7,.2) + cur*t*1.6);
      vec2 g = (n1.xy*2.-1.)*.55 + (n2.xy*2.-1.)*.35 + (n3.xy*2.-1.)*(.22 + .5*turb);
      vec3 N = normalize(vec3(g.x*.55, 1., g.y*.55));
      vec3 V = normalize(cameraPosition - vW);
      float fres = .02 + .98*pow(1. - max(dot(N, V), 0.), 5.);
      // refraction: the photo's own water (bed, tint, sky sheen) seen through the moving surface
      vec3 photo = texture2D(uPhoto, projUV(vW + vec3(N.x, 0., N.z)*.16)).rgb;
      vec4 ruv = vUvR; ruv.xy += N.xz*.06*ruv.w;
      vec3 refl = texture2DProj(tDiffuse, ruv).rgb;
      vec3 col = mix(photo, refl, clamp(fres*1.15, .0, .62)*uReflOn);
      vec3 H = normalize(uSun + V); col += pow(max(dot(N, H), 0.), 260.)*vec3(2.2, 2.1, 1.9) + pow(max(dot(N, H), 0.), 40.)*.05;
      float fn = n2.a*.55 + nor(p*2.1 + cur*t*1.9).a*.45;
      float fm = clamp(foam, 0., 1.) * smoothstep(.3, .58, fn + foam*.3);
      col = mix(col, vec3(.86, .9, .88), fm*.8);
      gl_FragColor = vec4(col, 1.);
      #include <colorspace_fragment>
    }`,
};

export function startScene({ lite = false, reduced = false } = {}) {
  const canvas = document.getElementById("gl");
  const isMobile = matchMedia("(max-width: 820px), (pointer: coarse)").matches;
  const shotMode = new URLSearchParams(location.search).has("shot");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  let maxDpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 1.5), dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0; // only the tablet/pencil use tone mapping
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const Q = isMobile || lite ? "sd" : "hd";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e9e2d6");
  const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 200); camera.layers.enable(1);
  const blank = new THREE.DataTexture(new Uint8Array([210, 200, 188, 255]), 1, 1); blank.colorSpace = THREE.SRGBColorSpace; blank.needsUpdate = true;
  const mats = { hero: [], heroOrig: [], hall: [], hallOrig: [], river: [] };
  const reg = (k, m) => { mats[k].push(m); return m; };
  let indoor = true; // lobby + hall meshes live on layer 1 so the river mirror (layer 0 only) never reflects the building interior
  const add = (geo, mat, rOrder = 0) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = rOrder; if (indoor) m.layers.set(1); scene.add(m); return m; };
  const quad = (a, b, c, d) => { // 4 corners (CCW seen from the front)
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g; };
  // a wall with a rectangular opening reaching the floor, as three quads (left, right, header)
  const wallWithHole = (x0, x1, y1, hx0, hx1, hy1, z) => {
    const g = [quad(V3(x0, 0, z), V3(hx0, 0, z), V3(hx0, y1, z), V3(x0, y1, z)), quad(V3(hx1, 0, z), V3(x1, 0, z), V3(x1, y1, z), V3(hx1, y1, z)), quad(V3(hx0, hy1, z), V3(hx1, hy1, z), V3(hx1, y1, z), V3(hx0, y1, z))];
    const pos = []; g.forEach((q) => { const p = q.attributes.position; const idx = q.index.array; for (const i of idx) pos.push(p.getX(i), p.getY(i), p.getZ(i)); });
    const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); out.computeVertexNormals(); return out; };
  // ======================= LOBBY (hero photo) =======================
  const heroFloor = reg("hero", projMat(HERO, blank, { fallback: "#e6e0d6", shift: [0, 0, -1.2] }));
  add(quad(V3(-8, 0, 2), V3(8, 0, 2), V3(8, 0, WALL_Z), V3(-8, 0, WALL_Z)), heroFloor);
  const heroWall = reg("hero", projMat(HERO, blank, { fallback: "#d8cdbd" }));
  add(wallWithHole(-7, 7, 4, DOOR_L, DOOR_R, DOOR_H, WALL_Z), heroWall);
  const frameMat = new THREE.MeshBasicMaterial({ color: "#5d6266" });
  add(quad(V3(DOOR_L, 0, WALL_Z), V3(DOOR_L, 0, WALL_Z - 0.2), V3(DOOR_L, DOOR_H, WALL_Z - 0.2), V3(DOOR_L, DOOR_H, WALL_Z)), frameMat);
  add(quad(V3(DOOR_R, 0, WALL_Z - 0.2), V3(DOOR_R, 0, WALL_Z), V3(DOOR_R, DOOR_H, WALL_Z), V3(DOOR_R, DOOR_H, WALL_Z - 0.2)), frameMat);
  add(quad(V3(DOOR_L, DOOR_H, WALL_Z), V3(DOOR_L, DOOR_H, WALL_Z - 0.2), V3(DOOR_R, DOOR_H, WALL_Z - 0.2), V3(DOOR_R, DOOR_H, WALL_Z)), frameMat);
  // the photo's own sliding glass doors: frame, handle and glass pixels on two leaves
  const leaves = [];
  for (const [x0, x1, s] of [[DOOR_L, DOOR_MID, -1], [DOOR_MID, DOOR_R, 1]]) {
    const u0 = (HERO.cx + x0 * F / -WALL_Z) / 1024, u1 = (HERO.cx + x1 * F / -WALL_Z) / 1024;
    const m = reg("heroOrig", projMat(HERO, blank, { mode: 1, rect: [u0 - 0.002, 0, u1 + 0.002, 1] }));
    const z = WALL_Z - 0.1;
    const mesh = add(quad(V3(x0, 0, z), V3(x1, 0, z), V3(x1, DOOR_H, z), V3(x0, DOOR_H, z)), m, 2);
    leaves.push({ m, s, w: x1 - x0 + 0.02, mesh });
  }
  // potted plants: lathe pots + plant cards, both coloured by the photo
  const potGeo = (r, h) => {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; const rr = r * (0.66 + 0.34 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 1.0)) ) * (t > 0.92 ? 0.93 : 1); pts.push(new THREE.Vector2(Math.max(0.01, rr), t * h)); }
    return new THREE.LatheGeometry(pts, 48); };
  function plant(C, kind, pot, rect, idv, potShrink = 0.96) {
    const [x0, x1, yt, yb] = pot; const d = floorDepth(C, yb); const r = (x1 - x0) / 2 * d / F * potShrink, h = (yb - yt) * d / F;
    const c = toWorld(C, (x0 + x1) / 2, yb, d); c.z -= r * 0.9; c.y = C.floor;
    const pm = reg(kind, projMat(C, blank, {}));
    const pmesh = add(potGeo(r, h), pm); pmesh.position.copy(c);
    const dc = d + r * 0.9; const [rx0, ry0, rx1, ry1] = rect;
    const card = reg(kind, projMat(C, blank, { mode: 1, rect: [rx0 / 1024, ry0 / 576, rx1 / 1024, ry1 / 576], idv }));
    const a = toWorld(C, rx0, ry1, dc), b = toWorld(C, rx1, ry1, dc), e = toWorld(C, rx1, ry0, dc), f = toWorld(C, rx0, ry0, dc);
    add(quad(a, b, e, f), card, 1);
  }
  const R = (a) => a.map((v) => v / (1500 / 1024));
  plant(HERO, "heroOrig", [-6, 79, 229, 337], R([0, 88, 150, 495]), 1);
  plant(HERO, "heroOrig", [102, 173, 270, 326], R([128, 274, 266, 479]), 2);
  plant(HERO, "heroOrig", [762, 849, 261, 317], R([1095, 258, 1262, 465]), 3);
  plant(HERO, "heroOrig", [864, 991, 227, 336], R([1166, 0, 1500, 493]), 4);

  // ======================= HALLWAY (hall photo) =======================
  const occl = [WALL_Z, DOOR_L, DOOR_R, DOOR_H];
  const hz0 = WALL_Z - 0.2;
  const hallFloor = reg("hall", projMat(HALL, blank, { occl, fallback: "#cdbba3", shift: [0, 0, -1.8] }));
  add(quad(V3(-HALL_X, 0, WALL_Z), V3(HALL_X, 0, WALL_Z), V3(HALL_X, 0, HALL_END), V3(-HALL_X, 0, HALL_END)), hallFloor);
  const hallCeil = reg("hall", projMat(HALL, blank, { occl, fallback: "#cfc8bd", shift: [0, 0, -1.8] }));
  add(quad(V3(-HALL_X, HALL_H, HALL_END), V3(HALL_X, HALL_H, HALL_END), V3(HALL_X, HALL_H, hz0), V3(-HALL_X, HALL_H, hz0)), hallCeil);
  const hallL = reg("hall", projMat(HALL, blank, { occl, fallback: "#7a5a40", shift: [0, 0, -2.6] }));
  add(quad(V3(-HALL_X, 0, hz0), V3(-HALL_X, 0, HALL_END), V3(-HALL_X, HALL_H, HALL_END), V3(-HALL_X, HALL_H, hz0)), hallL);
  const hallR = reg("hall", projMat(HALL, blank, { occl, fallback: "#ddd8d0", shift: [0, 0, -1.7] }));
  add(quad(V3(HALL_X, 0, HALL_END), V3(HALL_X, 0, hz0), V3(HALL_X, HALL_H, hz0), V3(HALL_X, HALL_H, HALL_END)), hallR);
  const hallEnd = reg("hall", projMat(HALL, blank, { fallback: "#cfc8bd" }));
  add(wallWithHole(-HALL_X, HALL_X, HALL_H, WIN.x0, WIN.x1, WIN.y1, HALL_END), hallEnd);
  const winGhost = reg("hallOrig", projMat(HALL, blank, { mode: 2, opacity: 0.1 }));
  add(quad(V3(WIN.x0, 0, HALL_END - 0.01), V3(WIN.x1, 0, HALL_END - 0.01), V3(WIN.x1, WIN.y1, HALL_END - 0.01), V3(WIN.x0, WIN.y1, HALL_END - 0.01)), winGhost, 2);
  // reception desk (travertine + black top) as a real box, coloured by the photo
  { const d0 = floorDepth(HALL, 540), x0 = 1.1, z0 = HALL.pos.z - d0, z1 = z0 - 0.82;
    const deskM = reg("hallOrig", projMat(HALL, blank, {}));
    const g = new THREE.BoxGeometry(HALL_X - x0 - 0.005, 1.0, z0 - z1); g.translate((x0 + HALL_X - 0.005) / 2, 0.5, (z0 + z1) / 2); add(g, deskM); }
  plant(HALL, "hallOrig", [287, 366, 408, 477], R([400, 468, 568, 700]), 1);
  plant(HALL, "hallOrig", [365, 415, 384, 427], R([530, 481, 636, 626]), 2);

  indoor = false;
  // ======================= RIVER (river photo, padded by outpainting) =======================
  const rPad = [1500 / 2100, 300 / 2100, 844 / 1224, 260 / 1224];
  const back = reg("river", projMat(RIVER, blank, { pad: rPad, fallback: "#9cc3e4" }));
  add(quad(V3(-16, WATER_Y - 0.02, BANK_Z), V3(16, WATER_Y - 0.02, BANK_Z), V3(16, 12, BANK_Z), V3(-16, 12, BANK_Z)), back);
  const sky = reg("river", projMat(RIVER, blank, { pad: rPad, fallback: "#9cc3e4" })); // a sky ceiling so nothing outside the photo shows
  add(quad(V3(-16, 12, BANK_Z), V3(16, 12, BANK_Z), V3(16, 12, HALL_END), V3(-16, 12, HALL_END)), sky);
  const rocks = [];
  const rockMat = new THREE.MeshBasicMaterial({ map: blank, transparent: true, alphaTest: 0.04, depthWrite: true });
  const rockCards = [];
  for (const [x0, x1, y0, y1, flip] of [[622.6, 708.6, 461.5, 532.5, 0], [712, 765, 488, 527, 1]]) {
    const d = F * (RIVER.pos.y - WATER_Y) / (Math.max(y1, 520) - RIVER.cy);
    const a = toWorld(RIVER, x0, y1 + 6, d), b = toWorld(RIVER, x1, y1 + 6, d), c = toWorld(RIVER, x1, y0, d), e = toWorld(RIVER, x0, y0, d);
    const g = quad(a, b, c, e); g.setAttribute("uv", new THREE.Float32BufferAttribute(flip ? [1, 0, 0, 0, 0, 1, 1, 1] : [0, 0, 1, 0, 1, 1, 0, 1], 2));
    rockCards.push(add(g, rockMat, 1));
    rocks.push(new THREE.Vector4((a.x + b.x) / 2, a.z - 0.06, (b.x - a.x) * 0.42, flip ? 1.1 : 1.4));
  }
  // far-bank rocks from the photo (x px on the 819-wide original) -> foam at their feet
  for (const [px0, px1, w] of [[0, 28, 0.25], [55, 105, 0.3], [390, 470, 0.4], [480, 575, 0.4], [617, 680, 0.4], [785, 819, 0.25]]) {
    const xa = (px0 * 1.25 - RIVER.cx) * (RIVER.pos.z - BANK_Z) / F, xb = (px1 * 1.25 - RIVER.cx) * (RIVER.pos.z - BANK_Z) / F;
    rocks.push(new THREE.Vector4((xa + xb) / 2, BANK_Z - 0.1, (xb - xa) * 0.42, w));
  }
  while (rocks.length < 9) rocks.push(new THREE.Vector4(0, 999, 0, 0));
  const waterGeo = new THREE.PlaneGeometry(32, BANK_Z - HALL_END < 0 ? HALL_END - BANK_Z + 0.4 : 1); waterGeo.rotateX(-Math.PI / 2);
  let water;
  if (!lite) {
    const res = isMobile ? 384 : 768;
    water = new Reflector(waterGeo, { shader: WaterShader, textureWidth: res, textureHeight: res, clipBias: 0.002 });
  } else {
    water = new THREE.Mesh(waterGeo, new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(WaterShader.uniforms), vertexShader: WaterShader.vertexShader, fragmentShader: WaterShader.fragmentShader }));
    water.material.uniforms.textureMatrix.value = new THREE.Matrix4(); water.material.uniforms.tDiffuse.value = blank; water.material.uniforms.uReflOn.value = 0;
  }
  water.position.set(0, WATER_Y, (HALL_END + BANK_Z) / 2 - 0.2); scene.add(water);
  if (water.onBeforeRender) { const ob = water.onBeforeRender.bind(water); water.onBeforeRender = (...args) => { if (reflOn) ob(...args); }; } // mirror pass only near the river
  const wu = water.material.uniforms;
  wu.uView.value = intrUniforms(RIVER).uView.value; wu.uK.value = intrUniforms(RIVER).uK.value; wu.uPad.value = new THREE.Vector4(...rPad);
  wu.uRocks.value = rocks; wu.uBankZ.value = BANK_Z; wu.uPhoto.value = blank; wu.uNor.value = blank;

  // ======================= tablet + pencil (the only CG objects) =======================
  const K = 0.16, TW = 1.7, TH = 2.4, TD = 0.06;
  const physical = (o) => new THREE.MeshPhysicalMaterial(o);
  const tabletPivot = new THREE.Group(); tabletPivot.scale.setScalar(K); scene.add(tabletPivot);
  const tablet = new THREE.Group(); tablet.position.y = TH / 2; tabletPivot.add(tablet);
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(TW, TH, 0.13), { depth: TD, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.016, bevelSegments: 5, curveSegments: 20 }); bodyGeo.translate(0, 0, -TD / 2);
  const alu = physical({ color: "#cfd3d8", metalness: 1, roughness: 0.34, anisotropy: 0.4, clearcoat: 0.15 });
  tablet.add(new THREE.Mesh(bodyGeo, alu));
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(TW - 0.012, TH - 0.012, 0.125), 20), physical({ color: "#050608", roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }));
  bezel.position.z = TD / 2 + 0.0165; tablet.add(bezel);
  const SW = TW - 0.15, SH = TH - 0.15;
  const scrCanvas = document.createElement("canvas"); scrCanvas.width = 1024; scrCanvas.height = Math.round(1024 * SH / SW);
  const scrCtx = scrCanvas.getContext("2d");
  const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = maxAniso;
  const screenGeo = new THREE.ShapeGeometry(roundedRect(SW, SH, 0.07), 12);
  { const uv = screenGeo.attributes.uv, pos = screenGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / SW + 0.5, pos.getY(i) / SH + 0.5); }
  const screenMat = physical({ color: "#000", emissive: "#ffffff", emissiveMap: scrTex, emissiveIntensity: 0.92, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.35 });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat); screenMesh.position.z = TD / 2 + 0.017; tablet.add(screenMesh);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 32), physical({ color: "#0b0c0e", roughness: 0.1, clearcoat: 1 }));
  lens.rotation.x = Math.PI / 2; lens.position.set(-TW / 2 + 0.22, TH / 2 - 0.22, -TD / 2 - 0.02); tablet.add(lens);
  let screenMode = -1, lastDraw = 0;
  function drawScreen(mode, time) { mode === 0 ? screenPatient(scrCtx, scrCanvas.width, scrCanvas.height, time) : screenProvider(scrCtx, scrCanvas.width, scrCanvas.height); scrTex.needsUpdate = true; screenMode = mode; }
  onLang(() => drawScreen(screenMode < 0 ? 0 : screenMode, performance.now() / 1000));
  const pencil = new THREE.Group(); pencil.scale.setScalar(K); scene.add(pencil);
  { const L = 1.75, Rr = 0.034, white = physical({ color: "#f4f4f2", roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.3 });
    pencil.add(new THREE.Mesh(new THREE.CylinderGeometry(Rr, Rr, L, 48), white));
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(Rr, 0.008, 0.17, 48), white); cone.position.y = -L / 2 - 0.085; pencil.add(cone);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 8), physical({ color: "#9aa1a6", roughness: 0.25 })); tip.position.y = -L / 2 - 0.172; pencil.add(tip);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(Rr, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), white); cap.scale.y = 0.35; cap.position.y = L / 2; pencil.add(cap); }
  // lighting for the CG objects comes from the lobby photo itself (photo-based environment) + a soft key from the sunlit side
  const pmrem = new THREE.PMREMGenerator(renderer);
  const key = new THREE.DirectionalLight("#fff1de", 1.4); key.position.set(-3, 4, 2); scene.add(key);
  scene.add(new THREE.HemisphereLight("#f4efe6", "#cbbfae", 0.35));
  function buildEnv(tex) {
    const es = new THREE.Scene();
    const sph = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }));
    sph.scale.x = -1; es.add(sph);
    const env = pmrem.fromScene(es, 0.03).texture; scene.environment = env; scene.environmentIntensity = 1.0;
  }

  // ---------- flash (exposure bloom when stepping through the bright garden window) ----------
  const flashEl = document.getElementById("flash");

  // ---------- scroll ----------
  const S = { rise: 0, fall: 0, approach: 0, door: 0, enter: 0, walk: 0, river: 0 };
  const { gsap, ScrollTrigger } = window;
  const drive = (k, trigger, start, end, scrub) => gsap.to(S, { [k]: 1, ease: "none", scrollTrigger: { trigger, start, end, scrub: reduced || shotMode ? true : scrub } });
  drive("rise", "#hero", "top top", "bottom top", 1.2);
  drive("fall", "#stage-rise", "18% top", "42% top", 0.8);
  drive("approach", "#stage-rise", "42% top", "bottom top", 1.4);
  drive("door", "#stage-doors", "top top", "40% top", 1.2);
  drive("enter", "#stage-doors", "20% top", "bottom top", 1.4);
  drive("walk", "#content", "top top", "bottom bottom", 1.6);
  drive("river", "#demo", "top bottom", "top top", 1.6);
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  let aspect = 1, portrait = false;
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); aspect = w / h; portrait = aspect < 0.9; }
  addEventListener("resize", resize); resize();
  // frustum = the photo's own frame (cropped to the screen aspect), with the photo's off-centre principal point
  const fr = { L: 0, R: 0, T: 0, B: 0 };
  function frustum(cx, cy, zoom) {
    let xl = -cx / F, xr = (1024 - cx) / F, yt = cy / F, yb = (cy - 576) / F; const pa = 1024 / 576;
    let w, h, xc = (xl + xr) / 2, yc = (yt + yb) / 2;
    if (aspect <= pa) { h = yt - yb; w = h * aspect; } else { w = xr - xl; h = w / aspect; }
    w *= zoom; h *= zoom;
    fr.L = xc - w / 2; fr.R = xc + w / 2; fr.T = yc + h / 2; fr.B = yc - h / 2;
    const n = camera.near; camera.projectionMatrix.makePerspective(fr.L * n, fr.R * n, fr.T * n, fr.B * n, n, camera.far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  const qHero = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.05, -0.5, 0.18, "YXZ"));
  const qStand = new THREE.Quaternion(), qFall = new THREE.Quaternion(), qTmp = new THREE.Quaternion(), qHeroPencil = new THREE.Quaternion();
  const vA = new THREE.Vector3(), pHero = new THREE.Vector3(), pStand = new THREE.Vector3(), pHeroPencil = new THREE.Vector3(), camPos = new THREE.Vector3();
  const pencilLocal = new THREE.Vector3(TW / 2 + 0.06, 0, 0), X = new THREE.Vector3(1, 0, 0);
  const clock = new THREE.Clock();
  let frames = 0, acc = 0, visible = true, lastFlash = -1, reflOn = false;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) clock.getDelta(); });
  // path: hero photo camera -> hall photo camera (just outside the doors) -> down the hall -> through the window -> river photo camera
  const Z_APPROACH = -2.3, Z_HALL = HALL.pos.z, Z_WALK = -9.4, Z_RIVER = RIVER.pos.z;
  function frame() { if (!shotMode) requestAnimationFrame(frame); if (visible) tick(); }
  function tick() {
    const dt = shotMode ? 1 / 60 : Math.min(clock.getDelta(), 0.1), time = shotMode ? 4 : clock.elapsedTime;
    if (!shotMode) { acc += dt; frames++; if (frames >= 60) { const avg = acc / frames; if (avg > 0.03 && dpr > 0.8) { dpr = Math.max(0.8, dpr - 0.2); renderer.setPixelRatio(dpr); resize(); } frames = 0; acc = 0; }
      mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04; }
    const r = smoother(S.rise), f = Math.pow(S.fall, 2.0), a = S.approach, dOpen = smoother(S.door), e = S.enter, w = S.walk, rv = S.river;

    // ---- camera path (continuous; segment speeds blend through the scrub smoothing) ----
    let z = lerp(0, -0.08, r);
    z = lerp(z, Z_APPROACH + 0.3, sstep(0, 1, a) * 0.5 + a * 0.5);
    z -= 0.3 * Math.min(S.door, 1);                      // keep creeping forward while the doors glide open
    z = lerp(z, Z_HALL, e * 0.5 + smooth(e) * 0.5);
    z += (Z_WALK - Z_HALL) * w;
    z += (Z_RIVER - Z_WALK) * smoother(rv);
    const kHall = smoother((-z - 0.08) / (-Z_HALL - 0.08));
    const kR = smoother((-(z) - (-HALL_END - 3.5)) / ((-Z_RIVER) - (-HALL_END - 3.5)));
    let y = lerp(HERO.pos.y, HALL.pos.y, kHall);
    y = lerp(y, RIVER.pos.y, smoother((-z - (-HALL_END)) / (-Z_RIVER + HALL_END)));
    const cx = lerp(lerp(HERO.cx, HALL.cx, kHall), RIVER.cx, kR), cy = lerp(lerp(HERO.cy, HALL.cy, kHall), RIVER.cy, kR);
    const par = 1 - 0.7 * kHall;
    camPos.set(mouse.x * 0.035 * par, y - mouse.y * 0.018 * par, z);
    camera.position.copy(camPos); camera.quaternion.identity(); camera.updateMatrixWorld();
    frustum(cx, cy, 0.985);

    // ---- doors: real sliding leaves, eased like an automatic door (slow start, glide, soft stop) ----
    for (const L of leaves) { const off = L.s * L.w * dOpen; L.mesh.position.x = off; L.m.uniforms.uSlide.value.set(off, 0, 0); }

    // ---- tablet + pencil, staged in front of the lobby camera ----
    const fw = fr.R - fr.L, fh = fr.T - fr.B;
    const dH = portrait ? 1.45 : 1.2;
    pHero.set(HERO.pos.x + (portrait ? (fr.L + fr.R) / 2 : fr.L + 0.72 * fw) * dH, HERO.pos.y + (fr.T - (portrait ? 0.86 : 0.56) * fh) * dH, HERO.pos.z - dH);
    const dS = Math.max(0.5, (TW * K) / ((portrait ? 0.78 : 0.34) * fw));
    pStand.set(HERO.pos.x + (fr.L + fr.R) / 2 * dS, HERO.pos.y + ((fr.T + fr.B) / 2 - (portrait ? 0.02 : 0)) * dS - TH * K / 2, HERO.pos.z - dS);
    qStand.setFromEuler(new THREE.Euler(0, -0.08 + mouse.x * 0.1 * (1 - f), 0, "YXZ"));
    qTmp.slerpQuaternions(qHero, qStand, r);
    const float = Math.sin(time * 1.2) * 0.006 * (1 - f) * (shotMode ? 0 : 1);
    qFall.setFromAxisAngle(X, f * 1.5 + (1 - r) * mouse.y * 0.05);
    tabletPivot.quaternion.copy(qTmp).multiply(qFall);
    tabletPivot.position.lerpVectors(pHero, pStand, r); tabletPivot.position.y += float - f * 0.12; tabletPivot.position.z += f * 0.22;
    tabletPivot.visible = pencil.visible = a < 0.7;
    const mode = r > 0.55 ? 1 : 0;
    if (mode !== screenMode || (mode === 0 && time - lastDraw > 0.3 && tabletPivot.visible)) { drawScreen(mode, time); lastDraw = time; }
    const b = sstep(0.25, 0.9, S.rise);
    pHeroPencil.copy(pHero).add(vA.set(-0.26, 0.05 + Math.sin(time * 1.5 + 1) * 0.004 * (shotMode ? 0 : 1), 0.18));
    qHeroPencil.setFromEuler(new THREE.Euler(1.45, 0.75, 0.12, "YXZ"));
    tablet.updateWorldMatrix(true, false); vA.copy(pencilLocal).applyMatrix4(tablet.matrixWorld); tablet.getWorldQuaternion(qTmp);
    pencil.position.lerpVectors(pHeroPencil, vA, b); pencil.position.y += Math.sin(b * Math.PI) * 0.06; pencil.position.z += Math.sin(b * Math.PI) * 0.05;
    pencil.quaternion.slerpQuaternions(qHeroPencil, qTmp, b);

    // ---- water + flash ----
    wu.uTime.value = reduced ? 2 : time;
    const refl = sstep(-14, -22, z); wu.uReflOn.value = lite ? 0 : refl; reflOn = refl > 0.001;
    const fl = Math.exp(-Math.pow((z - HALL_END + 0.4) / 1.9, 2)) * 0.82;
    if (flashEl && Math.abs(fl - lastFlash) > 0.003) { flashEl.style.opacity = fl.toFixed(3); lastFlash = fl; }
    renderer.render(scene, camera);
  }

  drawScreen(0, 0);
  // progressive but complete before reveal: lobby + hall (seen through the glass) first, then the river
  const setAll = (k, t) => mats[k].forEach((m) => m.userData.setMap(t));
  const idFor = (k, t) => mats[k].forEach((m) => { if (m.uniforms.uIdv.value > 0) m.uniforms.uId.value = t; });
  const ready = Promise.all([packTextures(`hero-${Q}`, renderer, maxAniso), packTextures(`hall-${Q}`, renderer, maxAniso)]).then(([h, l]) => {
    setAll("hero", h.hero_clean); setAll("heroOrig", h.hero_orig); idFor("heroOrig", h.hero_id);
    setAll("hall", l.hall_clean); setAll("hallOrig", l.hall_orig); idFor("hallOrig", l.hall_id);
    buildEnv(h.hero_orig);
  });
  const allLoaded = ready.then(() => packTextures(`river-${Q}`, renderer, maxAniso)).then((rt) => {
    setAll("river", rt.river_clean); wu.uPhoto.value = rt.river_clean; wu.uNor.value = rt.water_nor; rockMat.map = rt.rock; rockMat.needsUpdate = true;
    renderer.compile(scene, camera);
  }).catch((err) => console.warn("asset", err));
  ready.then(() => renderer.compile(scene, camera)).catch((err) => console.warn("asset", err));
  frame();
  ScrollTrigger.refresh();
  window.__clinicpad = { S, renderer, scene, camera, ready, allLoaded, renderOnce: () => tick() };
  return ready;
}
