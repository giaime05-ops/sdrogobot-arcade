/* Sdrogo Arcade – CORSA F1 (prototipo, solo account di prova): vista da dietro (pseudo-3D), giri a tempo, fantasma del tuo record e tempo del bot. */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var TRACKS = [
    { id: "neon", name: "Neon Circuit", hw: 52, laps: 3, k: 0.9, pts: [[0, 0], [500, -40], [900, -10], [1150, 160], [1060, 400], [780, 470], [560, 380], [380, 520], [430, 760], [200, 880], [-120, 820], [-320, 600], [-330, 280], [-190, 60]] },
    { id: "serp", name: "Serpentina", hw: 52, laps: 2, k: 0.9, pts: [[0, 0], [420, -100], [800, -60], [1000, 140], [820, 320], [520, 260], [330, 400], [470, 620], [820, 680], [1060, 860], [880, 1060], [480, 990], [160, 1090], [-220, 940], [-300, 600], [-90, 420], [-260, 200], [-200, 40]] },
    { id: "tornanti", name: "Tornanti", hw: 50, laps: 2, k: 0.85, pts: [[0, 0], [550, 0], [1100, 0], [1380, 130], [1330, 340], [1050, 420], [760, 330], [540, 430], [600, 650], [900, 770], [1120, 980], [870, 1160], [450, 1080], [220, 860], [-120, 760], [-340, 520], [-300, 200]] }
  ];
  var VMAX = 520, VOFF = 90, DT = 1 / 60, AG = 230, WALL = 30;

  function build(tr) {                      // spline chiusa (Catmull-Rom) campionata + tangenti, normali, curvatura
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
    tr.marks = [];                                                        // inizio curve impegnative: qui servono le tacche di frenata
    for (k = 0; k < N; k++) { var pr = kap[(k + N - 1) % N]; if (kap[k] > 1 / 230 && pr <= 1 / 230) tr.marks.push(k); }
    return tr;
  }
  function newCar(tr) {
    var a = Math.atan2(tr.P[2][1] - tr.P[0][1], tr.P[2][0] - tr.P[0][0]);
    return { x: tr.P[0][0], y: tr.P[0][1], a: a, vx: 0, vy: 0, idx: 0, prog: 0, off: false, hit: 0, slip: 0 };
  }
  function nearest(tr, car) {               // vertice più vicino in una finestra attorno al progresso (niente scorciatoie), con distanza dal centro pista
    var N = tr.N, best = 1e12, bi = car.idx;
    for (var d = -18; d <= 18; d++) {
      var i = (car.idx + d + N) % N, dx = car.x - tr.P[i][0], dy = car.y - tr.P[i][1], q = dx * dx + dy * dy;
      if (q < best) { best = q; bi = i; }
    }
    var dl = bi - car.idx; if (dl > N / 2) dl -= N; if (dl < -N / 2) dl += N;
    car.prog += dl; car.idx = bi; return Math.sqrt(best);
  }
  function step(tr, car, inp) {             // un passo di fisica (60 Hz, deterministico: si può rigiocare sul server)
    var fx = Math.cos(car.a), fy = Math.sin(car.a), sx = -fy, sy = fx;
    var vf = car.vx * fx + car.vy * fy, vl = car.vx * sx + car.vy * sy;
    var d = nearest(tr, car), off = d > tr.hw; car.off = off;
    var vmax = off ? VOFF : VMAX;
    if (inp.brake) vf -= 620 * DT; else vf += 430 * Math.max(-0.8, 1 - vf / vmax) * DT;
    vf -= vf * (off ? 2.6 : 0.25) * DT; if (vf < 0) vf = 0;
    var turn = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), om = turn * 2.5 * (1 - 0.55 * Math.min(1, vf / VMAX)) * Math.min(1, vf / 60);
    var dem = vf * Math.abs(om), sl = Math.max(0, Math.min(1.2, (dem - AG) / (AG * 0.5)));      // troppa velocità per la curva: le gomme non tengono e l'auto va larga
    car.slip = sl; if (sl > 0) vf -= 40 * Math.min(1, sl) * DT;
    var wx = fx * vf + sx * vl, wy = fy * vf + sy * vl;                    // velocità reale (nel mondo) prima di girare il muso
    car.a += om * DT;
    fx = Math.cos(car.a); fy = Math.sin(car.a); sx = -fy; sy = fx;
    vf = wx * fx + wy * fy; vl = wx * sx + wy * sy;                         // la direzione di marcia segue il muso solo quanto permette l'aderenza
    vl *= Math.exp(-(inp.brake ? 7 : 12) * (1 - 0.92 * Math.min(1, sl)) * DT);
    car.vx = fx * vf + sx * vl; car.vy = fy * vf + sy * vl;
    car.x += car.vx * DT; car.y += car.vy * DT;
    if (d > tr.hw + WALL) {                                             // MURO: si torna a filo muro e si perde molta velocità
      var P = tr.P[car.idx], dx = car.x - P[0], dy = car.y - P[1], L = Math.hypot(dx, dy) || 1, r = tr.hw + WALL;
      car.x = P[0] + dx / L * r; car.y = P[1] + dy / L * r; car.vx *= 0.3; car.vy *= 0.3; car.hit = 0.3;
    }
    if (car.hit > 0) car.hit -= DT;
  }
  function pilot(tr, car) {                 // autopilota di riferimento: segue la traiettoria e frena in anticipo prima delle curve
    var v = Math.hypot(car.vx, car.vy), T = tr.P[(car.idx + 3 + Math.round(v / 80)) % tr.N], want = Math.atan2(T[1] - car.y, T[0] - car.x), df = want - car.a;
    while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
    var brake = false;
    for (var j = 0; j < 22; j++) { var kk = tr.kap[(car.idx + j) % tr.N]; if (kk < 1e-4) continue; var vs = Math.sqrt(AG * 0.8 / kk), dist = j * tr.sp; if (v * v > vs * vs + 2 * 520 * dist * 0.8) { brake = true; break; } }
    return { l: df < -0.03, r: df > 0.03, brake: brake };
  }
  function botRun(tr) {                     // tempo e traiettoria di riferimento del bot
    var car = newCar(tr), t = 0, g = [], lapT = [], lastLap = 0;
    for (var i = 0; i < 60 * 200; i++) {
      step(tr, car, pilot(tr, car)); t += DT; if (i % 3 === 0) g.push([Math.round(car.x), Math.round(car.y), +car.a.toFixed(2)]);
      if (car.prog >= tr.N * (lapT.length + 1)) { lapT.push(t - lastLap); lastLap = t; if (lapT.length >= tr.laps) break; }
    }
    return { t: lapT.length >= tr.laps ? t * 1.04 : 0, g: g };
  }
  function fmt(t) { if (!t) return "--:--.--"; var m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function open(host, onExit) {
    var root = el("div", "rc-root"); host.appendChild(root);
    function menu() {
      root.innerHTML = "";
      var top = el("div", "mp-top"), bk = el("button", "mp-back", "‹ Multi"); bk.type = "button"; bk.addEventListener("click", function () { root.remove(); onExit(); });
      top.appendChild(bk); top.appendChild(el("div", "mp-title", "CORSA F1")); root.appendChild(top);
      root.appendChild(el("div", "pg-me", "Vista da dietro: l'auto accelera da sola, tu sterzi e FRENI prima delle curve (strisce rosse = frenata). Muri ai lati: toccarli costa tantissimo. Giri a tempo, il fantasma è il tuo record."));
      TRACKS.forEach(function (tr) {
        build(tr); if (!tr.bot) tr.bot = botRun(tr);
        var best = lsGet("arc_race_" + tr.id), c = el("div", "mp-card rc-track");
        c.appendChild(el("div", "mp-ttl", "🏁 " + tr.name));
        c.appendChild(el("div", "rc-t", "Il tuo record: " + fmt(best && best.t) + "   ·   Bot: " + fmt(tr.bot.t)));
        var go = el("button", "mp-go", "▶ GIOCA"); go.type = "button"; go.addEventListener("click", function () { race(tr); }); c.appendChild(go); root.appendChild(c);
      });
    }
    function race(tr) {
      root.innerHTML = ""; var wrap = el("div", "rc-wrap"), cv = el("canvas", "rc-cv"), hud = el("div", "rc-hud"), ctl = el("div", "rc-ctl"), cd = el("div", "rc-cd");
      wrap.appendChild(cv); wrap.appendChild(hud); wrap.appendChild(cd);
      var xb = el("button", "rc-x", "✕ ESCI"); xb.type = "button"; xb.addEventListener("click", function () { stop(); menu(); }); wrap.appendChild(xb); root.appendChild(wrap); root.appendChild(ctl);
      var inp = { l: false, r: false, brake: false };
      function mk(label, key, cls) {
        var b = el("button", "rc-b " + cls, label); b.type = "button";
        function on(e) { e.preventDefault(); inp[key] = true; b.classList.add("on"); } function offf(e) { e.preventDefault(); inp[key] = false; b.classList.remove("on"); }
        b.addEventListener("pointerdown", on); b.addEventListener("pointerup", offf); b.addEventListener("pointercancel", offf); b.addEventListener("pointerleave", offf); b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        ctl.appendChild(b);
      }
      mk("◀", "l", "lr"); mk("FRENO", "brake", "br"); mk("▶", "r", "lr");
      var kd = function (e, v) { var k = e.key; if (k === "ArrowLeft" || k === "a") inp.l = v; else if (k === "ArrowRight" || k === "d") inp.r = v; else if (k === " " || k === "ArrowDown") inp.brake = v; };
      var kdown = function (e) { kd(e, true); }, kup = function (e) { kd(e, false); };
      window.addEventListener("keydown", kdown); window.addEventListener("keyup", kup);
      var ctx = cv.getContext("2d"), W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
      function size() { var r = wrap.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(200, r.height); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px"; }
      size();
      var car = newCar(tr), t = 0, lap = 1, lapStart = 0, laps = [], rec = [], ghost = (lsGet("arc_race_" + tr.id) || {}).g || tr.bot.g, best = (lsGet("arc_race_" + tr.id) || {}).t || 0;
      var state = "count", cdT = 3.2, acc = 0, last = performance.now(), steps = 0, raf = 0, done = false, Z = 1.05;
      function finish() {
        state = "end"; var total = t, rec2 = !best || total < best;
        if (rec2) lsSet("arc_race_" + tr.id, { t: total, g: rec }); A.haptic(rec2 ? "ok" : "light");
        var box = el("div", "rc-end"); box.appendChild(el("b", "", rec2 ? "🏆 NUOVO RECORD!" : "ARRIVO!")); box.appendChild(el("div", "rc-big", fmt(total)));
        laps.forEach(function (l, i) { box.appendChild(el("div", "rc-lap", "Giro " + (i + 1) + "  " + fmt(l))); });
        box.appendChild(el("div", "rc-lap", "Bot: " + fmt(tr.bot.t) + (best && !rec2 ? "  ·  Record: " + fmt(best) : "")));
        var rw = el("div", "mp-end"), a = el("button", "mp-go", "RIPROVA"), b = el("button", "mp-go mp-alt", "PISTE"); a.type = b.type = "button";
        a.addEventListener("click", function () { stop(); race(tr); }); b.addEventListener("click", function () { stop(); menu(); }); rw.appendChild(a); rw.appendChild(b); box.appendChild(rw); wrap.appendChild(box);
      }
      function stop() { done = true; cancelAnimationFrame(raf); window.removeEventListener("keydown", kdown); window.removeEventListener("keyup", kup); }
      var camA = car.a, shake = 0;
      function draw() {
        var da = car.a - camA; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; camA += da * 0.18;
        var HOR = H * 0.36, F = W * 0.95, CD = 96, CH = 62, ca = Math.cos(camA), sa = Math.sin(camA);
        var cx0 = car.x - ca * CD, cy0 = car.y - sa * CD, WH = 26;
        // cielo: gradiente neon + sole + sagome lontane (scorrono con la sterzata)
        var g = ctx.createLinearGradient(0, 0, 0, HOR); g.addColorStop(0, "#07051a"); g.addColorStop(0.65, "#3b0f63"); g.addColorStop(1, "#ff3db0");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, HOR + 1);
        var off = -camA * W * 0.9; ctx.fillStyle = "#ffd36a"; ctx.beginPath(); ctx.arc(((W * 0.7 + off) % (W * 2) + W * 2) % (W * 2) - W * 0.4, HOR - 18, 26, 0, 7); ctx.fill();
        ctx.fillStyle = "#14082e"; ctx.beginPath(); ctx.moveTo(0, HOR);
        for (var mx = 0; mx <= W + 40; mx += 40) { var wv = Math.sin((mx - off) * 0.011) * 9 + Math.sin((mx - off) * 0.031) * 5; ctx.lineTo(mx, HOR - 14 - wv - 8); }
        ctx.lineTo(W, HOR); ctx.fill();
        ctx.fillStyle = "#103a22"; ctx.fillRect(0, HOR, W, H - HOR);                         // erba
        function pr(wx, wy, wz) {                                                              // proiezione prospettica; null se dietro la camera
          var dx = wx - cx0, dy = wy - cy0, f = dx * ca + dy * sa; if (f < 5) return null;
          var l = -dx * sa + dy * ca; return [W / 2 + l / f * F, HOR + (CH - wz) / f * F, f];
        }
        function quad(p, q, r, s2, col) { if (!p || !q || !r || !s2) return; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.lineTo(r[0], r[1]); ctx.lineTo(s2[0], s2[1]); ctx.closePath(); ctx.fill(); }
        var N = tr.N, base = car.idx - 7, FAR = 62, hw = tr.hw, wl = hw + WALL, ph = (car.prog | 0), mk = {};
        tr.marks.forEach(function (m) { [2, 4, 6].forEach(function (b) { mk[(m - b + N) % N] = b; }); });
        for (var j = FAR; j >= 0; j--) {
          var i = ((base + j) % N + N) % N, i2 = (i + 1) % N, A0 = tr.P[i], B0 = tr.P[i2], nx0 = tr.nx[i], ny0 = tr.ny[i], nx1 = tr.nx[i2], ny1 = tr.ny[i2];
          function pt(P, nx, ny, o, z) { return pr(P[0] + nx * o, P[1] + ny * o, z || 0); }
          var alt = (i % 2 === 0);
          // fascia di ghiaia tra asfalto e muro
          quad(pt(A0, nx0, ny0, hw, 0), pt(A0, nx0, ny0, wl, 0), pt(B0, nx1, ny1, wl, 0), pt(B0, nx1, ny1, hw, 0), "#6b5a34");
          quad(pt(A0, nx0, ny0, -wl, 0), pt(A0, nx0, ny0, -hw, 0), pt(B0, nx1, ny1, -hw, 0), pt(B0, nx1, ny1, -wl, 0), "#6b5a34");
          // asfalto
          quad(pt(A0, nx0, ny0, -hw, 0), pt(A0, nx0, ny0, hw, 0), pt(B0, nx1, ny1, hw, 0), pt(B0, nx1, ny1, -hw, 0), alt ? "#2b2b3a" : "#323244");
          // righe bianche ai bordi dell'asfalto
          quad(pt(A0, nx0, ny0, hw - 4, 0), pt(A0, nx0, ny0, hw, 0), pt(B0, nx1, ny1, hw, 0), pt(B0, nx1, ny1, hw - 4, 0), "#e8e8f0");
          quad(pt(A0, nx0, ny0, -hw, 0), pt(A0, nx0, ny0, -hw + 4, 0), pt(B0, nx1, ny1, -hw + 4, 0), pt(B0, nx1, ny1, -hw, 0), "#e8e8f0");
          if (alt) quad(pt(A0, nx0, ny0, -2, 0), pt(A0, nx0, ny0, 2, 0), pt(B0, nx1, ny1, 2, 0), pt(B0, nx1, ny1, -2, 0), "rgba(255,226,122,.55)");
          // tacche di frenata: 3 / 2 / 1 strisce trasversali prima delle curve difficili
          if (mk[i]) { var nb = mk[i] === 6 ? 1 : mk[i] === 4 ? 2 : 3; for (var q = 0; q < nb; q++) { var o0 = -hw + 6 + q * 9; quad(pt(A0, nx0, ny0, o0, 0), pt(A0, nx0, ny0, o0 + 5, 0), pt(B0, nx1, ny1, o0 + 5, 0), pt(B0, nx1, ny1, o0, 0), "#ff3d3d"); var o1 = hw - 6 - q * 9; quad(pt(A0, nx0, ny0, o1 - 5, 0), pt(A0, nx0, ny0, o1, 0), pt(B0, nx1, ny1, o1, 0), pt(B0, nx1, ny1, o1 - 5, 0), "#ff3d3d"); } }
          // linea di partenza a scacchi
          if (i === 0) { var cn = 8; for (var cc = 0; cc < cn; cc++) { var oa = -hw + cc * (hw * 2 / cn), ob = oa + hw * 2 / cn; quad(pt(A0, nx0, ny0, oa, 0), pt(A0, nx0, ny0, ob, 0), pt(B0, nx1, ny1, ob, 0), pt(B0, nx1, ny1, oa, 0), cc % 2 ? "#fff" : "#111"); } }
          // MURI: blocchi alti scuri con fascia neon, ben distinti dall'asfalto
          [1, -1].forEach(function (sg) {
            var o = wl * sg;
            quad(pt(A0, nx0, ny0, o, 0), pt(B0, nx1, ny1, o, 0), pt(B0, nx1, ny1, o, WH), pt(A0, nx0, ny0, o, WH), alt ? "#1a2146" : "#222b5c");
            quad(pt(A0, nx0, ny0, o, WH * 0.62), pt(B0, nx1, ny1, o, WH * 0.62), pt(B0, nx1, ny1, o, WH * 0.8), pt(A0, nx0, ny0, o, WH * 0.8), alt ? "#35e6ff" : "#ff3db0");
            quad(pt(A0, nx0, ny0, o, WH), pt(B0, nx1, ny1, o, WH), pt(B0, nx1, ny1, o + 6 * sg, WH), pt(A0, nx0, ny0, o + 6 * sg, WH), "#0b0e24");
          });
        }
        function sprite(sx, sy, w, col, alpha, yaw) {                                           // auto vista da dietro
          ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx, sy); ctx.rotate(yaw); var u = w / 36;
          ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.ellipse(0, 1 * u, 19 * u, 4 * u, 0, 0, 7); ctx.fill();
          ctx.fillStyle = "#0c0c10"; ctx.fillRect(-18 * u, -13 * u, 8 * u, 13 * u); ctx.fillRect(10 * u, -13 * u, 8 * u, 13 * u);        // ruote posteriori
          ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10 * u, -4 * u); ctx.lineTo(-8 * u, -17 * u); ctx.lineTo(8 * u, -17 * u); ctx.lineTo(10 * u, -4 * u); ctx.closePath(); ctx.fill();   // corpo
          ctx.fillStyle = "#12121a"; ctx.fillRect(-4 * u, -23 * u, 8 * u, 7 * u);                                                         // airbox / casco
          ctx.fillStyle = col; ctx.fillRect(-15 * u, -27 * u, 30 * u, 4 * u); ctx.fillStyle = "#fff"; ctx.fillRect(-15 * u, -27 * u, 30 * u, 1.2 * u);   // alettone
          ctx.fillStyle = "#222"; ctx.fillRect(-1.5 * u, -27 * u, 3 * u, 10 * u);
          if (inp.brake) { ctx.fillStyle = "#ff2020"; ctx.fillRect(-5 * u, -9 * u, 10 * u, 3 * u); }
          ctx.restore();
        }
        if (state !== "count" && ghost && ghost.length) {
          var gi = Math.min(ghost.length - 1, Math.floor(t / DT / 3)), gg = ghost[gi], gp = pr(gg[0], gg[1], 0);
          if (gp) sprite(gp[0], gp[1], Math.min(W * 0.6, 26 * F / gp[2]), "#9fd0ff", 0.5, 0);
        }
        var cp = pr(car.x, car.y, 0), yaw = Math.max(-0.35, Math.min(0.35, (car.a - camA) * 1.6));
        var shk = car.hit > 0 ? (Math.random() - 0.5) * 8 : 0;
        if (cp) sprite(cp[0] + shk, cp[1], 26 * F / cp[2], car.hit > 0 ? "#ffffff" : "#ff2fa8", 1, yaw);
        if (car.slip > 0.3 && state === "run") { ctx.fillStyle = "rgba(255,255,255,.35)"; for (var sm = 0; sm < 4; sm++) { ctx.beginPath(); ctx.arc(cp[0] + (sm - 1.5) * 14 + (Math.random() - 0.5) * 10, cp[1] - 4 - Math.random() * 10, 5 + Math.random() * 6, 0, 7); ctx.fill(); } }
        // minimappa
        var MW = 74, mx0 = W - MW - 8, my0 = 44, bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
        tr.P.forEach(function (p) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]); });
        var ms = (MW - 10) / Math.max(bx1 - bx0, by1 - by0); ctx.fillStyle = "rgba(8,4,20,.55)"; ctx.fillRect(mx0, my0, MW, MW);
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2; ctx.beginPath(); tr.P.forEach(function (p, k) { var X = mx0 + 5 + (p[0] - bx0) * ms, Y = my0 + 5 + (p[1] - by0) * ms; if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = "#ff2fa8"; ctx.beginPath(); ctx.arc(mx0 + 5 + (car.x - bx0) * ms, my0 + 5 + (car.y - by0) * ms, 3.5, 0, 7); ctx.fill();
      }
      function hudDraw() {
        var v = Math.round(Math.hypot(car.vx, car.vy) * 0.75);
        hud.innerHTML = "<span>GIRO " + Math.min(lap, tr.laps) + "/" + tr.laps + "</span><b>" + fmt(t) + "</b><span>" + v + " km/h</span>" + (best ? "<i>REC " + fmt(best) + "</i>" : "");
      }
      function frame(now) {
        if (done || !root.isConnected) { stop(); return; }
        acc += Math.min(0.1, (now - last) / 1000); last = now;
        while (acc >= DT) {
          acc -= DT;
          if (state === "count") { cdT -= DT; cd.textContent = cdT > 0.2 ? String(Math.ceil(cdT - 0.2)) : "VIA!"; if (cdT <= 0) { state = "run"; cd.textContent = ""; } continue; }
          if (state !== "run") continue;
          step(tr, car, inp); t += DT; steps++; if (steps % 3 === 0) rec.push([Math.round(car.x), Math.round(car.y), +car.a.toFixed(2)]);
          if (car.prog >= tr.N * lap) { var lt = t - lapStart; laps.push(lt); lapStart = t; lap++; A.haptic("light"); if (lap > tr.laps) { finish(); break; } }
        }
        draw(); hudDraw(); raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(function (n) { last = n; frame(n); });
    }
    menu();
  }
  window.ArcadeRace = { open: open, _t: { TRACKS: TRACKS, build: build, botRun: botRun, pilot: pilot, step: step, newCar: newCar } };
})();
