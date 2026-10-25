/* Sdrogo Arcade – CORSA ARCADE (prototipo, solo account di prova): vista dall'alto fissa (stile "Pocket Racing"), gara a 4 con bot, 3 giri,
   olio da evitare, boost da prendere, erba che rallenta, muri, frenata necessaria. Si gioca in orizzontale (se il telefono è in verticale la scena si ruota da sola). */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var TRACKS = [
    { id: "neon", name: "Neon Circuit", hw: 84, laps: 3, k: 1.6, pts: [[0, 0], [500, -40], [900, -10], [1150, 160], [1060, 400], [780, 470], [560, 380], [380, 520], [430, 760], [200, 880], [-120, 820], [-320, 600], [-330, 280], [-190, 60]] },
    { id: "serp", name: "Serpentina", hw: 82, laps: 3, k: 1.55, pts: [[0, 0], [420, -100], [800, -60], [1000, 140], [820, 320], [520, 260], [330, 400], [470, 620], [820, 680], [1060, 860], [880, 1060], [480, 990], [160, 1090], [-220, 940], [-300, 600], [-90, 420], [-260, 200], [-200, 40]] },
    { id: "tornanti", name: "Tornanti", hw: 80, laps: 3, k: 1.5, pts: [[0, 0], [550, 0], [1100, 0], [1380, 130], [1330, 340], [1050, 420], [760, 330], [540, 430], [600, 650], [900, 770], [1120, 980], [870, 1160], [450, 1080], [220, 860], [-120, 760], [-340, 520], [-300, 200]] }
  ];
  var VMAX = 520, VOFF = 150, DT = 1 / 60, AG = 230, WALL = 38, KERB = 14;
  var COLS = ["#ff2fa8", "#35e6ff", "#ffd23b", "#a855f7"], NAMES = ["Tu", "Turbo", "Zap", "Rex"];

  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function build(tr) {                      // spline chiusa (Catmull-Rom) + tangenti, normali, curvatura, oggetti, alberi
    if (tr.P) return tr;
    var c = tr.pts.map(function (p) { return [p[0] * tr.k, p[1] * tr.k]; }), n = c.length, P = [];
    for (var i = 0; i < n; i++) {
      var p0 = c[(i + n - 1) % n], p1 = c[i], p2 = c[(i + 1) % n], p3 = c[(i + 2) % n];
      for (var s = 0; s < 14; s++) {
        var t = s / 14, t2 = t * t, t3 = t2 * t;
        P.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    var N = P.length, ta = [], nx = [], ny = [], kap = [], sp = 0, k;
    for (k = 0; k < N; k++) { var a = P[(k + 1) % N], b2 = P[(k + N - 1) % N]; ta.push(Math.atan2(a[1] - b2[1], a[0] - b2[0])); nx.push(-Math.sin(ta[k])); ny.push(Math.cos(ta[k])); sp += Math.hypot(a[0] - P[k][0], a[1] - P[k][1]); }
    sp /= N;
    for (k = 0; k < N; k++) { var d = ta[(k + 3) % N] - ta[(k + N - 3) % N]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; kap.push(Math.abs(d) / (6 * sp)); }
    tr.P = P; tr.N = N; tr.ta = ta; tr.nx = nx; tr.ny = ny; tr.kap = kap; tr.sp = sp;
    var R = rng(tr.id.length * 977 + N), items = [], trees = [];                // olio e boost (sempre uguali per pista)
    for (k = 26; k < N - 10; k += 17) {
      var r = R(), off = (R() - 0.5) * tr.hw * 1.3;
      if (r < 0.42) items.push({ t: "oil", idx: k, x: P[k][0] + nx[k] * off, y: P[k][1] + ny[k] * off });
      else if (r < 0.75) items.push({ t: "boost", idx: k, x: P[k][0] + nx[k] * off, y: P[k][1] + ny[k] * off });
    }
    for (k = 0; k < N; k += 2) [1, -1].forEach(function (sg) {
      if (R() < 0.55) { var o = (tr.hw + WALL + 46 + R() * 190) * sg; trees.push({ x: P[k][0] + nx[k] * o, y: P[k][1] + ny[k] * o, h: 18 + R() * 26, s: 22 + R() * 12, sand: R() < 0.16 }); }
    });
    tr.items = items; tr.trees = trees;
    return tr;
  }
  function newCar(tr, slot) {
    var a = tr.ta[0], sx = -Math.sin(a), sy = Math.cos(a), row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1;      // griglia 2x2
    var x = tr.P[0][0] - Math.cos(a) * (40 + row * 44) + sx * side * 28, y = tr.P[0][1] - Math.sin(a) * (40 + row * 44) + sy * side * 28;
    return { x: x, y: y, a: a, vx: 0, vy: 0, idx: 0, prog: 0, off: false, hit: 0, slip: 0, spin: 0, boostT: 0, meter: 0, stall: 0, fin: false, finT: 0, slot: slot, col: COLS[slot], name: NAMES[slot], lap: 1 };
  }
  function nearest(tr, car) {
    var N = tr.N, best = 1e12, bi = car.idx;
    for (var d = -16; d <= 16; d++) {
      var i = (car.idx + d + N) % N, dx = car.x - tr.P[i][0], dy = car.y - tr.P[i][1], q = dx * dx + dy * dy;
      if (q < best) { best = q; bi = i; }
    }
    var dl = bi - car.idx; if (dl > N / 2) dl -= N; if (dl < -N / 2) dl += N;
    car.prog += dl; car.idx = bi; return Math.sqrt(best);
  }
  function step(tr, car, inp) {             // un passo di fisica (60 Hz, deterministico)
    var fx = Math.cos(car.a), fy = Math.sin(car.a), sx = -fy, sy = fx;
    var vf = car.vx * fx + car.vy * fy, vl = car.vx * sx + car.vy * sy;
    var d = nearest(tr, car), off = d > tr.hw + KERB; car.off = off;
    if (car.stall > 0) { car.stall -= DT; vf *= 0.9; inp = { l: false, r: false, brake: false, boost: false }; }
    if (inp.boost && car.meter > 0 && car.spin <= 0) { car.boostT = Math.max(car.boostT, 0.12); car.meter = Math.max(0, car.meter - 0.4 * DT); }
    var vmax = off ? VOFF : (car.boostT > 0 ? 680 : VMAX);
    if (inp.brake) vf -= 640 * DT; else vf += 430 * Math.max(-0.8, 1 - vf / vmax) * DT;
    if (car.boostT > 0) { vf += 520 * DT; car.boostT -= DT; }
    vf -= vf * (off ? 2.4 : 0.25) * DT; if (vf < 0) vf = 0;
    var turn = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), om = turn * 2.5 * (1 - 0.55 * Math.min(1, vf / VMAX)) * Math.min(1, vf / 60);
    if (car.spin > 0) { car.spin -= DT; om = 7; vf *= Math.exp(-1.4 * DT); }
    var dem = vf * Math.abs(om), sl = car.spin > 0 ? 0 : Math.max(0, Math.min(1.2, (dem - AG) / (AG * 0.5)));
    car.slip = sl; if (sl > 0) { vf -= 40 * Math.min(1, sl) * DT; if (sl > 0.5 && car.meter < 1) car.meter = Math.min(1, car.meter + 0.22 * DT); }     // derapare carica il boost
    var wx = fx * vf + sx * vl, wy = fy * vf + sy * vl;
    car.a += om * DT;
    fx = Math.cos(car.a); fy = Math.sin(car.a); sx = -fy; sy = fx;
    vf = wx * fx + wy * fy; vl = wx * sx + wy * sy;
    vl *= Math.exp(-(inp.brake ? 7 : 12) * (1 - 0.92 * Math.min(1, sl)) * DT);
    car.vx = fx * vf + sx * vl; car.vy = fy * vf + sy * vl;
    car.x += car.vx * DT; car.y += car.vy * DT;
    if (d > tr.hw + WALL) {                                             // muro / barriera
      var P = tr.P[car.idx], dx = car.x - P[0], dy = car.y - P[1], L = Math.hypot(dx, dy) || 1, r = tr.hw + WALL;
      car.x = P[0] + dx / L * r; car.y = P[1] + dy / L * r; car.vx *= 0.3; car.vy *= 0.3; car.hit = 0.3;
    }
    if (car.hit > 0) car.hit -= DT;
  }
  function items(tr, car, isMe) {            // oggetti in pista (solo il giocatore li prende; i bot sono "immuni" ma saltano i boost)
    for (var i = 0; i < tr.items.length; i++) {
      var it = tr.items[i]; if (it.gone && it.gone > 0) { it.gone -= DT; if (it.gone > 0) continue; }
      var di = ((car.idx - it.idx + tr.N * 1.5) % tr.N) - tr.N / 2; if (Math.abs(di) > 3) continue;
      if (Math.hypot(car.x - it.x, car.y - it.y) < 30) {
        if (it.t === "oil") { if (isMe && car.spin <= 0) { car.spin = 0.85; car.hit = 0.0; } }
        else { car.boostT = 0.9; car.meter = Math.min(1, car.meter + 0.3); it.gone = 5; }
      }
    }
  }
  function crash(cars) {                     // urti tra auto: si spingono e si frenano un po'
    for (var i = 0; i < cars.length; i++) for (var j = i + 1; j < cars.length; j++) {
      var a = cars[i], b = cars[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 24 && d > 0.01) { var o = (24 - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; a.vx *= 0.985; a.vy *= 0.985; b.vx *= 0.985; b.vy *= 0.985; a.hit = b.hit = 0.12; }
    }
  }
  function pilot(tr, car, off, skill) {      // bot: segue la linea (con un po' di scarto laterale) e frena in anticipo
    var v = Math.hypot(car.vx, car.vy), j = (car.idx + 3 + Math.round(v / 80)) % tr.N, T = tr.P[j], tx = T[0] + tr.nx[j] * off, ty = T[1] + tr.ny[j] * off;
    var df = Math.atan2(ty - car.y, tx - car.x) - car.a;
    while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
    var brake = false, ag = AG * skill;
    for (var q = 0; q < 24; q++) { var kk = tr.kap[(car.idx + q) % tr.N]; if (kk < 1e-4) continue; var vs = Math.sqrt(ag * 0.85 / kk), dist = q * tr.sp; if (v * v > vs * vs + 2 * 540 * dist * 0.8) { brake = true; break; } }
    return { l: df < -0.03, r: df > 0.03, brake: brake, boost: car.meter > 0.5 && Math.abs(df) < 0.05 && !brake };
  }
  function simulate(tr, withMe) {            // utile per i test: tutti pilotati dai bot
    var cars = [0, 1, 2, 3].map(function (s) { return newCar(tr, s); }), t = 0, offs = [0, -22, 22, 0], sk = [1, 0.92, 0.85, 0.78];
    for (var i = 0; i < 60 * 240; i++) {
      cars.forEach(function (c, k) { if (!c.fin) { step(tr, c, pilot(tr, c, offs[k], sk[k])); if (k === 0) items(tr, c, false); if (c.prog >= tr.N * tr.laps) { c.fin = true; c.finT = t; } } });
      crash(cars); t += DT; if (cars.every(function (c) { return c.fin; })) break;
    }
    return cars.map(function (c) { return c.fin ? +c.finT.toFixed(1) : 0; });
  }
  function fmt(t) { if (!t) return "--:--.--"; var m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var ORD = ["1°", "2°", "3°", "4°"];

  function open(host, onExit) {
    var root = el("div", "rc-root"); host.appendChild(root);
    function menu() {
      root.innerHTML = "";
      var top = el("div", "mp-top"), bk = el("button", "mp-back", "‹ Multi"); bk.type = "button"; bk.addEventListener("click", function () { root.remove(); onExit(); });
      top.appendChild(bk); top.appendChild(el("div", "mp-title", "CORSA")); root.appendChild(top);
      root.appendChild(el("div", "pg-me", "Gara a 4 contro i bot, 3 giri, in ORIZZONTALE. Sterza, FRENA prima delle curve, evita l'olio, prendi i boost: l'erba rallenta e i muri ti fermano. Scatta al VIA toccando BOOST subito dopo il verde (se anticipi, parti in ritardo)."));
      TRACKS.forEach(function (tr) {
        build(tr);
        var best = lsGet("arc_race2_" + tr.id), c = el("div", "mp-card rc-track");
        c.appendChild(el("div", "mp-ttl", "🏁 " + tr.name));
        c.appendChild(el("div", "rc-t", "Il tuo record: " + fmt(best && best.t)));
        var go = el("button", "mp-go", "▶ GARA (3 giri)"); go.type = "button"; go.addEventListener("click", function () { race(tr); }); c.appendChild(go); root.appendChild(c);
      });
    }
    function race(tr) {
      var full = el("div", "rc2"), cv = el("canvas", "rc2-cv"), hud = el("div", "rc2-hud"), cd = el("div", "rc2-cd");
      var left = el("div", "rc2-pad l"), right = el("div", "rc2-pad r"), bbar = el("div", "rc2-boost"), bfill = el("i"); bbar.appendChild(bfill);
      var xb = el("button", "rc2-x", "✕"); xb.type = "button";
      full.appendChild(cv); full.appendChild(hud); full.appendChild(cd); full.appendChild(left); full.appendChild(right); full.appendChild(bbar); full.appendChild(xb); document.body.appendChild(full);
      try { var tg = window.Telegram && window.Telegram.WebApp; if (tg && tg.lockOrientation) tg.lockOrientation(); } catch (e) {}
      var inp = { l: false, r: false, brake: false, boost: false }, W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), ctx = cv.getContext("2d");
      function mk(parent, label, key, cls) {
        var b = el("button", "rc2-b " + cls, label); b.type = "button";
        function on(e) { e.preventDefault(); inp[key] = true; b.classList.add("on"); if (key === "boost") boostTap(); } function offf(e) { e.preventDefault(); inp[key] = false; b.classList.remove("on"); }
        b.addEventListener("pointerdown", on); b.addEventListener("pointerup", offf); b.addEventListener("pointercancel", offf); b.addEventListener("pointerleave", offf); b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        parent.appendChild(b);
      }
      mk(left, "◀", "l", "dir"); mk(left, "▶", "r", "dir"); mk(right, "FRENO", "brake", "brk"); mk(right, "🔥 BOOST", "boost", "bst");
      var kdown = function (e) { kd(e, true); }, kup = function (e) { kd(e, false); };
      function kd(e, v) { var k = e.key; if (k === "ArrowLeft" || k === "a") inp.l = v; else if (k === "ArrowRight" || k === "d") inp.r = v; else if (k === " " || k === "ArrowDown") inp.brake = v; else if (k === "b" || k === "ArrowUp") { inp.boost = v; if (v) boostTap(); } }
      window.addEventListener("keydown", kdown); window.addEventListener("keyup", kup);
      function layout() {                                                       // orizzontale: se il telefono è in verticale ruota la scena
        var iw = window.innerWidth, ih = window.innerHeight, port = ih > iw;
        full.style.cssText = port ? "width:" + ih + "px;height:" + iw + "px;left:" + iw + "px;top:0;transform:rotate(90deg);transform-origin:0 0" : "width:" + iw + "px;height:" + ih + "px;left:0;top:0";
        W = port ? ih : iw; H = port ? iw : ih; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
      }
      layout(); window.addEventListener("resize", layout);
      var cars = [0, 1, 2, 3].map(function (s) { return newCar(tr, s); }), me = cars[0], offs = [0, -24, 24, 0], sk = [1, 0.9, 0.82, 0.74];
      var best = (lsGet("arc_race2_" + tr.id) || {}).t || 0, state = "count", cT = 0, t = 0, acc = 0, last = performance.now(), raf = 0, done = false, camx = me.x, camy = me.y, goT = 3.0, early = false, launched = false, botDelay = [0, 0.12, 0.2, 0.3];
      function boostTap() { if (state === "count") { if (cT < goT) early = true; } else if (state === "run" && !launched && t < 0.45 && !early) { launched = true; me.boostT = 1.1; A.haptic("medium"); } }
      function rank() { return cars.slice().sort(function (a, b) { return (b.fin ? 1e6 - b.finT : b.prog) - (a.fin ? 1e6 - a.finT : a.prog); }); }
      function stop() { done = true; cancelAnimationFrame(raf); window.removeEventListener("keydown", kdown); window.removeEventListener("keyup", kup); window.removeEventListener("resize", layout); try { var tg = window.Telegram && window.Telegram.WebApp; if (tg && tg.unlockOrientation) tg.unlockOrientation(); } catch (e) {} full.remove(); }
      xb.addEventListener("click", function () { stop(); menu(); });
      function finish() {
        state = "end"; var rk = rank(), pos = rk.indexOf(me), total = me.finT, rec = pos === 0 && (!best || total < best);
        if (rec) lsSet("arc_race2_" + tr.id, { t: total }); A.haptic(pos === 0 ? "ok" : "light");
        var box = el("div", "rc2-end"); box.appendChild(el("b", "", pos === 0 ? "🏆 HAI VINTO!" : ORD[pos] + " POSTO")); box.appendChild(el("div", "rc-big", fmt(total) + (rec ? "  ·  NUOVO RECORD" : "")));
        rk.forEach(function (c, i) { box.appendChild(el("div", "rc-lap" + (c === me ? " me" : ""), ORD[i] + "  " + c.name + "  " + (c.fin ? fmt(c.finT) : "in gara"))); });
        var rw = el("div", "mp-end"), a = el("button", "mp-go", "RIGIOCA"), b = el("button", "mp-go mp-alt", "PISTE"); a.type = b.type = "button";
        a.addEventListener("click", function () { stop(); race(tr); }); b.addEventListener("click", function () { stop(); menu(); }); rw.appendChild(a); rw.appendChild(b); box.appendChild(rw); full.appendChild(box);
      }
      var ex = rng(7);
      function drawCar(c, Z, X, Y) {
        ctx.save(); ctx.translate(X(c.x), Y(c.y)); ctx.rotate(c.a + (c.spin > 0 ? 0 : 0)); ctx.scale(Z, Z);
        ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(-15, -7, 32, 17);
        ctx.fillStyle = "#15151c"; [[-10, -10], [-10, 6], [8, -10], [8, 6]].forEach(function (w) { ctx.fillRect(w[0], w[1], 8, 4); });
        ctx.fillStyle = c.hit > 0 ? "#fff" : c.col; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(10, -6); ctx.lineTo(-13, -7); ctx.lineTo(-15, 0); ctx.lineTo(-13, 7); ctx.lineTo(10, 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(-4, -2, 9, 4); ctx.fillStyle = "#fff"; ctx.fillRect(-15, -8, 3, 16);
        if (c.boostT > 0) { ctx.fillStyle = "#ffb300"; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-30 - Math.random() * 8, -3); ctx.lineTo(-30 - Math.random() * 8, 3); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      function draw() {
        var Z = H / 420, spd = Math.hypot(me.vx, me.vy); camx += (me.x + me.vx * 0.28 - camx) * 0.16; camy += (me.y + me.vy * 0.28 - camy) * 0.16;
        var ox = camx - W / 2 / Z, oy = camy - H / 2 / Z; function X(x) { return (x - ox) * Z; } function Y(y) { return (y - oy) * Z; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#3fae3a"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,.07)"; var gx = 80, sx0 = Math.floor(ox / gx) * gx, sy0 = Math.floor(oy / gx) * gx;
        for (var gxx = sx0; gxx < ox + W / Z + gx; gxx += gx) for (var gyy = sy0; gyy < oy + H / Z + gx; gyy += gx) if (((gxx / gx + gyy / gx) & 1) === 0) ctx.fillRect(X(gxx), Y(gyy), gx * Z, gx * Z);
        tr.trees.forEach(function (tt) { if (tt.sand && tt.x > ox - 80 && tt.x < ox + W / Z + 80 && tt.y > oy - 80 && tt.y < oy + H / Z + 80) { ctx.fillStyle = "#e0a05a"; ctx.beginPath(); ctx.ellipse(X(tt.x), Y(tt.y), tt.s * 2.6 * Z, tt.s * 1.8 * Z, 0, 0, 7); ctx.fill(); } });
        function path() { ctx.beginPath(); tr.P.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.closePath(); }
        ctx.lineJoin = "round"; ctx.lineCap = "butt"; var wl = tr.hw + WALL;
        path(); ctx.lineWidth = (wl * 2 + 12) * Z; ctx.strokeStyle = "#2b2f3c"; ctx.setLineDash([]); ctx.stroke();                     // barriera (scura, ben diversa dai cordoli)
        path(); ctx.lineWidth = (wl * 2 + 12) * Z; ctx.strokeStyle = "#8fa0c8"; ctx.setLineDash([10 * Z, 14 * Z]); ctx.stroke(); ctx.setLineDash([]);
        path(); ctx.lineWidth = (wl * 2 - 4) * Z; ctx.strokeStyle = "#3fae3a"; ctx.stroke();
        path(); ctx.lineWidth = (wl * 2 - 4) * Z; ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.stroke();
        path(); ctx.lineWidth = (tr.hw * 2 + KERB * 2) * Z; ctx.strokeStyle = "#f4f4f6"; ctx.stroke();
        path(); ctx.lineWidth = (tr.hw * 2 + KERB * 2) * Z; ctx.strokeStyle = "#e0203f"; ctx.setLineDash([22 * Z, 22 * Z]); ctx.stroke(); ctx.setLineDash([]);
        path(); ctx.lineWidth = tr.hw * 2 * Z; ctx.strokeStyle = "#6d6a7c"; ctx.stroke();
        path(); ctx.lineWidth = 3 * Z; ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.setLineDash([26 * Z, 34 * Z]); ctx.stroke(); ctx.setLineDash([]);
        var p0 = tr.P[0], an = tr.ta[0];                                                                                                     // linea di partenza a scacchi
        ctx.save(); ctx.translate(X(p0[0]), Y(p0[1])); ctx.rotate(an); var cs = 14 * Z, nq = Math.ceil(tr.hw / 14);
        for (var q = -nq; q < nq; q++) for (var w = 0; w < 2; w++) { ctx.fillStyle = (q + w) & 1 ? "#fff" : "#111"; ctx.fillRect(w * cs - cs, q * cs, cs, cs); }
        ctx.restore();
        tr.items.forEach(function (it) {
          if (it.gone > 0 || it.x < ox - 40 || it.x > ox + W / Z + 40 || it.y < oy - 40 || it.y > oy + H / Z + 40) return;
          if (it.t === "oil") { ctx.fillStyle = "#14131a"; ctx.beginPath(); ctx.ellipse(X(it.x), Y(it.y), 24 * Z, 17 * Z, 0.4, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(90,80,160,.5)"; ctx.beginPath(); ctx.ellipse(X(it.x) - 5 * Z, Y(it.y) - 4 * Z, 9 * Z, 5 * Z, 0.4, 0, 7); ctx.fill(); }
          else { ctx.save(); ctx.translate(X(it.x), Y(it.y)); ctx.rotate(tr.ta[it.idx]); ctx.scale(Z, Z); ctx.fillStyle = "#ffd23b"; ctx.fillRect(-18, -18, 36, 36); ctx.fillStyle = "#b8860b"; for (var cx2 = -10; cx2 <= 6; cx2 += 10) { ctx.beginPath(); ctx.moveTo(cx2, -11); ctx.lineTo(cx2 + 8, 0); ctx.lineTo(cx2, 11); ctx.lineTo(cx2 + 3, 11); ctx.lineTo(cx2 + 11, 0); ctx.lineTo(cx2 + 3, -11); ctx.fill(); } ctx.restore(); }
        });
        cars.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (c) { drawCar(c, Z, X, Y); });
        var vis = tr.trees.filter(function (tt) { return !tt.sand && tt.x > ox - 60 && tt.x < ox + W / Z + 60 && tt.y > oy - 90 && tt.y < oy + H / Z + 60; }).sort(function (a, b) { return a.y - b.y; });
        vis.forEach(function (tt) {                                                                                                          // alberi "a blocchi"
          var x = X(tt.x), y = Y(tt.y), s = tt.s * Z, h = tt.h * Z;
          ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(x - s / 2, y - 2 * Z, s * 1.25, s * 0.55);
          ctx.fillStyle = "#1f7a2a"; ctx.fillRect(x - s / 2, y - h, s, h); ctx.fillStyle = "#2fa83a"; ctx.fillRect(x - s / 2, y - h - s * 0.45, s, s * 0.45); ctx.fillStyle = "#58d65e"; ctx.fillRect(x - s / 2 + 2 * Z, y - h - s * 0.45 + 2 * Z, s * 0.4, s * 0.2);
        });
        if (me.slip > 0.3 && state === "run") { ctx.fillStyle = "rgba(255,255,255,.4)"; for (var sm = 0; sm < 3; sm++) { ctx.beginPath(); ctx.arc(X(me.x) - Math.cos(me.a) * 14 * Z + (Math.random() - 0.5) * 12 * Z, Y(me.y) - Math.sin(me.a) * 14 * Z + (Math.random() - 0.5) * 12 * Z, (3 + Math.random() * 4) * Z, 0, 7); ctx.fill(); } }
        // minimappa con i 4 puntini
        var MW = 120, MH = 84, mx0 = W - MW - 10, my0 = 10, bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
        tr.P.forEach(function (p) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]); });
        var ms = Math.min((MW - 14) / (bx1 - bx0), (MH - 14) / (by1 - by0)); ctx.fillStyle = "rgba(8,4,20,.5)"; ctx.fillRect(mx0, my0, MW, MH);
        ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 3; ctx.beginPath(); tr.P.forEach(function (p, k) { var mxx = mx0 + 7 + (p[0] - bx0) * ms, myy = my0 + 7 + (p[1] - by0) * ms; if (k) ctx.lineTo(mxx, myy); else ctx.moveTo(mxx, myy); }); ctx.closePath(); ctx.stroke();
        cars.slice().reverse().forEach(function (c) { ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(mx0 + 7 + (c.x - bx0) * ms, my0 + 7 + (c.y - by0) * ms, c === me ? 4 : 3, 0, 7); ctx.fill(); });
      }
      function hudDraw() {
        var pos = rank().indexOf(me), v = Math.round(Math.hypot(me.vx, me.vy) * 0.5);
        hud.innerHTML = "<b class='p'>" + ORD[pos] + "</b><span>GIRO " + Math.min(me.lap, tr.laps) + "/" + tr.laps + "</span><span>" + fmt(t) + "</span><span>" + v + " km/h</span>";
        bfill.style.width = Math.round(me.meter * 100) + "%";
      }
      function frame(now) {
        if (done || !full.isConnected) { stop(); return; }
        acc += Math.min(0.1, (now - last) / 1000); last = now;
        while (acc >= DT) {
          acc -= DT;
          if (state === "count") {
            cT += DT; cd.textContent = cT < 0.6 ? "" : cT < goT ? "🔴".repeat(Math.min(3, Math.floor((cT - 0.6) / 0.8) + 1)) : "🟢 VIA!";
            if (cT >= goT) { state = "run"; t = 0; setTimeout(function () { cd.textContent = ""; }, 700); if (early) { me.stall = 0.9; A.toast && A.toast("Falsa partenza!"); } }
            continue;
          }
          if (state !== "run") continue;
          cars.forEach(function (c, k) {
            if (c.fin) { c.vx *= 0.99; c.vy *= 0.99; return; }
            if (k === 0) { step(tr, c, inp); items(tr, c, true); } else if (t >= botDelay[k]) { step(tr, c, pilot(tr, c, offs[k], sk[k])); }
            if (c.prog >= tr.N * c.lap && !c.fin) { c.lap++; if (k === 0) A.haptic("light"); }
            if (c.prog >= tr.N * tr.laps) { c.fin = true; c.finT = t; }
          });
          crash(cars); t += DT;
          if (me.fin) { finish(); break; }
        }
        draw(); hudDraw(); raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(function (n) { last = n; frame(n); });
    }
    menu();
  }
  window.ArcadeRace = { open: open, _t: { TRACKS: TRACKS, build: build, simulate: simulate, step: step, newCar: newCar, pilot: pilot } };
})();
