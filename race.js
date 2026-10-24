/* Sdrogo Arcade – CORSA F1 (prototipo, solo account di prova): auto viste dall'alto, giri a tempo, fantasma del tuo record e tempo del bot. */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var TRACKS = [
    { id: "neon", name: "Neon Oval", hw: 54, laps: 3, k: 1.6, pts: [[0, 0], [400, -60], [800, -20], [1050, 150], [980, 420], [700, 560], [420, 470], [250, 600], [-50, 640], [-300, 500], [-340, 230], [-200, 60]] },
    { id: "serp", name: "Serpentina", hw: 56, laps: 2, k: 1.6, pts: [[0, 0], [350, -120], [700, -60], [900, 150], [700, 330], [450, 250], [250, 380], [420, 600], [760, 650], [1000, 820], [800, 1000], [400, 930], [100, 1040], [-250, 900], [-300, 560], [-80, 380], [-250, 180], [-200, 40]] }
  ];
  var VMAX = 340, VOFF = 120, DT = 1 / 60;

  function build(tr) {                      // spline chiusa (Catmull-Rom) campionata
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
    tr.P = P; tr.N = P.length; return tr;
  }
  function newCar(tr) {
    var a = Math.atan2(tr.P[2][1] - tr.P[0][1], tr.P[2][0] - tr.P[0][0]);
    return { x: tr.P[0][0], y: tr.P[0][1], a: a, vx: 0, vy: 0, idx: 0, prog: 0, off: false, hit: 0 };
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
    if (inp.brake) vf -= 560 * DT; else vf += 300 * Math.max(-0.6, 1 - vf / vmax) * DT;
    vf -= vf * (off ? 1.6 : 0.25) * DT; if (vf < 0) vf = 0;
    vl *= Math.exp(-(inp.brake ? 3.2 : 5.5) * DT);                      // aderenza: con il freno scivola di più
    var turn = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    car.a += turn * 2.7 * (1 - 0.38 * Math.min(1, vf / VMAX)) * Math.min(1, vf / 70) * DT;
    fx = Math.cos(car.a); fy = Math.sin(car.a); sx = -fy; sy = fx;
    car.vx = fx * vf + sx * vl; car.vy = fy * vf + sy * vl;
    car.x += car.vx * DT; car.y += car.vy * DT;
    if (d > tr.hw + 46) {                                               // muro: si torna sul bordo e si perde velocità
      var P = tr.P[car.idx], dx = car.x - P[0], dy = car.y - P[1], L = Math.hypot(dx, dy) || 1, r = tr.hw + 46;
      car.x = P[0] + dx / L * r; car.y = P[1] + dy / L * r; car.vx *= 0.55; car.vy *= 0.55; car.hit = 0.25;
    }
    if (car.hit > 0) car.hit -= DT;
  }
  function pilot(tr, car) {                 // autopilota: inseguimento di un punto davanti, frena in curva
    var v0 = Math.hypot(car.vx, car.vy), T = tr.P[(car.idx + 4 + Math.round(v0 / 70)) % tr.N], want = Math.atan2(T[1] - car.y, T[0] - car.x), df = want - car.a;
    while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
    var v = Math.hypot(car.vx, car.vy);
    return { l: df < -0.04, r: df > 0.04, brake: Math.abs(df) > 0.45 && v > 150 };
  }
  function botRun(tr) {                     // tempo e traiettoria di riferimento del bot
    var car = newCar(tr), t = 0, g = [], lapT = [], lastLap = 0;
    for (var i = 0; i < 60 * 150; i++) {
      step(tr, car, pilot(tr, car)); t += DT; if (i % 3 === 0) g.push([Math.round(car.x), Math.round(car.y), +car.a.toFixed(2)]);
      if (car.prog >= tr.N * (lapT.length + 1)) { lapT.push(t - lastLap); lastLap = t; if (lapT.length >= tr.laps) break; }
    }
    return { t: lapT.length >= tr.laps ? t : 0, g: g };
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
      root.appendChild(el("div", "pg-me", "Auto viste dall'alto: accelera da sola, tu sterzi e freni. 3 giri a tempo, il fantasma è il tuo record."));
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
      function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#0b3a22"; ctx.fillRect(0, 0, W, H);
        var cx = W / 2, cy = H * 0.62, ox = car.x - cx / Z, oy = car.y - cy / Z;
        function X(x) { return (x - ox) * Z; } function Y(y) { return (y - oy) * Z; }
        ctx.fillStyle = "rgba(255,255,255,.05)"; var gx = 90, sx0 = Math.floor(ox / gx) * gx, sy0 = Math.floor(oy / gx) * gx;
        for (var gxx = sx0; gxx < ox + W / Z + gx; gxx += gx) for (var gyy = sy0; gyy < oy + H / Z + gx; gyy += gx) ctx.fillRect(X(gxx), Y(gyy), 3, 3);
        function path() { ctx.beginPath(); tr.P.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.closePath(); }
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        path(); ctx.lineWidth = (tr.hw * 2 + 22) * Z; ctx.strokeStyle = "#f2f2f8"; ctx.setLineDash([]); ctx.stroke();
        path(); ctx.lineWidth = (tr.hw * 2 + 22) * Z; ctx.strokeStyle = "#e0203f"; ctx.setLineDash([26 * Z, 26 * Z]); ctx.stroke(); ctx.setLineDash([]);
        path(); ctx.lineWidth = tr.hw * 2 * Z; ctx.strokeStyle = "#2a2a36"; ctx.stroke();
        path(); ctx.lineWidth = 3 * Z; ctx.strokeStyle = "rgba(255,226,122,.55)"; ctx.setLineDash([22 * Z, 30 * Z]); ctx.stroke(); ctx.setLineDash([]);
        var p0 = tr.P[0], p1 = tr.P[2], an = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);         // linea di partenza a scacchi
        ctx.save(); ctx.translate(X(p0[0]), Y(p0[1])); ctx.rotate(an); var cs = 12 * Z;
        for (var q = -Math.ceil(tr.hw / 12); q < Math.ceil(tr.hw / 12); q++) for (var w = 0; w < 2; w++) { ctx.fillStyle = (q + w) % 2 ? "#fff" : "#111"; ctx.fillRect(w * cs - cs, q * cs, cs, cs); }
        ctx.restore();
        function carDraw(x, y, a, col, alpha) {
          ctx.save(); ctx.globalAlpha = alpha; ctx.translate(X(x), Y(y)); ctx.rotate(a); ctx.scale(Z, Z);
          ctx.fillStyle = "#111"; [[-9, -9], [-9, 6], [9, -9], [9, 6]].forEach(function (w) { ctx.fillRect(w[0] - 3, w[1], 7, 4); });
          ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(8, -4); ctx.lineTo(-12, -5); ctx.lineTo(-14, 0); ctx.lineTo(-12, 5); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
          ctx.fillStyle = col; ctx.fillRect(14, -9, 4, 18); ctx.fillRect(-16, -8, 4, 16);
          ctx.fillStyle = "#fff"; ctx.fillRect(-2, -1.5, 8, 3); ctx.fillStyle = "#35e6ff"; ctx.fillRect(-8, -1, 5, 2);
          ctx.restore();
        }
        if (state !== "count" && ghost && ghost.length) { var gi = Math.min(ghost.length - 1, Math.floor(t / DT / 3)), g = ghost[gi]; carDraw(g[0], g[1], g[2], "#9fd0ff", 0.45); }
        if (car.off) { ctx.fillStyle = "rgba(120,200,80,.0)"; }
        carDraw(car.x, car.y, car.a, car.hit > 0 ? "#ffffff" : "#ff2fa8", 1);
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
  window.ArcadeRace = { open: open, _t: { TRACKS: TRACKS, build: build, botRun: botRun, step: step, newCar: newCar } };
})();
