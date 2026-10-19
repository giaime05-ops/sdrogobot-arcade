/* Sdrogo Arcade – audio.
 * Tutto sintetizzato dal telefono con WebAudio: nessun file da scaricare.
 *  - musica da casinò della sala (swing generativo: accordi, tonalità e melodia cambiano di continuo, più rumori di sala)
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
    gHub.gain.setTargetAtTime(mode === "hub" ? cfg.mHub * 0.5 : 0, t, 0.25);
    gGame.gain.setTargetAtTime(0, t, 0.2);          // nei giochi niente musica di fondo: solo gli effetti
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

  // ---------- musica della sala: swing da casinò (generativa) ----------
  // basso che cammina, piano/ottoni a stacchi, vibrafono, spazzola swing e, ogni tanto, rumori di sala (fiches, monete, slot).
  var CH = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], m9: [0, 3, 7, 10, 14], dom9: [0, 4, 7, 10, 14] };
  var PROGS = [
    [[2, "m7"], [7, "dom7"], [0, "maj7"], [9, "dom7"]],
    [[0, "maj7"], [9, "dom7"], [2, "m7"], [7, "dom7"]],
    [[0, "dom7"], [5, "dom7"], [0, "dom7"], [7, "dom7"]],
    [[4, "m7"], [9, "dom7"], [2, "m7"], [7, "dom7"]],
    [[0, "maj7"], [4, "dom7"], [9, "m7"], [2, "dom9"]]
  ];
  var KEYS = [48, 50, 53, 55, 51, 46];
  var lounge = { next: 0, bpm: 118, key: 48, prog: null, barIdx: 0, last: 72, progCount: 0 };
  function bell(dest, midi, t, dur, vol, send) {        // vibrafono
    var f = mtof(midi);
    tone(dest, "sine", f, t, dur, vol, { a: 0.004, send: send });
    tone(dest, "sine", f * 4, t, Math.min(dur, 0.25), vol * 0.28, { a: 0.002 });
    tone(dest, "sine", f * 10, t, 0.08, vol * 0.1, { a: 0.001 });
  }
  function ambience(t) {                                  // rumori di casinò in sottofondo (bassi, non invadenti)
    var k = Math.random();
    if (k < 0.45) { noise(gHub, t, 0.05, 0.05, "bandpass", 3500, 4); tone(gHub, "sine", 2300, t, 0.09, 0.03, { slide: 1700 }); tone(gHub, "sine", 3100, t + 0.045, 0.07, 0.022); }
    else if (k < 0.8) { tone(gHub, "sine", 2637, t, 0.4, 0.03, { a: 0.002 }); tone(gHub, "sine", 3951, t + 0.06, 0.5, 0.026, { a: 0.002 }); }
    else { [60, 64, 67, 72, 76].forEach(function (m, i) { tone(gHub, "triangle", mtof(m + 24), t + i * 0.06, 0.18, 0.02, { a: 0.003 }); }); }
  }
  function loungeBar(t) {
    var L = lounge;
    if (!L.prog || L.barIdx >= 4) {
      L.barIdx = 0; L.progCount++;
      L.prog = pick(PROGS);
      if (L.progCount % 2 === 0) L.key = pick(KEYS);
      L.bpm = pick([112, 118, 124]);
    }
    var beat = 60 / L.bpm, bar = beat * 4, sw = beat * 0.667;
    var nxt = L.prog[L.barIdx % 4 === 3 ? 0 : (L.barIdx % 4) + 1];
    var ch = L.prog[L.barIdx++], root = L.key + ch[0], ivs = CH[ch[1]];
    // basso che cammina
    var wb = [root - 12, root - 12 + ivs[1], root - 12 + ivs[2], (L.key + nxt[0] - 12) + pick([-1, 1])];
    wb.forEach(function (m, i) { tone(gHub, "triangle", mtof(m), t + i * beat, beat * 0.9, 0.2, { a: 0.012, lp: 700 }); });
    // piano a stacchi (Charleston) con voicing aperto
    var vc = [ivs[1], ivs[2], ivs[3], ivs[0] + 12];
    function comp(b, len, vol) {
      vc.forEach(function (iv, k) {
        var f = mtof(root + 12 + iv + (k === 3 ? 0 : 0));
        tone(gHub, "triangle", f, t + b + k * 0.008, len, vol, { a: 0.004, lp: 2600, send: delaySend });
        tone(gHub, "sine", f * 2, t + b + k * 0.008, len * 0.5, vol * 0.3, { a: 0.003 });
      });
    }
    comp(0, beat * 0.5, 0.045);
    comp(beat + sw, beat * 0.5, 0.04);
    if (Math.random() < 0.5) comp(beat * 3 + sw, beat * 0.4, 0.035);
    // stacco di ottoni
    if (Math.random() < 0.55) {
      var bt = pick([beat * 2 + sw, beat * 3, beat * 3 + sw]);
      [0, 4, 7, 10].forEach(function (iv) {
        [-6, 6].forEach(function (dt) { tone(gHub, "sawtooth", mtof(root + 12 + iv), t + bt, beat * 0.4, 0.014, { a: 0.02, lp: 1500, detune: dt }); });
      });
    }
    // vibrafono: frasi a caso sulla scala, in levare
    var pool = []; ivs.forEach(function (iv) { pool.push(root + 24 + iv); pool.push(root + 12 + iv); });
    [0, 2, 4, 7, 9].forEach(function (iv) { pool.push(L.key + 24 + iv); pool.push(L.key + 36 + iv); });
    pool.sort(function (x, y) { return x - y; });
    pool = pool.filter(function (n) { return n >= 67 && n <= 90; });
    var pi = pool.reduce(function (best, n, i) { return Math.abs(n - L.last) < Math.abs(pool[best] - L.last) ? i : best; }, 0);
    for (var e = 0; e < 8; e++) {
      if (Math.random() < (e === 0 ? 0.5 : 0.36)) {
        pi = Math.max(0, Math.min(pool.length - 1, pi + pick([-2, -1, -1, 0, 1, 1, 2])));
        L.last = pool[pi];
        bell(gHub, pool[pi], t + Math.floor(e / 2) * beat + (e % 2 ? sw : 0), beat * pick([0.5, 0.9, 1.5]), 0.05, delaySend);
      }
    }
    // spazzola swing: ride a terzine, charleston del pedale sul 2 e 4
    for (var q = 0; q < 4; q++) {
      noise(gHub, t + q * beat, 0.09, 0.02, "highpass", 7000, 0.7);
      if (q % 2) noise(gHub, t + q * beat + sw, 0.07, 0.014, "highpass", 7000, 0.7);
      if (q % 2 === 1) noise(gHub, t + q * beat, 0.05, 0.03, "bandpass", 4500, 1.1);
    }
    tone(gHub, "sine", 100, t, 0.18, 0.08, { slide: 45, a: 0.004 }); tone(gHub, "sine", 100, t + beat * 2, 0.18, 0.06, { slide: 45, a: 0.004 });
    // rumori di sala
    if (Math.random() < 0.55) ambience(t + rnd(0.2, bar - 0.3));
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
    if (false) {
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
    card: function (t) {                                   // distribuzione: scorrimento di carta, alternando due suoni
      var bf = (cardN++ % 2 === 0 ? B.slide2 : B.slide) || B.slide || B.slide2;
      if (bf) { playBuf(bf, t, 0.96 + Math.random() * 0.1, 0.9); return; }
      noise(gSfx, t, 0.09, 0.1, "bandpass", 2200, 0.9, 5200);
    },
    ball: function (t) { if (B.ball) playBuf(B.ball, t, 1, 0.8, 7.2); else noise(gSfx, t, 0.5, 0.1, "bandpass", 400, 1.2, 1800); },
    letter: function (t) { noise(gSfx, t, 0.03, 0.12, "bandpass", 1800, 2); tone(gSfx, "triangle", 520, t, 0.05, 0.08, { slide: 380 }); },
    digit: function (t, m) { tone(gSfx, "sine", mtof(60 + (m || 0) * 2), t, 0.22, 0.14, { a: 0.004 }); tone(gSfx, "sine", mtof(72 + (m || 0) * 2), t, 0.12, 0.04); },
    flip: function (t) {                                   // carta singola girata/pescata
      var bf = (cardN++ % 3 === 2 ? B.slide : B.pick) || B.pick || B.slide;
      if (bf) { playBuf(bf, t, 0.95 + Math.random() * 0.12, 0.85); return; }
      noise(gSfx, t, 0.05, 0.07, "bandpass", 3000, 1.2, 5000);
    },
    key: function (t) { tone(gSfx, "square", 760, t, 0.03, 0.05, { lp: 2000 }); },
    tick: function (t) { tone(gSfx, "triangle", 1800, t, 0.025, 0.1, { slide: 1100 }); },
    scratch: function (t) { noise(gSfx, t, 0.16, 0.1, "bandpass", 3000, 1.2, 1500); },
    reel: function (t) { tone(gSfx, "sine", 170, t, 0.16, 0.22, { slide: 70 }); noise(gSfx, t, 0.04, 0.12, "lowpass", 900); },
    spin: function (t) { noise(gSfx, t, 0.5, 0.1, "bandpass", 400, 1.2, 1800); },
    whoosh: function (t) { noise(gSfx, t, 0.7, 0.16, "bandpass", 250, 0.9, 1800); tone(gSfx, "sawtooth", 140, t, 0.6, 0.05, { slide: 420, lp: 900 }); },
    win: function (t) { [72, 76, 79, 84].forEach(function (m, i) { tone(gSfx, "triangle", mtof(m), t + i * 0.085, 0.38, 0.14, { a: 0.008 }); tone(gSfx, "sine", mtof(m + 12), t + i * 0.085, 0.3, 0.05); }); noise(gSfx, t + 0.3, 0.3, 0.05, "highpass", 8000, 0.7); },
    bigwin: function (t) { [67, 72, 76, 79, 84, 88, 91].forEach(function (m, i) { tone(gSfx, "triangle", mtof(m), t + i * 0.075, 0.5, 0.14, { a: 0.008 }); tone(gSfx, "sine", mtof(m + 12), t + i * 0.075, 0.4, 0.06); }); for (var i = 0; i < 6; i++) tone(gSfx, "sine", rnd(2500, 5000), t + 0.5 + i * 0.07, 0.1, 0.04); },
    lose: function (t) { tone(gSfx, "sine", 330, t, 0.35, 0.16, { slide: 220 }); tone(gSfx, "sine", 247, t + 0.2, 0.5, 0.14, { slide: 150 }); },
    creak: function (t, p) { p = p || 0; tone(gSfx, "sawtooth", 70 + p * 150, t, 0.11, 0.07, { slide: 55 + p * 120, lp: 700 }); noise(gSfx, t, 0.07, 0.05, "bandpass", 900 + p * 1400, 3); },
    boom: function (t) { noise(gSfx, t, 0.9, 0.35, "lowpass", 2400, 0.8, 120); tone(gSfx, "sine", 130, t, 0.8, 0.4, { slide: 38 }); tone(gSfx, "sawtooth", 80, t, 0.5, 0.12, { slide: 30, lp: 400 }); }
  };
  var cardBuf = null, cardLoading = false, B = {};          // B: slide (slidecard03), slide2 (card-slide), pick (pickupcard05), ball (roulette)
  function loadOne(key, url) {
    try {
      fetch(url).then(function (r) { return r.arrayBuffer(); })
        .then(function (b) { return new Promise(function (ok, ko) { ctx.decodeAudioData(b, ok, ko); }); })
        .then(function (buf) { B[key] = buf; if (key === "slide") cardBuf = buf; }).catch(function () {});
    } catch (e) {}
  }
  function loadCard() {                                    // suoni veri (assets/); finché non sono pronti valgono quelli sintetici
    if (cardLoading || !ctx) return; cardLoading = true;
    loadOne("slide", "assets/card.wav?v=23"); loadOne("slide2", "assets/card_slide.wav?v=23"); loadOne("pick", "assets/card_pick.wav?v=23"); loadOne("ball", "assets/roulette_ball.mp3?v=23");
  }
  function playBuf(buf, t, rate, vol, maxDur) {
    var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; src.playbackRate.value = rate; g.gain.setValueAtTime(vol, t);
    if (maxDur) { g.gain.setValueAtTime(vol, t + maxDur - 0.6); g.gain.linearRampToValueAtTime(0, t + maxDur); src.stop(t + maxDur + 0.02); }
    src.connect(g); g.connect(gSfx); src.start(t);
  }
  var cardN = 0;
  function sfx(name, arg) {
    if (!cardLoading) loadCard();
    if (!started || !ctx || ctx.state !== "running" || cfg.sfx < 0.01) return;
    var f = SFX[name]; if (!f) return;
    if (!once("s_" + name, name === "tick" || name === "key" ? 25 : (name === "creak" || name === "scratch" ? 40 : 60))) return;
    try { f(ctx.currentTime + 0.005, arg); } catch (e) {}
  }

  // ---------- collegamenti automatici ----------
  function bindUI() {
    var unlock = function () { start(); };
    ["pointerdown", "pointerup", "touchstart", "touchend", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
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
      else if (/\bmm-key\b/.test(c)) sfx("digit", parseInt((t.textContent || "").replace(/\D/g, ""), 10) || ((t.querySelector && t.querySelector(".mm-sym")) ? Math.floor(Math.random() * 10) : 0));
      else if (/\bkey\b/.test(c)) sfx("letter");
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
    // carte: suono di "distribuzione" solo all'inizio mano (e al flop); poi un singolo suono per ogni carta girata
    var st = document.getElementById("g4Stage"), prevSig = [];
    function dealSnd(n) { for (var i = 0; i < n; i++) setTimeout(function () { sfx("card"); }, i * 130); }
    function sigOf() {
      var out = []; Array.prototype.forEach.call(st.querySelectorAll(".pcard:not(.empty)"), function (c) { out.push(c.classList.contains("back") ? "#BACK" : c.textContent); });
      return out;
    }
    if (st) new MutationObserver(function () {
      var cur = sigOf(), pool = {}, kept = 0, fresh = 0;
      prevSig.forEach(function (x) { pool[x] = (pool[x] || 0) + 1; });
      cur.forEach(function (x) { if (pool[x] > 0) { pool[x]--; kept++; } else fresh++; });
      prevSig = cur;
      if (!fresh) return;
      if (kept === 0 && fresh >= 2) dealSnd(2);                      // nuova mano: le prime carte
      else if (fresh >= 3) dealSnd(1);                               // flop: tre carte insieme
      else for (var k = 0; k < fresh; k++) setTimeout(function () { sfx("flip"); }, k * 280);   // ogni altra carta: un suono singolo
    }).observe(st, { childList: true, subtree: true, characterData: true });
    // Aviator: scia "galattica" morbida; sale di tono e di velocità con il moltiplicatore (scala logaritmica: si sente anche da 10x a 100x)
    var am = document.getElementById("aviMult");
    if (am) {
      var eng = null, engT = 0;
      var engOff = function () { if (!eng) return; var e = eng; eng = null; try { e.g.gain.setTargetAtTime(0, ctx.currentTime, 0.12); setTimeout(function () { try { e.o1.stop(); e.o2.stop(); e.o3.stop(); e.l.stop(); } catch (x) {} }, 700); } catch (x) {} };
      new MutationObserver(function () {
        if (!ctx || !started || ctx.state !== "running" || cfg.sfx < 0.01) return;
        var m = parseFloat(am.textContent) || 1, over = /win|lose/.test(am.className);
        if (over || m <= 1.001) { if (over) engOff(); return; }
        var lg = Math.log(Math.max(1, m)) / Math.LN10;               // 1x→0, 10x→1, 100x→2
        var t = ctx.currentTime;
        if (!eng) {
          var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator(), l = ctx.createOscillator();
          var g = ctx.createGain(), f = ctx.createBiquadFilter(), tr = ctx.createGain(), ld = ctx.createGain();
          o1.type = "sine"; o2.type = "sine"; o3.type = "triangle"; l.type = "sine";
          f.type = "lowpass"; f.frequency.value = 1200; f.Q.value = 0.7;
          tr.gain.value = 0.7; ld.gain.value = 0.3; l.connect(ld); ld.connect(tr.gain);     // tremolo lento
          o1.connect(f); o2.connect(f); o3.connect(f); f.connect(tr); tr.connect(g); g.connect(gSfx);
          g.gain.value = 0; g.gain.setTargetAtTime(0.05, t, 0.4);
          o1.start(); o2.start(); o3.start(); l.start(); eng = { o1: o1, o2: o2, o3: o3, l: l, g: g, f: f };
        }
        var base = 196 * Math.pow(2, lg * 1.1);
        eng.o1.frequency.setTargetAtTime(base, t, 0.25); eng.o2.frequency.setTargetAtTime(base * 1.505, t, 0.25); eng.o3.frequency.setTargetAtTime(base * 2.01, t, 0.25);
        eng.l.frequency.setTargetAtTime(2.5 + lg * 5, t, 0.3);
        eng.f.frequency.setTargetAtTime(900 + lg * 900, t, 0.3);
        clearTimeout(engT); engT = setTimeout(engOff, 900);
      }).observe(am, { childList: true, characterData: true, subtree: true, attributes: true });
    }
    // musica: sala o gioco
    var secs = ["avi", "gm", "g4"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    function upd() { setMode(secs.some(function (s) { return !s.hidden; }) ? "game" : "hub"); }
    secs.forEach(function (s) { new MutationObserver(upd).observe(s, { attributes: true, attributeFilter: ["hidden"] }); });
    upd();
  }

  window.ArcadeAudio = {
    sfx: sfx, start: start, loaded: function () { return Object.keys(B); },
    set: function (o) { if (o.mHub != null) cfg.mHub = o.mHub; if (o.mGame != null) cfg.mGame = o.mGame; if (o.sfx != null) cfg.sfx = o.sfx; applyVol(); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindUI); else bindUI();
})();
