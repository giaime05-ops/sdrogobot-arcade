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
const TARGET = new THREE.Vector3(0, 1.4, -0.5);
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
function tex(w, h, fn) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const WOOD = 0x6b4128, GOLD = 0xe8c36a;

// ---------- luci ----------
scene.add(new THREE.HemisphereLight(0xffd9b0, 0x3a2013, 0.75*Math.PI));
const spot = new THREE.SpotLight(0xffe2b0, 1.5, 0, 0.6, 0.75, 0);
spot.intensity*=Math.PI;
spot.position.set(0, 7.5, 1.2); spot.target.position.set(0, 1, 0.4); scene.add(spot, spot.target);
const neonL = new THREE.PointLight(0xff3d8b, 1.1*Math.PI, 11, 1.2); neonL.position.set(0, 4.3, -3.2); scene.add(neonL);

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
B(14, 1.5, 0.12, 0x1c0e08, 0, 0.75, -4.52); B(14, 0.12, 0.2, WOOD, 0, 1.52, -4.5);
const ledA = B(8.8, 0.07, 0.07, new THREE.MeshBasicMaterial({ color: 0xff3d8b }), 0, 6.2, -4.5);
for (const s of [-1, 1]) {
  const l = B(0.07, 0.07, 14, new THREE.MeshBasicMaterial({ color: 0x7a5cff }), s * 4.35, 6.2, 2.4);
}

// insegna al neon
const signTex = tex(1024, 400, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "190px Rye, Georgia, serif"; g.shadowColor = "#ff3d8b"; g.shadowBlur = 36;
  g.fillStyle = "rgba(255,61,139,.35)"; g.strokeStyle = "#ff8dbb"; g.lineWidth = 6;
  g.fillText("SDROGO'S", w / 2, 130); g.strokeText("SDROGO'S", w / 2, 130);
  g.font = "120px Rye, Georgia, serif"; g.shadowColor = "#8f7bff"; g.fillStyle = "rgba(143,123,255,.35)"; g.strokeStyle = "#b8abff";
  g.fillText("ARCADE", w / 2, 300); g.strokeText("ARCADE", w / 2, 300);
});
const signBoard = B(5.0, 1.95, 0.12, 0x120707, 0, 4.55, -4.5);
const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false });
const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.87), signMat); sign.position.set(0, 4.55, -4.42); scene.add(sign);
B(5.2, 0.08, 0.16, GOLD, 0, 5.56, -4.45); B(5.2, 0.08, 0.16, GOLD, 0, 3.54, -4.45);

// cono di luce
const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 3.2, 7, 28, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
cone.position.set(0, 3.9, 0.6); scene.add(cone);

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
  colors.forEach((c, i) => C(0.1, 0.1, 0.035, M(c), x, y + i * 0.037, z, null, 18));
}

// ---------- tavolo lungo: blackjack (sinistra) e poker (destra) ----------
const TY = 0.98;
B(4.2, 0.2, 1.8, WOOD, 0, 0.9, 0.4);
B(3.9, 0.04, 1.5, new THREE.MeshLambertMaterial({ color: 0x1f8350 }), 0, 1.01, 0.4);
B(0.03, 0.05, 1.5, GOLD, 0, 1.03, 0.4);
for (const sx of [-1.6, 1.6]) { C(0.2, 0.28, 0.82, M(0x4a2a19), sx, 0.41, 0.4); C(0.38, 0.38, 0.06, M(0x3a2013), sx, 0.03, 0.4); }
card("A", "♥", true, -1.35, TY + 0.06, 0.25, 0.15); card("K", "♠", false, -1.05, TY + 0.065, 0.28, -0.1);
card("9", "♦", true, -1.15, TY + 0.06, 0.78, 0.05); card("Q", "♣", false, -0.85, TY + 0.065, 0.8, 0.2);
chips(-1.6, 1.03, 0.75, [0xc8182b, 0xc8182b, 0x14141a]); chips(-1.5, 1.03, 0.9, [0x14141a, 0xc8182b]);
[["Q", "♦", 1], ["J", "♣", 0], ["10", "♥", 1], ["A", "♠", 0], ["7", "♦", 1]].forEach((c, i) => card(c[0], c[1], !!c[2], 0.35 + i * 0.4, TY + 0.06, 0.28, 0));
card("K", "♥", true, 0.95, TY + 0.06, 0.82, 0.1); card("K", "♦", true, 1.25, TY + 0.065, 0.84, -0.12);
chips(1.7, 1.03, 0.8, [0xffd34d, 0xffd34d, 0x25e1d3]); chips(1.8, 1.03, 0.65, [0x25e1d3]);

// ---------- slot machine (fondo a destra) ----------
const slot = new THREE.Group(); slot.position.set(3.0, 0, -3.2); scene.add(slot);
B(1.0, 1.9, 0.85, 0x7a1220, 0, 0.95, 0, slot); B(0.9, 0.34, 0.8, 0xa31a2c, 0, 2.05, 0, slot);
const reelTex = tex(512, 192, (g, w, h) => {
  g.fillStyle = "#0b0b10"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 3; i++) { g.fillStyle = "#f4efe2"; g.fillRect(14 + i * 164, 12, 150, 168); g.fillStyle = "#d11a2d"; g.font = "bold 150px Rye, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("7", 89 + i * 164, 100); }
});
const reels = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.3), new THREE.MeshBasicMaterial({ map: reelTex })); reels.position.set(0, 1.45, 0.43); slot.add(reels);
const topTex = tex(256, 64, (g, w, h) => { g.fillStyle = "#a31a2c"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffe08a"; g.font = "52px Rye, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("777", w / 2, 34); });
const topLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.22), new THREE.MeshBasicMaterial({ map: topTex })); topLabel.position.set(0, 2.05, 0.41); slot.add(topLabel);
B(0.78, 0.18, 0.05, 0x2a0a10, 0, 1.05, 0.43, slot); B(0.6, 0.14, 0.2, 0x1b060a, 0, 0.42, 0.45, slot);
[[-0.2, 0xffd34d], [0, 0x25e1d3], [0.2, 0xff2e4d]].forEach(([x, c]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshBasicMaterial({ color: c })); s.position.set(x, 1.05, 0.47); slot.add(s); });
const lever = new THREE.Group(); lever.position.set(0.56, 1.0, 0); slot.add(lever);
C(0.025, 0.025, 0.55, M(0x9aa0a8), 0, 0.25, 0, lever, 10); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 14), M(0xff2e4d)); ball.position.set(0, 0.55, 0); lever.add(ball);
const bulbs = [];
for (const sx of [-0.52, 0.52]) for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd34d })); b.position.set(sx, 0.25 + i * 0.3, 0.38); slot.add(b); bulbs.push(b); }

// ---------- cassaforte / Mastermind (fondo a sinistra) ----------
const safe = new THREE.Group(); safe.position.set(-3.0, 0, -3.3); scene.add(safe);
const metal = new THREE.MeshLambertMaterial({ color: 0x70767e });
B(1.15, 1.35, 0.9, metal, 0, 0.675, 0, safe); B(0.95, 1.15, 0.06, 0x4b5058, 0, 0.7, 0.47, safe);
const dial = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 10, 28), M(0xb6bcc5)); dial.position.set(0, 0.85, 0.52); safe.add(dial);
C(0.19, 0.19, 0.04, M(0x2a2d33), 0, 0.85, 0.5, safe, 24).rotation.x = Math.PI / 2;
B(0.04, 0.2, 0.04, 0xff2e4d, 0, 0.94, 0.55, safe);
B(0.1, 0.3, 0.07, 0x8a9099, 0.38, 0.75, 0.52, safe);
[[-0.2, 0xff2e4d], [0, 0xffd34d], [0.2, 0x25e1d3]].forEach(([x, c]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: c })); s.position.set(x, 0.38, 0.52); safe.add(s); });

// ---------- roulette (a sinistra, a metà sala) ----------
const roul = new THREE.Group(); roul.position.set(-3.0, 0, -1.3); scene.add(roul);
C(0.12, 0.2, 0.8, M(0x4a2a19), 0, 0.4, 0, roul); C(0.7, 0.7, 0.12, M(WOOD), 0, 0.86, 0, roul, 32);
C(0.62, 0.62, 0.03, M(0x9a2230), 0, 0.93, 0, roul, 32);
const wheel = new THREE.Group(); wheel.position.set(0, 0.97, 0); roul.add(wheel);
C(0.44, 0.44, 0.07, M(0x15151a), 0, 0.02, 0, wheel, 32); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.025, 8, 36), M(GOLD)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; wheel.add(ring);
C(0.28, 0.28, 0.08, M(0x0d6b3c), 0, 0.045, 0, wheel, 28);
for (let i = 0; i < 8; i++) { const sp = B(0.5, 0.012, 0.02, 0xf4f0e6, 0, 0.09, 0, wheel); sp.rotation.y = i * Math.PI / 8; }
C(0.04, 0.04, 0.1, M(GOLD), 0, 0.1, 0, wheel, 12);
const rball = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); roul.add(rball);

// ---------- Gratta e Vinci (a destra, a metà sala) ----------
const kiosk = new THREE.Group(); kiosk.position.set(3.0, 0, -1.3); scene.add(kiosk);
const kTex = tex(256, 400, (g, w, h) => {
  g.fillStyle = "#f2c94c"; g.fillRect(0, 0, w, h); g.fillStyle = "#b3121f"; g.font = "54px Rye, serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("GRATTA", w / 2, 50); g.font = "34px Rye, serif"; g.fillStyle = "#7a1220"; g.fillText("E VINCI", w / 2, 100);
  g.fillStyle = "#b9bdc6"; g.fillRect(34, 140, w - 68, 90); g.strokeStyle = "#eceff4"; g.lineWidth = 9; g.lineCap = "round";
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(60 + i * 40, 215); g.lineTo(90 + i * 40, 155); g.stroke(); }
  g.fillStyle = "#ffd34d"; g.beginPath(); g.arc(190, 185, 24, 0, 7); g.fill(); g.fillStyle = "#7a1220"; g.font = "bold 30px sans-serif"; g.fillText("7", 190, 187);
  g.fillStyle = "#2a1a10"; g.fillRect(40, 280, w - 80, 24);
});
B(0.9, 1.75, 0.6, WOOD, 0, 0.875, 0, kiosk);
const kface = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.22), new THREE.MeshLambertMaterial({ map: kTex })); kface.position.set(0, 1.12, 0.31); kiosk.add(kface);
[[0xf2d16b, -0.05], [0xff7aa0, 0.05], [0x7ad7ff, 0.13]].forEach(([c, x], i) => { const t = B(0.22, 0.3, 0.015, c, x, 0.62 + i * 0.02, 0.45 + i * 0.03, kiosk); t.rotation.z = (i - 1) * 0.15; });

// ---------- tavolino con l'aeroplano (davanti a sinistra) ----------
const ptab = new THREE.Group(); ptab.position.set(-2.5, 0, 2.9); scene.add(ptab);
C(0.1, 0.16, 0.75, M(0x4a2a19), 0, 0.375, 0, ptab); C(0.55, 0.55, 0.08, M(WOOD), 0, 0.78, 0, ptab, 32);
const plane = new THREE.Group(); plane.position.set(0, 1.2, 0); ptab.add(plane);
const red = M(0xff2e4d), cream = M(0xffe9b0);
const fus = C(0.09, 0.09, 0.9, red, 0, 0, 0, plane, 16); fus.rotation.z = Math.PI / 2;
const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 16), red); nose.rotation.z = -Math.PI / 2; nose.position.x = 0.55; plane.add(nose);
B(0.3, 0.025, 1.1, cream, 0.05, 0, 0, plane); B(0.16, 0.02, 0.38, cream, -0.42, 0.03, 0, plane); B(0.12, 0.22, 0.02, red, -0.43, 0.13, 0, plane);
const prop = B(0.015, 0.34, 0.03, 0xc9ced6, 0.66, 0, 0, plane);
C(0.012, 0.012, 0.35, M(0x9aa0a8), 0, -0.2, 0, plane, 8);

// ---------- tavolino con il quaderno Wordle (davanti a destra) ----------
const wtab = new THREE.Group(); wtab.position.set(2.5, 0, 2.9); scene.add(wtab);
C(0.1, 0.16, 0.75, M(0x4a2a19), 0, 0.375, 0, wtab); B(1.0, 0.07, 0.8, WOOD, 0, 0.78, 0, wtab);
const nbTex = tex(300, 400, (g, w, h) => {
  g.fillStyle = "#efe6cf"; g.fillRect(0, 0, w, h); g.fillStyle = "#b3121f"; g.font = "bold 34px Oswald, sans-serif"; g.textAlign = "center"; g.fillText("WORDLE", w / 2, 44);
  const cols = ["#2f9e5b", "#c9a23a", "#8a8f90", "#2f9e5b", "#8a8f90", "#2f9e5b", "#c9a23a", "#8a8f90", "#2f9e5b", "#2f9e5b", "#2f9e5b", "#2f9e5b"];
  cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(22 + (i % 4) * 66, 70 + Math.floor(i / 4) * 66, 58, 58); });
  g.strokeStyle = "#8a8f90"; g.lineWidth = 3; for (let c = 0; c < 4; c++) g.strokeRect(22 + c * 66, 268, 58, 58);
});
const nb = new THREE.Group(); nb.position.set(0, 0.84, 0); nb.rotation.y = 0.35; wtab.add(nb);
B(0.5, 0.05, 0.66, 0x24407a, 0, 0, 0, nb); const nbp = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.62), new THREE.MeshLambertMaterial({ map: nbTex })); nbp.rotation.x = -Math.PI / 2; nbp.position.y = 0.03; nb.add(nbp);
const pencil = C(0.012, 0.012, 0.5, M(0xffd34d), 0.38, 0.04, 0.1, wtab, 6); pencil.rotation.set(0, 0.8, Math.PI / 2);

// ---------- zone toccabili (invisibili, un po' più grandi) + etichette ----------
const hits = [];
const labelsEl = $("labs");
const LABELS = [];
function hit(game, label, w, h, d, x, y, z, ly) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  m.position.set(x, y, z); m.userData.game = game; m.userData.label = label; scene.add(m); hits.push(m);
  const el = document.createElement("div"); el.className = "lab"; el.textContent = label; labelsEl.appendChild(el);
  LABELS.push({ el, pos: new THREE.Vector3(x, ly, z + (ly < 0.5 ? 0.9 : 0)) });
}
hit("blackjack", "Blackjack", 1.95, 0.7, 1.7, -1.0, 1.15, 0.4, 0.3);
hit("poker", "Poker", 1.95, 0.7, 1.7, 1.0, 1.15, 0.4, 0.3);
hit("slot", "Slot 777", 1.1, 2.4, 0.95, 3.0, 1.2, -3.2, 2.55);
hit("mastermind", "Mastermind", 1.2, 1.5, 1.0, -3.0, 0.75, -3.3, 1.65);
hit("roulette", "Roulette", 1.5, 0.9, 1.5, -3.0, 0.7, -1.3, 0.3);
hit("scratch", "Gratta e Vinci", 1.0, 1.9, 0.7, 3.0, 0.95, -1.3, 0.3);
hit("aviator", "Aviator", 1.2, 1.2, 1.2, -2.5, 0.9, 2.9, 0.3);
hit("wordle", "Wordle", 1.2, 0.6, 1.0, 2.5, 0.95, 2.9, 0.3);

// ---------- camera ----------
const CAM = { dist: 12.5, height: 5.6 };
const WANT_W = 9.6;
function fitCamera() {
  const w = innerWidth, h = innerHeight, asp = w / h;
  const vf = 2 * Math.atan((WANT_W / 2 / CAM.dist) / asp) * 180 / Math.PI;
  camera.fov = Math.max(34, Math.min(70, vf)); camera.aspect = asp; camera.updateProjectionMatrix();
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
  if (h) { toast("Si aprirebbe: " + h.object.userData.label); bounce = { obj: h.object, t: 0 }; }
});
let toastT; function toast(t) { toastEl.textContent = t; toastEl.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.style.opacity = 0), 1400); }
let bounce = null;

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
    plane.rotation.y += dt * 0.7; plane.position.y = 1.2 + Math.sin(time * 1.6) * 0.04; plane.rotation.z = Math.sin(time * 1.1) * 0.08; prop.rotation.x += dt * 30;
    wheel.rotation.y += dt * 1.2; rball.position.set(Math.cos(-time * 3.1) * 0.38, 1.06, Math.sin(-time * 3.1) * 0.38);
    bulbs.forEach((b, i) => { b.material.color.setHex(((Math.floor(time * 4) + i) % 3) ? 0x6a5410 : 0xffd34d); });
    const fl = Math.sin(time * 37) * Math.sin(time * 5.3) > 0.93 ? 0.45 : 1; signMat.opacity = 0.9 * fl + 0.1; neonL.intensity = 1.1 * Math.PI * (0.6 + 0.4 * fl);
    lever.rotation.z = Math.max(0, Math.sin(time * 0.9)) > 0.97 ? 0.5 : 0;
  }
  if (bounce) { bounce.t += dt; const s = 1 + Math.sin(Math.min(1, bounce.t / 0.35) * Math.PI) * 0.06; bounce.obj.scale.set(s, s, s); if (bounce.t > 0.35) { bounce.obj.scale.set(1, 1, 1); bounce = null; } }
  placeCamera(); renderer.render(scene, camera);
  LABELS.forEach((l) => {
    v3.copy(l.pos).project(camera);
    l.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px,${(-v3.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%)`;
  });
  if (Math.floor(now / 500) !== Math.floor((now - dt * 1000) / 500)) {
    const i = renderer.info.render;
    hud.innerHTML = `<b>${fps.toFixed(0)} fps</b> (minimo ${minFps === 999 ? "–" : minFps.toFixed(0)}) · ${i.calls} oggetti · ${(i.triangles / 1000).toFixed(1)}k triangoli · qualità ${QUAL[qi].n}` +
      (lastBench ? `<br>Test 10 s: <b>media ${lastBench.avg.toFixed(0)} fps</b>, minimo ${lastBench.min.toFixed(0)}` : "") +
      `<br><span style="opacity:.7">${gpu ? gpu.slice(0, 48) : "scheda grafica n/d"}</span>`;
  }
}
let lastBench = null;
(async () => { try { await Promise.race([document.fonts.load("100px Rye"), new Promise((r) => setTimeout(r, 1500))]); } catch (e) {} 
  // ridisegna le insegne con i font caricati
  for (const t of [signTex, reelTex, topTex, kTex, nbTex]) t.needsUpdate = true;
})();
requestAnimationFrame(frame);
