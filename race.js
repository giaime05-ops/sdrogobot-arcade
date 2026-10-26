/* Sdrogo Arcade – CORSA ARCADE (prototipo, solo account di prova): vista dall'alto fissa (stile "Pocket Racing"), gara a 4 con bot, 3 giri,
   olio da evitare, boost da prendere, erba che rallenta, muri, frenata necessaria. Si gioca in orizzontale (se il telefono è in verticale la scena si ruota da sola). */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var TRACKS = [
    { id: "neon", name: "Neon Circuit", hw: 120, laps: 3, k: 1.6, pal: { g1: "#3fae3a", g2: "#46b842", sky: "#6ec7f5", tree: ["#58d65e", "#2a9a36", "#7be37f"], road: ["#6d6a7c", "#74718a"] }, pts: [[-100, 0], [100, 0], [300, 0], [500, 0], [700, 0], [900, 0], [1050, 40], [1150, 160], [1170, 330], [1120, 470], [1000, 560], [850, 560], [700, 570], [590, 615], [540, 730], [590, 845], [700, 890], [900, 890], [1100, 890], [1230, 940], [1260, 1070], [1180, 1170], [1000, 1180], [800, 1180], [500, 1180], [200, 1180], [-100, 1170], [-300, 1090], [-380, 900], [-350, 720], [-300, 550], [-345, 370], [-345, 200], [-290, 70], [-200, 10]] },
    { id: "serp", name: "Serpentina", hw: 118, laps: 3, k: 2.0, pal: { g1: "#8fae3a", g2: "#9ab842", sky: "#f4c98a", tree: ["#d99a2b", "#b8651e", "#8fb83a"], road: ["#6b6670", "#757078"] }, pts: [[-100, 0], [100, 0], [300, 0], [500, 0], [700, 0], [900, 20], [1080, 110], [1160, 300], [1060, 440], [1140, 590], [1260, 700], [1180, 870], [1000, 950], [800, 980], [600, 990], [400, 960], [260, 880], [240, 740], [380, 630], [330, 500], [150, 490], [-20, 580], [-130, 740], [-300, 880], [-500, 830], [-580, 640], [-520, 450], [-560, 270], [-500, 120], [-400, 40], [-250, 5]] },
    { id: "tornanti", name: "Tornanti", hw: 116, laps: 3, k: 1.6, pal: { g1: "#d8c27a", g2: "#e0cb86", sky: "#8fd0f0", tree: ["#6f9a4a", "#4f7a34", "#b5a05a"], road: ["#5f5c6c", "#68657a"] }, pts: [[-300, 0], [-100, 0], [100, 0], [300, 0], [500, 0], [700, 0], [850, 0], [980, 50], [1030, 180], [980, 310], [850, 360], [650, 360], [450, 360], [250, 360], [120, 400], [70, 540], [120, 680], [250, 720], [450, 720], [650, 720], [850, 720], [980, 770], [1030, 900], [980, 1030], [850, 1080], [650, 1080], [450, 1080], [250, 1080], [0, 1080], [-300, 1090], [-500, 980], [-550, 700], [-550, 400], [-500, 150], [-420, 40]] },
    { id: "salto", name: "Salto Verde", hw: 120, laps: 3, k: 1.2, jump: 2, pal: { g1: "#2f9a45", g2: "#36a84d", sky: "#5fb8f0", tree: ["#2f9a45", "#1f7a35", "#58d65e"], road: ["#7a6a60", "#847468"] }, pts: [[0, 0], [194, 0], [389, 0], [583, 0], [777, 0], [971, 0], [1166, 0], [1360, 0], [1554, 0], [1748, 0], [1943, 0], [2007, 9], [2068, 33], [2119, 73], [2159, 125], [2184, 185], [2193, 250], [2193, 500], [2193, 750], [2184, 815], [2159, 875], [2119, 927], [2068, 967], [2007, 991], [1943, 1000], [1718, 1000], [1493, 1000], [1268, 1000], [1043, 1000], [964, 1012], [893, 1047], [836, 1102], [798, 1171], [721, 1383], [644, 1594], [606, 1663], [549, 1718], [478, 1753], [400, 1765], [200, 1765], [0, 1765], [-65, 1756], [-125, 1732], [-177, 1692], [-217, 1640], [-241, 1580], [-250, 1515], [-250, 1304], [-250, 1093], [-250, 883], [-250, 672], [-250, 461], [-250, 250], [-241, 185], [-217, 125], [-177, 73], [-125, 33], [-65, 9]] }
  ];
  var VMAX = 520, VOFF = 270, DT = 1 / 60, AG = 340, WALL = 38, KERB = 14;
  var COLS = ["#ff2fa8", "#35e6ff", "#ffd23b", "#a855f7"], NAMES = ["Tu", "Turbo", "Zap", "Rex"];

  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function geom(P) {
    var N = P.length, ta = [], nx = [], ny = [], kap = [], sg = [], sp = 0, k;
    for (k = 0; k < N; k++) { var a = P[(k + 1) % N], b2 = P[(k + N - 1) % N]; ta.push(Math.atan2(a[1] - b2[1], a[0] - b2[0])); nx.push(-Math.sin(ta[k])); ny.push(Math.cos(ta[k])); sp += Math.hypot(a[0] - P[k][0], a[1] - P[k][1]); }
    sp /= N;
    function wr(d) { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
    for (k = 0; k < N; k++) { kap.push(Math.abs(wr(ta[(k + 3) % N] - ta[(k + N - 3) % N])) / (6 * sp)); sg.push(wr(ta[(k + 8) % N] - ta[(k + N - 4) % N])); }
    return { N: N, ta: ta, nx: nx, ny: ny, kap: kap, sg: sg, sp: sp };
  }
  function runs(kap, N, th) {                // tratti dritti (consecutivi con curvatura bassa), in ordine di lunghezza
    var out = [], k0 = -1, i;
    for (i = 0; i < N; i++) if (kap[i] > th) { k0 = i; break; }
    if (k0 < 0) return [{ s: 0, n: N }];
    var cur = null;
    for (i = 1; i <= N; i++) { var j = (k0 + i) % N; if (kap[j] <= th) { if (!cur) cur = { s: j, n: 0 }; cur.n++; } else if (cur) { out.push(cur); cur = null; } }
    if (cur) out.push(cur);
    return out.sort(function (a, b) { return b.n - a.n; });
  }
  function build(tr) {                      // spline chiusa (Catmull-Rom); il traguardo sta a metà del rettilineo più lungo
    if (tr.P) return tr;
    var c = tr.pts.map(function (p) { return [p[0] * tr.k, p[1] * tr.k]; }), n = c.length, P = [], k;
    for (var i = 0; i < n; i++) {
      var p0 = c[(i + n - 1) % n], p1 = c[i], p2 = c[(i + 1) % n], p3 = c[(i + 2) % n];
      for (var s = 0; s < 14; s++) {
        var t = s / 14, t2 = t * t, t3 = t2 * t;
        P.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    var g = geom(P), rs = runs(g.kap, g.N, 0.0004), s0 = rs.length ? (rs[0].s + Math.floor(rs[0].n / 2)) % g.N : 0;
    P = P.slice(s0).concat(P.slice(0, s0)); g = geom(P);
    var N = g.N, ta = g.ta, nx = g.nx, ny = g.ny, kap = g.kap, sp = g.sp;
    tr.P = P; tr.N = N; tr.ta = ta; tr.nx = nx; tr.ny = ny; tr.kap = kap; tr.sp = sp; tr.sg = g.sg;
    var R = rng(tr.id.length * 977 + N), items = [], trees = [], deco = [], lastOil = -99, lastSide = 1, lastIt = -99, wl = tr.hw + WALL; tr.gap = {};
    function straightAt(kk, w, th) { for (var q = -w; q <= w; q++) if (kap[(kk + q + N * 2) % N] > th) return false; return true; }
    var jp = [];
    if (tr.jump) {                                                                       // salti: rampa, fiumiciattolo (vuoto) e atterraggio, su rettilinei lunghi (non quello del via)
      rs.forEach(function (r) { if (jp.length >= tr.jump || r.n < 26) return; var mid = (r.s + Math.floor(r.n / 2)) % N; if (Math.min(mid, N - mid) < N * 0.12) return; jp.push((r.s + Math.floor((r.n - 12) / 2)) % N); });
      jp.forEach(function (kk) { items.push({ t: "jump", idx: kk, lat: 0, x: P[kk][0], y: P[kk][1] }); for (var q = 3; q <= 7; q++) tr.gap[(kk + q) % N] = true; });
    }
    function near(kk, d) { for (var q = 0; q < jp.length; q++) { var dd = (kk - jp[q] + N) % N; if (dd > N / 2) dd -= N; if (dd > -8 && dd < 16) return true; } return false; }
    for (k = 14; k < N - 10; k += 5) {
      var r = R(), off = (R() - 0.5) * tr.hw * 1.2;
      if (!straightAt(k, 3, 0.0006) || near(k) || Math.min(k, N - k) < 22 || k - lastIt < 12) continue;     // non vicino al via, non su salti, solo sui rettilinei
      if (r < 0.45) { if (k - lastOil < 28) continue; lastSide = -lastSide; off = lastSide * (10 + R() * tr.hw * 0.55); lastOil = k; lastIt = k; items.push({ t: "oil", idx: k, lat: off, x: P[k][0] + nx[k] * off, y: P[k][1] + ny[k] * off }); }
      else if (r < 0.8) { lastIt = k; items.push({ t: "boost", idx: k, lat: off, x: P[k][0] + nx[k] * off, y: P[k][1] + ny[k] * off }); }
    }
    function dmin(x, y) { var m = 1e12; for (var q = 0; q < N; q++) { var dx = x - P[q][0], dy = y - P[q][1], d2 = dx * dx + dy * dy; if (d2 < m) m = d2; } return Math.sqrt(m); }
    function dgap(x, y) { var m = 1e12; for (var q in tr.gap) { var dx = x - P[q][0], dy = y - P[q][1], d2 = dx * dx + dy * dy; if (d2 < m) m = d2; } return Math.sqrt(m); }
    var hasGap = jp.length > 0;
    for (k = 0; k < N; k += 2) [1, -1].forEach(function (sg2) {       // scenografia: sempre lontana dalla pista (anche dalle altre parti del circuito)
      function ok(x, y, rad) { return dmin(x, y) > wl + rad + 24 && (!hasGap || dgap(x, y) > wl + 300 + rad); }
      if (R() < 0.6) { var o = (wl + 46 + R() * 220) * sg2, tx = P[k][0] + nx[k] * o, ty = P[k][1] + ny[k] * o, sz = 22 + R() * 14, hh = 18 + R() * 30, cc = Math.floor(R() * 3), sd = R() < 0.12; if (ok(tx, ty, sz)) trees.push({ x: tx, y: ty, h: hh, s: sz, sand: sd, c: cc }); }
      if (R() < 0.5) { var o2 = (wl + 30 + R() * 330) * sg2, rr = R(), fx = P[k][0] + nx[k] * o2, fy = P[k][1] + ny[k] * o2, fc = Math.floor(R() * 4); if (ok(fx, fy, 10)) deco.push({ t: rr < 0.6 ? "flower" : "rock", x: fx, y: fy, c: fc }); }
      if (R() < 0.06) { var o3 = (wl + 260 + R() * 160) * sg2, qx = P[k][0] + nx[k] * o3, qy = P[k][1] + ny[k] * o3, pw = 90 + R() * 90, ph = 60 + R() * 60, pa = R() * 3; if (ok(qx, qy, Math.hypot(pw, ph))) deco.push({ t: "pond", x: qx, y: qy, w: pw, h: ph, a: pa }); }
    });
    tr.deco = deco; tr.items = items; tr.trees = trees;
    return tr;
  }
  function newCar(tr, slot) {
    var a = tr.ta[0], sx = -Math.sin(a), sy = Math.cos(a), row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1;      // griglia 2x2
    var x = tr.P[0][0] - Math.cos(a) * (40 + row * 44) + sx * side * 28, y = tr.P[0][1] - Math.sin(a) * (40 + row * 44) + sy * side * 28;
    return { x: x, y: y, a: a, vx: 0, vy: 0, idx: 0, prog: 0, off: false, hit: 0, slip: 0, spin: 0, boostT: 0, meter: 0, dd: 0, dT: 0, omS: 0, stall: 0, fin: false, finT: 0, slot: slot, col: COLS[slot], name: NAMES[slot], lap: 1 };
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
  function needBrake(tr, car, v, agk) {       // frenata automatica: c'è una curva davanti troppo stretta per questa velocità?
    for (var q = 0; q < 34; q++) { var kk = tr.kap[(car.idx + q) % tr.N]; if (kk < 1e-4) continue; var vs = Math.sqrt(AG * agk / kk), dist = q * tr.sp; if (v * v > vs * vs * 1.1 + 2 * 520 * dist * 0.8) return true; }
    return false;
  }
  function endDrift(car, keep) {              // fine derapata: il boost accumulato parte tutto (più derapi, più dura)
    if (!keep && car.meter >= 0.22) { car.boostT = Math.max(car.boostT, 0.5 + car.meter * 2.4); car.fired = car.meter < 0.5 ? 1 : (car.meter < 0.8 ? 2 : 3); car.meter = 0; }
    else if (keep) car.meter *= 0.35;
    car.dd = 0; car.dT = 0; car.hold = 0; car.dOff = 0; car.opp = 0;
  }
  function step(tr, car, inp) {             // un passo di fisica (60 Hz, deterministico). inp.auto = il giocatore: acceleratore e freno automatici, derapata con ◀ ▶
    if (car.air > 0) { car.air -= DT; car.x += car.vx * DT; car.y += car.vy * DT; nearest(tr, car); car.off = false; car.offT = 0; car.slip = 0; if (car.hit > 0) car.hit -= DT; return; }   // in volo dopo il salto
    var fx = Math.cos(car.a), fy = Math.sin(car.a), sx = -fy, sy = fx;
    var vf = car.vx * fx + car.vy * fy, vl = car.vx * sx + car.vy * sy;
    var d = nearest(tr, car), off = d > tr.hw + KERB; car.off = off; car.offT = off ? (car.offT || 0) + DT : 0;
    if (car.stall > 0) { car.stall -= DT; vf *= 0.9; inp = { l: false, r: false, brake: false, gas: false }; }
    var turn = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), human = !!inp.auto;
    if (human) {                                                                                                         // stato di derapata
      if (car.dd) {
        if (turn === 0) { car.dOff = (car.dOff || 0) + DT; if (car.dOff > 0.1) endDrift(car); } else { car.dOff = 0; if (turn === -car.dd) { car.opp = (car.opp || 0) + DT; if (car.opp > 0.7) endDrift(car); } else car.opp = 0; }
        if (car.dd && (off || car.spin > 0 || vf < 110)) endDrift(car, true);
      } else if (turn && vf > 160 && !off && car.spin <= 0) { car.hold = (car.hold || 0) + DT; if (car.hold > 0.13) { car.dd = turn; car.dT = 0; car.hold = 0; car.dOff = 0; car.opp = 0; car.omS = 0; } }
      else if (!turn) car.hold = 0;
    }
    var brk = inp.brake || (human && !off && needBrake(tr, car, vf, car.dd ? 1.2 : 0.9)); car.brk = brk;
    var vmax = off ? VOFF : (car.boostT > 0 ? 600 : VMAX);
    if (brk) vf -= (human ? 330 : 640) * DT; else if (inp.gas) vf += 430 * Math.max(-0.8, 1 - vf / vmax) * DT; else vf -= 70 * DT;
    if (car.boostT > 0) { if (vf < vmax) vf += 300 * DT; car.boostT -= DT; }
    vf -= vf * (off ? 1.1 : 0.25) * DT; if (vf < 0) vf = 0;
    var om;
    if (car.dd) {                                                                                                        // DERAPATA: la macchina scivola di traverso, tieni premuto per stringere
      car.dT += DT; var omD = 1.8 * (1 - 0.3 * Math.min(1, vf / VMAX)), tg = car.dd * omD * (turn === car.dd ? 1 : (turn === 0 ? 0.65 : 0.3));
      car.omS += (tg - car.omS) * Math.min(1, 9 * DT); om = car.omS;
      car.meter = Math.min(1, car.meter + DT / 3.0 * (0.5 + 0.5 * Math.min(1, vf / 450)));                              // la barra si riempie derapando
    } else {
      om = turn * 2.5 * (1 - 0.55 * Math.min(1, vf / VMAX)) * Math.min(1, vf / 60);
      if (human && vf > 1 && vf * Math.abs(om) > AG * 1.4) om = (om < 0 ? -1 : 1) * AG * 1.4 / vf;                      // anti-testacoda
    }
    car.drift = car.dd ? 1 : 0;
    if (car.spin > 0) { car.spin -= DT; om = 7; vf *= Math.exp(-1.4 * DT); if (car.spin <= 0 && car.oil) { var o = car.oil, k2 = (o.idx + 4) % tr.N; car.x = tr.P[k2][0] + tr.nx[k2] * o.lat; car.y = tr.P[k2][1] + tr.ny[k2] * o.lat; car.a = tr.ta[k2]; car.vx = Math.cos(car.a) * 70; car.vy = Math.sin(car.a) * 70; car.idx = k2; car.oil = null; car.blink = 1; return; } }
    var dem = vf * Math.abs(om), sl = (car.spin > 0 || car.dd) ? 0 : Math.max(0, Math.min(1.2, (dem - AG) / (AG * 0.5)));
    car.slip = sl; if (sl > 0) vf -= 30 * Math.min(1, sl) * DT;
    var wx = fx * vf + sx * vl, wy = fy * vf + sy * vl;
    car.a += om * DT;
    fx = Math.cos(car.a); fy = Math.sin(car.a); sx = -fy; sy = fx;
    vf = wx * fx + wy * fy; vl = wx * sx + wy * sy;
    vl *= Math.exp(-(car.dd ? 2.5 : (brk ? 7 : 12) * (1 - 0.92 * Math.min(1, sl))) * DT);
    car.vx = fx * vf + sx * vl; car.vy = fy * vf + sy * vl;
    car.x += car.vx * DT; car.y += car.vy * DT;
    if (d > tr.hw + WALL) {                                             // muro: si striscia lungo la barriera senza rimbalzare
      var P = tr.P[car.idx], dx = car.x - P[0], dy = car.y - P[1], L = Math.hypot(dx, dy) || 1, r = tr.hw + WALL, nx2 = dx / L, ny2 = dy / L;
      car.x = P[0] + nx2 * r; car.y = P[1] + ny2 * r; var vn = car.vx * nx2 + car.vy * ny2; if (vn > 0) { car.vx -= nx2 * vn; car.vy -= ny2 * vn; } car.vx *= 0.93; car.vy *= 0.93; car.hit = 0.3;
      if (car.dd) endDrift(car, true);
    }
    if (car.hit > 0) car.hit -= DT;
  }
  function items(tr, car) {                  // oggetti in pista: valgono per tutte le auto (anche i bot)
    for (var i = 0; i < tr.items.length; i++) {
      var it = tr.items[i]; if (it.gone && it.gone > 0) { it.gone -= DT; if (it.gone > 0) continue; }
      var di = ((car.idx - it.idx + tr.N * 1.5) % tr.N) - tr.N / 2; if (Math.abs(di) > 3 || car.air > 0) continue;
      var dd = Math.hypot(car.x - it.x, car.y - it.y), sp = Math.hypot(car.vx, car.vy);
      if (it.t === "jump") { if (di >= 1 && di <= 2 && dd < tr.hw + 20) { var v0 = Math.max(sp, 330), ja = tr.ta[it.idx]; car.a = ja; car.vx = Math.cos(ja) * v0; car.vy = Math.sin(ja) * v0; car.dd = 0; car.airT = car.air = Math.max(0.45, Math.min(1.5, ((it.idx + 9 - car.idx) * tr.sp) / v0)); car.off = false; car.jumped = 1; } }
      else if (dd < 30) {
        if (it.t === "oil") { if (car.spin <= 0) { car.spin = 0.85; car.oil = it; car.vx *= 0.5; car.vy *= 0.5; } }
        else { car.boostT = Math.max(car.boostT, 0.9); car.meter = Math.min(1, car.meter + 0.1); it.gone = 5; }
      }
    }
  }
  function crash(cars) {                     // contatti morbidi: le auto si toccano e si spingono, senza frenarsi
    function cc(c) { var co = Math.cos(c.a), si = Math.sin(c.a); return [[c.x + co * 11, c.y + si * 11], [c.x - co * 11, c.y - si * 11]]; }
    for (var i = 0; i < cars.length; i++) for (var j = i + 1; j < cars.length; j++) {
      var a = cars[i], b = cars[j]; if (a.air > 0 || b.air > 0 || Math.abs(a.x - b.x) > 56 || Math.abs(a.y - b.y) > 56) continue;
      var ca = cc(a), cb = cc(b);
      for (var p = 0; p < 2; p++) for (var q = 0; q < 2; q++) {
        var dx = cb[q][0] - ca[p][0], dy = cb[q][1] - ca[p][1], d = Math.hypot(dx, dy), R2 = 22;
        if (d < R2 && d > 0.01) {
          var nx = dx / d, ny = dy / d, o = Math.min(2.5, (R2 - d) / 2);
          a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
          var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) { var j2 = -vn * 0.25; a.vx -= nx * j2; a.vy -= ny * j2; b.vx += nx * j2; b.vy += ny * j2; }
        }
      }
    }
  }
  function pilot(tr, car, off, skill) {      // bot: traiettoria ideale (entra largo, stringe all'interno della curva), schiva l'olio, frena in anticipo
    var v = Math.hypot(car.vx, car.vy), j = (car.idx + 3 + Math.round(v / 80)) % tr.N, ln = Math.max(-0.62, Math.min(0.62, tr.sg[j] * 0.5)) * tr.hw * skill;
    var offt = off + ln;
    if (skill > 0.8) for (var i = 0; i < tr.items.length; i++) { var it = tr.items[i]; if (it.t !== "oil") continue; var di = (it.idx - car.idx + tr.N) % tr.N; if (di > 1 && di < 9 && Math.abs(it.lat - offt) < 40) { offt = it.lat + (it.lat > 0 ? -1 : 1) * 46; break; } }
    var T = tr.P[j], tx = T[0] + tr.nx[j] * offt, ty = T[1] + tr.ny[j] * offt;
    var df = Math.atan2(ty - car.y, tx - car.x) - car.a;
    while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
    var brake = false, ag = AG * skill;
    for (var q = 0; q < 24; q++) { var kk = tr.kap[(car.idx + q) % tr.N]; if (kk < 1e-4) continue; var vs = Math.sqrt(ag * 0.95 / kk), dist = q * tr.sp; if (v * v > vs * vs + 2 * 540 * dist * 0.8) { brake = true; break; } }
    return { l: df < -0.03, r: df > 0.03, brake: brake, gas: !brake };
  }
  function simulate(tr, withMe) {            // utile per i test: tutti pilotati dai bot
    var cars = [0, 1, 2, 3].map(function (s) { return newCar(tr, s); }), t = 0, offs = [0, -22, 22, 0], sk = [1, 0.92, 0.85, 0.78];
    for (var i = 0; i < 60 * 240; i++) {
      cars.forEach(function (c, k) { if (!c.fin) { step(tr, c, pilot(tr, c, offs[k], sk[k])); items(tr, c); if (c.prog >= tr.N * tr.laps) { c.fin = true; c.finT = t; } } });
      crash(cars); t += DT; if (cars.every(function (c) { return c.fin; })) break;
    }
    return cars.map(function (c) { return c.fin ? +c.finT.toFixed(1) : 0; });
  }
  function fmt(t) { if (!t) return "--:--.--"; var m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var ORD = ["1°", "2°", "3°", "4°"];

  var FAKE = ["Marco", "Spoleto", "maicol", "Lorenzo", "albe", "Gabbo"], FM = [1.0, 1.07, 1.15, 1.25, 1.38, 1.55];
  function board(tr) {                                           // classifica "in trasparenza": nel prototipo gli altri sono bot finti
    if (!tr.par) tr.par = Math.min.apply(null, simulate(tr).filter(Boolean)) || 60;
    var mine = lsGet("arc_race4_" + tr.id), L = FAKE.map(function (n, i) { return { n: n, t: tr.par * FM[i] * 1.08, me: false }; });
    if (mine && mine.t) L.push({ n: "Tu", t: mine.t, me: true });
    L.sort(function (a, b) { return a.t - b.t; }); return L;
  }

  var RL = lsGet("arc_race4_laps") || 3;
  function open(host, onExit) {
    var root = el("div", "rc-root"); host.appendChild(root);
    function menu() {
      root.innerHTML = "";
      var top = el("div", "mp-top"), bk = el("button", "mp-back", "‹ Multi"); bk.type = "button"; bk.addEventListener("click", function () { root.remove(); onExit(); });
      top.appendChild(bk); top.appendChild(el("div", "mp-title", "CORSA")); root.appendChild(top);
      root.appendChild(el("div", "pg-me", "Si gioca in ORIZZONTALE: gira il telefono. Acceleratore e freno sono automatici: usi solo ◀ ▶. Tieni premuto per DERAPARE: più derapi, più boost; quando raddrizzi il boost parte da solo."));
      [["single", "👤", "SINGOLO", "Contro il tempo: migliora il tuo record e scala la classifica."], ["race", "🏁", "GARA", "Contro 3 avversari (bot nel prototipo): arriva primo."]].forEach(function (m) {
        var c = el("div", "mp-card rc-track"); c.appendChild(el("div", "mp-ttl", m[1] + " " + m[2])); c.appendChild(el("div", "rc-t", m[3]));
        var go = el("button", "mp-go", "SCEGLI PISTA"); go.type = "button"; go.addEventListener("click", function () { tracks(m[0]); }); c.appendChild(go); root.appendChild(c);
      });
    }
    function tracks(mode) {
      root.innerHTML = "";
      var top = el("div", "mp-top"), bk = el("button", "mp-back", "‹ Corsa"); bk.type = "button"; bk.addEventListener("click", menu);
      top.appendChild(bk); top.appendChild(el("div", "mp-title", mode === "single" ? "SINGOLO" : "GARA")); root.appendChild(top);
      if (mode !== "single") {
        var lr = el("div", "rc-laps"); lr.appendChild(el("span", "", "GIRI"));
        [3, 5, 7, 10].forEach(function (n) { var b = el("button", "mp-gt" + (RL === n ? " on" : ""), String(n)); b.type = "button"; b.addEventListener("click", function () { RL = n; lsSet("arc_race4_laps", n); tracks(mode); }); lr.appendChild(b); });
        root.appendChild(lr);
      }
      TRACKS.forEach(function (tr) {
        build(tr); var best = lsGet("arc_race4_" + tr.id), c = el("div", "mp-card rc-track");
        c.appendChild(el("div", "mp-ttl", "🏁 " + tr.name)); c.appendChild(el("div", "rc-t", mode === "single" ? "Il tuo record: " + fmt(best && best.t) : "Pista con " + (tr.jump ? "salto, " : "") + "curve e olio"));
        if (mode === "single") { var bd = el("div", "rc-lb"); board(tr).slice(0, 3).forEach(function (r, i) { var row = el("div", "rc-lbr" + (r.me ? " me" : "")); row.appendChild(el("span", "", (i + 1) + "  " + r.n)); row.appendChild(el("b", "", fmt(r.t))); bd.appendChild(row); }); c.appendChild(bd); }
        var go = el("button", "mp-go", "▶ " + (mode === "single" ? "GIOCA · 3 giri" : "GARA · " + RL + " giri")); go.type = "button"; go.addEventListener("click", function () { race(tr, mode); }); c.appendChild(go); root.appendChild(c);
      });
    }
    function race(tr, mode) {
      var solo = mode === "single", laps = solo ? 3 : RL, full = el("div", "rc2"), cv = el("canvas", "rc2-cv"), hud = el("div", "rc2-hud"), cd = el("div", "rc2-cd"), tip = el("div", "rc2-tip");
      var left = el("div", "rc2-pad l"), right = el("div", "rc2-pad r"), rev = el("div", "rc2-rev"), rfill = el("i"), bbar = el("div", "rc2-boost"), bfill = el("i"); rev.appendChild(rfill); bbar.appendChild(bfill);
      var xb = el("button", "rc2-x", "⏸"); xb.type = "button"; var sec = el("div", "rc2-sec");
      full.appendChild(cv); full.appendChild(hud); full.appendChild(cd); full.appendChild(tip); full.appendChild(left); full.appendChild(right); full.appendChild(bbar); full.appendChild(xb); full.appendChild(sec); document.body.appendChild(full);
      var TGW = window.Telegram && window.Telegram.WebApp;
      try { if (TGW) { if (TGW.unlockOrientation) TGW.unlockOrientation(); if (TGW.requestFullscreen && !TGW.isFullscreen) TGW.requestFullscreen(); if (TGW.disableVerticalSwipes) TGW.disableVerticalSwipes(); if (TGW.enableClosingConfirmation) TGW.enableClosingConfirmation(); } } catch (e) {}
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(function () {}); } catch (e) {}
      var inp = { l: false, r: false, gas: true, auto: true }, W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), ctx = cv.getContext("2d");
      function mk(parent, label, key, cls) {
        var b = el("button", "rc2-b " + cls, label); b.type = "button";
        function on(e) { e.preventDefault(); inp[key] = true; b.classList.add("on"); } function offf(e) { e.preventDefault(); inp[key] = false; b.classList.remove("on"); }
        b.addEventListener("pointerdown", on); b.addEventListener("pointerup", offf); b.addEventListener("pointercancel", offf); b.addEventListener("pointerleave", offf); b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        parent.appendChild(b);
      }
      mk(left, "◀", "l", "dir"); mk(right, "▶", "r", "dir");
      function kd(e, v) { var k = e.key; if (k === "ArrowLeft" || k === "a") inp.l = v; else if (k === "ArrowRight" || k === "d") inp.r = v; }
      var kdown = function (e) { kd(e, true); }, kup = function (e) { kd(e, false); };
      window.addEventListener("keydown", kdown); window.addEventListener("keyup", kup);
      var insL = 0, insT = 0;
      function layout() {
        var iw = window.innerWidth, ih = window.innerHeight, port = ih > iw;
        full.style.cssText = port ? "width:" + ih + "px;height:" + iw + "px;left:" + iw + "px;top:0;transform:rotate(90deg);transform-origin:0 0" : "width:" + iw + "px;height:" + ih + "px;left:0;top:0";
        var ins = 0; try { if (TGW) { var c1 = TGW.contentSafeAreaInset, s1 = TGW.safeAreaInset; ins = ((c1 && c1.top) || 0) + ((s1 && s1.top) || 0); if (!ins && TGW.isFullscreen) ins = 52; } } catch (e) {}
        insL = port ? ins : 0; insT = port ? 0 : ins; full.style.setProperty("--sl", insL + "px"); full.style.setProperty("--st", insT + "px");
        W = port ? ih : iw; H = port ? iw : ih; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
      }
      layout(); window.addEventListener("resize", layout); try { if (TGW && TGW.onEvent) ["fullscreenChanged", "safeAreaChanged", "contentSafeAreaChanged"].forEach(function (ev) { TGW.onEvent(ev, layout); }); } catch (e) {}
      var cars = (solo ? [0] : [0, 1, 2, 3]).map(function (s) { return newCar(tr, solo ? 1 : s); }), me = cars[0], offs = [0, -26, 26, 0], sk = [1, 0.9, 0.82, 0.74];
      if (solo) { me.slot = 0; me.col = COLS[0]; }
      var best = (lsGet("arc_race4_" + tr.id) || {}).t || 0, state = "count", cT = 0, t = 0, acc = 0, last = performance.now(), raf = 0, done = false, camA = me.a, camx = me.x, camy = me.y, revv = 0, botDelay = [0, 0.12, 0.2, 0.3], lapT = [], lapStart = 0, msgT = 0;
      var gh = solo ? (lsGet("arc_race4g_" + tr.id) || {}).g : null, ghost = gh && gh.length > 6 ? { x: 0, y: 0, a: 0, col: "#cfe6ff", name: "Fantasma", ghost: true, hit: 0 } : null, grec = [], gtick = 0;
      var sbest = (solo && lsGet("arc_race4s_" + tr.id)) || [0, 0, 0], secNo = 0, secStart = 0, secPrev = [], secLast = [], secCols = [];
      function ghostAt(tt) {
        var f = tt * 20, i = Math.min(Math.floor(f), gh.length / 3 - 2), u = Math.max(0, Math.min(1, f - i)); if (i < 0) i = 0;
        var a0 = gh[i * 3 + 2] / 100, a1 = gh[i * 3 + 5] / 100, da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        ghost.x = gh[i * 3] + (gh[i * 3 + 3] - gh[i * 3]) * u; ghost.y = gh[i * 3 + 1] + (gh[i * 3 + 4] - gh[i * 3 + 1]) * u; ghost.a = a0 + da * u;
      }
      function secDone(sIdx, tm) {
        var ref = secPrev[sIdx] || sbest[sIdx], col = "y";
        if (sbest[sIdx] && tm < sbest[sIdx] - 0.005) col = "f"; else if (!ref || tm < ref - 0.005) col = "g";
        if (!sbest[sIdx] || tm < sbest[sIdx]) { sbest[sIdx] = tm; lsSet("arc_race4s_" + tr.id, sbest); }
        secPrev[sIdx] = tm; secLast[sIdx] = ref ? tm - ref : 0; secCols[sIdx] = col;
      }
      var GO = 3.4, trail = [], curSeg = null;
      if (window.__RACE_DEBUG) window.__RACE_DEBUG({ me: me, tr: tr, cars: cars, inp: inp });
      function rank() { return cars.slice().sort(function (a, b) { return (b.fin ? 1e6 - b.finT : b.prog) - (a.fin ? 1e6 - a.finT : a.prog); }); }
      function stop() { done = true; cancelAnimationFrame(raf); window.removeEventListener("keydown", kdown); window.removeEventListener("keyup", kup); window.removeEventListener("resize", layout); try { if (TGW && TGW.offEvent) ["fullscreenChanged", "safeAreaChanged", "contentSafeAreaChanged"].forEach(function (ev) { TGW.offEvent(ev, layout); }); } catch (e) {} try { if (TGW) { if (TGW.disableClosingConfirmation) TGW.disableClosingConfirmation(); if (TGW.exitFullscreen && TGW.isFullscreen) TGW.exitFullscreen(); } if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
        window.ArcadeBackHook = null; try { if (window.ArcadeBackSync) window.ArcadeBackSync(); } catch (e) {} full.remove(); }
      var paused = false, pbox = null;
      function pause(on) {
        if (state === "end") return; paused = on; if (pbox) { pbox.remove(); pbox = null; } if (!on) { last = performance.now(); return; }
        pbox = el("div", "rc2-end"); pbox.appendChild(el("b", "", "IN PAUSA"));
        var rw = el("div", "mp-end"), a = el("button", "mp-go", "RIPRENDI"), b = el("button", "mp-go mp-alt", "ESCI"); a.type = b.type = "button";
        a.addEventListener("click", function () { pause(false); }); b.addEventListener("click", function () { stop(); tracks(mode); }); rw.appendChild(a); rw.appendChild(b); pbox.appendChild(rw); full.appendChild(pbox);
      }
      xb.addEventListener("click", function () { pause(!paused); });
      window.ArcadeBackHook = function () { pause(!paused); return true; }; try { if (TGW && TGW.BackButton) TGW.BackButton.show(); } catch (e) {}
      function say2(x, sec) { tip.textContent = x; msgT = sec || 1.6; }
      function finish() {
        state = "end"; var total = me.finT, rec = solo && (!best || total < best), box = el("div", "rc2-end res");
        if (rec) { lsSet("arc_race4_" + tr.id, { t: total }); lsSet("arc_race4g_" + tr.id, { g: grec }); } A.haptic("ok");
        if (!solo) {                                                                                               // gli altri finiscono la gara (veloce, senza disegnare) così hai la classifica completa coi giri
          var t2 = t, g = 0;
          while (g++ < 60 * 300 && cars.some(function (c) { return !c.fin; })) {
            cars.forEach(function (c, k) {
              if (c.fin || k === 0) return; if (t2 >= botDelay[k]) { step(tr, c, pilot(tr, c, offs[k], sk[k])); items(tr, c); }
              if (c.prog >= tr.N * c.lap) { (c.lapTs = c.lapTs || []).push(t2 - (c.lapS || 0)); c.lapS = t2; c.lap++; }
              if (c.prog >= tr.N * laps) { c.fin = true; c.finT = t2; }
            });
            crash(cars); t2 += DT;
          }
        }
        var rows = solo ? [me] : rank(), fl = 1e9; rows.forEach(function (c) { (c.lapTs || []).forEach(function (x) { if (x < fl) fl = x; }); });
        if (solo) { var L = board(tr), pos = L.findIndex(function (r) { return r.me; }) + 1; box.appendChild(el("b", "", rec ? "🏆 NUOVO RECORD!" : "ARRIVO!")); box.appendChild(el("div", "rc-big", fmt(total))); box.appendChild(el("div", "rc-lap me", "In classifica sei " + pos + "° su " + L.length)); }
        else { var p0 = rank().indexOf(me); box.appendChild(el("b", "", p0 === 0 ? "🏆 HAI VINTO!" : ORD[p0] + " POSTO")); }
        var tb = el("div", "rc2-tbl"), showLaps = laps <= 4;
        rows.forEach(function (c, i) {
          var r = el("div", "rr" + (c === me ? " me" : "")), pn = el("span", "pn", String(i + 1)), nm = el("span", "nm", c === me ? "Tu" : c.name), tt = el("span", "tt", fmt(c.finT)); r.appendChild(pn); r.appendChild(nm); r.appendChild(tt);
          var lp = el("span", "lp"), bst = Math.min.apply(null, c.lapTs && c.lapTs.length ? c.lapTs : [0]);
          (c.lapTs || []).forEach(function (x) { if (showLaps || x === bst) lp.appendChild(el("i", x <= fl + 0.0005 ? "fl" : "", (showLaps ? "" : "Migliore ") + fmt(x))); }); r.appendChild(lp); tb.appendChild(r);
        });
        box.appendChild(tb); box.appendChild(el("div", "rc-lap", "⚡ = giro più veloce" + (fl < 1e9 ? " (" + fmt(fl) + ")" : "")));
        var rw = el("div", "mp-end"), a = el("button", "mp-go", "RIGIOCA"), b = el("button", "mp-go mp-alt", "PISTE"); a.type = b.type = "button";
        a.addEventListener("click", function () { stop(); race(tr, mode); }); b.addEventListener("click", function () { stop(); tracks(mode); }); rw.appendChild(a); rw.appendChild(b); box.appendChild(rw); full.appendChild(box);
      }
      // ---------- proiezione: camera alta dietro l'auto, inclinata verso il basso ----------
      var TH = 42 * Math.PI / 180, CT = Math.cos(TH), ST = Math.sin(TH), DB = 205, HC = 250, FOC = 1.08;
      var cax = 0, cay = 0, ca = 0, sa = 0, FF = 0, ZO = 0;
      function pr(wx, wy, wz) {
        var dx = wx - cax, dy = wy - cay, f = dx * ca + dy * sa, l = -dx * sa + dy * ca, hz = HC - wz, d = f * CT + hz * ST; if (d < 14) return null;
        var u = f * ST - hz * CT; return [W / 2 + l / d * FF, H / 2 - u / d * FF + H * 0.06, d];
      }
      function quad(a, b, c, d, col) { if (!a || !b || !c || !d) return; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); }
      function box(x, y, hl, hw2, z0, h, ang, cTop, cA, cB) {                                                  // parallelepipedo orientato; hl = mezza lunghezza, hw2 = mezza larghezza
        var co = Math.cos(ang), si = Math.sin(ang), cs = [[hl, hw2], [hl, -hw2], [-hl, -hw2], [-hl, hw2]].map(function (p) { return [x + p[0] * co - p[1] * si, y + p[0] * si + p[1] * co]; });
        var lo = cs.map(function (p) { return pr(p[0], p[1], z0 + ZO); }), hi = cs.map(function (p) { return pr(p[0], p[1], z0 + h + ZO); }); if (lo.some(function (q) { return !q; }) || hi.some(function (q) { return !q; })) return;
        var faces = []; for (var i = 0; i < 4; i++) faces.push({ i: i, d: (lo[i][2] + lo[(i + 1) % 4][2]) / 2 }); faces.sort(function (p, q) { return q.d - p.d; });
        faces.forEach(function (fc, k) { var i = fc.i, j = (i + 1) % 4; quad(lo[i], lo[j], hi[j], hi[i], (i % 2) ? cB : cA); });
        quad(hi[0], hi[1], hi[2], hi[3], cTop);
      }
      var SC = 1.3;
      function carBox(c) {                                                                                       // auto più grossa e dettagliata; parti ordinate per profondità
        var a = c.a, blink = c.blink > 0 && Math.floor(c.blink * 14) % 2; if (blink) return;
        if (c.ghost) ctx.globalAlpha = 0.42;
        ZO = 0; if (c.air > 0) { ZO = 52 * Math.sin(Math.PI * (1 - c.air / c.airT)); var sp0 = pr(c.x, c.y, 0.6), sp1 = sp0 && pr(c.x + Math.cos(c.a) * 17, c.y + Math.sin(c.a) * 17, 0.6); if (sp0 && sp1) { ctx.fillStyle = "rgba(0,0,0,.32)"; ctx.beginPath(); ctx.ellipse(sp0[0], sp0[1], Math.abs(sp1[0] - sp0[0]) * 1.4 + 12, 7, 0, 0, 7); ctx.fill(); } }
        var bl = c.hit > 0 ? shade(c.col, 0.35) : c.col, dk = shade(bl, -0.38), co = Math.cos(a), si = Math.sin(a), parts = [];
        function at(fx, ly) { return [c.x + fx * SC * co - ly * SC * si, c.y + fx * SC * si + ly * SC * co]; }
        function add(fx, ly, f) { var p = at(fx, ly); parts.push({ p: p, f: function () { f(p); } }); }
        [[-9.5, -10.5], [-9.5, 10.5], [10, -10], [10, 10]].forEach(function (w) { add(w[0], w[1], function (p) { box(p[0], p[1], 5 * SC, 2.8 * SC, 0, 7 * SC, a, "#2b2b30", "#15151a", "#0b0b0e"); }); });
        add(0, 0, function (p) { box(p[0], p[1], 14 * SC, 6.6 * SC, 2 * SC, 6.5 * SC, a, bl, shade(bl, -0.16), shade(bl, -0.3)); });
        add(0, 0, function (p) { box(p[0], p[1], 10 * SC, 1.2 * SC, 8.4 * SC, 0.6 * SC, a, "#f2f2f4", "#ddd", "#ccc"); });               // striscia centrale
        add(15, 0, function (p) { box(p[0], p[1], 4 * SC, 4.6 * SC, 2.4 * SC, 4 * SC, a, shade(bl, 0.12), shade(bl, -0.16), shade(bl, -0.3)); });
        add(19, 0, function (p) { box(p[0], p[1], 1.4 * SC, 9 * SC, 1.2 * SC, 1.8 * SC, a, dk, shade(dk, -0.2), shade(dk, -0.3)); });      // musetto
        add(-2.5, 0, function (p) { box(p[0], p[1], 4.4 * SC, 4 * SC, 8.5 * SC, 4.2 * SC, a, "#cfe1f2", "#8fa3b8", "#74889d"); });        // abitacolo
        add(-2.5, 0, function (p) { box(p[0], p[1], 2 * SC, 2.2 * SC, 12.7 * SC, 2.6 * SC, a, c.ghost ? "#ddd" : "#ffcf5a", "#d9a21b", "#b8860b"); }); // casco
        add(-14.5, 0, function (p) { box(p[0], p[1], 1.6 * SC, 9.5 * SC, 8 * SC, 2 * SC, a, dk, shade(dk, -0.2), shade(dk, -0.3)); });
        add(-14.5, -7.2, function (p) { box(p[0], p[1], 1.6 * SC, 0.6 * SC, 3 * SC, 5 * SC, a, dk, shade(dk, -0.2), shade(dk, -0.3)); });
        add(-14.5, 7.2, function (p) { box(p[0], p[1], 1.6 * SC, 0.6 * SC, 3 * SC, 5 * SC, a, dk, shade(dk, -0.2), shade(dk, -0.3)); });
        parts.sort(function (u, v) { return ((v.p[0] - cax) * ca + (v.p[1] - cay) * sa) - ((u.p[0] - cax) * ca + (u.p[1] - cay) * sa); });
        parts.forEach(function (q) { q.f(); });
        if (c === me && state === "run") {                                                                      // effetti: scintille delle ruote per livello di boost, fiamma dello scarico
          var lv = c.dd ? (c.meter < 0.22 ? 0 : (c.meter < 0.5 ? 1 : (c.meter < 0.8 ? 2 : 3))) : 0, LC = ["#cfd8e6", "#4fc3ff", "#ff9f1c", "#d94bff"], rw = [at(-9.5, -10.5), at(-9.5, 10.5)];
          if (c.dd) rw.forEach(function (w) { var q = pr(w[0], w[1], 3 + ZO); if (!q) return; var sz = 5 + lv * 3.2; ctx.fillStyle = LC[lv]; for (var z = 0; z < 4 + lv * 2; z++) { ctx.globalAlpha = 0.35 + Math.random() * 0.5; ctx.beginPath(); ctx.arc(q[0] + (Math.random() - 0.5) * sz * 2.2, q[1] + (Math.random() - 0.5) * sz * 1.2, 1.5 + Math.random() * sz * 0.5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; });
          if (c.boostT > 0) { var ex = at(-17, 0), q0 = pr(ex[0], ex[1], 5 + ZO), q1 = pr(ex[0] - co * (26 + Math.random() * 16) * SC, ex[1] - si * (26 + Math.random() * 16) * SC, 5 + ZO); if (q0 && q1) { ctx.strokeStyle = "#ff9a2e"; ctx.lineWidth = Math.max(4, 9 * FF / q0[2] * 0.8); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); ctx.strokeStyle = "#fff3a0"; ctx.lineWidth = Math.max(2, 4 * FF / q0[2] * 0.8); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo((q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2); ctx.stroke(); ctx.lineCap = "butt"; } }
        }
        ZO = 0; ctx.globalAlpha = 1;
      }
      function shade(hex, k) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, Math.round(r * (1 + k)))); g = Math.max(0, Math.min(255, Math.round(g * (1 + k)))); b = Math.max(0, Math.min(255, Math.round(b * (1 + k)))); return "rgb(" + r + "," + g + "," + b + ")"; }
      function draw() {
        var va = Math.atan2(me.vy, me.vx), tgtA = Math.hypot(me.vx, me.vy) > 50 ? Math.atan2(Math.sin(me.a) + Math.sin(va), Math.cos(me.a) + Math.cos(va)) : me.a, da = tgtA - camA; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; camA += da * 0.09;
        ca = Math.cos(camA); sa = Math.sin(camA); camx += (me.x - camx) * 0.25; camy += (me.y - camy) * 0.25; var spd = Math.min(1, Math.hypot(me.vx, me.vy) / 600); cax = camx - ca * (DB + 40 * spd); cay = camy - sa * (DB + 40 * spd); FF = H * (FOC - 0.06 * spd + (me.boostT > 0 ? 0.05 : 0));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = tr.pal.sky; ctx.fillRect(0, 0, W, H); ctx.fillStyle = tr.pal.g1; ctx.fillRect(0, H * 0.02, W, H);
        var N = tr.N, base = me.idx - 8, FAR = 72, hw = tr.hw, wl = hw + WALL, ph = {};
        var pt = function (i, o, z) { return pr(tr.P[i][0] + tr.nx[i] * o, tr.P[i][1] + tr.ny[i] * o, z || 0); };
        for (var j = FAR; j >= 0; j--) {
          var i = ((base + j) % N + N) % N, i2 = (i + 1) % N, alt = (i % 2 === 0), alt4 = (i % 4 < 2);
          if (tr.gap[i]) {                                                                                                                  // fiumiciattolo: sotto la rampa c'è il vuoto
            quad(pt(i, -(wl + 280)), pt(i, wl + 280), pt(i2, wl + 280), pt(i2, -(wl + 280)), alt ? "#2f96d8" : "#3aa6e8"); quad(pt(i, -wl, 0.2), pt(i, wl, 0.2), pt(i2, wl, 0.2), pt(i2, -wl, 0.2), alt ? "#1f7fc0" : "#2a8cd0");
            quad(pt(i, -(wl + 280), 0.1), pt(i, -wl, 0.1), pt(i2, -wl, 0.1), pt(i2, -(wl + 280), 0.1), "rgba(255,255,255,.18)"); continue;
          }
          [1, -1].forEach(function (sg) {
            quad(pt(i, (hw + KERB) * sg), pt(i, wl * sg), pt(i2, wl * sg), pt(i2, (hw + KERB) * sg), alt4 ? tr.pal.g1 : tr.pal.g2);
            quad(pt(i, hw * sg), pt(i, (hw + KERB) * sg), pt(i2, (hw + KERB) * sg), pt(i2, hw * sg), alt ? "#e0203f" : "#f4f4f6");
          });
          quad(pt(i, -hw), pt(i, hw), pt(i2, hw), pt(i2, -hw), alt4 ? tr.pal.road[0] : tr.pal.road[1]);
          if (i % 3 === 0) quad(pt(i, -2), pt(i, 2), pt(i2, 2), pt(i2, -2), "rgba(255,255,255,.4)");
          if (i === 0) { var cn = 10; for (var cc = 0; cc < cn; cc++) { var oa = -hw + cc * (hw * 2 / cn), ob = oa + hw * 2 / cn; quad(pt(i, oa), pt(i, ob), pt(i2, ob), pt(i2, oa), cc % 2 ? "#fff" : "#111"); quad(pt(i2, oa), pt(i2, ob), pt(((i2 + 1) % N), ob), pt(((i2 + 1) % N), oa), cc % 2 ? "#111" : "#fff"); } }
          [1, -1].forEach(function (sg) {                                                                                                   // barriera: blocco scuro con bordo azzurro
            var o = wl * sg; quad(pt(i, o, 0), pt(i2, o, 0), pt(i2, o, 15), pt(i, o, 15), "#2b2f3c"); quad(pt(i, o, 15), pt(i2, o, 15), pt(i2, o + 7 * sg, 15), pt(i, o + 7 * sg, 15), alt ? "#8fa0c8" : "#c6d2f0");
          });
        }
        tr.items.forEach(function (it) {                                                                                                     // decalcomanie piatte: olio e pedane boost
          if (it.gone > 0) return; var p0 = pr(it.x, it.y, 0.5); if (!p0 || p0[2] > 1200) return;
          if (it.t === "oil") {
            [["#0e0d14", 1, 0], ["#2a2840", 0.62, -0.1], ["rgba(120,110,200,.35)", 0.28, -0.3]].forEach(function (L) {
              ctx.fillStyle = L[0]; ctx.beginPath(); var ok = true;
              for (var q = 0; q < 16; q++) { var an = q / 16 * 6.2832, rr = (26 + 4 * Math.sin(q * 1.3 + it.idx) ) * L[1], pp = pr(it.x + Math.cos(an) * rr + L[2] * 20, it.y + Math.sin(an) * rr * 0.85 + L[2] * 10, 0.5 + (L[1] < 1 ? 0.2 : 0)); if (!pp) { ok = false; break; } if (q) ctx.lineTo(pp[0], pp[1]); else ctx.moveTo(pp[0], pp[1]); }
              if (ok) { ctx.closePath(); ctx.fill(); }
            });
          }
          else if (it.t === "jump") {
            for (var rq = 0; rq < 3; rq++) { var iq = (it.idx + rq) % tr.N, iq2 = (iq + 1) % tr.N, z0 = 2 + rq * 6, z1 = z0 + 6, nb = 6;
              for (var cb = 0; cb < nb; cb++) { var l0 = -tr.hw + cb * (2 * tr.hw / nb), l1 = l0 + 2 * tr.hw / nb, cl = (rq + cb) % 2 ? "#ff5aa8" : "#fff"; quad(pt(iq, l0, z0), pt(iq, l1, z0), pt(iq2, l1, z1), pt(iq2, l0, z1), cl); }
              [1, -1].forEach(function (sg) { quad(pt(iq, tr.hw * sg, 0), pt(iq2, tr.hw * sg, 0), pt(iq2, tr.hw * sg, z1), pt(iq, tr.hw * sg, z0), "#8a1f55"); }); }
            var iq3 = (it.idx + 3) % tr.N; for (var cb2 = 0; cb2 < 6; cb2++) { var m0 = -tr.hw + cb2 * (2 * tr.hw / 6), m1 = m0 + 2 * tr.hw / 6; quad(pt((it.idx + 8) % tr.N, m0, 0.8), pt((it.idx + 8) % tr.N, m1, 0.8), pt((it.idx + 9) % tr.N, m1, 0.8), pt((it.idx + 9) % tr.N, m0, 0.8), cb2 % 2 ? "#ff5aa8" : "#fff"); }
          }
          else { var ang = tr.ta[it.idx], c2 = Math.cos(ang), s2 = Math.sin(ang); function pq(a, b) { return pr(it.x + a * c2 - b * s2, it.y + a * s2 + b * c2, 0.6); } quad(pq(-18, -18), pq(18, -18), pq(18, 18), pq(-18, 18), "#ffd23b"); quad(pq(-10, -9), pq(6, -9), pq(12, 0), pq(-4, 0), "#b8860b"); quad(pq(-10, 9), pq(6, 9), pq(12, 0), pq(-4, 0), "#b8860b"); }
        });
        trail.forEach(function (sgm, si2) { if (sgm.length < 2) return; ctx.lineCap = "round"; for (var side = 0; side < 2; side++) { ctx.strokeStyle = "rgba(25,22,35," + (0.18 + 0.4 * (si2 + 1) / trail.length) + ")"; ctx.lineWidth = 4; ctx.beginPath(); var st0 = false; for (var q = 0; q < sgm.length; q++) { var pp2 = pr(sgm[q][side * 2], sgm[q][side * 2 + 1], 0.4); if (!pp2) { st0 = false; continue; } ctx.lineWidth = Math.max(2, 7 * FF / pp2[2]); if (!st0) { ctx.moveTo(pp2[0], pp2[1]); st0 = true; } else ctx.lineTo(pp2[0], pp2[1]); } ctx.stroke(); } ctx.lineCap = "butt"; });
        tr.deco.forEach(function (dc) { if (dc.t !== "pond") return; var dx = dc.x - me.x, dy = dc.y - me.y; if (dx * dx + dy * dy > 1500 * 1500) return; var cp = Math.cos(dc.a), sp2 = Math.sin(dc.a);
          function pw(a, b) { return pr(dc.x + a * cp - b * sp2, dc.y + a * sp2 + b * cp, 0.3); }
          quad(pw(-dc.w, -dc.h), pw(dc.w, -dc.h), pw(dc.w, dc.h), pw(-dc.w, dc.h), "#3aa6e8"); quad(pw(-dc.w * 0.7, -dc.h * 0.5), pw(dc.w * 0.2, -dc.h * 0.5), pw(dc.w * 0.2, -dc.h * 0.2), pw(-dc.w * 0.7, -dc.h * 0.2), "rgba(255,255,255,.35)"); });
        var objs = []; tr.deco.forEach(function (dc) { if (dc.t === "pond") return; var dx = dc.x - me.x, dy = dc.y - me.y; if (dx * dx + dy * dy < 700 * 700) objs.push({ d: (dc.x - cax) * ca + (dc.y - cay) * sa, dc: dc }); });
        tr.trees.forEach(function (tt) { if (!tt.sand) { var dx = tt.x - me.x, dy = tt.y - me.y; if (dx * dx + dy * dy < 900 * 900) objs.push({ d: (tt.x - cax) * ca + (tt.y - cay) * sa, t: tt }); } });
        cars.forEach(function (c) { objs.push({ d: (c.x - cax) * ca + (c.y - cay) * sa, c: c }); }); if (ghost && state === "run") objs.push({ d: (ghost.x - cax) * ca + (ghost.y - cay) * sa, c: ghost });
        objs.sort(function (a, b) { return b.d - a.d; });
        var FLC = ["#ff6fb0", "#ffd23b", "#fff", "#ff8a3b"];
        objs.forEach(function (o) {
          if (o.c) carBox(o.c);
          else if (o.dc) { var dc = o.dc; if (dc.t === "flower") { box(dc.x, dc.y, 2, 2, 0, 5, camA, FLC[dc.c], shade(FLC[dc.c], -0.2), shade(FLC[dc.c], -0.35)); box(dc.x, dc.y, 1, 1, 0, 2, camA, "#2a8a30", "#1f6a28", "#1f6a28"); } else box(dc.x, dc.y, 7, 6, 0, 7, camA, "#b8bcc8", "#8a8e9c", "#6f7382"); }
          else { var tt = o.t, tc = tr.pal.tree[tt.c % 3]; box(tt.x, tt.y, tt.s / 5, tt.s / 5, 0, tt.h * 0.45, camA, "#8a5a2b", "#6a421c", "#573612"); box(tt.x, tt.y, tt.s / 2, tt.s / 2, tt.h * 0.3, tt.h * 0.85, camA, tc, shade(tc, -0.35), shade(tc, -0.2)); }
        });
        (ghost && state === "run" ? cars.concat([ghost]) : cars).forEach(function (c) {                                                                  // etichette: nome sopra le auto lontane / freccia ai bordi se fuori vista
          if (c === me) return; var p = pr(c.x, c.y, 16), dist = Math.hypot(c.x - me.x, c.y - me.y), out = !p || p[0] < 24 || p[0] > W - 24 || p[1] < 24 || p[1] > H - 70, x, y;
          if (p) { x = Math.max(34, Math.min(W - 34, p[0])); y = Math.max(40, Math.min(H - 80, p[1] - 26)); } else { x = W / 2; y = H - 84; }
          ctx.font = "700 13px Rajdhani,sans-serif"; var txt = (c.ghost ? "👻 " : "") + c.name + (dist > 260 ? "  " + Math.round(dist / 10) + "m" : ""), tw = ctx.measureText(txt).width + 14;
          ctx.fillStyle = "rgba(8,4,20,.62)"; ctx.fillRect(x - tw / 2, y - 10, tw, 20); ctx.fillStyle = c.col; ctx.fillRect(x - tw / 2, y - 10, 4, 20);
          ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText((out ? (p ? "" : "▼ ") : "") + txt, x + 2, y); ctx.textAlign = "left";
        });
        // minimappa
        var MW = 120, MH = 84, mx0 = W - MW - 10, my0 = 10 + insT, bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
        tr.P.forEach(function (p) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]); });
        var ms = Math.min((MW - 14) / (bx1 - bx0), (MH - 14) / (by1 - by0)); ctx.fillStyle = "rgba(8,4,20,.5)"; ctx.fillRect(mx0, my0, MW, MH);
        ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 3; ctx.beginPath(); tr.P.forEach(function (p, k) { var mxx = mx0 + 7 + (p[0] - bx0) * ms, myy = my0 + 7 + (p[1] - by0) * ms; if (k) ctx.lineTo(mxx, myy); else ctx.moveTo(mxx, myy); }); ctx.closePath(); ctx.stroke();
        var fx0 = mx0 + 7 + (tr.P[0][0] - bx0) * ms, fy0 = my0 + 7 + (tr.P[0][1] - by0) * ms; ctx.fillStyle = "#fff"; ctx.fillRect(fx0 - 4, fy0 - 4, 8, 8); ctx.fillStyle = "#111"; ctx.fillRect(fx0 - 4, fy0 - 4, 4, 4); ctx.fillRect(fx0, fy0, 4, 4); ctx.strokeStyle = "#ffd23b"; ctx.lineWidth = 1.5; ctx.strokeRect(fx0 - 4, fy0 - 4, 8, 8);
        cars.slice().reverse().forEach(function (c) { ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(mx0 + 7 + (c.x - bx0) * ms, my0 + 7 + (c.y - by0) * ms, c === me ? 4 : 3, 0, 7); ctx.fill(); });
      }
      function hudDraw() {
        var pos = rank().indexOf(me), v = Math.round(Math.hypot(me.vx, me.vy) * 0.5), curLap = Math.min(me.lap, laps);
        hud.innerHTML = (solo ? "" : "<b class='p'>" + ORD[pos] + "</b>") + "<span>GIRO " + curLap + "/" + laps + "</span><span>" + fmt(t) + "</span><span>" + v + " km/h</span>" + (solo && best ? "<i>REC " + fmt(best) + "</i>" : "");
        bfill.style.width = Math.round(me.meter * 100) + "%"; var lvB = me.meter < 0.22 ? 0 : (me.meter < 0.5 ? 1 : (me.meter < 0.8 ? 2 : 3)); bbar.className = "rc2-boost lv" + lvB + (me.boostT > 0 ? " hot" : "") + (me.dd ? " drift" : "");
        if (solo && state !== "count") { var cur = Math.min(2, secNo % 3), done3 = secNo >= 3 * laps; while (sec.children.length < 3) sec.appendChild(el("span", "sc"));
          for (var q = 0; q < 3; q++) { var ch = sec.children[q], isDone = done3 || q < cur, isCur = !done3 && q === cur, tmv = isCur ? t - secStart : secPrev[q]; ch.className = "sc" + (isCur ? " cur" : (isDone && secCols[q] ? " " + secCols[q] : (secCols[q] ? " dim " + secCols[q] : ""))); ch.textContent = "S" + (q + 1) + (tmv ? " " + tmv.toFixed(2) : ""); } }
        if (msgT > 0) { msgT -= 1 / 60; if (msgT <= 0) tip.textContent = ""; }
      }
      function respawn() {
        var k = me.idx, a = tr.ta[k]; me.x = tr.P[k][0]; me.y = tr.P[k][1]; me.a = a; me.vx = Math.cos(a) * 60; me.vy = Math.sin(a) * 60; me.offT = 0; me.spin = 0; me.blink = 1; say2("Rimesso in pista", 1.4);
      }
      function frame(now) {
        if (done || !full.isConnected) { stop(); return; }
        if (paused) { last = now; draw(); raf = requestAnimationFrame(frame); return; }
        acc += Math.min(0.1, (now - last) / 1000); last = now;
        while (acc >= DT) {
          acc -= DT;
          if (state === "count") {
            cT += DT; var nl = cT < 0.8 ? 0 : Math.min(3, Math.floor((cT - 0.8) / 0.8) + 1);
            cd.textContent = cT >= GO ? "🟢" : (nl ? "🔴".repeat(nl) : ""); if (cT < GO) { tip.textContent = window.innerHeight > window.innerWidth ? "↻ Gira il telefono (rotazione automatica attiva, o tocca l'icona di rotazione in basso)" : "Tieni premuto ◀ ▶ per DERAPARE · raddrizza per far partire il boost"; msgT = 9; }
            if (cT >= GO) { state = "run"; t = 0; setTimeout(function () { cd.textContent = ""; }, 700); say2("VIA!", 0.9); }
            continue;
          }
          if (state !== "run") continue;
          cars.forEach(function (c, k) {
            if (c.fin) { c.vx *= 0.99; c.vy *= 0.99; return; }
            if (k === 0) { step(tr, c, inp); items(tr, c); if (c.fired) { say2(["", "🔥 BOOST!", "🔥🔥 SUPER BOOST!", "🔥🔥🔥 MEGA BOOST!"][c.fired], 1.3); c.fired = 0; A.haptic("medium"); } } else if (t >= botDelay[k]) { step(tr, c, pilot(tr, c, offs[k], sk[k])); items(tr, c); }
            if (c.blink > 0) c.blink -= DT;
            if (c.prog >= tr.N * c.lap && !c.fin) { if (k === 0) { lapT.push(t - lapStart); lapStart = t; A.haptic("light"); } (c.lapTs = c.lapTs || []).push(t - (c.lapS || 0)); c.lapS = t; c.lap++; }
            if (c.prog >= tr.N * laps) { c.fin = true; c.finT = t; }
          });
          if (me.dd) { var co2 = Math.cos(me.a), si2 = Math.sin(me.a); if (!curSeg) { curSeg = []; trail.push(curSeg); if (trail.length > 5) trail.shift(); } curSeg.push([me.x - co2 * 12 + si2 * 13, me.y - si2 * 12 - co2 * 13, me.x - co2 * 12 - si2 * 13, me.y - si2 * 12 + co2 * 13]); if (curSeg.length > 240) curSeg.shift(); } else curSeg = null;
          if (solo) {
            if ((gtick++ % 3) === 0) grec.push(Math.round(me.x), Math.round(me.y), Math.round(me.a * 100)); if (ghost) ghostAt(t);
            var sn = Math.min(3 * laps, Math.floor(Math.max(0, me.prog) / (tr.N / 3)));
            if (sn > secNo) { secDone((sn - 1) % 3, t - secStart); secStart = t; secNo = sn; }
          }
          if (me.offT > 3.2 || (me.hit > 0.2 && Math.hypot(me.vx, me.vy) < 25 && (me.stuck = (me.stuck || 0) + DT) > 1.6)) { respawn(); me.stuck = 0; }
          if (me.hit <= 0) me.stuck = 0;
          if (!solo) crash(cars); t += DT;
          if (me.fin) { finish(); break; }
        }
        draw(); hudDraw(); raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(function (n) { last = n; frame(n); });
    }
    menu();
  }
  window.ArcadeRace = { open: open, _t: { TRACKS: TRACKS, build: build, simulate: simulate, step: step, newCar: newCar, pilot: pilot, items: items } };
})();
