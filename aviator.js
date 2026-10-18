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

  var LAG = 140;                       // ms: il moltiplicatore mostrato resta un filo indietro, mai avanti al server
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
    S.t0 = now() - (v.elapsed || 0) * 1000 - (rtt || 0) / 2 + LAG;
    S.phase = "flying"; S.res = null; S.fx = [];
    msg("", ""); notes([]);
    elMult.className = "avi-mult";
    renderBets(); renderGo();
    startPolling();
  }

  function startPolling() {
    stopPolling();
    S.pollTimer = setInterval(poll, 250);
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
        var target = now() - v.elapsed * 1000 - rtt / 2 + LAG;
        // se l'orologio locale è avanti rispetto al server si riallinea subito (il moltiplicatore mostrato non deve mai superare quello reale)
        if (S.t0 < target) S.t0 = target; else S.t0 = S.t0 * 0.7 + target * 0.3;
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

  // aeroplanino di carta: due ali con piega centrale, ombreggiate, con bagliore neon
  function plane(x, y, ang, scale, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.shadowColor = "rgba(255,255,255,.85)"; ctx.shadowBlur = 16;
    // ala superiore (chiara)
    ctx.fillStyle = "#f4f7ff";
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-24, -15); ctx.lineTo(-10, -1); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // ala inferiore (in ombra)
    ctx.fillStyle = "#aeb8d6";
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-10, -1); ctx.lineTo(-22, 13); ctx.closePath(); ctx.fill();
    // piega centrale
    ctx.fillStyle = "#d9def0";
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-10, -1); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,61,176,.9)"; ctx.lineWidth = 1.2; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-24, -15); ctx.lineTo(-10, -1); ctx.lineTo(-22, 13); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-10, -1); ctx.stroke();
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
    g.addColorStop(0, "#06030c"); g.addColorStop(0.55, "#150826"); g.addColorStop(1, "#2b0b3a");
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
    // Asse orizzontale: l'aereo avanza fino a ~80% dello schermo (8 s), poi resta lì e a scorrere è il mondo.
    // Asse verticale (scala logaritmica): l'aereo sale fino a una quota di crociera (~×5) e poi ci resta,
    // oscillando; è il "righello" dei moltiplicatori a scendere (a ×5 l'1x esce, a ×10 escono 2x, 3x, 4x...).
    var mc = (p === "flying" || p === "cashing") ? Math.exp(S.rate * t) : Math.max(1, m);
    var lnm = Math.log(mc);
    var pps = gw * 0.78 / 8;
    var x0 = padL + Math.min(t, 8) * pps;
    function X(tv) { return x0 - (t - tv) * pps; }
    var K = gh * 0.62 / Math.log(5);
    var yBottom = padT + gh, yCruise = padT + gh * 0.36;
    var yPlane = Math.max(yCruise, yBottom - K * lnm);
    function Y(mv) { return yPlane + K * (lnm - Math.log(mv)); }
    var cb = Math.max(0, Math.min(1, (K * lnm - gh * 0.55) / (gh * 0.12)));     // 0 = in salita, 1 = a quota di crociera

    var showCurve = p === "flying" || p === "cashing" || ended;
    if (showCurve && t > 0) {
      var pts = [], n = 60, tS = Math.max(0, t - 10);
      for (var j = 0; j <= n; j++) { var tj = tS + (t - tS) * j / n; pts.push([X(tj), Y(Math.max(1, Math.exp(S.rate * tj)))]); }
      ctx.save(); ctx.beginPath(); ctx.rect(padL - 2, padT - 12, W, gh + padB + 12); ctx.clip();
      var ex = pts[n][0], ey = pts[n][1];
      // scia: nastro che si assottiglia e sfuma verso il passato, rosa -> azzurro, con bagliore
      var tg = ctx.createLinearGradient(pts[0][0], 0, ex, 0);
      tg.addColorStop(0, "rgba(53,230,255,0)"); tg.addColorStop(0.55, "rgba(53,230,255,.55)"); tg.addColorStop(1, ended && S.res && S.res.result === "crash" ? "rgba(255,77,106,.95)" : "rgba(255,110,200,.95)");
      var up = [], dn = [];
      for (var q2 = 0; q2 <= n; q2++) {
        var pq = pts[q2], pn = pts[Math.min(n, q2 + 1)], pp = pts[Math.max(0, q2 - 1)];
        var nx = -(pn[1] - pp[1]), ny = pn[0] - pp[0], nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        var wd = 0.4 + 5.2 * Math.pow(q2 / n, 1.6);
        up.push([pq[0] + nx * wd, pq[1] + ny * wd]); dn.push([pq[0] - nx * wd, pq[1] - ny * wd]);
      }
      ctx.shadowColor = "rgba(255,61,176,.9)"; ctx.shadowBlur = 14; ctx.fillStyle = tg;
      ctx.beginPath(); up.forEach(function (q, idx) { idx ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      for (var q3 = n; q3 >= 0; q3--) ctx.lineTo(dn[q3][0], dn[q3][1]);
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      // scintille lungo la scia
      for (var sp = 0; sp < 10; sp++) {
        var si = Math.floor(n * (0.35 + 0.65 * ((sp * 0.37 + tt * 0.9) % 1))), sq = pts[si];
        ctx.globalAlpha = 0.25 + 0.5 * ((sp * 0.61 + tt) % 1) * (si / n); ctx.fillStyle = sp % 2 ? "#fff" : "#9ff3ff";
        ctx.beginPath(); ctx.arc(sq[0] + Math.sin(tt * 3 + sp) * 4, sq[1] + Math.cos(tt * 2.3 + sp) * 4, 1.4, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      var pa = pts[n - 3 > 0 ? n - 3 : 0];
      var ang = Math.atan2(ey - pa[1], ex - pa[0]);
      var since = ended ? (now() - S.endAt) / 1000 : 0;
      if (!ended) {
        var bob = Math.sin(tt * 2.6) * 5 * cb;               // oscillazione a quota di crociera
        plane(ex, ey + bob, ang * (0.9 - 0.6 * cb) + Math.sin(tt * 2.1) * 0.06 * cb, 1, 1);
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
