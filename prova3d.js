// Prova 3D della sala: tutti gli oggetti sono costruiti con forme semplici (nessun modello esterno).
import * as THREE from "three";

const $ = (id) => document.getElementById(id);
const hud = $("hud"), toastEl = $("toast");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $("c"), antialias: true, powerPreference: "high-performance" });
} catch (e) { $("err").style.display = "grid"; throw e; }
renderer.setClearColor(0x0d0706);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0d0706, 16, 30);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
const TARGET = new THREE.Vector3(0, 1.7, 0);
const QUAL = [{ n: "alta", pr: 2 }, { n: "media", pr: 1.5 }, { n: "bassa", pr: 1 }];
let qi = 0, animOn = true, yaw = 0, yawTarget = 0;

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
  const t = tex(512, Math.round(512 * h / w), (g, W, H) => {
    g.clearRect(0, 0, W, H); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    let size = H * 0.7; g.font = size + "px " + FONT; while (g.measureText(text).width > W * 0.92 && size > 10) { size -= 4; g.font = size + "px " + FONT; }
    g.shadowColor = glow; g.shadowBlur = 24; g.lineWidth = size * 0.12; g.strokeStyle = glow; g.strokeText(text, W / 2, H / 2 + size * 0.04);
    g.shadowBlur = 8; g.lineWidth = size * 0.06; g.strokeStyle = glow; g.strokeText(text, W / 2, H / 2 + size * 0.04);
    g.shadowBlur = 0; g.fillStyle = core; g.fillText(text, W / 2, H / 2 + size * 0.04);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.position.set(x, y, z); if (rotX) m.rotation.x = rotX; (parent || scene).add(m); return m;
}

// ---------- luci (penombra, cono magenta) ----------
scene.add(new THREE.AmbientLight(0x1a0515, 1.9 * Math.PI));
const spot = new THREE.SpotLight(0xff007f, 24 * Math.PI, 0, Math.PI / 5.5, 0.75, 1.3);
spot.position.set(0, 5.5, 0); spot.target.position.set(0, 0.9, -0.3); scene.add(spot, spot.target);
const spotW = new THREE.SpotLight(0xffe6d0, 12 * Math.PI, 0, Math.PI / 6.5, 0.9, 1.3);
spotW.position.set(0, 5.5, 0.2); spotW.target.position.set(0, 0.9, -0.3); scene.add(spotW, spotW.target);
const neonL = new THREE.PointLight(0xff2e88, 1.6 * Math.PI, 12, 1.4); neonL.position.set(-2.6, 4.4, -3.3); scene.add(neonL);
const neonC = new THREE.PointLight(0x2ad4ff, 1.5 * Math.PI, 12, 1.4); neonC.position.set(2.6, 4.4, -3.3); scene.add(neonC);

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
const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), new THREE.MeshLambertMaterial({ map: floorTex }));
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0); scene.add(floor);

const wallTex = tex(1024, 512, (g, w, h) => {
  for (let i = 0; i < 16; i++) {
    g.fillStyle = `hsl(18,48%,${17 + Math.random() * 6}%)`; g.fillRect(i * 64, 0, 64, h);
    for (let k = 0; k < 10; k++) { g.strokeStyle = "rgba(0,0,0,.08)"; g.beginPath(); g.moveTo(i * 64 + Math.random() * 64, 0); g.lineTo(i * 64 + Math.random() * 64, h); g.stroke(); }
    g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(i * 64, 0, 2, h);
  }
});
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(1.4, 1);
const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.4), wallMat); back.position.set(0, 3.2, -4.6); scene.add(back);
for (const s of [-1, 1]) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.4), wallMat);
  w.rotation.y = -s * Math.PI / 2; w.position.set(s * 4.4, 3.2, 2.4); scene.add(w);
}
// soffitto a cassettoni in legno scuro con cornice LED
const ceilY = 6.4;
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 16), new THREE.MeshLambertMaterial({ color: 0x24140e })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, ceilY, 3.4); scene.add(ceil);
const beam = M(0x4a2a1a);
for (let i = -3; i <= 3; i++) B(0.18, 0.16, 15, beam, i * 1.15, ceilY - 0.08, 3.0);
for (let k = 0; k < 7; k++) B(8.8, 0.16, 0.18, beam, 0, ceilY - 0.08, -4.3 + k * 1.75);
B(14, 1.5, 0.12, 0x1c0e08, 0, 0.75, -4.52); B(14, 0.12, 0.2, WOOD, 0, 1.52, -4.5);
B(8.7, 0.08, 0.08, NEONM(0xff3d8b), 0, 6.22, -4.5);
B(8.7, 0.08, 0.08, NEONM(0xff3d8b), 0, ceilY - 0.12, -4.2);
for (const sx of [-1, 1]) {
  B(0.08, 0.08, 14, NEONM(sx < 0 ? 0x5a7bff : 0x8a5cff), sx * 4.35, 6.22, 2.4);
  B(0.08, 0.08, 10.4, NEONM(sx < 0 ? 0x5a7bff : 0x8a5cff), sx * 4.2, ceilY - 0.12, 1.0);
}
B(8.5, 0.08, 0.08, NEONM(0x8a5cff), 0, ceilY - 0.12, 6.2);

// insegna al neon
const FONT = "Bungee, Impact, 'Arial Black', sans-serif";
const signTex = tex(1024, 400, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  const neon = (txt, y, size, glow, core, edge) => {
    g.font = size + "px " + FONT;
    g.shadowColor = glow; g.shadowBlur = 40; g.lineWidth = 14; g.strokeStyle = glow; g.strokeText(txt, w / 2, y);
    g.shadowBlur = 18; g.lineWidth = 7; g.strokeStyle = edge; g.strokeText(txt, w / 2, y);
    g.shadowBlur = 0; g.fillStyle = core; g.fillText(txt, w / 2, y);
  };
  neon("SDROGO'S", 125, 150, "#ff2e88", "#ffd6ea", "#ff6aa8");
  neon("ARCADE", 285, 135, "#6a5cff", "#e4deff", "#9a8cff");
});
const signBoard = B(5.9, 2.3, 0.12, 0x120707, 0, 4.2, -4.5);
const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false });
const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 2.22), signMat); sign.position.set(0, 4.2, -4.42); scene.add(sign);
B(6.1, 0.08, 0.16, GOLD, 0, 5.4, -4.45); B(6.1, 0.08, 0.16, GOLD, 0, 3.0, -4.45);

// ---------- carte ----------
function cardTex(rank, suit, red) {
  return tex(128, 180, (g, w, h) => {
    g.fillStyle = "#f6f1e4"; g.fillRect(0, 0, w, h); g.strokeStyle = "#0003"; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
    g.fillStyle = red ? "#c8182b" : "#14141a"; g.font = "bold 46px Oswald, sans-serif"; g.textAlign = "left"; g.textBaseline = "top";
    g.fillText(rank, 10, 8); g.font = "44px serif"; g.fillText(suit, 12, 54);
    g.font = "78px serif"; g.textAlign = "center"; g.fillText(suit, w / 2, 86);
  });
}
function card(rank, suit, red, x, y, z, rot, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.48), new THREE.MeshLambertMaterial({ map: cardTex(rank, suit, red) }));
  m.rotation.set(-Math.PI / 2, 0, rot || 0); m.position.set(x, y, z); (parent || scene).add(m); return m;
}
function chips(x, y, z, colors) {
  colors.forEach((c, i) => C(0.1, 0.1, 0.035, M(c), x, y + i * 0.037, z, table, 18));
}

// ---------- tavolo centrale ovale: blackjack (verde, sinistra) e poker (rosso, destra) ----------
const TY = 0.98;
const table = new THREE.Group(); table.position.set(0, 0, -0.3); scene.add(table);
const ell = new THREE.Group(); ell.scale.set(2.3, 1, 1.0); table.add(ell);
C(0.95, 0.95, 0.2, M(WOOD), 0, 0.9, 0, ell, 40);
C(0.88, 0.88, 0.02, M(GOLD), 0, 1.005, 0, ell, 40);
const half = (col, start) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.84, 36, start, Math.PI), new THREE.MeshLambertMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.y = 1.02; ell.add(m); return m; };
const halfBJ = half(0x1f8350, Math.PI / 2), halfPK = half(0xa8202c, -Math.PI / 2);
plate('BLACKJACK', 1.15, 0.22, '#35ff9a', '#d8ffea', -0.7, 1.045, 0.6, table, -Math.PI / 2);
plate('POKER', 0.9, 0.22, '#ff4d6a', '#ffe0e4', 0.7, 1.045, 0.6, table, -Math.PI / 2);
B(0.03, 0.03, 1.66, GOLD, 0, 1.035, 0, table);
C(0.22, 0.3, 0.8, M(0x4a2a19), 0, 0.4, 0, table); C(0.7, 0.7, 0.06, M(0x3a2013), 0, 0.03, 0, table, 28);
const tc = (r, su, rd, x, z, rot) => card(r, su, rd, x, TY + 0.06, z, rot, table);
tc("A", "♥", true, -1.45, -0.15, 0.2); tc("K", "♠", false, -1.15, -0.1, -0.1); tc("9", "♦", true, -1.45, 0.25, 0.05);
[["Q", "♦", 1], ["J", "♣", 0], ["10", "♥", 1], ["A", "♠", 0], ["7", "♦", 1]].forEach((c, i) => tc(c[0], c[1], !!c[2], 0.5 + i * 0.3, -0.1, 0));
chips(-1.6, 1.03, 0.3, [0xc8182b, 0xc8182b, 0x14141a]); chips(1.5, 1.03, 0.3, [0xffd34d, 0xffd34d, 0x25e1d3]);

// ---------- slot machine (angolo in fondo a destra) ----------
const slot = new THREE.Group(); slot.position.set(3.0, 0, -3.3); slot.scale.setScalar(1.1); scene.add(slot);
const steel = MS(0x23262e, 0.85, 0.3), chrome = MS(0xd8dde6, 0.9, 0.18), dark = MS(0x0d0f14, 0.7, 0.4);
B(1.0, 1.9, 0.85, steel, 0, 0.95, 0, slot);
B(1.06, 0.4, 0.9, steel, 0, 2.05, 0, slot);
B(1.1, 0.04, 0.94, chrome, 0, 1.84, 0, slot); B(1.1, 0.04, 0.94, chrome, 0, 2.26, 0, slot);
for (const sx of [-0.51, 0.51]) { B(0.03, 1.9, 0.03, NEONM(0xff2e88), sx, 0.95, 0.43, slot); }
const reelTex = tex(512, 192, (g, w, h) => {
  g.fillStyle = "#0b0b10"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 3; i++) { g.fillStyle = "#f4efe2"; g.fillRect(14 + i * 164, 12, 150, 168); g.fillStyle = "#d11a2d"; g.font = "bold 150px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("7", 89 + i * 164, 100); }
});
const reels = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.3), new THREE.MeshBasicMaterial({ map: reelTex })); reels.position.set(0, 1.45, 0.43); slot.add(reels);
for (const [w, h, x, y] of [[0.88, 0.05, 0, 1.63], [0.88, 0.05, 0, 1.27], [0.05, 0.4, -0.42, 1.45], [0.05, 0.4, 0.42, 1.45]]) B(w, h, 0.05, chrome, x, y, 0.44, slot);
const topTex = tex(256, 64, (g, w, h) => { g.fillStyle = "#12060c"; g.fillRect(0, 0, w, h); g.shadowColor = "#ff2e88"; g.shadowBlur = 14; g.fillStyle = "#ffd6ea"; g.font = "38px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SLOT 777", w / 2, 34); });
const topLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.26), new THREE.MeshBasicMaterial({ map: topTex })); topLabel.position.set(0, 2.05, 0.46); slot.add(topLabel);
B(0.78, 0.18, 0.05, dark, 0, 1.05, 0.43, slot); B(0.6, 0.14, 0.2, dark, 0, 0.42, 0.45, slot);
[[-0.2, 0xffd34d], [0, 0x25e1d3], [0.2, 0xff2e4d]].forEach(([x, c]) => { B(0.08, 0.08, 0.04, NEONM(c), x, 1.05, 0.47, slot); });
const lever = new THREE.Group(); lever.position.set(0.58, 1.0, 0); slot.add(lever);
C(0.025, 0.025, 0.55, chrome, 0, 0.25, 0, lever, 10); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 14), MS(0xff2e4d, 0.6, 0.25)); ball.position.set(0, 0.55, 0); lever.add(ball);
const bulbs = [];
for (const sx of [-0.55, 0.55]) for (let i = 0; i < 6; i++) { const b = B(0.04, 0.04, 0.04, NEONM(0xffd34d), sx, 0.25 + i * 0.3, 0.44, slot); bulbs.push(b); }

// ---------- cassaforte / Mastermind (angolo in fondo a sinistra) ----------
const safe = new THREE.Group(); safe.position.set(-3.05, 0, -3.5); safe.scale.setScalar(1.1); scene.add(safe);
const burn = MS(0x2a2d33, 0.85, 0.3), door = MS(0x3b3f47, 0.85, 0.25);
B(1.15, 1.35, 0.9, burn, 0, 0.675, 0, safe); B(0.98, 1.18, 0.06, door, 0, 0.7, 0.47, safe);
for (const [w, h, x, y] of [[1.04, 0.04, 0, 1.3], [1.04, 0.04, 0, 0.1], [0.04, 1.24, -0.5, 0.7], [0.04, 1.24, 0.5, 0.7]]) B(w, h, 0.05, chrome, x, y, 0.5, safe);
C(0.24, 0.24, 0.05, chrome, 0, 0.85, 0.52, safe, 8).rotation.x = Math.PI / 2;
C(0.17, 0.17, 0.07, dark, 0, 0.85, 0.54, safe, 8).rotation.x = Math.PI / 2;
B(0.04, 0.17, 0.04, NEONM(0xff2e4d), 0, 0.93, 0.58, safe);
B(0.1, 0.34, 0.08, chrome, 0.38, 0.75, 0.53, safe);
for (const y of [0.3, 1.1]) B(0.06, 0.16, 0.08, chrome, -0.52, y, 0.5, safe);
[[-0.2, 0xff2e4d], [0, 0xffd34d], [0.2, 0x25e1d3]].forEach(([x, c]) => { B(0.1, 0.07, 0.04, NEONM(c), x, 0.38, 0.52, safe); });
plate('MASTERMIND', 1.1, 0.2, '#35d0ff', '#e0f8ff', 0, 1.5, 0.46, safe);

// ---------- roulette (a sinistra, a metà sala) ----------
const roul = new THREE.Group(); roul.position.set(-1.5, 0.12, 1.45); roul.scale.setScalar(1.12); scene.add(roul);
C(0.12, 0.2, 0.8, M(0x4a2a19), 0, 0.4, 0, roul); C(0.7, 0.7, 0.12, M(WOOD), 0, 0.86, 0, roul, 32);
C(0.62, 0.62, 0.03, M(0x9a2230), 0, 0.93, 0, roul, 32);
const wheel = new THREE.Group(); wheel.position.set(0, 0.97, 0); roul.add(wheel);
C(0.44, 0.44, 0.07, M(0x15151a), 0, 0.02, 0, wheel, 32); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.025, 8, 36), M(GOLD)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; wheel.add(ring);
C(0.28, 0.28, 0.08, M(0x0d6b3c), 0, 0.045, 0, wheel, 28);
for (let i = 0; i < 8; i++) { const sp = B(0.5, 0.012, 0.02, 0xf4f0e6, 0, 0.09, 0, wheel); sp.rotation.y = i * Math.PI / 8; }
C(0.04, 0.04, 0.1, M(GOLD), 0, 0.1, 0, wheel, 12);
plate("ROULETTE", 0.7, 0.16, "#ffb340", "#fff0d0", 0, 0.86, 0.711, roul);
const rball = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); roul.add(rball);

// ---------- Gratta e Vinci (distributore metallico, contro la parete) ----------
const kiosk = new THREE.Group(); kiosk.position.set(0, 0, -4.1); kiosk.scale.setScalar(1.2); scene.add(kiosk);
const kTex = tex(256, 400, (g, w, h) => {
  g.fillStyle = "#f2c94c"; g.fillRect(0, 0, w, h); g.fillStyle = "#b3121f"; g.font = "46px " + FONT; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("GRATTA", w / 2, 50); g.font = "34px " + FONT; g.fillStyle = "#7a1220"; g.fillText("E VINCI", w / 2, 100);
  g.fillStyle = "#b9bdc6"; g.fillRect(34, 140, w - 68, 90); g.strokeStyle = "#eceff4"; g.lineWidth = 9; g.lineCap = "round";
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(60 + i * 40, 215); g.lineTo(90 + i * 40, 155); g.stroke(); }
  g.fillStyle = "#ffd34d"; g.beginPath(); g.arc(190, 185, 24, 0, 7); g.fill(); g.fillStyle = "#7a1220"; g.font = "bold 30px sans-serif"; g.fillText("7", 190, 187);
  g.fillStyle = "#2a1a10"; g.fillRect(40, 280, w - 80, 24);
});
B(0.9, 1.75, 0.6, steel, 0, 0.875, 0, kiosk);
for (const sx of [-0.45, 0.45]) B(0.05, 1.78, 0.64, chrome, sx, 0.89, 0, kiosk);
B(0.96, 0.05, 0.64, chrome, 0, 1.77, 0, kiosk); B(0.96, 0.04, 0.64, chrome, 0, 0.02, 0, kiosk);
B(0.8, 0.04, 0.04, NEONM(0xffd34d), 0, 1.7, 0.32, kiosk);
const kface = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.22), new THREE.MeshStandardMaterial({ map: kTex, emissiveMap: kTex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0.1 })); kface.position.set(0, 1.1, 0.31); kiosk.add(kface);
[[0xf2d16b, -0.05], [0xff7aa0, 0.05], [0x7ad7ff, 0.13]].forEach(([c, x], i) => { const t = B(0.22, 0.3, 0.015, c, x, 0.5 + i * 0.02, 0.4 + i * 0.03, kiosk); t.rotation.z = (i - 1) * 0.15; });

// ---------- tavolino con l'aeroplano (davanti a sinistra) ----------
const ptab = new THREE.Group(); ptab.position.set(0, 0, -3.7); scene.add(ptab);
const plane = new THREE.Group(); plane.position.set(0, 2.55, 0); plane.scale.setScalar(0.9); ptab.add(plane);
const cableMat = new THREE.MeshBasicMaterial({ color: 0xb9c0cc, transparent: true, opacity: 0.45 });
for (const cx of [-0.32, 0.32]) {
  const A = new THREE.Vector3(cx, ceilY - 0.1, 0), Bp = new THREE.Vector3(cx * 0.55, 2.78, 0);
  const len = A.distanceTo(Bp), cab = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, len, 5), cableMat);
  cab.position.copy(A).add(Bp).multiplyScalar(0.5); cab.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bp.clone().sub(A).normalize()); ptab.add(cab);
}
plate("AVIATOR", 0.95, 0.2, "#ff6a3d", "#fff0e0", -1.1, 2.55, 0.1, ptab);
const red = M(0xff2e4d), cream = M(0xffe9b0);
const fus = C(0.09, 0.09, 0.9, red, 0, 0, 0, plane, 16); fus.rotation.z = Math.PI / 2;
const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 16), red); nose.rotation.z = -Math.PI / 2; nose.position.x = 0.55; plane.add(nose);
B(0.3, 0.025, 1.1, cream, 0.05, 0, 0, plane); B(0.16, 0.02, 0.38, cream, -0.42, 0.03, 0, plane); B(0.12, 0.22, 0.02, red, -0.43, 0.13, 0, plane);
const prop = B(0.015, 0.34, 0.03, 0xc9ced6, 0.66, 0, 0, plane);
C(0.012, 0.012, 0.35, M(0x9aa0a8), 0, -0.2, 0, plane, 8);

// ---------- tavolino con il quaderno Wordle (davanti a destra) ----------
const wtab = new THREE.Group(); wtab.position.set(1.55, 0.12, 1.45); wtab.scale.setScalar(1.15); scene.add(wtab);
C(0.1, 0.16, 0.75, M(0x4a2a19), 0, 0.375, 0, wtab); B(1.0, 0.07, 0.8, WOOD, 0, 0.78, 0, wtab);
const nbTex = tex(300, 400, (g, w, h) => {
  g.fillStyle = "#efe6cf"; g.fillRect(0, 0, w, h); g.fillStyle = "#b3121f"; g.font = "bold 34px Oswald, sans-serif"; g.textAlign = "center"; g.fillText("WORDLE", w / 2, 44);
  const cols = ["#2f9e5b", "#c9a23a", "#8a8f90", "#2f9e5b", "#8a8f90", "#2f9e5b", "#c9a23a", "#8a8f90", "#2f9e5b", "#2f9e5b", "#2f9e5b", "#2f9e5b"];
  cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(22 + (i % 4) * 66, 70 + Math.floor(i / 4) * 66, 58, 58); });
  g.strokeStyle = "#8a8f90"; g.lineWidth = 3; for (let c = 0; c < 4; c++) g.strokeRect(22 + c * 66, 268, 58, 58);
});
const nb = new THREE.Group(); nb.position.set(0, 0.84, 0); nb.rotation.y = 0.35; wtab.add(nb);
B(0.5, 0.05, 0.66, 0x24407a, 0, 0, 0, nb); const nbp = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.62), new THREE.MeshLambertMaterial({ map: nbTex })); nbp.rotation.x = -Math.PI / 2; nbp.position.y = 0.03; nb.add(nbp);
plate('WORDLE', 0.8, 0.14, '#6dff8a', '#e8ffe8', 0, 0.78, 0.405, wtab);
const pencil = C(0.012, 0.012, 0.5, M(0xffd34d), 0.38, 0.04, 0.1, wtab, 6); pencil.rotation.set(0, 0.8, Math.PI / 2);

// ---------- zone toccabili (invisibili) ----------
const hits = [];
function hit(game, label, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  m.position.set(x, y, z); m.userData.game = game; m.userData.label = label; scene.add(m); hits.push(m);
}
hit("blackjack", "Blackjack", 2.1, 0.5, 1.8, -1.1, 1.05, -0.3);
hit("poker", "Poker", 2.1, 0.5, 1.8, 1.1, 1.05, -0.3);
hit("slot", "Slot 777", 1.3, 2.8, 1.1, 3.0, 1.3, -3.3);
hit("mastermind", "Mastermind", 1.3, 1.9, 1.0, -3.05, 0.95, -3.5);
hit("roulette", "Roulette", 1.5, 0.6, 1.5, -1.5, 0.95, 1.45);
hit("scratch", "Gratta e Vinci", 1.2, 2.1, 0.8, 0, 1.05, -4.1);
hit("aviator", "Aviator", 1.6, 0.8, 1.2, 0, 2.55, -3.7);
hit("wordle", "Wordle", 1.3, 0.5, 1.1, 1.55, 0.95, 1.45);
const TARGETS = { blackjack: halfBJ, poker: halfPK, slot, mastermind: safe, roulette: roul, scratch: kiosk, aviator: ptab, wordle: wtab };
let glow = null;
function endGlow() { if (!glow) return; glow.list.forEach((e) => { e.o.material = e.orig; e.mat.dispose(); }); glow = null; }
function highlight(game) {
  endGlow(); const root = TARGETS[game]; if (!root) return; const list = [];
  root.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive && !o.userData.game) {
      const mat = o.material.clone(); list.push({ o, orig: o.material, mat, base: o.material.emissiveIntensity, baseCol: o.material.emissive.clone() }); o.material = mat;
    }
  });
  glow = { list, t: 0 };
}
function stepGlow(dt) {
  if (!glow) return; glow.t += dt; const k = Math.sin(Math.min(1, glow.t / 0.8) * Math.PI);
  glow.list.forEach((e) => { e.mat.emissive.copy(e.baseCol).lerp(new THREE.Color(0xff4fa8), k); e.mat.emissiveIntensity = e.base + k * 0.55; });
  if (glow.t > 0.8) endGlow();
}

// ---------- camera ----------
const CAM = { dist: 7.2, height: 3.9 };
const WANT_W = 6.4;
function fitCamera() {
  const w = innerWidth, h = innerHeight, asp = w / h;
  const vf = 2 * Math.atan((WANT_W / 2 / CAM.dist) / asp) * 180 / Math.PI;
  camera.fov = Math.max(40, Math.min(75, vf)); camera.aspect = asp; camera.updateProjectionMatrix();
}
function placeCamera() {
  const a = yaw, dx = Math.sin(a) * CAM.dist * 0.5;
  camera.position.set(TARGET.x + dx, CAM.height, TARGET.z + CAM.dist);
  camera.lookAt(TARGET);
}
function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUAL[qi].pr));
  renderer.setSize(innerWidth, innerHeight, false); fitCamera();
}
addEventListener("resize", resize); resize();

// ---------- interazione: tocco sugli oggetti, trascinamento per girare un po' ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
const cv = $("c");
cv.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, yaw: yawTarget, moved: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", (e) => {
  if (!down) return; const dx = e.clientX - down.x;
  if (Math.abs(dx) > 8) down.moved = true;
  if (down.moved) yawTarget = Math.max(-0.35, Math.min(0.35, down.yaw + dx / innerWidth * 1.2));
});
cv.addEventListener("pointerup", (e) => {
  const d = down; down = null; if (!d || d.moved) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(hits, false)[0];
  if (h) { toast("Si aprirebbe: " + h.object.userData.label); highlight(h.object.userData.game); }
});
let toastT; function toast(t) { toastEl.textContent = t; toastEl.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.style.opacity = 0), 1400); }

// ---------- pulsanti ----------
$("bQ").onclick = () => { qi = (qi + 1) % QUAL.length; $("bQ").textContent = "Qualità: " + QUAL[qi].n; resize(); };
$("bA").onclick = () => { animOn = !animOn; $("bA").textContent = "Animazioni: " + (animOn ? "sì" : "no"); };
let bench = null;
$("bT").onclick = () => { bench = { t0: performance.now(), frames: [], res: null }; $("bT").textContent = "…"; };

// ---------- ciclo di disegno ----------
let last = performance.now(), frames = 0, acc = 0, fps = 0, minFps = 999, winStart = last, time = 0;
const v3 = new THREE.Vector3();
let gpu = "";
try { const gl = renderer.getContext(), ext = gl.getExtension("WEBGL_debug_renderer_info"); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ""; } catch (e) {}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
  frames++; acc += dt;
  if (acc >= 0.5) { fps = frames / acc; frames = 0; acc = 0; if (now - winStart > 2000) minFps = Math.min(minFps, fps); }
  if (bench) { bench.frames.push(1 / Math.max(dt, 0.001)); if (now - bench.t0 > 10000) { const a = bench.frames; bench.res = { avg: a.reduce((x, y) => x + y, 0) / a.length, min: Math.min(...a.slice(5)) }; $("bT").textContent = "Test 10 s"; lastBench = bench.res; bench = null; } }
  yaw += (yawTarget - yaw) * Math.min(1, dt * 6);
  if (animOn) {
    plane.rotation.y = -0.5 + Math.sin(time * 0.6) * 0.12; plane.position.y = 2.55 + Math.sin(time * 1.6) * 0.02; prop.rotation.x += dt * 30;
    wheel.rotation.y += dt * 1.2; rball.position.set(Math.cos(-time * 3.1) * 0.38, 1.06, Math.sin(-time * 3.1) * 0.38);
    bulbs.forEach((b, i) => { b.material.color.setHex(((Math.floor(time * 4) + i) % 3) ? 0x6a5410 : 0xffd34d); });
    const fl = Math.sin(time * 37) * Math.sin(time * 5.3) > 0.93 ? 0.45 : 1; signMat.opacity = 0.9 * fl + 0.1; neonL.intensity = 1.6 * Math.PI * (0.65 + 0.35 * fl);
    lever.rotation.z = Math.max(0, Math.sin(time * 0.9)) > 0.97 ? 0.5 : 0;
  }
  stepGlow(dt);
  placeCamera(); renderer.render(scene, camera);
  if (Math.floor(now / 500) !== Math.floor((now - dt * 1000) / 500)) {
    const i = renderer.info.render;
    hud.innerHTML = `<b>${fps.toFixed(0)} fps</b> (minimo ${minFps === 999 ? "–" : minFps.toFixed(0)}) · ${i.calls} oggetti · ${(i.triangles / 1000).toFixed(1)}k triangoli · qualità ${QUAL[qi].n}` +
      (lastBench ? `<br>Test 10 s: <b>media ${lastBench.avg.toFixed(0)} fps</b>, minimo ${lastBench.min.toFixed(0)}` : "") +
      `<br><span style="opacity:.7">${gpu ? gpu.slice(0, 48) : "scheda grafica n/d"}</span>`;
  }
}
let lastBench = null;
(async () => {
  try { await Promise.race([Promise.all([document.fonts.load("100px Bungee"), document.fonts.load("100px Rye"), document.fonts.load("20px Oswald")]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  for (const t of texAll) { const c = t.image; if (t.userData.fn) t.userData.fn(c.getContext("2d"), c.width, c.height); t.needsUpdate = true; }
})();
requestAnimationFrame(frame);
