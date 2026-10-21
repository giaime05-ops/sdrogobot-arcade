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
    lEl.textContent = "LIV " + v.level + "/" + (v.total || 6) + " · " + v.name;
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
    card.appendChild(el("p", "hs-prize", "Premio: " + (I.share || 20) + "% del Banco (" + (I.share_follia || 50) + "% con la Follia), minimo " + (I.prize_fixed || 200) + " $SDG · +1 Stella ⭐"));
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
      snd("bigwin"); A.haptic("ok");
      c.appendChild(el("h2", "", "RAPINA PERFETTA!"));
      c.appendChild(el("div", "hs-big", "+" + A.fmt(e.prize) + " $SDG"));
      c.appendChild(el("p", "hs-lead", "Tempo: " + Math.floor(e.elapsed / 60) + "m " + pad2(e.elapsed % 60) + "s · Allarmi: " + e.alarms + "/" + (e.mini ? 2 : 3)));
      if (!e.mini) c.appendChild(el("p", "hs-prize", "1 Titolo, 1 Persecuzione e 1 STELLA ⭐ aggiunti."));
      if (e.msg) c.appendChild(el("p", "hs-lead", e.msg));
    } else {
      snd("lose"); A.haptic("bad");
      c.appendChild(el("h2", "", "RAPINA FALLITA"));
      c.appendChild(el("p", "hs-lead", e.msg || ""));
      c.appendChild(el("p", "hs-prize", "Hai perso il pass da " + (e.mini ? ((S.mini && S.mini.cost) || 100) : ((S.info && S.info.cost) || 150)) + " $SDG."));
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
    ({ seq: lv1, laser: lvLaser, hack: lv3, lock: lvLock, vault: lv4, flight: lv5, circuit: lvCircuit, chase: lvChase, face: mgFace, cable: mgCable, print: mgPrint, freq: mgFreq, voice: mgVoice })[v.kind](v);
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
  function lvLaser(v) {
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
      if (done || root.hidden || S.view !== v) { done = true; return; }
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


  // ----- 6. Bypass circuiti: tieni il dito sulla sonda e guidala nel tracciato, evitando pareti e scariche -----
  function distPoly(pts, x, y) {
    var best = 1e9;
    for (var i = 0; i < pts.length - 1; i++) {
      var ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay, L2 = dx * dx + dy * dy;
      var u = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
      best = Math.min(best, Math.hypot(x - (ax + u * dx), y - (ay + u * dy)));
    }
    return best;
  }
  function hzPos(h, t) { var k = h.a * Math.sin(2 * Math.PI * t / h.p + h.ph); return [h.x + h.nx * k, h.y + h.ny * k]; }
  function lvCircuit(v) {
    if (v.phase === "brief") {
      brief("BYPASS CIRCUITI", "Appoggia il dito sulla sonda (cerchio all'inizio) e trascinala lungo il circuito fino alla fine. Non toccare le pareti rosse e non farti colpire dalle scariche che scorrono avanti e indietro. Se alzi il dito la sonda torna al via. 2 settori, il secondo è più stretto.", "ENTRA NEL CIRCUITO", function () { act("rd"); });
      return;
    }
    stage.appendChild(el("div", "hs-sub", "Settore " + (v.r + 1) + "/" + v.rounds));
    var msgEl = el("div", "hs-sub big", "Trascina la sonda fino alla fine"); stage.appendChild(msgEl);
    var Wd = Math.min(340, Math.max(260, (stage.clientWidth || 340) - 16)), sc = Wd / 100;
    var cv = el("canvas", "hs-lz"); cv.width = Wd * 2; cv.height = Wd * 2; cv.style.width = Wd + "px"; cv.style.height = Wd + "px"; cv.style.touchAction = "none"; stage.appendChild(cv);
    var c = cv.getContext("2d"); c.scale(2, 2);
    var t0 = performance.now() + (v.delay || 0) * 1000, pts = v.pts, drag = false, px = pts[0][0], py = pts[0][1], smp = [], lastS = 0, done = false, sent = false;
    function pos(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100]; }
    cv.addEventListener("pointerdown", function (e) {
      e.preventDefault(); if (done || performance.now() < t0) return; var q = pos(e);
      if (Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) > 11) return;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {} drag = true; smp = []; px = q[0]; py = q[1]; lastS = -99; A.haptic("light");
    });
    cv.addEventListener("pointermove", function (e) { if (drag) { var q = pos(e); px = q[0]; py = q[1]; } });
    function lift() { if (!drag || done) return; drag = false; px = pts[0][0]; py = pts[0][1]; smp = []; msgEl.textContent = "Sonda persa: riparti dal via"; }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (n) { cv.addEventListener(n, lift); });
    function X(u) { return u * sc; }
    (function loop(now) {
      if (done || root.hidden || S.view !== v) { done = true; return; }
      var t = (now - t0) / 1000, tt = Math.max(0, t);
      c.clearRect(0, 0, Wd, Wd); var g = c.createLinearGradient(0, 0, Wd, Wd); g.addColorStop(0, "#0a1020"); g.addColorStop(1, "#150a24"); c.fillStyle = g; c.fillRect(0, 0, Wd, Wd);
      c.strokeStyle = "rgba(53,230,255,.07)"; c.lineWidth = 1; for (var k = 1; k < 10; k++) { c.beginPath(); c.moveTo(X(k * 10), 0); c.lineTo(X(k * 10), Wd); c.moveTo(0, X(k * 10)); c.lineTo(Wd, X(k * 10)); c.stroke(); }
      c.lineJoin = "round"; c.lineCap = "round";
      c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(X(p[0]), X(p[1])) : c.moveTo(X(p[0]), X(p[1])); });
      c.strokeStyle = "#ff3b5e"; c.lineWidth = 2 * v.w * sc + 5; c.stroke();
      c.strokeStyle = "#0b1b2e"; c.lineWidth = 2 * v.w * sc; c.stroke();
      c.strokeStyle = "rgba(53,230,255,.25)"; c.lineWidth = 2; c.setLineDash([6, 8]); c.stroke(); c.setLineDash([]);
      c.fillStyle = "#35e6ff"; c.beginPath(); c.arc(X(pts[0][0]), X(pts[0][1]), 9, 0, 7); c.fill();
      c.fillStyle = "#2fd36f"; c.font = "700 11px Rajdhani,sans-serif"; c.textAlign = "center"; var e = pts[pts.length - 1]; c.beginPath(); c.arc(X(e[0]), X(e[1]), 10, 0, 7); c.fill(); c.fillStyle = "#04200f"; c.fillText("FINE", X(e[0]), X(e[1]) + 4);
      var hit = false;
      v.hz.forEach(function (h) {
        var hp = hzPos(h, tt); c.save(); c.shadowColor = "#ffe82a"; c.shadowBlur = 14; c.fillStyle = "#ffd23b"; c.beginPath(); c.arc(X(hp[0]), X(hp[1]), h.r * sc, 0, 7); c.fill(); c.restore();
        c.fillStyle = "#3a2a00"; c.font = "700 14px sans-serif"; c.fillText("⚡", X(hp[0]), X(hp[1]) + 5);
        if (drag && Math.hypot(px - hp[0], py - hp[1]) < h.r + 1.2) hit = true;
      });
      if (drag && distPoly(pts, px, py) > v.w + 0.3) hit = true;
      if (drag && !hit && now - lastS >= 35 && t >= 0) { lastS = now; smp.push([Math.round(now - t0), +px.toFixed(2), +py.toFixed(2)]); }
      c.save(); c.shadowColor = "#8ff3ff"; c.shadowBlur = 16; c.fillStyle = drag ? "#fff" : "#8ff3ff"; c.beginPath(); c.arc(X(px), X(py), 6, 0, 7); c.fill(); c.restore();
      if (t < 0) { c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(0, 0, Wd, Wd); c.fillStyle = "#fff"; c.font = "700 30px Bungee,sans-serif"; c.fillText(String(Math.ceil(-t)), Wd / 2, Wd / 2); }
      if (hit && !done) { done = true; drag = false; A.haptic("bad"); act("ci", { hit: true }); return; }
      if (drag && Math.hypot(px - e[0], py - e[1]) < 4.5 && !done) { done = true; drag = false; var fin = Math.round(now - t0); smp.push([fin, +e[0].toFixed(2), +e[1].toFixed(2)]); act("ci", { s: smp, fin: fin }); return; }
      requestAnimationFrame(loop);
    })(performance.now());
  }

  // ----- 7. Inseguimento: schiva i posti di blocco e scegli il bivio giusto -----
  function lvChase(v) {
    if (v.phase === "brief") {
      brief("INSEGUIMENTO", "Sei alla guida del furgone della fuga: corre da solo, tu cambi corsia. Tocca a sinistra o a destra (o fai scorrere il dito) per spostarti. Schiva posti di blocco, chiodi e macchie d'olio. Ai bivi leggi il cartello: l'elicottero è sul percorso da NON prendere, scegli l'altro. Resisti 30 secondi.", "VIA!", function () { act("rd"); });
      return;
    }
    stage.appendChild(el("div", "hs-sub big", "Cambia corsia: tocca a sinistra / destra"));
    var Wd = Math.min(340, Math.max(260, (stage.clientWidth || 340) - 16)), Hd = 380;
    var cv = el("canvas", "hs-lz"); cv.width = Wd * 2; cv.height = Hd * 2; cv.style.width = Wd + "px"; cv.style.height = Hd + "px"; cv.style.touchAction = "none"; stage.appendChild(cv);
    var c = cv.getContext("2d"); c.scale(2, 2);
    var t0 = performance.now() + (v.delay || 0) * 1000, lane = 1, ev = [], vx = Wd / 2, done = false, SP = 150, PY = Hd - 80, lw = (Wd - 40) / 3, sx0 = 0, checked = {};
    function laneAt(t) { var cur = 1; ev.forEach(function (e) { if (e[0] / 1000 <= t) cur = e[1]; }); return cur; }
    function go(d) { var tm = performance.now() - t0; if (done || tm < 0) return; var nl = Math.max(0, Math.min(2, lane + d)); if (nl === lane) return; if (ev.length && tm - ev[ev.length - 1][0] < 70) return; lane = nl; ev.push([Math.round(tm), lane]); A.haptic("light"); }
    cv.addEventListener("pointerdown", function (e) { e.preventDefault(); sx0 = e.clientX; });
    cv.addEventListener("pointerup", function (e) {
      var dx = e.clientX - sx0; if (Math.abs(dx) > 26) go(dx > 0 ? 1 : -1);
      else { var r = cv.getBoundingClientRect(); go(e.clientX - r.left < r.width / 2 ? -1 : 1); }
    });
    function LX(l) { return 20 + lw * l + lw / 2; }
    function hitNow() { if (done) return; done = true; A.haptic("bad"); act("ch", { hit: true }); }
    (function loop(now) {
      if (done || root.hidden || S.view !== v) { done = true; return; }
      var t = (now - t0) / 1000;
      vx += (LX(lane) - vx) * 0.3;
      c.clearRect(0, 0, Wd, Hd); c.fillStyle = "#090d18"; c.fillRect(0, 0, Wd, Hd);
      c.fillStyle = "#151b2b"; c.fillRect(20, 0, Wd - 40, Hd);
      c.strokeStyle = "#35e6ff"; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 0); c.lineTo(20, Hd); c.moveTo(Wd - 20, 0); c.lineTo(Wd - 20, Hd); c.stroke();
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 3; c.setLineDash([22, 22]); c.lineDashOffset = -((Math.max(0, t) * SP) % 44);
      for (var k = 1; k < 3; k++) { c.beginPath(); c.moveTo(20 + lw * k, 0); c.lineTo(20 + lw * k, Hd); c.stroke(); } c.setLineDash([]);
      function Y(tt) { return PY - (tt - t) * SP; }
      v.forks.forEach(function (f) {
        var y = Y(f.t);
        if (t > f.t - 2.4 && t < f.t + 0.6) {                                           // cartello del bivio (elicottero sul percorso da evitare)
          var sy = Math.max(30, Math.min(80, Y(f.t - 1.0)));
          c.fillStyle = "#0d2b17"; c.fillRect(24, sy - 22, Wd - 48, 44); c.strokeStyle = "#2fd36f"; c.lineWidth = 2; c.strokeRect(24, sy - 22, Wd - 48, 44);
          c.fillStyle = "#fff"; c.font = "700 15px Rajdhani,sans-serif"; c.textAlign = "center";
          c.fillText(f.heli === "L" ? "◀ 🚁 PONTE" : "◀ TUNNEL", Wd * 0.27, sy + 5); c.fillText(f.heli === "L" ? "TUNNEL ▶" : "PONTE 🚁 ▶", Wd * 0.73, sy + 5);
        }
        if (y > -40 && y < Hd + 40 && t > f.t - 1.8) { c.fillStyle = "#6b1b2a"; c.fillRect(20 + lw + 6, y - 16, lw - 12, 32); c.fillStyle = "#ff8aa0"; c.font = "700 11px Rajdhani,sans-serif"; c.fillText("MURO", LX(1), y + 4); }
        if (!checked["f" + f.t] && t > f.t + 0.1) { checked["f" + f.t] = 1; if (laneAt(f.t) !== (f.heli === "L" ? 2 : 0)) hitNow(); }
      });
      v.obs.forEach(function (o) {
        var y = Y(o[0]); if (y < -30 || y > Hd + 30) { if (!checked["o" + o[0]] && t > o[0] + 0.1) { checked["o" + o[0]] = 1; if (laneAt(o[0] - 0.08) === o[1] && laneAt(o[0]) === o[1] && laneAt(o[0] + 0.08) === o[1]) hitNow(); } return; }
        var x = LX(o[1]);
        if (o[2] === "block") { c.fillStyle = "#e0183a"; c.fillRect(x - 28, y - 10, 56, 20); c.fillStyle = "#fff"; for (var j = 0; j < 4; j++) c.fillRect(x - 28 + j * 14 + 3, y - 10, 7, 20); }
        else if (o[2] === "spike") { c.fillStyle = "#c8d0e0"; for (var j2 = -2; j2 <= 2; j2++) { c.beginPath(); c.moveTo(x + j2 * 9 - 5, y + 9); c.lineTo(x + j2 * 9, y - 9); c.lineTo(x + j2 * 9 + 5, y + 9); c.fill(); } }
        else { c.fillStyle = "rgba(10,10,14,.9)"; c.beginPath(); c.ellipse(x, y, 30, 14, 0, 0, 7); c.fill(); c.strokeStyle = "#4a3a8a"; c.lineWidth = 2; c.stroke(); }
        if (!checked["o" + o[0]] && t > o[0] + 0.1) { checked["o" + o[0]] = 1; if (laneAt(o[0] - 0.08) === o[1] && laneAt(o[0]) === o[1] && laneAt(o[0] + 0.08) === o[1]) hitNow(); }
      });
      c.save(); c.shadowColor = "#ffd23b"; c.shadowBlur = 12; c.fillStyle = "#ffd23b"; c.fillRect(vx - 14, PY - 24, 28, 48); c.restore();
      c.fillStyle = "#1a1a24"; c.fillRect(vx - 10, PY - 14, 20, 12); c.fillStyle = "#ff3b5e"; c.fillRect(vx - 12, PY + 20, 6, 4); c.fillRect(vx + 6, PY + 20, 6, 4);
      c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(20, 6, Wd - 40, 6); c.fillStyle = "#2fd36f"; c.fillRect(20, 6, (Wd - 40) * Math.max(0, Math.min(1, t / v.dur)), 6);
      if (t < 0) { c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(0, 0, Wd, Hd); c.fillStyle = "#fff"; c.font = "700 30px Bungee,sans-serif"; c.textAlign = "center"; c.fillText(String(Math.ceil(-t)), Wd / 2, Hd / 2); }
      if (t >= v.dur && !done) { done = true; act("ch", { ev: ev, fin: Math.round(t * 1000) }); return; }
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
    card.appendChild(el("p", "hs-lead", "Due mini rapine al giorno, uguali per tutti: 3 giochini veloci ciascuna, " + I.time + " secondi in tutto e al " + I.max_alarms + "° allarme si fallisce. Costo " + I.cost + " $SDG, premio fisso " + I.prize + " $SDG. Ogni mini rapina si può rifare fino a " + I.plays + " volte al giorno, almeno " + Math.round(I.gap / 3600) + " ore dopo l'ultima partenza. Dalla mezzanotte italiana cambia lo schema."));
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
        else if (I.balance != null && I.balance < I.cost) { go.disabled = true; go.textContent = "SALDO INSUFFICIENTE"; }
        else { go.disabled = false; go.textContent = "ENTRA · " + I.cost + " $SDG"; }
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
    stage.appendChild(el("div", "hs-sub", "Memorizza le guardie!"));
    var q = el("div", "hs-sub big", ""); stage.appendChild(q);
    var grid = el("div", "hs-guards"); stage.appendChild(grid); var cards = [];
    d.guards.forEach(function (g, i) {
      var b = el("button", "hs-guard"); b.type = "button"; b.disabled = true;
      var face = el("i", "gf"); face.style.background = SKIN[g.skin]; var hat = el("i", "gh"); hat.style.background = HAT[g.hat];
      var bd = el("i", "gb"); bd.style.background = HAT[g.badge]; b.appendChild(face); b.appendChild(hat); if (g.glasses) b.appendChild(el("i", "gg", "🕶")); b.appendChild(bd);
      b.appendChild(el("span", "gn", String(i + 1)));
      b.addEventListener("click", function () { if (b.disabled) return; A.haptic("light"); snd("click"); stopT && stopT(); act("an", { i: i }); });
      grid.appendChild(b); cards.push(b);
    });
    var stopT = null;
    later(function () {
      cards.forEach(function (b) { b.classList.add("hid"); b.disabled = false; });
      q.textContent = d.q; stopT = tbar(d.limit, function () { act("to"); });
    }, d.show * 1000);
  }
  var CAB = { Rosso: "#e0183a", Blu: "#3b82ff", Giallo: "#ffd23b", Verde: "#2fd36f" };
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
    var top = el("div", "hs-fptop"); top.appendChild(draw(d.target, 150)); stage.appendChild(top);
    var row = el("div", "hs-fprow"); stage.appendChild(row); var stop = tbar(d.limit, function () { act("to"); });
    d.cands.forEach(function (m, i) {
      var b = el("button", "hs-fpc"); b.type = "button"; b.appendChild(draw(m, 92));
      b.addEventListener("click", function () { A.haptic("med"); snd("click"); stop(); act("an", { i: i }); }); row.appendChild(b);
    });
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
    stage.appendChild(el("div", "hs-sub big", "TAP quando l'indicatore passa sui nodi 1 → 2 → 3, in ordine"));
    var bar = el("div", "hs-vbar"); stage.appendChild(bar); var ind = el("i", "vi"); bar.appendChild(ind);
    d.nodes.forEach(function (n, k) { var z = el("i", "vz", String(k + 1)); z.style.left = ((n - d.w / 2) * 100) + "%"; z.style.width = (d.w * 100) + "%"; bar.appendChild(z); });
    var dots = el("div", "hs-dots"); for (var q = 0; q < 3; q++) dots.appendChild(el("i", "")); stage.appendChild(dots);
    var btn = el("button", "avi-go hs-go hs-hold", "TAP!"); btn.type = "button"; stage.appendChild(btn);
    var t0 = performance.now(), taps = [], done = false, stop = tbar(d.limit, function () { done = true; act("to"); });
    (function loop(now) { if (done || root.hidden || S.view !== v) return; ind.style.left = (tri(d.phase0 + d.speed * (now - t0) / 1000) * 100) + "%"; requestAnimationFrame(loop); })(t0);
    btn.addEventListener("pointerdown", function (e) {
      e.preventDefault(); if (done) return; var tm = Math.round(performance.now() - t0); A.haptic("med"); snd("key");
      var k = taps.length, p = tri(d.phase0 + d.speed * tm / 1000), good = Math.abs(p - d.nodes[k]) <= d.w / 2 + 0.01; taps.push(tm);
      dots.children[k].className = good ? "on" : "bad";
      if (!good || taps.length >= 3) { done = true; stop(); act("vt", { taps: taps }); }
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
    term.appendChild(el("div", "hs-tl", "Parti da " + v.start + " · si può fare in " + v.min_moves + " mosse (ne hai 5) · mosse rimaste"));
    term.appendChild(dots(5, v.left_moves)); stage.appendChild(term);
    var ops = el("div", "hs-ops"); stage.appendChild(ops);
    v.ops.forEach(function (o, i) {
      var b = el("button", "hs-op", SYM[o[0]] + " " + o[1]); b.type = "button";
      b.addEventListener("click", function () { A.haptic("light"); snd("key"); act("hk", { i: i }); });
      ops.appendChild(b);
    });
    var r = el("button", "avi-back hs-reset", "🔄 RESET"); r.type = "button"; r.addEventListener("click", function () { act("hr"); }); stage.appendChild(r);
    stage.appendChild(el("div", "hs-note", "÷ solo se il valore è divisibile · niente valori negativi"));
  }

  // ----- 4. Caveau: codice a 4 cifre (tutte diverse) -----
  var guess = [];
  function lv4(v) {
    guess = [];
    var top = el("div", "hs-sub", "Caveau · tentativi " + v.tries + "/" + v.max_tries + " · ⏳ "); var vt = el("b", "", clock(v.vault_left)); top.appendChild(vt); stage.appendChild(top);
    var vl = v.vault_left, t0 = Date.now(); S.timers.push(setInterval(function () { vt.textContent = clock(Math.max(0, vl - (Date.now() - t0) / 1000)); }, 500));
    var hint = el("div", "hs-hint"); hint.appendChild(document.createTextNode("Intercettato: "));
    for (var i = 0; i < 4; i++) hint.appendChild(el("span", i === v.hint[0] ? "on" : "", i === v.hint[0] ? String(v.hint[1]) : "▫"));
    stage.appendChild(hint);
    var hist = el("div", "hs-hist"); stage.appendChild(hist);
    v.hist.slice(-5).forEach(function (h) {
      var r = el("div", "hs-hrow"); r.appendChild(el("b", "", h[0].join(" "))); r.appendChild(el("span", "g", "🟢 " + h[1])); r.appendChild(el("span", "y", "🟡 " + h[2])); hist.appendChild(r);
    });
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
    stage.appendChild(el("div", "hs-note", "🟢 cifra giusta al posto giusto · 🟡 cifra giusta al posto sbagliato · cifre tutte diverse"));
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
