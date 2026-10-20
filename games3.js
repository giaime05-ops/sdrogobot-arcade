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
  // risultato centrale con effetto neon (come in blackjack e poker)
  function clearBanner() { var o = stage.querySelector(".res-banner"); if (o) o.remove(); }
  function banner(text, sub, cls) {
    clearBanner();
    var b = document.createElement("div"); b.className = "res-banner" + (cls ? " " + cls : ""); b.textContent = text;
    if (sub) { var sm = document.createElement("small"); sm.textContent = sub; b.appendChild(sm); }
    stage.appendChild(b);
  }
  function snd(n, a) { try { window.ArcadeAudio && window.ArcadeAudio.sfx(n, a); } catch (e) {} }
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
    elGo.className = "avi-go" + (g.hold ? " hold" : ""); elGo.textContent = l.text; elGo.disabled = !!(l.disabled || S.busy);
    if (S.busy && l.busyText) elGo.textContent = l.busyText;
  }
  function renderExtra() {
    var g = S.game;
    elExtra.hidden = !(g && g.extra);
    if (g && g.extra) g.extra(elExtra);
  }
  function rerender() { renderBets(); renderGo(); renderExtra(); }


  // ---------- icone neon (SVG) per slot e gratta e vinci ----------
  var SVGH = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  var ICON = {
    cherry: SVGH + '<defs><radialGradient id="icR" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffa0ad"/><stop offset=".45" stop-color="#ff1f4b"/><stop offset="1" stop-color="#860620"/></radialGradient></defs>' +
      '<path d="M34 10C28 18 23 30 20 42M34 10C40 20 44 32 45 42" stroke="#42e88a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M34 10C42 5 52 8 57 14C48 17 40 15 34 10Z" fill="#2fd86f" stroke="#b5ffd6" stroke-width="1"/>' +
      '<circle cx="19" cy="46" r="12" fill="url(#icR)"/><circle cx="45" cy="46" r="12" fill="url(#icR)"/><circle cx="15" cy="42" r="3" fill="#fff" opacity=".75"/><circle cx="41" cy="42" r="3" fill="#fff" opacity=".75"/></svg>',
    lemon: SVGH + '<defs><linearGradient id="icL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffb9a"/><stop offset=".5" stop-color="#ffd000"/><stop offset="1" stop-color="#d98a00"/></linearGradient></defs>' +
      '<path d="M5 38C5 26 20 14 36 15C48 16 57 22 59 26C60 30 56 32 56 36C54 48 42 54 28 53C16 52 5 48 5 38Z" fill="url(#icL)" stroke="#fff6a8" stroke-width="1.2"/>' +
      '<path d="M16 38C18 30 26 24 36 23" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".6"/>' +
      '<path d="M50 18C52 10 58 7 62 8C61 14 56 18 50 18Z" fill="#2fd86f" stroke="#b5ffd6" stroke-width="1"/></svg>',
    bell: SVGH + '<defs><linearGradient id="icB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b97a00"/><stop offset=".35" stop-color="#fff0a0"/><stop offset=".7" stop-color="#ffc233"/><stop offset="1" stop-color="#a86a00"/></linearGradient></defs>' +
      '<path d="M32 7C30 7 29 9 29 11C19 14 15 23 15 34C15 42 12 46 7 51H57C52 46 49 42 49 34C49 23 45 14 35 11C35 9 34 7 32 7Z" fill="url(#icB)" stroke="#fff3b8" stroke-width="1.2"/>' +
      '<circle cx="32" cy="55" r="5" fill="url(#icB)" stroke="#fff3b8"/><path d="M22 24C20 30 20 36 21 41" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55" fill="none"/></svg>',
    diamond: SVGH + '<defs><linearGradient id="icD" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9fbff"/><stop offset=".5" stop-color="#2fd6ff"/><stop offset="1" stop-color="#2a57ff"/></linearGradient></defs>' +
      '<polygon points="32,57 5,24 17,8 47,8 59,24" fill="url(#icD)" stroke="#e6fdff" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M5 24H59M17 8L25 24L32 57L39 24L47 8M25 24L32 8L39 24" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<polygon points="17,8 32,8 25,24 5,24" fill="#fff" opacity=".22"/></svg>',
    seven: SVGH + '<defs><linearGradient id="ic7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7ad0"/><stop offset=".55" stop-color="#ff2a6d"/><stop offset="1" stop-color="#c1004a"/></linearGradient></defs>' +
      '<polyline points="14,14 50,14 28,55" fill="none" stroke="#3a0020" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<polyline points="14,14 50,14 28,55" fill="none" stroke="url(#ic7)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<polyline points="16,13 48,13" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/></svg>',
    coin: SVGH + '<defs><radialGradient id="icC" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff4b0"/><stop offset=".5" stop-color="#ffc931"/><stop offset="1" stop-color="#a86a00"/></radialGradient></defs>' +
      '<circle cx="32" cy="32" r="25" fill="url(#icC)" stroke="#fff3b8" stroke-width="1.4"/><circle cx="32" cy="32" r="19" fill="none" stroke="#a86a00" stroke-width="2" opacity=".7"/>' +
      '<text x="32" y="43" text-anchor="middle" font-size="30" font-family="Bungee,Impact,sans-serif" fill="#7a4a00">$</text></svg>',
    crown: SVGH + '<defs><linearGradient id="icK" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a0"/><stop offset=".6" stop-color="#ffc233"/><stop offset="1" stop-color="#b57400"/></linearGradient></defs>' +
      '<path d="M7 50L11 18L24 32L32 11L40 32L53 18L57 50Z" fill="url(#icK)" stroke="#fff3b8" stroke-width="1.3" stroke-linejoin="round"/><rect x="7" y="50" width="50" height="7" rx="2" fill="url(#icK)" stroke="#fff3b8"/>' +
      '<circle cx="32" cy="40" r="4" fill="#ff2a6d"/><circle cx="19" cy="42" r="3" fill="#35e6ff"/><circle cx="45" cy="42" r="3" fill="#35e6ff"/></svg>',
    skull: SVGH + '<defs><linearGradient id="icS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e6f6"/><stop offset="1" stop-color="#7f86a6"/></linearGradient></defs>' +
      '<path d="M32 8C18 8 12 18 12 28C12 36 16 40 20 42V53H44V42C48 40 52 36 52 28C52 18 46 8 32 8Z" fill="url(#icS)" stroke="#f1f3ff" stroke-width="1.2"/>' +
      '<circle cx="23" cy="30" r="6" fill="#1a1030"/><circle cx="41" cy="30" r="6" fill="#1a1030"/><path d="M32 36L28 44H36Z" fill="#1a1030"/><path d="M26 47V53M32 47V53M38 47V53" stroke="#1a1030" stroke-width="2"/></svg>'
  };
  ICON.star = '<svg viewBox="0 0 64 64"><defs><linearGradient id="icStar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffb21e"/></linearGradient></defs><path d="m32 5 8.2 17.6 19.3 2.2-14.3 13.1 3.9 19L32 47.5 14.9 56.9l3.9-19L4.5 24.8l19.3-2.2z" fill="url(#icStar)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  ICON.ticket = '<svg viewBox="0 0 64 64"><defs><linearGradient id="icTk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#ff9a1f"/></linearGradient></defs><path d="M6 18h52v10a4 4 0 0 0 0 8v10H6V36a4 4 0 0 0 0-8z" fill="url(#icTk)" stroke="#fff" stroke-width="1.6"/><path d="M40 18v28" stroke="#7a4a00" stroke-width="2" stroke-dasharray="3 3"/><path d="M20 27l2.5 5 5.5.8-4 3.8 1 5.4-5-2.7-5 2.7 1-5.4-4-3.8 5.5-.8z" fill="#7a4a00"/></svg>';
  var EMO = { "⭐": "star", "🎟️": "ticket", "🍒": "cherry", "🍋": "lemon", "🔔": "bell", "💎": "diamond", "7️⃣": "seven", "💰": "coin", "👑": "crown", "💀": "skull" };
  function iconOf(sym) { return EMO[sym] ? ICON[EMO[sym]] : '<span class="emo">' + sym + '</span>'; }

  // ---------- roulette: ruota ferma con numeri grandi, la pallina gira lungo la pista e cade nella casella ----------
  function makeRoulette(size, order) {
    order = order || ORDER;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), n = order.length, sl = Math.PI * 2 / n;
    var cv = document.createElement("canvas"); cv.style.width = size + "px"; cv.style.height = size + "px";
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    var c = cv.getContext("2d"), cx = size / 2, cy = size / 2, k = size / 300;
    var r0 = size / 2 - 5, r1 = r0 - 9 * k, r2 = r1 - 26 * k, rpIn = r2 - 52 * k, rBall = (r1 + r2) / 2 + 3, rPk = r2 - 11 * k;
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
        var num = order[i], a0 = ang(i) - sl / 2, a1 = a0 + sl;
        c.beginPath(); c.arc(cx, cy, r2, a0, a1); c.arc(cx, cy, rpIn, a1, a0, true); c.closePath();
        c.fillStyle = (num === 0 || num === 37) ? "#0f9b52" : (RED.indexOf(num) >= 0 ? "#c9162c" : "#14101c"); c.fill();
        if (W.win === i) { c.fillStyle = "rgba(255,255,255,.35)"; c.fill(); }
        c.strokeStyle = "rgba(232,195,106,.8)"; c.lineWidth = 1; c.stroke();
        c.save(); c.translate(cx, cy); c.rotate(ang(i)); c.translate(rPk, 0); c.rotate(Math.PI / 2);
        c.fillStyle = "#fff"; c.font = "700 " + Math.round((n > 37 ? 13 : 14) * k) + "px Rajdhani, Oswald, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(num === 37 ? "00" : String(num), 0, 0); c.restore();
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
    // tre "caratteri" di tiro scelti a caso: secco (un rimbalzo), medio, lungo (la pallina torna indietro tra le caselle)
    var STYLES = [
      { ms: 0.86, amp: 0.55, fr: 26, rad: 3 },
      { ms: 0.80, amp: 1.6, fr: 15, rad: 4 },
      { ms: 0.72, amp: 3.2, fr: 9, rad: 5, back: true }
    ];
    W.spinTo = function (idx, ms, done) {
      W.win = -1; W.sg = undefined; var t0 = performance.now(), thf = ang(idx), D = Math.PI * 2 * (6 + Math.random() * 1.5), h0 = W.hub, st = STYLES[Math.floor(Math.random() * STYLES.length)];
      if (st.back) ms = ms * 1.18;
      cancelAnimationFrame(W.raf);
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), q = 1 - p;
        var a = thf - D * Math.pow(q, 2.3);
        var land = Math.max(0, Math.min(1, (p - st.ms + 0.24) / 0.3)), ls = land * land * (3 - 2 * land);
        var r = rBall + (rPk - rBall) * ls;
        if (p > st.ms && p < 1) {
          var kk = (p - st.ms) / (1 - st.ms), env = st.back ? Math.pow(1 - kk, 1.6) : (1 - kk);
          a += Math.sin(kk * st.fr) * sl * st.amp * env; r += Math.sin(kk * 20) * st.rad * k * (1 - kk);
          var sg = Math.sin(kk * 20) > 0 ? 1 : -1;                  // ogni rimbalzo della pallina nelle caselle: vibrazione e "tic"
          if (W.sg !== undefined && sg !== W.sg && kk < 0.85) { try { A.haptic("light"); snd("tick"); } catch (e) {} }
          W.sg = sg;
        }
        W.ball.a = a; W.ball.r = r; W.hub = h0 + (now - t0) / 1000 * 1.4;
        W.draw();
        if (p < 1) W.raf = requestAnimationFrame(step); else { W.win = idx; W.ball.a = thf; W.ball.r = rPk; W.draw(); try { A.haptic("med"); } catch (e) {} done && done(); }
      })(performance.now());
    };
    W.draw();
    return W;
  }
  function wheelSize() { return Math.max(240, Math.min(400, window.innerWidth - 14, window.innerHeight - 430)); }

  // ======================================================================
  //  SLOT
  // ======================================================================
  var SYM = { c: "🍒", l: "🍋", b: "🔔", d: "💎", s: "7️⃣" };
  var RH = 104, CYC = [SYM.c, SYM.l, SYM.b, SYM.d, SYM.s, SYM.c, SYM.b, SYM.l, SYM.d, SYM.l];      // ciclo del rullo
  var reelRaf = 0;
  function makeReel(box) {
    var strip = document.createElement("div"); strip.className = "strip";
    for (var k = 0; k <= CYC.length; k++) { var d = document.createElement("div"); d.innerHTML = iconOf(CYC[k % CYC.length]); strip.appendChild(d); }
    box.innerHTML = ""; box.appendChild(strip);
    var R = { box: box, strip: strip, y: 4 * RH, mode: "idle", v: 2600, L: CYC.length * RH };
    R.set = function () { var yy = ((R.y % R.L) + R.L) % R.L; strip.style.transform = "translate3d(0," + (-yy).toFixed(1) + "px,0)"; };
    R.spin = function () { R.mode = "spin"; };
    // Il rullo continua a girare finché la fase è quella giusta, poi frena con una distanza fissa (dm cicli):
    // così ogni rullo si ferma dopo un tempo prevedibile e l'ordine 1°→2°→3° è sempre rispettato.
    R.stopAt = function (sym, tminMs, dm, done) {
      var idxs = []; CYC.forEach(function (c, i) { if (c === sym) idxs.push(i); });
      var tgt = idxs[Math.floor(Math.random() * idxs.length)] * RH, L = R.L, D = dm * L;
      var need = (((tgt - D) % L) + L) % L, cur = ((R.y % L) + L) % L;
      var wait = ((need - cur + L) % L) / R.v * 1000, per = L / R.v * 1000;
      while (wait < tminMs) wait += per;
      later(function () {
        var c2 = ((R.y % L) + L) % L, base = ((tgt - c2) % L + L) % L, dist = base + Math.max(0, Math.round((D - base) / L)) * L;
        if (dist < L * 0.5) dist += L;
        R.mode = "stop"; R.a = { y0: R.y, dist: dist, ms: 2 * dist / R.v * 1000, t0: performance.now(), done: done };
      }, wait);
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
  function hintIcons(a, b, cnt) { var h = ""; for (var i = 0; i < cnt; i++) h += '<i class="hi">' + ICON[a] + "</i>"; return h; }
  var slot = {
    title: "🎰 SLOT 777", bets: true, reels: [], box: null,
    build: function () {
      stage.innerHTML = '<div class="sl-cab"><i class="sl-b t"></i><i class="sl-b b"></i><i class="sl-b l"></i><i class="sl-b r"></i>' +
        '<div class="reels" id="slReels"><div class="reel"></div><div class="reel"></div><div class="reel"></div></div></div>' +
        '<div class="gm-hint pay"><div class="pr"><span>' + hintIcons("seven", 0, 3) + ' ×10</span><span>' + hintIcons("diamond", 0, 3) + ' ×6</span><span>' + hintIcons("bell", 0, 3) + ' ×5</span>' +
        '<span>' + hintIcons("lemon", 0, 3) + ' ×4</span><span>' + hintIcons("cherry", 0, 3) + ' ×3</span></div><div class="pr2">Doppia <i class="hi">' + ICON.seven + '</i> o <i class="hi">' + ICON.diamond + '</i> ×2 · altre doppie: rimborso<br><i class="hi">' + ICON.star + '</i><i class="hi">' + ICON.star + '</i><i class="hi">' + ICON.star + '</i> = 3 GIRI GRATIS</div></div>' +
        '<div class="sl-last"><div class="sl-lt">ULTIME USCITE</div><div class="sl-lr" id="slLast"></div></div>';
      slot.paintLast();
      slot.box = $("slReels"); slot.reels = Array.prototype.slice.call(slot.box.querySelectorAll(".reel")).map(makeReel);
    },
    last: (function () { try { return JSON.parse(sessionStorage.getItem("arc_sllast") || "[]"); } catch (e) { return []; } })(),
    pushLast: function (res) {
      slot.last.unshift({ r: res.reels, n: res.net }); slot.last = slot.last.slice(0, 8);
      try { sessionStorage.setItem("arc_sllast", JSON.stringify(slot.last)); } catch (e) {}
      slot.paintLast();
    },
    paintLast: function () {
      var box = $("slLast"); if (!box) return; box.innerHTML = "";
      if (!slot.last.length) { var e0 = document.createElement("span"); e0.className = "sl-none"; e0.textContent = "nessuna giocata"; box.appendChild(e0); return; }
      slot.last.forEach(function (h) {
        var c = document.createElement("div"); c.className = "sl-li " + (h.n > 0 ? "w" : (h.n < 0 ? "l" : "p"));
        c.innerHTML = h.r.map(function (x) { return "<i>" + iconOf(x) + "</i>"; }).join("");
        box.appendChild(c);
      });
    },
    onOpen: function () {
      A.api("/api/slot/state").then(function (j) { slot.freeLeft = j.free_left || 0; if (slot.freeLeft) msg("Hai " + slot.freeLeft + " giri gratis!", "win"); renderGo(); }).catch(function () {});
      msg("Scegli la puntata e gira!", "");
    },
    freeLeft: 0,
    goLabel: function () {
      if (slot.freeLeft > 0) return { text: "GIRO GRATIS  (" + slot.freeLeft + ")", busyText: "GIRANO…" };
      if (S.balance < S.bet) return { text: "SALDO INSUFFICIENTE", disabled: true };
      return { text: "GIRA  " + S.bet + " $SDG", busyText: "GIRANO…" };
    },
    go: function () {
      var bet = S.bet, t0 = performance.now(), isFree = slot.freeLeft > 0;
      setBusy(true); msg("", ""); notes([]); clearBanner(); slot.box.classList.remove("win", "hype");
      if (!isFree) showBal(S.balance - bet);
      slot.reels.forEach(function (r) { r.box.classList.remove("stop"); r.spin(); }); reelsStart();
      A.haptic("med"); snd("spin");
      A.api("/api/slot/spin", "POST", { bet: bet }).then(function (j) {
        var res = j.result, rl = res.reels, hype = rl[0] === rl[1];
        var el0 = performance.now() - t0;
        // i rulli si fermano sempre in ordine; se i primi due sono uguali il terzo ha più suspense (frena più a lungo)
        var plan = [[150, 1], [700, 1], [hype ? 1350 : 1250, hype ? 1.4 : 1]];
        if (hype) { later(function () { slot.box.classList.add("hype"); A.haptic("light"); }, 650); [650, 900, 1150, 1400, 1650, 1900].forEach(function (d) { later(function () { snd("tick"); }, d); }); }
        [0, 1, 2].forEach(function (i) {
          slot.reels[i].stopAt(rl[i], Math.max(0, plan[i][0] - el0), plan[i][1], function () {
            A.haptic("light"); snd("reel");
            if (i === 2) { slot.box.classList.remove("hype"); finish(res); }
          });
        });
      }).catch(function (e) {
        slot.reels.forEach(function (r) { r.mode = "idle"; });
        showBal(S.balance); msg(errText(e), "lose"); setBusy(false);
        if (e && e.body && e.body.error) A.refreshMe();
      });
      function finish(res) {
        setBalance(res.balance); slot.pushLast(res); slot.freeLeft = res.free_left || 0;
        if (res.kind === "bonus") { slot.box.classList.add("win"); msg("⭐ BONUS! " + res.free_left + " giri gratis!", "win"); banner("BONUS!", res.free_left + " GIRI GRATIS", "win"); A.haptic("ok"); }
        else if (res.kind === "triple") { slot.box.classList.add("win"); msg((res.reels[0] === SYM.s ? "🔥 JACKPOT 777! " : "🎉 TRIS! ") + "+" + A.fmt(res.net) + " $SDG", "win"); banner(res.reels[0] === SYM.s ? "JACKPOT 777!" : "TRIS!", "+" + A.fmt(res.net) + " $SDG", "win"); A.haptic("ok"); }
        else if (res.kind === "pair" && res.net > 0) { slot.box.classList.add("win"); msg("✨ Doppia d'oro! +" + A.fmt(res.net) + " $SDG", "win"); banner("DOPPIA D'ORO", "+" + A.fmt(res.net) + " $SDG", "win"); A.haptic("ok"); }
        else if (res.kind === "pair") msg("✨ Doppia: recuperi la puntata.", "");
        else { msg(res.free ? "Nessuna vincita (giro gratis)" : "💸 Nessuna combinazione: -" + A.fmt(res.bet) + " $SDG", res.free ? "" : "lose"); A.haptic(res.free ? "light" : "bad"); }
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
  var CNAME = { red: "ROSSO", black: "NERO", green: "VERDE" };
  // ---- tavolo completo (solo account admin di prova): 0 e 00, più puntate insieme ----
  var ORDER_US = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, 37, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
  var rt = { on: false, placed: {}, order: [], last: [] };
  function rtKey(t, v) { return t + (v || ""); }
  function rtTotal() { var s = 0; Object.keys(rt.placed).forEach(function (k) { s += rt.placed[k].a; }); return s; }
  function rtCell(label, cls, t, v) {
    var d = document.createElement("button"); d.type = "button"; d.className = "rt-c " + cls; d.setAttribute("data-k", rtKey(t, v));
    var sp = document.createElement("span"); sp.textContent = label; d.appendChild(sp);
    d.addEventListener("click", function () {
      if (S.busy) return;
      var k = rtKey(t, v), p = rt.placed[k] || (rt.placed[k] = { t: t, v: v || 0, a: 0 });
      if (rtTotal() + S.bet > 3000) { A.toast("Massimo 3000 $SDG per giro"); return; }
      if (rtTotal() + S.bet > S.balance) { A.toast("Saldo insufficiente"); return; }
      p.a += S.bet; rt.order.push(k); A.haptic("light"); snd("pick"); rtPaint(); renderGo();
    });
    return d;
  }
  function rtBuild(box) {
    box.innerHTML = ""; var g = document.createElement("div"); g.className = "rt-grid";
    var z = rtCell("0", "g zero", "s", 0); z.style.gridArea = "1 / 1 / 2 / 3"; g.appendChild(z);
    var z2 = rtCell("00", "g zero", "s", 37); z2.style.gridArea = "1 / 3 / 2 / 5"; g.appendChild(z2);
    // 12 file da 3: la fila in alto è 1 2 3, in basso 34 35 36 (colonne 1,2,3 verticali)
    for (var n = 1; n <= 36; n++) {
      var c = rtCell(String(n), RED.indexOf(n) >= 0 ? "r" : "b", "s", n);
      var row = Math.floor((n - 1) / 3), col = (n - 1) % 3;
      c.style.gridArea = (row + 2) + " / " + (col + 2) + " / auto / auto"; g.appendChild(c);
    }
    [["1°12", "d", 1], ["2°12", "d", 2], ["3°12", "d", 3]].forEach(function (x, i) {
      var c = rtCell(x[0], "o", x[1], x[2]); c.style.gridArea = (i * 4 + 2) + " / 1 / " + (i * 4 + 6) + " / 2"; g.appendChild(c);
    });
    [["1-18", "low"], ["PARI", "even"], ["ROSSO", "red"], ["NERO", "black"], ["DISP.", "odd"], ["19-36", "high"]].forEach(function (x, i) {
      var c = rtCell(x[0], "o" + (x[1] === "red" ? " r" : (x[1] === "black" ? " b" : "")), x[1], 0); c.style.gridArea = (i * 2 + 2) + " / 5 / " + (i * 2 + 4) + " / 6"; g.appendChild(c);
    });
    [1, 2, 3].forEach(function (v) { var c = rtCell("2:1", "o", "c", v); c.style.gridArea = "14 / " + (v + 1) + " / auto / auto"; g.appendChild(c); });
    box.appendChild(g); rtPaint();
  }
  function rtPaint() {
    Array.prototype.forEach.call(document.querySelectorAll(".rt-c"), function (c) {
      var p = rt.placed[c.getAttribute("data-k")], o = c.querySelector("i");
      if (p && p.a) { if (!o) { o = document.createElement("i"); c.appendChild(o); } o.textContent = p.a; } else if (o) o.remove();
    });
  }
  // due schermate: "bet" = ruota piccola + tavolo; "spin" = ruota grande e pallina (anche per il risultato)
  function rtView(mode) {
    rt.phase = mode; clearTimeout(rt.back);
    var sh = stage.clientHeight || Math.max(300, window.innerHeight - 330);
    if (mode === "bet") {
      var ws = Math.max(96, Math.min(150, sh * 0.26)), rh = Math.max(15, Math.min(23, Math.floor((sh - ws - 40 - 26) / 14)));
      stage.style.setProperty("--rt-h", rh + "px"); stage.classList.add("rt-bet");
      roul.wheel = makeRoulette(Math.round(ws), ORDER_US);
      stage.innerHTML = '<div class="wheelbox rl-wrap" id="rlBox"></div><div id="rtBox"></div>';
      $("rlBox").appendChild(roul.wheel.cv); rtBuild($("rtBox"));
    } else {
      stage.classList.remove("rt-bet");
      roul.wheel = makeRoulette(wheelSize(), ORDER_US);
      stage.innerHTML = '<div class="wheelbox rl-wrap" id="rlBox"></div>';
      $("rlBox").appendChild(roul.wheel.cv);
    }
    renderGo(); renderExtra();
    if (mode === "bet") { rtFit(); requestAnimationFrame(rtFit); setTimeout(rtFit, 250); }
  }
  function rtFit() {
    if (rt.phase !== "bet" || !roul.wheel) return;
    var sh = stage.clientHeight; if (!sh) return;
    var ws = Math.max(90, Math.min(150, sh * 0.24)), rh = Math.max(13, Math.min(23, Math.floor((sh - ws - 16 - 26) / 14)));
    stage.style.setProperty("--rt-h", rh + "px"); roul.wheel.cv.style.width = roul.wheel.cv.style.height = Math.round(ws) + "px";
  }
  function rtClear() { rt.placed = {}; rt.order = []; rtPaint(); }

  var roul = {
    title: "🎡 ROULETTE", bets: true, choice: "red", wheel: null,
    build: function () {
      rt.on = !!(A.isSandbox && A.isSandbox()); rtClear();
      if (rt.on) { rtView("bet"); return; }
      roul.wheel = makeRoulette(wheelSize());
      stage.innerHTML = '<div class="wheelbox rl-wrap" id="rlBox"></div>' +
        '<div class="gm-hint">Rosso / Nero / Pari / Dispari ×2 · Verde (0) ×36<br>Lo zero fa perdere tutto tranne chi punta sul Verde.</div>';
      $("rlBox").appendChild(roul.wheel.cv);
    },
    onOpen: function () { msg(rt.on ? "Tocca il tavolo: pieno ×36 · dozzine/colonne ×3 · chance ×2" : "Scegli la puntata e su cosa punti.", ""); },
    extra: function (box) {
      box.innerHTML = "";
      if (rt.on) {
        if (rt.phase === "spin") return;
        [["↩ ANNULLA", function () { var k = rt.order.pop(); if (k && rt.placed[k]) { rt.placed[k].a -= S.bet; if (rt.placed[k].a <= 0) delete rt.placed[k]; } }],
         ["🗑 SVUOTA", rtClear],
         ["🔁 RIPETI", function () { if (rt.last.length) { rtClear(); rt.last.forEach(function (p) { var k = rtKey(p.t, p.v); rt.placed[k] = { t: p.t, v: p.v, a: p.a }; rt.order.push(k); }); } }]
        ].forEach(function (x) {
          var b = document.createElement("button"); b.type = "button"; b.className = "gm-pick"; b.textContent = x[0]; b.disabled = S.busy;
          b.addEventListener("click", function () { x[1](); A.haptic("light"); rtPaint(); renderGo(); });
          box.appendChild(b);
        });
        return;
      }
      CH.forEach(function (c) {
        var b = document.createElement("button"); b.type = "button"; b.className = "gm-pick" + (roul.choice === c[0] ? " on" : "");
        b.textContent = c[1]; b.disabled = S.busy;
        b.addEventListener("click", function () { roul.choice = c[0]; A.haptic("light"); renderExtra(); renderGo(); });
        box.appendChild(b);
      });
    },
    goLabel: function () {
      if (rt.on) {
        if (rt.phase === "spin") return S.busy ? { text: "LA RUOTA GIRA…", disabled: true } : { text: "NUOVA PUNTATA" };
        var tt = rtTotal();
        if (!tt) return { text: "PUNTA SUL TAVOLO", disabled: true };
        if (S.balance < tt) return { text: "SALDO INSUFFICIENTE", disabled: true };
        return { text: "GIRA · " + A.fmt(tt) + " $SDG", busyText: "LA RUOTA GIRA…" };
      }
      if (S.balance < S.bet) return { text: "SALDO INSUFFICIENTE", disabled: true };
      var nm = CH.filter(function (c) { return c[0] === roul.choice; })[0][1];
      return { text: "GIRA  " + S.bet + " su " + nm.replace(/^[^\wÀ-ÿ]+/, ""), busyText: "LA RUOTA GIRA…" };
    },
    goTable: function () {
      var list = Object.keys(rt.placed).map(function (k) { var p = rt.placed[k]; return { t: p.t, v: p.v, a: p.a }; }), total = rtTotal();
      if (!list.length) return;
      rt.last = list.map(function (p) { return { t: p.t, v: p.v, a: p.a }; });
      setBusy(true); msg("", ""); notes([]); rtView("spin");
      showBal(S.balance - total); A.haptic("med"); snd("ball");
      var t0 = performance.now();
      A.api("/api/roulette/table", "POST", { bets: list }).then(function (j) {
        var res = j.result, idx = ORDER_US.indexOf(res.number);
        later(function () {
          roul.wheel.spinTo(idx, 6400, function () {
            setBalance(res.balance);
            var cn = CNAME[res.color] || "", head = (res.number === 37 ? "00" : res.number) + (cn ? " " + cn : "");
            if (res.paid > res.bet) { msg("🎉 Vinto! +" + A.fmt(res.net) + " $SDG", "win"); banner(head, "HAI VINTO +" + A.fmt(res.net) + " $SDG", "win"); A.haptic("ok"); }
            else if (res.paid > 0) { msg("Recuperi " + A.fmt(res.paid) + " $SDG (" + (res.net >= 0 ? "+" : "") + A.fmt(res.net) + ")", ""); banner(head, "RECUPERI " + A.fmt(res.paid) + " $SDG", ""); }
            else { msg("💸 Perso: -" + A.fmt(res.bet) + " $SDG", "lose"); banner(head, "HAI PERSO -" + A.fmt(res.bet) + " $SDG", "lose"); A.haptic("bad"); }
            notes(res.notes); rtClear(); setBusy(false); A.refreshMe();
            rt.back = setTimeout(function () { if (S.game === roul && rt.phase === "spin" && !S.busy) { clearBanner(); msg("", ""); rtView("bet"); } }, 4500);
          });
        }, Math.max(0, 250 - (performance.now() - t0)));
      }).catch(function (e) { showBal(S.balance); msg(errText(e), "lose"); setBusy(false); rtView("bet"); });
    },
    go: function () {
      if (rt.on) { if (rt.phase === "spin") { clearBanner(); msg("", ""); rtView("bet"); } else roul.goTable(); return; }
      var bet = S.bet, choice = roul.choice;
      setBusy(true); msg("", ""); notes([]); clearBanner();
      showBal(S.balance - bet); A.haptic("med"); snd("ball");
      var t0 = performance.now();
      A.api("/api/roulette/spin", "POST", { bet: bet, choice: choice }).then(function (j) {
        var res = j.result, idx = ORDER.indexOf(res.number);
        later(function () {
          roul.wheel.spinTo(idx, 6400, function () {
            setBalance(res.balance);
            var cn = CNAME[res.color] || "", head = res.number + (cn ? " " + cn : "");
            if (res.mult === 36) { msg("🔥 VERDE! +" + A.fmt(res.net) + " $SDG", "win"); banner(head, "VERDE! +" + A.fmt(res.net) + " $SDG", "win"); A.haptic("ok"); }
            else if (res.mult > 0) { msg("🎉 Vinto! +" + A.fmt(res.net) + " $SDG", "win"); banner(head, "HAI VINTO +" + A.fmt(res.net) + " $SDG", "win"); A.haptic("ok"); }
            else { msg("💸 Perso: -" + A.fmt(res.bet) + " $SDG", "lose"); banner(head, "HAI PERSO -" + A.fmt(res.bet) + " $SDG", "lose"); A.haptic("bad"); }
            notes(res.notes); setBusy(false); A.refreshMe();
          });
        }, Math.max(0, 250 - (performance.now() - t0)));
      }).catch(function (e) {
        showBal(S.balance); msg(errText(e), "lose"); setBusy(false);
      });
    }
  };

  // ======================================================================
  //  GRATTA E VINCI: si gratta davvero col dito
  // ======================================================================
  var TS = 96;                                                // lato di una casella (px)
  function paintCover(cv) {
    var dpr = cv.width / TS, c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, TS, TS);
    var g = c.createLinearGradient(0, 0, TS, TS); g.addColorStop(0, "#a9aed8"); g.addColorStop(0.5, "#6a6f9c"); g.addColorStop(1, "#b4b9e2");
    c.fillStyle = g; c.fillRect(0, 0, TS, TS);
    c.strokeStyle = "rgba(255,255,255,.10)"; c.lineWidth = 7;
    for (var i = -TS; i < TS * 2; i += 18) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + TS, TS); c.stroke(); }
    for (var k = 0; k < 90; k++) { c.fillStyle = "rgba(255,255,255," + (0.05 + Math.random() * 0.16).toFixed(2) + ")"; c.fillRect(Math.random() * TS, Math.random() * TS, 1.6, 1.6); }
    c.save(); c.font = "700 " + Math.round(TS * 0.74) + "px Rajdhani, Oswald, Impact, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.shadowColor = "#ff3db0"; c.shadowBlur = 12; c.lineWidth = 3; c.strokeStyle = "#2a0b3d"; c.strokeText("S", TS / 2, TS / 2 + 3);
    var gg = c.createLinearGradient(0, TS * 0.2, 0, TS * 0.8); gg.addColorStop(0, "#ff9be0"); gg.addColorStop(1, "#ff2a9a");
    c.fillStyle = gg; c.fillText("S", TS / 2, TS / 2 + 3);
    c.lineCap = "round"; c.lineWidth = TS * 0.045; c.strokeStyle = "#ff9be0";            // le stanghette del dollaro
    c.beginPath(); c.moveTo(TS / 2, TS * 0.13); c.lineTo(TS / 2, TS * 0.27); c.moveTo(TS / 2, TS * 0.73); c.lineTo(TS / 2, TS * 0.87); c.stroke(); c.restore();
    c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 2; c.strokeRect(1, 1, TS - 2, TS - 2);
  }
  var scr = {
    title: "🎟️ GRATTA E VINCI", bets: false, active: false, left: 3, cost: 20, tiles: [], finished: false, cur: null,
    build: function () {
      stage.innerHTML = '<div class="scr" id="scGrid"></div><div class="gm-hint">Gratta 3 caselle col dito: <i class="hi">' + ICON.skull + '</i> vuoto · <i class="hi">' + ICON.coin + '</i> 10 · <i class="hi">' + ICON.diamond + '</i> 25 · <i class="hi">' + ICON.crown + '</i> 100 $SDG<br>Il premio è la somma delle tre. Tre monete uguali = un biglietto gratis; con il biglietto dorato <i class="hi">' + ICON.ticket + '</i> ne vinci 10!</div>';
      var g = $("scGrid"); scr.tiles = []; scr.cur = null;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (var i = 0; i < 9; i++) {
        (function (i) {
          var box = document.createElement("div"); box.className = "sc-tile";
          var under = document.createElement("div"); under.className = "under";
          var cv = document.createElement("canvas"); cv.width = Math.round(TS * dpr); cv.height = Math.round(TS * dpr);
          box.appendChild(under); box.appendChild(cv); g.appendChild(box);
          var T = { i: i, box: box, under: under, cv: cv, ctx: cv.getContext("2d"), st: "cover", sym: null, result: null, moved: 0, last: null, tchk: 0, tsnd: 0 };
          paintCover(cv); scr.tiles.push(T); scr.bind(T);
        })(i);
      }
      if (document.fonts && document.fonts.load) document.fonts.load("700 40px Rajdhani").then(function () { scr.tiles.forEach(function (T) { if (T.st === "cover" && !T.touched) paintCover(T.cv); }); }).catch(function () {});
    },
    reset: function () {
      scr.cur = null;
      scr.tiles.forEach(function (T) { T.st = "cover"; T.sym = null; T.result = null; T.touched = false; T.under.innerHTML = ""; T.box.className = "sc-tile"; paintCover(T.cv); });
    },
    reveal: function (T, sym, dim) {
      T.st = "done"; T.under.innerHTML = iconOf(sym); T.box.className = "sc-tile done" + (dim ? " dim" : "");
    },
    bind: function (T) {
      var cv = T.cv;
      function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * TS / r.width, y: (e.clientY - r.top) * TS / r.height }; }
      cv.addEventListener("pointerdown", function (e) {
        if (!scr.active || T.st === "done" || T.st === "fading") return;
        if (scr.cur && scr.cur !== T) { A.toast("Finisci di grattare la casella"); return; }
        if (T.st === "cover" && scr.left <= 0) return;
        e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {}
        T.down = true; T.touched = true; T.last = pt(e); T.moved = 0; T.start = T.last; scr.dot(T, T.last, T.last);
        if (T.st === "cover") scr.request(T);
      });
      cv.addEventListener("pointermove", function (e) {
        if (!T.down) return; e.preventDefault();
        var p = pt(e); scr.dot(T, T.last, p); T.moved += Math.abs(p.x - T.last.x) + Math.abs(p.y - T.last.y); T.last = p;
        var now = performance.now();
        if (now - T.tsnd > 85) { T.tsnd = now; snd("scratch"); }
        if (now - T.tchk > 140) { T.tchk = now; scr.check(T); }
      });
      function up() {
        if (!T.down) return; T.down = false;
        if (T.moved < 10) T.tap = true;                       // un tocco secco scopre la casella da solo
        scr.check(T, true);
      }
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    },
    dot: function (T, a, b) {
      var c = T.ctx, dpr = T.cv.width / TS; c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalCompositeOperation = "destination-out"; c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = TS * 0.3;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x + 0.01, b.y + 0.01); c.stroke();
    },
    cleared: function (T) {
      try {
        var d = T.ctx.getImageData(0, 0, T.cv.width, T.cv.height).data, w = T.cv.width, n = 0, tot = 0;
        for (var y = 3; y < T.cv.height; y += 6) for (var x = 3; x < w; x += 6) { tot++; if (d[(y * w + x) * 4 + 3] < 40) n++; }
        return n / tot;
      } catch (e) { return 1; }
    },
    check: function (T, forced) {
      if (T.st !== "scratching") { if (forced && T.tap && T.st === "requesting") T.autoFinish = true; return; }
      if (scr.cleared(T) >= 0.5 || (forced && T.tap)) scr.finish(T);
    },
    request: function (T) {
      T.st = "requesting"; scr.cur = T; S.busy = true; elBack.disabled = true; A.haptic("light");
      A.api("/api/scratch/pick", "POST", { idx: T.i }).then(function (j) {
        T.sym = j.sym; T.result = j.result || null; T.under.innerHTML = iconOf(j.sym); T.st = "scratching";
        if (j.result) scr.left = 0;
        else if (j.state && j.state.picked) scr.left = (j.state.picks || 3) - j.state.picked.length;
        else scr.left = Math.max(0, scr.left - 1);
        msg("Gratta la casella…", "");
        if (T.autoFinish || (T.tap && !T.down)) scr.finish(T); else scr.check(T);
      }).catch(function (e) {
        scr.cur = null; T.st = "cover"; T.down = false; paintCover(T.cv); msg(errText(e), "lose"); S.busy = false; elBack.disabled = false;
        if (e && e.status === 409) A.api("/api/scratch/state").then(function (v) { scr.applyView(v); rerender(); }).catch(function () {});
      });
    },
    finish: function (T) {
      if (T.st !== "scratching") return;
      T.st = "fading"; T.box.classList.add("done"); T.down = false; A.haptic("light"); snd("chip");
      later(function () {
        T.st = "done"; scr.cur = null;
        if (T.result) {
          var res = T.result; scr.active = false; scr.finished = true;
          scr.tiles.forEach(function (tt, k) { if (res.picked.indexOf(k) < 0) scr.reveal(tt, res.grid[k], true); });
          setBalance(res.balance); scr.free = res.free_left || 0;
          if (res.paid > 0) { msg("🎉 Hai vinto " + A.fmt(res.paid) + " $SDG (" + (res.net >= 0 ? "+" : "") + A.fmt(res.net) + " netti)", "win"); banner("HAI VINTO", "+" + A.fmt(res.paid) + " $SDG", "win"); A.haptic("ok"); }
          else { msg("💸 Nessun premio, ritenta!", "lose"); banner("NESSUN PREMIO", "ritenta!", "lose"); A.haptic("bad"); }
          notes(res.notes);
        } else msg("Grattate rimaste: " + scr.left, "");
        S.busy = false; elBack.disabled = false; rerender(); A.refreshMe();
      }, 380);
    },
    applyView: function (v) {
      if (typeof v.balance === "number") setBalance(v.balance);
      if (v.cost) scr.cost = v.cost;
      scr.active = !!v.active; scr.enabled = v.enabled !== false; scr.free = v.free || 0;
      scr.reset();
      if (v.active) {
        scr.finished = false;
        scr.left = (v.picks || 3) - v.picked.length;
        v.picked.forEach(function (p) { scr.reveal(scr.tiles[p.i], p.sym, false); });
        msg("Grattate rimaste: " + scr.left, "");
      }
    },
    onOpen: function () {
      msg("Compra un biglietto e gratta 3 caselle.", ""); scr.reset(); scr.finished = false; scr.active = false;
      A.api("/api/scratch/state").then(function (v) { scr.applyView(v); rerender(); }).catch(function (e) { msg(errText(e), "lose"); });
    },
    goLabel: function () {
      if (scr.active) return { text: "GRATTA CON IL DITO ☝", disabled: true };
      if (scr.free > 0) return { text: "BIGLIETTO GRATIS  (" + scr.free + ")", busyText: "…" };
      if (S.balance < scr.cost) return { text: "SALDO INSUFFICIENTE", disabled: true };
      return { text: (scr.finished ? "NUOVO BIGLIETTO  " : "COMPRA BIGLIETTO  ") + scr.cost + " $SDG", busyText: "…" };
    },
    go: function () {
      setBusy(true); msg("", ""); notes([]); clearBanner(); A.haptic("med"); snd("chip");
      A.api("/api/scratch/buy", "POST", {}).then(function (v) {
        scr.applyView(v); setBusy(false);
      }).catch(function (e) { msg(errText(e), "lose"); setBusy(false); });
    }
  };

  // ======================================================================
  //  RUOTA DAILY: ruota neon con puntatore laterale, si carica tenendo premuto e parte quando rilasci
  // ======================================================================
  var PRIZES = [500, 25, 50, 25, 75, 25, 50, 100, 25, 50, 25, 75, 50, 25, 50, 100, 25, 75, 50, 25, 50, 25, 75, 50, 25];     // 25 spicchi
  var PAL = ["#ff2d95", "#22d3ee", "#8b5cf6", "#ffb020", "#2ee6a6", "#ff5a5f"];
  function makeFortune(D) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), n = PRIZES.length, sl = Math.PI * 2 / n;
    var CW = D + 46, CH2 = D + 64;
    var cv = document.createElement("canvas"); cv.style.width = CW + "px"; cv.style.height = CH2 + "px";
    cv.width = Math.round(CW * dpr); cv.height = Math.round(CH2 * dpr);
    var c = cv.getContext("2d"), cx = D / 2 + 8, cy = D / 2 + 8, R = D / 2 - 2, Rs = R - 20;
    var segs = PRIZES.map(function (p, i) { return { p: p, color: p === 500 ? "#ffd23f" : PAL[(i === n - 1 ? 1 : i) % PAL.length] }; });
    var F = { cv: cv, rot: 0, vel: 0, mode: "idle", power: 0, flap: 0, win: -1, ledPh: 0, flash: 0, lastK: null, raf: 0, tIdle: 0 };
    function shade(hex, f) { var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16); return "rgb(" + Math.round(r * f) + "," + Math.round(g * f) + "," + Math.round(b * f) + ")"; }
    F.draw = function (now) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, CW, CH2);
      // piedistallo e ombra
      var gp = c.createLinearGradient(0, cy + R * 0.5, 0, CH2); gp.addColorStop(0, "#3b1470"); gp.addColorStop(1, "#150628");
      c.beginPath(); c.moveTo(cx - 34, cy + R * 0.7); c.lineTo(cx + 34, cy + R * 0.7); c.lineTo(cx + 74, CH2 - 16); c.lineTo(cx - 74, CH2 - 16); c.closePath(); c.fillStyle = gp; c.fill();
      c.strokeStyle = "rgba(255,61,176,.7)"; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.moveTo(cx - 84, CH2 - 16); c.lineTo(cx + 84, CH2 - 16); c.lineTo(cx + 84, CH2 - 6); c.lineTo(cx - 84, CH2 - 6); c.closePath();
      c.fillStyle = "#4b1a8a"; c.fill(); c.strokeStyle = "#35e6ff"; c.stroke();
      c.save(); c.shadowColor = "rgba(0,0,0,.75)"; c.shadowBlur = 22; c.shadowOffsetY = 8;
      c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fillStyle = "#1a0836"; c.fill(); c.restore();
      // cornice con profondità: anello esterno metallico viola + bordo neon
      var gr = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      gr.addColorStop(0, "#9b5cff"); gr.addColorStop(0.55, "#4a1d9a"); gr.addColorStop(1, "#1a0a3a");
      c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fillStyle = gr; c.fill();
      c.save(); c.shadowColor = "#ff3db0"; c.shadowBlur = 14; c.strokeStyle = "#ff6fc8"; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); c.restore();
      c.beginPath(); c.arc(cx, cy, R - 3, Math.PI * 0.95, Math.PI * 1.75); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 2; c.stroke();
      // incavo interno scuro (effetto spessore)
      c.beginPath(); c.arc(cx, cy, Rs + 4, 0, 7); c.fillStyle = "#0a0316"; c.fill();
      // spicchi
      for (var i = 0; i < n; i++) {
        var a0 = F.rot + i * sl - sl / 2, a1 = a0 + sl, S2 = segs[i];
        c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, Rs, a0, a1); c.closePath();
        c.fillStyle = S2.color; c.fill();
        var gs = c.createRadialGradient(cx, cy, Rs * 0.1, cx, cy, Rs); gs.addColorStop(0, "rgba(0,0,0,.42)"); gs.addColorStop(0.6, "rgba(0,0,0,0)"); gs.addColorStop(1, "rgba(255,255,255,.14)");
        c.fillStyle = gs; c.fill();
        if (F.win === i) { c.fillStyle = "rgba(255,255,255," + (0.28 + 0.25 * Math.sin(now / 90)).toFixed(2) + ")"; c.fill(); }
        c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.2; c.stroke();
        // etichetta lungo il raggio
        c.save(); c.translate(cx, cy); c.rotate(F.rot + i * sl); c.textAlign = "right"; c.textBaseline = "middle";
        c.font = "700 " + Math.round(Rs * 0.15) + "px Rajdhani, Oswald, sans-serif";
        c.lineWidth = 3.5; c.strokeStyle = S2.p === 500 ? "rgba(90,50,0,.7)" : "rgba(0,0,0,.55)"; c.strokeText(String(S2.p), Rs - 11, 0);
        c.fillStyle = S2.p === 500 ? "#5a2f00" : "#fff"; c.fillText(String(S2.p), Rs - 11, 0); c.restore();
      }
      // anello interno e mozzo
      c.beginPath(); c.arc(cx, cy, Rs, 0, 7); c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = 3; c.stroke();
      var gh = c.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, Rs * 0.22); gh.addColorStop(0, "#ffffff"); gh.addColorStop(0.4, "#c9b8ff"); gh.addColorStop(1, "#4a2a8f");
      c.save(); c.shadowColor = "#35e6ff"; c.shadowBlur = 14; c.beginPath(); c.arc(cx, cy, Rs * 0.2, 0, 7); c.fillStyle = gh; c.fill(); c.restore();
      c.beginPath(); c.arc(cx, cy, Rs * 0.2, 0, 7); c.strokeStyle = "#ff6fc8"; c.lineWidth = 2; c.stroke();
      // LED sul bordo: si accendono a scorrimento mentre gira, lampeggiano alla vincita
      var LC = ["#ff3db0", "#35e6ff", "#ffe14a"];
      for (var j = 0; j < n; j++) {
        var ang = F.rot + j * sl + sl / 2, lx = cx + Math.cos(ang) * (R - 9), ly = cy + Math.sin(ang) * (R - 9), on;
        if (F.flash > 0) on = (Math.floor(now / 110) + (j % 2)) % 2 === 0;
        else if (F.mode === "idle") on = (Math.floor(now / 450) + j) % 3 === 0;
        else on = ((j + Math.floor(F.ledPh)) % 3) === 0;
        if (on) { c.save(); c.shadowColor = LC[j % 3]; c.shadowBlur = 12; c.fillStyle = LC[j % 3]; c.beginPath(); c.arc(lx, ly, 3.6, 0, 7); c.fill(); c.restore(); c.fillStyle = "#fff"; c.beginPath(); c.arc(lx - 0.8, ly - 0.8, 1.3, 0, 7); c.fill(); }
        else { c.fillStyle = "#2c1457"; c.beginPath(); c.arc(lx, ly, 3, 0, 7); c.fill(); }
      }
      // puntatore laterale (a destra), con linguetta che scatta sui pioli
      c.save(); c.translate(cx + R + 10, cy); c.rotate(F.flap);
      var gf = c.createLinearGradient(-30, 0, 8, 0); gf.addColorStop(0, "#fff4b0"); gf.addColorStop(1, "#ff9a1f");
      c.shadowColor = "rgba(255,200,60,.85)"; c.shadowBlur = 10;
      c.beginPath(); c.moveTo(-32, 0); c.lineTo(6, -11); c.lineTo(10, 0); c.lineTo(6, 11); c.closePath(); c.fillStyle = gf; c.fill();
      c.shadowBlur = 0; c.strokeStyle = "#7a4300"; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.arc(4, 0, 3.4, 0, 7); c.fillStyle = "#35e6ff"; c.fill(); c.restore();
    };
    // la ruota è ferma quando lo spicchio idx è sotto il puntatore (a destra, angolo 0)
    function rotFor(idx) { return ((-idx * sl) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); }
    F.land = function (idx, power, done) {
      var cur = ((F.rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), tgt = rotFor(idx);
      var off = ((tgt - cur) + Math.PI * 2) % (Math.PI * 2), v0 = Math.max(F.vel, 6), ms0 = 3300 + power * 2200;
      var k = Math.max(1, Math.round((v0 * ms0 / 1000 / 3.2 - off) / (Math.PI * 2)));
      var delta = off + k * Math.PI * 2, ms = 3.2 * delta / v0 * 1000;
      F.mode = "land"; F.land_ = { start: F.rot, delta: delta, ms: ms, t0: performance.now(), done: done, idx: idx };
    };
    F.step = function (now) {
      var dt = Math.min(0.05, (now - (F.tPrev || now)) / 1000); F.tPrev = now;
      var prev = F.rot;
      if (F.mode === "charge") {
        var shake = Math.sin(now / 38) * 0.012 * F.power;
        F.rot = F.base - F.power * 0.42 + shake;
      } else if (F.mode === "free") { F.rot += F.vel * dt; }
      else if (F.mode === "coast") { F.vel *= Math.exp(-dt * 2.4); F.rot += F.vel * dt; if (F.vel < 0.15) { F.vel = 0; F.mode = "idle"; } }
      else if (F.mode === "land") {
        var L = F.land_, p = Math.min(1, (now - L.t0) / L.ms), e = 1 - Math.pow(1 - p, 3.2);
        F.rot = L.start + L.delta * e; F.vel = 3.2 * L.delta * Math.pow(1 - p, 2.2) / (L.ms / 1000);
        if (p >= 1) { F.mode = "idle"; F.vel = 0; F.win = L.idx; F.flash = 1; F.flashEnd = now + 2400; var d = L.done; L.done = null; d && d(); }
      }
      if (F.mode === "free" || F.mode === "land" || F.mode === "coast") F.ledPh += Math.abs(F.vel) * dt * 2.2;
      // tick del puntatore a ogni piolo che passa
      var kk = Math.floor((F.rot + sl / 2) / sl);
      if (F.lastK !== null && kk !== F.lastK && (F.mode === "free" || F.mode === "land" || F.mode === "coast")) { F.flap = -0.55; snd("tick"); }
      F.lastK = kk;
      F.flap += (0 - F.flap) * Math.min(1, dt * 16);
      if (F.flash > 0 && now > F.flashEnd) F.flash = 0;
    };
    F.loop = function (now) {
      if (!cv.isConnected) return;
      F.step(now);
      var busyAnim = F.mode !== "idle" || F.flash > 0 || Math.abs(F.flap) > 0.01;
      if (busyAnim || now - F.tIdle > 110) { F.tIdle = now; F.draw(now); }
      F.raf = requestAnimationFrame(F.loop);
    };
    F.start = function () { cancelAnimationFrame(F.raf); F.raf = requestAnimationFrame(F.loop); };
    F.draw(performance.now());
    return F;
  }
  var wh = {
    title: "🎡 RUOTA DAILY", bets: false, hold: true, wheel: null, available: true, pw: 0, charging: false,
    build: function () {
      var avail = Math.min(window.innerWidth - 70, (stage.clientHeight || 500) - 130, 330);
      wh.wheel = makeFortune(Math.max(220, avail));
      stage.innerHTML = '<div class="wheelbox" id="whBox"></div><div class="whpow"><i id="whPowI"></i></div><div class="gm-hint" id="whHint">Tieni premuto il bottone per caricare la ruota, poi rilascia.<br>Una giocata al giorno · premi da 25 a 500 $SDG</div>';
      $("whBox").appendChild(wh.wheel.cv); wh.wheel.start(); wh.pw = 0; wh.charging = false;
    },
    onOpen: function () {
      msg("", "");
      A.api("/api/wheel/state").then(function (v) {
        setBalance(v.balance); wh.available = !!v.available; wh.test = !!(v.admin && wh.preset); wh.preset = false;
        if (false && v.admin) {                                  // (sostituito dall'Account admin nelle impostazioni): modalità prova, il server la accetta solo da lui
          var tb = document.createElement("button"); tb.type = "button"; tb.className = "gm-pick wh-test" + (wh.test ? " on" : ""); tb.textContent = "🧪 Modalità prova: " + (wh.test ? "ON (nessun premio pagato)" : "OFF");
          tb.addEventListener("click", function () {
            if (S.busy) return; wh.test = !wh.test; tb.classList.toggle("on", wh.test);
            tb.textContent = "🧪 Modalità prova: " + (wh.test ? "ON (nessun premio pagato)" : "OFF"); A.haptic("light"); rerender();
          });
          stage.appendChild(tb);
        }
        msg(wh.test ? "🧪 Prova: carica la ruota, nessun premio verrà pagato." : wh.available ? "Carica la ruota: il premio di oggi ti aspetta!" : "Hai già riscosso il premio di oggi. Torna domani!", "");
        rerender();
      }).catch(function (e) { msg(errText(e), "lose"); });
    },
    goLabel: function () { return (wh.available || wh.test) ? { text: "TIENI PREMUTO PER CARICARE", busyText: "LA RUOTA GIRA…" } : { text: "GIÀ RISCOSSA OGGI", disabled: true }; },
    pow: function (p) { var i = $("whPowI"); if (i) i.style.width = Math.round(p * 100) + "%"; },
    press: function (down) {
      var F = wh.wheel; if (!F) return;
      if (down) {
        if (!(wh.available || wh.test) || S.busy || wh.charging) return;
        wh.charging = true; wh.t0 = performance.now(); F.mode = "charge"; F.base = F.rot; F.power = 0; F.win = -1; F.flash = 0;
        wh.pw = 0; var n = 0;
        wh.iv = setInterval(function () {
          wh.pw = Math.min(1, (performance.now() - wh.t0) / 1800); F.power = wh.pw; wh.pow(wh.pw);
          elGo.textContent = "CARICO…  " + Math.round(wh.pw * 100) + "%  · rilascia!";
          snd("creak", wh.pw); if ((n++) % 3 === 0) A.haptic("light");
        }, 120);
        elGo.textContent = "CARICO…  0%"; A.haptic("med");
      } else {
        if (!wh.charging) return;
        wh.charging = false; clearInterval(wh.iv);
        wh.release(Math.max(0.12, wh.pw));
      }
    },
    release: function (power) {
      var F = wh.wheel; wh.pow(0);
      setBusy(true); msg("", ""); clearBanner(); A.haptic("ok"); snd("whoosh");
      F.mode = "free"; F.vel = 9 + power * 15;
      var t0 = performance.now();
      A.api("/api/wheel/spin", "POST", wh.test ? { test: true } : {}).then(function (v) {
        var idxs = []; PRIZES.forEach(function (p, i) { if (p === v.prize) idxs.push(i); });
        var idx = idxs.length ? idxs[Math.floor(Math.random() * idxs.length)] : Math.floor(Math.random() * PRIZES.length);
        F.land(idx, power, function () {
          setBalance(v.balance); if (!v.test) wh.available = false;
          var big = v.prize >= 500;
          msg((v.test ? "🧪 PROVA: " : "") + (big ? "💥 SUPER JACKPOT! " : "🎉 ") + "+" + A.fmt(v.prize) + " $SDG" + (v.test ? " (non pagati)" : ""), "win");
          banner(big ? "SUPER JACKPOT!" : "HAI VINTO", "+" + A.fmt(v.prize) + " $SDG" + (v.test ? " · prova" : ""), "win");
          snd(big ? "bigwin" : "win"); A.haptic("ok");
          setBusy(false); A.refreshMe();
        });
      }).catch(function (e) {
        F.mode = "coast"; msg(errText(e), "lose"); setBusy(false);
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
    if (wh.charging) { wh.charging = false; clearInterval(wh.iv); }
    clearTimers(); clearTimeout(rt.back); stage.classList.remove("rt-bet"); S.game = null; root.hidden = true; stage.innerHTML = "";
    A.refreshMe();
  }
  elBack.addEventListener("click", close);
  elGo.addEventListener("click", function () { if (S.game && !S.busy && S.game.go && !S.game.hold) S.game.go(); });
  // ruota daily: si carica tenendo premuto
  elGo.addEventListener("pointerdown", function (e) {
    if (S.game && S.game.hold && !S.busy && !elGo.disabled) { e.preventDefault(); try { elGo.setPointerCapture(e.pointerId); } catch (x) {} S.game.press(true); }
  });
  ["pointerup", "pointercancel"].forEach(function (ev) { elGo.addEventListener(ev, function () { if (S.game && S.game.hold) S.game.press(false); }); });
  elGo.addEventListener("contextmenu", function (e) { if (S.game && S.game.hold) e.preventDefault(); });

  window.ArcadeGames.slot = { open: function () { open(slot); } };
  window.ArcadeGames.roulette = { open: function () { open(roul); } };
  window.ArcadeGames.scratch = { open: function () { open(scr); } };
  window.ArcadeGames.wheel = { open: function (o) { wh.preset = !!(o && o.test); open(wh); } };
})();
