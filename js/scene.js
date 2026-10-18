import * as THREE from "three";
import { RoomEnvironment } from "../vendor/addons/RoomEnvironment.js";
import { BRAND } from "./config.js";
import { t, onLang, getLang } from "./i18n.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Seeded random so the scene is the same on every load
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

const TEAL = "#0fa3a3", NAVY = "#0b2540", RED = "#e5484d";
const FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ---------- Tablet screen textures (drawn on canvas, re-drawn on language change) ----------
function drawLogo(ctx, x, y, s) {
  ctx.fillStyle = TEAL; rr(ctx, x, y, s, s, s * 0.26); ctx.fill();
  ctx.fillStyle = "#fff"; const a = s * 0.18, b = s * 0.58;
  ctx.fillRect(x + (s - a) / 2, y + (s - b) / 2, a, b); ctx.fillRect(x + (s - b) / 2, y + (s - a) / 2, b, a);
}
function screenPatient(ctx, W, H, time) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e7f6f6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#6b7f8e"; ctx.font = `600 26px ${FONT}`; ctx.fillText("9:41", 48, 54);
  ctx.textAlign = "right"; ctx.fillText("● ● ●   100%", W - 48, 54); ctx.textAlign = "left";
  drawLogo(ctx, 64, 120, 84);
  ctx.fillStyle = NAVY; ctx.font = `700 48px ${FONT}`; ctx.fillText(BRAND, 170, 178);
  ctx.font = `800 104px ${FONT}`; ctx.fillText(t("t_welcome"), 64, 400);
  ctx.fillStyle = "#3d5466"; ctx.font = `500 46px ${FONT}`; ctx.fillText(t("t_start"), 64, 480);
  ctx.fillStyle = "#fff"; ctx.strokeStyle = TEAL; ctx.lineWidth = 5; rr(ctx, 64, 540, W - 128, 130, 28); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#9aabb8"; ctx.font = `400 46px ${FONT}`; ctx.fillText(t("t_name"), 108, 622);
  if (Math.floor(time * 1.6) % 2 === 0) { ctx.fillStyle = TEAL; ctx.fillRect(104, 572, 5, 66); }
  ctx.fillStyle = TEAL; rr(ctx, 64, 720, W - 128, 130, 28); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `700 44px ${FONT}`; ctx.textAlign = "center";
  ctx.fillText("📷  " + t("t_scan"), W / 2, 800); ctx.textAlign = "left";
  // license card illustration
  ctx.fillStyle = "#dff1f1"; rr(ctx, 64, 900, W - 128, 300, 30); ctx.fill();
  ctx.fillStyle = "#b9dede"; rr(ctx, 104, 950, 170, 200, 18); ctx.fill();
  ctx.fillStyle = "#9fcfcf"; for (let i = 0; i < 4; i++) { rr(ctx, 310, 965 + i * 50, (W - 450) * (1 - i * 0.15), 22, 11); ctx.fill(); }
  const scanY = 950 + ((Math.sin(time * 2) + 1) / 2) * 200; ctx.fillStyle = "rgba(15,163,163,.55)"; ctx.fillRect(84, scanY, W - 168, 5);
  // steps
  const st = t("t_steps"); const sw = (W - 128) / 3;
  st.forEach((s, i) => {
    const x = 64 + i * sw; ctx.fillStyle = i === 0 ? TEAL : "#c9d6dd"; rr(ctx, x, 1260, sw - 16, 12, 6); ctx.fill();
    ctx.fillStyle = i === 0 ? NAVY : "#8aa0ad"; ctx.font = `600 30px ${FONT}`; ctx.fillText(`${i + 1}. ${s}`, x, 1318);
  });
  ctx.fillStyle = "#6b7f8e"; ctx.font = `500 30px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("🔒  " + t("t_foot"), W / 2, H - 70); ctx.textAlign = "left";
}
function screenProvider(ctx, W, H) {
  ctx.fillStyle = "#f6fafb"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, 190);
  drawLogo(ctx, 56, 70, 72); ctx.fillStyle = "#fff"; ctx.font = `700 42px ${FONT}`; ctx.fillText(BRAND, 148, 120);
  ctx.textAlign = "right"; ctx.font = `600 32px ${FONT}`; ctx.fillStyle = "#7fe0e0"; ctx.fillText(t("t_prov"), W - 56, 120); ctx.textAlign = "left";
  ctx.fillStyle = RED; rr(ctx, 48, 230, W - 96, 150, 26); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `800 44px ${FONT}`; ctx.fillText("⚠ " + t("t_alert"), 84, 300);
  ctx.font = `500 28px ${FONT}`; ctx.fillText(t("t_example"), 84, 348);
  const items = t("t_checks");
  items.forEach((s, i) => {
    const y = 430 + i * 112, on = i < 6;
    ctx.fillStyle = "#fff"; rr(ctx, 48, y, W - 96, 94, 22); ctx.fill();
    ctx.strokeStyle = on ? "#d4e9e9" : "#f3b4b6"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = on ? TEAL : "#fff"; ctx.strokeStyle = on ? TEAL : RED; rr(ctx, 76, y + 22, 50, 50, 12); ctx.fill(); ctx.stroke();
    if (on) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(88, y + 48); ctx.lineTo(99, y + 60); ctx.lineTo(116, y + 36); ctx.stroke(); }
    ctx.fillStyle = on ? NAVY : RED; ctx.font = `600 36px ${FONT}`; ctx.fillText(s, 152, y + 60);
  });
  ctx.fillStyle = "#c9d3da"; rr(ctx, 48, H - 190, W - 96, 120, 30); ctx.fill();
  ctx.fillStyle = "#5c6f7d"; ctx.font = `700 42px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("🔒  " + t("t_locked"), W / 2, H - 116); ctx.textAlign = "left";
}

export function startScene({ lite = false, reduced = false } = {}) {
  const canvas = document.getElementById("gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: "high-performance" });
  let maxDpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, 1.75);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const HORIZON = new THREE.Color("#e9f5f7");
  scene.fog = new THREE.Fog(HORIZON, 18, 75);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 600);

  if (!lite) {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
  }
  scene.add(new THREE.HemisphereLight("#ffffff", "#cfe6e8", lite ? 2.2 : 1.4));
  const sun = new THREE.DirectionalLight("#fff6ea", 1.8); sun.position.set(5, 9, 7); scene.add(sun);
  const fill = new THREE.DirectionalLight("#cdeeff", 0.6); fill.position.set(-6, 3, 4); scene.add(fill);

  // ---------- Sky ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color("#69b7e6") }, mid: { value: new THREE.Color("#cfe9f4") }, bot: { value: HORIZON } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform vec3 top, mid, bot; varying vec3 vP;
        void main(){ float h = vP.y; vec3 c = mix(bot, mid, smoothstep(0.0, 0.12, h)); c = mix(c, top, smoothstep(0.1, 0.6, h));
          gl_FragColor = vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  );
  scene.add(sky);

  // ---------- Materials ----------
  const M = {
    alu: new THREE.MeshStandardMaterial({ color: "#d7dce1", metalness: 0.85, roughness: 0.3 }),
    glassBlack: new THREE.MeshStandardMaterial({ color: "#0a0e13", metalness: 0.3, roughness: 0.12 }),
    white: new THREE.MeshStandardMaterial({ color: "#f6f9fa", roughness: 0.75 }),
    wall: new THREE.MeshStandardMaterial({ color: "#f3f7f8", roughness: 0.9 }),
    facade: new THREE.MeshStandardMaterial({ color: "#dfe9ec", roughness: 0.85 }),
    floor: new THREE.MeshStandardMaterial({ color: "#e4ecee", roughness: 0.28, metalness: 0.05 }),
    plaza: new THREE.MeshStandardMaterial({ color: "#e9eeee", roughness: 0.8 }),
    teal: new THREE.MeshStandardMaterial({ color: "#0fa3a3", roughness: 0.45 }),
    tealDark: new THREE.MeshStandardMaterial({ color: "#0b6f78", roughness: 0.5 }),
    frame: new THREE.MeshStandardMaterial({ color: "#b9c3ca", metalness: 0.8, roughness: 0.35 }),
    glass: new THREE.MeshStandardMaterial({ color: "#bfe8ee", metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.32, depthWrite: false }),
    light: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    grass: new THREE.MeshStandardMaterial({ color: "#8fc68d", roughness: 1 }),
    grassDark: new THREE.MeshStandardMaterial({ color: "#6fae78", roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: "#d9dcd6", roughness: 0.9 }),
    rock: new THREE.MeshStandardMaterial({ color: "#a9b0ad", roughness: 0.95, flatShading: true }),
    leaf: new THREE.MeshStandardMaterial({ color: "#5fa877", roughness: 0.9, flatShading: true }),
    trunk: new THREE.MeshStandardMaterial({ color: "#8a6a50", roughness: 1 }),
  };
  const box = (w, h, d, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const plane = (w, h, mat, x, y, z, rx = 0, ry = 0, parent = scene) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); parent.add(m); return m; };

  // ---------- Tablet + pencil ----------
  const TW = 1.7, TH = 2.4, TD = 0.06;
  const tabletPivot = new THREE.Group(); scene.add(tabletPivot);
  const tablet = new THREE.Group(); tablet.position.y = TH / 2; tabletPivot.add(tablet);
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(TW, TH, 0.13), { depth: TD, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 3, curveSegments: 14 });
  bodyGeo.translate(0, 0, -TD / 2);
  tablet.add(new THREE.Mesh(bodyGeo, M.alu));
  const front = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(TW - 0.012, TH - 0.012, 0.125), 14), M.glassBlack);
  front.position.z = TD / 2 + 0.0145; tablet.add(front);
  const SW = TW - 0.15, SH = TH - 0.15;
  const scrCanvas = document.createElement("canvas"); scrCanvas.width = 1024; scrCanvas.height = Math.round(1024 * SH / SW);
  const scrCtx = scrCanvas.getContext("2d");
  const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8;
  const screen = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(SW, SH, 0.07), 10), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  { // ShapeGeometry UVs are in shape units; remap to 0..1
    const uv = screen.geometry.attributes.uv, pos = screen.geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / SW + 0.5, pos.getY(i) / SH + 0.5);
  }
  screen.position.z = TD / 2 + 0.016; tablet.add(screen);
  // glass sheen
  const sheen = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(SW, SH, 0.07), 10), new THREE.MeshStandardMaterial({ color: "#000", metalness: 1, roughness: 0.05, transparent: true, opacity: 0.07, depthWrite: false }));
  sheen.position.z = TD / 2 + 0.0175; if (!lite) tablet.add(sheen);
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24), M.glassBlack); cam.rotation.x = Math.PI / 2; cam.position.set(-TW / 2 + 0.22, TH / 2 - 0.22, -TD / 2 - 0.02); tablet.add(cam);
  box(0.02, 0.18, 0.02, M.frame, TW / 2 + 0.006, TH / 2 - 0.4, 0, tablet); // volume button
  let screenMode = -1, lastDraw = 0;
  function drawScreen(mode, time) {
    if (mode === 0) screenPatient(scrCtx, scrCanvas.width, scrCanvas.height, time); else screenProvider(scrCtx, scrCanvas.width, scrCanvas.height);
    scrTex.needsUpdate = true; screenMode = mode;
  }
  onLang(() => drawScreen(screenMode < 0 ? 0 : screenMode, performance.now() / 1000));

  const pencil = new THREE.Group(); scene.add(pencil);
  {
    const L = 1.75, R = 0.034;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 32), M.white); pencil.add(shaft);
    const flat = box(0.004, L * 0.9, R * 1.2, new THREE.MeshStandardMaterial({ color: "#eef2f4", roughness: 0.4 }), R - 0.001, 0, 0, pencil);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(R, 0.008, 0.16, 32), M.white); cone.position.y = -L / 2 - 0.08; pencil.add(cone);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), new THREE.MeshStandardMaterial({ color: "#8d979e", roughness: 0.3 })); tip.position.y = -L / 2 - 0.162; pencil.add(tip);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.white); cap.scale.y = 0.35; cap.position.y = L / 2; pencil.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.98, 0.004, 8, 32), M.frame); ring.rotation.x = Math.PI / 2; ring.position.y = L / 2 - 0.12; pencil.add(ring);
    void flat;
  }
  // soft contact shadow
  const shCanvas = document.createElement("canvas"); shCanvas.width = shCanvas.height = 128;
  { const c = shCanvas.getContext("2d"), g = c.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, "rgba(10,40,60,.5)"); g.addColorStop(1, "rgba(10,40,60,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005; scene.add(shadow);

  // ---------- Plaza + building facade with automatic sliding doors ----------
  const DOOR_Z = -10, OW = 3.6, OH = 3.0;
  plane(80, 40, M.plaza, 0, 0, DOOR_Z + 20, -Math.PI / 2);
  // paving lines
  for (let i = -8; i <= 8; i++) plane(0.02, 40, new THREE.MeshBasicMaterial({ color: "#d7dfe0" }), i * 2, 0.002, DOOR_Z + 20, -Math.PI / 2);
  box(13.2, 9, 0.5, M.facade, -(OW / 2 + 6.6), 4.5, DOOR_Z);
  box(13.2, 9, 0.5, M.facade, OW / 2 + 6.6, 4.5, DOOR_Z);
  box(OW, 9 - OH, 0.5, M.facade, 0, OH + (9 - OH) / 2, DOOR_Z);
  box(30, 0.08, 0.52, M.teal, 0, 0.4, DOOR_Z); // teal plinth line
  // windows on facade
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x = sx * (OW / 2 + 2 + i * 3.2), y = 2.2 + j * 3.2;
    box(2.2, 1.9, 0.06, M.glass, x, y, DOOR_Z + 0.27); box(2.36, 0.08, 0.1, M.frame, x, y - 1, DOOR_Z + 0.28); box(2.36, 0.08, 0.1, M.frame, x, y + 1, DOOR_Z + 0.28);
  }
  // canopy
  box(6.4, 0.16, 2.6, M.white, 0, OH + 0.85, DOOR_Z + 1.3);
  box(6.4, 0.06, 0.06, M.teal, 0, OH + 0.76, DOOR_Z + 2.6);
  // frame around opening
  box(0.14, OH, 0.6, M.frame, -OW / 2 - 0.07, OH / 2, DOOR_Z + 0.05);
  box(0.14, OH, 0.6, M.frame, OW / 2 + 0.07, OH / 2, DOOR_Z + 0.05);
  box(OW + 0.28, 0.3, 0.6, M.frame, 0, OH + 0.15, DOOR_Z + 0.05);
  // sensor
  box(0.5, 0.1, 0.12, M.glassBlack, 0, OH + 0.38, DOOR_Z + 0.38);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: "#ff5a5a" })); led.position.set(0.18, OH + 0.38, DOOR_Z + 0.45); scene.add(led);
  // sign
  const signC = document.createElement("canvas"); signC.width = 1024; signC.height = 256;
  { const c = signC.getContext("2d"); c.fillStyle = "#ffffff"; c.fillRect(0, 0, 1024, 256); drawLogo(c, 120, 58, 140);
    c.fillStyle = NAVY; c.font = `800 110px ${FONT}`; c.fillText(BRAND, 300, 162); c.fillStyle = TEAL; c.font = `600 44px ${FONT}`; c.fillText("Welcome · Bienvenidos", 304, 222); }
  const signTex = new THREE.CanvasTexture(signC); signTex.colorSpace = THREE.SRGBColorSpace;
  plane(4, 1, new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }), 0, OH + 1.85, DOOR_Z + 0.26);
  // sliding door panels
  const doors = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * OW / 4, 0, DOOR_Z + 0.42); scene.add(g);
    const pw = OW / 2 + 0.02;
    box(pw, OH - 0.04, 0.04, M.glass, 0, OH / 2, 0, g);
    box(pw, 0.12, 0.07, M.frame, 0, 0.06, 0, g); box(pw, 0.08, 0.07, M.frame, 0, OH - 0.08, 0, g);
    box(0.07, OH, 0.07, M.frame, s * (pw / 2 - 0.035), OH / 2, 0, g); box(0.07, OH, 0.07, M.frame, -s * (pw / 2 - 0.035), OH / 2, 0, g);
    box(pw * 0.8, 0.05, 0.05, M.teal, 0, 1.15, 0.01, g); // safety stripe
    doors.push({ g, s, closedX: s * OW / 4 });
  }
  // planters
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.8, 24), M.white); p.position.set(s * 3.4, 0.4, DOOR_Z + 1.4); scene.add(p);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), M.leaf); b.position.set(s * 3.4, 1.2, DOOR_Z + 1.4); b.scale.y = 1.25; scene.add(b);
  }
  // entrance mat
  plane(3.2, 1.6, M.tealDark, 0, 0.006, DOOR_Z + 1.2, -Math.PI / 2);

  // ---------- Hallway ----------
  const HW = 5, HH = 3.2, H0 = DOOR_Z - 0.25, H1 = -60, HL = H0 - H1, HC = (H0 + H1) / 2;
  plane(HW, HL, M.floor, 0, 0.001, HC, -Math.PI / 2);
  plane(HW, HL, M.wall, 0, HH, HC, Math.PI / 2);
  plane(HL, HH, M.wall, -HW / 2, HH / 2, HC, 0, Math.PI / 2);
  plane(HL, HH, M.wall, HW / 2, HH / 2, HC, 0, -Math.PI / 2);
  box(0.04, 0.1, HL, M.teal, -HW / 2 + 0.03, 1.0, HC); box(0.04, 0.1, HL, M.teal, HW / 2 - 0.03, 1.0, HC);
  box(0.03, 0.14, HL, M.tealDark, -HW / 2 + 0.02, 0.07, HC); box(0.03, 0.14, HL, M.tealDark, HW / 2 - 0.02, 0.07, HC);
  plane(1.0, HL, new THREE.MeshStandardMaterial({ color: "#d3e7e8", roughness: 0.4 }), 0, 0.003, HC, -Math.PI / 2); // floor runner
  for (let z = H0 - 2.5; z > H1 + 1; z -= 3.5) plane(1.6, 0.55, M.light, 0, HH - 0.01, z, Math.PI / 2);
  const roomNames = ["Exam 1", "Therapy", "X-Ray", "Exam 2", "Dental 1", "Rehab", "Dental 2", "Exam 3", "Office"];
  let ri = 0;
  for (let z = H0 - 6; z > H1 + 4; z -= 5.5) {
    const s = ri % 2 ? 1 : -1;
    const d = box(0.08, 2.3, 1.2, M.teal, s * (HW / 2 - 0.04), 1.15, z);
    box(0.09, 0.5, 0.35, M.glass, s * (HW / 2 - 0.05), 1.75, z - 0.25);
    const c = document.createElement("canvas"); c.width = 256; c.height = 96; const x = c.getContext("2d");
    x.fillStyle = NAVY; x.fillRect(0, 0, 256, 96); x.fillStyle = "#fff"; x.font = `700 44px ${FONT}`; x.textAlign = "center"; x.fillText(roomNames[ri % roomNames.length], 128, 62);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    plane(0.6, 0.22, new THREE.MeshBasicMaterial({ map: tx }), s * (HW / 2 - 0.02), 2.6, z, 0, -s * Math.PI / 2);
    // bench on the other side
    if (ri % 3 === 1) { box(0.5, 0.08, 1.6, M.white, -s * (HW / 2 - 0.35), 0.48, z + 2.4); box(0.4, 0.44, 0.08, M.frame, -s * (HW / 2 - 0.35), 0.22, z + 1.8); box(0.4, 0.44, 0.08, M.frame, -s * (HW / 2 - 0.35), 0.22, z + 3.0); }
    void d; ri++;
  }
  // end wall with opening to the garden
  box((HW - OW) / 2, HH, 0.3, M.wall, -(OW / 2 + (HW - OW) / 4), HH / 2, H1);
  box((HW - OW) / 2, HH, 0.3, M.wall, OW / 2 + (HW - OW) / 4, HH / 2, H1);
  box(OW, HH - OH, 0.3, M.wall, 0, OH + (HH - OH) / 2, H1);
  // building exterior around the hallway end (so the garden side looks closed)
  box(40, 7, 0.4, M.wall, -(HW / 2 + 20), 3.5, H1); box(40, 7, 0.4, M.wall, HW / 2 + 20, 3.5, H1);
  box(HW, 7 - HH, 0.4, M.wall, 0, HH + (7 - HH) / 2, H1);

  // ---------- Garden + river ----------
  const RZ0 = -67, RZ1 = -81, RW = RZ0 - RZ1, RC = (RZ0 + RZ1) / 2, WY = -0.42;
  plane(200, RZ0 - H1 + 0.2, M.grass, 0, -0.01, (H1 + RZ0) / 2, -Math.PI / 2);
  plane(5, 4.6, M.stone, 0, 0.02, H1 - 2.3, -Math.PI / 2); // terrace
  box(5, 0.5, 0.25, M.stone, 0, 0.25, H1 - 4.6); // low wall at terrace edge
  plane(200, 80, M.grass, 0, -0.01, RZ1 - 40, -Math.PI / 2);
  // banks sloping into the water
  const earth = new THREE.MeshStandardMaterial({ color: "#7d9a6e", roughness: 1 });
  box(200, 0.7, 0.5, earth, 0, -0.36, RZ0 + 0.24); box(200, 0.7, 0.5, earth, 0, -0.36, RZ1 - 0.24); // bank walls
  box(200, 0.06, 0.55, M.grassDark, 0, -0.005, RZ0 + 0.24); box(200, 0.06, 0.55, M.grassDark, 0, -0.005, RZ1 - 0.24);
  const waterU = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color("#0f6d86") }, uShallow: { value: new THREE.Color("#37b3b8") },
    uFoam: { value: new THREE.Color("#f2fbfc") }, uSky: { value: new THREE.Color("#bfe3f3") },
  };
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(200, RW + 0.6, lite ? 120 : 320, lite ? 16 : 40),
    new THREE.ShaderMaterial({
      uniforms: waterU,
      defines: { OCT: lite ? 3 : 5 },
      vertexShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW; varying float vH;
        void main(){ vUv = uv; vec3 p = position;
          float h = sin(p.x*0.55 - uTime*1.7)*0.045 + sin(p.x*1.6 + p.y*1.2 - uTime*2.4)*0.025 + sin(p.y*2.3 + p.x*0.3 + uTime*1.3)*0.018;
          h *= smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.88, uv.y);
          p.z += h; vH = h; vec4 w = modelMatrix*vec4(p,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uTime; uniform vec3 uDeep, uShallow, uFoam, uSky; varying vec2 vUv; varying vec3 vW; varying float vH;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<OCT;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
        void main(){
          vec2 p = vW.xz; float t = uTime;
          float edge = max(min(vUv.y, 1.-vUv.y) - 0.018, 0.);
          float speed = mix(0.6, 1.6, smoothstep(0.0, 0.5, edge));
          vec2 q = vec2(fbm(p*vec2(.25,.8) - vec2(t*.35*speed,0.)), fbm(p*vec2(.3,.9)+5.2 - vec2(t*.3*speed,0.)));
          float n = fbm(p*vec2(.45,1.6) + q*1.8 - vec2(t*.9*speed, 0.));
          vec3 col = mix(uShallow, uDeep, smoothstep(0.02, 0.4, edge));
          col = mix(col, col*1.25 + .05, smoothstep(.5,.85,n)*.6);
          float streak = smoothstep(.62,.72, fbm(p*vec2(.18,3.2) + q - vec2(t*1.4*speed,0.)));
          col = mix(col, vec3(.86,.96,1.), streak*.28);
          vec3 V = normalize(cameraPosition - vW);
          float fres = pow(1. - clamp(V.y, 0., 1.), 2.5);
          col = mix(col, uSky, fres*.55);
          float sp = pow(noise(p*vec2(5.,9.) - vec2(t*3.,0.)) * noise(p*vec2(7.,11.) + vec2(t*2.1, 3.)), 6.)*3.;
          col += vec3(sp);
          float foam = smoothstep(.07, 0., edge + (n-.5)*.08);
          col = mix(col, uFoam, foam*.85);
          col += vH*1.6;
          float d = length(cameraPosition - vW);
          col = mix(col, vec3(${HORIZON.r.toFixed(3)}, ${HORIZON.g.toFixed(3)}, ${HORIZON.b.toFixed(3)}), smoothstep(35., 120., d));
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  );
  water.rotation.x = -Math.PI / 2; water.position.set(0, WY, RC); scene.add(water);
  // rocks along the banks
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, M.rock, lite ? 30 : 70);
  const dm = new THREE.Object3D();
  for (let i = 0; i < rocks.count; i++) {
    const side = rnd() > 0.5 ? RZ0 - 0.4 : RZ1 + 0.4;
    dm.position.set((rnd() - 0.5) * 70, WY + 0.05, side + (rnd() - 0.5) * 0.6);
    const s = 0.15 + rnd() * 0.4; dm.scale.set(s * 1.4, s * 0.6, s); dm.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); dm.updateMatrix(); rocks.setMatrixAt(i, dm.matrix);
  }
  scene.add(rocks);
  // trees
  const N = lite ? 40 : 110;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.12, 1, 6), M.trunk, N);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M.leaf, N);
  for (let i = 0; i < N; i++) {
    let x, z;
    if (i < N * 0.7) { x = (rnd() - 0.5) * 90; z = RZ1 - 2 - rnd() * 35; } else { x = (rnd() > 0.5 ? 1 : -1) * (5 + rnd() * 30); z = H1 - 2 - rnd() * 4; }
    const h = 1.6 + rnd() * 2.2;
    dm.position.set(x, h / 2, z); dm.scale.set(1, h, 1); dm.rotation.set(0, 0, 0); dm.updateMatrix(); trunks.setMatrixAt(i, dm.matrix);
    const r = 0.8 + rnd() * 0.9; dm.position.set(x, h + r * 0.6, z); dm.scale.set(r, r * 1.3, r); dm.rotation.set(0, rnd() * 3, 0); dm.updateMatrix(); crowns.setMatrixAt(i, dm.matrix);
    crowns.setColorAt(i, new THREE.Color().setHSL(0.3 + rnd() * 0.07, 0.35 + rnd() * 0.15, 0.4 + rnd() * 0.12));
  }
  scene.add(trunks, crowns);
  // distant hills
  for (let i = 0; i < 7; i++) {
    const hm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshStandardMaterial({ color: "#9cc9b4", roughness: 1 }));
    hm.position.set(-90 + i * 30 + rnd() * 10, -2, -150 - rnd() * 30); hm.scale.set(25 + rnd() * 15, 9 + rnd() * 8, 15); scene.add(hm);
  }

  // ---------- Scroll-driven state (GSAP ScrollTrigger) ----------
  const S = { rise: 0, fall: 0, approach: 0, door: 0, enter: 0, walk: 0, river: 0 };
  const { gsap, ScrollTrigger } = window;
  const drive = (key, trigger, start, end, scrub = 1) =>
    gsap.to(S, { [key]: 1, ease: "none", scrollTrigger: { trigger, start, end, scrub: reduced ? true : scrub } });
  drive("rise", "#hero", "top top", "bottom top", 1);
  drive("fall", "#stage-rise", "18% top", "42% top", 0.4);
  drive("approach", "#stage-rise", "42% top", "bottom top", 1);
  drive("door", "#stage-doors", "top top", "35% top", 0.8);
  drive("enter", "#stage-doors", "30% top", "bottom top", 1);
  drive("walk", "#content", "top top", "bottom bottom", 1.2);
  drive("river", "#demo", "top bottom", "top top", 1.2);

  // ---------- Pointer parallax ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  // ---------- Resize ----------
  let aspect = 1, portrait = false;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = aspect = w / h; portrait = aspect < 0.9;
    camera.fov = portrait ? 50 : 40; camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  // ---------- Frame loop ----------
  const qHero = new THREE.Quaternion(), qStand = new THREE.Quaternion(), qFall = new THREE.Quaternion(), qTmp = new THREE.Quaternion();
  const pHeroPencil = new THREE.Vector3(), qHeroPencil = new THREE.Quaternion();
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), camPos = new THREE.Vector3(), target = new THREE.Vector3(), tabTarget = new THREE.Vector3();
  const pencilLocal = new THREE.Vector3(TW / 2 + 0.05, 0, 0);
  const clock = new THREE.Clock();
  let frames = 0, acc = 0, visible = true;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) clock.getDelta(); });

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.1), time = clock.elapsedTime;
    // adaptive quality: drop resolution if frames are slow
    acc += dt; frames++;
    if (frames >= 45) { const avg = acc / frames; if (avg > 0.034 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); } frames = 0; acc = 0; }
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;

    const k = 1, fitDist = (TW / 0.74 / aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const r = easeInOut(S.rise), f = Math.pow(S.fall, 2.2), a = easeInOut(S.approach), dOpen = easeInOut(S.door);
    const e = easeInOut(S.enter), w = S.walk, rv = easeInOut(S.river);

    // tablet: lying at an angle -> stands up -> falls forward toward the camera
    const heroX = portrait ? 0.15 : 0.95, heroY = portrait ? -0.2 : 0.32;
    qHero.setFromEuler(new THREE.Euler(-1.12, -0.42, 0.2, "YXZ"));
    qStand.setFromEuler(new THREE.Euler(0, -0.1 + mouse.x * 0.12 * (1 - f), 0, "YXZ"));
    qTmp.slerpQuaternions(qHero, qStand, r);
    const float = Math.sin(time * 1.2) * 0.04 * (1 - f);
    qFall.setFromAxisAngle(new THREE.Vector3(1, 0, 0), f * 1.52 + (1 - r) * mouse.y * 0.05);
    tabletPivot.quaternion.copy(qTmp).multiply(qFall);
    tabletPivot.position.set(lerp(heroX, 0, r), lerp(heroY, 0.4, r) + float - f * 0.15, lerp(0.3, 0, r) + f * 2.6 * k);
    tabletPivot.visible = S.approach < 0.6;
    const mode = r > 0.55 ? 1 : 0;
    if (mode !== screenMode || (mode === 0 && time - lastDraw > 0.3)) { drawScreen(mode, time); lastDraw = time; }

    // pencil: lies beside the tablet, then flies up and snaps to its side
    const b = sstep(0.25, 0.9, S.rise);
    pHeroPencil.set(heroX - (portrait ? 0.6 : 1.25), heroY + 0.25 + Math.sin(time * 1.5 + 1) * 0.03, 1.2);
    qHeroPencil.setFromEuler(new THREE.Euler(1.45, 0.75 + Math.sin(time * 0.7) * 0.05, 0.12, "YXZ"));
    tablet.updateWorldMatrix(true, false);
    vA.copy(pencilLocal).applyMatrix4(tablet.matrixWorld);
    tablet.getWorldQuaternion(qTmp);
    pencil.position.lerpVectors(pHeroPencil, vA, b); pencil.position.y += Math.sin(b * Math.PI) * 0.5; pencil.position.z += Math.sin(b * Math.PI) * 0.4;
    pencil.quaternion.slerpQuaternions(qHeroPencil, qTmp, b);
    pencil.visible = tabletPivot.visible;
    shadow.position.set(tabletPivot.position.x, 0.005, tabletPivot.position.z - 0.6 * (1 - r));
    shadow.scale.set(2.6, 2.2 + (1 - r), 1); shadow.material.opacity = (0.5 + 0.5 * r) * (1 - f * 0.7);
    shadow.visible = tabletPivot.visible;

    // doors
    doors.forEach((d) => (d.g.position.x = d.closedX + d.s * dOpen * (OW / 2 - 0.05)));
    led.material.color.set(dOpen > 0.05 ? "#38e08a" : "#ff5a5a");

    // camera path
    const heroCam = vA.set(portrait ? 0 : 0.15, 2.25, Math.max(5.4, fitDist * 1.05));
    const standZ = Math.max(5.6, fitDist);
    camPos.set(lerp(heroCam.x, 0, r), lerp(heroCam.y, 1.6, r), lerp(heroCam.z, standZ, r));
    camPos.y -= f * 0.12;
    camPos.z += (-5.2 - standZ) * a;
    camPos.y += 0.0;
    camPos.z += (-15.5 + 5.2) * e;
    camPos.z += (-56.5 + 15.5) * w;
    camPos.x += Math.sin(w * Math.PI * 3) * 0.35 * (1 - rv);
    camPos.z += (-62.2 + 56.5) * rv; camPos.y += 0.9 * rv;
    camPos.x += mouse.x * 0.22; camPos.y += -mouse.y * 0.1;

    tabTarget.set(lerp(portrait ? 0 : 0.25, 0, r), lerp(portrait ? 2.15 : 1.0, 1.42, r), 0);
    vB.set(camPos.x * 0.6, 1.6, camPos.z - 8);
    target.lerpVectors(tabTarget, vB, a);
    target.x += Math.sin(w * Math.PI * 3 + 0.6) * 0.25 * (1 - rv);
    vB.set(Math.sin(time * 0.15) * 1.2, 0.2, RC - 2);
    target.lerp(vB, rv);
    camera.position.copy(camPos); camera.lookAt(target);
    camera.rotation.z += Math.sin(time * 0.5) * 0.002;

    // atmosphere: inside is cleaner, outside opens up
    scene.fog.near = lerp(18, 25, rv); scene.fog.far = lerp(lerp(75, 60, e), 140, rv);
    waterU.uTime.value = time;
    renderer.render(scene, camera);
  }
  drawScreen(0, 0);
  frame();
  ScrollTrigger.refresh();
  window.__clinicpad = { S, renderer, scene, get lang() { return getLang(); } };
}
