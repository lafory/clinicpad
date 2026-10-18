// ClinicPad photo-plate scene: the backgrounds are real photo plates (DOM, js/plates.js); this WebGL layer
// draws only the 3D tablet + pencil (transparent canvas, shadow on the lobby floor) and a water-shimmer
// pass over the river plate. Scroll state is shared with plates.js.
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/addons/RoomEnvironment.js";
import { onLang } from "./i18n.js";
import { S, L, urls, loadMask } from "./plates.js";
import { roundedRect, screenPatient, screenProvider } from "./screens.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function startScene({ lite = false, reduced = false } = {}) {
  const canvas = document.getElementById("gl");
  const isMobile = matchMedia("(max-width: 820px), (pointer: coarse)").matches;
  const shotMode = new URLSearchParams(location.search).has("shot");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  let dpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, isMobile ? 2 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);

  // warm sunlight from the upper left, like the lobby photo
  scene.add(new THREE.HemisphereLight("#fff6ea", "#d8cbb8", 0.6));
  const sun = new THREE.DirectionalLight("#fff0da", 2.4);
  sun.position.set(-4, 7, 4); sun.castShadow = !lite;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 6; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  scene.add(sun, sun.target);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ color: "#3a2a18", opacity: 0.32 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const physical = (o) => new THREE.MeshPhysicalMaterial(o);
  const shadowy = (m) => { m.castShadow = !lite; return m; };

  // ---------- tablet + pencil ----------
  const TW = 1.7, TH = 2.4, TD = 0.06;
  const tabletPivot = new THREE.Group(); scene.add(tabletPivot);
  const tablet = new THREE.Group(); tablet.position.y = TH / 2; tabletPivot.add(tablet);
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(TW, TH, 0.13), { depth: TD, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.016, bevelSegments: 5, curveSegments: 20 });
  bodyGeo.translate(0, 0, -TD / 2);
  const alu = physical({ color: "#d4d8dc", metalness: 1, roughness: 0.32, clearcoat: 0.15 });
  tablet.add(shadowy(new THREE.Mesh(bodyGeo, alu)));
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(TW - 0.012, TH - 0.012, 0.125), 20), physical({ color: "#050608", roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }));
  bezel.position.z = TD / 2 + 0.0165; tablet.add(bezel);
  const SW = TW - 0.15, SH = TH - 0.15;
  const scrCanvas = document.createElement("canvas"); scrCanvas.width = 1024; scrCanvas.height = Math.round(1024 * SH / SW);
  const scrCtx = scrCanvas.getContext("2d");
  const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = maxAniso;
  const screenGeo = new THREE.ShapeGeometry(roundedRect(SW, SH, 0.07), 12);
  { const uv = screenGeo.attributes.uv, pos = screenGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / SW + 0.5, pos.getY(i) / SH + 0.5); }
  const screenMat = physical({ color: "#000", emissive: "#ffffff", emissiveMap: scrTex, emissiveIntensity: 0.92, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.35 });
  const screen = new THREE.Mesh(screenGeo, screenMat); screen.position.z = TD / 2 + 0.017; tablet.add(screen);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 32), physical({ color: "#0b0c0e", roughness: 0.1, clearcoat: 1 }));
  lens.rotation.x = Math.PI / 2; lens.position.set(-TW / 2 + 0.22, TH / 2 - 0.22, -TD / 2 - 0.02); tablet.add(lens);
  let screenMode = -1, lastDraw = 0;
  function drawScreen(mode, time) { mode === 0 ? screenPatient(scrCtx, scrCanvas.width, scrCanvas.height, time) : screenProvider(scrCtx, scrCanvas.width, scrCanvas.height); scrTex.needsUpdate = true; screenMode = mode; }
  onLang(() => drawScreen(screenMode < 0 ? 0 : screenMode, performance.now() / 1000));

  const pencil = new THREE.Group(); scene.add(pencil);
  {
    const Lp = 1.75, R = 0.034, white = physical({ color: "#f4f4f2", roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.3 });
    pencil.add(shadowy(new THREE.Mesh(new THREE.CylinderGeometry(R, R, Lp, 48), white)));
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(R, 0.008, 0.17, 48), white); cone.position.y = -Lp / 2 - 0.085; pencil.add(shadowy(cone));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 8), physical({ color: "#9aa1a6", roughness: 0.25 })); tip.position.y = -Lp / 2 - 0.172; pencil.add(tip);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), white); cap.scale.y = 0.35; cap.position.y = Lp / 2; pencil.add(cap);
  }

  // ---------- water shimmer over the river plate ----------
  const wScene = new THREE.Scene(), wCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const wU = { uPlate: { value: null }, uMask: { value: null }, uTime: { value: 0 }, uOpacity: { value: 0 }, uView: { value: new THREE.Vector2(1, 1) }, uBox: { value: new THREE.Vector2(1, 1) }, uScale: { value: 1 }, uOrigin: { value: new THREE.Vector2(0.5, 0.5) } };
  const wMat = new THREE.ShaderMaterial({
    uniforms: wU, depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `precision highp float; varying vec2 vUv;
      uniform sampler2D uPlate, uMask; uniform float uTime, uOpacity, uScale; uniform vec2 uView, uBox, uOrigin;
      void main(){
        vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uView;                 // css px from top-left
        vec2 b = (px - (uView - uBox) * 0.5) / uBox;                 // 0..1 inside the cover box
        vec2 iuv = uOrigin + (b - uOrigin) / uScale;                 // undo the layer scale
        float m = texture2D(uMask, iuv).r;
        if (m < 0.01) { gl_FragColor = vec4(0.0); return; }
        float depth = clamp((iuv.y - 0.6) / 0.4, 0.0, 1.0);          // ripples get bigger toward the viewer
        float t = uTime;
        vec2 d = vec2(sin(iuv.y * 260.0 - t * 1.9 + sin(iuv.x * 40.0 + t * 0.7) * 1.5) + 0.6 * sin(iuv.x * 90.0 + iuv.y * 120.0 + t * 1.3),
                      cos(iuv.y * 210.0 - t * 1.6 + iuv.x * 30.0)) * (0.0007 + 0.0016 * depth) * m;
        vec3 c = texture2D(uPlate, iuv + d).rgb;
        float g = sin(iuv.x * 520.0 + t * 2.4 + sin(iuv.y * 300.0 - t) * 3.0) * sin(iuv.y * 700.0 - t * 2.1 + iuv.x * 50.0);
        c += pow(max(g, 0.0), 14.0) * 0.22 * m * (0.4 + depth);  // sun glints
        float a = m * uOpacity;
        gl_FragColor = vec4(c * a, a);                                // premultiplied
      }`,
  });
  const wQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), wMat); wQuad.frustumCulled = false; wScene.add(wQuad);
  const texLoader = new THREE.TextureLoader();
  let waterReady = false;
  const waterOn = !lite && !reduced;
  async function loadWater() {
    if (!waterOn) return;
    // wait for the river plate URL from plates.js
    while (!urls.river) await new Promise((r) => setTimeout(r, 150));
    const [plate, mask] = await Promise.all([texLoader.loadAsync(urls.river), loadMask().then((u) => texLoader.loadAsync(u))]);
    for (const t of [plate, mask]) { t.colorSpace = THREE.NoColorSpace; t.flipY = false; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; }
    wU.uPlate.value = plate; wU.uMask.value = mask; waterReady = true;
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced) addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  let aspect = 1, portrait = false;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = aspect = w / h; portrait = aspect < 0.9;
    camera.fov = portrait ? 50 : 36; camera.updateProjectionMatrix();
    wU.uView.value.set(w, h); const bw = Math.max(w, h * 16 / 9); wU.uBox.value.set(bw, bw * 9 / 16);
  }
  addEventListener("resize", resize); resize();

  const qHero = new THREE.Quaternion(), qStand = new THREE.Quaternion(), qFall = new THREE.Quaternion(), qTmp = new THREE.Quaternion();
  const pHeroPencil = new THREE.Vector3(), qHeroPencil = new THREE.Quaternion();
  const vA = new THREE.Vector3(), camPos = new THREE.Vector3(), target = new THREE.Vector3();
  const pencilLocal = new THREE.Vector3(TW / 2 + 0.05, 0, 0);
  const X = new THREE.Vector3(1, 0, 0);
  const clock = new THREE.Clock();
  let frames = 0, acc = 0, visible = true, cleared = false;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) clock.getDelta(); });

  function frame() { if (!shotMode) requestAnimationFrame(frame); if (visible) tick(); }
  function tick() {
    const dt = shotMode ? 1 / 60 : Math.min(clock.getDelta(), 0.1), time = shotMode ? 4 : clock.elapsedTime;
    if (!shotMode) { acc += dt; frames++; if (frames >= 45) { if (acc / frames > 0.034 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); } frames = 0; acc = 0; } }
    if (!shotMode) { mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05; }
    const r = easeInOut(S.rise), f = Math.pow(S.fall, 2.2), a = easeInOut(S.approach);
    const showTablet = S.approach < 0.55;
    const showWater = waterReady && L.riverOpacity > 0.01;
    renderer.clear();
    if (!showTablet && !showWater) { cleared = true; return; }
    cleared = false;
    if (showTablet) {
      // tablet: resting on the lobby floor at an angle -> stands up -> falls toward the camera
      const heroX = portrait ? 0.3 : 0.95, heroZ = portrait ? -0.4 : -1.1;
      qHero.setFromEuler(new THREE.Euler(-0.62, -0.32, 0.05, "YXZ"));
      qStand.setFromEuler(new THREE.Euler(0, -0.1 + mouse.x * 0.12 * (1 - f), 0, "YXZ"));
      qTmp.slerpQuaternions(qHero, qStand, r);
      const float = Math.sin(time * 1.2) * 0.04 * (1 - f) * r;
      qFall.setFromAxisAngle(X, f * 1.52 + (1 - r) * mouse.y * 0.03);
      tabletPivot.quaternion.copy(qTmp).multiply(qFall);
      tabletPivot.position.set(lerp(heroX, 0, r), lerp(0.0, 0.45, r) + float - f * 0.15, lerp(heroZ, 0, r) + f * 2.6);
      const mode = r > 0.55 ? 1 : 0;
      if (mode !== screenMode || (mode === 0 && time - lastDraw > 0.3)) { drawScreen(mode, time); lastDraw = time; }
      // pencil lies on the floor in front of the tablet, then flies to its side
      const b = sstep(0.25, 0.9, S.rise);
      pHeroPencil.set(heroX - (portrait ? 0.5 : 0.95), 0.035, heroZ + 1.55);
      qHeroPencil.setFromEuler(new THREE.Euler(Math.PI / 2, 1.25, 0, "YXZ"));
      tablet.updateWorldMatrix(true, false);
      vA.copy(pencilLocal).applyMatrix4(tablet.matrixWorld);
      tablet.getWorldQuaternion(qTmp);
      pencil.position.lerpVectors(pHeroPencil, vA, b); pencil.position.y += Math.sin(b * Math.PI) * 0.5; pencil.position.z += Math.sin(b * Math.PI) * 0.4;
      pencil.quaternion.slerpQuaternions(qHeroPencil, qTmp, b);
      floor.material.opacity = 0.34 * (1 - sstep(0.2, 0.7, S.rise));
      // camera: low lobby view -> eye level in front of the tablet -> pushes through as it falls
      const fitDist = (TW / 0.74 / aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const standZ = Math.max(5.6, fitDist);
      camPos.set(lerp(portrait ? 0 : 0.1, 0, r), lerp(1.55, 1.6, r), lerp(portrait ? 10.5 : 6.2, standZ, r));
      camPos.y -= f * 0.12; camPos.z += (-5.2 - standZ) * a;
      camPos.x += mouse.x * 0.15; camPos.y += -mouse.y * 0.06;
      target.set(lerp(portrait ? 0.3 : 0.0, 0, r), lerp(portrait ? 3.9 : 0.75, 1.62, r), 0);
      camera.position.copy(camPos); camera.lookAt(target);
      renderer.render(scene, camera);
    }
    if (showWater) {
      wU.uTime.value = time; wU.uOpacity.value = L.riverOpacity; wU.uScale.value = L.riverScale; wU.uOrigin.value.set(...L.riverOrigin);
      renderer.render(wScene, wCam);
    }
  }

  drawScreen(0, 0);
  frame();
  const allLoaded = loadWater().catch((e) => console.warn("water", e));
  window.__clinicpad = { S, renderer, scene, ready: Promise.resolve(), allLoaded, renderOnce: () => tick() };
  return Promise.resolve();
}
