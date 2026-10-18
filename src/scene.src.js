// ClinicPad — photoreal scroll scene (PBR + HDRI + soft shadows + DOF). Assets: Poly Haven CC0.
import * as THREE from "three";
import { GLTFLoader } from "../vendor/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "../vendor/jsm/loaders/RGBELoader.js";
import { MeshoptDecoder } from "../vendor/jsm/libs/meshopt_decoder.module.js";
import { Water } from "../vendor/jsm/objects/Water2.js";
import { GroundedSkybox } from "../vendor/jsm/objects/GroundedSkybox.js";
import { EffectComposer } from "../vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "../vendor/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "../vendor/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "../vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "../vendor/jsm/postprocessing/OutputPass.js";
import { RectAreaLightUniformsLib } from "../vendor/jsm/lights/RectAreaLightUniformsLib.js";
import { BRAND } from "./config.js";
import { onLang } from "./i18n.js";
import { roundedRect, drawLogo, screenPatient, screenProvider } from "./screens.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ---------- asset loading (assets are base64 text files, decoded to blob URLs) ----------
const MIME = { hdr: "application/octet-stream", webp: "image/webp", glb: "model/gltf-binary" };
const PACK_OF = {"symmetrical_garden_02_1k.hdr": "hero1", "garden_bg_2k.webp": "hero2", "marble_diff.webp": "hero2", "marble_nor.webp": "hero2", "marble_rough.webp": "hero2", "oak_diff.webp": "hero2", "oak_nor.webp": "hero2", "oak_rough.webp": "hero2", "white_studio_06_1k.hdr": "interior1", "potted_plant_02.glb": "interior2", "fern_02.glb": "interior2", "grass_diff.webp": "river1", "grass_nor.webp": "river1", "pebbles_diff.webp": "river1", "pebbles_nor.webp": "river1", "water_nor1.webp": "river1", "water_nor2.webp": "river1", "rock_moss_set_01.glb": "river2", "shrub_01.glb": "river2", "boulder_01.glb": "river3", "garden_bg_4k.webp": "sky4k"}; // asset -> pack file
const packs = new Map(), blobCache = new Map();
const pack = (p) => { if (!packs.has(p)) packs.set(p, fetch(`assets/${p}.pack.json`).then((r) => { if (!r.ok) throw new Error(p + " " + r.status); return r.json(); })); return packs.get(p); };
function assetURL(name) {
  if (!blobCache.has(name)) {
    blobCache.set(name, pack(PACK_OF[name]).then((d) => fetch(`data:${MIME[name.split(".").pop()]};base64,${d[name]}`)).then((r) => r.blob()).then((b) => URL.createObjectURL(b)));
  }
  return blobCache.get(name);
}

// box-projected UVs in meters so one tiling texture can be shared by every mesh
function worldUV(geo, tile = 1, rot = false) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); } else if (ay >= az) { u = p.getX(i); v = p.getZ(i); } else { u = p.getX(i); v = p.getY(i); }
    if (rot) [u, v] = [v, u];
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true; return geo;
}

export function startScene({ lite = false, reduced = false } = {}) {
  const canvas = document.getElementById("gl");
  const isMobile = matchMedia("(max-width: 820px), (pointer: coarse)").matches;
  const hq = !lite && !isMobile;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !hq && !lite, powerPreference: "high-performance" });
  let maxDpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, hq ? 1.5 : 1.5);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#cfe3ee");
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400);

  // ---------- texture slots (filled lazily) ----------
  const texLoader = new THREE.TextureLoader();
  const T = {};
  async function tex(name, { srgb = false, repeat = true } = {}) {
    if (T[name]) return T[name];
    const url = await assetURL(name);
    const t = await texLoader.loadAsync(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
    return (T[name] = t);
  }
  const setMaps = (mat, maps) => { Object.assign(mat, maps); mat.needsUpdate = true; };

  // ---------- materials ----------
  const physical = (o) => new THREE.MeshPhysicalMaterial(o);
  const M = {
    marbleFloor: physical({ color: "#f3f1ee", roughness: 0.55, clearcoat: lite ? 0 : 0.7, clearcoatRoughness: 0.06 }),
    marbleWall: new THREE.MeshStandardMaterial({ color: "#f1efec", roughness: 0.7 }),
    marbleDark: new THREE.MeshStandardMaterial({ color: "#4a4744", roughness: 0.5 }),
    oak: new THREE.MeshStandardMaterial({ color: "#c79a6b", roughness: 0.8 }),
    plaster: new THREE.MeshStandardMaterial({ color: "#f3efe9", roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: "#f7f5f1", roughness: 0.95 }),
    steel: physical({ color: "#c9cdd2", metalness: 1, roughness: 0.3, anisotropy: 0.6 }),
    gold: physical({ color: "#d6b07a", metalness: 1, roughness: 0.22 }),
    glass: lite
      ? new THREE.MeshStandardMaterial({ color: "#dff1f2", metalness: 0.2, roughness: 0.04, transparent: true, opacity: 0.22, depthWrite: false })
      : physical({ color: "#f2fbfb", metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.02, ior: 1.5, specularIntensity: 1 }),
    leather: physical({ color: "#e6ddd0", roughness: 0.62, sheen: 0.6, sheenColor: new THREE.Color("#fff6ea") }),
    cove: new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffe6c4", emissiveIntensity: 6 }),
    downlight: new THREE.MeshStandardMaterial({ color: "#000", emissive: "#fff3e2", emissiveIntensity: 9 }),
    grass: new THREE.MeshStandardMaterial({ color: "#7e9a5c", roughness: 1 }),
    pebbles: new THREE.MeshStandardMaterial({ color: "#a39c90", roughness: 0.95 }),
    bed: new THREE.MeshStandardMaterial({ color: "#5a5546", roughness: 1 }),
  };
  // phase 1 textures
  const loadP1 = Promise.all([
    tex("marble_diff.webp", { srgb: true }), tex("marble_nor.webp"), tex("marble_rough.webp"),
    tex("oak_diff.webp", { srgb: true }), tex("oak_nor.webp"), tex("oak_rough.webp"),
  ]).then(([md, mn, mr, od, on, or]) => {
    setMaps(M.marbleFloor, { map: md, normalMap: mn, roughnessMap: mr, roughness: 0.5 });
    setMaps(M.marbleWall, { map: md, normalMap: mn, roughnessMap: mr, roughness: 0.8 });
    setMaps(M.marbleDark, { map: md, normalMap: mn, roughnessMap: mr });
    setMaps(M.oak, { map: od, normalMap: on, roughnessMap: or, color: new THREE.Color("#e2b98d"), roughness: 1 });
    M.marbleFloor.normalScale.set(0.4, 0.4);
  });

  // ---------- environment ----------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = { garden: null, studio: null };
  const rgbe = new RGBELoader();
  const loadHdr = (name) => assetURL(name).then((u) => rgbe.loadAsync(u)).then((t) => { t.mapping = THREE.EquirectangularReflectionMapping; const e = pmrem.fromEquirectangular(t).texture; t.dispose(); return e; });
  const SKY_ROT_HERO = -Math.PI / 2, SKY_ROT_RIVER = Math.PI / 2 + (+(new URLSearchParams(location.search).get("skyrot") ?? -1.9));
  let skybox = null; const SKY_H = 7;
  const loadSky = Promise.all([loadHdr("symmetrical_garden_02_1k.hdr"), tex("garden_bg_2k.webp", { srgb: true, repeat: false })]).then(([e, bg]) => {
    env.garden = e; scene.environment = e;
    bg.mapping = THREE.EquirectangularReflectionMapping;
    skybox = new GroundedSkybox(bg, SKY_H, 220, 96);
    skybox.material.toneMapped = true; skybox.material.fog = false;
    skybox.position.y = SKY_H - 0.02; scene.add(skybox);
    scene.background = null;
  });

  // ---------- lights ----------
  RectAreaLightUniformsLib.init();
  const hemi = new THREE.HemisphereLight("#eaf3ff", "#d9cfc0", lite ? 1.1 : 0.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff1dc", 3.2);
  sun.castShadow = !lite; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60 });
  scene.add(sun, sun.target);
  const sunDir = new THREE.Vector3();
  function setSun(rot) { // sun position in the HDRI (u≈0.6, elevation ≈ 60°), rotated like the skybox
    const az = 0.1 * Math.PI * 2, el = THREE.MathUtils.degToRad(58);
    sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  }

  // ---------- helpers ----------
  const shadowy = (m, cast = true, recv = true) => { m.castShadow = cast && !lite; m.receiveShadow = recv && !lite; return m; };
  const box = (w, h, d, mat, x, y, z, { tile = 0, parent = scene, cast = true, rot = false } = {}) => {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); if (tile) worldUV(g, tile, rot); g.translate(-x, -y, -z);
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); parent.add(m); return shadowy(m, cast);
  };
  const plane = (w, h, mat, x, y, z, rx = 0, ry = 0, { tile = 0, parent = scene, rot = false } = {}) => {
    const g = new THREE.PlaneGeometry(w, h); if (tile) { const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) { let u = (p.getX(i) + x) / tile, v = (p.getY(i) + (rx ? -z : y)) / tile; if (rot) [u, v] = [v, u]; uv.setXY(i, u, v); } }
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); parent.add(m); m.receiveShadow = !lite; return m;
  };

  // ---------- tablet + pencil ----------
  const TW = 1.7, TH = 2.4, TD = 0.06;
  const tabletPivot = new THREE.Group(); scene.add(tabletPivot);
  const tablet = new THREE.Group(); tablet.position.y = TH / 2; tabletPivot.add(tablet);
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(TW, TH, 0.13), { depth: TD, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.016, bevelSegments: 5, curveSegments: 20 });
  bodyGeo.translate(0, 0, -TD / 2);
  const alu = physical({ color: "#cfd3d8", metalness: 1, roughness: 0.34, anisotropy: 0.4, clearcoat: 0.15 });
  tablet.add(shadowy(new THREE.Mesh(bodyGeo, alu)));
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(TW - 0.012, TH - 0.012, 0.125), 20), physical({ color: "#050608", roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }));
  bezel.position.z = TD / 2 + 0.0165; tablet.add(bezel);
  const SW = TW - 0.15, SH = TH - 0.15;
  const scrCanvas = document.createElement("canvas"); scrCanvas.width = 1024; scrCanvas.height = Math.round(1024 * SH / SW);
  const scrCtx = scrCanvas.getContext("2d");
  const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = maxAniso;
  const screenGeo = new THREE.ShapeGeometry(roundedRect(SW, SH, 0.07), 12);
  { const uv = screenGeo.attributes.uv, pos = screenGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / SW + 0.5, pos.getY(i) / SH + 0.5); }
  // glossy screen: black glass with an emissive display under a clear coat that reflects the HDRI
  const screenMat = physical({ color: "#000", emissive: "#ffffff", emissiveMap: scrTex, emissiveIntensity: 0.95, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.25 });
  const screen = new THREE.Mesh(screenGeo, screenMat); screen.position.z = TD / 2 + 0.017; tablet.add(screen);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 32), physical({ color: "#0b0c0e", roughness: 0.1, clearcoat: 1 }));
  lens.rotation.x = Math.PI / 2; lens.position.set(-TW / 2 + 0.22, TH / 2 - 0.22, -TD / 2 - 0.02); tablet.add(lens);
  box(0.012, 0.2, 0.025, M.steel, TW / 2 + 0.012, TH / 2 - 0.45, 0, { parent: tablet });
  let screenMode = -1, lastDraw = 0;
  function drawScreen(mode, time) { mode === 0 ? screenPatient(scrCtx, scrCanvas.width, scrCanvas.height, time) : screenProvider(scrCtx, scrCanvas.width, scrCanvas.height); scrTex.needsUpdate = true; screenMode = mode; }
  onLang(() => drawScreen(screenMode < 0 ? 0 : screenMode, performance.now() / 1000));

  const pencil = new THREE.Group(); scene.add(pencil);
  {
    const L = 1.75, R = 0.034, white = physical({ color: "#f4f4f2", roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.3 });
    pencil.add(shadowy(new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 48), white)));
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(R, 0.008, 0.17, 48), white); cone.position.y = -L / 2 - 0.085; pencil.add(shadowy(cone));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 8), physical({ color: "#9aa1a6", roughness: 0.25 })); tip.position.y = -L / 2 - 0.172; pencil.add(tip);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), white); cap.scale.y = 0.35; cap.position.y = L / 2; pencil.add(cap);
    const flat = box(0.006, L * 0.92, R * 1.1, physical({ color: "#ecedeb", roughness: 0.25 }), R - 0.003, 0, 0, { parent: pencil }); void flat;
  }

  // ---------- luxury entrance (plaza + facade) ----------
  const DOOR_Z = -10, OW = 3.6, OH = 3.2;
  plane(46, 26, M.marbleFloor, 0, 0, DOOR_Z + 13, -Math.PI / 2, 0, { tile: 2.4 });
  box(10, 0.16, 1.6, M.marbleFloor, 0, 0.08, DOOR_Z + 0.8, { tile: 2.4, cast: false }); // entrance step
  // marble-clad wings
  box(12, 7, 0.6, M.marbleWall, -(OW / 2 + 2.6 + 6), 3.5, DOOR_Z - 0.1, { tile: 3 });
  box(12, 7, 0.6, M.marbleWall, OW / 2 + 2.6 + 6, 3.5, DOOR_Z - 0.1, { tile: 3 });
  box(OW + 5.2, 7 - 4.6, 0.6, M.marbleWall, 0, 4.6 + (7 - 4.6) / 2, DOOR_Z - 0.1, { tile: 3 });
  // oak slat feature walls flanking the door
  for (const s of [-1, 1]) {
    box(2.6, 4.6, 0.3, M.marbleDark, s * (OW / 2 + 1.3), 2.3, DOOR_Z - 0.05, { tile: 2 });
    for (let i = 0; i < 11; i++) box(0.16, 4.5, 0.12, M.oak, s * (OW / 2 + 0.2 + i * 0.22), 2.3, DOOR_Z + 0.16, { tile: 1.5, rot: true });
    box(0.03, 4.6, 0.05, M.gold, s * (OW / 2 + 2.62), 2.3, DOOR_Z + 0.2);
  }
  box(OW + 0.4, 4.6 - OH, 0.4, M.oak, 0, OH + (4.6 - OH) / 2, DOOR_Z + 0.05, { tile: 1.5 });
  // brushed steel door frame
  box(0.12, OH, 0.5, M.steel, -OW / 2 - 0.06, OH / 2, DOOR_Z + 0.25);
  box(0.12, OH, 0.5, M.steel, OW / 2 + 0.06, OH / 2, DOOR_Z + 0.25);
  box(OW + 0.24, 0.22, 0.5, M.steel, 0, OH + 0.11, DOOR_Z + 0.25);
  // canopy with cove light and downlights
  box(9.2, 0.28, 3.2, M.plaster, 0, 4.75, DOOR_Z + 1.6, { tile: 2 });
  box(9.24, 0.06, 0.04, M.gold, 0, 4.64, DOOR_Z + 3.2);
  box(8.4, 0.02, 0.06, M.cove, 0, 4.6, DOOR_Z + 3.05, { cast: false });
  for (let i = -2; i <= 2; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), M.downlight); d.rotation.x = Math.PI / 2; d.position.set(i * 1.7, 4.605, DOOR_Z + 1.7); scene.add(d); }
  if (!lite) { const ra = new THREE.RectAreaLight("#ffe7c7", 6, 8, 2.4); ra.position.set(0, 4.58, DOOR_Z + 1.6); ra.lookAt(0, 0, DOOR_Z + 1.6); scene.add(ra); }
  // brand sign: gold lettering on marble
  const signC = document.createElement("canvas"); signC.width = 2048; signC.height = 320;
  { const c = signC.getContext("2d"); c.clearRect(0, 0, 2048, 320); const g = c.createLinearGradient(0, 40, 0, 260); g.addColorStop(0, "#f4dcae"); g.addColorStop(0.5, "#c9a063"); g.addColorStop(1, "#e9cf9c");
    c.fillStyle = g; c.font = `300 180px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(BRAND.toUpperCase().split("").join(" "), 1024, 140);
    c.font = `400 54px ${FONT}`; c.fillText("PRIVATE CLINIC SOFTWARE  ·  WELCOME  ·  BIENVENIDOS", 1024, 270); }
  const signTex = new THREE.CanvasTexture(signC); signTex.colorSpace = THREE.SRGBColorSpace; signTex.anisotropy = maxAniso;
  const sign = plane(6.4, 1.0, physical({ map: signTex, transparent: true, metalness: 0.9, roughness: 0.25, color: "#ffffff" }), 0, 5.75, DOOR_Z + 0.21); sign.receiveShadow = false;
  // automatic double glass doors
  const doors = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * OW / 4, 0, DOOR_Z + 0.4); scene.add(g);
    const pw = OW / 2 + 0.02;
    const gl = box(pw - 0.06, OH - 0.1, 0.02, M.glass, 0, OH / 2, 0, { parent: g, cast: false }); gl.receiveShadow = false;
    box(pw, 0.08, 0.05, M.steel, 0, 0.04, 0, { parent: g }); box(pw, 0.08, 0.05, M.steel, 0, OH - 0.04, 0, { parent: g });
    box(0.05, OH, 0.05, M.steel, s * (pw / 2 - 0.025), OH / 2, 0, { parent: g }); box(0.05, OH, 0.05, M.steel, -s * (pw / 2 - 0.025), OH / 2, 0, { parent: g });
    box(0.03, 0.9, 0.06, M.gold, -s * (pw / 2 - 0.12), 1.1, 0.04, { parent: g }); // pull bar
    doors.push({ g, s, closedX: s * OW / 4 });
  }
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ff4a4a", emissiveIntensity: 4 }));
  led.position.set(0, OH + 0.11, DOOR_Z + 0.51); scene.add(led);
  // planters
  const planterSpots = [];
  for (const s of [-1, 1]) {
    box(1.3, 0.95, 1.3, M.marbleDark, s * 5.6, 0.475, DOOR_Z + 1.6, { tile: 1.4 });
    planterSpots.push({ p: new THREE.Vector3(s * 5.6, 0.92, DOOR_Z + 1.6), sc: 2.4, kind: "plant" });
    box(0.9, 0.6, 0.9, M.marbleDark, s * 4.3, 0.3, DOOR_Z + 2.4, { tile: 1.4 });
    planterSpots.push({ p: new THREE.Vector3(s * 4.3, 0.58, DOOR_Z + 2.4), sc: 1.6, kind: "fern" });
  }

  // ---------- hallway ----------
  const HW = 5, HH = 3.4, H0 = DOOR_Z - 0.4, H1 = -60, HL = H0 - H1, HC = (H0 + H1) / 2;
  plane(HW, HL, M.marbleFloor, 0, 0.002, HC, -Math.PI / 2, 0, { tile: 2.4 });
  plane(HW, HL, M.ceiling, 0, HH, HC, Math.PI / 2);
  // left wall: oak slats with gold reveals ; right wall: plaster + doors + art
  plane(HL, HH, M.plaster, -HW / 2, HH / 2, HC, 0, Math.PI / 2);
  plane(HL, HH, M.plaster, HW / 2, HH / 2, HC, 0, -Math.PI / 2);
  for (let z = H0 - 0.6; z > H1 + 0.6; z -= 2.6) {
    box(0.06, HH - 0.3, 2.3, M.oak, -HW / 2 + 0.03, (HH - 0.3) / 2 + 0.15, z - 1.15, { tile: 1.5, rot: true, cast: false });
    box(0.02, HH - 0.3, 0.02, M.gold, -HW / 2 + 0.07, (HH - 0.3) / 2 + 0.15, z - 2.42, { cast: false });
  }
  box(0.05, 0.12, HL, M.marbleDark, HW / 2 - 0.025, 0.06, HC, { cast: false }); box(0.05, 0.12, HL, M.marbleDark, -HW / 2 + 0.025, 0.06, HC, { cast: false });
  // ceiling cove slots + downlights
  for (const s of [-1, 1]) box(0.08, 0.02, HL, M.cove, s * (HW / 2 - 0.35), HH - 0.012, HC, { cast: false });
  for (let z = H0 - 2; z > H1 + 1; z -= 3) for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), M.downlight); d.rotation.x = Math.PI / 2; d.position.set(s * 1.1, HH - 0.005, z); scene.add(d); }
  const hallLights = [];
  if (!lite) for (let i = 0; i < 4; i++) { const ra = new THREE.RectAreaLight("#fff0dc", 3.2, 1.6, 12); ra.position.set(0, HH - 0.02, H0 - 6 - i * 12); ra.lookAt(ra.position.x, 0, ra.position.z); scene.add(ra); hallLights.push(ra); }
  else for (let i = 0; i < 5; i++) { const pl = new THREE.PointLight("#fff0dc", 6, 12, 1.6); pl.position.set(0, HH - 0.3, H0 - 5 - i * 10); scene.add(pl); }
  // doors, signs, art, benches
  const roomNames = ["Consult 1", "Therapy", "Dental Suite", "Imaging", "Consult 2", "Recovery", "Dental 2", "Rehab", "Office"];
  const artCanvas = (i) => { const c = document.createElement("canvas"); c.width = 512; c.height = 700; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 512, 700); const hues = [[190, 30], [30, 40], [200, 20], [160, 25]][i % 4];
    g.addColorStop(0, `hsl(${hues[0]},${hues[1]}%,88%)`); g.addColorStop(1, `hsl(${hues[0] + 20},${hues[1]}%,62%)`); x.fillStyle = g; x.fillRect(0, 0, 512, 700);
    for (let k = 0; k < 7; k++) { x.globalAlpha = 0.18; x.fillStyle = `hsl(${hues[0] + k * 9},35%,${40 + k * 6}%)`; x.beginPath(); x.ellipse(256 + Math.sin(k + i) * 150, 350 + Math.cos(k * 1.7 + i) * 220, 160 - k * 12, 90 + k * 9, k, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  let ri = 0;
  const plantSpotsHall = [];
  for (let z = H0 - 5; z > H1 + 4; z -= 6) {
    const x = HW / 2;
    // oak door with steel frame and gold handle
    box(0.06, 2.5, 1.25, M.oak, x - 0.04, 1.25, z, { tile: 1.5, rot: true, cast: false });
    box(0.07, 2.6, 0.05, M.steel, x - 0.04, 1.3, z - 0.65, { cast: false }); box(0.07, 2.6, 0.05, M.steel, x - 0.04, 1.3, z + 0.65, { cast: false }); box(0.07, 0.05, 1.35, M.steel, x - 0.04, 2.6, z, { cast: false });
    box(0.05, 0.36, 0.03, M.gold, x - 0.1, 1.1, z - 0.48, { cast: false });
    const c = document.createElement("canvas"); c.width = 512; c.height = 128; const cx = c.getContext("2d");
    cx.fillStyle = "#1b1d20"; cx.fillRect(0, 0, 512, 128); cx.fillStyle = "#e6c58f"; cx.font = `400 54px ${FONT}`; cx.textAlign = "center"; cx.fillText(roomNames[ri % roomNames.length], 256, 84);
    const st = new THREE.CanvasTexture(c); st.colorSpace = THREE.SRGBColorSpace;
    plane(0.62, 0.155, new THREE.MeshStandardMaterial({ map: st, roughness: 0.4, metalness: 0.3 }), x - 0.075, 1.6, z + 1.05, 0, -Math.PI / 2);
    // framed art between doors
    if (ri % 2 === 0) {
      box(0.04, 1.36, 1.0, M.gold, x - 0.03, 1.75, z - 3, { cast: false });
      plane(0.92, 1.28, new THREE.MeshStandardMaterial({ map: artCanvas(ri), roughness: 0.85 }), x - 0.052, 1.75, z - 3, 0, -Math.PI / 2);
    } else {
      // bench: oak frame, leather cushion
      box(0.5, 0.1, 1.8, M.oak, -HW / 2 + 0.45, 0.42, z - 3, { tile: 1.2 });
      box(0.46, 0.08, 1.74, M.leather, -HW / 2 + 0.45, 0.51, z - 3);
      box(0.06, 0.38, 0.06, M.steel, -HW / 2 + 0.25, 0.19, z - 3.8); box(0.06, 0.38, 0.06, M.steel, -HW / 2 + 0.65, 0.19, z - 3.8);
      box(0.06, 0.38, 0.06, M.steel, -HW / 2 + 0.25, 0.19, z - 2.2); box(0.06, 0.38, 0.06, M.steel, -HW / 2 + 0.65, 0.19, z - 2.2);
    }
    if (ri % 3 === 1) plantSpotsHall.push(new THREE.Vector3(-HW / 2 + 0.55, 0, z + 0.4));
    ri++;
  }
  // reception desk just inside
  box(0.9, 1.05, 2.6, M.marbleWall, HW / 2 - 0.7, 0.525, H0 - 2.8, { tile: 1.6 });
  box(0.92, 0.05, 2.62, M.marbleDark, HW / 2 - 0.7, 1.075, H0 - 2.8, { tile: 1.6 });
  box(0.02, 0.04, 2.6, M.cove, HW / 2 - 1.16, 0.06, H0 - 2.8, { cast: false });
  // glass wall at the end of the hall, opening to the garden
  for (const s of [-1, 1]) {
    box((HW - OW) / 2, HH, 0.03, M.glass, s * (OW / 2 + (HW - OW) / 4), HH / 2, H1, { cast: false });
    box(0.06, HH, 0.1, M.steel, s * (OW / 2 + 0.03), HH / 2, H1, { cast: false });
  }
  box(HW, 0.1, 0.12, M.steel, 0, HH - 0.05, H1, { cast: false });
  // exterior shell of the building at the garden side
  box(40, 6, 0.5, M.marbleWall, -(HW / 2 + 20), 3, H1 - 0.05, { tile: 3 }); box(40, 6, 0.5, M.marbleWall, HW / 2 + 20, 3, H1 - 0.05, { tile: 3 });
  box(HW, 6 - HH, 0.5, M.marbleWall, 0, HH + (6 - HH) / 2, H1 - 0.05, { tile: 3 });
  // hallway outer shell so outdoor light/sky doesn't leak
  box(0.3, HH + 0.4, HL, M.marbleWall, -HW / 2 - 0.16, HH / 2, HC, { cast: false }); box(0.3, HH + 0.4, HL, M.marbleWall, HW / 2 + 0.16, HH / 2, HC, { cast: false });
  box(HW + 0.6, 0.3, HL, M.marbleWall, 0, HH + 0.16, HC, { cast: true });

  // ---------- garden terrace + river ----------
  const RZ0 = -67.5, RZ1 = -80.5, RW = RZ0 - RZ1, RC = (RZ0 + RZ1) / 2, WY = -0.32;
  plane(7, 4.6, M.marbleFloor, 0, 0.004, H1 - 2.3, -Math.PI / 2, 0, { tile: 2.4 });
  box(7, 0.04, 0.05, M.steel, 0, 1.02, H1 - 4.6, { cast: false });
  box(7, 1.0, 0.02, M.glass, 0, 0.5, H1 - 4.6, { cast: false });
  plane(200, RZ0 - H1 + 0.2, M.grass, 0, -0.01, (H1 + RZ0) / 2 + 0.1, -Math.PI / 2, 0, { tile: 3 });
  // pebble banks sloping into the water, river bed
  const bankGeo = (zTop, zBot, dir) => { const g = new THREE.PlaneGeometry(200, Math.abs(zTop - zBot) * 1.15, 1, 1); const m = new THREE.Mesh(g, M.pebbles); m.position.set(0, (WY - 0.4) / 2, (zTop + zBot) / 2); m.rotation.x = -Math.PI / 2 - dir * Math.atan((0.4 - WY) / Math.abs(zTop - zBot)); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 200 / 1.6, uv.getY(i) * 1.2); m.receiveShadow = !lite; scene.add(m); };
  bankGeo(RZ0, RZ0 - 1.2, 1); bankGeo(RZ1, RZ1 + 1.2, -1);
  plane(200, RW + 2, M.pebbles, 0, WY - 0.75, RC, -Math.PI / 2, 0, { tile: 1.6 });
  let water = null;
  const riverRefs = { rocks: null, shrub: null, boulder: null };

  // ---------- GLTF models ----------
  const gltf = new GLTFLoader(); gltf.setMeshoptDecoder(MeshoptDecoder);
  const model = (name) => assetURL(name).then((u) => gltf.loadAsync(u)).then((g) => { g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = !lite; o.receiveShadow = !lite; if (o.material.map) o.material.map.anisotropy = maxAniso; } }); return g.scene; });
  const place = (src, pos, scale, ry = 0) => { const o = src.clone(true); o.position.copy(pos); o.scale.setScalar(scale); o.rotation.y = ry; scene.add(o); return o; };

  async function loadInterior() {
    const [studio, plant, fern] = await Promise.all([loadHdr("white_studio_06_1k.hdr"), model("potted_plant_02.glb"), model("fern_02.glb")]);
    env.studio = studio;
    for (const s of planterSpots) place(s.kind === "plant" ? plant : fern, s.p, s.sc, rnd() * 6);
    for (const p of plantSpotsHall) place(plant, p, 1.9, rnd() * 6);
    place(plant, new THREE.Vector3(HW / 2 - 0.6, 0, H1 + 1.2), 2.0, 1);
    place(plant, new THREE.Vector3(-HW / 2 + 0.6, 0, H1 + 1.2), 2.0, 2);
    riverRefs.fern = fern;
  }
  async function loadRiver() {
    const [gd, gn, pd, pn, w1, w2] = await Promise.all([tex("grass_diff.webp", { srgb: true }), tex("grass_nor.webp"), tex("pebbles_diff.webp", { srgb: true }), tex("pebbles_nor.webp"), tex("water_nor1.webp"), tex("water_nor2.webp")]);
    setMaps(M.grass, { map: gd, normalMap: gn, color: new THREE.Color(0.62, 0.86, 0.5) });
    setMaps(M.pebbles, { map: pd, normalMap: pn, color: new THREE.Color("#ffffff") });
    if (!lite) {
      water = new Water(new THREE.PlaneGeometry(200, RW + 0.8), {
        color: "#bfe3dc", scale: 2.2, flowDirection: new THREE.Vector2(1, 0.08), flowSpeed: reduced ? 0.01 : 0.045,
        textureWidth: isMobile ? 512 : 1024, textureHeight: isMobile ? 512 : 1024, normalMap0: w1, normalMap1: w2, reflectivity: 0.12,
      });
    } else {
      water = makeLiteWater(w1, RW + 0.8);
    }
    water.rotation.x = -Math.PI / 2; water.position.set(0, WY, RC); water.visible = false; scene.add(water);
    const rocks = await model("rock_moss_set_01.glb"); const parts = []; rocks.traverse((o) => o.isMesh && parts.push(o));
    for (let i = 0; i < (lite ? 14 : 34); i++) {
      const src = parts[i % parts.length]; const m = src.clone(); const near = i % 2 === 0;
      m.position.set((rnd() - 0.5) * 50, WY + 0.05 + rnd() * 0.05, near ? RZ0 - 0.6 - rnd() * 0.8 : RZ1 + 0.6 + rnd() * 0.8);
      m.scale.setScalar(0.5 + rnd() * 1.1); m.rotation.set(0, rnd() * 6, 0); scene.add(m);
    }
    if (riverRefs.fern) for (let i = 0; i < 14; i++) place(riverRefs.fern, new THREE.Vector3((rnd() - 0.5) * 30, 0, RZ0 + 0.3 + rnd() * 0.6), 1.2 + rnd(), rnd() * 6);
    if (!lite) {
      const [shrub, boulder] = await Promise.all([model("shrub_01.glb"), model("boulder_01.glb")]);
      for (let i = 0; i < 26; i++) place(shrub, new THREE.Vector3((rnd() - 0.5) * 70, 0, RZ1 - 1.2 - rnd() * 3), 0.9 + rnd() * 0.9, rnd() * 6);
      for (let i = 0; i < 7; i++) place(shrub, new THREE.Vector3((i % 2 ? 1 : -1) * (5 + rnd() * 18), 0, RZ0 + 1 + rnd() * 2.5), 0.8 + rnd() * 0.6, rnd() * 6);
      for (let i = 0; i < 5; i++) place(boulder, new THREE.Vector3((rnd() - 0.5) * 36, WY - 0.1, i % 2 ? RZ1 + 0.9 : RZ0 - 0.9), 0.6 + rnd() * 0.5, rnd() * 6);
      if (!isMobile) tex("garden_bg_4k.webp", { srgb: true, repeat: false }).then((t) => { t.mapping = THREE.EquirectangularReflectionMapping; if (skybox) { skybox.material.map = t; skybox.material.needsUpdate = true; } });
    }
  }
  function makeLiteWater(nor, depth) {
    const u = { uTime: { value: 0 }, uNor: { value: nor } };
    const m = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uTime; uniform sampler2D uNor; varying vec2 vUv; varying vec3 vW;
        void main(){ vec2 p = vW.xz*0.18; vec3 n1 = texture2D(uNor, p + vec2(uTime*0.05,0.)).xyz*2.-1.; vec3 n2 = texture2D(uNor, p*1.7 - vec2(uTime*0.08,0.02)).xyz*2.-1.;
          vec3 n = normalize(vec3((n1.xy+n2.xy)*0.6, 1.)); vec3 V = normalize(cameraPosition - vW); float fres = pow(1.-max(dot(V, vec3(n.x, 1., n.y)*vec3(1.,1.,1.)) ,0.), 3.);
          float edge = min(vUv.y, 1.-vUv.y); vec3 deep = vec3(.05,.22,.24), shallow = vec3(.25,.42,.36), sky = vec3(.62,.78,.9);
          vec3 c = mix(shallow, deep, smoothstep(0.,.35,edge)); c = mix(c, sky, clamp(fres*1.3 + n.x*.15, 0., .8)); c += pow(max(n.y,0.),12.)*.6;
          gl_FragColor = vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(200, depth), m); w.userData.u = u; return w;
  }

  // ---------- post-processing ----------
  let composer = null, bokeh = null, bloom = null;
  if (hq) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bokeh = new BokehPass(scene, camera, { focus: 5.6, aperture: 0.0016, maxblur: 0.0055 }); composer.addPass(bokeh);
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.35, 0.55, 2.4); composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---------- scroll state ----------
  const S = { rise: 0, fall: 0, approach: 0, door: 0, enter: 0, walk: 0, river: 0 };
  const { gsap, ScrollTrigger } = window;
  const drive = (key, trigger, start, end, scrub = 1) => gsap.to(S, { [key]: 1, ease: "none", scrollTrigger: { trigger, start, end, scrub: reduced || new URLSearchParams(location.search).has("shot") ? true : scrub } });
  drive("rise", "#hero", "top top", "bottom top", 1);
  drive("fall", "#stage-rise", "18% top", "42% top", 0.4);
  drive("approach", "#stage-rise", "42% top", "bottom top", 1);
  drive("door", "#stage-doors", "top top", "35% top", 0.8);
  drive("enter", "#stage-doors", "30% top", "bottom top", 1);
  drive("walk", "#content", "top top", "bottom bottom", 1.2);
  drive("river", "#demo", "top bottom", "top top", 1.2);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  let aspect = 1, portrait = false;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = aspect = w / h; portrait = aspect < 0.9;
    camera.fov = portrait ? 50 : 38; camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(w, h); }
  }
  addEventListener("resize", resize); resize();

  const qHero = new THREE.Quaternion(), qStand = new THREE.Quaternion(), qFall = new THREE.Quaternion(), qTmp = new THREE.Quaternion();
  const pHeroPencil = new THREE.Vector3(), qHeroPencil = new THREE.Quaternion();
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), camPos = new THREE.Vector3(), target = new THREE.Vector3(), tabTarget = new THREE.Vector3();
  const pencilLocal = new THREE.Vector3(TW / 2 + 0.05, 0, 0);
  const X = new THREE.Vector3(1, 0, 0);
  const clock = new THREE.Clock();
  let frames = 0, acc = 0, visible = true, skyRot = null, envName = "";
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) clock.getDelta(); });

  const shotMode = new URLSearchParams(location.search).has("shot");
  function frame() {
    if (!shotMode) requestAnimationFrame(frame);
    if (!visible) return;
    tick();
  }
  function tick() {
    const dt = shotMode ? 1 / 60 : Math.min(clock.getDelta(), 0.1), time = shotMode ? 4 : clock.elapsedTime;
    if (!shotMode) { acc += dt; frames++; }
    if (frames >= 45) { const avg = acc / frames; if (avg > 0.034 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); } frames = 0; acc = 0; }
    if (!shotMode) { mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05; }

    const fitDist = (TW / 0.74 / aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const r = easeInOut(S.rise), f = Math.pow(S.fall, 2.2), a = easeInOut(S.approach), dOpen = easeInOut(S.door);
    const e = easeInOut(S.enter), w = S.walk, rv = easeInOut(S.river);

    // tablet: lying at an angle -> stands up -> falls toward the camera
    const heroX = portrait ? 0.15 : 0.95, heroY = portrait ? -0.2 : 0.32;
    qHero.setFromEuler(new THREE.Euler(-1.12, -0.42, 0.2, "YXZ"));
    qStand.setFromEuler(new THREE.Euler(0, -0.1 + mouse.x * 0.12 * (1 - f), 0, "YXZ"));
    qTmp.slerpQuaternions(qHero, qStand, r);
    const float = Math.sin(time * 1.2) * 0.04 * (1 - f);
    qFall.setFromAxisAngle(X, f * 1.52 + (1 - r) * mouse.y * 0.05);
    tabletPivot.quaternion.copy(qTmp).multiply(qFall);
    tabletPivot.position.set(lerp(heroX, 0, r), lerp(heroY, 0.4, r) + float - f * 0.15, lerp(0.3, 0, r) + f * 2.6);
    tabletPivot.visible = S.approach < 0.6;
    const mode = r > 0.55 ? 1 : 0;
    if (mode !== screenMode || (mode === 0 && time - lastDraw > 0.3 && tabletPivot.visible)) { drawScreen(mode, time); lastDraw = time; }

    const b = sstep(0.25, 0.9, S.rise);
    pHeroPencil.set(heroX - (portrait ? 0.6 : 1.25), heroY + 0.25 + Math.sin(time * 1.5 + 1) * 0.03, 1.2);
    qHeroPencil.setFromEuler(new THREE.Euler(1.45, 0.75 + Math.sin(time * 0.7) * 0.05, 0.12, "YXZ"));
    tablet.updateWorldMatrix(true, false);
    vA.copy(pencilLocal).applyMatrix4(tablet.matrixWorld);
    tablet.getWorldQuaternion(qTmp);
    pencil.position.lerpVectors(pHeroPencil, vA, b); pencil.position.y += Math.sin(b * Math.PI) * 0.5; pencil.position.z += Math.sin(b * Math.PI) * 0.4;
    pencil.quaternion.slerpQuaternions(qHeroPencil, qTmp, b);
    pencil.visible = tabletPivot.visible;

    doors.forEach((d) => (d.g.position.x = d.closedX + d.s * dOpen * (OW / 2 - 0.08)));
    led.material.emissive.set(dOpen > 0.05 ? "#3dff9a" : "#ff4a4a");

    // camera path
    const heroCam = vA.set(portrait ? 0 : 0.15, 2.1, Math.max(5.4, fitDist * 1.05));
    const standZ = Math.max(5.6, fitDist);
    camPos.set(lerp(heroCam.x, 0, r), lerp(heroCam.y, 1.6, r), lerp(heroCam.z, standZ, r));
    camPos.y -= f * 0.12;
    camPos.z += (-5.2 - standZ) * a;
    camPos.z += (-15.5 + 5.2) * e;
    camPos.z += (-56.5 + 15.5) * w;
    camPos.x += Math.sin(w * Math.PI * 3) * 0.3 * (1 - rv);
    camPos.z += (-62.4 + 56.5) * rv; camPos.y += 0.85 * rv;
    camPos.x += mouse.x * 0.2; camPos.y += -mouse.y * 0.08;
    tabTarget.set(lerp(portrait ? 0 : 0.25, 0, r), lerp(portrait ? 2.15 : 1.0, 1.42, r), 0);
    vB.set(camPos.x * 0.6, 1.6, camPos.z - 8);
    target.lerpVectors(tabTarget, vB, a);
    target.x += Math.sin(w * Math.PI * 3 + 0.6) * 0.22 * (1 - rv);
    vB.set(Math.sin(time * 0.12) * 1.0, 0.85, RC - 4);
    target.lerp(vB, rv);
    camera.position.copy(camPos); camera.lookAt(target);

    // environment + sky orientation per zone
    const inside = camPos.z < DOOR_Z - 0.6 && camPos.z > H1 + 0.2;
    const wantEnv = inside && env.studio ? "studio" : "garden";
    if (wantEnv !== envName && env[wantEnv]) { scene.environment = env[wantEnv]; envName = wantEnv; }
    scene.environmentIntensity = inside ? 0.7 : 1.0;
    const rot = w > 0.5 ? SKY_ROT_RIVER : SKY_ROT_HERO;
    if (rot !== skyRot) { skyRot = rot; setSun(rot); if (skybox) skybox.rotation.y = rot; scene.environmentRotation.set(0, rot, 0); }
    const focusZ = w > 0.5 ? RC : 0;
    sun.target.position.set(camPos.x, 0, w > 0.5 ? -68 : -2);
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 30);
    sun.intensity = inside ? 0 : 3.2; sun.castShadow = !lite && !inside;
    hemi.intensity = (lite ? 1.1 : 0.35) * (inside ? 1.6 : 1);
    if (skybox) skybox.position.set(0, SKY_H - 0.02, w > 0.5 ? -74 : 0);
    if (water) { water.visible = w > 0.6; if (water.userData.u) water.userData.u.uTime.value = time; }
    void focusZ;

    if (composer) {
      const dofAmt = 1 - sstep(0.0, 0.5, S.approach);
      bokeh.enabled = dofAmt > 0.02;
      if (bokeh.enabled) { camera.updateMatrixWorld(); tablet.getWorldPosition(vB).applyMatrix4(camera.matrixWorldInverse); bokeh.uniforms.focus.value = -vB.z; bokeh.uniforms.aperture.value = 0.0014 * dofAmt; }
      composer.render(dt);
    } else renderer.render(scene, camera);
  }

  drawScreen(0, 0);
  frame();
  ScrollTrigger.refresh();
  // progressive loading: hero assets first, then the interior, then the river
  const ready = Promise.all([loadSky, loadP1]).catch((e) => console.warn("asset", e));
  const allLoaded = ready.then(() => loadInterior()).then(() => loadRiver()).catch((e) => console.warn("asset", e));
  window.__clinicpad = { S, renderer, scene, ready, allLoaded, renderOnce: () => tick() };
  return ready;
}
