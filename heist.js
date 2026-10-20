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
  var S = { info: null, view: null, busy: false, t0: 0, left: 0, tick: 0, timers: [], active: false };
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
    if (r <= 0 && S.active && !S.busy) { S.active = false; clearInterval(S.tick); A.api("/api/heist/state").then(handle).catch(function () {}); }
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
    build(); root.hidden = false; clearTimers(); S.busy = false;
    stage.innerHTML = ""; stage.appendChild(el("div", "pg-empty", "Carico…")); hud.hidden = true;
    A.api("/api/heist/state").then(handle).catch(function (e) { stage.innerHTML = ""; stage.appendChild(el("div", "pg-empty", errText(e))); });
  }
  function close() {
    if (S.busy) return;
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
    S.active = false; hud.hidden = true; showIntro();
  }
  function post(path, body) {
    if (S.busy) return Promise.resolve(null);
    S.busy = true;
    return A.api(path, "POST", body || {}).then(function (j) { S.busy = false; return j; }, function (e) { S.busy = false; A.toast(errText(e)); throw e; });
  }
  function act(a, data) {
    var b = data || {}; b.a = a;
    return post("/api/heist/act", b).then(function (j) { if (j) handle(j); }).catch(function () {});
  }

  // ---------- schermata iniziale con il cavo ----------
  function showIntro() {
    clearTimers(); stage.innerHTML = ""; stage.className = "hs-stage intro"; var I = S.info || {};
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
      c.appendChild(el("p", "hs-lead", "Tempo: " + Math.floor(e.elapsed / 60) + "m " + pad2(e.elapsed % 60) + "s · Allarmi: " + e.alarms + "/3"));
      c.appendChild(el("p", "hs-prize", "1 Titolo, 1 Persecuzione e 1 STELLA ⭐ aggiunti."));
      if (e.msg) c.appendChild(el("p", "hs-lead", e.msg));
    } else {
      snd("lose"); A.haptic("bad");
      c.appendChild(el("h2", "", "RAPINA FALLITA"));
      c.appendChild(el("p", "hs-lead", e.msg || ""));
      c.appendChild(el("p", "hs-prize", "Hai perso il pass da " + ((S.info && S.info.cost) || 150) + " $SDG."));
    }
    if (e.result !== "win" && e.level && A.isAdmin && A.isAdmin()) {                // admin: ritenta proprio il livello in cui sei caduto
      var rt = el("button", "avi-go hs-go", "RIPROVA IL LIVELLO " + e.level); rt.type = "button";
      rt.addEventListener("click", function () { post("/api/heist/start", { lvl: e.level }).then(function (j) { if (j) handle(j); }).catch(function () {}); });
      c.appendChild(rt);
    }
    var again = el("button", "avi-go hs-go", "TORNA ALLA RAPINA"); again.type = "button";
    again.addEventListener("click", function () { open(); });
    c.appendChild(again); stage.appendChild(c); A.refreshMe();
  }

  // ---------- livelli ----------
  function showLevel(v, ev) {
    clearTimers(); stage.className = "hs-stage lv" + v.level; stage.innerHTML = "";
    if (ev && ev.type === "level") { var up = el("div", "hs-up", "LIVELLO " + ev.level + " SUPERATO ✓"); stage.appendChild(up); later(function () { up.remove(); }, 1500); if (ev.msg) say(ev.msg, "ok"); }
    else if (ev && ev.msg) say(ev.msg, ev.type === "alarm" ? "bad" : "ok");
    ({ seq: lv1, laser: lvLaser, hack: lv3, lock: lvLock, vault: lv4, flight: lv5 })[v.kind](v);
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
