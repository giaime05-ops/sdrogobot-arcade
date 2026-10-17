/* Sdrogo Arcade – Aviator
 * Il SERVER decide tutto (puntata, punto di crash, vincita). Qui si mostra soltanto il volo:
 * il moltiplicatore è calcolato dal tempo con la stessa formula del bot, e ogni 0,5 s ci si risincronizza col server.
 */
(function () {
  "use strict";
  var A = window.Arcade;
  if (!A) return;
  var $ = function (id) { return document.getElementById(id); };

  var root = $("avi"), canvas = $("aviCanvas"), ctx = canvas.getContext("2d");
  var elMult = $("aviMult"), elMsg = $("aviMsg"), elBets = $("aviBets"), elGo = $("aviGo"),
      elNotes = $("aviNotes"), elBal = $("aviBal"), elBack = $("aviBack");

  var S = {
    open: false, phase: "idle",        // idle | starting | flying | cashing | ended
    bets: [10, 25, 50, 100], bet: 10, balance: 0, rate: 0.075,
    gid: null, t0: 0,                  // t0 = istante (performance.now) in cui il volo è iniziato, secondo il client
    res: null,                         // risultato finale
    endAt: 0, fx: [],                  // animazioni di fine volo
    pollTimer: null, raf: 0, busyChat: false, enabled: true
  };

  try { var b = parseInt(localStorage.getItem("avi_bet"), 10); if (b > 0) S.bet = b; } catch (e) {}

  // ---------- utilità ----------
  function now() { return performance.now(); }
  function multAt(t) { return Math.max(1, Math.floor(Math.exp(S.rate * Math.max(0, t)) * 100) / 100); }
  function elapsed() { return (now() - S.t0) / 1000; }
  function fmt2(n) { return n.toFixed(2); }
  function setBalance(n) { S.balance = n; elBal.textContent = A.fmt(n); A.setCoins(n); }
  function msg(text, cls) { elMsg.textContent = text || ""; elMsg.className = "avi-msg" + (cls ? " " + cls : ""); }
  function notes(list) { elNotes.textContent = (list && list.length) ? list.join("  •  ") : ""; }

  // ---------- puntate ----------
  function renderBets() {
    elBets.innerHTML = "";
    S.bets.forEach(function (v) {
      var bt = document.createElement("button");
      bt.type = "button"; bt.className = "avi-bet" + (v === S.bet ? " on" : "");
      bt.textContent = v;
      bt.disabled = !(S.phase === "idle" || S.phase === "ended");
      bt.addEventListener("click", function () {
        S.bet = v; try { localStorage.setItem("avi_bet", String(v)); } catch (e) {}
        A.haptic("light"); renderBets(); renderGo();
      });
      elBets.appendChild(bt);
    });
  }

  function renderGo() {
    var p = S.phase;
    elGo.className = "avi-go";
    elGo.disabled = false;
    if (p === "idle" || p === "ended") {
      elGo.textContent = p === "ended" ? ("RIVOLA  " + S.bet + " $SDG") : ("DECOLLA  " + S.bet + " $SDG");
      if (!S.enabled) { elGo.disabled = true; elGo.textContent = "IN MANUTENZIONE"; }
      else if (S.busyChat) { elGo.disabled = true; elGo.textContent = "VOLO IN CORSO NELLA CHAT"; }
      else if (S.balance < S.bet) { elGo.disabled = true; elGo.textContent = "SALDO INSUFFICIENTE"; }
    } else if (p === "starting") {
      elGo.disabled = true; elGo.textContent = "DECOLLO…";
    } else if (p === "flying") {
      elGo.classList.add("cash");
      elGo.textContent = "INCASSA  " + A.fmt(Math.floor(S.bet * multAt(elapsed()))) + " $SDG";
    } else if (p === "cashing") {
      elGo.disabled = true; elGo.classList.add("cash"); elGo.textContent = "INCASSO…";
    }
    elBack.disabled = (p === "flying" || p === "cashing" || p === "starting");
  }

  // ---------- comunicazione col bot ----------
  function applyView(v) {
    if (!v) return;
    if (typeof v.balance === "number") setBalance(v.balance);
    if (v.bets && v.bets.length) S.bets = v.bets;
    if (typeof v.rate === "number") S.rate = v.rate;
    if (typeof v.enabled === "boolean") S.enabled = v.enabled;
    S.busyChat = !!v.busy_in_chat;
  }

  function startFlightFromView(v, rtt) {
    S.gid = v.gid;
    S.t0 = now() - (v.elapsed || 0) * 1000 - (rtt || 0) / 2;
    S.phase = "flying"; S.res = null; S.fx = [];
    msg("", ""); notes([]);
    elMult.className = "avi-mult";
    renderBets(); renderGo();
    startPolling();
  }

  function startPolling() {
    stopPolling();
    S.pollTimer = setInterval(poll, 500);
  }
  function stopPolling() { if (S.pollTimer) { clearInterval(S.pollTimer); S.pollTimer = null; } }

  function poll() {
    if (S.phase !== "flying" && S.phase !== "cashing") return;
    var t1 = now();
    A.api("/api/aviator/state").then(function (v) {
      applyView(v);
      if (S.phase === "ended") return;
      if (v.active && v.gid === S.gid) {
        // risincronizzazione dolce dell'orologio (niente salti visibili)
        var rtt = now() - t1;
        var target = now() - v.elapsed * 1000 - rtt / 2;
        S.t0 = S.t0 * 0.6 + target * 0.4;
      } else if (!v.active && v.last && v.last.gid === S.gid) {
        finish(v.last);
      } else if (!v.active && S.phase === "flying") {
        // il volo non esiste più sul server (riavvio del bot: puntata rimborsata)
        S.phase = "idle"; stopPolling(); msg("Volo annullato: puntata rimborsata.", ""); renderBets(); renderGo();
        A.refreshMe();
      }
    }).catch(function () { /* rete instabile: si riprova al prossimo giro */ });
  }

  function finish(res) {
    if (S.phase === "ended") return;
    stopPolling();
    S.res = res; S.phase = "ended"; S.endAt = now();
    setBalance(res.balance);
    if (res.result === "cashout") {
      elMult.className = "avi-mult win";
      elMult.textContent = fmt2(res.mult) + "x";
      msg("💰 Incassato: +" + A.fmt(res.net) + " $SDG  (sarebbe volato via a " + fmt2(res.crash) + "x)", "win");
      A.haptic("ok");
      spawnConfetti();
    } else {
      elMult.className = "avi-mult lose";
      elMult.textContent = fmt2(res.crash) + "x";
      msg("💥 L'aereo è volato via a " + fmt2(res.crash) + "x — persi " + A.fmt(res.bet) + " $SDG" + (res.late ? " (clic troppo tardi)" : ""), "lose");
      A.haptic("bad");
      spawnExplosion();
    }
    notes(res.notes);
    renderBets(); renderGo();
    A.refreshMe();
  }

  function onGo() {
    var p = S.phase;
    if (p === "idle" || p === "ended") {
      if (S.balance < S.bet) { A.toast("Saldo insufficiente"); return; }
      S.phase = "starting"; renderBets(); renderGo(); msg("", ""); notes([]);
      elMult.className = "avi-mult"; elMult.textContent = "1.00x";
      var t1 = now();
      A.haptic("med");
      A.api("/api/aviator/start", "POST", { bet: S.bet }).then(function (v) {
        applyView(v);
        startFlightFromView(v, now() - t1);
      }).catch(function (e) {
        S.phase = "idle";
        var st = e && e.body && e.body.state;
        if (st) {                                 // c'è già un volo (es. app riaperta): lo riprendo
          applyView(st);
          if (st.active) { startFlightFromView(st, 0); return; }
        }
        msg(e.network ? "Server non raggiungibile." : (e.message || "Errore."), "lose");
        renderBets(); renderGo();
      });
    } else if (p === "flying") {
      S.phase = "cashing"; renderBets(); renderGo(); A.haptic("med");
      A.api("/api/aviator/cashout", "POST", {}).then(function (j) {
        applyView(j.state);
        finish(j.result);
      }).catch(function (e) {
        if (e && e.network) {                      // risposta persa: chiedo com'è finita
          msg("Connessione lenta… controllo il risultato", "");
          setTimeout(function () { S.phase = "flying"; renderGo(); poll(); startPolling(); }, 700);
        } else {
          S.phase = "ended"; msg(e.message || "Errore.", "lose");
          applyView(e.body && e.body.state);
          renderBets(); renderGo(); A.refreshMe();
        }
      });
    }
  }
  elGo.addEventListener("click", onGo);

  // ---------- disegno ----------
  var W = 0, H = 0, DPR = 1;
  function resize() {
    var r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", function () { if (S.open) resize(); });

  var stars = [];
  for (var i = 0; i < 40; i++) stars.push({ x: Math.random(), y: Math.random() * 0.8, r: Math.random() * 1.2 + 0.3, p: Math.random() * 6 });

  function plane(x, y, ang, scale, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.shadowColor = "rgba(255,70,90,.9)"; ctx.shadowBlur = 14;
    // fusoliera
    ctx.fillStyle = "#f6ead6";
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(-8, -7, 22, -2); ctx.quadraticCurveTo(26, 0, 22, 3); ctx.quadraticCurveTo(-6, 7, -22, 0); ctx.fill();
    ctx.shadowBlur = 0;
    // ala
    ctx.fillStyle = "#ff2e4d";
    ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(-14, 15); ctx.lineTo(-7, 15); ctx.lineTo(7, 2); ctx.closePath(); ctx.fill();
    // coda
    ctx.beginPath(); ctx.moveTo(-20, -1); ctx.lineTo(-26, -11); ctx.lineTo(-19, -10); ctx.lineTo(-12, -2); ctx.closePath(); ctx.fill();
    // cabina
    ctx.fillStyle = "#25e1d3";
    ctx.beginPath(); ctx.ellipse(10, -2.2, 5, 2.4, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function spawnExplosion() {
    S.fx = [];
    for (var i = 0; i < 26; i++) {
      var a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 130;
      S.fx.push({ k: "boom", vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + Math.random() * 3, c: Math.random() < 0.5 ? "#ff2e4d" : (Math.random() < 0.5 ? "#ffb45a" : "#ffe3a0") });
    }
  }
  function spawnConfetti() {
    S.fx = [];
    for (var i = 0; i < 30; i++) {
      S.fx.push({ k: "conf", x: Math.random(), vy: 30 + Math.random() * 90, ph: Math.random() * 6, r: 2 + Math.random() * 2.5,
                  c: ["#e8c36a", "#25e1d3", "#ff2e4d", "#f6ead6"][i % 4] });
    }
  }

  function frame() {
    S.raf = 0;
    if (!S.open) return;
    var t = 0, m = 1, p = S.phase, ended = p === "ended";
    if (p === "flying" || p === "cashing") { t = elapsed(); m = multAt(t); }
    else if (ended && S.res) {
      m = S.res.result === "cashout" ? S.res.mult : S.res.crash;
      t = Math.log(Math.max(1, m)) / S.rate;
    }
    var tt = (now() / 1000);

    // sfondo
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#07060f"); g.addColorStop(0.6, "#160a1f"); g.addColorStop(1, "#2a0e16");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var scrolling = (p === "flying" || p === "cashing");
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var sx = s.x * W;
      if (scrolling) sx = (((sx - t * 9 * (0.4 + s.r)) % W) + W) % W;     // le stelle scorrono: si "sente" il movimento
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tt * 1.5 + s.p);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx, s.y * H, s.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    var padL = 38, padR = 26, padT = 96, padB = 34;
    var gw = W - padL - padR, gh = H - padT - padB;
    // Asse orizzontale: l'aereo avanza fino a ~80% dello schermo (8 s), poi resta lì e a scorrere è il mondo
    // (curva e tacche del tempo vanno a sinistra a velocità costante): il volo non si "pianta" mai.
    var yMax = Math.max(2, m * 1.2);
    var pps = gw * 0.78 / 8;
    var x0 = padL + Math.min(t, 8) * pps;
    function X(tv) { return x0 - (t - tv) * pps; }
    function Y(mv) { return padT + gh - ((mv - 1) / (yMax - 1)) * gh; }

    // griglia
    ctx.lineWidth = 1; ctx.font = "11px Oswald, sans-serif"; ctx.textAlign = "right";
    for (var k = 0; k <= 4; k++) {
      var mv = 1 + (yMax - 1) * k / 4, y = Y(mv);
      ctx.strokeStyle = "rgba(232,195,106,.10)"; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillStyle = "rgba(246,234,214,.45)"; ctx.fillText(mv.toFixed(mv < 10 ? 1 : 0) + "x", padL - 6, y + 4);
    }

    if (t > 0) {
      ctx.strokeStyle = "rgba(232,195,106,.07)";
      for (var kk = Math.max(0, Math.floor(t - 10)); kk <= Math.floor(t); kk++) {
        var gx = X(kk); if (gx < padL || gx > W - padR) continue;
        ctx.beginPath(); ctx.moveTo(gx, padT); ctx.lineTo(gx, padT + gh); ctx.stroke();
      }
    }

    var showCurve = p === "flying" || p === "cashing" || ended;
    if (showCurve && t > 0) {
      var pts = [], n = 60, tS = Math.max(0, t - 10);
      for (var j = 0; j <= n; j++) { var tj = tS + (t - tS) * j / n; pts.push([X(tj), Y(Math.exp(S.rate * tj))]); }
      ctx.save(); ctx.beginPath(); ctx.rect(padL - 2, 0, W, H); ctx.clip();
      var ex = pts[n][0], ey = pts[n][1];
      // area
      var fg = ctx.createLinearGradient(0, padT, 0, padT + gh);
      fg.addColorStop(0, "rgba(255,46,77,.38)"); fg.addColorStop(1, "rgba(255,46,77,0)");
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(pts[0][0], padT + gh);
      pts.forEach(function (q) { ctx.lineTo(q[0], q[1]); });
      ctx.lineTo(ex, padT + gh); ctx.closePath(); ctx.fill();
      // linea
      ctx.shadowColor = "rgba(255,180,90,.9)"; ctx.shadowBlur = 10;
      ctx.strokeStyle = ended && S.res && S.res.result === "crash" ? "#ff2e4d" : "#ffb45a"; ctx.lineWidth = 3; ctx.lineJoin = "round";
      ctx.beginPath(); pts.forEach(function (q, idx) { idx ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      var pa = pts[n - 3 > 0 ? n - 3 : 0];
      var ang = Math.atan2(ey - pa[1], ex - pa[0]);
      var since = ended ? (now() - S.endAt) / 1000 : 0;
      if (!ended) {
        var bob = t > 8 ? Math.sin(tt * 2.6) * 3.5 : 0;     // oscillazione leggera quando è a quota di crociera
        plane(ex, ey + bob, ang * 0.9 + (t > 8 ? Math.sin(tt * 2.1) * 0.05 : 0), 1, 1);
      } else if (S.res && S.res.result === "cashout") {
        // l'aereo prosegue e esce dallo schermo
        plane(ex + since * 260, ey - since * 140 * (1 + since), ang * 0.9, 1, Math.max(0, 1 - since * 1.2));
      } else {
        // esplosione al punto di crash
        S.fx.forEach(function (f) {
          if (f.k !== "boom") return;
          var a = Math.max(0, 1 - since * 1.4);
          ctx.globalAlpha = a; ctx.fillStyle = f.c;
          ctx.beginPath(); ctx.arc(ex + f.vx * since, ey + f.vy * since, f.r * (1 + since), 0, 7); ctx.fill();
        });
        ctx.globalAlpha = 1;
        var fl = Math.max(0, 1 - since * 3);
        if (fl > 0) { ctx.fillStyle = "rgba(255,60,80," + (fl * 0.25).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H); }
      }
      if (ended && S.res && S.res.result === "cashout") {
        S.fx.forEach(function (f) {
          if (f.k !== "conf") return;
          var yy = ((since * f.vy) % (H + 20)) - 10, xx = f.x * W + Math.sin(since * 3 + f.ph) * 16;
          ctx.globalAlpha = Math.max(0, 1 - since / 2.4); ctx.fillStyle = f.c; ctx.fillRect(xx, yy, f.r * 2, f.r * 1.2);
        });
        ctx.globalAlpha = 1;
      }
    } else if (p === "idle" || p === "starting") {
      plane(padL + 30, padT + gh - 14 + Math.sin(tt * 2) * 3, -0.15, 1, 0.9);   // aereo fermo sulla pista
    }

    // testo moltiplicatore
    if (p === "flying" || p === "cashing") elMult.textContent = fmt2(m) + "x";
    if (p === "flying") elGo.textContent = "INCASSA  " + A.fmt(Math.floor(S.bet * m)) + " $SDG";

    S.raf = requestAnimationFrame(frame);
  }
  function kick() { if (!S.raf && S.open) S.raf = requestAnimationFrame(frame); }

  // ---------- apertura / chiusura ----------
  function open() {
    if (!A.inTelegram) { A.toast("Apri da Telegram per giocare"); return; }
    S.open = true; root.hidden = false;
    resize(); renderBets(); renderGo(); kick();
    if (S.phase === "ended" || S.phase === "idle") { S.phase = "idle"; msg("", ""); notes([]); elMult.className = "avi-mult"; elMult.textContent = "1.00x"; }
    A.api("/api/aviator/state").then(function (v) {
      applyView(v);
      if (v.active) { startFlightFromView(v, 0); }
      else {
        if (v.busy_in_chat) msg("Hai un volo in corso nella chat del bot: terminalo lì.", "");
        if (!v.enabled) msg("Aviator è in manutenzione.", "");
        if (S.bet > 0 && S.bets.indexOf(S.bet) < 0) S.bet = S.bets[0];
        renderBets(); renderGo();
      }
    }).catch(function (e) {
      msg(e.network ? "Server non raggiungibile." : (e.message || "Errore."), "lose");
    });
  }
  function close() {
    if (S.phase === "flying" || S.phase === "cashing" || S.phase === "starting") { A.toast("Incassa prima di uscire"); return; }
    S.open = false; root.hidden = true; stopPolling();
    A.refreshMe();
  }
  elBack.addEventListener("click", close);

  // se l'app torna in primo piano durante un volo, ci si risincronizza subito
  document.addEventListener("visibilitychange", function () { if (!document.hidden && S.open) { poll(); kick(); } });

  window.ArcadeGames.aviator = { open: open, close: close };
})();
