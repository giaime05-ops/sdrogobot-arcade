/* Sdrogo Arcade – audio.
 * Tutto sintetizzato dal telefono con WebAudio: nessun file da scaricare.
 *  - musica "lounge" della sala (generativa: accordi, tonalità e melodia cambiano di continuo, quindi non si ripete uguale)
 *  - musica dei giochi (più ritmata, sempre sintetica)
 *  - effetti (click, fiche, carte, rulli, roulette, vincita, sconfitta, esplosione…)
 * I volumi si regolano da Impostazioni. Il browser fa partire l'audio solo dopo il primo tocco.
 */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  var cfg = { mHub: 0.4, mGame: 0.4, sfx: 0.7 };
  var ctx = null, comp, master, gHub, gGame, gSfx, noiseBuf, delaySend, mode = "hub", started = false;

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function init() {
    if (ctx) return true;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    gHub = ctx.createGain(); gGame = ctx.createGain(); gSfx = ctx.createGain();
    [gHub, gGame, gSfx].forEach(function (g) { g.connect(master); });
    gHub.gain.value = 0; gGame.gain.value = 0; gSfx.gain.value = cfg.sfx;
    // rumore bianco riusabile
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // eco morbido per la musica lounge
    delaySend = ctx.createGain(); delaySend.gain.value = 0.32;
    var dl = ctx.createDelay(1.5); dl.delayTime.value = 0.46; var fb = ctx.createGain(); fb.gain.value = 0.38;
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    delaySend.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(gHub);
    applyVol();
    return true;
  }

  // ---------- volumi ----------
  function applyVol() {
    if (!ctx) return;
    var t = ctx.currentTime;
    gHub.gain.setTargetAtTime(mode === "hub" ? cfg.mHub * 0.5 : 0, t, 0.6);
    gGame.gain.setTargetAtTime(mode === "game" ? cfg.mGame * 0.5 : 0, t, 0.6);
    gSfx.gain.setTargetAtTime(cfg.sfx, t, 0.05);
  }

  // ---------- strumenti ----------
  function tone(dest, type, f, t, dur, vol, o) {
    o = o || {};
    var osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    var a = o.a || 0.006;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var node = osc;
    if (o.lp) { var f1 = ctx.createBiquadFilter(); f1.type = "lowpass"; f1.frequency.value = o.lp; osc.connect(f1); node = f1; }
    node.connect(g); g.connect(dest); if (o.send) g.connect(o.send);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dest, t, dur, vol, ftype, freq, q, sweepTo) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 0.7;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.01, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // piano elettrico morbido (fondamentale + armonica che sfuma in fretta)
  function epiano(dest, midi, t, dur, vol, send) {
    var f = mtof(midi);
    tone(dest, "sine", f, t, dur, vol, { a: 0.012, send: send });
    tone(dest, "sine", f * 2, t, Math.min(dur, 0.5), vol * 0.35, { a: 0.006 });
    tone(dest, "triangle", f * 4, t, 0.18, vol * 0.12, { a: 0.003 });
  }

  // ---------- musica lounge (generativa) ----------
  var CH = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], m9: [0, 3, 7, 10, 14] };
  var PROGS = [
    [[2, "m7"], [7, "dom7"], [0, "maj7"], [9, "m7"]],
    [[0, "maj7"], [9, "m7"], [2, "m7"], [7, "dom7"]],
    [[4, "m7"], [9, "m7"], [2, "m9"], [7, "dom7"]],
    [[0, "maj7"], [5, "maj7"], [4, "m7"], [9, "m7"]],
    [[9, "m7"], [2, "m7"], [7, "dom7"], [0, "maj7"]]
  ];
  var KEYS = [48, 50, 53, 55, 57, 45];
  var lounge = { next: 0, bpm: 76, key: 48, prog: null, barIdx: 0, last: 72, progCount: 0 };
  function loungeBar(t) {
    var L = lounge, beat = 60 / L.bpm, bar = beat * 4;
    if (!L.prog || L.barIdx >= 4) {
      L.barIdx = 0; L.progCount++;
      L.prog = pick(PROGS);
      if (L.progCount % 2 === 0 || !L.key) L.key = pick(KEYS);
      L.bpm = pick([72, 76, 80, 84]);
    }
    beat = 60 / L.bpm; bar = beat * 4;
    var ch = L.prog[L.barIdx++], root = L.key + ch[0], ivs = CH[ch[1]];
    // pad
    ivs.forEach(function (iv, i) {
      var f = mtof(root + 12 + iv);
      [-5, 5].forEach(function (dt) {
        var o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = "triangle"; o.frequency.value = f; o.detune.value = dt; lp.type = "lowpass"; lp.frequency.value = 800;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 0.7); g.gain.linearRampToValueAtTime(0.016, t + bar * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + bar + 0.5);
        o.connect(lp); lp.connect(g); g.connect(gHub); o.start(t); o.stop(t + bar + 0.6);
      });
    });
    // basso
    tone(gHub, "sine", mtof(root - 12), t, beat * 1.6, 0.2, { a: 0.02, lp: 500 });
    tone(gHub, "sine", mtof(root - 12 + (Math.random() < 0.5 ? 7 : 0)), t + beat * 2.5, beat * 1.3, 0.16, { a: 0.02, lp: 500 });
    if (Math.random() < 0.4) tone(gHub, "sine", mtof(root - 5), t + beat * 3.5, beat * 0.45, 0.1, { a: 0.02, lp: 500 });
    // accompagnamento (accordi spezzati)
    var rh = pick([[0.5, 2, 3], [1.5, 2.5], [0.5, 1.5, 3.0], [1, 3]]);
    rh.forEach(function (b) {
      var cn = [ivs[1], ivs[2], ivs[3]]; cn.forEach(function (iv, k) { epiano(gHub, root + 12 + iv + (k === 2 ? 0 : 0), t + b * beat + k * 0.012, beat * 1.2, 0.035, delaySend); });
    });
    // melodia: note a caso dalla scala, con pause
    var pool = []; ivs.forEach(function (iv) { pool.push(root + 24 + iv); pool.push(root + 12 + iv); });
    [0, 2, 4, 7, 9].forEach(function (iv) { pool.push(L.key + 24 + iv); pool.push(L.key + 36 + iv); });
    pool.sort(function (a, b) { return a - b; });
    pool = pool.filter(function (n) { return n >= 66 && n <= 88; });
    var pi = pool.reduce(function (best, n, i) { return Math.abs(n - L.last) < Math.abs(pool[best] - L.last) ? i : best; }, 0);
    for (var e = 0; e < 8; e++) {
      if (Math.random() < (e === 0 ? 0.55 : 0.32)) {
        pi = Math.max(0, Math.min(pool.length - 1, pi + pick([-2, -1, -1, 0, 1, 1, 2])));
        L.last = pool[pi];
        epiano(gHub, pool[pi], t + e * beat * 0.5 + rnd(0, 0.02), beat * pick([0.9, 1.4, 2]), 0.05, delaySend);
      }
    }
    // spazzola leggera + cassa morbida
    for (var h = 0; h < 8; h++) noise(gHub, t + h * beat * 0.5, 0.05, h % 2 ? 0.018 : 0.01, "highpass", 6500, 0.7);
    tone(gHub, "sine", 110, t, 0.22, 0.12, { slide: 45, a: 0.004 }); tone(gHub, "sine", 110, t + beat * 2, 0.22, 0.09, { slide: 45, a: 0.004 });
    return bar;
  }

  // ---------- musica dei giochi (ritmata) ----------
  var GPROGS = [[[57, "m"], [53, "M"], [48, "M"], [55, "M"]], [[52, "m"], [48, "M"], [55, "M"], [50, "m"]], [[50, "m"], [46, "M"], [53, "M"], [48, "M"]]];
  var arcade = { next: 0, prog: null, idx: 0, count: 0 };
  function arcadeBar(t) {
    var A_ = arcade, bpm = 104, beat = 60 / bpm, bar = beat * 4;
    if (!A_.prog || A_.idx >= 4) { A_.prog = pick(GPROGS); A_.idx = 0; A_.count++; }
    var c = A_.prog[A_.idx++], root = c[0], tri = c[1] === "m" ? [0, 3, 7] : [0, 4, 7];
    for (var i = 0; i < 8; i++) tone(gGame, "sawtooth", mtof(root - 12 + (i % 4 === 3 ? 7 : 0)), t + i * beat * 0.5, beat * 0.42, 0.11, { lp: 420, a: 0.004 });
    for (var k = 0; k < 16; k++) {
      var n = root + 12 + tri[[0, 1, 2, 1, 0, 2, 1, 2][k % 8]] + (k % 8 > 4 ? 12 : 0);
      tone(gGame, "square", mtof(n), t + k * beat * 0.25, beat * 0.2, 0.028, { lp: 2600, a: 0.003 });
    }
    for (var b = 0; b < 4; b++) tone(gGame, "sine", 120, t + b * beat, 0.16, 0.13, { slide: 42, a: 0.003 });
    for (var h = 0; h < 8; h++) noise(gGame, t + h * beat * 0.5 + beat * 0.25 * (h % 2), 0.04, 0.012, "highpass", 7500, 0.7);
    if (A_.count % 2 === 0) { var m = root + 24 + pick(tri); tone(gGame, "triangle", mtof(m), t + beat * 2, beat * 1.2, 0.04, { a: 0.02, send: null }); }
    return bar;
  }

  // ---------- pianificatore ----------
  var timer = 0;
  function tick() {
    if (!ctx || ctx.state !== "running") return;
    var now = ctx.currentTime;
    if (mode === "hub" && cfg.mHub > 0.001) {
      if (lounge.next < now) lounge.next = now + 0.1;
      while (lounge.next < now + 0.7) lounge.next += loungeBar(lounge.next);
    } else lounge.next = 0;
    if (mode === "game" && cfg.mGame > 0.001) {
      if (arcade.next < now) arcade.next = now + 0.1;
      while (arcade.next < now + 0.7) arcade.next += arcadeBar(arcade.next);
    } else arcade.next = 0;
  }
  function start() {
    if (!init()) return;
    if (ctx.state === "suspended") ctx.resume();
    if (!timer) timer = setInterval(tick, 150);
    started = true; applyVol();
  }
  function setMode(m) { if (mode === m) return; mode = m; applyVol(); }

  // ---------- effetti ----------
  var last = {};
  function once(name, ms) { var n = performance.now(); if (last[name] && n - last[name] < ms) return false; last[name] = n; return true; }
  var SFX = {
    click: function (t) { tone(gSfx, "triangle", 1100, t, 0.05, 0.12, { slide: 700 }); },
    chip: function (t) { noise(gSfx, t, 0.05, 0.14, "bandpass", 3500, 4); tone(gSfx, "sine", 2300, t, 0.09, 0.07, { slide: 1700 }); tone(gSfx, "sine", 3100, t + 0.045, 0.07, 0.05); },
    card: function (t) { noise(gSfx, t, 0.09, 0.1, "bandpass", 2200, 0.9, 5200); },
    key: function (t) { tone(gSfx, "square", 760, t, 0.03, 0.05, { lp: 2000 }); },
    tick: function (t) { tone(gSfx, "triangle", 1800, t, 0.025, 0.1, { slide: 1100 }); },
    scratch: function (t) { noise(gSfx, t, 0.16, 0.1, "bandpass", 3000, 1.2, 1500); },
    reel: function (t) { tone(gSfx, "sine", 170, t, 0.16, 0.22, { slide: 70 }); noise(gSfx, t, 0.04, 0.12, "lowpass", 900); },
    spin: function (t) { noise(gSfx, t, 0.5, 0.1, "bandpass", 400, 1.2, 1800); },
    whoosh: function (t) { noise(gSfx, t, 0.7, 0.16, "bandpass", 250, 0.9, 1800); tone(gSfx, "sawtooth", 140, t, 0.6, 0.05, { slide: 420, lp: 900 }); },
    win: function (t) { [72, 76, 79, 84].forEach(function (m, i) { tone(gSfx, "triangle", mtof(m), t + i * 0.085, 0.38, 0.14, { a: 0.008 }); tone(gSfx, "sine", mtof(m + 12), t + i * 0.085, 0.3, 0.05); }); noise(gSfx, t + 0.3, 0.3, 0.05, "highpass", 8000, 0.7); },
    bigwin: function (t) { [67, 72, 76, 79, 84, 88, 91].forEach(function (m, i) { tone(gSfx, "triangle", mtof(m), t + i * 0.075, 0.5, 0.14, { a: 0.008 }); tone(gSfx, "sine", mtof(m + 12), t + i * 0.075, 0.4, 0.06); }); for (var i = 0; i < 6; i++) tone(gSfx, "sine", rnd(2500, 5000), t + 0.5 + i * 0.07, 0.1, 0.04); },
    lose: function (t) { tone(gSfx, "sine", 330, t, 0.35, 0.16, { slide: 220 }); tone(gSfx, "sine", 247, t + 0.2, 0.5, 0.14, { slide: 150 }); },
    boom: function (t) { noise(gSfx, t, 0.9, 0.35, "lowpass", 2400, 0.8, 120); tone(gSfx, "sine", 130, t, 0.8, 0.4, { slide: 38 }); tone(gSfx, "sawtooth", 80, t, 0.5, 0.12, { slide: 30, lp: 400 }); }
  };
  function sfx(name) {
    if (!started || !ctx || ctx.state !== "running" || cfg.sfx < 0.01) return;
    var f = SFX[name]; if (!f) return;
    if (!once("s_" + name, name === "tick" || name === "key" ? 25 : 60)) return;
    try { f(ctx.currentTime + 0.005); } catch (e) {}
  }

  // ---------- collegamenti automatici ----------
  function bindUI() {
    var unlock = function () { start(); };
    ["pointerdown", "touchstart", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
    document.addEventListener("visibilitychange", function () {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
    // suoni dei tasti
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("button, .tab, .station") : null;
      if (!t || t.disabled) return;
      var c = t.className || "";
      if (/\bavi-bet\b/.test(c)) sfx("chip");
      else if (/\bkey\b/.test(c)) sfx("key");
      else if (/\btile\b/.test(c)) sfx("scratch");
      else sfx("click");
    }, true);
    // esito di una partita: i messaggi in basso diventano "win" o "lose"
    ["gmMsg", "g4Msg"].forEach(function (id) {
      var n = document.getElementById(id); if (!n) return; var prev = "";
      new MutationObserver(function () {
        var c = n.className.indexOf("win") >= 0 ? "win" : (n.className.indexOf("lose") >= 0 && n.textContent ? "lose" : "");
        if (c && (c !== prev || true) && n.textContent !== n._p) { n._p = n.textContent; if (!/Servono|Server|Errore/.test(n.textContent)) { if (c === "win") sfx(/JACKPOT|BLACKJACK|VERDE/.test(n.textContent) ? "bigwin" : "win"); else sfx("lose"); } }
        prev = c;
      }).observe(n, { attributes: true, childList: true, characterData: true, subtree: true });
    });
    // carte distribuite
    var st = document.getElementById("g4Stage");
    if (st) new MutationObserver(function (ms) {
      var n = 0; ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (x) { if (x.classList && x.classList.contains("pcard") && !x.classList.contains("empty")) n++; }); });
      for (var i = 0; i < Math.min(n, 3); i++) setTimeout(function () { sfx("card"); }, i * 110);
    }).observe(st, { childList: true, subtree: true });
    // musica: sala o gioco
    var secs = ["avi", "gm", "g4"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    function upd() { setMode(secs.some(function (s) { return !s.hidden; }) ? "game" : "hub"); }
    secs.forEach(function (s) { new MutationObserver(upd).observe(s, { attributes: true, attributeFilter: ["hidden"] }); });
    upd();
  }

  window.ArcadeAudio = {
    sfx: sfx, start: start,
    set: function (o) { if (o.mHub != null) cfg.mHub = o.mHub; if (o.mGame != null) cfg.mGame = o.mGame; if (o.sfx != null) cfg.sfx = o.sfx; applyVol(); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindUI); else bindUI();
})();
