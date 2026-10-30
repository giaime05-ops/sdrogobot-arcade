/* Sdrogo Arcade – CORSA ARCADE (prototipo, solo account di prova): vista dall'alto fissa (stile "Pocket Racing"), gara a 4 con bot, 3 giri,
   olio da evitare, boost da prendere, erba che rallenta, muri, frenata necessaria. Si gioca in orizzontale (se il telefono è in verticale la scena si ruota da sola). */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var TRACKS = [
    { id: "neon", name: "Neon Circuit", hw: 120, laps: 3, k: 1.6, pud: "oil", pal: { g1: "#3fae3a", g2: "#46b842", sky: "#6ec7f5", tree: ["#58d65e", "#2a9a36", "#7be37f"], road: ["#6d6a7c", "#74718a"] }, pts: [[-100, 0], [100, 0], [300, 0], [500, 0], [700, 0], [900, 0], [1050, 40], [1150, 160], [1170, 330], [1120, 470], [1000, 560], [850, 560], [700, 570], [590, 615], [540, 730], [590, 845], [700, 890], [900, 890], [1100, 890], [1230, 940], [1260, 1070], [1180, 1170], [1000, 1180], [800, 1180], [500, 1180], [200, 1180], [-100, 1170], [-300, 1090], [-380, 900], [-350, 720], [-300, 550], [-345, 370], [-345, 200], [-290, 70], [-200, 10]] },
    { id: "serp", name: "Serpentina", hw: 118, laps: 3, k: 2.0, pud: "water", pal: { g1: "#8fae3a", g2: "#9ab842", sky: "#f4c98a", tree: ["#d99a2b", "#b8651e", "#8fb83a"], road: ["#6b6670", "#757078"] }, pts: [[-100, 0], [100, 0], [300, 0], [500, 0], [700, 0], [900, 20], [1080, 110], [1160, 300], [1060, 440], [1140, 590], [1260, 700], [1180, 870], [1000, 950], [800, 980], [600, 990], [400, 960], [260, 880], [240, 740], [380, 630], [330, 500], [150, 490], [-20, 580], [-130, 740], [-300, 880], [-500, 830], [-580, 640], [-520, 450], [-560, 270], [-500, 120], [-400, 40], [-250, 5]] },
    { id: "tornanti", name: "Tornanti", hw: 116, laps: 3, k: 1.6, pud: "oil", pal: { g1: "#d8c27a", g2: "#e0cb86", sky: "#8fd0f0", tree: ["#6f9a4a", "#4f7a34", "#b5a05a"], road: ["#5f5c6c", "#68657a"] }, pts: [[-300, 0], [-100, 0], [100, 0], [300, 0], [500, 0], [700, 0], [850, 0], [980, 50], [1030, 180], [980, 310], [850, 360], [650, 360], [450, 360], [250, 360], [120, 400], [70, 540], [120, 680], [250, 720], [450, 720], [650, 720], [850, 720], [980, 770], [1030, 900], [980, 1030], [850, 1080], [650, 1080], [450, 1080], [250, 1080], [0, 1080], [-300, 1090], [-500, 980], [-550, 700], [-550, 400], [-500, 150], [-420, 40]] },
    { id: "salto", name: "Valle Verde", hw: 120, laps: 3, k: 1.2, pud: "water", pal: { g1: "#2f9a45", g2: "#36a84d", sky: "#5fb8f0", tree: ["#2f9a45", "#1f7a35", "#58d65e"], road: ["#7a6a60", "#847468"] }, pts: [[0, 0], [194, 0], [389, 0], [583, 0], [777, 0], [971, 0], [1166, 0], [1360, 0], [1554, 0], [1748, 0], [1943, 0], [2007, 9], [2068, 33], [2119, 73], [2159, 125], [2184, 185], [2193, 250], [2193, 500], [2193, 750], [2184, 815], [2159, 875], [2119, 927], [2068, 967], [2007, 991], [1943, 1000], [1718, 1000], [1493, 1000], [1268, 1000], [1043, 1000], [964, 1012], [893, 1047], [836, 1102], [798, 1171], [721, 1383], [644, 1594], [606, 1663], [549, 1718], [478, 1753], [400, 1765], [200, 1765], [0, 1765], [-65, 1756], [-125, 1732], [-177, 1692], [-217, 1640], [-241, 1580], [-250, 1515], [-250, 1304], [-250, 1093], [-250, 883], [-250, 672], [-250, 461], [-250, 250], [-241, 185], [-217, 125], [-177, 73], [-125, 33], [-65, 9]] }
,
    { id: "zigzag", name: "Zig Zag", hw: 98, laps: 3, k: 1.4, pud: "water", night: 1, pal: { g1: "#2a5a52", g2: "#2f645b", sky: "#1c2a5a", tree: ["#2c8a6a", "#1f6a58", "#4fb089"], road: ["#55526a", "#5e5b76"] }, pts: [[-200, 0], [50, 0], [300, 0], [388, 24], [450, 90], [513, 209], [577, 329], [639, 394], [727, 419], [815, 394], [877, 329], [940, 209], [1004, 90], [1066, 24], [1154, 0], [1241, 24], [1304, 90], [1367, 209], [1431, 329], [1493, 394], [1581, 419], [1668, 394], [1731, 329], [1794, 209], [1858, 90], [1920, 24], [2008, 0], [2095, 24], [2158, 90], [2221, 209], [2285, 329], [2347, 394], [2435, 419], [2522, 394], [2585, 329], [2648, 209], [2712, 90], [2774, 24], [2862, 0], [2987, 0], [3112, 0], [3409, 123], [3532, 420], [3409, 717], [3112, 840], [2857, 840], [2602, 840], [2348, 840], [2093, 840], [1838, 840], [1583, 840], [1329, 840], [1074, 840], [819, 840], [564, 840], [310, 840], [55, 840], [-200, 840], [-497, 717], [-620, 420], [-497, 123]] },
    { id: "gp", name: "Sdrogo Ring", hw: 118, laps: 3, k: 1.7, pud: "oil", pal: { g1: "#7aa83a", g2: "#82b244", sky: "#8fd8ff", tree: ["#5fa03a", "#3c7a2a", "#9acb4a"], road: ["#66647a", "#6f6d86"] }, pts: [[-300, 0], [-100, 0], [100, 0], [300, 0], [500, 0], [700, 0], [900, 0], [1100, 0], [1300, 20], [1450, 100], [1530, 240], [1520, 400], [1440, 530], [1330, 640], [1330, 780], [1450, 880], [1450, 1020], [1330, 1120], [1130, 1160], [930, 1160], [780, 1230], [740, 1380], [860, 1480], [1060, 1500], [1260, 1480], [1400, 1560], [1440, 1700], [1330, 1820], [1130, 1830], [900, 1830], [700, 1830], [500, 1830], [300, 1780], [220, 1640], [260, 1500], [200, 1380], [40, 1330], [-140, 1370], [-240, 1500], [-350, 1610], [-510, 1580], [-540, 1400], [-500, 1220], [-540, 1040], [-620, 880], [-600, 700], [-500, 560], [-540, 400], [-560, 240], [-500, 100]] },
    { id: "canyon", pth: 0.0013, name: "Canyon Rush", hw: 116, laps: 3, k: 1, cs: 7, pud: "oil", pal: { g1: "#d9a463", g2: "#e0ad6c", dots: ["#b98348", "#f0cf98", "#c98f52"], sky: "#f6c98a", tree: ["#a9532a", "#8a3f1e", "#c9a24a"], road: ["#6a5a58", "#756462"] }, pts: [[-432,389], [-396,285], [-326,202], [-231,148], [-124,127], [-14,118], [96,109], [206,100], [316,90], [425,81], [535,72], [645,63], [755,54], [864,45], [974,35], [1084,26], [1194,17], [1304,8], [1413,10], [1521,33], [1627,62], [1734,91], [1840,120], [1946,149], [2052,178], [2159,207], [2265,236], [2367,277], [2459,335], [2538,411], [2601,501], [2650,600], [2699,698], [2748,797], [2785,900], [2794,1009], [2771,1115], [2718,1209], [2639,1286], [2549,1350], [2460,1414], [2369,1477], [2268,1517], [2159,1515], [2059,1473], [1972,1405], [1889,1333], [1805,1262], [1722,1190], [1634,1124], [1532,1086], [1423,1089], [1323,1133], [1235,1199], [1147,1265], [1059,1331], [970,1397], [871,1443], [762,1459], [652,1465], [543,1472], [433,1479], [323,1486], [213,1487], [106,1463], [13,1407], [-68,1332], [-146,1254], [-223,1177], [-301,1099], [-379,1021], [-444,932], [-476,827], [-476,717], [-461,608], [-446,498]] },
    { id: "costa", pth: 0.002, pdth: 0.0034, name: "Costa Blu", hw: 114, laps: 3, k: 1, cs: 7, pud: "water", pal: { g1: "#e3d097", g2: "#eadba2", dots: ["#c9b36e", "#f6e9b8", "#d8c283"], sky: "#78d4ff", tree: ["#2aa86a", "#1f8a58", "#58d6a0"], road: ["#6d7280", "#767b8a"] }, pts: [[-370,247], [-323,147], [-247,68], [-150,17], [-41,0], [69,0], [179,0], [289,0], [399,0], [509,0], [619,0], [729,0], [839,0], [949,0], [1059,0], [1169,0], [1279,0], [1389,0], [1499,0], [1609,0], [1719,0], [1829,0], [1938,8], [2045,33], [2147,73], [2245,123], [2344,172], [2442,221], [2540,270], [2639,319], [2737,369], [2833,422], [2922,486], [2995,569], [3047,664], [3089,766], [3123,870], [3158,975], [3192,1079], [3208,1188], [3195,1296], [3158,1398], [3097,1489], [3012,1558], [2918,1615], [2822,1669], [2726,1723], [2626,1767], [2518,1780], [2412,1751], [2323,1687], [2242,1613], [2161,1539], [2078,1466], [1982,1415], [1874,1405], [1770,1437], [1681,1501], [1600,1575], [1519,1649], [1438,1724], [1356,1797], [1261,1851], [1155,1877], [1047,1898], [939,1918], [830,1938], [722,1958], [614,1973], [506,1961], [409,1912], [326,1840], [244,1766], [167,1688], [115,1592], [104,1484], [139,1381], [213,1302], [308,1246], [406,1197], [504,1148], [596,1088], [662,1001], [688,895], [674,787], [629,687], [570,595], [486,525], [382,494], [273,507], [166,533], [60,560], [-47,587], [-154,613], [-262,611], [-356,558], [-405,461], [-401,352]] },
    { id: "downtown", pth: 0.0013, name: "Downtown Night", hw: 110, laps: 3, k: 1, cs: 7, pud: "water", night: 1, theme: "city", pal: { g1: "#6b6a80", g2: "#747390", bg: "#1b1a30", dots: ["#4a495c", "#a2a1bd", "#5a596e"], sky: "#0a0620", tree: ["#2c3158", "#3a2f63", "#24405f"], road: ["#34344a", "#3c3c56"] }, pts: [[-300,270], [-275,164], [-213,76], [-122,18], [-15,0], [95,0], [204,0], [314,0], [423,0], [532,0], [642,0], [751,0], [860,4], [966,32], [1064,80], [1166,119], [1273,131], [1379,105], [1478,59], [1579,16], [1686,0], [1795,0], [1905,0], [2014,0], [2124,0], [2233,0], [2342,7], [2445,41], [2528,109], [2583,203], [2600,311], [2600,420], [2600,530], [2600,639], [2575,745], [2511,832], [2418,888], [2310,900], [2200,900], [2092,911], [1996,961], [1930,1046], [1901,1151], [1900,1260], [1900,1369], [1892,1478], [1853,1579], [1776,1655], [1675,1693], [1566,1700], [1456,1700], [1347,1700], [1238,1700], [1129,1694], [1027,1659], [947,1585], [908,1484], [896,1376], [862,1273], [789,1194], [688,1156], [579,1150], [470,1150], [360,1150], [251,1150], [141,1150], [32,1150], [-77,1143], [-178,1104], [-254,1027], [-293,926], [-300,817], [-300,708], [-300,598], [-300,489], [-300,379]] },
    { id: "skyline", pth: 0.0013, name: "Skyline Neon", hw: 112, laps: 3, k: 1, cs: 7, pud: "water", night: 1, theme: "city", pal: { g1: "#66677f", g2: "#6f708a", bg: "#16172e", dots: ["#454659", "#9fa0bb", "#56576b"], sky: "#0a0a28", tree: ["#24405f", "#3a2f63", "#2c3158"], road: ["#303047", "#38384f"] }, pts: [[-300,240], [-272,134], [-204,49], [-104,7], [6,0], [117,0], [227,0], [338,0], [448,0], [559,0], [669,0], [780,0], [890,0], [1001,0], [1111,0], [1222,0], [1332,0], [1442,0], [1553,0], [1663,0], [1774,0], [1884,0], [1995,0], [2105,3], [2215,17], [2321,42], [2423,84], [2517,141], [2604,209], [2685,285], [2763,363], [2830,450], [2892,541], [2922,647], [2941,755], [2935,865], [2907,970], [2865,1072], [2808,1167], [2740,1253], [2666,1336], [2576,1398], [2480,1451], [2374,1478], [2265,1497], [2155,1500], [2044,1500], [1934,1500], [1823,1500], [1713,1500], [1602,1500], [1492,1500], [1381,1500], [1271,1500], [1160,1500], [1050,1500], [939,1500], [829,1500], [719,1497], [615,1462], [538,1386], [504,1282], [511,1173], [566,1079], [656,1017], [764,1000], [874,1000], [985,1000], [1095,1000], [1206,1000], [1315,991], [1413,943], [1478,855], [1500,748], [1476,641], [1410,555], [1311,508], [1202,500], [1091,500], [981,500], [870,500], [760,500], [649,500], [539,500], [428,500], [318,500], [207,500], [97,500], [-14,500], [-123,490], [-218,437], [-281,348]] }
  ];
  try { if (!localStorage.getItem("arc_race_reset73")) { Object.keys(localStorage).forEach(function (k) { if (/^arc_race4[gs]?_(?!laps$|diff$)/.test(k)) localStorage.removeItem(k); }); localStorage.setItem("arc_race_reset73", "1"); } } catch (e) {}   // azzera i tempi del vecchio formato (una volta sola)
  var NEON = ["#ff3db0", "#35e6ff", "#ffd23b", "#a855f7"];
  var VMAX = 520, VOFF = 270, DT = 1 / 60, AG = 340, WALL = 38, KERB = 14;
  var COLS = ["#ff2fa8", "#35e6ff", "#ffd23b", "#a855f7", "#ff8a3b", "#4ade80", "#f87171", "#60a5fa"], NAMES = ["Tu", "Turbo", "Zap", "Rex", "Nova", "Blitz", "Fox", "Ace"];

  function hh(n) { n = Math.imul(n ^ 61 ^ (n >>> 16), 9) ; n = Math.imul(n ^ (n >>> 4), 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }
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
    var CS = tr.cs || 14, c = tr.pts.map(function (p) { return [p[0] * tr.k, p[1] * tr.k]; }), n = c.length, P = [], k;
    for (var i = 0; i < n; i++) {
      var p0 = c[(i + n - 1) % n], p1 = c[i], p2 = c[(i + 1) % n], p3 = c[(i + 2) % n];
      for (var s = 0; s < CS; s++) {
        var t = s / CS, t2 = t * t, t3 = t2 * t;
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
    var lane = [-0.5, 0.35, -0.3, 0.5, 0, -0.45, 0.45], li = 0, kinds = ["pad", "pud", "pad", "pud", "pad", "pud"], padN = 0;     // sequenza ordinata: corsie fisse, mai due uguali di fila, ben distanziati
    for (k = 20; k < N - 12; k += 3) {
      if (near(k) || Math.min(k, N - k) < 40 || k - lastIt < 22) continue;                                         // lontano dal via, ben distanziati
      var kd = kinds[li % kinds.length], pud = kd === "pud";
      if (pud ? !straightAt(k, 4, tr.pth || 0.0006) : !straightAt(k, 4, tr.pdth || 0.0019)) continue;                                  // pozze solo sui rettilinei; le pedane anche sulle curve larghe
      var off = lane[(li * 3 + Math.floor(R() * 2)) % lane.length] * tr.hw; li++; lastIt = k;
      if (pud) items.push({ t: tr.pud || "oil", idx: k, lat: off, x: P[k][0] + nx[k] * off, y: P[k][1] + ny[k] * off });
      else if (padN++ % 2 === 1 && straightAt(k + 6, 4, tr.pdth || 0.0019) && !near(k + 6)) {                                                                                  // ogni tanto due pedane sfalsate: scegli quale prendere
        var o1 = -0.5 * tr.hw, o2 = 0.5 * tr.hw, k2 = k + 6;
        items.push({ t: "pad", idx: k, lat: o1, x: P[k][0] + nx[k] * o1, y: P[k][1] + ny[k] * o1 }); items.push({ t: "pad", idx: k2, lat: o2, x: P[k2][0] + nx[k2] * o2, y: P[k2][1] + ny[k2] * o2 }); lastIt = k2;
      } else items.push({ t: "pad", idx: k, lat: off, x: P[k][0] + nx[k] * off, y: P[k][1] + ny[k] * off });
    }
    if (tr.id !== "neon") {                                                                                            // meno pozze (si memorizzano) e un boost all'inizio e uno alla fine dei rettilinei lunghi
      var PT = tr.pud || "oil", pl = items.filter(function (q) { return q.t === PT; });
      if (pl.length > 3) { var keepP = [pl[0], pl[Math.floor(pl.length / 2)], pl[pl.length - 1]]; items = items.filter(function (q) { return q.t !== PT || keepP.indexOf(q) >= 0; }); }
      rs.slice(0, 2).forEach(function (r) {
        if (r.n < 26) return;
        [r.s + 5, r.s + r.n - 7].forEach(function (kk, qi) {
          kk = (kk + N) % N; if (near(kk) || Math.min(kk, N - kk) < 40 || tr.gap[kk]) return;
          if (items.some(function (q) { var d = Math.abs(q.idx - kk); return Math.min(d, N - d) < 9; })) return;
          var lo = (qi ? 0.25 : -0.25) * tr.hw; items.push({ t: "pad", idx: kk, lat: lo, x: P[kk][0] + nx[kk] * lo, y: P[kk][1] + ny[kk] * lo });
        });
      });
    }
    if (tr.cs) {                                                                                                         // piste nuove: meno boost a terra (max 4, ben distribuiti)
      var pdl = items.filter(function (q) { return q.t === "pad"; }).sort(function (a, b) { return a.idx - b.idx; });
      if (pdl.length > 4) { var keepD = [0, 1, 2, 3].map(function (q) { return pdl[Math.floor((q + 0.5) * pdl.length / 4)]; }); items = items.filter(function (q) { return q.t !== "pad" || keepD.indexOf(q) >= 0; }); }
    }
    function dmin(x, y) { var m = 1e12; for (var q = 0; q < N; q++) { var dx = x - P[q][0], dy = y - P[q][1], d2 = dx * dx + dy * dy; if (d2 < m) m = d2; } return Math.sqrt(m); }
    function dgap(x, y) { var m = 1e12; for (var q in tr.gap) { var dx = x - P[q][0], dy = y - P[q][1], d2 = dx * dx + dy * dy; if (d2 < m) m = d2; } return Math.sqrt(m); }
    var hasGap = jp.length > 0, occ = [];
    function fit(x, y, rad) { for (var q = 0; q < occ.length; q++) { var o = occ[q]; if (Math.hypot(x - o.x, y - o.y) < (rad + o.r) * 0.9) return false; } return true; }      // niente oggetti sovrapposti o incollati (alberi, sassi, laghetti)
    for (k = 0; k < N; k += 2) [1, -1].forEach(function (sg2) {       // scenografia: sempre lontana dalla pista (anche dalle altre parti del circuito)
      function ok(x, y, rad) { return dmin(x, y) > wl + rad + 24 && (!hasGap || dgap(x, y) > wl + 300 + rad); }
      if (tr.theme === "city") {                                                                                         // città di notte: palazzi con luci neon in alto e lampioni lungo la pista
        if (k % 10 === 0) { var bw = 26 + R() * 30, bd = 26 + R() * 30, ob = (wl + 104 + bd + R() * 40) * sg2, bx = P[k][0] + nx[k] * ob, by = P[k][1] + ny[k] * ob, bhh = 50 + R() * 150, okb = ok(bx, by, Math.hypot(bw, bd) + 8);
          for (var bq = 0; okb && bq < trees.length; bq++) if (trees[bq].b && Math.hypot(trees[bq].x - bx, trees[bq].y - by) < trees[bq].w + trees[bq].d + bw + bd - 20) okb = false;
          if (okb) trees.push({ b: 1, x: bx, y: by, w: bw, d: bd, h: bhh, s: bw * 2, ang: ta[k], c: Math.floor(R() * 3), a: Math.floor(R() * 4), wc: Math.floor(R() * 3), band: R() < 0.55, roof: Math.floor(R() * 3), seed: Math.floor(R() * 99999) }); }
        if (k % 8 === 0) { var ol = (wl + 22) * sg2; deco.push({ t: "lamp", x: P[k][0] + nx[k] * ol, y: P[k][1] + ny[k] * ol, c: Math.floor(k / 8) % 3 }); }
        return;
      }
      if (R() < 0.6) { var o = (wl + 46 + R() * 220) * sg2, tx = P[k][0] + nx[k] * o, ty = P[k][1] + ny[k] * o, sz = 22 + R() * 14, hh = 18 + R() * 30, cc = Math.floor(R() * 3), sd = R() < 0.12; if (ok(tx, ty, sz) && fit(tx, ty, sz * 1.1)) { trees.push({ x: tx, y: ty, h: hh, s: sz, sand: sd, c: cc }); occ.push({ x: tx, y: ty, r: sz * 1.1 }); } }
      if (R() < 0.5) { var o2 = (wl + 30 + R() * 330) * sg2, rr = R(), fx = P[k][0] + nx[k] * o2, fy = P[k][1] + ny[k] * o2, fc = Math.floor(R() * 4); if (ok(fx, fy, 10) && fit(fx, fy, 9)) { deco.push({ t: rr < 0.6 ? "flower" : "rock", x: fx, y: fy, c: fc }); occ.push({ x: fx, y: fy, r: 9 }); } }
      if (R() < 0.06) { var o3 = (wl + 260 + R() * 160) * sg2, qx = P[k][0] + nx[k] * o3, qy = P[k][1] + ny[k] * o3, pw = 90 + R() * 90, ph = 60 + R() * 60, pa = R() * 3; if (ok(qx, qy, Math.hypot(pw, ph)) && fit(qx, qy, Math.max(pw, ph) * 0.6)) { deco.push({ t: "pond", x: qx, y: qy, w: pw, h: ph, a: pa }); occ.push({ x: qx, y: qy, r: Math.max(pw, ph) * 0.6 }); } }
    });
    var SPT = tr.theme === "city" ? ["NEON BANK", "SDROGO CASINÒ", "LUCKY 7", "ZAP ENERGY", "ROYAL FLUSH", "TURBO OIL", "JACKPOT", "SDROGO ARCADE", "DADI D'ORO", "POKER KING"] : ["SDROGO ARCADE", "ROULETTE 36", "TURBO OIL", "SCOPA CLUB", "BLITZ GOMME", "ZAP ENERGY", "SDROGO BANK", "NOVA FUEL", "FORTUNA SDG", "ASSO DI CUORI"],
        SPC = [["#14052e", "#ffd23b"], ["#0b2a4a", "#35e6ff"], ["#3a0a2a", "#ff6fc8"], ["#0a3a22", "#52ff9a"], ["#2a0a0a", "#ff8a8a"]], si = 0; tr.spons = [];
    for (k = 30; k < N - 30 && false; k += 34 + (si % 3) * 7, si++) { if (near(k) || near(k + 7) || tr.gap[k]) continue; tr.spons.push({ i: k, n: 7, side: si % 2 ? 1 : -1, t: SPT[si % SPT.length], bg: SPC[si % SPC.length][0], fg: SPC[si % SPC.length][1] }); }
    tr.deco = deco; tr.items = items; tr.trees = trees;
    return tr;
  }
  function newCar(tr, slot) {
    var a = tr.ta[0], sx = -Math.sin(a), sy = Math.cos(a), row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1;      // griglia 2x2
    var x = tr.P[0][0] - Math.cos(a) * (40 + row * 72) + sx * side * 28, y = tr.P[0][1] - Math.sin(a) * (40 + row * 72) + sy * side * 28;
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
  var FIRE_DELAY = 0.45;                      // dopo quanto tempo "dritto" parte il boost accumulato
  function endDrift(car, wall) {              // fine derapata: il boost resta in carica; parte da solo quando resti dritto per un po'
    if (wall) car.meter *= 0.5;
    car.dd = 0; car.dT = 0; car.hold = 0; car.dOff = 0; car.opp = 0; car.rec = 1;
  }
  function fireBoost(car, k) { car.boostT = Math.max(car.boostT, (0.4 + car.meter * 1.7) * k); car.fired = car.meter < 0.5 ? 1 : (car.meter < 0.8 ? 2 : 3); car.meter = 0; car.str = 0; }
  function step(tr, car, inp) {             // un passo di fisica (60 Hz, deterministico). inp.auto = il giocatore: acceleratore e freno automatici, derapata con ◀ ▶
    var air = car.air > 0; if (air) car.air -= DT;                                                                          // in volo: si continua a sterzare e a derapare, niente muri/erba
    var fx = Math.cos(car.a), fy = Math.sin(car.a), sx = -fy, sy = fx;
    var vf = car.vx * fx + car.vy * fy, vl = car.vx * sx + car.vy * sy;
    var d = nearest(tr, car), off = !air && d > tr.hw + KERB; car.off = off; car.offT = off ? (car.offT || 0) + DT : 0;
    if (car.stall > 0) { car.stall -= DT; vf *= 0.9; inp = { l: false, r: false, brake: false, gas: false }; }
    var turn = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), human = !!inp.auto, bst = car.boostT > 0;
    if (turn) { car.tapT = (car.tapT || 0) + DT; if (car.tapT > 0.18) car.str = 0; } else { car.tapT = 0; car.str = (car.str || 0) + DT; }      // le micro-correzioni sul dritto (<0,18 s) non azzerano l'attesa del boost
    if (human) {                                                                                                         // stato di derapata
      if (car.dd) {
        if (turn === 0) { car.dOff = (car.dOff || 0) + DT; if (car.dOff > 0.1) endDrift(car); } else { car.dOff = 0; if (turn === -car.dd) { car.opp = (car.opp || 0) + DT; if (car.opp > 0.12) { car.dd = turn; car.dT = 0; car.opp = 0; } } else car.opp = 0; }   // a destra poi subito a sinistra: la derapata cambia lato, il boost resta
        if (car.dd && (car.spin > 0 || vf < 110)) endDrift(car, true); else if (car.dd && off && car.offT > 0.45) endDrift(car, false);
      } else if (turn && vf > 160 && !off && car.spin <= 0) { car.hold = (car.hold || 0) + DT; if (car.hold > 0.2) { car.dd = turn; car.dT = 0; car.hold = 0; car.dOff = 0; car.opp = 0; car.omS = 0; } }
      else if (!turn) car.hold = 0;
      if (!car.dd && !air) {                                                                                            // il boost accumulato parte da solo dopo un po' di dritto
        if ((!turn || car.tapT < 0.18) && car.str > FIRE_DELAY && car.meter >= 0.22 && (!off || car.offT < 0.3) && car.spin <= 0 && vf > 150) fireBoost(car, 1);
        else if (!turn && car.str > 0.8 && car.meter < 0.22) car.meter = Math.max(0, car.meter - DT * 0.25);
      }
    } else if (!air) {                                                                                                  // bot: caricano e scaricano "virtualmente"
      if (turn && vf > 220 && !off && car.bm) car.meter = Math.min(1, car.meter + DT / 3.2 * car.bm); else if (!turn && car.bm && car.str > 0.45 && car.meter >= 0.22) fireBoost(car, 0.8);
    }
    var brk = !air && (inp.brake || (human && !off && needBrake(tr, car, vf, (car.dd ? 1.2 : 0.9) * (bst ? 1.25 : 1)))); car.brk = brk;
    var vmax = off ? (bst ? VOFF * 1.9 : VOFF) : (car.boostT > 0 ? 570 : VMAX) * (car.vm || 1) * (tr.rain ? (tr.rain > 1 ? 0.95 : 0.975) : 1) * (1 + (car.tw || 0) * 0.13 + (car.rb || 0));
    if (air) { /* niente accelerazione in volo */ } else if (brk) vf -= (human ? 330 : 640) * DT; else if (inp.gas) vf += 430 * Math.max(-0.8, 1 - vf / vmax) * DT; else vf -= 70 * DT;
    if (car.boostT > 0) { if (vf < vmax && !air) vf += 230 * DT; car.boostT -= DT; }
    if (!air) vf -= vf * (off ? (bst ? 0.4 : 1.1) : 0.25) * DT; if (vf < 0) vf = 0;
    var om;
    if (car.dd) {                                                                                                        // DERAPATA: la macchina scivola di traverso, tieni premuto per stringere
      car.dT += DT; if (tr.rain && human && car.dT > (tr.rain > 1 ? 1.05 : 1.6) && car.spin <= 0) { car.spin = 0.7; endDrift(car, true); }       // sul bagnato una derapata troppo lunga ti manda in testacoda
      var omD = 1.8 * (1 - 0.3 * Math.min(1, vf / VMAX)), tg = car.dd * omD * (turn === car.dd ? 1 : (turn === 0 ? 0.6 : 0.1));
      car.omS += (tg - car.omS) * Math.min(1, 9 * DT); om = car.omS;
      if (car.dT > 0.12) car.meter = Math.min(1, car.meter + DT / 3.0 * (0.5 + 0.5 * Math.min(1, vf / 450)));                              // la barra si riempie derapando
    } else {
      om = turn * 2.5 * (1 - 0.55 * Math.min(1, vf / VMAX)) * Math.min(1, vf / 60);
      if (human && vf > 1) { var vE = Math.min(vf, VMAX) + 0.25 * Math.max(0, vf - VMAX), lim = AG * (bst ? 1.7 : 1.4); if (vE * Math.abs(om) > lim) om = (om < 0 ? -1 : 1) * lim / vE; }                      // anti-testacoda
    }
    if (tr.rain && !car.dd && car.spin <= 0 && !air) {                                                                   // asfalto bagnato: sterzo più "molle" e auto che allarga in curva (leggero con la pioggia, evidente con la forte)
      car.omR = car.omR == null ? om : car.omR + (om - car.omR) * Math.min(1, (tr.rain > 1 ? 5.2 : 9) * DT); om = car.omR * (1 - (tr.rain > 1 ? 0.12 : 0.045) * Math.min(1, vf / VMAX));
    } else car.omR = om;
    car.drift = car.dd ? 1 : 0;
    if (car.spin > 0) { car.spin -= DT; om = 7; vf *= Math.exp(-1.4 * DT); if (car.spin <= 0 && car.oil) { var o = car.oil, k2 = (o.idx + 4) % tr.N; car.x = tr.P[k2][0] + tr.nx[k2] * o.lat; car.y = tr.P[k2][1] + tr.ny[k2] * o.lat; car.a = tr.ta[k2]; car.vx = Math.cos(car.a) * 70; car.vy = Math.sin(car.a) * 70; car.idx = k2; car.oil = null; car.blink = 1; return; } }
    var dem = vf * Math.abs(om), sl = (car.spin > 0 || car.dd) ? 0 : Math.max(0, Math.min(1.2, (dem - AG * (tr.rain > 1 ? 0.7 : tr.rain ? 0.86 : 1)) / (AG * 0.5)));
    car.slip = sl; if (sl > 0) vf -= 30 * Math.min(1, sl) * DT;
    var wx = fx * vf + sx * vl, wy = fy * vf + sy * vl;
    car.a += om * DT;
    fx = Math.cos(car.a); fy = Math.sin(car.a); sx = -fy; sy = fx;
    vf = wx * fx + wy * fy; vl = wx * sx + wy * sy;
    var dmp = car.dd ? 2.5 : (brk ? 7 : 12) * (1 - 0.92 * Math.min(1, sl)); if (tr.rain && !car.dd) dmp *= (tr.rain > 1 ? 0.3 : 0.55); if (!car.dd && car.rec > 0) { dmp = 6 + (dmp - 6) * (1 - car.rec); car.rec -= DT / 0.25; }
    vl *= Math.exp(-(air ? 0.3 : dmp) * DT);
    car.vx = fx * vf + sx * vl; car.vy = fy * vf + sy * vl;
    car.x += car.vx * DT; car.y += car.vy * DT;
    if (!air && d > tr.hw + WALL) {                                             // muro: si striscia lungo la barriera senza rimbalzare
      var P = tr.P[car.idx], dx = car.x - P[0], dy = car.y - P[1], L = Math.hypot(dx, dy) || 1, r = tr.hw + WALL, nx2 = dx / L, ny2 = dy / L;
      car.x = P[0] + nx2 * r; car.y = P[1] + ny2 * r; var vn = car.vx * nx2 + car.vy * ny2; if (vn > 0) { car.vx -= nx2 * vn; car.vy -= ny2 * vn; } car.vx *= 0.93; car.vy *= 0.93; car.hit = 0.3;
      if (car.dd) endDrift(car, true);
    }
    if (air) {                                                                                                            // salto guidato: la traiettoria segue la curva della pista, ma l'angolo che hai e la tua derapata restano tuoi
      var tn = tr.ta[car.idx], dq = tn - (car.ta0 == null ? tn : car.ta0); while (dq > Math.PI) dq -= 2 * Math.PI; while (dq < -Math.PI) dq += 2 * Math.PI; car.ta0 = tn;
      if (dq) { var cq = Math.cos(dq), sq = Math.sin(dq), ux = car.vx * cq - car.vy * sq; car.vy = car.vx * sq + car.vy * cq; car.vx = ux; car.a += dq; }
      var nx0 = tr.nx[car.idx], ny0 = tr.ny[car.idx], e = (car.x - tr.P[car.idx][0]) * nx0 + (car.y - tr.P[car.idx][1]) * ny0 - (car.lat0 || 0), vn = car.vx * nx0 + car.vy * ny0;   // resta sulla tua corsia: atterri dove eri
      car.x -= nx0 * e * Math.min(1, 9 * DT); car.y -= ny0 * e * Math.min(1, 9 * DT); car.vx -= nx0 * vn * Math.min(1, 6 * DT); car.vy -= ny0 * vn * Math.min(1, 6 * DT);
    }
    if (car.hit > 0) car.hit -= DT;
  }
  function items(tr, car) {                  // oggetti in pista: valgono per tutte le auto (anche i bot)
    for (var i = 0; i < tr.items.length; i++) {
      var it = tr.items[i]; if (it.gone && it.gone > 0) { it.gone -= DT; if (it.gone > 0) continue; }
      var di = ((car.idx - it.idx + tr.N * 1.5) % tr.N) - tr.N / 2; if (Math.abs(di) > 3 || car.air > 0) continue;
      var dd = Math.hypot(car.x - it.x, car.y - it.y), sp = Math.hypot(car.vx, car.vy);
      if (it.t === "jump") { if (di >= 1 && di <= 2 && dd < tr.hw + 20) { var v0 = Math.max(sp, 330), kf = sp > 1 ? v0 / sp : 0; if (kf) { car.vx *= kf; car.vy *= kf; } else { car.vx = Math.cos(car.a) * v0; car.vy = Math.sin(car.a) * v0; } car.airT = car.air = Math.max(0.5, Math.min(1.5, ((it.idx + 9 - car.idx) * tr.sp) / v0)); car.ta0 = tr.ta[car.idx]; car.lat0 = Math.max(-tr.hw * 0.8, Math.min(tr.hw * 0.8, (car.x - tr.P[car.idx][0]) * tr.nx[car.idx] + (car.y - tr.P[car.idx][1]) * tr.ny[car.idx])); car.off = false; car.jumped = 1; } }
      else if (dd < 30) {
        if (it.t === "oil" || it.t === "water") { if (car.spin <= 0 && !(car.boostT > 0.2)) { car.spin = 0.85; car.oil = it; car.vx *= 0.5; car.vy *= 0.5; } }
        else { var big = it.t === "turbo"; car.boostT = Math.max(car.boostT, big ? 0.8 : 0.5); car.meter = Math.min(1, car.meter + (big ? 0.12 : 0.06)); it.gone = 5; }
      }
    }
  }
  function crash(cars) {                     // contatti morbidi: le auto si toccano e si spingono, senza frenarsi
    function cc(c) { var co = Math.cos(c.a), si = Math.sin(c.a); return [[c.x + co * 11, c.y + si * 11], [c.x - co * 11, c.y - si * 11]]; }
    for (var i = 0; i < cars.length; i++) for (var j = i + 1; j < cars.length; j++) {
      var a = cars[i], b = cars[j]; if ((a.remote && b.remote) || a.air > 0 || b.air > 0 || Math.abs(a.x - b.x) > 56 || Math.abs(a.y - b.y) > 56) continue;
      var ca = cc(a), cb = cc(b);
      for (var p = 0; p < 2; p++) for (var q = 0; q < 2; q++) {
        var dx = cb[q][0] - ca[p][0], dy = cb[q][1] - ca[p][1], d = Math.hypot(dx, dy), R2 = 22;
        if (d < R2 && d > 0.01) {
          var nx = dx / d, ny = dy / d, o = Math.min(2.5, (R2 - d) / 2);
          if (!a.remote) { a.x -= nx * o; a.y -= ny * o; } if (!b.remote) { b.x += nx * o; b.y += ny * o; }      // contro un'auto online sposto solo la mia (l'altro telefono sposta la sua)
          var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) { var j2 = -vn * 0.25; if (!a.remote) { a.vx -= nx * j2; a.vy -= ny * j2; } if (!b.remote) { b.vx += nx * j2; b.vy += ny * j2; } }
        }
      }
    }
  }
  function pilot(tr, car, off, skill) {      // bot: traiettoria ideale (entra largo, stringe all'interno della curva), schiva l'olio, frena in anticipo
    var v = Math.hypot(car.vx, car.vy), j = (car.idx + 3 + Math.round(v / 80)) % tr.N, ln = Math.max(-0.62, Math.min(0.62, tr.sg[j] * 0.5)) * tr.hw * skill;
    var offt = off + ln;
    if (skill > 0.8) for (var i = 0; i < tr.items.length; i++) { var it = tr.items[i]; if (it.t !== "oil" && it.t !== "water") continue; var di = (it.idx - car.idx + tr.N) % tr.N; if (di > 1 && di < 9 && Math.abs(it.lat - offt) < 40) { offt = it.lat + (it.lat > 0 ? -1 : 1) * 46; break; } }
    var T = tr.P[j], tx = T[0] + tr.nx[j] * offt, ty = T[1] + tr.ny[j] * offt;
    var df = Math.atan2(ty - car.y, tx - car.x) - car.a;
    while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
    var brake = false, ag = AG * skill;
    for (var q = 0; q < 24; q++) { var kk = tr.kap[(car.idx + q) % tr.N]; if (kk < 1e-4) continue; var vs = Math.sqrt(ag * 0.95 / kk), dist = q * tr.sp; if (v * v > vs * vs + 2 * 540 * dist * 0.8) { brake = true; break; } }
    return { l: df < -0.03, r: df > 0.03, brake: brake, gas: !brake };
  }
  var DIFF = [{ n: "Facile", m: 0.8, bm: 0 }, { n: "Medio", m: 0.92, bm: 0.45 }, { n: "Difficile", m: 1.02, bm: 0.8 }, { n: "Campione", m: 1.12, bm: 1.1 }];
  function skills(di) { var m = DIFF[di].m; return [1, m, m * 0.95, m * 0.9]; }
  function simulate(tr, di) {                // utile per i test: tutti pilotati dai bot
    if (di == null) di = 3; var cars = [0, 1, 2, 3].map(function (s) { var c = newCar(tr, s); c.bm = DIFF[di].bm; return c; }), t = 0, offs = [0, -22, 22, 0], sk = skills(di);
    for (var i = 0; i < 60 * 240; i++) {
      cars.forEach(function (c, k) { if (!c.fin) { step(tr, c, pilot(tr, c, offs[k], sk[k])); items(tr, c); if (c.prog >= tr.N * tr.laps) { c.fin = true; c.finT = t; } } });
      crash(cars); t += DT; if (cars.every(function (c) { return c.fin; })) break;
    }
    return cars.map(function (c) { return c.fin ? +c.finT.toFixed(1) : 0; });
  }
  function skillsN(di, n) { var m = DIFF[di].m, o = []; for (var k = 0; k < n; k++) o.push(k === 0 ? 1 : m * (k < 4 ? [1, 1, 0.95, 0.9][k] : 0.9 - 0.02 * (k - 3))); return o; }
  function botLap(tr, m, vm) {                                                  // tempo del 2° giro (lanciato) di un bot da solo, per tarare la difficoltà "Campione"
    var c = newCar(tr, 0), t = 0, lap = 1, ls = 0, lt = []; c.bm = 1.1; c.vm = vm;
    for (var i = 0; i < 60 * 160; i++) { step(tr, c, pilot(tr, c, 0, m)); items(tr, c); t += DT; if (c.prog >= tr.N * lap) { lt.push(t - ls); ls = t; lap++; if (lt.length >= 2) break; } }
    return lt.length > 1 ? lt[1] : 999;
  }
  function champ(tr, n) {                                                       // Campione: i bot girano come il TUO record (poi come il miglior giro di tutti, col server)
    var rec = myRec(tr) || absRec(tr); if (!rec || !rec.t) return null;
    var bl = lsGet(PF() + "b_" + tr.id), base = bl && bl.t ? bl.t : rec.t / 3 * 0.96, key = Math.round(base * 10); tr._cal = tr._cal || {}; var cal = tr._cal[key];
    if (!cal) { var solve = function (T) { var lo = 0, hi = 3; for (var i = 0; i < 9; i++) { var q = (lo + hi) / 2; if (botLap(tr, 0.95 + 0.2 * q, 1 + 0.1 * q) > T) lo = q; else hi = q; } return (lo + hi) / 2; }; cal = tr._cal[key] = { q1: solve(base), q2: solve(base * 1.04) }; }
    var m = [1], vm = [1]; for (var k = 1; k < n; k++) { var r = 1 + 0.012 * (k - 1), q = Math.max(0, Math.min(3, cal.q1 + (cal.q2 - cal.q1) * (r - 1) / 0.04)); m.push(0.95 + 0.2 * q); vm.push(1 + 0.1 * q); }
    return { m: m, vm: vm, base: base };
  }
  function aero(tr, cars, o) {                                                  // scia e aiuto agli ultimi (attivabili): effetti leggeri, calcolati prima di ogni passo
    var lead = -1e9, k; cars.forEach(function (c) { if (!c.fin && c.prog > lead) lead = c.prog; });
    cars.forEach(function (c) {
      if (c.fin) { c.tw = 0; c.rb = 0; return; }
      var inw = false, tg = null, tgd = 1e9, lc = (c.x - tr.P[c.idx][0]) * tr.nx[c.idx] + (c.y - tr.P[c.idx][1]) * tr.ny[c.idx];
      if (o.slip) for (k = 0; k < cars.length; k++) { var q = cars[k]; if (q === c || q.fin) continue; var dp = (q.prog - c.prog) * tr.sp; if (dp < 6 || dp > 760 || Math.hypot(q.vx, q.vy) < 180) continue; var lq = (q.x - tr.P[q.idx][0]) * tr.nx[q.idx] + (q.y - tr.P[q.idx][1]) * tr.ny[q.idx]; if (Math.abs(lq - lc) < 22 + dp * 0.05 && dp < tgd) { tgd = dp; tg = q; inw = true; } }
      c.tgt = tg; c.tq = (inw && !(c.spin > 0)) ? (c.tq || 0) + DT : Math.max(0, (c.tq || 0) - DT * 0.8);
      c.tw = c.tq > 0.45 ? Math.min(1, (c.tq - 0.45) / 0.5) : 0; if (c.dd) c.tw *= 0.65;
      var ga = 1e9; if (o.assist) cars.forEach(function (q) { if (q !== c && !q.fin && q.prog > c.prog) { var g = (q.prog - c.prog) * tr.sp / Math.max(200, Math.hypot(q.vx, q.vy)); if (g < ga) ga = g; } });       // distacco in secondi dall'auto davanti: <4 s niente, ~10 s medio, 20+ s forte
      c.rb = o.assist && ga < 1e8 ? (ga < 4 ? 0 : ga < 10 ? 0.045 * (ga - 4) / 6 : Math.min(0.09, 0.045 + 0.045 * (ga - 10) / 10)) : 0;
    });
  }
  function qualSim(tr, m, vm, off) {                                            // giro di qualifica lanciato, pulito (niente pozze né pedane): tempo e traiettoria
    var c = newCar(tr, 0), k0 = tr.N - 14; c.x = tr.P[k0][0]; c.y = tr.P[k0][1]; c.a = tr.ta[k0]; c.vx = Math.cos(c.a) * 380; c.vy = Math.sin(c.a) * 380; c.idx = k0; c.prog = -14; c.bm = 1.1; c.vm = vm;
    var path = [], t = 0, t0 = -1, i0 = 0; for (var i = 0; i < 60 * 150; i++) { step(tr, c, pilot(tr, c, off, m)); t += DT; if (t0 < 0 && c.prog >= 0) { t0 = t; i0 = path.length / 3; } path.push(c.x, c.y, c.a); if (c.prog >= tr.N) return { t: t - t0, path: path, i0: i0 }; }
    return { t: 999, path: path, i0: i0 };
  }
  function fmt(t) { if (!t) return "--:--.--"; var m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2); }
  function slider(v0, cb, steps) {                                                                                          // cursore trascinabile col dito (continuo, non a scatti)
    var w = el("div", "rc2-sl"), fl = el("i"), th = el("b"); w.appendChild(fl); w.appendChild(th); var val = v0;
    function show() { fl.style.width = val * 100 + "%"; th.style.left = val * 100 + "%"; }
    function axis() { var m = new DOMMatrix(), n = w; while (n && n.nodeType === 1) { var tf = getComputedStyle(n).transform; if (tf && tf !== "none") m = new DOMMatrix(tf).multiply(m); n = n.parentElement; } return m; }
    function at(e) {                                                                                                   // funziona anche con lo schermo ruotato via software (modalità orizzontale)
      var rc = w.getBoundingClientRect(), m = axis(), ux = m.a, uy = m.b, L2 = ux * ux + uy * uy || 1, cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
      val = Math.max(0, Math.min(1, 0.5 + ((e.clientX - cx) * ux + (e.clientY - cy) * uy) / (L2 * Math.max(1, w.offsetWidth)))); if (steps) val = Math.round(val * (steps - 1)) / (steps - 1); show(); cb(val);
    }
    var drag = false;
    w.addEventListener("pointerdown", function (e) { drag = true; try { w.setPointerCapture(e.pointerId); } catch (x) {} at(e); e.preventDefault(); e.stopPropagation(); });
    w.addEventListener("pointermove", function (e) { if (drag) { at(e); e.preventDefault(); } });
    w.addEventListener("pointerup", function () { drag = false; }); w.addEventListener("pointercancel", function () { drag = false; });
    w.addEventListener("touchstart", function (e) { e.stopPropagation(); }, { passive: true }); w.addEventListener("touchmove", function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    show(); return w;
  }
  function dragX(w) {                                                                                                // scorrimento orizzontale a dito che funziona anche con lo schermo ruotato via software
    function axis() { var m = new DOMMatrix(), n = w; while (n && n.nodeType === 1) { var tf = getComputedStyle(n).transform; if (tf && tf !== "none") m = new DOMMatrix(tf).multiply(m); n = n.parentElement; } return m; }
    var dn = false, lx = 0, ly = 0;
    w.addEventListener("pointerdown", function (e) { dn = true; lx = e.clientX; ly = e.clientY; try { w.setPointerCapture(e.pointerId); } catch (x) {} });
    w.addEventListener("pointermove", function (e) { if (!dn) return; var m = axis(), ux = m.a, uy = m.b, L2 = (ux * ux + uy * uy) || 1; w.scrollLeft -= ((e.clientX - lx) * ux + (e.clientY - ly) * uy) / L2; lx = e.clientX; ly = e.clientY; e.preventDefault(); });
    w.addEventListener("pointerup", function () { dn = false; }); w.addEventListener("pointercancel", function () { dn = false; });
    w.addEventListener("touchstart", function (e) { e.stopPropagation(); }, { passive: true }); w.addEventListener("touchmove", function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });
  }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var ORD = ["1°", "2°", "3°", "4°", "5°", "6°", "7°", "8°"];

  function isSbx() { return !!(A.isSandbox && A.isSandbox()); }
  function PF() { return isSbx() ? "arc_race4" : "arc_race6"; }                                              // account di prova e account vero hanno dati separati
  var SRV = { ok: false, unlocked: {}, top: {}, mine: {}, rec: {} };                                         // stato vero dal server (solo account vero)
  function loadSrv(cb) {
    if (isSbx()) { cb(); return; }
    A.api("/api/race/state", "GET").then(function (j) {
      if (j && j.success) { SRV.unlocked = {}; (j.unlocked || []).forEach(function (id) { SRV.unlocked[id] = 1; }); SRV.top = j.top || {}; SRV.mine = j.mine || {}; SRV.rec = j.rec || {}; }
      TRACKS.forEach(function (t) { var r = SRV.rec[t.id]; if (!r || t._absT !== r.t) { t._absG = null; t._absT = r && r.t; } });
      SRV.ok = true; cb();
    }).catch(function () { SRV.ok = true; cb(); });
  }
  function myRec(tr) { if (isSbx()) return lsGet("arc_race4_" + tr.id); var m = SRV.mine[tr.id]; return m ? { t: m / 1000 } : null; }   // il TUO record sui 3 giri
  function absRec(tr) {                                                                                      // record della pista (di tutti): nessuno finché qualcuno non lo fa
    if (isSbx()) { var m = lsGet("arc_race4_" + tr.id); return m && m.t ? { t: m.t, n: "Tu", me: true } : null; }
    var r = SRV.rec[tr.id]; return r ? { t: r.t / 1000, n: r.n, me: !!r.me } : null;
  }
  function board(tr) {                                                                                       // classifica vera: righe vuote finché nessuno fa un tempo
    var L;
    if (isSbx()) { var m = lsGet("arc_race4_" + tr.id); L = m && m.t ? [{ n: "Tu", t: m.t, me: true }] : []; }
    else L = (SRV.top[tr.id] || []).map(function (r) { return { n: r.n, t: r.t / 1000, me: !!r.me }; });
    return L;
  }
  function tIdx(tr) { for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].id === tr.id) return i; return 0; }
  function lapTarget(tr) { build(tr); if (!tr._ut) tr._ut = Math.round(botLap(tr, 1, 1) * 1.08 * 10) / 10; return tr._ut; }
  function isUnlocked(tr) { return tIdx(tr) < 3 || (isSbx() ? !!lsGet("arc_race4u_" + tr.id) : !!SRV.unlocked[tr.id]); }
  (function () { try { if (!localStorage.getItem("arc_race5_mig")) { ["canyon", "costa", "downtown", "skyline"].forEach(function (id) { ["arc_race4_", "arc_race4g_", "arc_race4s_", "arc_race4b_"].forEach(function (p) { localStorage.removeItem(p + id); }); }); localStorage.setItem("arc_race5_mig", "1"); } } catch (e) {} })();     // fantasmi/record delle piste rifatte: azzerati una volta
  var PRICE = [0, 0, 0, 500, 750, 950, 1150, 1400, 1700, 2000], REWARD = [150, 150, 150, 300, 350, 400, 500, 600, 800, 1000];     // sblocco a pagamento e premio per ogni record battuto
  function price(tr) { return PRICE[tIdx(tr)] || 0; }
  function reward(tr) { return REWARD[tIdx(tr)] || 150; }
  function wal() { var w = lsGet("arc_race4_w"); return w == null ? 5000 : w; }               // saldo di prova (solo nell'account admin di prova)
  function walAdd(n) { lsSet("arc_race4_w", Math.max(0, wal() + n)); }
  function lockText(tr) { return "Sblocca per " + A.fmt(price(tr)) + " $SDG"; }
  function buyTrack(tr, cb) {
    if (!(A.isSandbox && A.isSandbox())) { A.api("/api/race/unlock", "POST", { track: tr.id }).then(function (j) { if (j && j.success) { SRV.unlocked[tr.id] = 1; try { A.refreshMe(); } catch (e) {} cb(true); } else { A.toast((j && j.error) || "Sblocco non riuscito"); cb(false); } }).catch(function () { A.toast("Server non raggiungibile"); cb(false); }); return; }
    var p = price(tr); if (wal() < p) { A.toast("Servono " + A.fmt(p) + " $SDG (saldo di prova " + A.fmt(wal()) + ")"); cb(false); return; }
    walAdd(-p); lsSet("arc_race4u_" + tr.id, 1); A.haptic("ok"); cb(true);
  }
  function payRec(tr, tm) {                                                                                      // premio per un record sui 3 giri (account di prova: simulato; account vero: lo paga il server)
    var r = reward(tr); if (isSbx()) walAdd(r); return r;
  }
  function art(tr) {                                  // sfondo della scheda pista: disegno 2D di un tratto di circuito col clima della pista
    var cv = el("canvas", "rc-art"), w = 360, h = 130, d = 2; cv.width = w * d; cv.height = h * d; var c = cv.getContext("2d"); c.scale(d, d);
    var N = tr.N, P = tr.P, fk = 0, fb = -1; for (var i = 0; i < N; i++) { var kk = 0; for (var q = -10; q <= 10; q += 5) kk += tr.kap[(i + q + N) % N]; if (kk > fb && Math.min(i, N - i) > 30) { fb = kk; fk = i; } }
    var sc = w / 1500, fx = P[fk][0], fy = P[fk][1], rot = -0.5 - tr.ta[fk] * 0.35;
    var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, tr.pal.g2); g.addColorStop(1, tr.pal.g1); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w * 0.5, h * 0.52); c.rotate(rot); c.scale(sc, sc); c.translate(-fx, -fy);
    function line(wd, col, dash, off) { c.beginPath(); for (var j = 0; j <= N; j++) { var k2 = j % N, o = off || 0, x = P[k2][0] + tr.nx[k2] * o, y = P[k2][1] + tr.ny[k2] * o; if (j) c.lineTo(x, y); else c.moveTo(x, y); } c.lineWidth = wd; c.strokeStyle = col; c.setLineDash(dash || []); c.lineCap = "butt"; c.lineJoin = "round"; c.stroke(); c.setLineDash([]); }
    tr.deco.forEach(function (dc) { if (dc.t === "pond") { c.save(); c.translate(dc.x, dc.y); c.rotate(dc.a); c.fillStyle = "#3aa6e8"; c.beginPath(); c.ellipse(0, 0, dc.w, dc.h, 0, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(-dc.w * 0.25, -dc.h * 0.3, dc.w * 0.4, dc.h * 0.14, 0, 0, 7); c.fill(); c.restore(); } });
    line((tr.hw + WALL) * 2 + 16, "rgba(0,0,0,.28)"); line((tr.hw + WALL) * 2, "#2b2f3c"); line((tr.hw + KERB) * 2, "#e8e8ee"); line((tr.hw + KERB) * 2 - 10, "#e0203f", [34, 34]); line(tr.hw * 2, tr.pal.road[0]); line(5, "rgba(255,255,255,.55)", [28, 34]);
    for (var gi in tr.gap) { var gk = +gi; c.save(); c.translate(P[gk][0], P[gk][1]); c.rotate(tr.ta[gk]); c.fillStyle = "#3aa6e8"; c.fillRect(-14, -(tr.hw + WALL + 240), 28, 2 * (tr.hw + WALL + 240)); c.restore(); }
    tr.trees.forEach(function (tt) { if (tt.sand) return; if (tt.b) { c.fillStyle = tr.pal.tree[tt.c % 3]; c.fillRect(tt.x - tt.w, tt.y - tt.d, tt.w * 2, tt.d * 2); c.fillStyle = NEON[tt.a % 4]; c.fillRect(tt.x - tt.w, tt.y - tt.d, tt.w * 2, 5); return; } var tc = tr.pal.tree[tt.c % 3]; c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.arc(tt.x + 10, tt.y + 14, tt.s * 0.8, 0, 7); c.fill(); c.fillStyle = tc; c.beginPath(); c.arc(tt.x, tt.y, tt.s * 0.8, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.16)"; c.beginPath(); c.arc(tt.x - tt.s * 0.25, tt.y - tt.s * 0.25, tt.s * 0.4, 0, 7); c.fill(); });
    var a0 = tr.ta[0], sx0 = P[0][0], sy0 = P[0][1]; c.save(); c.translate(sx0, sy0); c.rotate(a0); for (var cc = 0; cc < 8; cc++) for (var rr = 0; rr < 2; rr++) { c.fillStyle = (cc + rr) % 2 ? "#fff" : "#111"; c.fillRect(rr * 14 - 14, -tr.hw + cc * (tr.hw * 2 / 8), 14, tr.hw * 2 / 8); } c.restore();
    tr.items.forEach(function (it) { if (it.t === "oil" || it.t === "water") { c.fillStyle = it.t === "oil" ? "#0b0a12" : "#2f8fd8"; c.beginPath(); c.ellipse(it.x, it.y, 34, 26, tr.ta[it.idx], 0, 7); c.fill(); } else if (it.t !== "jump") { c.fillStyle = it.t === "turbo" ? "#c77bff" : "#ffd23b"; c.save(); c.translate(it.x, it.y); c.rotate(tr.ta[it.idx]); c.fillRect(-22, -22, 44, 44); c.restore(); } });
    c.restore();
    if (tr.night) { c.fillStyle = "rgba(10,10,50,.28)"; c.fillRect(0, 0, w, h); }
    var vg = c.createLinearGradient(0, 0, w, 0); vg.addColorStop(0, "rgba(8,4,20,.82)"); vg.addColorStop(0.55, "rgba(8,4,20,.35)"); vg.addColorStop(1, "rgba(8,4,20,.1)"); c.fillStyle = vg; c.fillRect(0, 0, w, h);
    var vg2 = c.createRadialGradient(w * 0.8, h * 0.2, 10, w * 0.8, h * 0.2, w * 0.7); vg2.addColorStop(0, "rgba(255,255,255,.16)"); vg2.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = vg2; c.fillRect(0, 0, w, h);
    return cv;
  }
  var RL = lsGet("arc_race4_laps") || 3, RD = lsGet("arc_race4_diff"); if (RD == null || RD < 0 || RD > 3) RD = 1;
  function open(host, onExit) {
    var root = el("div", "rc-root"); host.appendChild(root);
    function hook(fn) { window.ArcadeBackHook = fn; try { if (window.ArcadeBackSync) window.ArcadeBackSync(); } catch (e) {} }
    function top(title, back, label) { var t0 = el("div", "mp-top"), bk = el("button", "mp-back", label || "‹ Indietro"); bk.type = "button"; bk.addEventListener("click", back); t0.appendChild(bk); t0.appendChild(el("div", "mp-title", title)); root.appendChild(t0); return t0; }
    function exitAll() { root.remove(); hook(null); onExit(); }
    function thumb(tr) { if (!tr._th) { build(tr); try { tr._th = art(tr).toDataURL("image/jpeg", 0.82); } catch (e) { tr._th = ""; } } return tr._th; }
    function hero(cls, tri, ico, ttl, sub, tag, fn) {                                                        // grande scheda con il disegno della pista sullo sfondo
      var c = el("button", "rc-hero " + cls); c.type = "button"; var im = el("img", "bg"); im.src = thumb(TRACKS[tri]); im.alt = ""; c.appendChild(im); c.appendChild(el("div", "sh"));
      var tx = el("div", "tx"); tx.appendChild(el("i", "", ico)); var bx = el("div", "bx"); bx.appendChild(el("b", "", ttl)); bx.appendChild(el("span", "", sub)); tx.appendChild(bx); c.appendChild(tx); c.appendChild(el("em", "", tag)); c.addEventListener("click", fn); root.appendChild(c); return c;
    }
    var lastAct = {};
    function act(k) { try { if (!real() || (lastAct[k] && Date.now() - lastAct[k] < 15000)) return; lastAct[k] = Date.now(); A.api("/api/act", "POST", { a: k }).catch(function () {}); } catch (e) {} }
    function menu() {
      act("gp");
      root.innerHTML = ""; root.className = "rc-root home"; hook(function () { exitAll(); return true; });
      top("GRAND PRIX", exitAll, "‹ Multi");
      hero("h1", 0, "👤", "SINGOLO", "Contro il tempo, col fantasma del tuo record e le classifiche", TRACKS.length + " PISTE", function () { tracks("single"); });
      hero("h2", 4, "🏁", "LOBBY", "Crea una lobby o entra in una aperta: fino a 8 piloti", "MULTIPLAYER", function () { lobbyHub(); });
      hero("h3", 5, "⚡", "GARA RAPIDA", "Subito in pista contro 3 bot, senza preparare nulla", "VS BOT", function () { tracks("race"); });
    }
    // ---------------- lobby (prototipo) ----------------
    var LB = null, FRIENDS = ["Marco", "Spoleto", "maicol", "Lorenzo", "albe", "Gabbo"];
    function myNm() { try { return window.ArcadeMulti.myName(); } catch (e) { return "Tu"; } }
    function lbCols(L) {                                                                                           // colori: l'host ha il suo; gli altri tengono quello scelto (se libero), altrimenti il primo libero
      var me = (L.col | 0) % 8, used = {}, idx = [me], sl = L.slots, i, nx = 0; used[me] = 1;
      for (i = 1; i < sl.length; i++) { var c = sl[i].col; if (c != null && c >= 0 && c < 8 && !used[c]) { used[c] = 1; idx[i] = c; } }
      for (i = 1; i < sl.length; i++) if (idx[i] == null) { while (used[nx] && nx < 7) nx++; used[nx] = 1; idx[i] = nx; }
      return idx.map(function (c) { return COLS[c]; });
    }
    function newLobby() { return { col: 0, ti: 0, laps: 3, diff: 3, vis: 1, tab: 0, obst: true, pads: true, slip: false, assist: false, qual: false, coll: true, prize: 0, slots: [{ t: "me", name: myNm() }] }; }
    function lobbyHub() {
      act("gp_lobby");
      root.innerHTML = ""; root.className = "rc-root"; hook(function () { menu(); return true; });
      top("LOBBY", menu, "‹ Grand Prix");
      var mk = el("button", "rc-hero h4 slim"); mk.type = "button"; var im = el("img", "bg"); im.src = thumb(TRACKS[3]); mk.appendChild(im); mk.appendChild(el("div", "sh")); var tx = el("div", "tx"); tx.appendChild(el("i", "", "＋")); var bx = el("div", "bx"); bx.appendChild(el("b", "", "CREA LOBBY")); bx.appendChild(el("span", "", "Scegli pista, giri, regole, bot e invita i tuoi amici")); tx.appendChild(bx); mk.appendChild(tx);
      mk.addEventListener("click", function () { LB = newLobby(); lobby(); }); root.appendChild(mk);
      root.appendChild(el("div", "rc-sec", "LOBBY APERTE"));
      if (real()) {
        var invBox = el("div", "gl-inv"); root.appendChild(invBox);
        var hubT = 0, paintHub = function (open, mine) {
          invBox.innerHTML = ""; var seen = {}, rows = 0;
          (mine || []).filter(function (r) { return r.game === "race" && r.host === r.me && r.status === "lobby"; }).forEach(function (r) {   // la mia lobby ancora aperta: si rientra
            seen[r.id] = 1; rows++; var row = el("div", "lb-open mine"), d = el("div", "d"); d.appendChild(el("b", "", "↩ La tua lobby è ancora aperta")); d.appendChild(el("span", "", r.players.length + " piloti" + (r.away ? " · si chiude fra " + r.away + " s" : ""))); row.appendChild(el("i", "lbi", "🏁")); row.appendChild(d);
            var g = el("button", "lb-j", "RIENTRA"); g.type = "button"; g.addEventListener("click", function () { A.api("/api/room/rejoin", "POST", { id: r.id }).then(function (k) { if (k && k.success) { if (!LB || LB.rm !== r.id) LB = lbFromRoom(k.room); LB.grace = 0; lobby(); } else A.toast((k && k.error) || "La lobby non c'è più"); }).catch(function (e) { A.toast((e && e.message) || "La lobby non c'è più"); }); }); row.appendChild(g); invBox.appendChild(row); });
          (open || []).concat((mine || []).filter(function (r) { return r.game === "race" && !(r.players || []).some(function (q) { return q.uid === r.me; }); })).forEach(function (r) {
            if (seen[r.id]) return; seen[r.id] = 1; rows++;
            var t3 = TRACKS.filter(function (t) { return t.id === r.cfg.track; })[0] || TRACKS[1], row = el("div", "lb-open"), im3 = el("img"); im3.src = thumb(t3); row.appendChild(im3); var d = el("div", "d"), hp = r.players.filter(function (q) { return q.uid === r.host; })[0] || r.players[0] || {};
            d.appendChild(el("b", "", "Lobby di " + (hp.name || "un amico"))); d.appendChild(el("span", "", t3.name + " · " + r.cfg.laps + " giri" + ((r.cfg.x || {}).qual ? " · qualifica" : "") + (r.cfg.prize ? " · premio " + A.fmt(r.cfg.prize) : ""))); row.appendChild(d); row.appendChild(el("em", "", r.players.length + "/" + (r.cfg.max || 8)));
            var g = el("button", "lb-j", "ENTRA"); g.type = "button"; g.addEventListener("click", function () { A.api("/api/room/join", "POST", { id: r.id }).then(function (k) { if (k && k.success) guestLobby(k.room); else A.toast((k && k.error) || "Non riesco a entrare"); }).catch(function (e) { A.toast((e && e.message) || "Non riesco a entrare"); }); }); row.appendChild(g); invBox.appendChild(row); });
          if (!rows) invBox.appendChild(el("div", "rc-note", "Nessuna lobby aperta al momento: creane una tu, la vedranno tutti."));
        }, loadHub = function () {
          if (!root.isConnected || !invBox.isConnected) { clearInterval(hubT); return; }
          Promise.all([A.api("/api/room/open", "GET").catch(function () { return null; }), A.api("/api/room/mine", "GET").catch(function () { return null; })]).then(function (a) {
            if (!root.isConnected || !invBox.isConnected) return; paintHub(a[0] && a[0].success ? a[0].rooms : [], a[1] && a[1].success ? a[1].rooms : []);
          });
        };
        loadHub(); hubT = setInterval(loadHub, 3000);
      }
      var op = A.isSandbox() ? [["Marco", 2, 3, 4], ["Spoleto", 4, 5, 6], ["Gabbo", 0, 3, 2], ["albe", 5, 7, 3]] : [];                       // lobby di esempio: solo nell'account di prova
      if (!op.length && !real()) root.appendChild(el("div", "rc-note", "Nessuna lobby aperta al momento: creane una tu e invita gli amici."));
      op.forEach(function (o) { var r = el("div", "lb-open"), im2 = el("img"); im2.src = thumb(TRACKS[o[1]]); r.appendChild(im2); var d = el("div", "d"); d.appendChild(el("b", "", "Lobby di " + o[0])); d.appendChild(el("span", "", TRACKS[o[1]].name + " · " + o[2] + " giri")); r.appendChild(d); r.appendChild(el("em", "", o[3] + "/8")); var g = el("button", "lb-j", "ENTRA"); g.type = "button"; g.addEventListener("click", function () { A.toast("Prototipo: le lobby aperte arriveranno col server vero"); }); r.appendChild(g); root.appendChild(r); });
      if (A.isSandbox()) root.appendChild(el("div", "rc-note", "Qui vedrai le lobby pubbliche dei tuoi amici e di tutti. Per ora sono esempi: la lobby che crei tu funziona davvero, con bot e amici finti."));
    }
    function palette() {                                                                                               // fumetto con gli 8 colori: quelli già presi sono bloccati
      var L = LB, cols = lbCols(L), taken = cols.filter(function (c, i) { return i > 0; }), ov = el("div", "lb-pal-ov"), bx = el("div", "lb-pal");
      bx.appendChild(el("b", "", "COLORE DELLA TUA AUTO")); var gr = el("div", "lb-cols");
      COLS.forEach(function (cl, n) { var b = el("button", "lb-col" + ((L.col | 0) === n ? " on" : "") + (taken.indexOf(cl) >= 0 ? " busy" : "")); b.type = "button"; b.style.background = cl; if (taken.indexOf(cl) >= 0) b.appendChild(el("u", "", "✕"));
        b.addEventListener("click", function () { if (taken.indexOf(cl) >= 0) { A.toast("Colore già occupato da un altro pilota"); return; } L.col = n; ov.remove(); lobby(); }); gr.appendChild(b); });
      bx.appendChild(gr); bx.appendChild(el("span", "lb-pal-n", "Quelli con ✕ sono già presi")); ov.appendChild(bx); ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); }); root.appendChild(ov);
    }
    function lobby(reset) {
      var L = LB, sc0 = !reset && root.querySelector(".lb-body"), sct = sc0 ? sc0.scrollTop : 0; root.innerHTML = ""; root.className = "rc-root lobby"; var exitL = function () { if (real() && L.rm) { A.api("/api/room/leave", "POST", { id: L.rm, grace: 1 }).catch(function () {}); if (L._pt) { clearInterval(L._pt); L._pt = 0; } L.grace = Date.now() + 15000; setTimeout(function () { if (LB === L && L.grace && Date.now() >= L.grace - 200) { LB = null; } }, 15500); } lobbyHub(); }; hook(function () { exitL(); return true; });   // l'host che esce chiude la lobby: gli inviti spariscono
      var tp = top("LOBBY", exitL, "‹ Esci");
      var tabs = el("div", "lb-tabs"); ["👥 GIOCATORI " + L.slots.length + "/8", "🛠 PISTA & REGOLE"].forEach(function (nm, i) { var b = el("button", "lb-tab" + (L.tab === i ? " on" : ""), nm); b.type = "button"; b.addEventListener("click", function () { L.tab = i; lobby(true); }); tabs.appendChild(b); }); root.appendChild(tabs);
      var body = el("div", "lb-body"); root.appendChild(body);
      if (L.tab === 0) {
        var list = el("div", "lb-slots");
        for (var i = 0; i < 8; i++) { (function (i) { var sl = L.slots[i], r = el("div", "lb-slot" + (sl ? "" : " free")); r.appendChild(el("u", "", String(i + 1))); var dot = el(sl && sl.t === "me" ? "button" : "i", "dot" + (sl && sl.t === "me" ? " pick" : "")); dot.style.background = sl ? lbCols(L)[i] : "transparent"; if (sl && sl.t === "me") { dot.type = "button"; dot.addEventListener("click", function () { palette(); }); } r.appendChild(dot);
          if (!sl) { r.appendChild(el("span", "n", "libero")); var pl = el("button", "lb-plus", "＋"); pl.type = "button"; pl.addEventListener("click", function () { slotMenu(); }); r.appendChild(pl); } else { var av = el("div", "avatar rav lbav"); if (sl.t === "bot") av.textContent = "🤖"; else { try { A.styleAvatar(av, sl.t === "me" ? ((A.me && A.me().style) || {}) : (sl.style || {}), (sl.name || "?").charAt(0).toUpperCase()); } catch (e) { av.textContent = (sl.name || "?").charAt(0); } } var nn = el("span", "n"); if (sl.t === "bot") nn.textContent = sl.name; else nn.appendChild(A.nameEl(sl.name, sl.t === "me" ? ((A.me && A.me().style) || {}) : (sl.style || {}))); r.appendChild(nn); var stt = sl.t === "me" ? ["me", "LEADER"] : (sl.t === "bot" ? ["bot", "BOT · " + DIFF[L.diff].n] : (sl.t === "wait" ? ["wait", "INVITATO…"] : (sl.on === false ? ["off", "OFFLINE"] : (sl.rdy ? ["rdy", "PRONTO"] : ["on", "ONLINE"])))); r.appendChild(el("em", stt[0], stt[1])); if (sl.t !== "me") { var x = el("button", "lb-x", "✕"); x.type = "button"; x.addEventListener("click", function () { if (sl.uid && real() && L.rm) A.api("/api/room/kick", "POST", { id: L.rm, uid: sl.uid }).catch(function () {}); L.slots.splice(i, 1); lobby(); }); r.appendChild(x); } }
          list.appendChild(r); })(i); }
        body.appendChild(list);
        var dr = el("div", "lb-row col"); dr.appendChild(el("span", "", "DIFFICOLTÀ BOT")); var chips = el("div", "lb-chips"); DIFF.forEach(function (df, n) { var b = el("button", "mp-gt wide" + (L.diff === n ? " on" : ""), df.n); b.type = "button"; b.addEventListener("click", function () { L.diff = n; lobby(); }); chips.appendChild(b); }); dr.appendChild(chips); body.appendChild(dr);
        body.appendChild(el("div", "rc-note", L.diff === 3 ? "Campione: i bot girano come il TUO record su questa pista (col server: come il miglior giro di tutti)." : "Nelle lobby pubbliche i bot li decide chi crea la lobby: puoi giocare solo con persone, solo con bot o misto."));
      } else {
        var th = el("div", "lb-tr"); TRACKS.forEach(function (tr, i) { var b = el("button", "lb-t" + (L.ti === i ? " on" : "")); b.type = "button"; var im = el("img"); im.src = thumb(tr); b.appendChild(im); b.appendChild(el("span", "", tr.name)); b.addEventListener("click", function () { L.ti = i; lobby(); }); th.appendChild(b); }); body.appendChild(th); 
        var lr = el("div", "lb-row"); lr.appendChild(el("span", "", "GIRI")); var lapv = el("b", "lb-lapv", String(L.laps)); lr.appendChild(slider((L.laps - 1) / 14, function (v) { L.laps = 1 + Math.round(v * 14); lapv.textContent = String(L.laps); clearTimeout(L._lt); L._lt = setTimeout(function () { if (LB === L) rmPush(); }, 400); }, 15)); lr.appendChild(lapv); body.appendChild(lr);
        var tg = el("div", "lb-tg");
        [["obst", "💧", "Ostacoli", "Pozze d'acqua e olio"], ["pads", "⚡", "Boost a terra", "Pedane acceleranti"], ["slip", "💨", "Scia", "Stando dietro prendi velocità"], ["assist", "🤝", "Aiuto ultimi", "Chi è indietro va un po' più forte"], ["coll", "💥", "Contatti", "Le auto si toccano e si spingono"], ["qual", "⏱", "Qualifica", "Giro lanciato che decide la griglia"]].forEach(function (o) {
          var r = el("button", "lb-tog" + (L[o[0]] ? " on" : "")); r.type = "button"; r.appendChild(el("i", "", o[1])); var d = el("div", "d"); d.appendChild(el("b", "", o[2])); d.appendChild(el("span", "", o[3])); r.appendChild(d); r.appendChild(el("u", "sw")); r.addEventListener("click", function () { L[o[0]] = !L[o[0]]; lobby(); }); tg.appendChild(r); });
        body.appendChild(tg);
        var wr = el("div", "lb-row"); wr.appendChild(el("span", "", "METEO")); var cw = el("div", "lb-chips"); [[0, "☀️ Sereno"], [1, "🌦 Leggera"], [2, "🌧 Forte"]].forEach(function (m) { var b = el("button", "mp-gt wide" + ((L.rain | 0) === m[0] ? " on" : ""), m[1]); b.type = "button"; b.addEventListener("click", function () { L.rain = m[0]; lobby(); }); cw.appendChild(b); }); wr.appendChild(cw); body.appendChild(wr);
        var hum = L.slots.filter(function (x) { return x.t === "friend" || x.t === "wait"; }).length > 0; if (!hum && L.prize) L.prize = 0;
        var pr2 = el("div", "lb-row"); pr2.appendChild(el("span", "", "💰 PREMIO")); var c3 = el("div", "lb-chips"); [0, 500, 1000, 2000].forEach(function (n) { var b = el("button", "mp-gt wide" + (L.prize === n ? " on" : ""), n ? A.fmt(n) : "NO"); b.type = "button"; if (n && !hum) b.disabled = true; b.addEventListener("click", function () { L.prize = n; lobby(); }); c3.appendChild(b); }); pr2.appendChild(c3); body.appendChild(pr2);
        body.appendChild(el("div", "rc-note", hum ? (L.prize ? "Pagati dal Banco: 1° " + A.fmt(L.prize) + " · 2° " + A.fmt(Math.round(L.prize * 0.75)) + " · 3° " + A.fmt(Math.round(L.prize * 0.5)) + " $SDG dal Banco" : "Scegli un premio per i primi tre classificati") : "Il premio si attiva solo se in lobby c'è almeno un giocatore vero (con i soli bot non c'è)."));
        var vr = el("div", "lb-row"); vr.appendChild(el("span", "", "VISIBILITÀ")); var c4 = el("div", "lb-chips"); ["Su invito", "Pubblica"].forEach(function (nm, n) { var b = el("button", "mp-gt wide" + (L.vis === n ? " on" : ""), nm); b.type = "button"; b.addEventListener("click", function () { L.vis = n; lobby(); }); c4.appendChild(b); }); vr.appendChild(c4); body.appendChild(vr);
      }
      var actN = L.slots.filter(function (x) { return x.t !== "wait"; }).length, frs = L.slots.filter(function (x) { return x.t === "friend"; }), pend = frs.filter(function (x) { return x.on !== false && !x.rdy; });
      var go = el("button", "mp-go lb-go", "▶ AVVIA GARA · " + actN + " piloti" + (L.qual ? " · con qualifica" : "")); go.type = "button"; go.disabled = actN < 2 || pend.length > 0;
      if (actN < 2) go.textContent = "Servono almeno 2 piloti: aggiungi un bot o invita un amico"; else if (pend.length) go.textContent = "In attesa che siano pronti: " + pend.slice(0, 3).map(function (x) { return x.name; }).join(", ");
      go.addEventListener("click", function () {
        var act = L.slots.filter(function (x) { return x.t !== "wait"; }), o = { n: act.length, roster: act.map(function (x, i) { return { name: x.name, col: lbCols({ col: L.col, slots: act })[i] }; }), diff: L.diff, laps: L.laps, obst: L.obst, pads: L.pads, slip: L.slip, assist: L.assist, coll: L.coll, rain: L.rain, qual: L.qual, prize: L.prize, back: lobby };
        if (L.qual) o.qualPhase = true;
        var hum = L.slots.filter(function (x) { return x.t === "friend" && x.uid; });
        if (real() && L.rm && hum.length) { A.api("/api/room/start", "POST", { id: L.rm }).then(function (j) { if (j && j.success) { clearInterval(L._pt); L._pt = 0; runRoom(j.room); } else A.toast((j && j.error) || "Non riesco ad avviare"); }).catch(function () { A.toast("Server non raggiungibile"); }); return; }
        if (real() && L.rm) { A.api("/api/room/leave", "POST", { id: L.rm }).catch(function () {}); if (L._pt) { clearInterval(L._pt); L._pt = 0; } L.rm = 0; L._ens = 0; }   // gara solo con bot: la lobby online si chiude
        race(TRACKS[L.ti], "race", o);
      });
      root.appendChild(go); body.scrollTop = sct; if (real()) { if (!L.rm) { if (!L._ens) { L._ens = 1; rmEnsure(function (ok) { if (ok && LB === L) { rmPush(); rmWatch(); } else L._ens = 0; }); } } else { rmPush(); rmWatch(); } }
    }
    // ---------- stanze online (account vero): invito dal server, lobby condivisa, auto degli altri in tempo reale ----------
    function real() { return !isSbx(); }
    function rmCfg(L) { return { track: TRACKS[L.ti].id, laps: L.laps, prize: L.prize | 0, max: 8, x: { rain: L.rain | 0, obst: L.obst ? 1 : 0, pads: L.pads ? 1 : 0, slip: L.slip ? 1 : 0, coll: L.coll ? 1 : 0, qual: L.qual ? 1 : 0, vis: L.vis ? 1 : 0, hcol: L.col | 0 } }; }
    function rmEnsure(cb) {
      var L = LB; if (L.rm) return cb(true);
      A.api("/api/room/create", "POST", { game: "race", cfg: rmCfg(L) }).then(function (j) { if (j && j.success) { L.rm = j.room.id; cb(true); } else { A.toast((j && j.error) || "Impossibile creare la lobby online"); cb(false); } }).catch(function () { A.toast("Server non raggiungibile"); cb(false); });
    }
    function rmPush() { var L = LB; if (L && L.rm && real()) A.api("/api/room/cfg", "POST", { id: L.rm, cfg: rmCfg(L) }).catch(function () {}); }
    function lbFromRoom(room) {                                                                                    // ricostruisce la lobby dell'host da quella sul server (rientro dopo aver chiuso l'app)
      var L = newLobby(), c = room.cfg || {}, x = c.x || {}; L.rm = room.id; L.ti = Math.max(0, TRACKS.findIndex(function (t) { return t.id === c.track; })); L.laps = c.laps || 3; L.prize = c.prize | 0; L.rain = x.rain | 0; L.obst = !!x.obst; L.pads = !!x.pads; L.slip = !!x.slip; L.coll = x.coll !== 0; L.qual = !!x.qual; L.vis = x.vis === 0 ? 0 : 1; L.col = x.hcol | 0;
      room.players.forEach(function (p) { if (p.uid !== room.me) L.slots.push({ t: "friend", name: p.name, style: p.style, pid: p.pid, uid: p.uid, human: true, on: p.online, rdy: p.ready, col: p.col }); }); return L;
    }
    function rmWatch() {                                                                                            // l'host segue la stanza: chi entra (anche senza invito), chi esce, chi è online / pronto
      var L = LB; if (!L || !L.rm || L._pt) return; var busy = 0;
      L._pt = setInterval(function () {
        if (LB !== L || !root.isConnected || !root.querySelector(".lb-body")) { clearInterval(L._pt); L._pt = 0; return; }
        if (busy && Date.now() - busy < 4000) return; busy = Date.now();
        A.api("/api/room/sync", "POST", { id: L.rm, since: 1e9 }).then(function (j) {
          busy = 0; if (LB !== L || !L.rm) return;
          if (j && j.gone) { clearInterval(L._pt); L._pt = 0; L.rm = 0; L._ens = 0; L.slots = [L.slots[0]]; lobby(); return; }
          if (!j || !j.success || !j.room) return; var rm = j.room;
          if (rm.status !== "lobby") { clearInterval(L._pt); L._pt = 0; L.rm = 0; L._ens = 0; L.slots = [L.slots[0]]; lobby(); return; }
                    rm.players.forEach(function (p) {
            if (p.uid === rm.me) return; var sl = L.slots.filter(function (q) { return q.uid === p.uid || (q.pid && q.pid === p.pid && q.t !== "bot"); })[0];
            if (!sl) { if (L.slots.length >= 8) return; sl = { t: "friend", name: p.name, style: p.style, pid: p.pid, human: true }; L.slots.push(sl); A.haptic("ok"); }
            else if (sl.t === "wait") { sl.t = "friend"; A.haptic("ok"); }
            sl.uid = p.uid; sl.on = p.online; sl.rdy = p.ready; sl.col = p.col;
          });
          L.slots = L.slots.filter(function (sl) { return sl.t !== "friend" || !sl.uid || rm.players.some(function (p) { return p.uid === sl.uid; }); });
          var sig2 = rm.players.map(function (p) { return p.uid + (p.online ? "o" : "x") + (p.ready ? "r" : "-") + (p.col == null ? "" : p.col); }).join(",") + "|" + L.slots.length;
          if (sig2 !== L._sig) { L._sig = sig2; if (LB === L) lobby(); }
        }).catch(function () { busy = 0; });
      }, 1200);
    }
        function afterRace(room) {                                                                                       // finita la gara si resta nella stessa lobby: tutti "non pronti", si riparte quando lo sono
      root.innerHTML = ""; root.className = "rc-root lobby"; var lv = function () { A.api("/api/room/leave", "POST", { id: room.id }).catch(function () {}); lobbyHub(); }; hook(function () { lv(); return true; }); top("LOBBY", lv, "‹ Esci");
      var nt = el("div", "rc-note", "Torno alla lobby…"); root.appendChild(nt); var tries = 0;
      (function go() {
        if (!root.isConnected || !nt.isConnected) return;
        A.api("/api/room/rematch", "POST", { id: room.id, round: room.round | 0 }).then(function (k) {
          if (!root.isConnected || !nt.isConnected) return;
          if (k && k.wait) { nt.textContent = "Aspetto che tutti finiscano la gara…"; setTimeout(go, 1500); return; }
          if (!k || !k.success) { A.toast("La lobby non c'è più"); lobbyHub(); return; }
          if (k.room.host === k.room.me) { LB = lbFromRoom(k.room); LB._ens = 1; lobby(); } else guestLobby(k.room);
        }).catch(function () { if (++tries < 3) { setTimeout(go, 1200); return; } A.toast("La lobby è già ripartita o chiusa"); lobbyHub(); });
      })();
    }
    function runRoom(room, back, order, n0) {                                                                      // parte la gara online: stessa pista, stesso ordine in griglia per tutti
      var ps = order ? order.map(function (u) { return room.players.filter(function (p) { return p.uid === u; })[0] || { uid: u, name: "Pilota" }; }) : room.players, x = room.cfg.x || {};
      var mei = Math.max(0, ps.findIndex(function (p) { return p.uid === room.me; })), cols = lbCols({ col: x.hcol | 0, slots: ps });
      var ord = [mei].concat(ps.map(function (p, i) { return i; }).filter(function (i) { return i !== mei; }));
      var roster = ord.map(function (i) { return { name: ps[i].name, col: cols[i], uid: ps[i].uid }; }), grid = [], map = {};
      ord.forEach(function (ci, ck) { grid[ci] = ck; if (ck) map[ck] = ps[ci].uid; });
      var tr = TRACKS.filter(function (t) { return t.id === room.cfg.track; })[0] || TRACKS[1]; build(tr);
      race(tr, "race", { n: ps.length, roster: roster, grid: grid, laps: room.cfg.laps || 3, obst: !!x.obst, pads: !!x.pads, slip: !!x.slip, coll: x.coll !== 0, assist: false, rain: x.rain | 0, prize: room.cfg.prize | 0, diff: 1, qualPhase: !!x.qual, room: { id: room.id, uid: room.me, map: map, since: n0 != null ? n0 : (room.n || 0), rtt: 1e9, off: 0, q: [], sy: room.sy || {}, pl: room.players }, back: back || function () { afterRace(room); }, exit: function () { A.api("/api/room/leave", "POST", { id: room.id }).catch(function () {}); lobbyHub(); } });
    }
    function guestLobby(room) {                                                                                    // lobby di chi è entrato (invitato o dalla lista pubblica): segna PRONTO e aspetta che l'host avvii
      root.innerHTML = ""; root.className = "rc-root lobby"; var since = room.n || 0, alive = true, trk = TRACKS.filter(function (t) { return t.id === room.cfg.track; })[0] || TRACKS[1], busy = 0, myRdy = false, lastRm = room;
      function leave() { alive = false; clearInterval(pt); A.api("/api/room/leave", "POST", { id: room.id }).catch(function () {}); lobbyHub(); }
      hook(function () { leave(); return true; }); top("LOBBY", leave, "‹ Esci");
      var info = el("div", "mp-card gl-info"); root.appendChild(info); var list = el("div", "lb-slots"); root.appendChild(list); var note = el("div", "rc-note", ""); root.appendChild(note);
      var rb = el("button", "mp-go lb-go", "✔ SONO PRONTO"); rb.type = "button"; root.appendChild(rb);
      rb.addEventListener("click", function () { myRdy = !myRdy; rb.classList.toggle("on", myRdy); rb.textContent = myRdy ? "✔ PRONTO · tocca per annullare" : "✔ SONO PRONTO"; A.haptic("light"); A.api("/api/room/ready", "POST", { id: room.id, ready: myRdy }).then(function (k) { if (k && k.success) paint(k.room); }).catch(function () {}); });
      function paint(rm) {
        lastRm = rm; var t2 = TRACKS.filter(function (t) { return t.id === rm.cfg.track; })[0] || trk; info.innerHTML = ""; info.appendChild(el("b", "", "🏁 " + t2.name)); var xx = rm.cfg.x || {}; info.appendChild(el("span", "", rm.cfg.laps + " giri" + (xx.qual ? " · con qualifica" : "") + (rm.cfg.prize ? " · premio " + A.fmt(rm.cfg.prize) + " $SDG" : "") + " · " + ["sereno", "leggera", "forte"][xx.rain | 0] + (xx.obst ? " · ostacoli" : "") + (xx.pads ? " · boost" : "") + (xx.slip ? " · scia" : "")));
        list.innerHTML = ""; var cols = lbCols({ col: xx.hcol | 0, slots: rm.players }), mp = rm.players.filter(function (p) { return p.uid === rm.me; })[0]; if (mp) myRdy = !!mp.ready;
        rm.players.forEach(function (p, i) { var r = el("div", "lb-slot"); r.appendChild(el("u", "", String(i + 1))); var mine = p.uid === rm.me, d = el(mine ? "button" : "i", "dot" + (mine ? " pick" : "")); d.style.background = cols[i]; if (mine) { d.type = "button"; d.addEventListener("click", function () { guestPalette(rm, cols); }); } r.appendChild(d); var nn = el("span", "n"); nn.appendChild(A.nameEl(p.name, p.style || {})); r.appendChild(nn);
          var st = p.uid === rm.host ? ["me", "LEADER"] : (p.online === false ? ["off", "OFFLINE"] : (p.ready ? ["rdy", p.uid === rm.me ? "TU · PRONTO" : "PRONTO"] : ["on", p.uid === rm.me ? "TU" : "ONLINE"])); r.appendChild(el("em", st[0], st[1])); list.appendChild(r); });
        rb.classList.toggle("on", myRdy); rb.textContent = myRdy ? "✔ PRONTO · tocca per annullare" : "✔ SONO PRONTO";
        note.textContent = rm.away ? "⚠ L'host è uscito: la lobby si chiude fra " + rm.away + " s se non rientra" : (myRdy ? "Sei pronto: aspetta che l'host avvii la gara…" : "Tocca PRONTO quando vuoi partire: l'host può avviare solo se sono tutti pronti");
      }
      function guestPalette(rm, cols) {                                                                              // l'ospite sceglie il colore della sua auto (quelli degli altri sono bloccati)
        var mi = rm.players.findIndex(function (p) { return p.uid === rm.me; }), taken = cols.filter(function (c, i) { return i !== mi; }), ov = el("div", "lb-pal-ov"), bx = el("div", "lb-pal"), gr = el("div", "lb-cols");
        bx.appendChild(el("b", "", "COLORE DELLA TUA AUTO"));
        COLS.forEach(function (cl, n) { var b = el("button", "lb-col" + (cols[mi] === cl ? " on" : "") + (taken.indexOf(cl) >= 0 ? " busy" : "")); b.type = "button"; b.style.background = cl; if (taken.indexOf(cl) >= 0) b.appendChild(el("u", "", "✕"));
          b.addEventListener("click", function () { if (taken.indexOf(cl) >= 0) { A.toast("Colore già occupato da un altro pilota"); return; } ov.remove(); A.api("/api/room/color", "POST", { id: room.id, col: n }).then(function (k) { if (k && k.success) paint(k.room); }).catch(function () {}); }); gr.appendChild(b); });
        bx.appendChild(gr); bx.appendChild(el("span", "lb-pal-n", "Quelli con ✕ sono già presi")); ov.appendChild(bx); ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); }); root.appendChild(ov);
      }
      paint(room);
      var pt = setInterval(function () {
        if (!alive || !root.isConnected) { clearInterval(pt); return; } if (busy && Date.now() - busy < 4000) return; busy = Date.now();
        A.api("/api/room/sync", "POST", { id: room.id, since: since }).then(function (j) {
          busy = 0; if (!alive || !j) return;
          if (j.gone) { alive = false; clearInterval(pt); A.toast("La lobby è stata chiusa"); lobbyHub(); return; }
          if (!j.success) { if (/stanza/i.test(j.error || "")) { alive = false; clearInterval(pt); A.toast("Sei stato tolto dalla lobby"); lobbyHub(); } return; }
          since = j.n; paint(j.room);
          var st = (j.events || []).filter(function (e) { return e.k === "start"; })[0];
          if (st || j.room.status === "run") { alive = false; clearInterval(pt); runRoom(j.room, lobbyHub, st ? st.order : null, j.n); }
        }).catch(function (e) { busy = 0; if (e && e.status === 403 && alive) { alive = false; clearInterval(pt); A.toast("Sei stato tolto dalla lobby"); lobbyHub(); } });
      }, 800);
    }
    function slotMenu() {                                                                                           // il "+" di un posto libero: invita un amico o aggiungi un bot
      var L = LB; if (L.slots.length >= 8) return; var ov = el("div", "lb-pal-ov"), bx = el("div", "lb-pal sm");
      bx.appendChild(el("b", "", "AGGIUNGI AL POSTO LIBERO"));
      [["👥 Invita un amico", function () { inviteSheet(); }], ["🤖 Aggiungi un bot", function () { L.slots.push({ t: "bot", name: NAMES[L.slots.length % 8] }); lobby(); }], ["🤖🤖 Riempi tutti i posti con bot", function () { while (L.slots.length < 8) L.slots.push({ t: "bot", name: NAMES[L.slots.length % 8] }); lobby(); }]].forEach(function (a) {
        var b = el("button", "mp-go lb-smb", a[0]); b.type = "button"; b.addEventListener("click", function () { ov.remove(); a[1](); }); bx.appendChild(b); });
      ov.appendChild(bx); ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); }); root.appendChild(ov);
    }
    function inviteSheet() {
      var L = LB; if (L.slots.length >= 8) return;
      window.ArcadeMulti.friendSheet(L.slots.map(function (x) { return x.pid; }).filter(Boolean), function (f) {
        if (L.slots.length >= 8) return;
        if (real()) {
          rmEnsure(function (ok) { if (!ok) return; A.api("/api/room/invite", "POST", { id: L.rm, pid: f.pid }).then(function (j) { if (j && j.success) { L.slots.push({ t: "wait", name: f.name, style: f.style, pid: f.pid, human: true }); lobby(); rmWatch(); if (j.offline) A.toast(f.name + " è offline: l'ho taggato nel gruppo"); } else A.toast((j && j.error) || "Invito non riuscito"); }).catch(function () { A.toast("Server non raggiungibile"); }); });
          return;
        }
        var sl = { t: "wait", name: f.name, style: f.style, pid: f.pid, human: true }; L.slots.push(sl); lobby();
        setTimeout(function () { if (LB === L && L.slots.indexOf(sl) >= 0) { sl.t = "friend"; sl.on = true; lobby(); setTimeout(function () { if (LB === L && L.slots.indexOf(sl) >= 0) { sl.rdy = true; lobby(); } }, 1800); } }, 1500);
      });
    }
    var RO = lsGet("arc_race4_ro") || { rain: 0, obst: 1, pads: 1, slip: 1, assist: 0 };
    function tracks(mode) {
      if (!isSbx() && !SRV.ok) { root.innerHTML = ""; top(mode === "single" ? "SINGOLO" : "GARA RAPIDA", menu, "‹ Grand Prix"); root.appendChild(el("div", "rc-note", "Carico piste e record…")); loadSrv(function () { tracks(mode); }); return; }
      root.innerHTML = ""; root.className = "rc-root"; hook(function () { menu(); return true; });
      var tpb = top(mode === "single" ? "SINGOLO" : "GARA RAPIDA", menu, "‹ Grand Prix"); if (A.isSandbox && A.isSandbox()) { try { tpb.appendChild(el("span", "rc-wal", "💰 " + A.fmt(wal()) + " (prova)")); } catch (e) {} }
      function chipRow(label, items, cur, fn) { var r = el("div", "rc-laps"); r.appendChild(el("span", "", label)); items.forEach(function (it) { var b = el("button", "mp-gt wide" + (cur(it[0]) ? " on" : ""), it[1]); b.type = "button"; b.addEventListener("click", function () { fn(it[0]); tracks(mode); }); r.appendChild(b); }); root.appendChild(r); }
      if (mode !== "single") {
        var lr = el("div", "rc-laps"); lr.appendChild(el("span", "", "GIRI")); var lapq = el("b", "lb-lapv", String(RL)); lr.appendChild(slider((RL - 1) / 14, function (v) { RL = 1 + Math.round(v * 14); lapq.textContent = String(RL); lsSet("arc_race4_laps", RL); }, 15)); lr.appendChild(lapq);
        root.appendChild(lr);
        var dr = el("div", "rc-laps"); dr.appendChild(el("span", "", "BOT"));
        DIFF.forEach(function (df, n) { var b = el("button", "mp-gt wide" + (RD === n ? " on" : ""), df.n); b.type = "button"; b.addEventListener("click", function () { RD = n; lsSet("arc_race4_diff", n); tracks(mode); }); dr.appendChild(b); });
        root.appendChild(dr);
        function sv() { lsSet("arc_race4_ro", RO); }
        chipRow("METEO", [[0, "☀️ Sereno"], [1, "🌦 Pioggia"], [2, "🌧 Forte"]], function (v) { return RO.rain === v; }, function (v) { RO.rain = v; sv(); });
        var op = el("div", "rc-laps"); op.appendChild(el("span", "", "REGOLE"));
        [["obst", "💧 Ostacoli"], ["pads", "⚡ Boost"], ["slip", "💨 Scia"], ["assist", "🤝 Aiuto"]].forEach(function (o) { var b = el("button", "mp-gt wide" + (RO[o[0]] ? " on" : ""), o[1]); b.type = "button"; b.addEventListener("click", function () { RO[o[0]] = RO[o[0]] ? 0 : 1; sv(); tracks(mode); }); op.appendChild(b); });
        root.appendChild(op);
      } else {
        var GPf = lsGet("arc_race4_gp") || { mine: 1, best: 1 }, gr = el("div", "rc-laps"); gr.appendChild(el("span", "", "FANTASMI"));
        [["mine", "👻 Il tuo"], ["best", "🏆 Record assoluto"]].forEach(function (o) { var b = el("button", "mp-gt wide gsw" + (GPf[o[0]] ? " on" : ""), ""); b.type = "button"; b.appendChild(el("span", "gl", o[1])); var sw = el("span", "sw"); sw.appendChild(el("u", "", GPf[o[0]] ? "ON" : "OFF")); sw.appendChild(el("i", "kn", "")); b.appendChild(sw); b.addEventListener("click", function () { GPf[o[0]] = GPf[o[0]] ? 0 : 1; lsSet("arc_race4_gp", GPf); tracks(mode); }); gr.appendChild(b); });
        root.appendChild(gr);
      }
      TRACKS.forEach(function (tr) {
        build(tr); var best = myRec(tr), bl = lsGet(PF() + "b_" + tr.id), lk = !isUnlocked(tr), c = el("div", "mp-card rc-track rc-art-card" + (lk ? " locked" : "")); try { c.appendChild(art(tr)); } catch (e) {}
        c.appendChild(el("div", "mp-ttl", (lk ? "🔒 " : "🏁 ") + tr.name));
        if (mode === "single") {
          c.appendChild(el("div", "rc-t", "Tuo record: " + fmt(best && best.t) + "  ·  Miglior giro: " + fmt(bl && bl.t)));
          var ab = absRec(tr); c.appendChild(el("div", "rc-t abs", "🏆 Record della pista: " + (ab ? fmt(ab.t) + " (" + (ab.me ? "Tu" : ab.n) + ")" : "nessuno ancora")));
        } else c.appendChild(el("div", "rc-t", tr.theme === "city" ? "Circuito cittadino notturno" : tr.id === "zigzag" ? "Pista stretta con curve veloci" : tr.id === "canyon" ? "Canyon: curve larghe e veloci" : tr.id === "costa" ? "Lungomare con saliscendi di curve" : tr.id === "gp" ? "Lunga, di tutto un po'" : tr.id === "tornanti" ? "Con tornanti" : tr.jump ? "Con salti sul fiume" : "Con curve"));
        if (lk) c.appendChild(el("div", "rc-lock", "🔒 Pista da sbloccare · " + A.fmt(price(tr)) + " $SDG" + (mode === "single" ? "" : " (nelle gare rapide vale solo se sbloccata)")));
        else if (mode === "single" && price(tr)) c.appendChild(el("div", "rc-lock ok", "💰 Premio per ogni record: " + A.fmt(reward(tr)) + " $SDG"));
        else if (mode === "single") c.appendChild(el("div", "rc-lock ok", "💰 Premio per ogni record: " + A.fmt(reward(tr)) + " $SDG"));
        if (mode === "single") { var bd = el("div", "rc-lb"); [0, 1, 2].map(function (q) { return board(tr)[q] || { n: "—", t: 0, me: false }; }).forEach(function (r, i) { var row = el("div", "rc-lbr" + (r.me ? " me" : "")), nmE = el("span", "nm"); nmE.appendChild(el("i", "n p" + (i + 1), String(i + 1))); nmE.appendChild(document.createTextNode(r.n)); row.appendChild(nmE); row.appendChild(el("b", "", fmt(r.t))); bd.appendChild(row); }); c.appendChild(bd); }
        var go = el("button", "mp-go", "▶ " + (mode === "single" ? "GIOCA · 3 giri" : "GARA · " + RL + " giri")); go.type = "button";
        function startIt() {
          var o = mode === "single" ? undefined : { rain: RO.rain, obst: !!RO.obst, pads: !!RO.pads, slip: !!RO.slip, assist: !!RO.assist }, ab = absRec(tr);
          if (mode === "single" && !isSbx() && ab && !ab.me && !tr._absG) { A.api("/api/race/ghost?track=" + tr.id, "GET").then(function (j) { tr._absG = (j && j.g) || null; race(tr, mode, o); }).catch(function () { race(tr, mode, o); }); }
          else race(tr, mode, o);
        }
        if (lk) {
          go.textContent = "🔓 SBLOCCA · " + A.fmt(price(tr)) + " $SDG"; go.className = "mp-go unl";
          go.addEventListener("click", function () { if (go.dataset.ok) { buyTrack(tr, function (ok) { if (ok) tracks(mode); }); return; } go.dataset.ok = "1"; go.textContent = "CONFERMA · −" + A.fmt(price(tr)) + " $SDG"; setTimeout(function () { if (go.isConnected) { delete go.dataset.ok; go.textContent = "🔓 SBLOCCA · " + A.fmt(price(tr)) + " $SDG"; } }, 3500); });
          c.appendChild(go);
          if (A.isSandbox && A.isSandbox()) { var ga = el("button", "mp-go mp-alt", "▶ PROVA (admin)"); ga.type = "button"; ga.addEventListener("click", startIt); c.appendChild(ga); }
        } else { go.addEventListener("click", startIt); c.appendChild(go); }
        root.appendChild(c);
      });
    }
    function race(tr, mode, opts) {
      act("gara:" + mode + ":" + tr.id);
      opts = opts || {}; var tr0 = tr, qual = !!opts.qualPhase, nCar = mode === "single" ? 1 : (qual ? (opts.n || 4) : (opts.n || 4));
      var itl = (qual || opts.noItems) ? [] : tr.items.map(function (it) { return Object.assign({}, it, { gone: 0 }); }).filter(function (it) { var pd = it.t === "oil" || it.t === "water"; return pd ? opts.obst !== false : opts.pads !== false; }); if (opts.rain) { var rq = 0; itl = itl.filter(function () { return rq++ % 2 === 0; }); } tr = Object.assign({}, tr, { items: itl, rain: opts.rain ? (opts.rain === true ? 1 : opts.rain) : 0 });
      var solo = mode === "single", laps = qual ? 1 : (solo ? 3 : (opts.laps || RL)), full = el("div", "rc2"), cv = el("canvas", "rc2-cv"), hud = el("div", "rc2-hud"), cd = el("div", "rc2-cd"), tip = el("div", "rc2-tip");
      var left = el("div", "rc2-pad l"), right = el("div", "rc2-pad r"), rev = el("div", "rc2-rev"), rfill = el("i"), bbar = el("div", "rc2-boost"), bfill = el("i"); rev.appendChild(rfill); bbar.appendChild(bfill);
      var gasb = el("button", "rc2-gas", "ACCELERA"), lch = el("div", "rc2-lch"), lchF = el("i"), lchZ = el("u"), intro = el("div", "rc2-intro"), holdG = false, rev2 = 0, flooded = false, introT = 0, INTRO = opts.noIntro ? 0 : (opts.afterQual ? 4 : 8);
      gasb.type = "button"; lch.appendChild(lchZ); lch.appendChild(lchF); lch.appendChild(el("em", "", "GAS")); intro.innerHTML = "<small></small><b></b><span></span>"; intro.children[0].textContent = qual ? "🏁 SESSIONE UFFICIALE 🏁" : (opts.grid ? "🏆 GRAN PREMIO 🏆" : "CIRCUITO"); intro.children[1].textContent = qual ? "QUALIFICA" : (opts.grid ? "GARA" : tr.name); intro.children[2].textContent = qual ? "⏱ " + tr.name.toUpperCase() + " · 1 GIRO LANCIATO · DECIDE LA GRIGLIA" : (solo ? "CONTRO IL TEMPO" : (opts.grid ? "🏎 " + tr.name.toUpperCase() : "GARA")) + " · " + laps + " GIRI" + (opts.grid ? " · SI PARTE DALLA GRIGLIA" : ""); if (qual) intro.classList.add("qual");
      var tower = el("div", "rc2-tower"), twc = 0, xb = el("button", "rc2-x", "⏸"); xb.type = "button"; var sec = el("div", "rc2-sec"), lapb = el("div", "rc2-lapb");
      full.appendChild(cv); if (opts.rain) full.appendChild(el("div", "rc2-rain" + (opts.rain > 1 ? " heavy" : ""))); full.appendChild(hud); full.appendChild(cd); full.appendChild(tip); full.appendChild(left); full.appendChild(right); full.appendChild(bbar); full.appendChild(xb); full.appendChild(sec); full.appendChild(lapb); full.appendChild(gasb); full.appendChild(lch); full.appendChild(intro); if (!solo && !qual) full.appendChild(tower); document.body.appendChild(full);
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
      function gon(e) { e.preventDefault(); holdG = true; gasb.classList.add("on"); } function goff(e) { e.preventDefault(); holdG = false; gasb.classList.remove("on"); }
      gasb.addEventListener("pointerdown", gon); gasb.addEventListener("pointerup", goff); gasb.addEventListener("pointercancel", goff); gasb.addEventListener("pointerleave", goff); gasb.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      full.addEventListener("pointerdown", function () { if (state === "intro" && introT > 0.6 && !opts.room) introT = INTRO; });
      function kd(e, v) { var k = e.key; if (k === " " || k === "ArrowUp") { holdG = v; gasb.classList.toggle("on", v); } if (k === "ArrowLeft" || k === "a") inp.l = v; else if (k === "ArrowRight" || k === "d") inp.r = v; }
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
      var rd = opts.diff != null ? opts.diff : RD, ch = (!solo && rd === 3) ? champ(tr, nCar) : null, sk = ch ? ch.m : skillsN(rd, nCar), vmv = ch ? ch.vm : null, offs = [0, -26, 26, 0, -14, 14, -34, 34].slice(0, Math.max(nCar, 4));
      var cars = []; for (var ck = 0; ck < (solo || qual ? 1 : nCar); ck++) { var cr = newCar(tr, solo ? 1 : (opts.grid ? Math.max(0, opts.grid.indexOf(ck)) : ck)); if (opts.roster && opts.roster[ck]) { cr.name = opts.roster[ck].name; cr.col = opts.roster[ck].col; } else if (ck) { cr.name = NAMES[ck % NAMES.length]; cr.col = COLS[ck % COLS.length]; } cars.push(cr); }
      var me = cars[0], RMT = opts.room || null; if (RMT) cars.forEach(function (c, k) { if (k && RMT.map[k]) c.remote = RMT.map[k]; });
      cars.forEach(function (c, k) { if (k) { c.bm = DIFF[rd].bm; if (vmv) c.vm = vmv[k]; } });
      if (solo) { me.slot = 0; me.col = COLS[0]; }
      cars.forEach(function (c) { c.hist = new Float32Array(tr.N * laps + 160); c.hist.fill(-1); c.hp = Math.floor(c.prog) - 1; });
      var best = (myRec(tr) || {}).t || 0, state = opts.noIntro ? "count" : "intro", cT = 0, t = 0, acc = 0, last = performance.now(), raf = 0, done = false, camA = me.a, camx = me.x, camy = me.y, revv = 0, botDelay = [0, 0.12, 0.2, 0.3, 0.38, 0.46, 0.54, 0.62], lapT = [], lapStart = qual ? 1e9 : 0, msgT = 0, lapB = null, lapS = null, prevAt = -99, mmK = "", wrongT = 0;
      var qgh = [], qres = [], qT0 = -1;
      var RM0 = !!opts.room;
      if (qual) { var k0 = tr.N - 14; me.x = tr.P[k0][0]; me.y = tr.P[k0][1]; me.a = tr.ta[k0]; me.vx = 0; me.vy = 0; me.idx = k0; me.prog = -14; me.slot = 0;
        for (var qk = 1; qk < (RM0 ? 1 : nCar); qk++) { var rs0 = opts.roster && opts.roster[qk], qs = qualSim(tr, sk[qk], vmv ? vmv[qk] : 1, offs[qk] * 0.5); qres.push({ id: qk, name: rs0 ? rs0.name : NAMES[qk % NAMES.length], t: qs.t }); qgh.push({ x: qs.path[0], y: qs.path[1], a: qs.path[2], col: rs0 ? rs0.col : COLS[qk % COLS.length], name: rs0 ? rs0.name : NAMES[qk % NAMES.length], ghost: true, hit: 0, path: qs.path }); } }
      var AU = (window.ArcadeAudio || {}).race || { begin: function () {}, end: function () {}, engine: function () {}, sfx: function () {}, set: function () {} }, SN = (function () { var q = lsGet("arc_race4_snd"); if (!q || q.v !== 2) { q = { v: 2, sfx: 0.7, music: 0.5 }; lsSet("arc_race4_snd", q); } return q; })(), pBoost = false, pHit = false, pSpin = false, lastNl = 0;
      AU.begin({ rain: opts.rain, sfx: SN.sfx, music: SN.music });
      var GPf = lsGet("arc_race4_gp") || { mine: 1, best: 1 }, gl = [], grec = [], gtick = 0;
      if (solo) {
        var gm = (lsGet(PF() + "g_" + tr.id) || {}).g, ab0 = GPf.best ? absRec(tr) : null;
        var iAmRec = !!(ab0 && ab0.me);                                                                              // se il record assoluto è tuo, il fantasma è uno solo (il tuo)
        if ((GPf.mine || iAmRec) && gm && gm.length > 6) gl.push({ arr: gm, o: { x: 0, y: 0, a: 0, col: iAmRec ? "#ffd23b" : "#cfe6ff", name: iAmRec ? "Il tuo record 🏆" : "Il tuo record", ghost: true, hit: 0 } });
        if (ab0 && !ab0.me && tr._absG && tr._absG.length > 6) gl.push({ arr: tr._absG, o: { x: 0, y: 0, a: 0, col: "#ffd23b", name: "Record · " + ab0.n, ghost: true, hit: 0 } });
      }
      var sbest = (solo && lsGet(PF() + "s_" + tr.id)) || [0, 0, 0], secNo = 0, secStart = 0, secPrev = [], secLast = [], secCols = [];
      var shots = (function () { var N = tr.N, sm = [], i, q, o = [], ch = []; for (i = 0; i < N; i++) { var k = 0; for (q = -7; q <= 7; q++) k += tr.kap[(i + q + N) % N]; sm.push([k, i]); } sm.sort(function (a, b) { return b[0] - a[0]; });
        sm.forEach(function (c) { if (ch.length >= 3) return; var i2 = c[1]; if (Math.min(i2, N - i2) < 60) return; if (ch.every(function (x) { var d = Math.abs(x - i2); return Math.min(d, N - d) > N / 6; })) ch.push(i2); }); ch.sort(function (a, b) { return a - b; }); while (ch.length < 3) ch.push(Math.floor(N * (ch.length + 1) / 4)); ch.push(N - 40); return ch; })();
      function allG() { return gl.map(function (g) { return g.o; }).concat(qgh); }
      function ghostAt(G, tt) {
        var gh = G.arr, ghost = G.o, f = tt * 20, i = Math.min(Math.floor(f), gh.length / 3 - 2), u = Math.max(0, Math.min(1, f - i)); if (i < 0) i = 0;
        var a0 = gh[i * 3 + 2] / 100, a1 = gh[i * 3 + 5] / 100, da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        ghost.x = gh[i * 3] + (gh[i * 3 + 3] - gh[i * 3]) * u; ghost.y = gh[i * 3 + 1] + (gh[i * 3 + 4] - gh[i * 3 + 1]) * u; ghost.a = a0 + da * u;
      }
      function secDone(sIdx, tm) {
        var ref = secPrev[sIdx] || sbest[sIdx], col = "y";
        if (sbest[sIdx] && tm < sbest[sIdx] - 0.005) col = "f"; else if (!ref || tm < ref - 0.005) col = "g";
        if (!sbest[sIdx] || tm < sbest[sIdx]) { sbest[sIdx] = tm; if (solo) lsSet(PF() + "s_" + tr.id, sbest); }
        secPrev[sIdx] = tm; secLast[sIdx] = ref ? tm - ref : 0; secCols[sIdx] = col;
      }
      var GO = 3.4, trail = [], curSeg = null, PH = qual ? "qual" : "race", waitT0 = 0, SPC = 0;
      (function () { for (var i = 0; i < tr.N; i++) { var a = tr.P[i], b = tr.P[(i + 1) % tr.N]; SPC += Math.hypot(b[0] - a[0], b[1] - a[1]); } SPC = Math.max(1, SPC / tr.N); })();
      function srvNow() { return performance.now() / 1000 + RMT.off; }
      function remStep(c) {                                                                                     // auto di un altro giocatore: posizione stimata "adesso" (ultimo campione + velocità × età); ai nuovi campioni lo scarto si assorbe piano (niente scatti)
        var sm = c.sm; if (!sm) return; var age = Math.max(0, Math.min(0.45, srvNow() - sm.ts)), w = 0;      // età = ora del server adesso − ora del server quando l'ha mandato chi guida (include rete e attese)
        if (c.sp && sm.tt > c.sp.tt) { var d0 = sm.a - c.sp.a; d0 = Math.atan2(Math.sin(d0), Math.cos(d0)); w = Math.max(-4, Math.min(4, d0 / ((sm.tt - c.sp.tt) / 1000))); }
        var th = w * age / 2, cth = Math.cos(th), sth = Math.sin(th), vxr = sm.vx * cth - sm.vy * sth, vyr = sm.vx * sth + sm.vy * cth, ex = sm.x + vxr * age, ey = sm.y + vyr * age, ea = sm.a + w * age;
        if (c.smNew) { c.smNew = false; if (c.ox === undefined) { c.ox = 0; c.oy = 0; c.oa = 0; } else { c.ox = c.x - (ex - vxr * DT); c.oy = c.y - (ey - vyr * DT); var da = c.a - (ea - w * DT); c.oa = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.hypot(c.ox, c.oy) > 260) { c.ox = 0; c.oy = 0; c.oa = 0; } } }
        var dc = Math.exp(-DT / 0.3); c.ox *= dc; c.oy *= dc; c.oa *= dc; c.x = ex + c.ox; c.y = ey + c.oy; c.a = ea + c.oa; c.vx = sm.vx; c.vy = sm.vy;
        c.prog = sm.pr / 10 + age * Math.hypot(sm.vx, sm.vy) / SPC; c.idx = ((Math.floor(c.prog) % tr.N) + tr.N) % tr.N;
      }
      if (window.__RACE_DEBUG) window.__RACE_DEBUG({ me: me, tr: tr, cars: cars, inp: inp });
      function pastLine(c) { var a = tr.ta[0]; return (c.x - tr.P[0][0]) * Math.cos(a) + (c.y - tr.P[0][1]) * Math.sin(a) >= 0 || c.prog >= tr.N * laps + 4; }
      function rank() { return cars.slice().sort(function (a, b) { return (b.fin ? 1e6 - b.finT : b.prog) - (a.fin ? 1e6 - a.finT : a.prog); }); }
      function stop(keepFs) { done = true; if (RT) clearInterval(RT); AU.end(); cancelAnimationFrame(raf); window.removeEventListener("keydown", kdown); window.removeEventListener("keyup", kup); window.removeEventListener("resize", layout); try { if (TGW && TGW.offEvent) ["fullscreenChanged", "safeAreaChanged", "contentSafeAreaChanged"].forEach(function (ev) { TGW.offEvent(ev, layout); }); } catch (e) {} try { if (TGW) { if (TGW.disableClosingConfirmation) TGW.disableClosingConfirmation(); if (!keepFs && TGW.exitFullscreen && TGW.isFullscreen) TGW.exitFullscreen(); } if (!keepFs && screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
        if (!keepFs) window.ArcadeBackHide = false; window.ArcadeBackHook = null; try { if (window.ArcadeBackSync) window.ArcadeBackSync(); } catch (e) {} full.remove(); }
      function goBack() { if (opts.back) opts.back(); else tracks(mode); }
      var paused = false, pbox = null;
      function pause(on) {
        if (state === "end") return; paused = on && !opts.room; if (pbox) { pbox.remove(); pbox = null; } if (!on) { last = performance.now(); return; }
        pbox = el("div", "rc2-end"); pbox.appendChild(el("b", "", "IN PAUSA"));
        var sr = el("div", "rc2-snd"); [["sfx", "🔊 Suoni"], ["music", "🎵 Musica"]].forEach(function (o) { var row = el("div", "rc2-vol"), nm = el("span", "", o[1]); row.appendChild(nm); row.appendChild(slider(SN[o[0]], function (v) { SN[o[0]] = v; lsSet("arc_race4_snd", SN); var q = {}; q[o[0]] = v; AU.set(q); })); sr.appendChild(row); }); pbox.appendChild(sr);
        var rw = el("div", "mp-end"), a = el("button", "mp-go", "RIPRENDI"), rs = el("button", "mp-go mp-alt2", opts.room ? "" : "RICOMINCIA"), b = el("button", "mp-go mp-alt", "ESCI"); a.type = b.type = rs.type = "button";
        a.addEventListener("click", function () { pause(false); }); rs.addEventListener("click", function () { stop(true); race(tr, mode, opts); }); b.addEventListener("click", function () { stop(); if (opts.room && opts.exit) opts.exit(); else goBack(); }); rw.appendChild(a); if (!opts.room) rw.appendChild(rs); rw.appendChild(b); pbox.appendChild(rw); full.appendChild(pbox);
      }
      xb.addEventListener("click", function () { pause(!paused); });
      window.ArcadeBackHide = false; window.ArcadeBackHook = function () { if (state === "end") return false; pause(!paused); return true; }; try { if (window.ArcadeBackSync) window.ArcadeBackSync(); } catch (e) {}
      function say2(x, sec) { tip.textContent = x; msgT = sec || 1.6; }
      var RT = 0, rSince = RMT ? (RMT.since || 0) : 0, rInfl = 0, rBusyT = 0, finGo = false, finT0 = 0, wbox = null, wtbl = null, resLn = null;
      function qualOnline() {                                                                                    // qualifica online: tutti hanno fatto il giro insieme; la griglia la decidono i tempi, poi parte la gara sincronizzata
        RMT.wantQ = Math.round((me.finT - qT0) * 1000) / 1000; var qb = el("div", "rc2-end res"), t0 = performance.now(), fin2 = false; full.appendChild(qb);
        (function tick() {
          if (done || fin2) return; var sy = RMT.sy || {}, qm = sy.q || {}, pl = RMT.pl || [], on = pl.filter(function (p) { return p.online !== false; });
          var rows = pl.slice().sort(function (a, b) { return (qm[a.uid] != null ? qm[a.uid] : 1e9) - (qm[b.uid] != null ? qm[b.uid] : 1e9); });
          qb.innerHTML = ""; qb.appendChild(el("b", "", "QUALIFICA · GRIGLIA DI PARTENZA")); var tb0 = el("div", "rc2-tbl");
          rows.forEach(function (p, i) { var r = el("div", "rr" + (p.uid === RMT.uid ? " me" : "")); r.appendChild(el("span", "pn", qm[p.uid] != null ? String(i + 1) : "·")); r.appendChild(el("span", "nm", p.uid === RMT.uid ? "Tu" : p.name)); r.appendChild(el("span", "tt" + (qm[p.uid] != null ? "" : " lv"), qm[p.uid] != null ? fmt(qm[p.uid]) : (p.online === false ? "assente" : "in pista…"))); tb0.appendChild(r); });
          qb.appendChild(tb0);
          if (!sy.grid && (on.every(function (p) { return qm[p.uid] != null; }) || performance.now() - t0 > 90000)) RMT.wantGrid = rows.filter(function (p) { return qm[p.uid] != null; }).concat(rows.filter(function (p) { return qm[p.uid] == null; })).map(function (p) { return p.uid; });
          if (sy.grid) {
            fin2 = true; qb.appendChild(el("div", "rc-lap", "🏁 La gara parte tra poco: tutti insieme, in griglia"));
            setTimeout(function () {
              if (done) return; var ukey = {}; ukey[RMT.uid] = 0; Object.keys(RMT.map).forEach(function (k) { ukey[RMT.map[k]] = +k; }); var g = [];
              sy.grid.forEach(function (u) { if (ukey[u] != null && g.indexOf(ukey[u]) < 0) g.push(ukey[u]); }); for (var k = 0; k < (opts.n || 4); k++) if (g.indexOf(k) < 0) g.push(k);
              RMT.wantQ = undefined; RMT.wantGrid = null; stop(true); race(tr0, "race", Object.assign({}, opts, { qualPhase: false, afterQual: true, grid: g }));
            }, 3800); return;
          }
          setTimeout(tick, 300);
        })();
      }
      function finish() {
        if (RMT && !finGo && !qual) {
          state = "end";
          if (!finT0) { finT0 = performance.now(); AU.sfx("fin"); wbox = el("div", "rc2-end wait"); wbox.appendChild(el("b", "", "🏁 ARRIVATO!")); wbox.appendChild(el("div", "rc-lap", "Aspetto gli altri piloti: classifica in diretta")); wtbl = el("div", "rc2-tbl wl"); wbox.appendChild(wtbl); full.appendChild(wbox); }
          var pl0 = RMT.pl || []; cars.forEach(function (c) { if (c.remote && !c.fin) { var pp0 = pl0.filter(function (x) { return x.uid === c.remote; })[0]; c.gone = !pp0 || pp0.online === false; } });   // chi è sparito (app chiusa / rete persa) non si aspetta
          wtbl.innerHTML = ""; rank().forEach(function (c, i) { var r = el("div", "rr" + (c === me ? " me" : "")); r.appendChild(el("span", "pn", String(i + 1))); r.appendChild(el("span", "nm", c === me && !opts.roster ? "Tu" : c.name)); r.appendChild(el("span", "tt" + (c.fin ? "" : (c.gone ? " dn" : " lv")), c.fin ? fmt(c.finT) : (c.gone ? "ritirato?" : "in gara · giro " + Math.min(laps, c.lap || 1) + "/" + laps))); wtbl.appendChild(r); });
          if (!done && cars.some(function (c) { return c.remote && !c.fin && !c.gone; }) && performance.now() - finT0 < 300000) { setTimeout(finish, 250); return; }
          cars.forEach(function (c) { if (c.remote && !c.fin) { c.fin = true; c.dnf = true; c.finT = 9000 + Math.max(0, tr.N * laps - c.prog) / 1000; } });
          finGo = true; if (wbox) wbox.remove(); }
        state = "end"; if (!RMT) AU.sfx("fin"); var total = me.finT, rec = solo && (!best || total < best), ar0 = absRec(tr0), recAll = solo && laps === 3 && (!ar0 || total < ar0.t - 0.005), recPay = recAll && isSbx() ? payRec(tr0, total) : 0, box = el("div", "rc2-end res");
        if (qual && RMT) { qualOnline(); return; }
        if (qual) {
          var mine = me.finT - qT0; qres.push({ id: 0, name: "Tu", t: mine }); qres.sort(function (a, b) { return a.t - b.t; }); box.appendChild(el("b", "", "QUALIFICA · GRIGLIA DI PARTENZA")); var tb0 = el("div", "rc2-tbl");
          qres.forEach(function (q, i) { var r = el("div", "rr" + (q.id === 0 ? " me" : "")); r.appendChild(el("span", "pn", String(i + 1))); r.appendChild(el("span", "nm", q.name)); r.appendChild(el("span", "tt", fmt(q.t))); tb0.appendChild(r); }); box.appendChild(tb0);
          var rw0 = el("div", "mp-end"), g0 = el("button", "mp-go", "▶ VAI ALLA GARA"), g1 = el("button", "mp-go mp-alt", "RIPROVA"); g0.type = g1.type = "button";
          g0.addEventListener("click", function () { stop(true); race(tr0, "race", Object.assign({}, opts, { qualPhase: false, grid: qres.map(function (q) { return q.id; }) })); });
          g1.addEventListener("click", function () { stop(true); race(tr0, "race", opts); }); rw0.appendChild(g0); rw0.appendChild(g1); box.appendChild(rw0); full.appendChild(box); return;
        }
        if (rec) { if (isSbx() && laps === 3) lsSet("arc_race4_" + tr.id, { t: total }); lsSet(PF() + "g_" + tr.id, { g: grec }); } A.haptic("ok");
        if (!solo) {                                                                                               // gli altri finiscono la gara (veloce, senza disegnare) così hai la classifica completa coi giri
          var t2 = t, g = 0;
          while (g++ < 60 * 300 && cars.some(function (c) { return !c.fin && !c.remote; })) {
            aero(tr, cars, opts); cars.forEach(function (c, k) {
              if (c.fin || k === 0 || c.remote) return; if (t2 >= botDelay[k]) { step(tr, c, pilot(tr, c, offs[k], sk[k])); items(tr, c); }
              if (c.prog >= tr.N * c.lap) { (c.lapTs = c.lapTs || []).push(t2 - (c.lapS || 0)); c.lapS = t2; c.lap++; }
              if (c.prog >= tr.N * laps && pastLine(c)) { c.fin = true; c.finT = t2; }
            });
            if (!(opts && opts.coll === false)) crash(cars); t2 += DT;
          }
        }
        var rows = solo ? [me] : rank(), fl = 1e9; rows.forEach(function (c) { (c.lapTs || []).forEach(function (x) { if (x < fl) fl = x; }); });
        if (solo) {
          var recLn = el("div", "rc-lap me", ""); box.appendChild(el("b", "", recAll ? "🏆 NUOVO RECORD DELLA PISTA!" : (rec ? "🏁 NUOVO TUO RECORD!" : "ARRIVO!"))); box.appendChild(el("div", "rc-big", fmt(total))); box.appendChild(recLn);
          if (recPay) recLn.textContent = "💰 Record della pista: +" + A.fmt(recPay) + " $SDG"; else if (laps !== 3) recLn.textContent = "Il record vale solo sui 3 giri";
          if (!isSbx() && laps === 3 && (rec || recAll)) {
            var gs = grec.length > 6000 ? grec.filter(function (v, i) { return Math.floor(i / 3) % 2 === 0; }) : grec;
            A.api("/api/race/record", "POST", { track: tr0.id, t: Math.round(total * 1000), g: gs }).then(function (j) {
              if (j && j.success) { if (j.reward) recLn.textContent = "💰 Record della pista: +" + A.fmt(j.reward) + " $SDG"; else if (j.record) recLn.textContent = "Record della pista battuto (premio non pagato: limite giornaliero raggiunto)"; else if (j.pos) recLn.textContent = "In classifica sei " + j.pos + "° su " + j.of; tr0._absG = null; SRV.ok = false; try { A.refreshMe(); } catch (e) {} }
            }).catch(function () {});
          }
        }
        else {
          var p0 = rank().indexOf(me); box.appendChild(el("b", "", p0 === 0 ? "🏆 HAI VINTO!" : ORD[p0] + " POSTO"));
          if (RMT) {                                                                                                  // gara online: il server conferma la classifica (maggioranza) e paga il premio
            resLn = el("div", "rc-lap", opts.prize ? "💰 Premio: 1° " + A.fmt(opts.prize) + " · 2° " + A.fmt(Math.round(opts.prize * 0.75)) + " · 3° " + A.fmt(Math.round(opts.prize * 0.5)) + " $SDG" : ""); box.appendChild(resLn);
            var ord2 = rank().map(function (c) { return c === me ? RMT.uid : c.remote; });
            A.api("/api/room/result", "POST", { id: RMT.id, order: ord2 }).then(function (j) { if (j && j.success && j.settled && resLn && !resLn._d) { resLn._d = 1; var py = ((j.result || {}).pay || {})[RMT.uid] || 0; resLn.textContent = py ? "💰 Premio ricevuto: +" + A.fmt(py) + " $SDG" : "Classifica confermata"; try { A.refreshMe(); } catch (e) {} } }).catch(function () {});
          } else if (opts.prize) { var pz = [opts.prize, Math.round(opts.prize * 0.75), Math.round(opts.prize * 0.5)][p0] || 0; box.appendChild(el("div", "rc-lap", pz ? "💰 Premio: +" + A.fmt(pz) + " $SDG (simulato)" : "Premi: 1° " + A.fmt(opts.prize) + " · 2° " + A.fmt(Math.round(opts.prize * 0.75)) + " · 3° " + A.fmt(Math.round(opts.prize * 0.5)))); }
        }
        var tb = el("div", "rc2-tbl lt"), lcol = el("div", "lt-l"), rcol = el("div", "lt-r"), rin = el("div", "lt-in"), hd = el("div", "lr h");      // sinistra: posizione, nome, totale; destra: i giri, a gruppi di 5
        lcol.appendChild(el("div", "lr h", "")); for (var gi = 1; gi <= laps; gi++) { var hi = el("i", "", "G" + gi); hi.setAttribute("data-p", String(Math.floor((gi - 1) / 5))); hd.appendChild(hi); } rin.appendChild(hd);
        rows.forEach(function (c, i) {
          var r = el("div", "lr" + (c === me ? " me" : "")), pn = el("span", "pn", String(i + 1)), nm = el("span", "nm", c === me && !opts.roster ? "Tu" : c.name), tt = el("span", "tt", c.dnf ? "RITIRATO" : fmt(c.finT)); r.appendChild(pn); r.appendChild(nm); r.appendChild(tt); lcol.appendChild(r);
          var lp = el("div", "lr" + (c === me ? " me" : "")), bst = Math.min.apply(null, c.lapTs && c.lapTs.length ? c.lapTs : [1e9]);
          for (var q = 0; q < laps; q++) { var x = (c.lapTs || [])[q], ci = el("i", x == null ? "" : (x <= fl + 0.0005 ? "fl" : (x === bst ? "bs" : "")), x == null ? "–" : fmt(x)); ci.setAttribute("data-p", String(Math.floor(q / 5))); lp.appendChild(ci); } rin.appendChild(lp);
        });
        rcol.appendChild(rin); tb.appendChild(lcol); tb.appendChild(rcol);
        var npg = Math.ceil(laps / 5), ltabs = null;
        function setLg(p) { Array.prototype.forEach.call(rin.querySelectorAll("i"), function (n) { n.style.display = (+n.getAttribute("data-p") === p) ? "" : "none"; }); if (ltabs) Array.prototype.forEach.call(ltabs.children, function (b2, k2) { b2.classList.toggle("on", k2 === p); }); }
        if (npg > 1) { ltabs = el("div", "lt-tabs"); for (var pk = 0; pk < npg; pk++) (function (pk) { var tb3 = el("button", "lt-tab", "G" + (pk * 5 + 1) + "–" + Math.min(laps, pk * 5 + 5)); tb3.type = "button"; tb3.addEventListener("click", function () { A.haptic("light"); setLg(pk); }); ltabs.appendChild(tb3); })(pk); }
        setLg(0);
        var pg2 = el("div", "rc2-pg2"); if (ltabs) pg2.appendChild(ltabs); pg2.appendChild(tb); pg2.appendChild(el("div", "rc-lap", "⚡ = giro più veloce" + (fl < 1e9 ? " (" + fmt(fl) + ")" : "")));
        var pod = null, tgl = null;
        if (!solo && rows.length >= 2) {                                                                                  // schermata 1: podio con le auto dei primi tre
          pod = el("div", "rc2-pod"); var ord = rows.length >= 3 ? [1, 0, 2] : [1, 0];
          ord.forEach(function (ri) { var c = rows[ri], col = el("div", "pdc p" + (ri + 1)); if (ri === 0) col.appendChild(el("em", "cup", "🏆")); var car = el("i", "pcar"); car.style.background = c.col; col.appendChild(car); col.appendChild(el("span", "pnm" + (c === me ? " me" : ""), c === me && !opts.roster ? "Tu" : c.name)); col.appendChild(el("span", "ptm", c.dnf ? "RIT." : fmt(c.finT))); col.appendChild(el("div", "pst", String(ri + 1))); pod.appendChild(col); });
          box.appendChild(pod); pg2.style.display = "none";
          tgl = el("button", "mp-go mp-alt2", "TEMPI SUL GIRO ›"); tgl.type = "button"; var onPod = true;
          tgl.addEventListener("click", function () { onPod = !onPod; pod.style.display = onPod ? "" : "none"; pg2.style.display = onPod ? "none" : ""; tgl.textContent = onPod ? "TEMPI SUL GIRO ›" : "‹ PODIO"; });
        }
        box.appendChild(pg2);
        var rw = el("div", "mp-end"), a = el("button", "mp-go", "RIGIOCA"), b = el("button", "mp-go mp-alt", opts.back ? "TORNA ALLA LOBBY" : "PISTE"); a.type = b.type = "button";
        a.addEventListener("click", function () { stop(true); race(tr, mode, opts); }); b.addEventListener("click", function () { stop(); goBack(); }); if (tgl) rw.insertBefore(tgl, rw.firstChild); if (!opts.back) rw.appendChild(a); rw.appendChild(b); box.appendChild(rw); full.appendChild(box);
      }
      // ---------- proiezione: camera alta dietro l'auto, inclinata verso il basso ----------
      var TH = 42 * Math.PI / 180, CT = Math.cos(TH), ST = Math.sin(TH), DB = 205, HC = 250, FOC = 1.08;
      var cax = 0, cay = 0, ca = 0, sa = 0, FF = 0, ZO = 0, QL = 1, qEma = 4;
      var NEAR = 14;
      function cm(wx, wy, wz) { var dx = wx - cax, dy = wy - cay, f = dx * ca + dy * sa, l = -dx * sa + dy * ca, hz = HC - wz; return [l, f * ST - hz * CT, f * CT + hz * ST]; }      // coordinate nella camera (l, u, profondità)
      function sp2(c) { return [W / 2 + c[0] / c[2] * FF, H / 2 - c[1] / c[2] * FF + H * 0.06, c[2]]; }
      function pr(wx, wy, wz) { var c = cm(wx, wy, wz); return c[2] < NEAR ? null : sp2(c); }
      function quadS(a, b, c, d, col) { if (!a || !b || !c || !d) return; var LM = W * 5, q4 = [a, b, c, d]; for (var gi = 0; gi < 4; gi++) if (q4[gi][0] < -LM || q4[gi][0] > W + LM || q4[gi][1] < -LM || q4[gi][1] > H + LM) return; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); }
      function quad(a, b, c, d, col) {                                                                          // quadrilatero a terra ritagliato sul piano vicino: niente buchi ai bordi dello schermo
        var P4 = [a, b, c, d], o = [], i;
        for (i = 0; i < 4; i++) { var p = P4[i], q = P4[(i + 1) & 3], ip = p[2] >= NEAR, iq = q[2] >= NEAR; if (ip) o.push(p); if (ip !== iq) { var t = (NEAR - p[2]) / (q[2] - p[2]); o.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, NEAR]); } }
        if (o.length < 3) return; ctx.fillStyle = col; ctx.beginPath(); for (i = 0; i < o.length; i++) { var s2 = sp2(o[i]); if (i) ctx.lineTo(s2[0], s2[1]); else ctx.moveTo(s2[0], s2[1]); } ctx.closePath(); ctx.fill();
      }
      function onScr(x, y, r) { var c = cm(x, y, 0), d = c[2]; if (d > 3400 || d < -r) return false; if (d < NEAR + r) return true; var m = r * FF / d + 30, sx = W / 2 + c[0] / d * FF, sy = H / 2 - c[1] / d * FF + H * 0.06; return sx > -m && sx < W + m && sy > -m && sy < H + m; }
      function box(x, y, hl, hw2, z0, h, ang, cTop, cA, cB) {                                                  // parallelepipedo orientato; hl = mezza lunghezza, hw2 = mezza larghezza
        var co = Math.cos(ang), si = Math.sin(ang), cs = [[hl, hw2], [hl, -hw2], [-hl, -hw2], [-hl, hw2]].map(function (p) { return [x + p[0] * co - p[1] * si, y + p[0] * si + p[1] * co]; });
        var lo = cs.map(function (p) { return pr(p[0], p[1], z0 + ZO); }), hi = cs.map(function (p) { return pr(p[0], p[1], z0 + h + ZO); }); if (lo.some(function (q) { return !q || q[2] < 55; }) || hi.some(function (q) { return !q || q[2] < 55; })) return;
        var faces = []; for (var i = 0; i < 4; i++) faces.push({ i: i, d: (lo[i][2] + lo[(i + 1) % 4][2]) / 2 }); faces.sort(function (p, q) { return q.d - p.d; });
        var nx4 = [co, si, -co, -si], ny4 = [si, -co, -si, co];                                                   // normali esterne dei 4 lati: le facce di dietro sono coperte da quelle davanti, non si disegnano (stesso risultato, meno riempimenti)
        faces.forEach(function (fc, k) { var i = fc.i, j = (i + 1) % 4; if ((cax - (cs[i][0] + cs[j][0]) / 2) * nx4[i] + (cay - (cs[i][1] + cs[j][1]) / 2) * ny4[i] <= 0) return; quadS(lo[i], lo[j], hi[j], hi[i], (i % 2) ? cB : cA); });
        quadS(hi[0], hi[1], hi[2], hi[3], cTop);
      }
      var SC = 1.3;
      function carBox(c) {                                                                                       // auto più grossa e dettagliata; parti ordinate per profondità
        var a = c.a, blink = c.blink > 0 && Math.floor(c.blink * 14) % 2; if (blink) return;
        if (c.ghost) ctx.globalAlpha = 0.42;
        ZO = 0; if (c.air > 0) { ZO = 52 * Math.sin(Math.PI * (1 - c.air / c.airT)); var sp0 = pr(c.x, c.y, 0.6), sp1 = sp0 && pr(c.x + Math.cos(c.a) * 17, c.y + Math.sin(c.a) * 17, 0.6); if (sp0 && sp1) { ctx.fillStyle = "rgba(0,0,0,.32)"; ctx.beginPath(); ctx.ellipse(sp0[0], sp0[1], Math.abs(sp1[0] - sp0[0]) * 1.4 + 12, 7, 0, 0, 7); ctx.fill(); } }
        var bl = c.hit > 0 ? shade(c.col, 0.35) : c.col, dk = shade(bl, -0.38), co = Math.cos(a), si = Math.sin(a), parts = [];
        function at(fx, ly) { return [c.x + fx * SC * co - ly * SC * si, c.y + fx * SC * si + ly * SC * co]; }
        function add(fx, ly, f) { var p = at(fx, ly); parts.push({ p: p, f: function () { f(p); } }); }
        [[-10, -10.5], [-10, 10.5], [10.5, -10], [10.5, 10]].forEach(function (w) { add(w[0], w[1], function (p) { box(p[0], p[1], 5.6 * SC, 3.2 * SC, 0, 7.6 * SC, a, "#2b2b30", "#15151a", "#0b0b0e"); box(p[0], p[1], 2.2 * SC, 3.3 * SC, 1.5 * SC, 4.6 * SC, a, "#6b6b76", "#4a4a54", "#3b3b44"); }); });   // ruote scoperte
        add(0, 0, function (p) { box(p[0], p[1], 12 * SC, 4.2 * SC, 2 * SC, 6 * SC, a, bl, shade(bl, -0.16), shade(bl, -0.3)); });                      // corpo stretto
        add(-2, 0, function (p) { box(p[0], p[1], 6.5 * SC, 7.4 * SC, 2 * SC, 4 * SC, a, shade(bl, 0.06), shade(bl, -0.2), shade(bl, -0.34)); });          // pance laterali
        add(0, 0, function (p) { box(p[0], p[1], 9 * SC, 1 * SC, 8 * SC, 0.6 * SC, a, "#f2f2f4", "#ddd", "#ccc"); });                                     // striscia centrale
        add(14.5, 0, function (p) { box(p[0], p[1], 5.5 * SC, 2.6 * SC, 2.2 * SC, 3.6 * SC, a, shade(bl, 0.12), shade(bl, -0.16), shade(bl, -0.3)); });   // muso
        add(21.5, 0, function (p) { box(p[0], p[1], 1.9 * SC, 11.5 * SC, 1 * SC, 1.5 * SC, a, dk, shade(dk, -0.2), shade(dk, -0.3)); box(p[0] - 0.5 * SC, p[1], 0.7 * SC, 6 * SC, 2.4 * SC, 0.7 * SC, a, "#f2f2f4", "#ddd", "#ccc"); });   // ala anteriore
        [-11.5, 11.5].forEach(function (ly) { add(21.5, ly, function (p) { box(p[0], p[1], 2.4 * SC, 0.7 * SC, 0.8 * SC, 4.2 * SC, a, bl, shade(bl, -0.2), shade(bl, -0.35)); }); });     // paratie ala anteriore
        add(-3, 0, function (p) { box(p[0], p[1], 4.2 * SC, 3.2 * SC, 8 * SC, 3.6 * SC, a, "#cfe1f2", "#8fa3b8", "#74889d"); });                               // abitacolo
        add(-3, 0, function (p) { box(p[0], p[1], 2 * SC, 2.2 * SC, 11.4 * SC, 2.6 * SC, a, c.ghost ? "#ddd" : "#ffcf5a", "#d9a21b", "#b8860b"); });          // casco
        add(-14, 0, function (p) { box(p[0], p[1], 1.2 * SC, 0.9 * SC, 6 * SC, 4.6 * SC, a, dk, shade(dk, -0.2), shade(dk, -0.3)); });                         // supporto ala posteriore
        add(-16, 0, function (p) { box(p[0], p[1], 2.2 * SC, 10 * SC, 10.4 * SC, 1.8 * SC, a, dk, shade(dk, -0.2), shade(dk, -0.3)); box(p[0] + 0.4 * SC, p[1], 1.4 * SC, 9 * SC, 12.2 * SC, 0.8 * SC, a, bl, shade(bl, -0.2), shade(bl, -0.35)); });   // ala posteriore a due piani
        [-10, 10].forEach(function (ly) { add(-16, ly, function (p) { box(p[0], p[1], 2.6 * SC, 0.7 * SC, 3 * SC, 10 * SC, a, bl, shade(bl, -0.2), shade(bl, -0.35)); }); });     // paratie ala posteriore
        parts.sort(function (u, v) { return ((v.p[0] - cax) * ca + (v.p[1] - cay) * sa) - ((u.p[0] - cax) * ca + (u.p[1] - cay) * sa); });
        parts.forEach(function (q) { q.f(); });
        if (c === me && state === "run") {                                                                      // effetti: scintille delle ruote per livello di boost, fiamma dello scarico
          var lv = c.dd ? (c.meter < 0.22 ? 0 : (c.meter < 0.5 ? 1 : (c.meter < 0.8 ? 2 : 3))) : 0, LC = ["#cfd8e6", "#4fc3ff", "#ff9f1c", "#d94bff"], rw = [at(-9.5, -10.5), at(-9.5, 10.5)];
          if (c.dd) rw.forEach(function (w) { var q = pr(w[0], w[1], 3 + ZO); if (!q) return; var sz = 5 + lv * 3.2; ctx.fillStyle = LC[lv]; for (var z = 0; z < 4 + lv * 2; z++) { ctx.globalAlpha = 0.35 + Math.random() * 0.5; ctx.beginPath(); ctx.arc(q[0] + (Math.random() - 0.5) * sz * 2.2, q[1] + (Math.random() - 0.5) * sz * 1.2, 1.5 + Math.random() * sz * 0.5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; });
          if (c.boostT > 0) { var ex = at(-18, 0), q0 = pr(ex[0], ex[1], 6 + ZO), q1 = pr(ex[0] - co * (22 + Math.random() * 14) * SC, ex[1] - si * (22 + Math.random() * 14) * SC, 6 + ZO); if (q0 && q1) { ctx.strokeStyle = "#ff9a2e"; ctx.lineWidth = Math.max(4, 9 * FF / q0[2] * 0.8); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); ctx.strokeStyle = "#fff3a0"; ctx.lineWidth = Math.max(2, 4 * FF / q0[2] * 0.8); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo((q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2); ctx.stroke(); ctx.lineCap = "butt"; } }
        }
        if (me.tgt === c && me.tq > 0.05 && state === "run" && c.tr2 && c.tr2.length > 2) { var on = me.tw > 0, ga = Math.min(1, 0.35 + me.tq / 1.2); [-6, 6].forEach(function (off2) { ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = on ? "rgba(120,235,255," + (0.45 + 0.4 * ga) + ")" : "rgba(255,255,255," + (0.2 + 0.3 * ga) + ")"; ctx.lineWidth = Math.max(2, 3.4 * FF / Math.max(60, cm(c.x, c.y, 5)[2])); ctx.beginPath(); var st1 = false; c.tr2.forEach(function (tp) { var q = pr(tp[0] - Math.sin(tp[2]) * off2, tp[1] + Math.cos(tp[2]) * off2, 5); if (!q) return; if (!st1) { ctx.moveTo(q[0], q[1]); st1 = true; } else ctx.lineTo(q[0], q[1]); }); ctx.stroke(); ctx.lineCap = "butt"; }); }
        if (false) { var ga = Math.min(1, me.tq / 1.5), ra = at(-17, -5), rb2 = at(-17, 5); [ra, rb2].forEach(function (rp) { var q0 = pr(rp[0], rp[1], 5), q1 = pr(rp[0] - co * 70 * SC, rp[1] - si * 70 * SC, 5); if (q0 && q1) { ctx.strokeStyle = "rgba(255,255,255," + (0.35 + 0.5 * ga) + ")"; ctx.lineWidth = Math.max(2, 3 * FF / q0[2]); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); ctx.lineCap = "butt"; } }); }
        ZO = 0; ctx.globalAlpha = 1;
      }
      function shade(hex, k) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, Math.round(r * (1 + k)))); g = Math.max(0, Math.min(255, Math.round(g * (1 + k)))); b = Math.max(0, Math.min(255, Math.round(b * (1 + k)))); return "rgb(" + r + "," + g + "," + b + ")"; }
      var WIN = ["#ffe39a", "#8ff3ff", "#ffb0e0"];
      function onScrH(x, y, r, h) {                                         // palazzi alti: basta che si veda la base, la metà o il tetto (prima sparivano quando la base usciva dallo schermo)
        if (onScr(x, y, r)) return true;
        for (var q = 1; q <= 2; q++) { var c = cm(x, y, h * q / 2), d = c[2]; if (d > 3400 || d < 40) continue; var m = r * FF / d + 30, sx = W / 2 + c[0] / d * FF, sy = H / 2 - c[1] / d * FF + H * 0.06; if (sx > -m && sx < W + m && sy > -m && sy < H + m) return true; }
        return false;
      }
      function bldg(bt) {                                                                                        // palazzo: facciate con finestre accese, fascia LED e tetto con bordo neon
        var co = Math.cos(bt.ang), si = Math.sin(bt.ang), cs = [[bt.w, bt.d], [bt.w, -bt.d], [-bt.w, -bt.d], [-bt.w, bt.d]].map(function (p) { return [bt.x + p[0] * co - p[1] * si, bt.y + p[0] * si + p[1] * co]; });
        var lo = cs.map(function (p) { return pr(p[0], p[1], 0); }), hi = cs.map(function (p) { return pr(p[0], p[1], bt.h); });
        if (lo.some(function (q) { return !q || q[2] < 40; }) || hi.some(function (q) { return !q || q[2] < 40; })) return;
        var base = tr.pal.tree[bt.c % 3], na = NEON[bt.a % 4], fl = []; for (var i = 0; i < 4; i++) fl.push({ i: i, d: (lo[i][2] + lo[(i + 1) % 4][2]) / 2 }); fl.sort(function (p, q) { return q.d - p.d; });
        var near = lo[0][2] < 1500;
        fl.forEach(function (fc, rank) {
          var i = fc.i, j = (i + 1) % 4, shd = (i % 2) ? shade(base, -0.28) : shade(base, -0.1); quadS(lo[i], lo[j], hi[j], hi[i], shd);
          if (rank < 2 && near) {                                                                                // solo le due facce rivolte alla camera
            var fw = Math.hypot(cs[j][0] - cs[i][0], cs[j][1] - cs[i][1]), nc = Math.max(2, Math.round(fw / 15)), nr = Math.max(3, Math.round(bt.h / 20));
            function F(u, v) { return [lo[i][0] * (1 - u) * (1 - v) + lo[j][0] * u * (1 - v) + hi[j][0] * u * v + hi[i][0] * (1 - u) * v, lo[i][1] * (1 - u) * (1 - v) + lo[j][1] * u * (1 - v) + hi[j][1] * u * v + hi[i][1] * (1 - u) * v, fc.d]; }
            if (bt.band) { var v0 = 0.62, v1 = 0.7; quadS(F(0, v0), F(1, v0), F(1, v1), F(0, v1), na); }
            if (fc.d < 1100) for (var r = 0; r < nr; r++) for (var c = 0; c < nc; c++) { var hv = hh(bt.seed + i * 53 + r * 17 + c * 5); if (hv < 0.38) continue; if (bt.band && r / nr > 0.58 && r / nr < 0.72) continue; var u0 = (c + 0.22) / nc, u1 = (c + 0.78) / nc, w0 = (r + 0.25) / nr, w1 = (r + 0.7) / nr; quadS(F(u0, w0), F(u1, w0), F(u1, w1), F(u0, w1), hv > 0.9 ? WIN[(bt.wc + 1) % 3] : (hv > 0.62 ? WIN[bt.wc % 3] : "#6f6aa6")); }
          }
        });
        quadS(hi[0], hi[1], hi[2], hi[3], shade(base, 0.22));
        ctx.strokeStyle = na; ctx.lineWidth = Math.max(1.2, 3.2 * FF / hi[0][2]); ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(hi[0][0], hi[0][1]); for (var q = 1; q < 4; q++) ctx.lineTo(hi[q][0], hi[q][1]); ctx.closePath(); ctx.stroke();
        if (bt.roof === 1) box(bt.x, bt.y, bt.w * 0.3, bt.d * 0.3, bt.h, 10, bt.ang, "#9a98b8", "#6e6c90", "#585676"); else if (bt.roof === 2) { box(bt.x, bt.y, 1.6, 1.6, bt.h, 30, bt.ang, "#bdbbd8", "#8f8db0", "#78769a"); box(bt.x, bt.y, 3, 3, bt.h + 30, 5, bt.ang, "#ff3d5a", "#ff3d5a", "#b0203a"); }
      }
      function drawGate() {                                                                                      // portale del traguardo: due piloni, trave con scacchi e scritta
        var P0 = tr.P[0], an = tr.ta[0], tx = Math.cos(an), ty = Math.sin(an), nx0 = tr.nx[0], ny0 = tr.ny[0], o = tr.hw + WALL + 14, zb = 74, zt = 100;
        function g3(l, f, z) { return pr(P0[0] + nx0 * l + tx * f, P0[1] + ny0 * l + ty * f, z); }
        [-1, 1].forEach(function (sg) { box(P0[0] + nx0 * o * sg, P0[1] + ny0 * o * sg, 7, 7, 0, zt, an, "#e6e6f2", "#9a9ab8", "#7c7ca0"); box(P0[0] + nx0 * o * sg, P0[1] + ny0 * o * sg, 7.6, 7.6, 0, 8, an, "#ff3db0", "#c4177e", "#9b1062"); });
        var A = g3(-o, -6, zb), B = g3(o, -6, zb), C = g3(o, -6, zt), D = g3(-o, -6, zt); if (!A || !B || !C || !D) return;
        quadS(A, B, C, D, "#1b0a3a"); var nc = 24, ex = g3(-o, 4, zt), ex2 = g3(o, 4, zt); if (ex && ex2) quadS(D, C, ex2, ex, "#3a1670");
        for (var k = 0; k < nc; k++) { var l0 = -o + k * 2 * o / nc, l1 = l0 + 2 * o / nc, z0 = k % 2 ? zb : zb + 6; quadS(g3(l0, -6.2, zb), g3(l1, -6.2, zb), g3(l1, -6.2, zb + 6), g3(l0, -6.2, zb + 6), k % 2 ? "#fff" : "#111"); quadS(g3(l0, -6.2, zt - 6), g3(l1, -6.2, zt - 6), g3(l1, -6.2, zt), g3(l0, -6.2, zt), k % 2 ? "#111" : "#fff"); }
        var h = Math.abs(D[1] - A[1]); if (h > 8) { ctx.font = "400 " + Math.round(h * 0.34) + "px Bungee,Rajdhani,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; var cx0 = (A[0] + B[0]) / 2, cy0 = (A[1] + D[1]) / 2; ctx.lineWidth = Math.max(1, h * 0.04); ctx.strokeStyle = "#6b1f66"; ctx.strokeText("SDROGO ARCADE", cx0, cy0); ctx.fillStyle = "#ffd23b"; ctx.fillText("SDROGO ARCADE", cx0, cy0); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }
        [-0.62, -0.2, 0.2, 0.62].forEach(function (f) { var q = g3(o * f, -6.5, zb - 2); if (q) { ctx.fillStyle = "#ff2b4a"; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(2, 3.4 * FF / q[2]), 0, 7); ctx.fill(); } });
      }
      function drawGrid() {                                                                                      // caselle di partenza numerate sull'asfalto
        var an = tr.ta[0], tx = Math.cos(an), ty = Math.sin(an), nx0 = tr.nx[0], ny0 = tr.ny[0], P0 = tr.P[0], n = cars.length;
        for (var sl = 0; sl < n; sl++) { var row = Math.floor(sl / 2), side = sl % 2 ? 1 : -1, cf = -(40 + row * 44), cl = side * 28;
          function gp(f, l) { return cm(P0[0] + tx * (cf + f) + nx0 * (cl + l), P0[1] + ty * (cf + f) + ny0 * (cl + l), 0.7); }
          var L = [[-20, -14, -20, 14, 3, 28], [-20, -14, 20, -14, 2, 3], [-20, 14, 20, 14, 2, 3]];
          quad(gp(-21, -15), gp(-21, 15), gp(-18, 15), gp(-18, -15), "rgba(255,255,255,.85)"); quad(gp(-21, -15), gp(14, -15), gp(14, -12.5), gp(-21, -12.5), "rgba(255,255,255,.85)"); quad(gp(-21, 12.5), gp(14, 12.5), gp(14, 15), gp(-21, 15), "rgba(255,255,255,.85)");
          var tp = pr(P0[0] + tx * (cf - 4) + nx0 * cl, P0[1] + ty * (cf - 4) + ny0 * cl, 0.7); if (tp && tp[2] < 900) { ctx.font = "400 " + Math.round(Math.max(9, 26 * FF / tp[2])) + "px Bungee,Rajdhani,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillText(String(sl + 1), tp[0], tp[1]); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; } }
      }
      var pcx = camx, pcy = camy, pcA = camA;
      function vis() { return cars.concat(typeof gl !== "undefined" && gl ? gl : [], typeof qgh !== "undefined" && qgh ? qgh : []); }
      function lerpA(a0, a1, u) { var d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a0 + d * u; }
      function drawI(al) {                                                // disegna lo stato "tra" due passi di fisica (interpolazione): movimento fluido a 60, 90 o 120 Hz. La fisica non cambia.
        al = Math.max(0, Math.min(1, al)); var V = vis(), sv = V.map(function (c) { return [c.x, c.y, c.a]; }), cs = [camx, camy, camA], it0 = introT;
        V.forEach(function (c) { if (c.px !== undefined && !c.fin) { c.x = c.px + (c.x - c.px) * al; c.y = c.py + (c.y - c.py) * al; c.a = lerpA(c.pa, c.a, al); } });
        camx = pcx + (camx - pcx) * al; camy = pcy + (camy - pcy) * al; camA = lerpA(pcA, camA, al); if (state === "intro") introT += al * DT;
        if (window.__RDBG) window.__RDBG.push([performance.now(), me.x, me.y, camx, camy, camA]);
        try { draw(); } finally { V.forEach(function (c, i) { c.x = sv[i][0]; c.y = sv[i][1]; c.a = sv[i][2]; }); camx = cs[0]; camy = cs[1]; camA = cs[2]; introT = it0; }
      }
      function camStep() {                                                // la camera si muove insieme alla fisica (60 passi/s), non a ogni disegno: così non dipende dagli Hz dello schermo
        var va = Math.atan2(me.vy, me.vx), tgtA = Math.hypot(me.vx, me.vy) > 50 ? Math.atan2(Math.sin(me.a) + Math.sin(va), Math.cos(me.a) + Math.cos(va)) : me.a, da = tgtA - camA; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; camA += da * 0.09;
        if (state !== "intro") { camx += (me.x - camx) * 0.25; camy += (me.y - camy) * 0.25; }
      }
      function draw() {
        if (state === "intro") { var u = Math.min(0.9999, introT / INTRO), sn4 = Math.floor(u * 4), lv4 = u * 4 - sn4, pp4 = lv4 * 0.7 + lv4 * lv4 * (3 - 2 * lv4) * 0.3, yaw4 = (sn4 % 2 ? -1 : 1) * (0.55 - 0.3 * pp4), fi = shots[sn4] - 6 + 12 * pp4, j0 = Math.floor(fi + tr.N) % tr.N, j1 = (j0 + 1) % tr.N, fu = fi - Math.floor(fi), d1 = tr.ta[j1] - tr.ta[j0]; while (d1 > Math.PI) d1 -= 2 * Math.PI; while (d1 < -Math.PI) d1 += 2 * Math.PI; camx = tr.P[j0][0] + (tr.P[j1][0] - tr.P[j0][0]) * fu; camy = tr.P[j0][1] + (tr.P[j1][1] - tr.P[j0][1]) * fu; camA = tr.ta[j0] + d1 * fu + yaw4; cv.style.opacity = lv4 < 0.1 ? 0.15 + lv4 * 8.5 : (lv4 > 0.92 ? 0.15 + (1 - lv4) * 10.6 : 1); } else if (cv.style.opacity !== "1") cv.style.opacity = "1";
        ca = Math.cos(camA); sa = Math.sin(camA); var spd = state === "intro" ? 0.3 : Math.min(1, Math.hypot(me.vx, me.vy) / 600); cax = camx - ca * (DB + 40 * spd); cay = camy - sa * (DB + 40 * spd); FF = H * (FOC - 0.06 * spd + (me.boostT > 0 ? 0.05 : 0));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = tr.pal.sky; ctx.fillRect(0, 0, W, H); ctx.fillStyle = tr.pal.bg || tr.pal.g1; ctx.fillRect(0, H * 0.02, W, H);
        var N = tr.N, hw = tr.hw, wl = hw + WALL, lim = wl + 300;
        var pt = function (i, o, z) { return cm(tr.P[i][0] + tr.nx[i] * o, tr.P[i][1] + tr.ny[i] * o, z || 0); };
        var vis = [];                                                                                                                       // si disegna TUTTA la pista che si vede (non una finestra di indici): niente pezzi che spariscono
        for (var i0 = 0; i0 < N; i0++) { var c0 = cm(tr.P[i0][0], tr.P[i0][1], 0), d0 = c0[2]; if (d0 > 3000) continue; if (d0 > NEAR + 120) { var m0 = lim * FF / d0 + 40, sx0 = W / 2 + c0[0] / d0 * FF, sy0 = H / 2 - c0[1] / d0 * FF + H * 0.06; if (sx0 < -m0 || sx0 > W + m0 || sy0 < -m0 || sy0 > H + m0) continue; } else if (d0 < -lim) continue; if (d0 > 600 * QL && (i0 & (d0 > 1400 * QL ? 3 : 1))) continue; vis.push([i0, d0]); }
        var inc = {}; vis.forEach(function (q) { inc[q[0]] = 1; });
        vis.sort(function (a, b) { return b[1] - a[1]; });
        for (var vj = 0; vj < vis.length; vj++) {
          var i = vis[vj][0], st = vis[vj][1] > 1400 * QL ? 4 : (vis[vj][1] > 600 * QL ? 2 : 1), far = st === 4, i2 = (i + st) % N, alt = ((i >> 1) & 1) === 0, alt4 = ((i >> 2) & 1) === 0; for (var nq = 1; nq <= 4; nq++) if (inc[(i + nq) % N]) { i2 = (i + nq) % N; break; }
          if (tr.gap[i]) {                                                                                                                  // fiumiciattolo: sotto la rampa c'è il vuoto
            quad(pt(i, -(wl + 280)), pt(i, wl + 280), pt(i2, wl + 280), pt(i2, -(wl + 280)), alt ? "#2f96d8" : "#3aa6e8"); quad(pt(i, -wl, 0.2), pt(i, wl, 0.2), pt(i2, wl, 0.2), pt(i2, -wl, 0.2), alt ? "#1f7fc0" : "#2a8cd0");
            if (i % 3 === 0) quad(pt(i, -hw * 0.6, 0.4), pt(i, hw * 0.1, 0.4), pt(i2, hw * 0.1, 0.4), pt(i2, -hw * 0.6, 0.4), "rgba(255,255,255,.22)");
            quad(pt(i, -(wl + 280), 0.1), pt(i, -wl, 0.1), pt(i2, -wl, 0.1), pt(i2, -(wl + 280), 0.1), "rgba(255,255,255,.18)"); continue;
          }
          [1, -1].forEach(function (sg) {
            var dst = (i2 - i + N) % N, ko = 0, ka, kb, st2;                                                                           // erba, cordolo: strisce sempre della stessa lunghezza (4 e 2 campioni) a qualunque distanza, così non sfarfallano
            while (ko < dst) { ka = (i + ko) % N; st2 = Math.min(4 - (ka & 3), dst - ko); kb = (ka + st2) % N; quad(pt(ka, (hw + KERB) * sg), pt(ka, wl * sg), pt(kb, wl * sg), pt(kb, (hw + KERB) * sg), ((ka >> 2) & 1) === 0 ? tr.pal.g1 : tr.pal.g2); ko += st2; }
            ko = 0; while (ko < dst) { ka = (i + ko) % N; st2 = Math.min(2 - (ka & 1), dst - ko); kb = (ka + st2) % N; quad(pt(ka, hw * sg), pt(ka, (hw + KERB) * sg), pt(kb, (hw + KERB) * sg), pt(kb, hw * sg), ((ka >> 1) & 1) === 0 ? "#e0203f" : "#f4f4f6"); ko += st2; }
            if (tr.pal.dots && st === 1) { for (var dk = 0; dk < dst; dk++) { var da = (i + dk) % N; for (var dq = 0; dq < 3; dq++) { var h1 = hh(da * 7 + dq * 131 + (sg > 0 ? 977 : 0) + (tr._ti != null ? tr._ti : (tr._ti = tIdx(tr))) * 31), h2 = hh(da * 13 + dq * 71 + 5), h3 = hh(da * 29 + dq * 17 + 9), dof = (hw + KERB + 4 + h1 * (WALL - KERB - 8)) * sg, dx0 = tr.P[da][0] + tr.nx[da] * dof + Math.cos(tr.ta[da]) * h2 * tr.sp, dy0 = tr.P[da][1] + tr.nx[da] * 0 + tr.ny[da] * dof + Math.sin(tr.ta[da]) * h2 * tr.sp, ds = 1.3 + h3 * 2.2; quad(cm(dx0 - ds, dy0 - ds, 0.5), cm(dx0 + ds, dy0 - ds, 0.5), cm(dx0 + ds, dy0 + ds, 0.5), cm(dx0 - ds, dy0 + ds, 0.5), tr.pal.dots[(da + dq) % tr.pal.dots.length]); } } }
            if (tr.theme === "city") { ko = 0; while (ko < dst) { ka = (i + ko) % N; st2 = Math.min(4 - (ka & 3), dst - ko); kb = (ka + st2) % N; quad(pt(ka, (wl + 8) * sg), pt(ka, (wl + 100) * sg), pt(kb, (wl + 100) * sg), pt(kb, (wl + 8) * sg), ((ka >> 2) & 1) === 0 ? "#2e2d46" : "#35344f"); quad(pt(ka, (wl + 8) * sg), pt(ka, (wl + 13) * sg), pt(kb, (wl + 13) * sg), pt(kb, (wl + 8) * sg), "#8d8cb8"); ko += st2; } }
          });
          quad(pt(i, -hw), pt(i, hw), pt(i2, hw), pt(i2, -hw), alt4 ? tr.pal.road[0] : tr.pal.road[1]);
          if (!far) { var dsc = (i2 - i + N) % N, kc = 0; while (kc < dsc) { var qa = (i + kc) % N, q3 = Math.min(3 - (qa % 3), dsc - kc), qb = (qa + q3) % N; if ((Math.floor(qa / 3) & 1) === 0) quad(pt(qa, -2), pt(qa, 2), pt(qb, 2), pt(qb, -2), "rgba(255,255,255,.4)"); kc += q3; } }
          if (i === 0) { var cn = 10; for (var cc = 0; cc < cn; cc++) { var oa = -hw + cc * (hw * 2 / cn), ob = oa + hw * 2 / cn; quad(pt(i, oa), pt(i, ob), pt(i2, ob), pt(i2, oa), cc % 2 ? "#fff" : "#111"); quad(pt(i2, oa), pt(i2, ob), pt(((i2 + 1) % N), ob), pt(((i2 + 1) % N), oa), cc % 2 ? "#111" : "#fff"); } }
          [1, -1].forEach(function (sg) {                                                                                                   // barriera: blocco scuro con bordo azzurro
            var o = wl * sg; quad(pt(i, o, 0), pt(i2, o, 0), pt(i2, o, 15), pt(i, o, 15), "#2b2f3c"); var dsw = (i2 - i + N) % N, kw = 0; while (kw < dsw) { var wa = (i + kw) % N, w2 = Math.min(2 - (wa & 1), dsw - kw), wb = (wa + w2) % N; quad(pt(wa, o, 15), pt(wb, o, 15), pt(wb, o + 7 * sg, 15), pt(wa, o + 7 * sg, 15), ((wa >> 1) & 1) === 0 ? "#8fa0c8" : "#c6d2f0"); kw += w2; }
          });
        }
        (tr.spons || []).forEach(function (sp) {                                                                                            // cartelloni sponsor dietro la barriera (solo vicino, il testo segue la prospettiva)
          var i1 = sp.i, i2b = (sp.i + sp.n) % N, o = (wl + 5) * sp.side, z0 = 17, z1 = 40, xa = tr.P[i1][0] + tr.nx[i1] * o, ya = tr.P[i1][1] + tr.ny[i1] * o, xb = tr.P[i2b][0] + tr.nx[i2b] * o, yb = tr.P[i2b][1] + tr.ny[i2b] * o;
          if (!onScr((xa + xb) / 2, (ya + yb) / 2, 260)) return;
          var A0 = pr(xa, ya, z0), B0 = pr(xb, yb, z0), C0 = pr(xb, yb, z1), D0 = pr(xa, ya, z1); if (!A0 || !B0 || !C0 || !D0 || A0[2] > 1500) return;
          quadS(A0, B0, C0, D0, sp.bg); quadS(D0, C0, [C0[0], C0[1] - 2, 0], [D0[0], D0[1] - 2, 0], sp.fg);
          var wv = Math.hypot(B0[0] - A0[0], B0[1] - A0[1]), hv = Math.hypot(D0[0] - A0[0], D0[1] - A0[1]); if (wv < 24 || hv < 6) return;
          ctx.save(); ctx.transform((C0[0] - D0[0]) / 200, (C0[1] - D0[1]) / 200, (A0[0] - D0[0]) / 50, (A0[1] - D0[1]) / 50, D0[0], D0[1]);
          ctx.font = "400 26px Bungee,Rajdhani,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = sp.fg; var tw = ctx.measureText(sp.t).width; if (tw > 184) ctx.font = "400 " + Math.floor(26 * 184 / tw) + "px Bungee,Rajdhani,sans-serif"; ctx.fillText(sp.t, 100, 27); ctx.restore();
        });
        tr.items.forEach(function (it) {                                                                                                     // decalcomanie piatte: pozze, pedane boost, rampe
          if (it.gone > 0 || !onScr(it.x, it.y, 160)) return;
          var ang = tr.ta[it.idx], c2 = Math.cos(ang), s2 = Math.sin(ang);
          function pq(a, b, z) { return cm(it.x + a * c2 - b * s2, it.y + a * s2 + b * c2, z == null ? 0.6 : z); }
          if (it.t === "oil" || it.t === "water") {
            var wat = it.t === "water", seed = it.idx * 0.7, LY = wat ? [["#1e6fb8", 1, 0, 0], ["#3b98e0", 0.8, -0.06, 0.1], ["#8fd3ff", 0.46, -0.14, 0.2]] : [["#0b0a12", 1, 0, 0], ["#26233b", 0.74, -0.08, 0.1], ["rgba(120,110,210,.42)", 0.4, -0.16, 0.2]];
            LY.forEach(function (L) {                                                                                                         // sagoma irregolare (non un cerchio), allineata alla pista
              var pts = [], ok = true;
              for (var q = 0; q < 18; q++) { var an = q / 18 * 6.2832, rr = (29 + 7 * Math.sin(3 * an + seed) + 4 * Math.sin(5 * an + 2 * seed) + 3 * Math.cos(2 * an + seed)) * L[1], pc = pq(Math.cos(an) * rr * 1.25 + L[2] * 30, Math.sin(an) * rr * 0.9, 0.5 + L[3]); if (pc[2] < 70) { ok = false; break; } pts.push(sp2(pc)); }
              if (!ok) return; ctx.fillStyle = L[0]; ctx.beginPath(); pts.forEach(function (p, q) { if (q) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill();
            });
            if (wat) { quad(pq(-18, -6, 0.8), pq(-4, -10, 0.8), pq(6, -4, 0.8), pq(-10, 2, 0.8), "rgba(255,255,255,.55)"); quad(pq(6, 8, 0.8), pq(14, 4, 0.8), pq(18, 9, 0.8), pq(9, 12, 0.8), "rgba(255,255,255,.4)"); }
            else { quad(pq(-16, -6, 0.8), pq(-2, -10, 0.8), pq(4, -4, 0.8), pq(-10, 1, 0.8), "rgba(150,230,200,.35)"); quad(pq(2, 6, 0.8), pq(12, 3, 0.8), pq(16, 8, 0.8), pq(6, 11, 0.8), "rgba(220,150,255,.3)"); }
          }
          else if (it.t === "jump") {
            var ie = (it.idx + 3) % tr.N; quad(pt(ie, -tr.hw, 0), pt(ie, tr.hw, 0), pt(ie, tr.hw, 27.8), pt(ie, -tr.hw, 27.8), "#3b0d26");                      // fronte della rampa sul vuoto (dietro la rampa)
            for (var rq = 0; rq < 3; rq++) { var iq = (it.idx + rq) % tr.N, iq2 = (iq + 1) % tr.N, z0 = rq * 9, z1 = z0 + 9, nb = 6;
              [1, -1].forEach(function (sg) { quad(pt(iq, tr.hw * sg, 0), pt(iq2, tr.hw * sg, 0), pt(iq2, tr.hw * sg, z1), pt(iq, tr.hw * sg, z0), "#6d1a46"); quad(pt(iq, (tr.hw + 8) * sg, 0), pt(iq2, (tr.hw + 8) * sg, 0), pt(iq2, tr.hw * sg, 0), pt(iq, tr.hw * sg, 0), "rgba(0,0,0,.25)"); });
              for (var cb = 0; cb < nb; cb++) { var l0 = -tr.hw + cb * (2 * tr.hw / nb), l1 = l0 + 2 * tr.hw / nb, cl = (rq + cb) % 2 ? "#ff5aa8" : "#ffe2f1"; quad(pt(iq, l0, z0 + 0.8), pt(iq, l1, z0 + 0.8), pt(iq2, l1, z1 + 0.8), pt(iq2, l0, z1 + 0.8), cl); } }
            for (var cb2 = 0; cb2 < 6; cb2++) { var m0 = -tr.hw + cb2 * (2 * tr.hw / 6), m1 = m0 + 2 * tr.hw / 6; quad(pt((it.idx + 8) % tr.N, m0, 0.8), pt((it.idx + 8) % tr.N, m1, 0.8), pt((it.idx + 9) % tr.N, m1, 0.8), pt((it.idx + 9) % tr.N, m0, 0.8), cb2 % 2 ? "#ff5aa8" : "#fff"); }
          }
          else {                                                                                                                              // pedana boost: base scura con frecce dritte
            var big = it.t === "turbo", C1 = big ? "#c77bff" : "#ffd23b", C0 = big ? "#2a0f4a" : "#3a2f08", nch = big ? 3 : 2, wd = big ? 24 : 20;
            quad(pq(-24, -wd - 4), pq(24, -wd - 4), pq(24, wd + 4), pq(-24, wd + 4), C1); quad(pq(-21, -wd - 1), pq(21, -wd - 1), pq(21, wd + 1), pq(-21, wd + 1), C0);
            for (var ch = 0; ch < nch; ch++) { var a0 = -12 + ch * 13 - (nch === 3 ? 3 : 0); quad(pq(a0 - 6, -wd + 6), pq(a0, -wd + 6), pq(a0 + 9, 0), pq(a0 + 3, 0), C1); quad(pq(a0 - 6, wd - 6), pq(a0, wd - 6), pq(a0 + 9, 0), pq(a0 + 3, 0), C1); }
          }
        });
        drawGrid();
        trail.forEach(function (sgm, si2) { if (sgm.length < 2) return; ctx.lineCap = "round"; for (var side = 0; side < 2; side++) { ctx.strokeStyle = "rgba(25,22,35," + (0.18 + 0.4 * (si2 + 1) / trail.length) + ")"; ctx.lineWidth = 4; ctx.beginPath(); var st0 = false; for (var q = 0; q < sgm.length; q++) { var pp2 = pr(sgm[q][side * 2], sgm[q][side * 2 + 1], 0.4); if (!pp2) { st0 = false; continue; } ctx.lineWidth = Math.max(2, 7 * FF / pp2[2]); if (!st0) { ctx.moveTo(pp2[0], pp2[1]); st0 = true; } else ctx.lineTo(pp2[0], pp2[1]); } ctx.stroke(); } ctx.lineCap = "butt"; });
        tr.deco.forEach(function (dc) { if (dc.t !== "pond" || !onScr(dc.x, dc.y, Math.max(dc.w, dc.h) * 1.3)) return; var cp = Math.cos(dc.a), sp3 = Math.sin(dc.a);
          function pw(a, b) { return cm(dc.x + a * cp - b * sp3, dc.y + a * sp3 + b * cp, 0.3); }
          quad(pw(-dc.w, -dc.h), pw(dc.w, -dc.h), pw(dc.w, dc.h), pw(-dc.w, dc.h), "#3aa6e8"); quad(pw(-dc.w * 0.7, -dc.h * 0.5), pw(dc.w * 0.2, -dc.h * 0.5), pw(dc.w * 0.2, -dc.h * 0.2), pw(-dc.w * 0.7, -dc.h * 0.2), "rgba(255,255,255,.35)"); });
        if (tr.night) {                                                                                         // notte: sfondo scuro, la pista non è illuminata a giorno; pozze di luce sotto i lampioni e fari
          var nk = tr.theme === "city" ? 1 : 0.6, ng = ctx.createLinearGradient(0, 0, 0, H); ng.addColorStop(0, "rgba(3,2,18," + (0.78 * nk) + ")"); ng.addColorStop(0.5, "rgba(3,2,18," + (0.4 * nk) + ")"); ng.addColorStop(1, "rgba(3,2,18," + (0.22 * nk) + ")"); ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          function pool(wx, wy, rad, col, al) { var c0 = cm(wx, wy, 0); if (c0[2] < 80 || c0[2] > 1500) return; var q = sp2(c0), rs = rad * FF / c0[2], gr = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], rs); gr.addColorStop(0, "rgba(" + col + "," + al + ")"); gr.addColorStop(1, "rgba(" + col + ",0)"); ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(1, 0.62); ctx.translate(-q[0], -q[1]); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q[0], q[1], rs, 0, 7); ctx.fill(); ctx.restore(); }
          tr.deco.forEach(function (dc) { if (dc.t === "lamp" && onScr(dc.x, dc.y, 160)) pool(dc.x - Math.cos(tr.ta[0] * 0) * 0, dc.y, 150, dc.c % 3 === 0 ? "120,200,255" : "255,215,140", 0.34); });
          { var fa = me.a; pool(me.x + Math.cos(fa) * 170, me.y + Math.sin(fa) * 170, 230, "255,244,210", 0.3); }
          ctx.restore();
        }
        var objs = []; tr.deco.forEach(function (dc) { if (dc.t === "pond" || !onScr(dc.x, dc.y, 30) || (dc.x - cax) * ca + (dc.y - cay) * sa > 900 * QL) return; objs.push({ d: (dc.x - cax) * ca + (dc.y - cay) * sa, dc: dc }); });
        tr.trees.forEach(function (tt) { if (!tt.sand && (tt.b ? onScrH(tt.x, tt.y, tt.s + 70, tt.h) : onScr(tt.x, tt.y, tt.s + 70)) && (tt.x - cax) * ca + (tt.y - cay) * sa < (tt.b ? 3000 : 2300) * QL) objs.push({ d: (tt.x - cax) * ca + (tt.y - cay) * sa, t: tt }); });
        if (onScr(tr.P[0][0], tr.P[0][1], hw + 90)) objs.push({ d: (tr.P[0][0] - cax) * ca + (tr.P[0][1] - cay) * sa, gate: true });
        cars.forEach(function (c) { objs.push({ d: (c.x - cax) * ca + (c.y - cay) * sa, c: c }); }); if (state === "run") allG().forEach(function (g) { objs.push({ d: (g.x - cax) * ca + (g.y - cay) * sa, c: g }); });
        objs.sort(function (a, b) { return b.d - a.d; });
        if (window.__RACE_STATS) window.__RACE_STATS = { vis: vis.length, objs: objs.length, trees: objs.filter(function (q) { return q.t; }).length };
        var FLC = ["#ff6fb0", "#ffd23b", "#fff", "#ff8a3b"];
        objs.forEach(function (o) {
          if (o.c) carBox(o.c);
          else if (o.gate) drawGate();
          else if (o.dc) { var dc = o.dc; if (dc.t === "lamp") { box(dc.x, dc.y, 1.4, 1.4, 0, 46, camA, "#8a8fa8", "#5c6078", "#4a4e64"); box(dc.x, dc.y, 4.5, 4.5, 46, 5, camA, "#fff7b0", NEON[dc.c % 3 === 0 ? 2 : 1], NEON[dc.c % 3 === 0 ? 2 : 1]); } else if (dc.t === "flower") { box(dc.x, dc.y, 2, 2, 0, 5, camA, FLC[dc.c], shade(FLC[dc.c], -0.2), shade(FLC[dc.c], -0.35)); box(dc.x, dc.y, 1, 1, 0, 2, camA, "#2a8a30", "#1f6a28", "#1f6a28"); } else box(dc.x, dc.y, 7, 6, 0, 7, camA, "#b8bcc8", "#8a8e9c", "#6f7382"); }
          else if (o.t.b) bldg(o.t);
          else { var tt = o.t, tc = tr.pal.tree[tt.c % 3]; if (o.d < 1100) box(tt.x, tt.y, tt.s / 5, tt.s / 5, 0, tt.h * 0.45, camA, "#8a5a2b", "#6a421c", "#573612"); box(tt.x, tt.y, tt.s / 2, tt.s / 2, tt.h * 0.3, tt.h * 0.85, camA, tc, shade(tc, -0.35), shade(tc, -0.2)); }
        });
        (state === "intro" ? [] : (state === "run" ? cars.concat(allG()) : cars)).forEach(function (c) {                                                                  // etichette: nome sopra le auto lontane / freccia ai bordi se fuori vista
          if (c === me) return; var p = pr(c.x, c.y, 16), dist = Math.hypot(c.x - me.x, c.y - me.y), out = !p || p[0] < 24 || p[0] > W - 24 || p[1] < 24 || p[1] > H - 70, x, y;
          if (p) { x = Math.max(34, Math.min(W - 34, p[0])); y = Math.max(40, Math.min(H - 80, p[1] - 26)); } else { x = W / 2; y = H - 84; }
          ctx.font = "700 13px Rajdhani,sans-serif"; var txt = c.name + (dist > 260 ? "  " + Math.round(dist / 10) + "m" : ""), tw = ctx.measureText(txt).width + 14;
          ctx.fillStyle = "rgba(8,4,20,.62)"; ctx.fillRect(x - tw / 2, y - 10, tw, 20); ctx.fillStyle = c.col; ctx.fillRect(x - tw / 2, y - 10, 4, 20);
          ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText((out ? (p ? "" : "▼ ") : "") + txt, x + 2, y); ctx.textAlign = "left";
        });
        // minimappa: il riquadro si adatta alla forma della pista; settori colorati, quello in corso più marcato
        if (!tr.bb) { var q0 = 1e9, q1 = -1e9, r0 = 1e9, r1 = -1e9; tr.P.forEach(function (p) { q0 = Math.min(q0, p[0]); q1 = Math.max(q1, p[0]); r0 = Math.min(r0, p[1]); r1 = Math.max(r1, p[1]); }); tr.bb = [q0, q1, r0, r1]; }
        var bb = tr.bb, bw = Math.max(1, bb[1] - bb[0]), bh = Math.max(1, bb[3] - bb[2]), ms = Math.min(168 / bw, 108 / bh), MW = Math.round(bw * ms) + 20, MH = Math.round(bh * ms) + 20, mx0 = W - MW - 10, my0 = 10 + insT;
        if (mmK !== MW + "x" + MH + ":" + insT) { mmK = MW + "x" + MH + ":" + insT; tower.style.top = (my0 + MH + 8) + "px"; xb.style.setProperty("right", (MW + 20) + "px", "important"); }
        var mp = function (p) { return [mx0 + 10 + (p[0] - bb[0]) * ms, my0 + 10 + (p[1] - bb[2]) * ms]; };
        ctx.fillStyle = "rgba(8,4,20,.55)"; ctx.fillRect(mx0, my0, MW, MH); ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1; ctx.strokeRect(mx0 + .5, my0 + .5, MW - 1, MH - 1);
        var SCOL = ["#6fd2ff", "#ffd23b", "#ff7ad9"], curS = Math.min(2, secNo % 3), Nn = tr.N; ctx.lineJoin = "round"; ctx.lineCap = "butt";
        for (var sc2 = 0; sc2 < 3; sc2++) { ctx.strokeStyle = SCOL[sc2]; ctx.globalAlpha = sc2 === curS ? 1 : 0.55; ctx.lineWidth = sc2 === curS ? 4 : 2.6; ctx.beginPath(); var s0 = Math.floor(Nn * sc2 / 3), s1 = sc2 === 2 ? Nn : Math.floor(Nn * (sc2 + 1) / 3); for (var k3 = s0; k3 <= s1; k3++) { var m3 = mp(tr.P[k3 % Nn]); if (k3 === s0) ctx.moveTo(m3[0], m3[1]); else ctx.lineTo(m3[0], m3[1]); } ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.font = "700 10px Rajdhani,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (var sc3 = 0; sc3 < 3; sc3++) { var mm = mp(tr.P[Math.floor(Nn * (sc3 + 0.5) / 3)]), nn2 = tr.P[Math.floor(Nn * (sc3 + 0.5) / 3)], vx2 = mm[0] - (mx0 + MW / 2), vy2 = mm[1] - (my0 + MH / 2), vl = Math.hypot(vx2, vy2) || 1; ctx.fillStyle = SCOL[sc3]; ctx.fillText("S" + (sc3 + 1), mm[0] + vx2 / vl * 11, mm[1] + vy2 / vl * 11); }
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        for (var sc4 = 1; sc4 < 3; sc4++) { var tb = mp(tr.P[Math.floor(Nn * sc4 / 3)]); ctx.fillStyle = "#fff"; ctx.fillRect(tb[0] - 2, tb[1] - 2, 4, 4); }
        var fm = mp(tr.P[0]); ctx.fillStyle = "#fff"; ctx.fillRect(fm[0] - 4, fm[1] - 4, 8, 8); ctx.fillStyle = "#111"; ctx.fillRect(fm[0] - 4, fm[1] - 4, 4, 4); ctx.fillRect(fm[0], fm[1], 4, 4); ctx.strokeStyle = "#ffd23b"; ctx.lineWidth = 1.5; ctx.strokeRect(fm[0] - 4, fm[1] - 4, 8, 8);
        cars.slice().reverse().forEach(function (c) { var mc = mp([c.x, c.y]); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(mc[0], mc[1], c === me ? 5.5 : 4.2, 0, 7); ctx.fill(); ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(mc[0], mc[1], c === me ? 4 : 3, 0, 7); ctx.fill(); });
      }
      function hudDraw() {
        full.className = "rc2" + (state === "intro" ? " intro" : "") + (state === "count" ? " cnt" : "") + (paused ? " paus" : "") + (me.tw > 0 ? " slip" : "") + (qual ? " qual" : "") + (state === "run" && t < 0.6 ? " gol" : ""); if (state === "count") { lchF.style.height = Math.min(100, rev2 * 100) + "%"; lchF.className = rev2 > 1 ? "bad" : (rev2 >= 0.72 ? "ok" : ""); } if (state === "intro") intro.style.display = ""; else if (intro.style.display !== "none") intro.style.display = "none";
        if (state === "wait") { var rl2 = (RMT.sy.rdy && RMT.sy.rdy[PH]) || []; tip.textContent = "⏳ In attesa degli altri piloti… " + rl2.length + "/" + Math.max(rl2.length, (RMT.pl || []).filter(function (p) { return p.online !== false; }).length) + " pronti"; msgT = 1; }
        var pos = rank().indexOf(me), v = Math.round(Math.hypot(me.vx, me.vy) * 0.5), curLap = Math.min(me.lap, laps);
        hud.innerHTML = (solo || qual ? "" : "<b class='p'>" + ORD[pos] + "</b>") + "<span>GIRO " + curLap + "/" + laps + "</span><span>" + v + " km/h</span>" + "";
        { var vs = Math.hypot(me.vx, me.vy) / 520, cnt = state === "count" || state === "intro"; AU.engine(paused || state === "end" ? -1 : (cnt ? Math.min(1, rev2) * 0.7 : vs), me.boostT > 0, !!me.dd && !paused, me.off && !paused, cnt || paused);
          if (me.boostT > 0 && !pBoost) AU.sfx("boost"); pBoost = me.boostT > 0; if (me.hit > 0.29 && !pHit) AU.sfx("hit"); pHit = me.hit > 0.29; if (me.spin > 0 && !pSpin) AU.sfx("spin"); pSpin = me.spin > 0; }
        bfill.style.width = Math.round(me.meter * 100) + "%"; var lvB = me.meter < 0.22 ? 0 : (me.meter < 0.5 ? 1 : (me.meter < 0.8 ? 2 : 3)); bbar.className = "rc2-boost lv" + lvB + (me.boostT > 0 ? " hot" : "") + (me.dd ? " drift" : "");
        if (state !== "count") { var cur = Math.min(2, secNo % 3), done3 = secNo >= 3 * laps; while (sec.children.length < 3) sec.appendChild(el("span", "sc"));
          for (var q = 0; q < 3; q++) { var ch = sec.children[q], isDone = done3 || q < cur, isCur = !done3 && q === cur, tmv = isCur ? t - secStart : secPrev[q]; ch.className = "sc" + (isCur ? " cur" : (isDone && secCols[q] ? " " + secCols[q] : (secCols[q] ? " dim " + secCols[q] : ""))); ch.textContent = "S" + (q + 1) + (tmv ? " " + tmv.toFixed(2) : ""); } }
        if (state === "run" || state === "end") {                                                                                   // tempo del giro in corso, giro precedente e differenza
          var cl = Math.max(0, t - lapStart), pl = lapT.length ? lapT[lapT.length - 1] : 0, ppl = lapT.length > 1 ? lapT[lapT.length - 2] : 0, dl = pl && ppl ? pl - ppl : 0, bl = lapT.length ? Math.min.apply(null, lapT) : 0;
          if (!lapB) { lapb.innerHTML = "<b></b><span></span>"; lapB = lapb.firstChild; lapS = lapb.lastChild; }
          lapB.textContent = fmt(cl); var showP = pl && t - prevAt < 5; lapb.classList.toggle("prev", !!showP); if (showP) { lapS.innerHTML = "PREC " + fmt(pl) + (dl ? " <i class='" + (dl < 0 ? (pl <= bl + 1e-9 ? "f" : "g") : "r") + "'>" + (dl < 0 ? "−" : "+") + Math.abs(dl).toFixed(2) + "</i>" : ""); lapS.style.opacity = Math.min(1, (5 - (t - prevAt)) / 1.2); } else lapS.style.opacity = 0;
        }
        if (!solo && (twc++ % 5 === 0)) {                                                                                       // classifica live stile F1: nome corto e distacco dall'auto davanti (in secondi, tre decimali)
          var rk = rank(), rows = "";
          var mi = rk.indexOf(me), ws = Math.min(Math.max(mi - 2, 1), Math.max(1, rk.length - 4));
          rk.forEach(function (c, j) {
            if (rk.length > 5 && j > 0 && (j < ws || j >= ws + 4)) return;
            var gap = "", cls = c === me ? " me" : "";
            if (j === 0) gap = "LEADER";
            else { var Ah = rk[0], ld = Math.floor((Ah.prog - c.prog) / tr.N);
              if (c.fin && Ah.fin) gap = "+" + Math.max(0, c.finT - Ah.finT).toFixed(3); else if (ld >= 1) gap = "+" + ld + (ld > 1 ? " GIRI" : " GIRO"); else { var h0 = Ah.hist[Math.floor(c.prog) + 60]; gap = h0 >= 0 ? "+" + Math.max(0, t - h0).toFixed(3) : "—"; } }
            rows += "<div class='tr" + cls + "'><b>" + (j + 1) + "</b><i style='background:" + c.col + "'></i><span>" + (c === me ? "TU" : c.name.slice(0, 3).toUpperCase()) + "</span><em>" + gap + "</em></div>";
          });
          tower.innerHTML = rows;
        }
        if (msgT > 0) { msgT -= 1 / 60; if (msgT <= 0) tip.textContent = ""; }
      }
      function respawn() {
        var k = me.idx, a = tr.ta[k]; me.x = tr.P[k][0]; me.y = tr.P[k][1]; me.a = a; me.vx = Math.cos(a) * 60; me.vy = Math.sin(a) * 60; me.offT = 0; me.spin = 0; me.blink = 1; me.px = me.x; me.py = me.y; me.pa = me.a; say2("Rimesso in pista", 1.4);
      }
      function frame(now) {
        if (done || !full.isConnected) { stop(); return; }
        if (paused) { last = now; drawI(1); raf = requestAnimationFrame(frame); return; }
        acc += Math.min(0.1, (now - last) / 1000); last = now;
        while (acc >= DT) {
          acc -= DT;
          vis().forEach(function (c) { c.px = c.x; c.py = c.y; c.pa = c.a; }); pcx = camx; pcy = camy; pcA = camA; camStep();
          if (state === "intro") { introT += DT; if (introT >= INTRO) { if (RMT) { state = "wait"; waitT0 = performance.now(); } else { state = "count"; cT = 0; t = 0; } } continue; }
          if (state === "wait") { var G1 = RMT.sy && RMT.sy.go && RMT.sy.go[PH]; if (G1 != null && RMT.rtt < 1e8 && srvNow() >= G1) { state = "count"; cT = srvNow() - G1; t = 0; } continue; }
          if (state === "end" && RMT && !finGo) {                                                                    // ho tagliato il traguardo ma gli altri corrono ancora: auto, minimappa e classifica restano vivi
            t += DT; cars.forEach(function (c) { if (c.remote) remStep(c); else if (c.fin) { c.vx *= 0.97; c.vy *= 0.97; } }); cars.forEach(function (c) { var pp = Math.floor(c.prog); while (c.hp < pp) { c.hp++; if (c.hp + 60 >= 0 && c.hp + 60 < c.hist.length) c.hist[c.hp + 60] = t; } }); continue;
          }
          if (state === "count") {
            if (RMT && RMT.sy && RMT.sy.go && RMT.sy.go[PH] != null) cT = srvNow() - RMT.sy.go[PH]; else cT += DT; var nl = cT < 0.8 ? 0 : Math.min(3, Math.floor((cT - 0.8) / 0.8) + 1); if (nl !== lastNl) { lastNl = nl; if (nl) AU.sfx("beep"); }
            if (!qual) rev2 = holdG ? Math.min(1.3, rev2 + 0.55 * DT) : Math.max(0, rev2 - 0.9 * DT); if (rev2 > 1.1) flooded = true;
            cd.textContent = cT >= GO ? "🟢" : (nl ? "🔴".repeat(nl) : ""); if (cT < GO) { tip.textContent = window.innerHeight > window.innerWidth ? "↻ Gira il telefono (rotazione automatica attiva, o tocca l'icona di rotazione in basso)" : (qual ? "QUALIFICA · al VIA partirai già lanciato: un solo giro, senza pozze né pedane" : "Tieni premuto ACCELERA dal 2° semaforo: barra nella zona verde al VIA = partenza perfetta"); msgT = 9; }
            if (cT >= GO) { state = "run"; t = RMT ? Math.max(0, cT - GO) : 0; AU.sfx("beep", true); setTimeout(function () { cd.textContent = ""; }, 700); var r2 = rev2, lm = "VIA!";
              if (qual) { me.vx = Math.cos(me.a) * 380; me.vy = Math.sin(me.a) * 380; lm = "VIA! Giro di qualifica"; } else if (flooded || r2 > 1.0) { me.stall = 0.5; lm = "TROPPO GAS! Partenza persa"; A.haptic("bad"); } else if (r2 >= 0.72) { me.boostT = 1.0; me.vx = Math.cos(me.a) * 140; me.vy = Math.sin(me.a) * 140; lm = "PARTENZA PERFETTA!"; A.haptic("ok"); } else if (r2 >= 0.45) { me.boostT = 0.45; me.vx = Math.cos(me.a) * 70; me.vy = Math.sin(me.a) * 70; lm = "Buona partenza"; }
              say2(lm, 1.4); }
            continue;
          }
          if (state !== "run") continue;
          if (!solo && !qual) aero(tr, cars, opts);
          cars.forEach(function (c, k) {
            if (c.remote) { remStep(c); return; }
            if (c.fin) { c.vx *= 0.99; c.vy *= 0.99; return; }
            if (k === 0) { if (window.__RACE_AUTO) { var pa = pilot(tr, c, 0, 1.2); inp.l = !!pa.l; inp.r = !!pa.r; } step(tr, c, inp); items(tr, c); if (c.fired) { c.fired = 0; A.haptic("medium"); } } else if (!c.remote && t >= botDelay[k]) { step(tr, c, pilot(tr, c, offs[k], sk[k])); items(tr, c); }
            if (c.blink > 0) c.blink -= DT;
            if (c.prog >= tr.N * c.lap && !c.fin) { if (k === 0) { AU.sfx("lap"); lapT.push(t - lapStart); if (!opts.qual && lapT.length > 1) { var lt = lapT[lapT.length - 1]; var bb = lsGet(PF() + "b_" + tr.id); if (!bb || !bb.t || lt < bb.t) lsSet(PF() + "b_" + tr.id, { t: lt }); } lapStart = t; prevAt = t; A.haptic("light"); } (c.lapTs = c.lapTs || []).push(t - (c.lapS || 0)); c.lapS = t; c.lap++; }
            if (c.prog >= tr.N * laps && pastLine(c)) { c.fin = true; c.finT = t; }
          });
          cars.forEach(function (c) { var pp = Math.floor(c.prog); while (c.hp < pp) { c.hp++; if (c.hp + 60 >= 0 && c.hp + 60 < c.hist.length) c.hist[c.hp + 60] = t; } });      // quando ogni auto è passata da ogni punto: serve per i distacchi in secondi
          if (me.dd) { var co2 = Math.cos(me.a), si2 = Math.sin(me.a); if (!curSeg) { curSeg = []; trail.push(curSeg); if (trail.length > 5) trail.shift(); } curSeg.push([me.x - co2 * 12 + si2 * 13, me.y - si2 * 12 - co2 * 13, me.x - co2 * 12 - si2 * 13, me.y - si2 * 12 + co2 * 13]); if (curSeg.length > 240) curSeg.shift(); } else curSeg = null;
          if (!solo && !qual && (Math.round(t * 60) & 1) === 0) cars.forEach(function (c) { var ar = c.tr2 || (c.tr2 = []); ar.unshift([c.x - Math.cos(c.a) * 16, c.y - Math.sin(c.a) * 16, c.a]); if (ar.length > 18) ar.pop(); });
          if (qual) { var qi = Math.min(Math.floor(t * 60), 1e9); qgh.forEach(function (g) { var ii = Math.min(qi, g.path.length / 3 - 1); g.x = g.path[ii * 3]; g.y = g.path[ii * 3 + 1]; g.a = g.path[ii * 3 + 2]; }); if (qT0 < 0 && me.prog >= 0) { qT0 = t; lapStart = t; } }
          if (solo) { if ((gtick++ % 3) === 0) grec.push(Math.round(me.x), Math.round(me.y), Math.round(me.a * 100)); gl.forEach(function (G) { ghostAt(G, t); }); }
          var sn = Math.min(3 * laps, Math.floor(Math.max(0, me.prog) / (tr.N / 3)));
          if (sn > secNo) { secDone((sn - 1) % 3, t - secStart); secStart = t; secNo = sn; }
          if (me.offT > 3.2 || (me.hit > 0.2 && Math.hypot(me.vx, me.vy) < 25 && (me.stuck = (me.stuck || 0) + DT) > 1.6)) { respawn(); me.stuck = 0; }
          if (me.hit <= 0) me.stuck = 0;
          { var dtn = me.vx * Math.cos(tr.ta[me.idx]) + me.vy * Math.sin(tr.ta[me.idx]); if (dtn < -40 && !me.air) wrongT += DT; else wrongT = Math.max(0, wrongT - DT * 2);
            if (wrongT > 0.5 && wrongT < 3) say2("⚠ CONTROMANO · tra " + Math.max(1, Math.ceil(3 - wrongT)) + "s ti rimetto in pista", 0.3); else if (wrongT >= 3) { respawn(); wrongT = 0; say2("Rimesso nel verso giusto", 1.4); } }
          if (!solo && !(opts && opts.coll === false)) crash(cars); t += DT;
          if (me.fin) { finish(); break; }
        }
        var tq0 = performance.now(); drawI(acc / DT); hudDraw(); var tq = performance.now() - tq0;
        if (tq < 60) { qEma += (tq - qEma) * 0.05; if (qEma > 9 && QL > 0.62) QL = 0.62; else if (qEma < 6 && QL < 1) QL = 1; }   // qualità adattiva: se disegnare costa troppo, si accorcia la distanza di visuale (la fisica non cambia)
        raf = requestAnimationFrame(frame);
      }
      if (RMT) {                                                                                                  // sincronizzazione online: ogni 100 ms mando la mia posizione (con il tempo di gara) e ricevo quelle degli altri
        RMT.sy = RMT.sy || {}; RMT.pl = RMT.pl || [];
        var barrierOK = function () { var rl = (RMT.sy.rdy && RMT.sy.rdy[PH]) || []; return RMT.pl.filter(function (p) { return p.online !== false; }).every(function (p) { return rl.indexOf(p.uid) >= 0; }) || performance.now() - waitT0 > 25000; };
        var rSend = function () {
          if (done) return; if (rInfl >= 3 && performance.now() - rBusyT < 3500) return; if (rInfl >= 3) rInfl = 0; rInfl++; rBusyT = performance.now();      // fino a 3 richieste in volo: con rete lenta non si dimezza la frequenza di invio
          var sy = RMT.sy, ev = null, tS = performance.now();
          if (state === "wait") { var rl = (sy.rdy && sy.rdy[PH]) || []; if (rl.indexOf(RMT.uid) < 0) ev = { k: "rdy", ph: PH }; else if (!(sy.go && sy.go[PH] != null) && barrierOK()) ev = { k: "go", ph: PH }; }
          else if (RMT.wantQ !== undefined && !(sy.q && sy.q[RMT.uid] != null)) ev = { k: "q", qt: RMT.wantQ };
          else if (RMT.wantGrid && !sy.grid) ev = { k: "grid", g: RMT.wantGrid };
          else if ((state === "run" || state === "end") && !qual) ev = { k: "p", x: Math.round(me.x), y: Math.round(me.y), a: Math.round(me.a * 100), pr: Math.round(me.prog * 10), l: me.lap, vx: Math.round(me.vx), vy: Math.round(me.vy), b: me.boostT > 0 ? 1 : 0, d: me.dd ? 1 : 0, f: me.fin ? Math.round(me.finT * 1000) : 0, tt: Math.round(t * 1000), ss: RMT.rtt < 1e8 ? Math.round(srvNow() * 1000) / 1000 : 0, lt: (me.lapTs || []).map(function (q) { return Math.round(q * 1000); }) };
          A.api("/api/room/sync", "POST", { id: RMT.id, since: rSince, ev: ev || undefined }).then(function (j) {
            rInfl = Math.max(0, rInfl - 1); if (!j || !j.success) return; var rt = performance.now() - tS, skip = Math.max(0, rSince - (j.from != null ? j.from : rSince)); if (j.n > rSince) rSince = j.n; RMT.since = rSince;
            if (j.room) { if (j.room.st && rt < RMT.rtt && rt < 1500) { RMT.rtt = rt; RMT.off = j.room.st - (tS + rt / 2) / 1000; } RMT.sy = j.room.sy || RMT.sy; RMT.pl = j.room.players || RMT.pl; }
            (j.events || []).slice(skip).forEach(function (e) {
              if (e.k !== "p" || e.u === RMT.uid) return; var c = null; cars.forEach(function (q) { if (q.remote === e.u) c = q; }); if (!c) return;
              var smp = { ts: e.ss || ((e.t || srvNow()) - 0.08), tt: e.tt || 0, x: e.x, y: e.y, a: e.a / 100, vx: e.vx, vy: e.vy, pr: e.pr }; if (c.sm && smp.tt < c.sm.tt) return;
              if (!c.sm) { c.x = smp.x; c.y = smp.y; c.a = smp.a; } c.sp = c.sm; c.sm = smp; c.smNew = true; c.lap = e.l; c.boostT = e.b ? 0.3 : 0; c.dd = e.d; if (e.lt) c.lapTs = e.lt.map(function (q) { return q / 1000; });
              if (e.f && (!c.fin || c.dnf)) { c.fin = true; c.dnf = false; c.finT = e.f / 1000; if (!me.fin) say2("🏁 " + c.name + " ha tagliato il traguardo (" + ORD[Math.min(7, cars.filter(function (q) { return q.fin; }).length - 1)] + ")", 2.4); }
            });
            if (j.room && j.room.result && resLn && !resLn._d) { resLn._d = 1; var py = (j.room.result.pay || {})[RMT.uid] || 0; resLn.textContent = py ? "💰 Premio ricevuto: +" + A.fmt(py) + " $SDG" : "Classifica confermata"; try { A.refreshMe(); } catch (e) {} }
          }).catch(function () { rInfl = Math.max(0, rInfl - 1); });
        };
        RT = setInterval(rSend, 100);
      }
      raf = requestAnimationFrame(function (n) { last = n; frame(n); });
    }
    menu();
  }
  window.ArcadeRace = { open: open, _t: { TRACKS: TRACKS, build: build, simulate: simulate, step: step, newCar: newCar, pilot: pilot, items: items } };
})();
