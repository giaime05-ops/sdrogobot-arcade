/* Sdrogo Arcade – SDROGO HEIST in 2D (per ora solo account admin di prova).
   Sei livelli a giochini: Centralino (memoria), Corridoio laser (tempismo), Hacking (logica), Serratura (tempismo), Caveau (codice), Fuga (rapporti).
   Il server decide tutto: qui si disegna e si inviano le mosse. */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  var app = document.getElementById("app");
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function snd(n) { try { window.ArcadeAudio && window.ArcadeAudio.sfx(n); } catch (e) {} }
  function errText(e) { return e && e.network ? "Server non raggiungibile." : ((e && e.message) || "Errore."); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function clock(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + pad2(s % 60); }

  var root, bal, stage, hud, tEl, aEl, lEl, back;
  var S = { base: "/api/heist", mini: null, screen: "", info: null, view: null, busy: false, t0: 0, left: 0, tick: 0, timers: [], active: false };
  var COLORS = ["#ff3b4e", "#3b82ff", "#ffd23b", "#2fd36f", "#a855f7", "#ff8a2b"];
  
  function build() {
    if (root) return;
    root = el("section", ""); root.id = "heist"; root.hidden = true; root.setAttribute("aria-label", "Sdrogo Heist");
    var top = el("div", "avi-top");
    back = el("button", "avi-back", "‹ Casino"); back.type = "button"; back.id = "hsBack"; back.addEventListener("click", close);
    top.appendChild(back); top.appendChild(el("div", "avi-title", "SDROGO HEIST"));
    var b = el("div", "avi-bal"); b.appendChild(el("span", "ci")); b.appendChild(document.createTextNode(" ")); bal = el("b", "", "—"); b.appendChild(bal); top.appendChild(b);
    root.appendChild(top);
    hud = el("div", "hs-hud"); hud.hidden = true;
    lEl = el("div", "hs-lvl"); tEl = el("div", "hs-time", "5:00"); aEl = el("div", "hs-alm");
    hud.appendChild(lEl); hud.appendChild(tEl); hud.appendChild(aEl);
    if (A.isAdmin && A.isAdmin()) {                                               // strumenti admin: riprova il livello / salta al prossimo
      var tl = el("div", "hs-tools");
      var rb = el("button", "hs-tool", "↺ Riprova livello"), sb = el("button", "hs-tool", "⏭ Salta livello"); rb.type = sb.type = "button";
      rb.addEventListener("click", function () { act("retry"); }); sb.addEventListener("click", function () { act("skip"); });
      tl.appendChild(rb); tl.appendChild(sb); hud.appendChild(tl);
    }
    root.appendChild(hud);
    stage = el("div", "hs-stage"); root.appendChild(stage);
    var flash = el("div", "hs-flash"); flash.id = "hsFlash"; root.appendChild(flash);
    app.appendChild(root);
  }

  function clearTimers() { S.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); S.timers = []; }
  function later(fn, ms) { var t = setTimeout(fn, ms); S.timers.push(t); return t; }
  function setBal(n) { if (n != null) bal.textContent = A.fmt(n); }
  function flash(kind) { var f = document.getElementById("hsFlash"); f.className = "hs-flash " + kind; void f.offsetWidth; f.className = "hs-flash " + kind + " go"; }
  function say(t, kind) { if (!t) return; var m = el("div", "hs-say " + (kind || ""), t); stage.appendChild(m); later(function () { m.remove(); }, 2200); }

  // ---------- timer globale ----------
  function startClock(left) {
    S.left = left; S.t0 = Date.now(); clearInterval(S.tick);
    S.tick = setInterval(drawClock, 250); drawClock();
  }
  function drawClock() {
    var r = Math.max(0, S.left - (Date.now() - S.t0) / 1000);
    tEl.textContent = clock(Math.ceil(r)); tEl.classList.toggle("low", r <= 30);
    if (r <= 0 && S.active && !S.busy) { S.active = false; clearInterval(S.tick); A.api(S.base + "/state").then(handle).catch(function () {}); }
  }
  function drawHud(v) {
    hud.hidden = false;
    lEl.textContent = (v.mini ? "" : "LIV ") + v.level + "/" + (v.total || 6) + " · " + v.name + (v.round ? " · R" + v.round + "/" + v.rounds : "");
    aEl.innerHTML = "";
    for (var i = 0; i < v.max_alarms; i++) aEl.appendChild(el("i", i < v.alarms ? "on" : ""));
    startClock(v.left);
  }

  // ---------- apertura / chiusura ----------
  function open() {
    if (!A.inTelegram) { A.toast("Apri da Telegram per giocare"); return; }
    build(); root.hidden = false; clearTimers(); S.busy = false; S.base = "/api/heist";
    stage.innerHTML = ""; stage.appendChild(el("div", "pg-empty", "Carico…")); hud.hidden = true;
    Promise.all([A.api("/api/heist/state"), A.api("/api/mini/state").catch(function () { return null; })]).then(function (r) {
      var m = r[0], d = r[1]; S.info = m.info || S.info; S.mini = d && d.info || S.mini;
      if (m.active || m.end) { S.base = "/api/heist"; return handle(m); }
      if (d && (d.active || d.end)) { S.base = "/api/mini"; return handle(d); }
      showSelect();
    }).catch(function (e) { stage.innerHTML = ""; stage.appendChild(el("div", "pg-empty", errText(e))); });
  }
  function close() {
    if (S.busy) return;
    if (!S.active && (S.screen === "intro" || S.screen === "daily")) { showSelect(); return; }
    if (S.active) A.toast("La rapina continua: il timer corre! Rientra da Sdrogo Heist.");
    clearTimers(); clearInterval(S.tick); S.active = false; root.hidden = true; stage.innerHTML = "";
    A.refreshMe();
  }

  // ---------- risposta del server ----------
  function handle(j) {
    if (j.balance != null) setBal(j.balance);
    if (j.info) { S.info = j.info; if (j.info.balance != null && !S.active) setBal(j.info.balance); }
    var ev = j.event || {};
    if (ev.type === "alarm") { flash("bad"); A.haptic("bad"); snd("lose"); }
    else if (ev.type === "ok" || ev.type === "level") { A.haptic("ok"); snd("win"); }
    if (j.end) { S.active = false; clearInterval(S.tick); clearTimers(); return showEnd(j.end); }
    if (j.view) { S.active = true; S.view = j.view; drawHud(j.view); showLevel(j.view, ev); return; }
    S.active = false; hud.hidden = true; if (S.base === "/api/mini") showDaily(); else showIntro();
  }
  function post(path, body) {
    if (S.busy) return Promise.resolve(null);
    S.busy = true;
    return A.api(path, "POST", body || {}).then(function (j) { S.busy = false; return j; }, function (e) { S.busy = false; A.toast(errText(e)); throw e; });
  }
  function act(a, data) {
    var b = data || {}; b.a = a;
    return post(S.base + "/act", b).then(function (j) { if (j) handle(j); }).catch(function () {});
  }

  // ---------- schermata iniziale con il cavo ----------
  function showIntro() {
    S.screen = "intro"; S.base = "/api/heist"; clearTimers(); stage.innerHTML = ""; stage.className = "hs-stage intro"; var I = S.info || {};
    var cover = el("div", "hs-cover"); var img = el("img"); img.src = "assets/vault.jpg"; img.alt = ""; cover.appendChild(img);
    cover.appendChild(el("div", "hs-sweep")); stage.appendChild(cover);
    var card = el("div", "hs-card");
    card.appendChild(el("h2", "", "LA RAPINA AL BANCO CENTRALE"));
    card.appendChild(el("p", "hs-lead", "Hai " + Math.round((I.time || 300) / 60) + " minuti, un solo timer e " + ((I.max_alarms || 3) - 1) + " errori di margine: ogni allarme toglie " + (I.alarm_penalty || 20) + " secondi, al " + (I.max_alarms || 3) + "° la rapina fallisce."));
    var ul = el("ol", "hs-levels");
    (I.levels || []).forEach(function (l) { var li = el("li"); li.appendChild(el("b", "", l[0])); li.appendChild(document.createTextNode(" — " + l[1])); ul.appendChild(li); });
    card.appendChild(ul);
    card.appendChild(el("p", "hs-prize", "Premio: " + (I.share || 20) + "% del Banco (" + (I.share_follia || 50) + "% con la Follia) · +1 Stella ⭐. Se il Banco è quasi vuoto (raro) il premio è fisso: " + (I.prize_fixed || 500) + " $SDG"));
    var go = el("button", "avi-go hs-go", "ENTRA NELLA RAPINA · " + (I.cost || 150) + " $SDG"); go.type = "button";
    if (I.balance != null && I.balance < (I.cost || 150)) { go.disabled = true; go.textContent = "SALDO INSUFFICIENTE"; }
    var sel = null;
    if (A.isAdmin && A.isAdmin()) {                                                // admin: si può cominciare da un livello qualsiasi
      sel = el("select", "hs-sel"); (I.names || []).forEach(function (n, i) { var o = el("option", "", "Parti dal livello " + (i + 1) + (n ? " · " + n : "")); o.value = String(i + 1); sel.appendChild(o); });
      if (S.startLvl) sel.value = String(S.startLvl); card.appendChild(sel);
    }
    go.addEventListener("click", function () {
      A.haptic("med"); snd("creak");
      S.startLvl = sel ? +sel.value : 1;
      post("/api/heist/start", sel ? { lvl: S.startLvl } : {}).then(function (j) { if (j) handle(j); }).catch(function () {});
    });
    card.appendChild(go); stage.appendChild(card);
  }

  // ---------- fine ----------
  function showEnd(e) {
    stage.innerHTML = ""; stage.className = "hs-stage end"; hud.hidden = true;
    var c = el("div", "hs-card big " + (e.result === "win" ? "win" : "lose"));
    if (e.result === "win") {
      c.appendChild(el("h2", "", e.alarms ? "RAPINA RIUSCITA!" : "RAPINA PERFETTA!"));
      var big = el("div", "hs-big", "+0 $SDG"); c.appendChild(big);
      var rest = el("div", "hs-rest"); rest.style.opacity = "0";
      var tiles = el("div", "hs-tiles");
      function tile(ic, lab, val) { var t = el("div", "hs-tile"); t.appendChild(el("span", "ti", ic)); t.appendChild(el("b", "", val)); t.appendChild(el("small", "", lab)); tiles.appendChild(t); }
      tile("⏱️", "tempo", Math.floor(e.elapsed / 60) + ":" + pad2(e.elapsed % 60));
      tile("🚨", "allarmi", e.alarms + "/" + (e.mini ? ((S.mini && S.mini.max_alarms) || 3) : 3));
      if (!e.mini) tile("⭐", "stella", "+1");
      rest.appendChild(tiles);
      if (!e.mini) rest.appendChild(el("p", "hs-prize", "1 Titolo, 1 Persecuzione e 1 STELLA ⭐ aggiunti."));
      if (e.msg) rest.appendChild(el("p", "hs-lead", e.msg));
      c.appendChild(rest);
      var lastCoin = 0, tot = Math.max(0, e.prize | 0), dur = tot > 0 ? 3800 : 600, ct0 = performance.now(), rain = el("div", "hs-rain"); stage.appendChild(rain);
      function tick(now) {                                                       // la cifra sale piano e poi sempre più veloce, con il tremolio che cresce
        if (!big.isConnected) return;
        var f = Math.min(1, (now - ct0) / dur), val = Math.round(tot * Math.pow(f, 2.6));
        big.textContent = "+" + A.fmt(val) + " $SDG"; big.style.transform = "scale(" + (1 + 0.28 * f) + ") translate(" + ((Math.random() - 0.5) * 10 * f) + "px," + ((Math.random() - 0.5) * 8 * f) + "px)";
        if (now - lastCoin > 90 - f * 50) { lastCoin = now; snd("chip"); }
        if (Math.random() < 0.15 + f * 0.6) { var coin = el("i", "hs-coin", "🪙"); coin.style.left = (Math.random() * 96) + "%"; coin.style.animationDuration = (0.9 + Math.random() * 0.9) + "s"; rain.appendChild(coin); setTimeout(function () { coin.remove(); }, 2000); }
        if (f < 1) { requestAnimationFrame(tick); return; }
        big.style.transform = "scale(1.28)"; big.classList.add("pop"); snd("bigwin"); A.haptic("ok"); rest.style.transition = "opacity .6s"; rest.style.opacity = "1"; setTimeout(function () { rain.remove(); }, 1600);
      }
      requestAnimationFrame(tick);
    } else {
      snd("lose"); A.haptic("bad");
      c.appendChild(el("h2", "", "RAPINA FALLITA"));
      c.appendChild(el("p", "hs-lead", e.msg || ""));
      c.appendChild(el("p", "hs-prize", (e.paid === 0 ? "Questa volta non hai speso nulla." : "Hai perso i " + (e.paid != null ? e.paid : (e.mini ? ((S.mini && S.mini.cost) || 100) : ((S.info && S.info.cost) || 150))) + " $SDG d'ingresso.")));
    }
    if (!e.mini && e.result !== "win" && e.level && A.isAdmin && A.isAdmin()) {                // admin: ritenta proprio il livello in cui sei caduto
      var rt = el("button", "avi-go hs-go", "RIPROVA IL LIVELLO " + e.level); rt.type = "button";
      rt.addEventListener("click", function () { post("/api/heist/start", { lvl: e.level }).then(function (j) { if (j) handle(j); }).catch(function () {}); });
      c.appendChild(rt);
    }
    var again = el("button", "avi-go hs-go", "TORNA ALLA RAPINA"); again.type = "button";
    again.addEventListener("click", function () { if (e.mini) { S.base = "/api/mini"; showDaily(); } else open(); });
    c.appendChild(again); stage.appendChild(c); A.refreshMe();
  }

  // ---------- livelli ----------
  function showLevel(v, ev) {
    clearTimers(); stage.className = "hs-stage lv" + v.level; stage.innerHTML = "";
    if (ev && ev.type === "level") { var up = el("div", "hs-up", "LIVELLO " + ev.level + " SUPERATO ✓"); stage.appendChild(up); later(function () { up.remove(); }, 1500); if (ev.msg) say(ev.msg, "ok"); }
    else if (ev && ev.msg) say(ev.msg, ev.type === "alarm" ? "bad" : "ok");
    ({ seq: lv1, laser: lvLaser, mgl: mgLaser, hack: lv3, lock: lvLock, vault: lv4, flight: lv5, circuit: lvCircuit, chase: lvChase, face: mgFace, cable: mgCable, print: mgPrint, freq: mgFreq, voice: mgVoice, logic: mgLogic })[v.kind === "laser" && v.data ? "mgl" : v.kind](v);
  }
  function brief(title, text, label, fn) {
    var c = el("div", "hs-card"); c.appendChild(el("h2", "", title)); c.appendChild(el("p", "hs-lead", text));
    var b = el("button", "avi-go hs-go", label); b.type = "button"; b.addEventListener("click", function () { A.haptic("light"); fn(); }); c.appendChild(b); stage.appendChild(c);
  }
  function dots(n, on) { var d = el("div", "hs-dots"); for (var i = 0; i < n; i++) d.appendChild(el("i", i < on ? "on" : "")); return d; }

  // ----- 1. Centralino: sequenza di colori -----
  function lv1(v) {
    if (v.phase === "brief") {
      brief("CENTRALINO", "Ti mostro una sequenza di colori per pochi secondi, poi sparisce: ripetila nello stesso ordine. 3 round, sempre più lunghi. Un errore = allarme e la sequenza si ripete.", "MOSTRAMI LA SEQUENZA", function () { act("rd"); });
      return;
    }
    stage.appendChild(el("div", "hs-sub", "Round " + (v.r + 1) + "/" + v.rounds));
    var prog = el("div", "hs-seqprog"); stage.appendChild(prog);
    var msg = el("div", "hs-sub big", "Memorizza…"); stage.appendChild(msg);
    var grid = el("div", "hs-pads"); stage.appendChild(grid);
    var pads = COLORS.map(function (c, i) {
      var p = el("button", "hs-pad"); p.type = "button"; p.style.setProperty("--c", c); p.disabled = true;
      p.addEventListener("click", function () {
        if (p.disabled) return; p.classList.add("lit"); setTimeout(function () { p.classList.remove("lit"); }, 160); snd("key"); A.haptic("light");
        act("sq", { i: i });
      });
      grid.appendChild(p); return p;
    });
    function drawProg(n, total) { prog.innerHTML = ""; for (var i = 0; i < total; i++) prog.appendChild(el("i", i < n ? "on" : "")); }
    drawProg(v.pos || 0, v.seq.length);
    if (v.phase === "input") { msg.textContent = "Ripeti la sequenza!"; pads.forEach(function (p) { p.disabled = false; }); return; }
    var t = (v.show_in || 0) * 1000, per = 800;
    v.seq.forEach(function (c, k) {
      later(function () { pads[c].classList.add("lit"); snd("tick"); }, t + k * per);
      later(function () { pads[c].classList.remove("lit"); }, t + k * per + 540);
    });
    later(function () { msg.textContent = "Ripeti la sequenza!"; pads.forEach(function (p) { p.disabled = false; }); drawProg(0, v.seq.length); }, t + v.seq.length * per + 250);
  }

  // ----- 2. Corridoio laser: tieni premuto per avanzare, fermati quando il raggio è acceso -----
  function lvLaser(v, key) {
    if (v.phase === "brief") {
      brief("CORRIDOIO LASER", "Tieni premuto per avanzare lungo il corridoio, rilascia per fermarti. I raggi si accendono e si spengono a ritmi diversi: attraversali solo quando sono spenti. Se tocchi un raggio acceso scatta l'allarme.", "ENTRA NEL CORRIDOIO", function () { act("rd"); });
      return;
    }
    stage.appendChild(el("div", "hs-sub big", "Non toccare i raggi accesi!"));
    var W = 330, H = 360, cv = el("canvas", "hs-lz"); cv.width = W * 2; cv.height = H * 2; cv.style.width = W + "px"; cv.style.height = H + "px"; stage.appendChild(cv);
    var c = cv.getContext("2d"); c.scale(2, 2);
    var pad = el("button", "avi-go hs-go hs-hold", "TIENI PREMUTO PER AVANZARE"); pad.type = "button"; stage.appendChild(pad);
    var t0 = performance.now() + (v.delay || 0) * 1000, ev = [], down = -1, closed = 0, done = false, hitSent = false;
    function X(tms) { return v.speed * (closed + (down >= 0 ? (tms - down) / 1000 : 0)); }
    function on(l, t) { return ((t + l.ph) % l.p) < l.p * l.duty; }
    function press(e) { e.preventDefault(); if (done || down >= 0) return; var tm = performance.now() - t0; if (tm < 0) return; down = tm; pad.classList.add("on"); A.haptic("light"); }
    function release() { if (done || down < 0) return; var tm = performance.now() - t0; ev.push([Math.round(down), Math.round(tm)]); closed += (tm - down) / 1000; down = -1; pad.classList.remove("on"); }
    pad.addEventListener("pointerdown", function (e) { try { pad.setPointerCapture(e.pointerId); } catch (x) {} press(e); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (n) { pad.addEventListener(n, release); });
    function yOf(x) { return H - 28 - (x / 100) * (H - 70); }
    (function loop(now) {
      if (done || root.hidden || S.view !== (key || v)) { done = true; return; }
      var t = (now - t0) / 1000, x = Math.min(100, X(now - t0));
      c.clearRect(0, 0, W, H);
      // corridoio
      var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0b1424"); g.addColorStop(1, "#060a14"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = "rgba(53,230,255,.35)"; c.lineWidth = 2; c.strokeRect(46, 6, W - 92, H - 12);
      c.fillStyle = "rgba(53,230,255,.06)"; for (var k = 0; k < 14; k++) c.fillRect(46, 10 + k * 25 + ((now / 40) % 25), W - 92, 1);
      // traguardo
      c.fillStyle = "#2fd36f"; c.font = "700 12px Rajdhani,sans-serif"; c.textAlign = "center"; c.fillText("USCITA ▲", W / 2, 20);
      v.lasers.forEach(function (l) {
        var y = yOf(l.x), isOn = t >= 0 && on(l, t), warn = t >= 0 && !isOn && ((t + l.ph) % l.p) > l.p - 0.22;
        c.fillStyle = "#555e78"; c.fillRect(36, y - 7, 12, 14); c.fillRect(W - 48, y - 7, 12, 14);
        if (isOn) { c.save(); c.shadowColor = "#ff2a4a"; c.shadowBlur = 16; c.strokeStyle = "#ff4d68"; c.lineWidth = 4; c.beginPath(); c.moveTo(48, y); c.lineTo(W - 48, y); c.stroke(); c.restore(); }
        else if (warn && Math.floor(now / 50) % 2) { c.strokeStyle = "#ffb347"; c.lineWidth = 2; c.beginPath(); c.moveTo(48, y); c.lineTo(W - 48, y); c.stroke(); }
        else { c.strokeStyle = "rgba(255,80,110,.25)"; c.lineWidth = 1; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(48, y); c.lineTo(W - 48, y); c.stroke(); c.setLineDash([]); }
        if (isOn && Math.abs(x - l.x) < v.zone && !hitSent) { hitSent = true; release(); done = true; A.haptic("bad"); act("lz", { hit: true }); }
      });
      // ladro
      var py = yOf(x); c.save(); c.shadowColor = "#35e6ff"; c.shadowBlur = 14; c.fillStyle = "#8ff3ff"; c.beginPath(); c.arc(W / 2, py, 8, 0, 7); c.fill(); c.restore();
      c.fillStyle = "#0b1424"; c.beginPath(); c.arc(W / 2, py, 3, 0, 7); c.fill();
      if (x >= 100 && !done) { var fin = Math.round(now - t0); release(); done = true; act("lz", { ev: ev, fin: fin }); return; }
      requestAnimationFrame(loop);
    })(performance.now());
  }


  // ----- 6. Bypass circuiti: labirinto con croce di tasti (il dito non copre mai lo schermo) -----
  // Attiva i perni 1→2→3 in ordine per riaprire la serratura, poi esci. Le scariche pattugliano un corridoio, a tempo.
  var DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function hzCell(h, t) { var n = h.cells.length, cyc = 2 * (n - 1), m = Math.floor(Math.max(0, t) / h.T) % cyc; return h.cells[m < n ? m : cyc - m]; }
  function lvCircuit(v) {
    if (v.phase === "brief") {
      brief("BYPASS CIRCUITI", "Muovi la sonda con i tasti sotto il labirinto (o scorrendo il dito sul labirinto; tenendo premuto ti muovi in continuazione). Attiva i perni 1 → 2 → 3 IN ORDINE per riaprire la serratura 🔒, poi raggiungi l'uscita. Le scariche ⚡ pattugliano un tratto avanti e indietro: aggirale o aspetta che si allontanino. Se ti toccano, il settore riparte. 3 settori, sempre più grandi.", "ENTRA NEL CIRCUITO", function () { act("rd"); });
      return;
    }
    var n = v.n, op = v.open, pins = v.pins, ex = v.exit, grace = (v.grace || 0.1) * 1000;
    var head = el("div", "hs-sub", "Settore " + (v.r + 1) + "/" + v.rounds + " · Perni 0/" + pins.length); stage.appendChild(head);
    var msgEl = el("div", "hs-sub", "Raggiungi i perni in ordine"); stage.appendChild(msgEl);
    var avail = stage.clientHeight || 520;                                           // il labirinto e i tasti stanno sempre nella stessa schermata
    var Wd = Math.round(Math.max(210, Math.min(340, (stage.clientWidth || 340) - 16, avail - 205))), cs = Wd / n;
    var cv = el("canvas", "hs-lz"); cv.width = Wd * 2; cv.height = Wd * 2; cv.style.width = Wd + "px"; cv.style.height = Wd + "px"; stage.appendChild(cv);
    var c = cv.getContext("2d"); c.scale(2, 2);
    var t0 = performance.now() + (v.delay || 0) * 1000, pos = [v.start[0], v.start[1]], vis = [pos[0], pos[1]], got = 0, mv = [], lastMv = -999, tEnter = 0, done = false;
    function tNow() { return performance.now() - t0; }
    function step(d) {
      var tm = tNow(); if (done || tm < 0 || tm - lastMv < 90) return;
      if (!((op[pos[1]][pos[0]] >> d) & 1)) { A.haptic("light"); cv.classList.add("shake"); later(function () { cv.classList.remove("shake"); }, 160); return; }
      lastMv = tm; mv.push([Math.round(tm), d]); pos = [pos[0] + DIRV[d][0], pos[1] + DIRV[d][1]]; tEnter = tm; snd("key"); A.haptic("light");
      if (got < pins.length && pos[0] === pins[got][0] && pos[1] === pins[got][1]) { got++; snd("ok"); A.haptic("ok"); head.textContent = "Settore " + (v.r + 1) + "/" + v.rounds + " · Perni " + got + "/" + pins.length; msgEl.textContent = got === pins.length ? "Serratura aperta: corri all'uscita!" : "Perno " + got + " attivato: ora il " + (got + 1); }
    }
    var pad = el("div", "hs-dpad"), names = { 0: "▲", 1: "▶", 2: "▼", 3: "◀" };
    var gl = el("div", "hs-dg l"), gr = el("div", "hs-dg r"); pad.appendChild(gl); pad.appendChild(gr);            // a sinistra ◀ ▶ (pollice sinistro), a destra ▲ ▼ (pollice destro)
    [[3, gl], [1, gl], [0, gr], [2, gr]].forEach(function (x) {
      var d = x[0], b = el("button", "hs-dp d" + d, names[d]); b.type = "button"; var rep1 = 0, rep2 = 0;
      function stopRep() { clearTimeout(rep1); clearInterval(rep2); }
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); step(d); stopRep(); rep1 = setTimeout(function () { rep2 = setInterval(function () { step(d); }, 110); }, 260); });   // tenendo premuto si ripete
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (n) { b.addEventListener(n, stopRep); });
      x[1].appendChild(b);
    });
    stage.appendChild(pad);
    var sw = null;                                                                    // anche uno scorrimento sul labirinto muove la sonda
    cv.addEventListener("pointerdown", function (e) { sw = [e.clientX, e.clientY]; });
    cv.addEventListener("pointerup", function (e) { if (!sw) return; var dx = e.clientX - sw[0], dy = e.clientY - sw[1]; sw = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return; step(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); });
    function key(e) { var m = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (m !== undefined) { e.preventDefault(); step(m); } }
    document.addEventListener("keydown", key);
    function C(i) { return (i + 0.5) * cs; }
    (function loop(now) {
      if (done || root.hidden || S.view !== v) { done = true; document.removeEventListener("keydown", key); return; }
      var t = (now - t0) / 1000;
      vis[0] += (pos[0] - vis[0]) * 0.35; vis[1] += (pos[1] - vis[1]) * 0.35;
      c.clearRect(0, 0, Wd, Wd); var g = c.createLinearGradient(0, 0, Wd, Wd); g.addColorStop(0, "#0a1020"); g.addColorStop(1, "#150a24"); c.fillStyle = g; c.fillRect(0, 0, Wd, Wd);
      c.strokeStyle = "rgba(53,230,255,.07)"; c.lineWidth = 1;
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) c.strokeRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
      c.lineCap = "round"; c.lineWidth = Math.max(2, cs * 0.07); c.strokeStyle = "#ff3b5e"; c.shadowColor = "#ff3b5e"; c.shadowBlur = 5;
      c.beginPath(); c.rect(1, 1, Wd - 2, Wd - 2); c.stroke();
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
        var o = op[y][x]; c.beginPath();
        if (!(o & 2) && x < n - 1) { c.moveTo((x + 1) * cs, y * cs); c.lineTo((x + 1) * cs, (y + 1) * cs); }
        if (!(o & 4) && y < n - 1) { c.moveTo(x * cs, (y + 1) * cs); c.lineTo((x + 1) * cs, (y + 1) * cs); }
        c.stroke();
      }
      c.shadowBlur = 0;
      c.fillStyle = "#35e6ff"; c.beginPath(); c.arc(C(v.start[0]), C(v.start[1]), cs * 0.2, 0, 7); c.fill();
      var open = got === pins.length; c.font = "700 " + Math.round(cs * 0.55) + "px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = open ? "rgba(47,211,111,.28)" : "rgba(255,255,255,.07)"; c.fillRect(ex[0] * cs + 3, ex[1] * cs + 3, cs - 6, cs - 6); c.fillStyle = "#fff"; c.fillText(open ? "🔓" : "🔒", C(ex[0]), C(ex[1]) + 1);
      pins.forEach(function (p, i) {
        var on = i < got, nxt = i === got, pulse = nxt ? 0.07 * Math.sin(now / 140) : 0;
        c.save(); if (nxt) { c.shadowColor = "#ffd23b"; c.shadowBlur = 12; }
        c.fillStyle = on ? "#2fd36f" : nxt ? "#ffd23b" : "#445"; c.beginPath(); c.arc(C(p[0]), C(p[1]), cs * (0.3 + pulse), 0, 7); c.fill(); c.restore();
        c.fillStyle = on ? "#04200f" : "#1a1400"; c.font = "700 " + Math.round(cs * 0.4) + "px Rajdhani,sans-serif"; c.fillText(on ? "✓" : String(i + 1), C(p[0]), C(p[1]) + 1);
      });
      var hit = false;
      v.hz.forEach(function (h) {
        var T = h.T, k = Math.floor(Math.max(0, t) / T), cell = hzCell(h, t), nx = hzCell(h, (k + 1) * T), fr = Math.max(0, ((t - k * T) / T - 0.65) / 0.35);        // si sposta nell'ultimo 35% del passo: arriva quando conta
        var hx = cell[0] + (nx[0] - cell[0]) * fr, hy = cell[1] + (nx[1] - cell[1]) * fr;
        c.save(); c.shadowColor = "#ffe82a"; c.shadowBlur = 14; c.fillStyle = "#ffd23b"; c.beginPath(); c.arc(C(hx), C(hy), cs * 0.34, 0, 7); c.fill(); c.restore();
        c.fillStyle = "#3a2a00"; c.font = "700 " + Math.round(cs * 0.42) + "px sans-serif"; c.fillText("⚡", C(hx), C(hy) + 1);
        if (t >= 0 && cell[0] === pos[0] && cell[1] === pos[1] && (now - t0) - tEnter > grace) hit = true;
      });
      c.save(); c.shadowColor = "#8ff3ff"; c.shadowBlur = 14; c.fillStyle = "#fff"; c.beginPath(); c.arc(C(vis[0]), C(vis[1]), cs * 0.22, 0, 7); c.fill(); c.restore();
      if (t < 0) { c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(0, 0, Wd, Wd); c.fillStyle = "#fff"; c.font = "700 30px Bungee,sans-serif"; c.fillText(String(Math.ceil(-t)), Wd / 2, Wd / 2); }
      if (hit && !done) { done = true; document.removeEventListener("keydown", key); A.haptic("bad"); act("ci", { hit: true }); return; }
      if (got === pins.length && pos[0] === ex[0] && pos[1] === ex[1] && !done) { done = true; document.removeEventListener("keydown", key); act("ci", { mv: mv, fin: Math.round(now - t0) }); return; }
      requestAnimationFrame(loop);
    })(performance.now());
  }

  // ----- 7. Fuga: corsa a distanza, parte lenta e accelera. Ostacoli che bocciano, ostacoli che rallentano, bivi con ambientazioni -----
  var ENVC = {
    highway: { bg: "#090d18", road: "#151b2b", edge: "#35e6ff", mark: "rgba(255,255,255,.35)" },
    tunnel: { bg: "#020203", road: "#0d0e13", edge: "#ffb347", mark: "rgba(255,200,80,.5)" },
    bridge: { bg: "#0a1436", road: "#1b2238", edge: "#c8d0e0", mark: "rgba(255,255,255,.35)" },
    dirt: { bg: "#1d2a12", road: "#5b3e23", edge: "#8a6a3a", mark: null },
    city: { bg: "#0b0b16", road: "#1b1b27", edge: "#ff6fc8", mark: "rgba(255,255,255,.4)" },
    coast: { bg: "#d8c58b", road: "#454a58", edge: "#fff3c4", mark: "rgba(255,255,255,.5)" }
  };
  function hsh(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function lvChase(v) {
    if (v.phase === "brief") {
      brief("FUGA", "Sei alla guida del furgone: parte piano e accelera da solo, tu cambi corsia (tocca a sinistra o a destra, o scorri il dito). ❌ Posti di blocco, auto, muri, rocce, palme, relitti e il faro dell'elicottero ti fermano. 🛢️ Olio, buche, fango e coni ti fanno solo rallentare. Ai bivi trovi tre strade, ognuna col suo cartello: due hanno un simbolo di pericolo (🚁 🚓 🚧 🚨), quella senza simbolo è libera. Cambia ambientazione a seconda della strada scelta. Al traguardo il bot guida per te: scappa dalla polizia!", "VIA!", function () { act("rd"); });
      return;
    }
    stage.appendChild(el("div", "hs-sub", "Cambia corsia: tocca a sinistra / destra"));
    var avail = stage.clientHeight || 520;
    var Wd = Math.min(340, Math.max(260, (stage.clientWidth || 340) - 16)), Hd = Math.round(Math.max(300, Math.min(430, avail - 50)));
    var cv = el("canvas", "hs-lz"); cv.width = Wd * 2; cv.height = Hd * 2; cv.style.width = Wd + "px"; cv.style.height = Hd + "px"; cv.style.touchAction = "none"; stage.appendChild(cv);
    var c = cv.getContext("2d"); c.scale(2, 2);
    var obs = v.obs, forks = v.forks, segs = v.segs, D = v.D, H = 2.0, DT = 0.02, SC = 5.2, PY = Hd - 84, lw = (Wd - 40) / 3;
    var t0 = performance.now() + (v.delay || 0) * 1000, last = 0, acc = 0, n = 0, p = 0, sv = v.v0, lane = 1, vx = Wd / 2, ev = [], sl = [], slowed = {}, fi = 0, lastEv = -999;
    var done = false, fin = false, finT = 0, shake = 0, toast = "", toastT = 0, reply = null, sx0 = 0, hitFlag = false;
    function envAt(d) { for (var i = 0; i < segs.length; i++) if (d >= segs[i][0] && d < segs[i][1]) return segs[i][2]; return "highway"; }
    function go(d) { if (done || fin || n < 0) return; var nl = Math.max(0, Math.min(2, lane + d)); if (nl === lane) return; if (n * 20 - lastEv < 60) return; lane = nl; lastEv = n * 20; ev.push([n * 20, lane]); A.haptic("light"); }
    cv.addEventListener("pointerdown", function (e) { e.preventDefault(); sx0 = e.clientX; });
    cv.addEventListener("pointerup", function (e) { var dx = e.clientX - sx0; if (Math.abs(dx) > 26) go(dx > 0 ? 1 : -1); else { var r = cv.getBoundingClientRect(); go(e.clientX - r.left < r.width / 2 ? -1 : 1); } });
    function key(e) { if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } else if (e.key === "ArrowRight") { e.preventDefault(); go(1); } }
    document.addEventListener("keydown", key);
    function LX(l) { return 20 + lw * l + lw / 2; }
    function fopt(f) { return f.opts || [f.L, { name: "✖ chiusa", emo: "" }, f.R]; }       // compatibile col vecchio formato (due sole strade)
    var endKind = Math.random() < 0.5 ? "jump" : "garage";
    function say2(s, k) { toast = s; toastT = 1.2; if (k) { shake = 0.25; A.haptic("bad"); snd("lose"); } }
    var SLOWK = { oil: "🛢️ OLIO! Rallenti", pit: "🕳️ BUCA! Rallenti", mud: "🟤 FANGO! Rallenti", cone: "🔶 CONI! Rallenti" };
    // ---- ostacoli disegnati (2D con un po' di profondità) ----
    var CARC = ["#6ea8ff", "#ff6b6b", "#ffd23b", "#4ee08a", "#c58bff", "#f2f2f2", "#ff9a3c"];
    function wob(x, y, rx, ry, n, sd, amp) { var pts = []; for (var i = 0; i < n; i++) { var a = i / n * 6.2832, r = 1 - amp + amp * 2 * hsh(sd * 13 + i * 3.7); pts.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]); } return pts; }
    function poly(pts) { c.beginPath(); pts.forEach(function (q, i) { if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.closePath(); }
    function smooth(pts) { var n = pts.length; c.beginPath(); for (var i = 0; i < n; i++) { var a = pts[i], b = pts[(i + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; if (i === 0) c.moveTo(mx, my); else c.quadraticCurveTo(a[0], a[1], mx, my); } var a0 = pts[0], b0 = pts[1]; c.quadraticCurveTo(a0[0], a0[1], (a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2); c.closePath(); }
    function drawWall(x, y) {
      var w = lw - 6, h = 28, x0 = x - w / 2, y0 = y - 16; c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(x0 + 3, y0 + h, w, 5);
      c.fillStyle = "#3b1d16"; c.fillRect(x0, y0, w, h);
      for (var r = 0; r < 3; r++) { var off = r % 2 ? 0 : -12, by = y0 + 1 + r * 9; for (var bx = x0 + off; bx < x0 + w; bx += 25) { var l = Math.max(bx, x0), rr = Math.min(bx + 24, x0 + w); if (rr - l < 3) continue; c.fillStyle = (r + Math.floor(bx)) % 2 ? "#a6482f" : "#b9553a"; c.fillRect(l, by, rr - l, 8); c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(l, by, rr - l, 2); } }
      c.strokeStyle = "#2a130e"; c.lineWidth = 2; c.strokeRect(x0, y0, w, h);
    }
    function drawRock(x, y, sd) {
      c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x + 4, y + 12, 26, 8, 0, 0, 7); c.fill();
      var pts = wob(x, y - 2, 25, 17, 9, sd, 0.28); poly(pts); var g = c.createLinearGradient(x - 20, y - 20, x + 20, y + 16); g.addColorStop(0, "#b3b6c4"); g.addColorStop(1, "#4d4f5e"); c.fillStyle = g; c.fill(); c.strokeStyle = "#2f313c"; c.lineWidth = 2; c.stroke();
      c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(pts[1][0], pts[1][1]); c.lineTo(x + 2, y - 2); c.lineTo(pts[5][0], pts[5][1]); c.moveTo(x + 2, y - 2); c.lineTo(pts[7][0], pts[7][1]); c.stroke();
      c.fillStyle = "rgba(255,255,255,.28)"; c.beginPath(); c.moveTo(pts[0][0] - 6, pts[0][1] - 5); c.lineTo(pts[1][0], pts[1][1]); c.lineTo(x, y - 6); c.closePath(); c.fill();
    }
    function drawPalm(x, y, sd) {
      c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(x + 6, y + 8, 26, 14, 0, 0, 7); c.fill();
      for (var f = 0; f < 8; f++) { var a = f * 0.785 + sd; c.save(); c.translate(x, y - 2); c.rotate(a); var g = c.createLinearGradient(0, 0, 26, 0); g.addColorStop(0, "#1f6e35"); g.addColorStop(1, "#58c46a"); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(13, -7, 27, 0); c.quadraticCurveTo(13, 7, 0, 0); c.fill(); c.restore(); }
      c.fillStyle = "#7a5222"; c.beginPath(); c.arc(x, y - 2, 4.5, 0, 7); c.fill(); c.fillStyle = "#d9a24a"; c.beginPath(); c.arc(x - 1, y - 3, 2, 0, 7); c.fill();
    }
    function drawPit(x, y, sd, en) {
      var dirt = en === "dirt", pts = wob(x, y - 4, 25, 12, 11, sd, 0.32);
      c.fillStyle = dirt ? "#2a190b" : "#0a0a0f"; poly(pts); c.fill(); c.strokeStyle = dirt ? "#8b6a3c" : "#6a6a78"; c.lineWidth = 2.5; c.stroke();
      c.strokeStyle = dirt ? "rgba(120,86,48,.8)" : "rgba(130,130,145,.7)"; c.lineWidth = 1.2;
      for (var k = 0; k < 5; k++) { var q = pts[(k * 2 + 1) % pts.length], dx = q[0] - x, dy = q[1] - (y - 4); c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] + dx * 0.35 + (hsh(sd + k) - 0.5) * 8, q[1] + dy * 0.45); c.stroke(); }
      c.fillStyle = dirt ? "rgba(255,220,160,.12)" : "rgba(255,255,255,.07)"; c.beginPath(); c.ellipse(x - 6, y - 8, 10, 3, 0, 0, 7); c.fill();
    }
    function drawOil(x, y, sd, now) {
      var pts = wob(x, y - 4, 30, 14, 9, sd, 0.22); smooth(pts); var g = c.createRadialGradient(x - 8, y - 9, 2, x, y - 4, 34); g.addColorStop(0, "#1c1530"); g.addColorStop(1, "#050508"); c.fillStyle = g; c.fill();
      c.save(); smooth(pts); c.clip(); var ph = now / 700 + sd;
      var cols = ["rgba(120,80,255,.55)", "rgba(40,225,205,.5)", "rgba(255,200,80,.42)", "rgba(255,90,170,.4)"];
      for (var k = 0; k < 4; k++) { c.strokeStyle = cols[k]; c.lineWidth = 3; c.beginPath(); c.ellipse(x - 5 + Math.sin(ph + k) * 3, y - 6 + k * 1.4, 20 - k * 4, 7 - k * 1.2, -0.2, 3.5, 5.6); c.stroke(); }
      c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(x - 12, y - 10, 6, 2, -0.3, 0, 7); c.fill(); c.restore();
      c.strokeStyle = "rgba(160,140,255,.5)"; c.lineWidth = 1.5; smooth(pts); c.stroke();
    }
    function drawMud(x, y, sd) {
      var pts = wob(x, y - 6, 32, 17, 10, sd, 0.25); smooth(pts); c.fillStyle = "#3a2410"; c.fill(); c.strokeStyle = "#6b4620"; c.lineWidth = 2; c.stroke();
      c.fillStyle = "rgba(160,110,60,.45)"; for (var k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x - 16 + k * 8, y - 8 + (hsh(sd + k) - 0.5) * 12, 4, 2, 0, 0, 7); c.fill(); }
      c.fillStyle = "#3a2410"; for (var m = 0; m < 4; m++) { c.beginPath(); c.arc(x + (hsh(sd * 3 + m) - 0.5) * 70, y + 8 + hsh(sd * 5 + m) * 8, 2 + hsh(sd + m * 9) * 2, 0, 7); c.fill(); }
    }
    function drawCar(x, y, sd) {
      var col = CARC[Math.floor(hsh(sd) * CARC.length)], vt = Math.floor(hsh(sd + 5) * 3), w = vt === 2 ? 32 : 30, h = vt === 2 ? 52 : 44;
      c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(x - w / 2 + 3, y - h / 2 + 4, w, h);
      c.fillStyle = col; c.fillRect(x - w / 2, y - h / 2, w, h); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(x - w / 2, y - h / 2, 4, h);
      c.fillStyle = "#0b1b3a"; c.fillRect(x - w / 2 + 4, y - h / 2 + 8, w - 8, 11); c.fillRect(x - w / 2 + 4, y + h / 2 - 17, w - 8, 8);
      if (vt === 1) { c.fillStyle = "#111"; c.fillRect(x - 6, y - 5, 12, 2); c.fillRect(x - 6, y - 1, 12, 2); }
      if (vt === 0) { c.fillStyle = "#ffd23b"; c.fillRect(x - 5, y - 4, 10, 5); }
      c.fillStyle = "#ffe9a6"; c.fillRect(x - w / 2 + 2, y + h / 2 - 3, 6, 3); c.fillRect(x + w / 2 - 8, y + h / 2 - 3, 6, 3);
    }
    function drawVan(x, y, sc, al) {
      c.save(); c.globalAlpha = al == null ? 1 : al; c.translate(x, y); c.scale(sc, sc);
      c.shadowColor = "#ffd23b"; c.shadowBlur = 12; c.fillStyle = "#ffd23b"; c.fillRect(-14, -24, 28, 48); c.shadowBlur = 0;
      c.fillStyle = "#1a1a24"; c.fillRect(-10, -14, 20, 12); c.fillStyle = "#ff3b5e"; c.fillRect(-12, 20, 6, 4); c.fillRect(6, 20, 6, 4); c.restore();
    }
    function simStep() {
      sv = Math.min(v.vmax, sv + v.acc * DT); p += sv * DT; n++;
      for (var i = 0; i < obs.length; i++) {
        var o = obs[i]; if (o[0] > p + 5) break;
        if (p + H > o[0] && p - H < o[0] + o[3] && ((o[1] >> lane) & 1)) {
          if (SLOWK[o[2]]) { if (!slowed[i]) { slowed[i] = 1; sl.push([n * 20, i]); sv = Math.max(v.v0, sv * v.slow); say2(SLOWK[o[2]], true); } }
          else { hitFlag = true; return; }
        }
      }
      while (fi < forks.length && p >= forks[fi].d) { if (lane !== forks[fi].safe) { hitFlag = true; return; } say2("➜ " + fopt(forks[fi])[forks[fi].safe].name, false); fi++; }
    }
    function crash() { done = true; document.removeEventListener("keydown", key); A.haptic("bad"); act("ch", { hit: true }); }
    function finish() {
      fin = true; finT = performance.now();
      post(S.base + "/act", { a: "ch", ev: ev, sl: sl, fin: n * 20 }).then(function (j) { reply = j || { _none: 1 }; }).catch(function () { reply = { _none: 1 }; });
    }
    function Y(d) { return PY - (d - p) * SC; }
    function drawWorld(now) {
      var E, y, k, w, yy;
      for (y = -16; y < Hd + 16; y += 16) {                                           // sfondo a fasce: ogni tratto ha la sua ambientazione
        var dd = p + (PY - (y + 8)) / SC; E = ENVC[envAt(dd)];
        c.fillStyle = E.bg; c.fillRect(-10, y, Wd + 20, 17); c.fillStyle = E.road; c.fillRect(20, y, Wd - 40, 17);
        c.fillStyle = E.edge; c.fillRect(19, y, 3, 17); c.fillRect(Wd - 22, y, 3, 17);
      }
      var k0 = Math.floor((p - 20) / 30), k1 = Math.ceil((p + PY / SC + 6) / 30);
      for (k = k0; k <= k1; k++) {                                                    // decorazioni ancorate alla strada (scorrono con essa)
        w = k * 30; yy = Y(w); if (yy < -30 || yy > Hd + 30) continue; var en = envAt(w), r1 = hsh(k), r2 = hsh(k + 77);
        if (en === "tunnel") { c.fillStyle = "rgba(255,190,80,.55)"; c.fillRect(24, yy - 2, Wd - 48, 4); c.fillStyle = "rgba(255,190,80,.15)"; c.fillRect(24, yy - 14, Wd - 48, 28); c.fillStyle = "#1a1b22"; c.fillRect(0, yy - 15, 18, 30); c.fillRect(Wd - 18, yy - 15, 18, 30); }
        else if (en === "bridge") { c.fillStyle = "#9aa4bd"; c.fillRect(10, yy - 3, 8, 6); c.fillRect(Wd - 18, yy - 3, 8, 6); c.fillStyle = "rgba(255,240,150," + (0.2 + r1 * 0.5) + ")"; c.fillRect(2 + r2 * 4, yy + 10, 3, 3); c.fillRect(Wd - 6 - r1 * 4, yy - 10, 3, 3); }
        else if (en === "dirt") { c.fillStyle = "#2c5a22"; c.beginPath(); c.arc(8 + r1 * 4, yy, 7 + r2 * 4, 0, 7); c.fill(); c.beginPath(); c.arc(Wd - 8 - r2 * 4, yy + 12, 6 + r1 * 4, 0, 7); c.fill(); c.fillStyle = "rgba(0,0,0,.18)"; for (var q = 0; q < 6; q++) c.fillRect(24 + hsh(k * 9 + q) * (Wd - 56), yy + (hsh(k * 5 + q) - 0.5) * 28, 4, 3); }
        else if (en === "city") { var bh = 24 + r1 * 24; c.fillStyle = "#14142a"; c.fillRect(0, yy - bh / 2, 18, bh); c.fillRect(Wd - 18, yy - bh / 2 + 4, 18, bh); c.fillStyle = "rgba(255,220,120,.8)"; for (var j = 0; j < 3; j++) { if (hsh(k * 3 + j) > 0.4) c.fillRect(4, yy - bh / 2 + 4 + j * 8, 4, 3); if (hsh(k * 7 + j) > 0.4) c.fillRect(Wd - 12, yy - bh / 2 + 8 + j * 8, 4, 3); } }
        else if (en === "coast") { c.fillStyle = "#1c8fc0"; c.fillRect(Wd - 15, yy - 15, 15, 30); c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(Wd - 15 + 2 * r1, yy + 4, 9, 2); c.fillStyle = "#efe0a6"; c.fillRect(Wd - 17, yy - 15, 3, 30);
          if (r2 > 0.45) { var px = 6 + r1 * 6, py = yy + (r2 - 0.5) * 20; c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.arc(px + 2, py + 3, 9, 0, 7); c.fill(); c.fillStyle = "#6b4a22"; c.beginPath(); c.arc(px, py, 2, 0, 7); c.fill(); c.fillStyle = "#2f9a4a"; for (var fr = 0; fr < 6; fr++) { c.beginPath(); c.ellipse(px + Math.cos(fr * 1.05) * 5, py + Math.sin(fr * 1.05) * 5, 6, 2, fr * 1.05, 0, 7); c.fill(); } } }
      }
      for (var j2 = Math.floor((p - 10) / 8.5); j2 <= Math.ceil((p + PY / SC + 6) / 8.5); j2++) {   // segnaletica: tratteggio o tracce di ruote nello sterrato
        w = j2 * 8.5; yy = Y(w); if (yy < -14 || yy > Hd + 14) continue; var e2 = envAt(w), M = ENVC[e2].mark;
        for (var l = 1; l < 3; l++) {
          if (M) { c.fillStyle = M; c.fillRect(20 + lw * l - 1.5, yy - 11, 3, 22); }
          else { c.fillStyle = "rgba(0,0,0,.22)"; c.fillRect(20 + lw * l - 6, yy - 12, 2, 24); c.fillRect(20 + lw * l + 4, yy - 12, 2, 24); }
        }
      }
    }
    // ---- finale: il bot guida, il furgone semina la polizia (salto sul fiume o rifugio) e il faro dell'elicottero lo perde ----
    function drawCop(cx, cy, now) { if (cy > Hd + 30 || cy < -40) return; c.fillStyle = "#e9ecf5"; c.fillRect(cx - 12, cy - 20, 24, 42); c.fillStyle = Math.floor(now / 120) % 2 ? "#ff3b5e" : "#3b82ff"; c.fillRect(cx - 10, cy - 6, 9, 5); c.fillStyle = Math.floor(now / 120) % 2 ? "#3b82ff" : "#ff3b5e"; c.fillRect(cx + 1, cy - 6, 9, 5); }
    var SP = 120, rampY = Hd * 0.42, gapA = Hd * 0.17, gapB = Hd * 0.31, doorY = Hd * 0.24, tR = 0, tDoor = 0;
    function endScene(now, ft) {
      var X = vx, t1 = (PY - (endKind === "jump" ? rampY : doorY + 16)) / SP, y, sc = 1, al = 1;
      if (endKind === "jump") {
        c.fillStyle = "#0a2a46"; c.fillRect(20, gapA, Wd - 40, gapB - gapA);                                  // fiume
        c.fillStyle = "rgba(120,200,255,.35)"; for (var wv = 0; wv < 7; wv++) c.fillRect(24 + ((wv * 47 + now / 30) % (Wd - 60)), gapA + 6 + (wv % 3) * 10, 18, 2);
        c.fillStyle = "#6b7184"; c.fillRect(20, gapA - 3, Wd - 40, 4); c.fillRect(20, gapB - 1, Wd - 40, 4);
        c.fillStyle = "#3b3f50"; c.beginPath(); c.moveTo(X - 34, rampY + 26); c.lineTo(X + 34, rampY + 26); c.lineTo(X + 24, rampY); c.lineTo(X - 24, rampY); c.closePath(); c.fill();
        c.fillStyle = "#ffb347"; for (var rs = 0; rs < 3; rs++) c.fillRect(X - 20 + rs * 14, rampY + 6 + rs * 5, 8, 3);
        var u = (ft - t1) / 1.1;
        if (ft < t1) y = PY - SP * ft;
        else if (u < 1) { y = rampY - (rampY - (gapA - 36)) * u; sc = 1 + 0.55 * Math.sin(Math.PI * u); c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(X + 8, y + 26 + 18 * Math.sin(Math.PI * u), 14 * sc, 9, 0, 0, 7); c.fill(); if (ft - t1 < 0.05) { snd("whoosh"); A.haptic("med"); } }
        else y = gapA - 36 - SP * (ft - t1 - 1.1);
        drawVan(X, y, sc, 1);
        var stopY = rampY + 62;                                                                         // la polizia frena sul bordo
        for (var cp = 0; cp < 2; cp++) { var cy = Math.max(stopY + cp * 24, PY + 64 + cp * 22 - 104 * ft); drawCop(X + (cp ? 28 : -28), cy, now); if (cy <= stopY + cp * 24 + 1) { c.strokeStyle = "rgba(0,0,0,.4)"; c.lineWidth = 3; c.beginPath(); c.moveTo(X + (cp ? 22 : -34), cy + 20); c.lineTo(X + (cp ? 22 : -34), cy + 52); c.stroke(); } }
      } else {
        var bx = X - 52, bw = 104;                                                                      // capannone con portone
        c.fillStyle = "#17172a"; c.fillRect(bx - 22, doorY - 34, bw + 44, 54); c.fillStyle = "#23233d"; c.fillRect(bx - 22, doorY - 34, bw + 44, 8);
        c.fillStyle = "#050509"; c.fillRect(bx + 10, doorY - 20, bw - 20, 36);
        var close = Math.max(0, Math.min(1, (ft - t1 - 0.3) / 0.7));
        c.fillStyle = "#4a4f66"; c.fillRect(bx + 10, doorY - 20, bw - 20, 36 * close); c.strokeStyle = "#2b2f40"; c.lineWidth = 1; for (var sl2 = 1; sl2 < 4; sl2++) { c.beginPath(); c.moveTo(bx + 10, doorY - 20 + sl2 * 9 * 1); c.lineTo(bx + bw - 10, doorY - 20 + sl2 * 9); c.stroke(); }
        y = PY - SP * ft; if (ft > t1) { var k = Math.min(1, (ft - t1) / 0.55); y = PY - SP * t1 - 18 * k; sc = 1 - 0.4 * k; al = 1 - k; if (ft - t1 < 0.05) snd("creak"); }
        drawVan(X, y, sc, al);
        for (var cp2 = 0; cp2 < 2; cp2++) drawCop(X + (cp2 ? 50 : -50), PY + 70 + cp2 * 24 - 112 * ft, now);        // passano oltre senza vederlo
      }
    }
    function endOver(now, ft) {
      var tx = endKind === "jump" ? vx : vx, ty = endKind === "jump" ? Hd * 0.3 : doorY, a = 0;
      if (ft > 1.1) {
        var f = Math.min(1, (ft - 1.1) / 0.8); a = 0.34 * f;
        var sx = tx + Math.sin(ft * 2.1) * 70 * f, sy = ty + Math.sin(ft * 1.5) * 26 * f;
        if (ft > 3.6) { var w = ft - 3.6; sx += w * 130; sy -= w * 70; a *= Math.max(0, 1 - w / 1.6); }                // il faro si allontana
        if (a > 0.01) {
          c.fillStyle = "rgba(255,245,170," + a + ")"; c.beginPath(); c.moveTo(sx - 5, 0); c.lineTo(sx + 5, 0); c.lineTo(sx + 44, sy); c.lineTo(sx - 44, sy); c.fill();
          c.beginPath(); c.ellipse(sx, sy, 46, 18, 0, 0, 7); c.fill(); c.strokeStyle = "rgba(255,245,170," + Math.min(1, a * 2) + ")"; c.lineWidth = 1.5; c.stroke();
          c.font = "18px sans-serif"; c.textAlign = "center"; c.globalAlpha = Math.min(1, a * 3); c.fillText("🚁", sx + 30, 22); c.globalAlpha = 1;
        }
      }
      if (ft > 2.6) { var ban = Math.min(1, (ft - 2.6) / 0.6); c.globalAlpha = ban; c.textAlign = "center"; c.fillStyle = "#2fd36f"; c.font = "700 26px Bungee,sans-serif"; c.fillText("SEMINATI!", Wd / 2, Hd * 0.86); c.font = "700 13px Rajdhani,sans-serif"; c.fillStyle = "#fff"; c.fillText(ft < 4.2 ? "La polizia ha perso le tue tracce…" : "L'elicottero non vi trova più", Wd / 2, Hd * 0.86 + 22); c.globalAlpha = 1; }
    }
    (function loop(now) {
      if (done || root.hidden || S.view !== v) { done = true; document.removeEventListener("keydown", key); return; }
      var dtf = Math.min(0.1, Math.max(0, (now - (last || now)) / 1000)); last = now;
      if (now >= t0 && !fin) { acc += dtf; while (acc >= DT && !hitFlag && !fin) { acc -= DT; simStep(); if (p >= D) { finish(); break; } } }
      if (hitFlag && !done) { crash(); return; }
      vx += (LX(lane) - vx) * 0.3; if (shake > 0) shake -= dtf; if (toastT > 0) toastT -= dtf;
      var ft = fin ? (now - finT) / 1000 : 0, curE = envAt(p);
      c.save(); if (shake > 0) c.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      drawWorld(now);
      var spd = Math.min(1, (sv - v.v0) / (v.vmax - v.v0));
      if (spd > 0.4) { c.strokeStyle = "rgba(255,255,255," + (0.05 + spd * 0.1) + ")"; c.lineWidth = 1; for (var q = 0; q < 8; q++) { var yy = ((q * 67 + p * SC * 1.7) % Hd); c.beginPath(); c.moveTo(6 + (q % 2) * 4, yy); c.lineTo(6 + (q % 2) * 4, yy + 30); c.moveTo(Wd - 6 - (q % 2) * 4, yy); c.lineTo(Wd - 6 - (q % 2) * 4, yy + 30); c.stroke(); } }
      c.textAlign = "center";
      forks.forEach(function (f) {
        var y = Y(f.d), dist = f.d - p;
        if (dist < 190 && dist > -8) {                                                  // portale con un cartello per corsia: i simboli segnano le due strade controllate
          var sy = Math.max(40, Math.min(132, Y(f.d - 80))), os = fopt(f);
          c.fillStyle = "#5a6275"; c.fillRect(20, sy - 34, 4, 40); c.fillRect(Wd - 24, sy - 34, 4, 40);
          for (var ol = 0; ol < 3; ol++) {
            var gx = 20 + lw * ol + 3;
            c.fillStyle = "#0b1f33"; c.fillRect(gx, sy - 32, lw - 6, 50); c.strokeStyle = "#35e6ff"; c.lineWidth = 2; c.strokeRect(gx, sy - 32, lw - 6, 50);
            c.fillStyle = "#fff"; c.font = "700 11px Rajdhani,sans-serif"; c.fillText(os[ol].name, LX(ol), sy - 16);
            c.fillStyle = "#35e6ff"; c.font = "700 14px sans-serif"; c.fillText("▼", LX(ol), sy - 2);
            c.font = "22px sans-serif"; c.fillStyle = "#fff"; if (os[ol].emo) c.fillText(os[ol].emo, LX(ol), sy + 14);
          }
        }
        if (y > -20 && y < Hd + 20) { c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(20, y - 2, Wd - 40, 4); c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(20 + lw - 1.5, y - 40, 3, 40); c.fillRect(20 + 2 * lw - 1.5, y - 40, 3, 40); }
      });
      obs.forEach(function (o) {
        var y = Y(o[0]), yb = Y(o[0] + o[3]); if (y < -40 || yb > Hd + 40) return;
        for (var l = 0; l < 3; l++) {
          if (!((o[1] >> l) & 1)) continue; var x = LX(l), ln = o[2], hh = Math.max(14, y - yb);
          var sd = o[0] * 0.37 + l, en2 = envAt(o[0]);
          if (ln === "block") { c.fillStyle = "#e0183a"; c.fillRect(x - 28, y - 12, 56, 20); c.fillStyle = "#fff"; for (var j = 0; j < 4; j++) c.fillRect(x - 28 + j * 14 + 3, y - 12, 7, 20); c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(x - 28, y + 8, 56, 3); }
          else if (ln === "car") drawCar(x, y, sd);
          else if (ln === "wreck") { c.fillStyle = "#3a2d2d"; c.fillRect(x - 16, y - 22, 32, 44); c.fillStyle = "#151010"; c.fillRect(x - 11, y - 12, 22, 12); c.fillStyle = "#ff8a2b"; c.fillRect(x - 6, y + 6, 12, 6); c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.arc(x + 4, y - 26, 8, 0, 7); c.fill(); }
          else if (ln === "rock") drawRock(x, y, sd);
          else if (ln === "palm") drawPalm(x, y, sd);
          else if (ln === "wall") drawWall(x, y);
          else if (ln === "light") { var gl = 0.25 + 0.12 * Math.sin(now / 120); c.fillStyle = "rgba(255,240,150," + gl + ")"; c.fillRect(x - lw / 2 + 3, yb, lw - 6, hh); c.strokeStyle = "rgba(255,240,150,.9)"; c.lineWidth = 2; c.strokeRect(x - lw / 2 + 3, yb, lw - 6, hh); c.font = "16px sans-serif"; c.fillText("🚁", x, yb + 14); }
          else if (ln === "oil") drawOil(x, y, sd, now);
          else if (ln === "mud") drawMud(x, y, sd);
          else if (ln === "cone") { for (var cq = -1; cq <= 1; cq++) { var kx = x + cq * 16; c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(kx + 2, y + 9, 9, 3, 0, 0, 7); c.fill(); c.fillStyle = "#ff8a2b"; c.beginPath(); c.moveTo(kx - 7, y + 8); c.lineTo(kx, y - 12); c.lineTo(kx + 7, y + 8); c.fill(); c.fillStyle = "#fff"; c.fillRect(kx - 4, y - 2, 8, 3); } }
          else drawPit(x, y, sd, en2);
        }
      });
      var finish_y = Y(D); if (finish_y > -20 && finish_y < Hd) { for (var s2 = 0; s2 < 14; s2++) { c.fillStyle = s2 % 2 ? "#fff" : "#111"; c.fillRect(20 + s2 * ((Wd - 40) / 14), finish_y - 6, (Wd - 40) / 14, 12); } }
      var driveY = PY;
      if (fin) endScene(now, ft);
      else {
        var copGap = 64 - spd * 22;
        for (var cp = 0; cp < 2; cp++) drawCop(vx + (cp ? 26 : -26), driveY + copGap + cp * 22, now);
        drawVan(vx, driveY, 1, 1);
      }
      if (curE === "tunnel") { var gr = c.createRadialGradient(vx, driveY, 30, Wd / 2, Hd / 2, Hd * 0.75); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.65)"); c.fillStyle = gr; c.fillRect(0, 0, Wd, Hd); }
      if (curE === "dirt" && spd > 0.1) { c.fillStyle = "rgba(150,110,60,.18)"; for (var du = 0; du < 5; du++) { c.beginPath(); c.arc(vx + (Math.random() - 0.5) * 30, driveY + 36 + du * 8, 5 + du * 2, 0, 7); c.fill(); } }
      if (fin) endOver(now, ft);
      c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(20, 6, Wd - 40, 6); c.fillStyle = "#2fd36f"; c.fillRect(20, 6, (Wd - 40) * Math.max(0, Math.min(1, p / D)), 6);
      c.fillStyle = "#fff"; c.font = "700 14px Rajdhani,sans-serif"; c.textAlign = "left"; c.fillText(Math.round(sv * 3.6) + " km/h", 24, 28); c.textAlign = "center";
      if (toastT > 0) { c.fillStyle = "rgba(0,0,0,.55)"; c.fillRect(Wd / 2 - 90, Hd - 28 - 0, 180, 24); c.fillStyle = "#ffd23b"; c.font = "700 14px Rajdhani,sans-serif"; c.fillText(toast, Wd / 2, Hd - 11); }
      c.restore();
      if (now < t0) { c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(0, 0, Wd, Hd); c.fillStyle = "#fff"; c.font = "700 30px Bungee,sans-serif"; c.textAlign = "center"; c.fillText(String(Math.ceil((t0 - now) / 1000)), Wd / 2, Hd / 2); }
      if (fin && ft >= 6.0 && reply) { done = true; document.removeEventListener("keydown", key); if (!reply._none) handle(reply); return; }
      requestAnimationFrame(loop);
    })(performance.now());
  }

  // ---------- selezione: due casseforti (grande = Sdrogo Heist, piccola = Daily Heist) ----------
  function showSelect() {
    clearTimers(); S.screen = "select"; S.active = false; S.base = "/api/heist"; hud.hidden = true; clearInterval(S.tick);
    stage.innerHTML = ""; stage.className = "hs-stage sel";
    stage.appendChild(el("h2", "hs-seltitle", "SCEGLI LA RAPINA"));
    var wrap = el("div", "hs-selwrap"), img = el("img"); img.src = "assets/vault2.jpg"; img.alt = ""; wrap.appendChild(img);
    function spot(cls, label, ox, oy, fn) {
      var b = el("button", "hs-spot " + cls); b.type = "button"; b.setAttribute("aria-label", label);
      b.addEventListener("click", function () {
        if (wrap.classList.contains("zoom")) return; A.haptic("med"); snd("creak");
        wrap.style.transformOrigin = ox + "% " + oy + "%"; wrap.classList.add("zoom");
        setTimeout(function () { fn(); stage.classList.add("hs-fadein"); }, 560);
      });
      wrap.appendChild(b);
    }
    spot("big", "Sdrogo Heist", 62, 50, showIntro);
    spot("small", "Daily Heist", 16, 62, function () { S.base = "/api/mini"; showDaily(); });
    stage.appendChild(wrap);
    stage.appendChild(el("p", "hs-lead hs-selhint", "Tocca una cassaforte: la GRANDE è la rapina principale, la PICCOLA è il Daily Heist (mini rapine veloci)."));
  }

  // ---------- Daily Heist: mini rapine ----------
  function showDaily() {
    clearTimers(); S.screen = "daily"; S.active = false; S.base = "/api/mini"; hud.hidden = true; clearInterval(S.tick);
    stage.innerHTML = ""; stage.className = "hs-stage daily"; stage.appendChild(el("div", "pg-empty", "Carico…"));
    A.api("/api/mini/state").then(function (j) {
      if (j.active || j.end) return handle(j);
      S.mini = j.info; drawDaily();
    }).catch(function (e) { stage.innerHTML = ""; stage.appendChild(el("div", "pg-empty", errText(e))); });
  }
  function drawDaily() {
    var I = S.mini; stage.innerHTML = ""; stage.className = "hs-stage daily hs-fadein";
    var card = el("div", "hs-card");
    card.appendChild(el("h2", "", "DAILY HEIST"));
    var cs = I.costs || [I.cost];
    var ul0 = el("ul", "hs-rules2");
    [ "2 mini rapine al giorno, uguali per tutti, con 3 giochini ciascuna e 3 round di difficoltà crescente",
      I.time + " secondi in tutto · al " + I.max_alarms + "° allarme la rapina fallisce",
      "Ingresso: " + (cs.length > 1 ? "la 1ª volta " + (cs[0] ? cs[0] + " $SDG" : "GRATIS") + ", la 2ª " + cs[1] + " $SDG, la 3ª " + cs[cs.length - 1] + " $SDG" : cs[0] + " $SDG") + " · premio fisso " + I.prize + " $SDG",
      "Fino a " + I.plays + " tentativi al giorno per ciascuna, con " + Math.round(I.gap / 3600) + " ore di pausa tra uno e l'altro",
      "Lo schema cambia a mezzanotte (ora italiana)" ].forEach(function (t) { ul0.appendChild(el("li", "", t)); });
    card.appendChild(ul0);
    stage.appendChild(card);
    var cd = [];
    I.minis.forEach(function (m) {
      var c = el("div", "hs-card hs-mini"); c.appendChild(el("h2", "", m.title.toUpperCase()));
      var ul = el("ol", "hs-levels"); m.games.forEach(function (n) { var li = el("li"); li.appendChild(el("b", "", n)); ul.appendChild(li); }); c.appendChild(ul);
      c.appendChild(el("p", "hs-prize", "Oggi: " + m.used + "/" + m.max + " tentativi"));
      var go = el("button", "avi-go hs-go", ""); go.type = "button"; c.appendChild(go);
      var t0 = Date.now(), w0 = m.wait;
      function upd() {
        var w = w0 < 0 ? -1 : Math.max(0, w0 - Math.floor((Date.now() - t0) / 1000));
        if (w < 0) { go.disabled = true; go.textContent = "TENTATIVI FINITI: TORNA DOMANI"; }
        else if (w > 0) { go.disabled = true; go.textContent = "DISPONIBILE TRA " + Math.floor(w / 3600) + ":" + pad2(Math.floor(w / 60) % 60) + ":" + pad2(w % 60); }
        else if (I.balance != null && I.balance < (m.cost != null ? m.cost : I.cost)) { go.disabled = true; go.textContent = "SALDO INSUFFICIENTE"; }
        else { go.disabled = false; var mc = m.cost != null ? m.cost : I.cost; go.textContent = mc ? "ENTRA · " + mc + " $SDG" : "ENTRA · GRATIS"; }
      }
      upd(); S.timers.push(setInterval(upd, 1000));
      go.addEventListener("click", function () { A.haptic("med"); snd("creak"); S.base = "/api/mini"; post("/api/mini/start", { which: m.id }).then(function (j) { if (j) handle(j); }).catch(function () {}); });
      stage.appendChild(c);
    });
    if (A.isAdmin && A.isAdmin()) {
      var rs = el("button", "hs-tool", "↺ Azzera attese e tentativi (admin)"); rs.type = "button"; rs.style.alignSelf = "center";
      rs.addEventListener("click", function () { A.api("/api/mini/reset", "POST", {}).then(function (j) { S.mini = j.info; drawDaily(); }).catch(function (e) { A.toast(errText(e)); }); });
      stage.appendChild(rs);
    }
  }

  // ---------- giochini del Daily Heist ----------
  function tbar(secs, fn) {                                  // barra del tempo del giochino; allo scadere chiama fn
    var b = el("div", "hs-tbar"), i = el("i"); b.appendChild(i); stage.appendChild(b); var t0 = performance.now(), v = S.view, fired = false;
    (function loop(n) { if (fired || root.hidden || S.view !== v) return; var f = (n - t0) / 1000 / secs; i.style.width = Math.max(0, 100 - f * 100) + "%"; if (f >= 1) { fired = true; fn(); return; } requestAnimationFrame(loop); })(t0);
    return function () { fired = true; };
  }
  var HAT = ["#e0183a", "#3b82ff", "#ffd23b", "#2fd36f", "#a855f7", "#ff8a2b"], SKIN = ["#f2c9a0", "#d9a07a", "#a8693f", "#6b4429"];
  function mgFace(v) {
    var d = v.data;
    stage.appendChild(el("div", "hs-sub", "Memorizza le guardie, poi rispondi:"));
    var q = el("div", "hs-sub big", d.q); stage.appendChild(q);
    var grid = el("div", "hs-guards"); stage.appendChild(grid); var cards = [];
    d.guards.forEach(function (g, i) {
      var b = el("button", "hs-guard"); b.type = "button"; b.disabled = true;
      var face = el("i", "gf"); face.style.background = SKIN[g.skin]; var hat = el("i", "gh"); hat.style.background = HAT[g.hat];
      var bd = el("i", "gb"); bd.style.background = HAT[g.badge]; b.appendChild(face); b.appendChild(hat); if (g.glasses) b.appendChild(el("i", "gg", "🕶")); b.appendChild(bd);
      b.appendChild(el("span", "gn", String(i + 1)));
      b.addEventListener("click", function () { if (b.disabled) return; A.haptic("light"); snd("click"); stopT && stopT(); act("an", { i: i }); });
      grid.appendChild(b); cards.push(b);
    });
    var stopT = null, memo = tbar(d.show, function () {});                          // barra della memorizzazione (la domanda si legge subito)
    var memoBar = stage.querySelector(".hs-tbar:last-of-type");
    later(function () {
      if (memoBar) memoBar.remove();
      cards.forEach(function (b) { b.classList.add("hid"); b.disabled = false; });
      stage.firstChild.textContent = "Ora scegli la guardia!"; stopT = tbar(d.limit, function () { act("to"); });
    }, d.show * 1000);
  }
  var CAB = { Rosso: "#e0183a", Blu: "#3b82ff", Giallo: "#ffd23b", Verde: "#2fd36f", Viola: "#a855f7", Arancio: "#ff8a2b" };
  function mgCable(v) {
    var d = v.data;
    stage.appendChild(el("div", "hs-sub big", d.q));
    var box = el("div", "hs-cables"); stage.appendChild(box); var stop = tbar(d.limit, function () { act("to"); });
    d.cables.forEach(function (n, i) {
      var b = el("button", "hs-cable"); b.type = "button"; b.style.setProperty("--c", CAB[n]); b.appendChild(el("span", "cn", n)); b.appendChild(el("span", "cp", String(i + 1)));
      b.addEventListener("click", function () { A.haptic("med"); snd("click"); stop(); act("an", { i: i }); });
      box.appendChild(b);
    });
  }
  function mgPrint(v) {
    var d = v.data;
    stage.appendChild(el("div", "hs-sub big", "Trova l'impronta IDENTICA a quella in alto"));
    function draw(m, sz) {
      var cv = el("canvas", "hs-fp"); cv.width = sz * 2; cv.height = sz * 2; cv.style.width = sz + "px"; cv.style.height = sz + "px"; var c = cv.getContext("2d"); c.scale(2, 2);
      c.fillStyle = "#0b1424"; c.fillRect(0, 0, sz, sz); var u = sz / 5;
      for (var i = 0; i < 5; i++) for (var j = 0; j < 5; j++) {
        c.strokeStyle = m[i][j] ? "#8ff3ff" : "#ff6fc8"; c.lineWidth = Math.max(2, sz / 28);
        c.beginPath(); if (m[i][j]) { c.arc(j * u + u / 2, i * u + u / 2, u * 0.34, 0.15, Math.PI * 1.1); } else { c.moveTo(j * u + u * 0.2, i * u + u * 0.8); c.lineTo(j * u + u * 0.8, i * u + u * 0.2); } c.stroke();
      }
      return cv;
    }
    var top = el("div", "hs-fptop"); top.appendChild(draw(d.target, 140)); stage.appendChild(top);
    var row = el("div", "hs-fprow"); stage.appendChild(row); var stop = tbar(d.limit, function () { act("to"); });
    d.cands.forEach(function (m, i) {
      var b = el("button", "hs-fpc"); b.type = "button"; b.appendChild(draw(m, d.cands.length > 3 ? 72 : 92));
      b.addEventListener("click", function () { A.haptic("med"); snd("click"); stop(); act("an", { i: i }); }); row.appendChild(b);
    });
  }
  function mgLogic(v) {
    var d = v.data;
    stage.appendChild(el("div", "hs-sub big", d.q));
    var row = el("div", "hs-series"); d.seq.forEach(function (x) { row.appendChild(el("b", "", String(x))); }); row.appendChild(el("b", "q", "?")); stage.appendChild(row);
    var ops = el("div", "hs-ops"); stage.appendChild(ops); var stop = tbar(d.limit, function () { act("to"); });
    d.options.forEach(function (o, i) {
      var b = el("button", "hs-op", String(o)); b.type = "button";
      b.addEventListener("click", function () { A.haptic("med"); snd("click"); stop(); act("an", { i: i }); }); ops.appendChild(b);
    });
  }
  function mgLaser(v) {
    var d = v.data, vv = { phase: "play", lasers: d.lasers, speed: d.speed, zone: d.zone, delay: d.delay };
    lvLaser(vv, v);
  }
  function mgFreq(v) {
    var d = v.data;
    stage.appendChild(el("div", "hs-sub big", "Sovrapponi l'onda verde alla rossa e tienila così " + d.need + " secondi"));
    var Wd = 330, Hd = 170, cv = el("canvas", "hs-lz"); cv.width = Wd * 2; cv.height = Hd * 2; cv.style.width = Wd + "px"; cv.style.height = Hd + "px"; stage.appendChild(cv);
    var c = cv.getContext("2d"); c.scale(2, 2);
    var meter = el("div", "hs-tbar hs-meter"), mi = el("i"); meter.appendChild(mi); stage.appendChild(meter);
    var sl = el("input", "hs-slider"); sl.type = "range"; sl.min = "1"; sl.max = "5.2"; sl.step = "0.01"; sl.value = "1.2"; stage.appendChild(sl);
    var t0 = performance.now(), smp = [], lastS = 0, run = 0, lastT = t0, done = false, stop = tbar(d.limit, function () { done = true; act("to"); });
    function tgt(t) { return d.f0 + d.amp * Math.sin(d.w * t + d.ph); }
    (function loop(now) {
      if (done || root.hidden || S.view !== v) return;
      var t = (now - t0) / 1000, ft = tgt(t), f = +sl.value, ok = Math.abs(f - ft) <= d.tol;
      run = ok ? run + (now - lastT) / 1000 : 0; lastT = now; mi.style.width = Math.min(100, run / d.need * 100) + "%"; mi.style.background = ok ? "#2fd36f" : "#ff6fc8";
      if (now - lastS >= 50) { lastS = now; smp.push([Math.round(now - t0), +f.toFixed(3)]); }
      c.clearRect(0, 0, Wd, Hd); c.fillStyle = "#0b1424"; c.fillRect(0, 0, Wd, Hd);
      function wave(freq, col, w) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (var x = 0; x <= Wd; x += 3) { var u = x / Wd, y = Hd / 2 + Math.sin(2 * Math.PI * freq * u * 1.4 - t * 5) * (Hd * 0.34); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
      c.save(); c.shadowColor = "#ff2a4a"; c.shadowBlur = 8; wave(ft, "#ff4d68", 4); c.restore(); c.save(); c.shadowColor = "#2fd36f"; c.shadowBlur = 8; wave(f, "#58ffa8", 3); c.restore();
      if (run >= d.need) { done = true; stop(); act("fq", { s: smp, fin: Math.round(now - t0) }); return; }
      requestAnimationFrame(loop);
    })(t0);
  }
  function mgVoice(v) {
    var d = v.data;
    stage.appendChild(el("div", "hs-sub big", "TAP quando l'indicatore passa sui nodi " + d.nodes.map(function (x, k) { return k + 1; }).join(" → ") + ", in ordine"));
    var bar = el("div", "hs-vbar"); stage.appendChild(bar); var ind = el("i", "vi"); bar.appendChild(ind);
    d.nodes.forEach(function (n, k) { var z = el("i", "vz", String(k + 1)); z.style.left = ((n - d.w / 2) * 100) + "%"; z.style.width = (d.w * 100) + "%"; bar.appendChild(z); });
    var dots = el("div", "hs-dots"); for (var q = 0; q < d.nodes.length; q++) dots.appendChild(el("i", "")); stage.appendChild(dots);
    var btn = el("button", "avi-go hs-go hs-hold", "TAP!"); btn.type = "button"; stage.appendChild(btn);
    var t0 = performance.now(), taps = [], done = false, stop = tbar(d.limit, function () { done = true; act("to"); });
    (function loop(now) { if (done || root.hidden || S.view !== v) return; ind.style.left = (tri(d.phase0 + d.speed * (now - t0) / 1000) * 100) + "%"; requestAnimationFrame(loop); })(t0);
    btn.addEventListener("pointerdown", function (e) {
      e.preventDefault(); if (done) return; var tm = Math.round(performance.now() - t0); A.haptic("med"); snd("key");
      var k = taps.length, p = tri(d.phase0 + d.speed * tm / 1000), good = Math.abs(p - d.nodes[k]) <= d.w / 2 + 0.01; taps.push(tm);
      dots.children[k].className = good ? "on" : "bad";
      if (!good || taps.length >= d.nodes.length) { done = true; stop(); act("vt", { taps: taps }); }
    });
  }

  // ----- 4. Serratura: tieni premuto e rilascia quando l'indicatore è nel verde (zona sempre più stretta) -----
  function tri(u) { var f = u - Math.floor(u); return 1 - Math.abs(2 * f - 1); }
  function lvLock(v) {
    stage.appendChild(el("div", "hs-sub", "Perno " + (v.r + 1) + "/" + v.rounds));
    stage.appendChild(dots(v.rounds, v.r));
    stage.appendChild(el("div", "hs-sub big", "Rilascia nel verde!"));
    var bar = el("div", "hs-lock"), zone = el("i", "z"), ind = el("i", "p"); bar.appendChild(zone); bar.appendChild(ind); stage.appendChild(bar);
    zone.style.left = ((v.c - v.w / 2) * 100) + "%"; zone.style.width = (v.w * 100) + "%";
    function setPos(p) { ind.style.left = (p * 100) + "%"; }
    setPos(tri(v.phase0));
    var btn = el("button", "avi-go hs-go hs-hold", "TIENI PREMUTO"); btn.type = "button"; stage.appendChild(btn);
    var down = -1, raf = 0, sent = false;
    function loop(now) { if (down < 0 || S.view !== v) return; setPos(tri(v.phase0 + v.speed * (now - down) / 1000)); raf = requestAnimationFrame(loop); }
    btn.addEventListener("pointerdown", function (e) { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (x) {} if (sent) return; down = performance.now(); btn.classList.add("on"); A.haptic("light"); snd("scratch"); raf = requestAnimationFrame(loop); });
    function up() { if (down < 0 || sent) return; sent = true; var d = Math.round(performance.now() - down); down = -1; cancelAnimationFrame(raf); btn.classList.remove("on"); A.haptic("med"); act("lk", { d: d }); }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (n) { btn.addEventListener(n, up); });
  }

  // ----- 3. Hacking: numeri e mosse contate -----
  var SYM = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  function lv3(v) {
    stage.appendChild(el("div", "hs-sub", "Terminale"));
    var term = el("div", "hs-term");
    term.appendChild(el("div", "hs-tl", "OBIETTIVO")); term.appendChild(el("div", "hs-target", String(v.target)));
    term.appendChild(el("div", "hs-tl", "VALORE ATTUALE")); term.appendChild(el("div", "hs-val", String(v.val)));
    term.appendChild(el("div", "hs-tl", "Parti da " + v.start + " · si risolve in " + v.min_moves + " mosse"));
    term.appendChild(el("div", "hs-tl", "Mosse rimaste (" + v.left_moves + "/5)"));
    term.appendChild(dots(5, v.left_moves)); stage.appendChild(term);
    var ops = el("div", "hs-ops"); stage.appendChild(ops);
    v.ops.forEach(function (o, i) {
      var b = el("button", "hs-op", SYM[o[0]] + " " + o[1]); b.type = "button";
      b.addEventListener("click", function () { A.haptic("light"); snd("key"); act("hk", { i: i }); });
      ops.appendChild(b);
    });
    var r = el("button", "avi-back hs-reset", "🔄 RESET"); r.type = "button"; r.addEventListener("click", function () { act("hr"); }); stage.appendChild(r);
    stage.insertBefore(el("div", "hs-note", "÷ solo se il valore è divisibile · niente valori negativi"), r);
  }

  // ----- 4. Caveau: codice a 4 cifre (tutte diverse) -----
  var guess = [];
  function lv4(v) {
    guess = [];
    stage.appendChild(el("div", "hs-sub", "Caveau · tentativo " + Math.min(v.max_tries, v.tries + 1) + "/" + v.max_tries));
    var hint = el("div", "hs-hint"); hint.appendChild(document.createTextNode("Cifre già note: "));
    var known = {}; (v.hints || []).forEach(function (h) { known[h[0]] = h[1]; });
    for (var i = 0; i < 4; i++) hint.appendChild(el("span", known[i] != null ? "on" : "", known[i] != null ? String(known[i]) : "▫"));
    stage.appendChild(hint);
    var hist = el("div", "hs-hist"); stage.appendChild(hist);
    v.hist.forEach(function (h) {
      var r = el("div", "hs-hrow"); r.appendChild(el("b", "", h[0].join(" "))); r.appendChild(el("span", "g", "🟢 " + h[1])); r.appendChild(el("span", "y", "🟡 " + h[2])); hist.appendChild(r);
    });
    hist.scrollTop = hist.scrollHeight; later(function () { hist.scrollTop = hist.scrollHeight; }, 50);
    var slots = el("div", "hs-slots"); stage.appendChild(slots);
    function draw() { slots.innerHTML = ""; for (var k = 0; k < 4; k++) slots.appendChild(el("i", guess[k] != null ? "on" : "", guess[k] != null ? String(guess[k]) : "")); }
    draw();
    var pad = el("div", "hs-keys"); stage.appendChild(pad);
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function (d) {
      var b = el("button", "hs-key", String(d)); b.type = "button";
      b.addEventListener("click", function () { if (guess.length >= 4 || guess.indexOf(d) >= 0) { A.haptic("bad"); return; } guess.push(d); snd("digit"); A.haptic("light"); draw(); });
      pad.appendChild(b);
    });
    var del = el("button", "hs-key alt", "⌫"); del.type = "button"; del.addEventListener("click", function () { guess.pop(); A.haptic("light"); draw(); }); pad.appendChild(del);
    var ok = el("button", "hs-key send", "INVIA"); ok.type = "button";
    ok.addEventListener("click", function () { if (guess.length !== 4) { A.toast("Servono 4 cifre"); return; } act("vs", { g: guess.slice() }); });
    pad.appendChild(ok);
    stage.appendChild(el("div", "hs-note", "🟢 cifra giusta al posto giusto · 🟡 cifra giusta al posto sbagliato · le 4 cifre sono tutte diverse"));
  }

  // ----- 5. Fuga: rapporti e mezzi -----
  var VEH_ICON = ["🚁", "🏍️", "🕳️", "🚐"];
  function lv5(v) {
    stage.appendChild(el("div", "hs-sub", "Fuga · tappa " + (v.r + 1) + "/" + v.rounds));
    stage.appendChild(el("div", "hs-sub big", "Scegli l'UNICO mezzo che funziona"));
    var cl = el("div", "hs-clues"); v.clues.forEach(function (c) { cl.appendChild(el("div", "hs-clue", "📻 " + c)); }); stage.appendChild(cl);
    var vh = el("div", "hs-veh"); stage.appendChild(vh);
    v.vehicles.forEach(function (name, i) {
      var b = el("button", "hs-vb"); b.type = "button"; b.appendChild(el("span", "ic", VEH_ICON[i])); b.appendChild(el("span", "", name.replace(/^\S+\s*/, "")));
      b.addEventListener("click", function () { A.haptic("med"); snd("click"); act("ft", { i: i }); }); vh.appendChild(b);
    });
    var rules = el("details", "hs-rules"); rules.appendChild(el("summary", "", "Manuale di fuga"));
    v.rules.forEach(function (r) { rules.appendChild(el("div", "", r)); }); stage.appendChild(rules);
  }

  window.ArcadeGames = window.ArcadeGames || {};
  window.ArcadeGames.heist = { open: open };
})();
