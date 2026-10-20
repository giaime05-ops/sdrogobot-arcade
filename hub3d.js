// Prova 3D della sala: tutti gli oggetti sono costruiti con forme semplici (nessun modello esterno).
import * as THREE from "./vendor/three.module.min.js";

const $ = (id) => document.getElementById(id);
const cv = $("hub3d");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
} catch (e) { console.warn("3D non disponibile, resta la sala 2D", e); throw e; }
renderer.setClearColor(0x0d0706);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0d0706, 16, 30);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
const TARGET = new THREE.Vector3(0, 2.3, 0);
const QUAL = [{ n: "alta", pr: 2, sh: true }, { n: "media", pr: 1.5, sh: true }, { n: "bassa", pr: 1, sh: false }];
let qi = 0, animOn = true, yaw = 0, yawTarget = 0;
let autoQ = true;
try { const st = JSON.parse(localStorage.getItem("arc_settings") || "{}"); if (st.q !== undefined && st.q !== "auto") { qi = Math.max(0, Math.min(2, +st.q)); autoQ = false; } else { const sv = parseInt(localStorage.getItem("arc3dq"), 10); if (sv >= 0 && sv < 3) qi = sv; } if (st.anim === false) animOn = false; } catch (e) {}

// ---------- utilità ----------
const matCache = {};
function M(color, extra) {
  const k = color + JSON.stringify(extra || {});
  return matCache[k] || (matCache[k] = new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {})));
}
function B(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof mat === "number" ? M(mat) : mat);
  m.position.set(x, y, z); (parent || scene).add(m); return m;
}
function C(rt, rb, h, mat, x, y, z, parent, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), typeof mat === "number" ? M(mat) : mat);
  m.position.set(x, y, z); (parent || scene).add(m); return m;
}
const texAll = [];
function tex(w, h, fn) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.userData.fn = fn; texAll.push(t); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const WOOD = 0x6b4128, GOLD = 0xe8c36a;
function woodTex(w, h, base, vary) {
  return tex(w, h, (g, W, H) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const y = Math.random() * H, a = 0.05 + Math.random() * 0.12; g.strokeStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,190,150,${a * 0.5})`; g.lineWidth = 1 + Math.random() * vary; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * .3, y + (Math.random() - .5) * 30, W * .7, y + (Math.random() - .5) * 30, W, y + (Math.random() - .5) * 10); g.stroke(); }
  });
}
const FONT = "Bungee, Impact, 'Arial Black', sans-serif";
// ambiente riflesso finto (pannelli neon) per far brillare i metalli
{
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(20, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0d0410, side: THREE.BackSide })));
  const pan = (col, w, h, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  pan(0xff2e88, 12, 5, -10, 4, -6); pan(0x35d0ff, 12, 5, 10, 4, -6); pan(0xffe0b8, 14, 3, 0, 14, 0); pan(0x8a6cff, 10, 3, 0, 3, 14); pan(0xffffff, 6, 2, 0, 6, -12);
  scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose();
}
const msCache = {};
function MS(color, metal, rough, extra) {
  const k = color + "|" + metal + "|" + rough + JSON.stringify(extra || {});
  return msCache[k] || (msCache[k] = new THREE.MeshStandardMaterial(Object.assign({ color, metalness: metal, roughness: rough }, extra || {})));
}
const NEONM = (c) => new THREE.MeshBasicMaterial({ color: c });
function plate(text, w, h, glow, core, x, y, z, parent, rotX) {
  const t = tex(1024, Math.round(1024 * h / w), (g, W, H) => {
    g.clearRect(0, 0, W, H); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    let size = H * 0.7; g.font = size + "px " + FONT; while (g.measureText(text).width > W * 0.92 && size > 10) { size -= 4; g.font = size + "px " + FONT; }
    g.shadowColor = glow; g.shadowBlur = 40; g.lineWidth = size * 0.12; g.strokeStyle = glow; g.strokeText(text, W / 2, H / 2 + size * 0.04);
    g.shadowBlur = 14; g.lineWidth = size * 0.06; g.strokeStyle = glow; g.strokeText(text, W / 2, H / 2 + size * 0.04);
    g.shadowBlur = 0; g.fillStyle = core; g.fillText(text, W / 2, H / 2 + size * 0.04);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.position.set(x, y, z); if (rotX) m.rotation.x = rotX; (parent || scene).add(m); return m;
}

// ---------- luci (neon rosa e blu, stanza morbida e leggibile) ----------
scene.add(new THREE.AmbientLight(0x4c2650, 1.5 * Math.PI));
const spot = new THREE.SpotLight(0xff3da0, 22 * Math.PI, 0, Math.PI / 4.2, 0.8, 1.3);
spot.position.set(0, 5.6, 0); spot.target.position.set(0, 0.9, -0.3); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0006; spot.shadow.camera.near = 1; spot.shadow.camera.far = 14; spot.shadow.radius = 4; scene.add(spot, spot.target);
const spotW = new THREE.SpotLight(0xffe6d0, 10 * Math.PI, 0, Math.PI / 5.5, 0.9, 1.3);
spotW.position.set(0, 5.6, 0.4); spotW.target.position.set(0, 0.9, -0.1); spotW.castShadow = true; spotW.shadow.mapSize.set(1024, 1024); spotW.shadow.bias = -0.0006; spotW.shadow.camera.near = 1; spotW.shadow.camera.far = 14; spotW.shadow.radius = 4; scene.add(spotW, spotW.target);
const neonL = new THREE.PointLight(0xff2e88, 3.4 * Math.PI, 13, 1.3); neonL.position.set(-1.8, 5.5, -3.4); scene.add(neonL);
const neonC = new THREE.PointLight(0xff2e88, 2.6 * Math.PI, 13, 1.3); neonC.position.set(1.8, 5.5, -3.4); scene.add(neonC);
const blueL = new THREE.PointLight(0x2ab4ff, 3.0 * Math.PI, 11, 1.3); blueL.position.set(-3.6, 5.3, 0.5); scene.add(blueL);
const blueR = new THREE.PointLight(0x2ab4ff, 3.0 * Math.PI, 11, 1.3); blueR.position.set(3.6, 5.3, 0.5); scene.add(blueR);

// ---------- stanza ----------
const floorTex = tex(1024, 1024, (g, w, h) => {
  for (let r = 0; r < 16; r++) {
    const y = r * 64, l = 24 + Math.random() * 8;
    g.fillStyle = `hsl(22,52%,${l}%)`; g.fillRect(0, y, w, 64);
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`; g.beginPath(); g.moveTo(0, y + Math.random() * 64); g.lineTo(w, y + Math.random() * 64); g.stroke(); }
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, y, w, 2);
    const off = (r % 2) * 300; g.fillRect(off, y, 2, 64); g.fillRect((off + 512) % w, y, 2, 64);
  }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(3, 3);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.15, envMapIntensity: 0.8 }));
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0); scene.add(floor);

const wallTex = tex(1024, 512, (g, w, h) => {
  for (let i = 0; i < 16; i++) {
    g.fillStyle = `hsl(12,45%,${24 + Math.random() * 7}%)`; g.fillRect(i * 64, 0, 64, h);
    for (let k = 0; k < 10; k++) { g.strokeStyle = "rgba(0,0,0,.08)"; g.beginPath(); g.moveTo(i * 64 + Math.random() * 64, 0); g.lineTo(i * 64 + Math.random() * 64, h); g.stroke(); }
    g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(i * 64, 0, 2, h);
  }
});
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(1.4, 1);
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.42, metalness: 0.12, envMapIntensity: 1.0 });
const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.4), wallMat); back.position.set(0, 3.2, -4.6); scene.add(back);
for (const s of [-1, 1]) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.4), wallMat);
  w.rotation.y = -s * Math.PI / 2; w.position.set(s * 3.9, 3.2, 2.4); scene.add(w);
}
// soffitto a cassettoni con pannelli illuminati e doppi neon
const ceilY = 6.4;
const ceilTex = tex(896, 1024, (g, W, H) => {
  g.fillStyle = "#1e0d0c"; g.fillRect(0, 0, W, H);
  const cols = 7, rows = 8, bw = 30;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * W / cols + bw / 2, y = j * H / rows + bw / 2, w = W / cols - bw, h = H / rows - bw;
    const gr = g.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, Math.max(w, h) * 0.7); gr.addColorStop(0, "#ff5cbb"); gr.addColorStop(0.55, "#b02a86"); gr.addColorStop(1, "#4a0f44"); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.strokeStyle = "rgba(0,0,0,.65)"; g.lineWidth = 8; g.strokeRect(x, y, w, h);
    g.strokeStyle = "rgba(255,140,210,.35)"; g.lineWidth = 3; g.strokeRect(x + 6, y + 6, w - 12, h - 12);
  }
});
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 16), new THREE.MeshBasicMaterial({ map: ceilTex, color: 0xcfcfcf })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, ceilY, 3.4); scene.add(ceil);
const beam = new THREE.MeshStandardMaterial({ map: woodTex(256, 128, "#4a2418", 3), roughness: 0.4, metalness: 0.1, envMapIntensity: 0.9 });
const beamTrim = MS(0xb7863f, 0.9, 0.3);
for (let i = -3; i <= 3; i++) { B(0.3, 0.3, 15, beam, i * 2.0, ceilY - 0.15, 3.0); B(0.34, 0.03, 15, beamTrim, i * 2.0, ceilY - 0.31, 3.0); }
for (let k = 0; k < 7; k++) { B(14, 0.3, 0.3, beam, 0, ceilY - 0.15, -4.3 + k * 1.9); B(14, 0.03, 0.34, beamTrim, 0, ceilY - 0.31, -4.3 + k * 1.9); }
// LED: canalina in alluminio + tubo diffusore luminoso + alone
const glowTex = tex(16, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const alu = MS(0x3a3d44, 0.9, 0.35);
function ledTube(axis, len, col, x, y, z, faceDir) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const along = (m) => { if (axis === "z") m.rotation.y = Math.PI / 2; return m; };
  g.add(along(new THREE.Mesh(new THREE.BoxGeometry(len, 0.11, 0.11), alu)));
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, len - 0.1, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.45) }));
  tube.rotation.z = Math.PI / 2; if (axis === "z") tube.rotation.set(Math.PI / 2, 0, 0); tube.position.set(0, 0, 0.0); 
  const off = axis === "x" ? [0, 0, 0.055] : [faceDir * 0.055, 0, 0]; tube.position.set(off[0], off[1], off[2]); g.add(tube);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.4, 1.0), new THREE.MeshBasicMaterial({ map: glowTex, color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  if (axis === "x") { halo.position.set(0, 0, 0.07); } else { halo.rotation.y = faceDir * Math.PI / 2; halo.position.set(faceDir * 0.07, 0, 0); halo.rotation.z = 0; }
  g.add(halo);
  const n = Math.max(2, Math.round(len / 1.3));
  for (let i = 0; i <= n; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(axis === "x" ? 0.05 : 0.15, 0.15, axis === "x" ? 0.15 : 0.05), alu); const t = -len / 2 + 0.05 + (len - 0.1) * i / n; c.position.set(axis === "x" ? t : 0, 0, axis === "x" ? 0 : t); g.add(c); }
  return g;
}
// cornice di tubi neon rettangolare (rosa + azzurro), sotto le travi: due livelli
ledTube("x", 7.6, 0xff3d9a, 0, 5.92, -4.5); ledTube("x", 7.0, 0x35e0ff, 0, 5.70, -4.3);
for (const sx of [-1, 1]) { ledTube("z", 13.4, 0x35a8ff, sx * 3.84, 5.92, 2.4, -sx); ledTube("z", 13.0, 0xff3d9a, sx * 3.62, 5.70, 2.4, -sx); }
ledTube("x", 7.4, 0xb05cff, 0, 5.92, 6.0);
for (const sx of [-1, 1]) for (const [px, pz, py] of [[3.84, -4.5, 5.92], [3.62, -4.3, 5.70]]) B(0.18, 0.18, 0.18, alu, sx * px, py, pz);

// insegna al neon: immagine reale, senza cartellone, appesa con due cavi
const loader = new THREE.TextureLoader();
function loadTex(url) { const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const SPLIT = 0.57;
const mkSign = (url) => { const t = loadTex(url); return new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); };
const signTopMat = mkSign("assets/sign_pink.jpg"), signBotMat = mkSign("assets/sign_blue.jpg");
const SIGN_W = 5.5, SIGN_H = SIGN_W * 390 / 877, SIGN_Y = 4.15;
const signTop = new THREE.Mesh(new THREE.PlaneGeometry(SIGN_W, SIGN_H), signTopMat); signTop.position.set(0, SIGN_Y, -4.42); scene.add(signTop);
const signBot = new THREE.Mesh(new THREE.PlaneGeometry(SIGN_W, SIGN_H), signBotMat); signBot.position.set(0, SIGN_Y, -4.421); scene.add(signBot);
// sfarfallio indipendente: ogni tanto una scritta si spegne per un attimo
const flick = [{ next: 2, off: 0, burst: 0 }, { next: 4, off: 0, burst: 0 }];
function stepFlicker(time, mats) {
  let any = 0;
  flick.forEach((f, i) => {
    if (time > f.next) { f.burst = 1 + Math.floor(Math.random() * 3); f.next = time + 2.5 + Math.random() * 4; f.off = 0; f.t = time; }
    let v = 1;
    if (f.burst > 0) { const ph = (time - f.t) / 0.09; if (ph > f.burst * 2) f.burst = 0; else v = Math.floor(ph) % 2 === 0 ? 0.06 : 1; }
    mats[i].color.setScalar(0.92 * v); any += 1 - v;
  });
  return any;
}
const wireM = new THREE.MeshBasicMaterial({ color: 0x8e96a3, transparent: true, opacity: 0.55 });
for (const cx of [-2.15, 2.15]) { const top = ceilY - 0.1, bot = SIGN_Y + SIGN_H / 2 - 0.1, len = top - bot; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 5), wireM); c.position.set(cx, bot + len / 2, -4.4); scene.add(c); }
// cavi che pendono lungo la parete di fondo
const dark2 = new THREE.MeshBasicMaterial({ color: 0x15101a });
for (const [x0, x1] of [[-3.8, -1.3], [3.8, 1.3]]) {
  const cv2 = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, 6.05, -4.45), new THREE.Vector3((x0 * 2 + x1) / 3, 5.4, -4.45), new THREE.Vector3((x0 + x1 * 2) / 3, 5.5, -4.45), new THREE.Vector3(x1, 6.1, -4.45)]);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(cv2, 24, 0.014, 5), dark2));
}
// ringhiera in ottone sulle pareti laterali
const brass = MS(0xc99a4a, 0.9, 0.3);
for (const sx of [-1, 1]) {
  const rail = C(0.025, 0.025, 9, brass, sx * 3.75, 1.55, 0.2, null, 8); rail.rotation.x = Math.PI / 2; scene.add(rail);
  for (const pz of [-4, 2.5, 4.6]) C(0.025, 0.025, 1.55, brass, sx * 3.75, 0.78, pz, null, 8);
}

// ---------- carte ----------
function cardTex(rank, suit, red) {
  return tex(128, 180, (g, w, h) => {
    g.fillStyle = "#fbf7ea"; g.beginPath(); g.roundRect(0, 0, w, h, 12); g.fill(); g.strokeStyle = "#0005"; g.lineWidth = 3; g.beginPath(); g.roundRect(1.5, 1.5, w - 3, h - 3, 11); g.stroke();
    g.fillStyle = red ? "#c8182b" : "#14141a"; g.font = "bold 46px Oswald, sans-serif"; g.textAlign = "left"; g.textBaseline = "top";
    g.fillText(rank, 10, 8); g.font = "44px serif"; g.fillText(suit, 12, 54);
    g.font = "78px serif"; g.textAlign = "center"; g.fillText(suit, w / 2, 86); g.save(); g.translate(w - 10, h - 8); g.rotate(Math.PI); g.font = "bold 36px Oswald, sans-serif"; g.textAlign = "left"; g.fillText(rank, 0, 0); g.restore();
  });
}
function card(rank, suit, red, x, y, z, rot, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.48), new THREE.MeshLambertMaterial({ map: cardTex(rank, suit, red), transparent: true, alphaTest: 0.3 }));
  m.rotation.set(-Math.PI / 2, 0, rot || 0); m.position.set(x, y, z); (parent || scene).add(m); return m;
}
function chips(x, y, z, colors) {
  const par = x < 0 ? gL : gR;
  colors.forEach((c, i) => { C(0.1, 0.1, 0.035, M(c), x, y + i * 0.037, z, par, 20); C(0.103, 0.103, 0.012, M(0xf5f0e0), x, y + i * 0.037, z, par, 20); });
}

// ---------- tavolo centrale ovale: blackjack (verde, sinistra) e poker (rosso, destra) ----------
const TY = 0.98;
const table = new THREE.Group(); table.position.set(0, 0, -0.3); scene.add(table);
const tilt = new THREE.Group(); tilt.rotation.x = 0.13; table.add(tilt);
const ell = new THREE.Group(); ell.scale.set(2.3, 1, 1.0); tilt.add(ell);
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex(512, 128, '#4a1a1e', 3), roughness: 0.3, metalness: 0.1, envMapIntensity: 1.0 });
const ellBody = C(0.95, 0.95, 0.2, woodMat, 0, 0.9, 0, ell, 48);
const ringFull = new THREE.Mesh(new THREE.TorusGeometry(0.952, 0.012, 6, 64), NEONM(0xff6fb0)); ringFull.rotation.x = Math.PI / 2; ringFull.position.y = 1.0; ell.add(ringFull);
const tableTex = tex(1536, 666, (g, W, H) => {
  g.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, rx = W / 2 - 3, ry = H / 2 - 3;
  const ell2 = (k) => { g.beginPath(); g.ellipse(cx, cy, rx * k, ry * k, 0, 0, Math.PI * 2); };
  ell2(1); const wg = g.createLinearGradient(0, 0, W, H); wg.addColorStop(0, "#3b1218"); wg.addColorStop(1, "#5a1d22"); g.fillStyle = wg; g.fill();
  g.save(); ell2(1); g.clip(); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.12})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y = Math.random() * H; g.moveTo(0, y); g.bezierCurveTo(W * .3, y + 20 * Math.random(), W * .6, y - 20 * Math.random(), W, y + 10); g.stroke(); } g.restore();
  g.save(); g.shadowColor = "#ff5fa8"; g.shadowBlur = 20; g.strokeStyle = "#ffb0d4"; g.lineWidth = 7; ell2(0.975); g.stroke(); g.restore();
  g.save(); ell2(0.9); g.clip();
  g.fillStyle = "#0e5a37"; g.fillRect(0, 0, cx, H); g.fillStyle = "#6f0f20"; g.fillRect(cx, 0, cx, H);
  const gl = g.createRadialGradient(cx - W * .2, cy, 20, cx - W * .2, cy, W * .45); gl.addColorStop(0, "rgba(255,255,255,.10)"); gl.addColorStop(1, "rgba(0,0,0,.25)"); g.fillStyle = gl; g.fillRect(0, 0, cx, H);
  const gr = g.createRadialGradient(cx + W * .2, cy, 20, cx + W * .2, cy, W * .45); gr.addColorStop(0, "rgba(255,255,255,.08)"); gr.addColorStop(1, "rgba(0,0,0,.28)"); g.fillStyle = gr; g.fillRect(cx, 0, cx, H);
  g.restore();
  g.strokeStyle = "rgba(255,215,130,.9)"; g.lineWidth = 5; ell2(0.9); g.stroke(); g.strokeStyle = "rgba(255,225,180,.45)"; g.lineWidth = 3; ell2(0.58); g.stroke();
  g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 2;
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { g.strokeRect(cx + sx * W * 0.2 - 40 + i * 0, cy - 70 + i * 50, 80, 36); }
  g.fillStyle = "#2a1a14"; g.fillRect(cx - 20, cy - ry * 0.99, 40, ry * 1.98);
  g.fillStyle = "#ff8fc4"; g.fillRect(cx - 2, cy - ry * 0.99, 4, ry * 1.98);
  g.fillStyle = "#fff"; for (const dy of [-0.55, 0.5, 0.62]) for (const dx of (dy === -0.55 ? [0] : [-9, 9])) { g.beginPath(); g.arc(cx + dx, cy + ry * dy, 7, 0, 7); g.fill(); }
  const neon = (txt, x, y, glow, core) => { g.font = "68px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = glow; g.shadowBlur = 22; g.lineWidth = 9; g.strokeStyle = glow; g.strokeText(txt, x, y); g.shadowBlur = 0; g.fillStyle = core; g.fillText(txt, x, y); };
  g.save(); g.translate(cx - W * 0.25, cy + ry * 0.42); g.rotate(-0.08); neon("POKER", 0, 0, "#26e08a", "#d8ffea"); g.restore();
  g.save(); g.translate(cx + W * 0.25, cy + ry * 0.42); g.rotate(0.1); neon("BLACKJACK", 0, 0, "#ff4d78", "#ffe0e8"); g.restore();
  g.strokeStyle = "rgba(255,215,130,.85)"; g.lineWidth = 2.5; ell2(0.865); g.stroke(); ell2(0.52); g.stroke();
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.12 + i * 0.095), px = cx + Math.cos(a) * rx * 0.935, py = cy + Math.sin(a) * ry * 0.935; for (const m of [1, -1]) { const qx = cx + (px - cx) * 1, qy = cy + m * (py - cy); const gr2 = g.createRadialGradient(qx - 3, qy - 3, 2, qx, qy, 16); gr2.addColorStop(0, "#fff0b0"); gr2.addColorStop(0.5, "#d9a94a"); gr2.addColorStop(1, "#6b4a15"); g.fillStyle = gr2; g.beginPath(); g.arc(qx, qy, 15, 0, 7); g.fill(); g.fillStyle = "#1a0a0c"; g.beginPath(); g.arc(qx, qy, 9, 0, 7); g.fill(); } }
});
const halfMat = (offs) => { const t = tableTex.clone(); t.repeat.set(0.5, 1); t.offset.set(offs, 0); t.needsUpdate = true; texAll.push(t); return new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5 }); };
const halfBJ = new THREE.Mesh(new THREE.PlaneGeometry(2.19, 1.9), halfMat(0)); const halfPK = new THREE.Mesh(new THREE.PlaneGeometry(2.19, 1.9), halfMat(0.5));
const gL = new THREE.Group(), gR = new THREE.Group(); tilt.add(gL); tilt.add(gR);            // sinistra (poker) e destra (blackjack): si allargano per far posto al tasto Heist
halfBJ.position.set(-1.095, 1.012, 0); halfPK.position.set(1.095, 1.012, 0);
for (const [h, gr] of [[halfBJ, gL], [halfPK, gR]]) { h.rotation.x = -Math.PI / 2; gr.add(h); }
C(0.22, 0.3, 0.8, MS(0x2a1014, 0.3, 0.3), 0, 0.4, 0, table, 32); C(0.7, 0.72, 0.06, MS(0xd9a94a, 0.95, 0.25), 0, 0.03, 0, table, 36);
const tc = (r, su, rd, x, z, rot) => card(r, su, rd, x, TY + 0.06, z, rot, x < 0 ? gL : gR);
// poker (verde, sinistra): 5 carte comuni a ventaglio in fondo, fiche dietro
[["A", "♥", 1], ["K", "♠", 0], ["Q", "♦", 1], ["J", "♣", 0], ["10", "♥", 1]].forEach((c, i) => tc(c[0], c[1], !!c[2], -1.6 + i * 0.22, -0.34 + Math.abs(i - 2) * 0.03, (i - 2) * 0.14));
chips(-0.75, 1.03, -0.42, [0xc8182b, 0xc8182b, 0x14141a, 0x2b6fd6]); chips(-0.55, 1.03, -0.34, [0x14141a, 0xffd34d, 0xffd34d]);
// blackjack (rosso, destra): solo asso e re
[["A", "♠", 0], ["K", "♥", 1]].forEach((c, i) => tc(c[0], c[1], !!c[2], 1.0 + i * 0.2, -0.3, 0.12 - i * 0.24));
chips(1.75, 1.03, -0.37, [0xffd34d, 0xffd34d, 0x25e1d3, 0x14141a]); chips(1.95, 1.03, -0.3, [0xc8182b, 0x25e1d3, 0x25e1d3]);

// ---------- tasto Heist: solo nell'account admin di prova il tavolo si allarga al centro e compare il pulsante rosso ----------
const HS = 0.42;
const heistG = new THREE.Group(); heistG.visible = false; tilt.add(heistG);
{
  const ellL = new THREE.Group(), ellR = new THREE.Group(); ellL.scale.set(2.3, 1, 1); ellR.scale.set(2.3, 1, 1); ellL.position.x = -HS; ellR.position.x = HS; heistG.add(ellL); heistG.add(ellR);
  C(0.95, 0.95, 0.2, woodMat, 0, 0.9, 0, ellL, 48); C(0.95, 0.95, 0.2, woodMat, 0, 0.9, 0, ellR, 48);
  B(2 * HS + 0.02, 0.2, 1.9, woodMat, 0, 0.9, 0, heistG);
  for (const [g2, rz] of [[ellL, Math.PI / 2], [ellR, -Math.PI / 2]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.952, 0.012, 6, 40, Math.PI), NEONM(0xff6fb0)); r.rotation.set(Math.PI / 2, 0, rz); r.position.y = 1.0; g2.add(r); }
  for (const sz of [-1, 1]) B(2 * HS + 0.02, 0.024, 0.024, NEONM(0xff6fb0), 0, 1.0, sz * 0.95, heistG);
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(2 * HS + 0.02, 1.9), new THREE.MeshLambertMaterial({ color: 0x1b0d14 })); felt.rotation.x = -Math.PI / 2; felt.position.y = 1.011; heistG.add(felt);
  for (const sx of [-1, 1]) B(0.012, 0.012, 1.8, MS(0xe8c36a, 0.9, 0.3), sx * (HS - 0.03), 1.014, 0, heistG);
}
const btnG = new THREE.Group(); btnG.position.set(0, 1.012, 0); heistG.add(btnG);
C(0.3, 0.33, 0.07, MS(0xd9a94a, 0.95, 0.25), 0, 0.035, 0, btnG, 40);
C(0.25, 0.27, 0.05, MS(0x2a1014, 0.5, 0.4), 0, 0.09, 0, btnG, 40);
const heistCap = C(0.2, 0.23, 0.12, new THREE.MeshStandardMaterial({ color: 0xe01030, metalness: 0.25, roughness: 0.2, emissive: 0xb00a22, emissiveIntensity: 0.9 }), 0, 0.175, 0, btnG, 40);
const heistTop = C(0.13, 0.2, 0.025, new THREE.MeshStandardMaterial({ color: 0xff4a63, metalness: 0.2, roughness: 0.2, emissive: 0xff2040, emissiveIntensity: 1.1 }), 0, 0.245, 0, btnG, 40);
const NEON_CYC = [0xff2fd0, 0x2ff0ff, 0xff2a4a, 0xffe82a, 0x2aff7a, 0xa855ff].map((h) => new THREE.Color(h)); const cycCol = new THREE.Color();
const heistHalo = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.012, 6, 48), NEONM(0xff3b5e)); heistHalo.rotation.x = Math.PI / 2; heistHalo.position.y = 0.075; btnG.add(heistHalo);

// ---------- slot machine futuristica (angolo in fondo a destra) ----------
const slot = new THREE.Group(); slot.position.set(3.0, 0, -3.3); slot.scale.setScalar(1.1); scene.add(slot);
const steel = MS(0x23262e, 0.85, 0.3), chrome = MS(0xd8dde6, 0.9, 0.18), dark = MS(0x0b0c11, 0.6, 0.35), body = MS(0x15161d, 0.7, 0.22);
const PINK = 0xff5fd0, CYAN = 0x6fe8ff;
B(1.3, 0.1, 1.0, chrome, 0, 0.05, 0, slot); B(1.12, 0.06, 0.9, dark, 0, 0.13, 0, slot);
B(0.98, 1.0, 0.8, body, 0, 0.66, -0.02, slot);            // pancia
B(0.98, 1.1, 0.7, body, 0, 1.64, -0.08, slot);            // torre
B(1.0, 0.5, 0.74, body, 0, 2.3, -0.08, slot);             // testata
B(1.0, 0.1, 0.78, body, 0, 2.58, -0.08, slot);
const hoodB = B(0.98, 0.06, 0.2, body, 0, 2.66, -0.25, slot); hoodB.rotation.x = -0.2;
for (const [sx, col] of [[-0.51, PINK], [0.51, CYAN]]) {
  const t = C(0.028, 0.028, 2.45, NEONM(col), sx, 1.35, 0.3, slot, 10);
  const t2 = C(0.028, 0.028, 0.35, NEONM(col), sx, 2.62, 0.04, slot, 10); t2.rotation.x = Math.PI / 2 - 0.1;
  const t3 = C(0.028, 0.028, 0.98, NEONM(PINK), 0, 2.67, -0.12, slot, 10); t3.rotation.z = Math.PI / 2;
}
const topTex = tex(512, 160, (g, w, h) => { g.fillStyle = "#08060c"; g.fillRect(0, 0, w, h); g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "70px " + FONT; g.shadowColor = "#ff5fd0"; g.shadowBlur = 20; g.lineWidth = 6; g.strokeStyle = "#ff5fd0"; g.strokeText("SLOT", w / 2, 52); g.shadowBlur = 0; g.fillStyle = "#ffe9f6"; g.fillText("SLOT", w / 2, 52);
  g.font = "70px " + FONT; g.shadowColor = "#6fe8ff"; g.shadowBlur = 18; g.lineWidth = 5; g.strokeStyle = "#6fe8ff"; g.strokeText("777", w / 2, 122); g.shadowBlur = 0; g.fillStyle = "#e6fbff"; g.fillText("777", w / 2, 122); });
const topLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.25), new THREE.MeshBasicMaterial({ map: topTex })); topLabel.position.set(0, 2.32, 0.3); slot.add(topLabel);
// fila di icone colorate
const bulbs = [];
[0x2f7dff, 0x2ecf5a, 0xffa233, 0xff5a3d, 0x25e1d3].forEach((c, i) => { const d = C(0.05, 0.05, 0.03, NEONM(c), -0.32 + i * 0.16, 1.98, 0.28, slot, 16); d.rotation.x = Math.PI / 2; bulbs.push(d); });
// rulli piatti con simboli che scorrono
const SYM = ["7", "BAR", "♦", "77", "♥", "★", "7", "♣"];
function reelStrip(offset) {
  return tex(128, 1024, (g, w, h) => {
    const cell = h / SYM.length;
    for (let i = 0; i < SYM.length; i++) {
      const gr = g.createLinearGradient(0, i * cell, 0, (i + 1) * cell); gr.addColorStop(0, "#132a6e"); gr.addColorStop(1, "#0b1a4a"); g.fillStyle = gr; g.fillRect(0, i * cell, w, cell);
      g.strokeStyle = "rgba(120,200,255,.35)"; g.lineWidth = 3; g.strokeRect(3, i * cell + 3, w - 6, cell - 6);
      const t = SYM[(i + offset) % SYM.length]; const red = t === "♦" || t === "♥" || t === "7" || t === "77";
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = (t.length > 2 ? 44 : 92) + "px " + FONT; g.shadowColor = red ? "#ff5fd0" : "#6fe8ff"; g.shadowBlur = 16; g.fillStyle = red ? "#ffd0f2" : "#d8f6ff"; g.fillText(t, w / 2, i * cell + cell / 2 + 4);
    }
  });
}
B(0.92, 0.5, 0.12, dark, 0, 1.56, 0.3, slot);
const reelMats = [];
for (let i = 0; i < 3; i++) {
  const t = reelStrip(i * 3); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3 / SYM.length); t.offset.set(0, 0);
  const m = new THREE.MeshBasicMaterial({ map: t, color: 0xdddddd }); reelMats.push(t);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.42), m); p.position.set(-0.29 + i * 0.29, 1.56, 0.365); slot.add(p);
}
{ const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.46), new THREE.MeshBasicMaterial({ color: 0x6fb8ff, transparent: true, opacity: 0.07, depthWrite: false })); gl.position.set(0, 1.56, 0.37); slot.add(gl); }
for (const [w, h, x, y] of [[0.94, 0.04, 0, 1.8], [0.94, 0.04, 0, 1.32], [0.04, 0.5, -0.46, 1.56], [0.04, 0.5, 0.46, 1.56], [0.025, 0.42, -0.145, 1.56], [0.025, 0.42, 0.145, 1.56]]) B(w, h, 0.06, chrome, x, y, 0.38, slot);
const reelState = [0, 0, 0], reelStop = [0, 0, 0];
// banco comandi inclinato + pulsanti + joystick
const desk = B(0.98, 0.14, 0.5, body, 0, 1.08, 0.3, slot); desk.rotation.x = 0.25;
B(0.98, 0.03, 0.5, NEONM(PINK), 0, 1.0, 0.45, slot);
[[-0.34, 0xffb070], [-0.2, 0xffb070], [0.18, 0x6fe8ff], [0.32, 0x6fe8ff]].forEach(([x, c]) => { const b = C(0.045, 0.05, 0.04, MS(c, 0.2, 0.3, { emissive: c, emissiveIntensity: 0.6 }), x, 1.16, 0.3, slot, 16); b.rotation.x = 0.25; });
C(0.012, 0.012, 0.16, chrome, 0, 1.2, 0.34, slot, 8).rotation.x = 0.25; { const j = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 14), chrome); j.position.set(0, 1.29, 0.37); slot.add(j); }
// pannello basso "777"
B(0.9, 0.62, 0.04, dark, 0, 0.5, 0.4, slot);
plate("777", 0.7, 0.36, "#6fe8ff", "#ffffff", 0, 0.52, 0.425, slot);
// una sola leva, a sinistra
const lever = new THREE.Group(); lever.position.set(-0.58, 1.15, 0.1); slot.add(lever);
C(0.022, 0.022, 0.55, chrome, -0.12, 0.25, 0, lever, 10).rotation.z = 0.38;
{ const bl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 14), chrome); bl.position.set(-0.22, 0.52, 0); lever.add(bl); }

// ---------- Mastermind: cassaforte futuristica (angolo in fondo a sinistra) ----------
const safe = new THREE.Group(); safe.position.set(-3.05, 0, -3.5); safe.scale.setScalar(1.1); scene.add(safe);
const brushed = MS(0x2d3036, 0.85, 0.32);
B(1.15, 1.35, 0.9, brushed, 0, 0.675, 0, safe);
B(1.15, 0.12, 0.9, MS(0x3b3f47, 0.85, 0.3), 0, 1.38, 0, safe);                     // coperchio
for (const sx of [-0.575, 0.575]) { const e = B(0.06, 1.35, 0.9, MS(0x3b3f47, 0.85, 0.3), sx, 0.675, 0, safe); }
const mmTex = tex(512, 640, (g, W, H) => {
  g.fillStyle = "#0a0c10"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#04090c"; g.fillRect(40, 40, W - 80, 110); g.strokeStyle = "rgba(60,230,255,.5)"; g.lineWidth = 3; g.strokeRect(40, 40, W - 80, 110);
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = "56px " + FONT; g.shadowColor = "#35e6ff"; g.shadowBlur = 20; g.fillStyle = "#bff8ff"; g.fillText("MASTERMIND", W / 2, 96); g.shadowBlur = 0;
  const cx = W / 2, cy = 300;
  g.strokeStyle = "rgba(60,230,255,.4)"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 122, 0, 7); g.stroke();
  const dots = ["#ff3b3b", "#ffa633", "#ffe94d", "#46e06a", "#35d0ff", "#5a6bff", "#ff5fd0"];
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; g.fillStyle = dots[i % dots.length]; g.shadowColor = g.fillStyle; g.shadowBlur = 8; g.beginPath(); g.arc(cx + Math.cos(a) * 104, cy + Math.sin(a) * 104, 7, 0, 7); g.fill(); }
  g.shadowBlur = 0; const q = [["#ff3b3b", -34, -34], ["#46e06a", 8, -34], ["#ffe94d", -34, 8], ["#3d6bff", 8, 8]];
  q.forEach(([c, dx, dy]) => { g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 22; g.fillRect(cx + dx, cy + dy, 28, 28); }); g.shadowBlur = 0;
  const keys = ["#ff3b3b", "#ffa633", "#46e06a", "#35d0ff", "#5a6bff", "#ff5fd0", "#ffe94d", "#46e06a", "#ff3b3b"];
  for (let i = 0; i < 9; i++) { g.fillStyle = keys[i]; g.fillRect(120 + (i % 3) * 36, 470 + Math.floor(i / 3) * 30, 30, 24); }
  g.fillStyle = "#1a1c22"; g.fillRect(300, 462, 70, 80); g.fillStyle = "#35e6a0"; g.fillRect(312, 474, 46, 56);
  g.strokeStyle = "#ff5fd0"; g.shadowColor = "#ff5fd0"; g.shadowBlur = 16; g.lineWidth = 5; g.strokeRect(190, 575, 130, 22);
});
const mmFace = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 1.22), new THREE.MeshStandardMaterial({ map: mmTex, emissiveMap: mmTex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.3 })); mmFace.position.set(0, 0.7, 0.452); safe.add(mmFace);
const mmLights = [], mmQuad = [], mmDots = [0xff3b3b, 0xffa633, 0xffe94d, 0x46e06a, 0x35d0ff, 0x5a6bff, 0xff5fd0];
for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; const m = new THREE.Mesh(new THREE.CircleGeometry(0.019, 12), new THREE.MeshBasicMaterial({ color: mmDots[i % 7], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(Math.cos(a) * 0.199, 0.7 + (320 - 300) * 1.22 / 640 - Math.sin(a) * 0.199, 0.457); safe.add(m); mmLights.push(m); }
[[0xff3b3b, -34, -34], [0x46e06a, 8, -34], [0xffe94d, -34, 8], [0x3d6bff, 8, 8]].forEach(([c, dx, dy]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.054, 0.054), new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set((dx + 14) * 0.98 / 512, 0.7 + (320 - (300 + dy + 14)) * 1.22 / 640, 0.457); safe.add(m); mmQuad.push(m); });
for (const [w, h, x, y] of [[1.0, 0.035, 0, 1.32], [1.0, 0.035, 0, 0.08], [0.035, 1.28, -0.5, 0.7], [0.035, 1.28, 0.5, 0.7]]) B(w, h, 0.03, NEONM(0x35e6ff), x, y, 0.46, safe);

// ---------- roulette (ruota nera lucida con filo oro, come nel modello) ----------
const roul = new THREE.Group(); roul.position.set(-1.2, 0.12, 2.0); roul.scale.setScalar(1.0); scene.add(roul);
const rwoodD = new THREE.MeshStandardMaterial({ map: woodTex(512, 256, "#3d1d10", 3), roughness: 0.35, metalness: 0.1, envMapIntensity: 1.0 });
const blackG = MS(0x0e0f12, 0.5, 0.16), gold = MS(0xd9a94a, 0.95, 0.22);
C(0.16, 0.24, 0.76, rwoodD, 0, 0.38, 0, roul, 28); C(0.34, 0.4, 0.07, rwoodD, 0, 0.035, 0, roul, 32);
C(0.78, 0.74, 0.1, rwoodD, 0, 0.79, 0, roul, 40);
C(0.66, 0.7, 0.08, blackG, 0, 0.88, 0, roul, 48);                       // vasca nera lucida
{ const gr1 = new THREE.Mesh(new THREE.TorusGeometry(0.665, 0.014, 8, 64), gold); gr1.rotation.x = Math.PI / 2; gr1.position.y = 0.925; roul.add(gr1); const bv = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.03, 10, 64), blackG); bv.rotation.x = Math.PI / 2; bv.position.y = 0.88; roul.add(bv); }
const wheel = new THREE.Group(); wheel.position.set(0, 0.935, 0); roul.add(wheel);
const rouTex = tex(1024, 1024, (g, W, H) => {
  const cx = W / 2, cy = H / 2, seq = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const gr0 = g.createRadialGradient(cx, cy, 40, cx, cy, 500); gr0.addColorStop(0, "#202228"); gr0.addColorStop(1, "#0a0b0e"); g.fillStyle = gr0; g.beginPath(); g.arc(cx, cy, 500, 0, 7); g.fill();
  g.strokeStyle = "#d9a94a"; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 486, 0, 7); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; g.strokeStyle = "rgba(217,169,74,.7)"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * 330, cy + Math.sin(a) * 330); g.lineTo(cx + Math.cos(a) * 470, cy + Math.sin(a) * 470); g.stroke(); g.fillStyle = "#d9a94a"; g.beginPath(); g.ellipse(cx + Math.cos(a + Math.PI / 8) * 420, cy + Math.sin(a + Math.PI / 8) * 420, 22, 4, a + Math.PI / 8 + Math.PI / 2, 0, 7); g.fill(); }
  g.fillStyle = "#d9a94a"; g.beginPath(); g.arc(cx, cy, 330, 0, 7); g.fill();
  const n = seq.length;
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2 - Math.PI / 2 - Math.PI / n, a1 = a0 + Math.PI * 2 / n;
    g.fillStyle = seq[i] === 0 ? "#18a64f" : (i % 2 ? "#17181c" : "#cc1a2e");
    g.beginPath(); g.arc(cx, cy, 322, a0, a1); g.arc(cx, cy, 250, a1, a0, true); g.closePath(); g.fill();
    g.strokeStyle = "#d9a94a"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + Math.cos(a0) * 190, cy + Math.sin(a0) * 190); g.lineTo(cx + Math.cos(a0) * 322, cy + Math.sin(a0) * 322); g.stroke();
    const am = (a0 + a1) / 2; g.save(); g.translate(cx + Math.cos(am) * 288, cy + Math.sin(am) * 288); g.rotate(am + Math.PI / 2); g.fillStyle = "#fff"; g.font = "bold 36px Oswald, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(seq[i]), 0, 0); g.restore();
  }
  g.fillStyle = "#d9a94a"; g.beginPath(); g.arc(cx, cy, 248, 0, 7); g.fill();
  const gr = g.createRadialGradient(cx, cy, 10, cx, cy, 236); gr.addColorStop(0, "#2a2c33"); gr.addColorStop(1, "#0d0e12"); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 236, 0, 7); g.fill();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.strokeStyle = "rgba(217,169,74,.65)"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); g.lineTo(cx + Math.cos(a) * 236, cy + Math.sin(a) * 236); g.stroke(); }
});
const rdisc = new THREE.Mesh(new THREE.CircleGeometry(0.6, 64), new THREE.MeshStandardMaterial({ map: rouTex, roughness: 0.22, metalness: 0.3, envMapIntensity: 1.0 })); rdisc.rotation.x = -Math.PI / 2; rdisc.position.y = 0.0; wheel.add(rdisc);
C(0.05, 0.075, 0.1, gold, 0, 0.06, 0, wheel, 16); C(0.025, 0.025, 0.18, gold, 0, 0.17, 0, wheel, 12); { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 14), gold); kn.position.y = 0.27; wheel.add(kn); }
for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const arm = C(0.012, 0.012, 0.36, gold, Math.cos(a) * 0.18, 0.18, Math.sin(a) * 0.18, wheel, 8); arm.rotation.set(0, 0, 0); arm.rotation.z = Math.PI / 2; arm.rotation.y = -a; const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), gold); ball2.position.set(Math.cos(a) * 0.36, 0.18, Math.sin(a) * 0.36); wheel.add(ball2); }
plate("ROULETTE", 0.8, 0.17, "#ffb340", "#fff0d0", 0, 0.62, 0.9, roul);
const rball = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 })); roul.add(rball);

// ---------- Gratta e Vinci: distributore futuristico con insegna neon ----------
const kiosk = new THREE.Group(); kiosk.position.set(0, 0, -4.1); kiosk.scale.setScalar(1.2); scene.add(kiosk);
const kdark = MS(0x14151a, 0.7, 0.28);
B(0.9, 1.6, 0.55, kdark, 0, 0.8, 0, kiosk);
B(0.9, 0.08, 0.55, MS(0x23252c, 0.8, 0.3), 0, 1.64, 0, kiosk);
for (const sx of [-0.46, 0.46]) B(0.035, 1.62, 0.58, NEONM(0xff3db0), sx, 0.82, 0.01, kiosk);
const kTex = tex(256, 400, (g, w, h) => {
  g.fillStyle = "#06070a"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,61,176,.5)"; g.lineWidth = 3; g.strokeRect(14, 14, w - 28, 250);
  const grad = g.createRadialGradient(w / 2, 140, 10, w / 2, 140, 130); grad.addColorStop(0, "rgba(60,230,255,.35)"); grad.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = grad; g.fillRect(14, 14, w - 28, 250);
  g.save(); g.translate(w / 2, 140); g.rotate(-0.5); g.shadowColor = "#35e6ff"; g.shadowBlur = 24; g.strokeStyle = "#8ff3ff"; g.lineWidth = 6; g.strokeRect(-56, -80, 112, 160);
  g.strokeStyle = "#ff7ad9"; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-34 + i * 18, -30); g.lineTo(-12 + i * 18, 20); g.stroke(); } g.beginPath(); g.arc(18, -48, 12, 0, 7); g.stroke(); g.restore();
  g.shadowBlur = 12; g.shadowColor = "#fff"; g.fillStyle = "#fff"; for (const [x, y] of [[50, 60], [200, 90], [60, 210], [190, 220], [210, 40]]) { g.fillRect(x, y, 4, 4); }
});
const kface = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.12), new THREE.MeshStandardMaterial({ map: kTex, emissiveMap: kTex, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.2 })); kface.position.set(0, 1.0, 0.285); kiosk.add(kface);
for (const [w, h, x, y] of [[0.74, 0.03, 0, 1.57], [0.74, 0.03, 0, 0.43], [0.03, 1.14, -0.37, 1.0], [0.03, 1.14, 0.37, 1.0]]) B(w, h, 0.03, NEONM(0xff3db0), x, y, 0.29, kiosk);
// vassoio magenta con biglietti
B(0.52, 0.2, 0.08, NEONM(0xff3db0), 0, 0.3, 0.3, kiosk); B(0.44, 0.13, 0.1, MS(0x0a0a0e, 0.5, 0.4), 0, 0.3, 0.31, kiosk);
// insegna neon sulla cima
B(1.0, 0.58, 0.08, MS(0x0c0a10, 0.6, 0.4), 0, 1.98, 0.02, kiosk);
B(1.0, 0.025, 0.09, NEONM(0xff3db0), 0, 2.27, 0.03, kiosk); B(1.0, 0.025, 0.09, NEONM(0xff3db0), 0, 1.69, 0.03, kiosk);
plate("GRATTA", 0.9, 0.24, "#ff3db0", "#ffd6ef", 0, 2.1, 0.07, kiosk); plate("E VINCI", 0.9, 0.24, "#ff3db0", "#ffd6ef", 0, 1.84, 0.07, kiosk);

// ---------- Aviator: insegna neon con aeroplano di carta (parete di fondo, sopra la cassaforte) ----------
const ptab = new THREE.Group(); ptab.position.set(-2.95, 2.45, -4.4); scene.add(ptab);
const ppMat = new THREE.MeshBasicMaterial({ map: loadTex("assets/paperplane.png"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const haloAv = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); haloAv.position.set(0, 0, -0.01); ptab.add(haloAv);
const pp = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25 * 405 / 640), ppMat); pp.position.set(0, 0.15, 0); ptab.add(pp);
const AVI_TXT = "A V I A T O R";
const avBack = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.3), new THREE.MeshBasicMaterial({ map: tex(256, 53, (g, w, h) => { g.fillStyle = "rgba(3,3,6,.9)"; g.beginPath(); g.roundRect(0, 0, w, h, 18); g.fill(); g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 2; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 16); g.stroke(); }), transparent: true, depthWrite: false })); avBack.position.set(0, -0.45, 0.005); ptab.add(avBack);
plate(AVI_TXT, 1.3, 0.24, "#ffffff", "#ffffff", 0, -0.45, 0.012, ptab);

// ---------- tavolino con il quaderno Wordle (davanti a destra) ----------
const wtab = new THREE.Group(); wtab.position.set(1.3, 0.12, 2.0); wtab.scale.setScalar(1.08); scene.add(wtab);
const slab = MS(0x1b1620, 0.35, 0.3, { envMapIntensity: 1.0 }), slabE = MS(0x2a2431, 0.6, 0.25);
C(0.12, 0.18, 0.74, slab, 0, 0.37, 0, wtab, 28); C(0.3, 0.34, 0.06, slab, 0, 0.03, 0, wtab, 32);
B(1.3, 0.06, 1.0, slab, 0, 0.78, 0, wtab); B(1.32, 0.012, 1.02, slabE, 0, 0.812, 0, wtab);
const nbTex = tex(300, 400, (g, w, h) => {
  g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#14141a"; g.font = "bold 26px Oswald, sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillText("WORDLE", w / 2, 58);
  const C_ = { g: "#5aa95a", y: "#c9b458", x: "#787c7e" }, rows = ["xyxxg", "ygxgg", "ggggg", "", "", ""];
  rows.forEach((r, ri) => { for (let k = 0; k < 5; k++) { const x = 40 + k * 44, y = 80 + ri * 44; if (r) { g.fillStyle = C_[r[k]]; g.fillRect(x, y, 40, 40); } else { g.strokeStyle = "#cfcfcf"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, 38, 38); } } });
  g.fillStyle = "#e4e4e0"; g.fillRect(0, 0, w, 18);
});
const nb = new THREE.Group(); nb.position.set(0, 0.845, 0); nb.rotation.y = 0.45; wtab.add(nb);
B(0.64, 0.04, 0.84, MS(0xdadde2, 0.1, 0.5), 0, 0, 0, nb); B(0.61, 0.02, 0.81, 0xfbfbf8, 0, 0.025, 0, nb);
const nbp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshStandardMaterial({ map: nbTex, roughness: 0.7, metalness: 0 })); nbp.rotation.x = -Math.PI / 2; nbp.position.y = 0.037; nb.add(nbp);
for (let i = 0; i < 11; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 14), MS(0xc9ccd2, 0.95, 0.25)); r.position.set(-0.25 + i * 0.05, 0.05, -0.39); r.rotation.y = Math.PI / 2; r.rotation.x = 0.3; nb.add(r); }
plate('WORDLE', 0.95, 0.16, '#6dff8a', '#e8ffe8', 0, 0.72, 0.58, wtab);


// ---------- zone toccabili (invisibili) ----------
const hits = [];
function hit(game, label, w, h, d, x, y, z, off) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  m.position.set(x, y, z); m.userData.game = game; m.userData.label = label; scene.add(m); if (!off) hits.push(m); return m;
}
const hitPK = hit("poker", "Poker", 2.1, 0.5, 1.8, -1.1, 1.05, -0.3);
const hitBJ = hit("blackjack", "Blackjack", 2.1, 0.5, 1.8, 1.1, 1.05, -0.3);
const hitH = hit("heist", "Sdrogo Heist", 0.8, 0.5, 1.4, 0, 1.15, -0.3, true);
hit("slot", "Slot 777", 1.3, 2.8, 1.1, 3.0, 1.3, -3.3);
hit("mastermind", "Mastermind", 1.3, 1.9, 1.0, -3.05, 0.95, -3.5);
hit("roulette", "Roulette", 1.5, 0.6, 1.5, -1.2, 0.95, 2.0);
hit("scratch", "Gratta e Vinci", 1.2, 2.8, 0.8, 0, 1.4, -4.1);
hit("aviator", "Aviator", 1.5, 1.1, 0.5, -2.95, 2.4, -4.3);
hit("wordle", "Wordle", 1.6, 0.5, 1.3, 1.3, 0.95, 2.0);
const TARGETS = { heist: btnG, poker: halfBJ, blackjack: halfPK, slot, mastermind: safe, roulette: roul, scratch: kiosk, aviator: ptab, wordle: wtab };
let heistOn = false;
function setHeist(on) {
  heistOn = !!on; const k = heistOn ? HS : 0;
  gL.position.x = -k; gR.position.x = k; ell.visible = !heistOn; heistG.visible = heistOn;
  hitPK.position.x = -1.1 - k; hitBJ.position.x = 1.1 + k;
  const i = hits.indexOf(hitH); if (heistOn && i < 0) hits.push(hitH); if (!heistOn && i >= 0) hits.splice(i, 1);
}
let glow = null;
function endGlow() { if (!glow) return; glow.list.forEach((e) => { e.o.material = e.orig; e.mat.dispose(); }); glow = null; }
let aviT = 0;
function highlight(game) {
  endGlow(); if (game === "aviator") aviT = 0.5; const root = TARGETS[game]; if (!root) return; const list = [];
  root.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive && !o.userData.game) {
      const mat = o.material.clone(); list.push({ o, orig: o.material, mat, base: o.material.emissiveIntensity, baseCol: o.material.emissive.clone() }); o.material = mat;
    }
  });
  glow = { list, t: 0 };
}
function stepGlow(dt) {
  if (!glow) return; glow.t += dt; const k = Math.sin(Math.min(1, glow.t / 0.5) * Math.PI);
  glow.list.forEach((e) => { e.mat.emissive.copy(e.baseCol).lerp(new THREE.Color(0xfff0d8), k); e.mat.emissiveIntensity = e.base + k * 0.2; });
  if (glow.t > 0.5) endGlow();
}

// ---------- ombre ----------
scene.traverse((o) => { if (o.isMesh && o.material && !o.material.isMeshBasicMaterial) { o.castShadow = true; o.receiveShadow = true; } });
floor.castShadow = false; back.castShadow = false;
function setShadows(on) {
  renderer.shadowMap.enabled = on; spot.castShadow = on; spotW.castShadow = on;
  scene.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)); } });
}

// ---------- camera ----------
const CAM = { dist: 7.4, height: 3.9 };
const WANT_W = 8.6;
function fitCamera() {
  const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight, asp = w / h;
  const vf = 2 * Math.atan((WANT_W / 2 / CAM.dist) / asp) * 180 / Math.PI;
  camera.fov = Math.max(40, Math.min(75, vf)); camera.aspect = asp; camera.updateProjectionMatrix();
}
function placeCamera() { camera.position.set(TARGET.x, CAM.height, TARGET.z + CAM.dist); camera.lookAt(TARGET); }
function resize() {
  if (renderer.shadowMap.enabled !== QUAL[qi].sh) setShadows(QUAL[qi].sh);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUAL[qi].pr));
  renderer.setSize(cv.clientWidth || innerWidth, cv.clientHeight || innerHeight, false); fitCamera();
}
addEventListener("resize", resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
resize();

// ---------- tocco sugli oggetti (il tocco apre il gioco reale) ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
cv.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, moved: false }; });
cv.addEventListener("pointermove", (e) => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) down.moved = true; });
cv.addEventListener("pointercancel", () => { down = null; });
cv.addEventListener("pointerup", (e) => {
  const d = down; down = null; if (!d || d.moved) return;
  const r = cv.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(hits, false)[0];
  if (h) { const g = h.object.userData.game; highlight(g); setTimeout(() => { if (window.Arcade3D && window.Arcade3D.onTap) window.Arcade3D.onTap(g); }, 140); }
});

// ---------- visibilità: il 3D si disegna solo quando si vede l'hub ----------
const SECTIONS = ["avi", "gm", "g4", "heist"];
let hubVisible = true;
function checkVisible() {
  const open = SECTIONS.some((id) => { const n = document.getElementById(id); return n && !n.hidden; });
  hubVisible = !open && !document.hidden && document.body.dataset.tab !== "other";
}
const mo = new MutationObserver(checkVisible);
SECTIONS.forEach((id) => { const n = document.getElementById(id); if (n) mo.observe(n, { attributes: true, attributeFilter: ["hidden"] }); });
mo.observe(document.body, { attributes: true, attributeFilter: ["data-tab"] });
document.addEventListener("visibilitychange", checkVisible);
checkVisible();

// ---------- ciclo di disegno + qualità automatica ----------
let last = performance.now(), time = 0, ready = false, skipN = 0;
let accT = 0, accF = 0, lowStreak = 0, dead = false;
function degrade() {
  if (!autoQ) return;
  if (qi < QUAL.length - 1) { qi++; try { localStorage.setItem("arc3dq", String(qi)); } catch (e) {} resize(); lowStreak = 0; return; }
  fallback2D();
}
function fallback2D() {
  dead = true; cv.style.display = "none"; const sc = document.getElementById("scene"); if (sc) sc.classList.add("show");
  document.body.classList.remove("has3d");
  try { renderer.dispose(); } catch (e) {}
}
function frame(now) {
  if (dead) return;
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!hubVisible) { accT = 0; accF = 0; return; }
  if (!animOn && !glow && aviT <= 0 && !heistOn) { skipN = (skipN + 1) % 6; if (skipN) return; }
  time += dt;
  accT += dt; accF++;
  if (accT >= 1.5) {                                   // ogni 1,5 s: se il telefono fatica, abbassa la qualità
    const fps = accF / accT; accT = 0; accF = 0;
    if (ready) { if (fps < 32) { if (++lowStreak >= 2) degrade(); } else lowStreak = 0; }
  }
  if (animOn) {
    ppMat.opacity = 0.9 + 0.1 * Math.sin(time * 2.2);
    const ph = time % 8; reelMats.forEach((t, i) => { const spinning = ph < 2.2 + i * 0.5; if (spinning) { reelState[i] += dt * (3.2 + i * 0.4); } else { const target = Math.round(reelState[i] * SYM.length) / SYM.length; reelState[i] += (target - reelState[i]) * Math.min(1, dt * 10); } t.offset.y = -reelState[i] / 1; });
    wheel.rotation.y += dt * 1.2; rball.position.set(Math.cos(-time * 3.1) * 0.5, 0.97, Math.sin(-time * 3.1) * 0.5);
    bulbs.forEach((b, i) => { b.scale.setScalar(0.85 + 0.2 * Math.sin(time * 4 + i * 1.3)); });
    const off = stepFlicker(time, [signTopMat, signBotMat]); neonL.intensity = 1.6 * Math.PI * (1 - 0.18 * off);
    mmLights.forEach((m, i) => { m.material.opacity = 0.25 + 0.75 * Math.max(0, Math.sin(time * 5 - i * 0.45)); });
    mmQuad.forEach((m, i) => { m.material.opacity = Math.sin(time * 3 + i * 1.6) > 0 ? 1 : 0.15; });
    lever.rotation.z = (time % 8) < 0.4 ? -0.5 : 0;
  }
  stepGlow(dt);
  if (heistOn) {                                                       // il tasto cambia colore neon, piano (3,2 s per colore)
    const pl = 0.5 + 0.5 * Math.sin(time * 3), ph = (time / 3.2) % NEON_CYC.length, i0 = Math.floor(ph), k = ph - i0, ks = k * k * (3 - 2 * k);
    cycCol.copy(NEON_CYC[i0]).lerp(NEON_CYC[(i0 + 1) % NEON_CYC.length], ks);
    for (const m of [heistCap.material, heistTop.material]) { m.color.copy(cycCol).multiplyScalar(0.55); m.emissive.copy(cycCol); m.emissiveIntensity = 0.85 + 0.35 * pl; }
    heistHalo.material.color.copy(cycCol); heistCap.position.y = 0.175 - 0.01 * pl;
  }
  if (aviT > 0) { aviT -= dt; const k = Math.sin(Math.max(0, 1 - aviT / 0.5) * Math.PI); haloAv.material.opacity = k * 0.9; pp.scale.setScalar(1 + k * 0.1); } else { haloAv.material.opacity = 0; pp.scale.setScalar(1); }
  placeCamera(); renderer.render(scene, camera);
  if (!ready) { ready = true; cv.style.visibility = "visible"; const sc = document.getElementById("scene"); if (sc) sc.classList.remove("show"); document.body.classList.add("has3d"); }
}
(async () => {
  try { await Promise.race([Promise.all([document.fonts.load("100px Bungee"), document.fonts.load("100px Rye"), document.fonts.load("20px Oswald")]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  for (const t of texAll) { const c = t.image; if (t.userData.fn) t.userData.fn(c.getContext("2d"), c.width, c.height); t.needsUpdate = true; }
})();
window.Arcade3D = Object.assign(window.Arcade3D || {}, {
  setQuality(v) { if (v === "auto") { autoQ = true; } else { autoQ = false; qi = Math.max(0, Math.min(2, +v)); } resize(); },
  setAnim(b) { animOn = !!b; },
  setHeist
});
try { if (window.Arcade && window.Arcade.isSandbox && window.Arcade.isSandbox()) setHeist(true); } catch (e) {}
requestAnimationFrame(frame);

