/* Sdrogo Arcade – giochi istantanei: Slot, Roulette, Gratta e Vinci, Ruota Daily.
 * Il SERVER estrae il risultato e lo paga subito; qui si fa solo l'animazione e si mostra l'esito.
 * Il saldo in alto scende subito della puntata e sale solo a fine animazione (niente spoiler).
 */
(function () {
  "use strict";
  var A = window.Arcade;
  if (!A) return;
  var $ = function (id) { return document.getElementById(id); };

  var root = $("gm"), stage = $("gmStage"), elTitle = $("gmTitle"), elBal = $("gmBal"), elBack = $("gmBack"),
      elMsg = $("gmMsg"), elExtra = $("gmExtra"), elBets = $("gmBets"), elGo = $("gmGo"), elNotes = $("gmNotes");

  var S = { game: null, busy: false, balance: 0, bets: [10, 25, 50, 100], bet: 10 };
  var timers = [];

  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function showBal(n) { elBal.textContent = A.fmt(n); A.setCoins(n); }
  function setBalance(n) { S.balance = n; showBal(n); }
  function msg(t, cls) { elMsg.textContent = t || ""; elMsg.className = "gm-msg" + (cls ? " " + cls : ""); }
  function notes(l) { elNotes.textContent = (l && l.length) ? l.join("  •  ") : ""; }
  function errText(e) { return e && e.network ? "Server non raggiungibile." : ((e && e.message) || "Errore."); }
  function setBusy(b) { S.busy = b; elBack.disabled = b; renderBets(); renderGo(); renderExtra(); }

  // ---------- puntate ----------
  function renderBets() {
    var g = S.game;
    elBets.innerHTML = "";
    elBets.hidden = !(g && g.bets);
    if (!g || !g.bets) return;
    S.bets.forEach(function (v) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "avi-bet" + (v === S.bet ? " on" : ""); b.textContent = v; b.disabled = S.busy;
      b.addEventListener("click", function () {
        S.bet = v; try { localStorage.setItem("gm_bet", String(v)); } catch (e) {}
        A.haptic("light"); renderBets(); renderGo();
      });
      elBets.appendChild(b);
    });
  }
  try { var sb = parseInt(localStorage.getItem("gm_bet"), 10); if (sb > 0) S.bet = sb; } catch (e) {}

  function renderGo() {
    var g = S.game; if (!g) return;
    var l = g.goLabel ? g.goLabel() : { text: "—", disabled: true };
    elGo.className = "avi-go"; elGo.textContent = l.text; elGo.disabled = !!(l.disabled || S.busy);
    if (S.busy && l.busyText) elGo.textContent = l.busyText;
  }
  function renderExtra() {
    var g = S.game;
    elExtra.hidden = !(g && g.extra);
    if (g && g.extra) g.extra(elExtra);
  }
  function rerender() { renderBets(); renderGo(); renderExtra(); }

  // ---------- ruote (disegno condiviso da Roulette e Ruota Daily) ----------
  function makeWheel(size, items, o) {
    o = o || {};
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cv = document.createElement("canvas");
    cv.style.width = size + "px"; cv.style.height = size + "px";
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    var c = cv.getContext("2d");
    var W = { cv: cv, rot: 0, items: items };
    var n = items.length, sl = Math.PI * 2 / n;
    W.draw = function () {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, size, size);
      var cx = size / 2, cy = size / 2 + 6, r = size / 2 - 16;
      c.save(); c.shadowColor = "rgba(0,0,0,.6)"; c.shadowBlur = 14;
      c.beginPath(); c.arc(cx, cy, r + 5, 0, 7); c.fillStyle = "#3b2a12"; c.fill(); c.restore();
      for (var i = 0; i < n; i++) {
        var a0 = W.rot + i * sl - Math.PI / 2 - sl / 2;
        c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, a0, a0 + sl); c.closePath();
        c.fillStyle = items[i].color; c.fill();
        c.strokeStyle = "rgba(232,195,106,.55)"; c.lineWidth = 1; c.stroke();
        c.save(); c.translate(cx, cy); c.rotate(W.rot + i * sl - Math.PI / 2);
        c.fillStyle = items[i].text || "#fff"; c.font = "600 " + (o.font || 12) + "px Oswald, sans-serif";
        c.textAlign = "right"; c.textBaseline = "middle"; c.fillText(items[i].label, r - 8, 0); c.restore();
      }
      c.beginPath(); c.arc(cx, cy, r + 3, 0, 7); c.strokeStyle = "#e8c36a"; c.lineWidth = 4; c.stroke();
      var g = c.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, r * 0.2);
      g.addColorStop(0, "#ffe3a0"); g.addColorStop(1, "#8a5a1c");
      c.beginPath(); c.arc(cx, cy, r * 0.2, 0, 7); c.fillStyle = g; c.fill();
      // puntatore in alto
      c.beginPath(); c.moveTo(cx - 11, 1); c.lineTo(cx + 11, 1); c.lineTo(cx, 24); c.closePath();
      c.fillStyle = "#ff2e4d"; c.shadowColor = "rgba(255,46,77,.9)"; c.shadowBlur = 10; c.fill(); c.shadowBlur = 0;
      c.strokeStyle = "#ffe3a0"; c.lineWidth = 1.5; c.stroke();
    };
    // gira fino a fermarsi con la casella idx sotto il puntatore
    W.spinTo = function (idx, ms, done) {
      var start = W.rot, t0 = performance.now();
      var target = ((-idx * sl) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      var cur = ((start % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      var delta = Math.PI * 2 * 5 + ((target - cur) + Math.PI * 2) % (Math.PI * 2);
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3.2);
        W.rot = start + delta * e; W.draw();
        if (p < 1) requestAnimationFrame(step); else done && done();
      })(performance.now());
    };
    W.draw();
    return W;
  }
  // ---------- roulette: ruota ferma con numeri grandi, la pallina gira lungo la pista e cade nella casella ----------
  function makeRoulette(size) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), n = ORDER.length, sl = Math.PI * 2 / n;
    var cv = document.createElement("canvas"); cv.style.width = size + "px"; cv.style.height = size + "px";
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    var c = cv.getContext("2d"), cx = size / 2, cy = size / 2;
    var r0 = size / 2 - 5, r1 = r0 - 9, r2 = r1 - 26, rpIn = r2 - 52, rBall = (r1 + r2) / 2 + 3, rPk = r2 - 11;
    var W = { cv: cv, ball: { a: -Math.PI / 2, r: rBall }, hub: 0, win: -1, raf: 0 };
    function ang(i) { return -Math.PI / 2 + i * sl; }
    W.draw = function () {
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, size, size);
      // bordo esterno: nero lucido con filo neon
      var g0 = c.createRadialGradient(cx - 30, cy - 40, 10, cx, cy, r0); g0.addColorStop(0, "#2b2233"); g0.addColorStop(1, "#08050c");
      c.beginPath(); c.arc(cx, cy, r0, 0, 7); c.fillStyle = g0; c.fill();
      c.save(); c.shadowColor = "#ff3db0"; c.shadowBlur = 12; c.strokeStyle = "#ff6fc8"; c.lineWidth = 2.4; c.beginPath(); c.arc(cx, cy, r0, 0, 7); c.stroke(); c.restore();
      // pista della pallina
      var g1 = c.createLinearGradient(0, cy - r1, 0, cy + r1); g1.addColorStop(0, "#1c1626"); g1.addColorStop(0.5, "#0c0812"); g1.addColorStop(1, "#1c1626");
      c.beginPath(); c.arc(cx, cy, r1, 0, 7); c.arc(cx, cy, r2, 0, 7, true); c.fillStyle = g1; c.fill("evenodd");
      c.strokeStyle = "rgba(53,230,255,.35)"; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r1, 0, 7); c.stroke();
      // caselle
      for (var i = 0; i < n; i++) {
        var num = ORDER[i], a0 = ang(i) - sl / 2, a1 = a0 + sl;
        c.beginPath(); c.arc(cx, cy, r2, a0, a1); c.arc(cx, cy, rpIn, a1, a0, true); c.closePath();
        c.fillStyle = num === 0 ? "#0f9b52" : (RED.indexOf(num) >= 0 ? "#c9162c" : "#14101c"); c.fill();
        if (W.win === i) { c.fillStyle = "rgba(255,255,255,.35)"; c.fill(); }
        c.strokeStyle = "rgba(232,195,106,.8)"; c.lineWidth = 1; c.stroke();
        c.save(); c.translate(cx, cy); c.rotate(ang(i)); c.translate(rPk, 0); c.rotate(Math.PI / 2);
        c.fillStyle = "#fff"; c.font = "700 14px Oswald, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(num), 0, 0); c.restore();
      }
      c.strokeStyle = "#e8c36a"; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, rpIn, 0, 7); c.stroke();
      // cono centrale con croce dorata che gira piano
      var g2 = c.createRadialGradient(cx - 8, cy - 10, 4, cx, cy, rpIn); g2.addColorStop(0, "#3a2d4a"); g2.addColorStop(1, "#0d0814");
      c.beginPath(); c.arc(cx, cy, rpIn - 1, 0, 7); c.fillStyle = g2; c.fill();
      c.save(); c.translate(cx, cy); c.rotate(W.hub); c.strokeStyle = "#e8c36a"; c.lineWidth = 4; c.lineCap = "round";
      c.beginPath(); c.moveTo(-rpIn * 0.62, 0); c.lineTo(rpIn * 0.62, 0); c.moveTo(0, -rpIn * 0.62); c.lineTo(0, rpIn * 0.62); c.stroke();
      c.fillStyle = "#e8c36a"; c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fill(); c.restore();
      // pallina
      var bx = cx + Math.cos(W.ball.a) * W.ball.r, by = cy + Math.sin(W.ball.a) * W.ball.r;
      c.save(); c.shadowColor = "rgba(255,255,255,.9)"; c.shadowBlur = 9;
      var gb = c.createRadialGradient(bx - 2, by - 2, 1, bx, by, 6); gb.addColorStop(0, "#fff"); gb.addColorStop(1, "#b9c2d6");
      c.fillStyle = gb; c.beginPath(); c.arc(bx, by, 5.5, 0, 7); c.fill(); c.restore();
    };
    W.spinTo = function (idx, ms, done) {
      W.win = -1; var t0 = performance.now(), thf = ang(idx), D = Math.PI * 2 * (6 + Math.random() * 1.5), h0 = W.hub;
      cancelAnimationFrame(W.raf);
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), q = 1 - p;
        var a = thf - D * Math.pow(q, 2.3);
        var land = Math.max(0, Math.min(1, (p - 0.62) / 0.3)), ls = land * land * (3 - 2 * land);
        var r = rBall + (rPk - rBall) * ls;
        if (p > 0.86 && p < 1) { var k = (p - 0.86) / 0.14; a += Math.sin(k * 26) * sl * 0.55 * (1 - k); r += Math.sin(k * 20) * 3 * (1 - k); }   // rimbalza tra le caselle
        W.ball.a = a; W.ball.r = r; W.hub = h0 + (now - t0) / 1000 * 1.4;
        W.draw();
        if (p < 1) W.raf = requestAnimationFrame(step); else { W.win = idx; W.ball.a = thf; W.ball.r = rPk; W.draw(); done && done(); }
      })(performance.now());
    };
    W.draw();
    return W;
  }
  function wheelSize() { return Math.min(300, Math.round(Math.min(window.innerWidth, 420) * 0.8)); }

  // ======================================================================
  //  SLOT
  // ======================================================================
  var SLOT_SYMS = ["🍒", "🍋", "🔔", "💎", "7️⃣"];
  var RH = 104, CYC = ["🍒", "🍋", "🔔", "💎", "7️⃣", "🍒", "🔔", "🍋", "💎", "🍋"];      // ciclo del rullo
  var reelRaf = 0;
  function makeReel(box) {
    var strip = document.createElement("div"); strip.className = "strip";
    for (var k = 0; k <= CYC.length; k++) { var d = document.createElement("div"); d.textContent = CYC[k % CYC.length]; strip.appendChild(d); }
    box.innerHTML = ""; box.appendChild(strip);
    var R = { box: box, strip: strip, y: 4 * RH, mode: "idle", v: 2200, L: CYC.length * RH };
    R.set = function () { var yy = ((R.y % R.L) + R.L) % R.L; strip.style.transform = "translate3d(0," + (-yy).toFixed(1) + "px,0)"; };
    R.spin = function () { R.mode = "spin"; };
    // si ferma sul simbolo sym: decelerazione continua (parte dalla velocità di rotazione), niente scatti
    R.stop = function (sym, done) {
      var idxs = []; CYC.forEach(function (c, i) { if (c === sym) idxs.push(i); });
      var tgt = idxs[Math.floor(Math.random() * idxs.length)] * RH, cur = ((R.y % R.L) + R.L) % R.L;
      var dist = ((tgt - cur) + R.L) % R.L + R.L, ms = Math.max(700, 2 * dist / R.v * 1000);
      R.mode = "stop"; R.a = { y0: R.y, dist: dist, ms: ms, t0: performance.now(), done: done };
    };
    R.set(); return R;
  }
  var lastT = 0;
  function reelFrame(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; var any = false;
    slot.reels.forEach(function (R) {
      if (R.mode === "spin") { R.y += R.v * dt; any = true; }
      else if (R.mode === "stop") {
        var a = R.a, p = Math.min(1, (now - a.t0) / a.ms), e = 1 - (1 - p) * (1 - p);
        R.y = a.y0 + a.dist * e; any = true;
        if (p >= 1) { R.mode = "idle"; R.y = Math.round(R.y / RH) * RH; var d = a.done; a.done = null; R.box.classList.add("stop"); R.set(); d && d(); }
      }
      R.set();
    });
    reelRaf = any ? requestAnimationFrame(reelFrame) : 0;
  }
  function reelsStart() { if (!reelRaf) { lastT = performance.now(); reelRaf = requestAnimationFrame(reelFrame); } }
  var slot = {
    title: "🎰 SLOT 777", bets: true, reels: [], box: null,
    build: function () {
      stage.innerHTML = '<div class="reels" id="slReels"><div class="reel"></div><div class="reel"></div><div class="reel"></div></div>' +
        '<div class="gm-hint">7️⃣7️⃣7️⃣ ×10 · 💎💎💎 ×6 · 🔔🔔🔔 ×5 · 🍋🍋🍋 ×4 · 🍒🍒🍒 ×3<br>Doppia 7️⃣ o 💎 ×2 · altre doppie: rimborso</div>';
      slot.box = $("slReels"); slot.reels = Array.prototype.slice.call(slot.box.querySelectorAll(".reel")).map(makeReel);
    },
    onOpen: function () {
      A.api("/api/me").then(function (j) { /* il saldo arriva dal profilo */ }).catch(function () {});
      msg("Scegli la puntata e gira!", "");
    },
    goLabel: function () {
      if (S.balance < S.bet) return { text: "SALDO INSUFFICIENTE", disabled: true };
      return { text: "GIRA  " + S.bet + " $SDG", busyText: "GIRANO…" };
    },
    go: function () {
      var bet = S.bet, t0 = performance.now();
      setBusy(true); msg("", ""); notes([]); slot.box.classList.remove("win");
      showBal(S.balance - bet);
      slot.reels.forEach(function (r) { r.box.classList.remove("stop"); r.spin(); }); reelsStart();
      A.haptic("med");
      A.api("/api/slot/spin", "POST", { bet: bet }).then(function (j) {
        var res = j.result, rl = res.reels;
        var stops = [600, 1050, 1500];
        if (rl[0] === rl[1]) stops[2] += 450;                       // un filo di suspense se i primi due sono uguali
        [0, 1, 2].forEach(function (i) {
          later(function () {
            slot.reels[i].stop(rl[i], function () { A.haptic("light"); if (i === 2) finish(res); });
          }, Math.max(0, stops[i] - (performance.now() - t0)));
        });
      }).catch(function (e) {
        slot.reels.forEach(function (r) { r.mode = "idle"; });
        showBal(S.balance); msg(errText(e), "lose"); setBusy(false);
        if (e && e.body && e.body.error) A.refreshMe();
      });
      function finish(res) {
        setBalance(res.balance);
        if (res.kind === "triple") { slot.box.classList.add("win"); msg((res.reels[0] === "7️⃣" ? "🔥 JACKPOT 777! " : "🎉 TRIS! ") + "+" + A.fmt(res.net) + " $SDG", "win"); A.haptic("ok"); }
        else if (res.kind === "pair" && res.net > 0) { slot.box.classList.add("win"); msg("✨ Doppia d'oro! +" + A.fmt(res.net) + " $SDG", "win"); A.haptic("ok"); }
        else if (res.kind === "pair") msg("✨ Doppia: recuperi la puntata.", "");
        else { msg("💸 Nessuna combinazione: -" + A.fmt(res.bet) + " $SDG", "lose"); A.haptic("bad"); }
        notes(res.notes); setBusy(false); A.refreshMe();
      }
    }
  };

  // ======================================================================
  //  ROULETTE
  // ======================================================================
  var RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  var ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  var CH = [["red", "🔴 Rosso"], ["black", "⚫ Nero"], ["even", "Pari"], ["odd", "Dispari"], ["green", "🟢 Verde ×36"]];
  var roul = {
    title: "🎡 ROULETTE", bets: true, choice: "red", wheel: null, out: null,
    build: function () {
      var items = ORDER.map(function (n) {
        return { label: String(n), color: n === 0 ? "#0f8a46" : (RED.indexOf(n) >= 0 ? "#c4162a" : "#15101a"), text: "#fff" };
      });
      roul.wheel = makeRoulette(wheelSize());
      stage.innerHTML = '<div class="wheelbox rl-wrap" id="rlBox"></div><div class="bigres" id="rlOut">?</div>' +
        '<div class="gm-hint">Rosso / Nero / Pari / Dispari ×2 · Verde (0) ×36<br>Lo zero fa perdere tutto tranne chi punta sul Verde.</div>';
      $("rlBox").appendChild(roul.wheel.cv); roul.out = $("rlOut");
    },
    onOpen: function () { msg("Scegli la puntata e su cosa punti.", ""); },
    extra: function (box) {
      box.innerHTML = "";
      CH.forEach(function (c) {
        var b = document.createElement("button"); b.type = "button"; b.className = "gm-pick" + (roul.choice === c[0] ? " on" : "");
        b.textContent = c[1]; b.disabled = S.busy;
        b.addEventListener("click", function () { roul.choice = c[0]; A.haptic("light"); renderExtra(); renderGo(); });
        box.appendChild(b);
      });
    },
    goLabel: function () {
      if (S.balance < S.bet) return { text: "SALDO INSUFFICIENTE", disabled: true };
      var nm = CH.filter(function (c) { return c[0] === roul.choice; })[0][1];
      return { text: "GIRA  " + S.bet + " su " + nm.replace(/^[^\wÀ-ÿ]+/, ""), busyText: "LA RUOTA GIRA…" };
    },
    go: function () {
      var bet = S.bet, choice = roul.choice;
      setBusy(true); msg("", ""); notes([]); roul.out.className = "bigres"; roul.out.textContent = "?";
      showBal(S.balance - bet); A.haptic("med");
      var t0 = performance.now();
      A.api("/api/roulette/spin", "POST", { bet: bet, choice: choice }).then(function (j) {
        var res = j.result, idx = ORDER.indexOf(res.number);
        later(function () {
          roul.wheel.spinTo(idx, 5200, function () {
            roul.out.className = "bigres " + res.color; roul.out.textContent = res.number;
            setBalance(res.balance);
            if (res.mult === 36) { msg("🔥 VERDE! +" + A.fmt(res.net) + " $SDG", "win"); A.haptic("ok"); }
            else if (res.mult > 0) { msg("🎉 Vinto! +" + A.fmt(res.net) + " $SDG", "win"); A.haptic("ok"); }
            else { msg("💸 Perso: -" + A.fmt(res.bet) + " $SDG", "lose"); A.haptic("bad"); }
            notes(res.notes); setBusy(false); A.refreshMe();
          });
        }, Math.max(0, 250 - (performance.now() - t0)));
      }).catch(function (e) {
        showBal(S.balance); msg(errText(e), "lose"); setBusy(false);
      });
    }
  };

  // ======================================================================
  //  GRATTA E VINCI
  // ======================================================================
  var scr = {
    title: "🎟️ GRATTA E VINCI", bets: false, active: false, left: 3, cost: 20, tiles: [], finished: false,
    build: function () {
      stage.innerHTML = '<div class="scr" id="scGrid"></div><div class="gm-hint">Gratta 3 caselle: 💀 vuoto · 💰 10 · 💎 25 · 👑 100 $SDG<br>Il premio è la somma delle tre.</div>';
      var g = $("scGrid"); scr.tiles = [];
      for (var i = 0; i < 9; i++) {
        (function (i) {
          var t = document.createElement("button"); t.type = "button"; t.className = "tile"; t.textContent = "🎁"; t.disabled = true;
          t.addEventListener("click", function () { scr.pick(i); });
          g.appendChild(t); scr.tiles.push(t);
        })(i);
      }
    },
    reset: function () { scr.tiles.forEach(function (t) { t.className = "tile"; t.textContent = "🎁"; t.disabled = true; }); },
    applyView: function (v) {
      if (typeof v.balance === "number") setBalance(v.balance);
      if (v.cost) scr.cost = v.cost;
      scr.active = !!v.active; scr.enabled = v.enabled !== false;
      scr.reset();
      if (v.active) {
        scr.finished = false;
        scr.left = (v.picks || 3) - v.picked.length;
        scr.tiles.forEach(function (t, i) { t.disabled = false; });
        v.picked.forEach(function (p) { var t = scr.tiles[p.i]; t.className = "tile flip"; t.textContent = p.sym; t.disabled = true; });
        msg("Grattate rimaste: " + scr.left, "");
      }
    },
    onOpen: function () {
      msg("Compra un biglietto e gratta 3 caselle.", ""); scr.reset(); scr.finished = false;
      A.api("/api/scratch/state").then(function (v) { scr.applyView(v); rerender(); }).catch(function (e) { msg(errText(e), "lose"); });
    },
    goLabel: function () {
      if (scr.active) return { text: "GRATTA UNA CASELLA ☝", disabled: true };
      if (S.balance < scr.cost) return { text: "SALDO INSUFFICIENTE", disabled: true };
      return { text: (scr.finished ? "NUOVO BIGLIETTO  " : "COMPRA BIGLIETTO  ") + scr.cost + " $SDG", busyText: "…" };
    },
    go: function () {
      setBusy(true); msg("", ""); notes([]); A.haptic("med");
      A.api("/api/scratch/buy", "POST", {}).then(function (v) {
        scr.applyView(v); setBusy(false);
      }).catch(function (e) { msg(errText(e), "lose"); setBusy(false); });
    },
    pick: function (i) {
      if (S.busy || !scr.active) return;
      S.busy = true; elBack.disabled = true; A.haptic("light");
      var t = scr.tiles[i]; t.disabled = true;
      A.api("/api/scratch/pick", "POST", { idx: i }).then(function (j) {
        t.className = "tile flip"; t.textContent = j.sym;
        if (j.result) {
          var res = j.result; scr.active = false; scr.finished = true;
          later(function () {
            scr.tiles.forEach(function (tt, k) { tt.disabled = true; if (res.picked.indexOf(k) < 0) { tt.className = "tile dim"; tt.textContent = res.grid[k]; } });
            setBalance(res.balance);
            if (res.paid > 0) { msg("🎉 Hai vinto " + A.fmt(res.paid) + " $SDG (" + (res.net >= 0 ? "+" : "") + A.fmt(res.net) + " netti)", "win"); A.haptic("ok"); }
            else { msg("💸 Nessun premio, ritenta!", "lose"); A.haptic("bad"); }
            notes(res.notes); S.busy = false; elBack.disabled = false; rerender(); A.refreshMe();
          }, 700);
        } else {
          scr.left = (j.state.picks || 3) - j.state.picked.length; msg("Grattate rimaste: " + scr.left, "");
          S.busy = false; elBack.disabled = false; rerender();
        }
      }).catch(function (e) {
        t.disabled = false; msg(errText(e), "lose"); S.busy = false; elBack.disabled = false;
        if (e && e.status === 409) A.api("/api/scratch/state").then(function (v) { scr.applyView(v); rerender(); }).catch(function () {});
      });
    }
  };

  // ======================================================================
  //  RUOTA DAILY
  // ======================================================================
  var wh = {
    title: "🎡 RUOTA DAILY", bets: false, wheel: null, available: true, segs: [25, 50, 75, 100, 500],
    build: function () {
      var cols = ["#c4162a", "#15101a", "#0f6d6a", "#7a4a12", "#b8860b"];
      var items = wh.segs.map(function (p, i) { return { label: String(p), color: cols[i % cols.length], text: "#fff" }; });
      wh.wheel = makeWheel(wheelSize(), items, { font: 20 });
      stage.innerHTML = '<div class="wheelbox" id="whBox"></div><div class="gm-hint">Una giocata al giorno. Premi: 25 · 50 · 75 · 100 · 500 $SDG</div>';
      $("whBox").appendChild(wh.wheel.cv);
    },
    onOpen: function () {
      msg("", "");
      A.api("/api/wheel/state").then(function (v) {
        setBalance(v.balance); wh.available = !!v.available;
        msg(wh.available ? "Gira la ruota: il premio di oggi ti aspetta!" : "Hai già riscosso il premio di oggi. Torna domani!", "");
        rerender();
      }).catch(function (e) { msg(errText(e), "lose"); });
    },
    goLabel: function () { return wh.available ? { text: "GIRA LA RUOTA", busyText: "LA RUOTA GIRA…" } : { text: "GIÀ RISCOSSA OGGI", disabled: true }; },
    go: function () {
      setBusy(true); msg("", ""); A.haptic("med");
      var t0 = performance.now();
      A.api("/api/wheel/spin", "POST", {}).then(function (v) {
        var idx = v.index == null ? Math.floor(Math.random() * wh.segs.length) : v.index;
        later(function () {
          wh.wheel.spinTo(idx, 4300, function () {
            setBalance(v.balance); wh.available = false;
            msg((v.prize >= 500 ? "💥 SUPER JACKPOT! " : "🎉 ") + "+" + A.fmt(v.prize) + " $SDG", "win"); A.haptic("ok");
            setBusy(false); A.refreshMe();
          });
        }, Math.max(0, 250 - (performance.now() - t0)));
      }).catch(function (e) {
        msg(errText(e), "lose"); setBusy(false);
        if (e && e.status === 409) { wh.available = false; rerender(); }
      });
    }
  };

  // ---------- apertura / chiusura ----------
  function open(game) {
    if (!A.inTelegram) { A.toast("Apri da Telegram per giocare"); return; }
    clearTimers();
    S.game = game; S.busy = false;
    root.hidden = false; elTitle.textContent = game.title;
    msg("", ""); notes([]);
    game.build();
    A.api("/api/me").then(function (j) {
      var u = j.user || {}; if (typeof u.balance === "number") { setBalance(u.balance); rerender(); }
    }).catch(function () {});
    rerender();
    if (game.onOpen) game.onOpen();
  }
  function close() {
    if (S.busy) { A.toast("Aspetta la fine del giro"); return; }
    clearTimers(); S.game = null; root.hidden = true; stage.innerHTML = "";
    A.refreshMe();
  }
  elBack.addEventListener("click", close);
  elGo.addEventListener("click", function () { if (S.game && !S.busy && S.game.go) S.game.go(); });

  window.ArcadeGames.slot = { open: function () { open(slot); } };
  window.ArcadeGames.roulette = { open: function () { open(roul); } };
  window.ArcadeGames.scratch = { open: function () { open(scr); } };
  window.ArcadeGames.wheel = { open: function () { open(wh); } };
})();
