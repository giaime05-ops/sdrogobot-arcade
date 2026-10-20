/* Sdrogo Arcade – SDROGO HEIST in 2D (per ora solo account admin di prova).
   Cinque livelli a giochini: Centralino (memoria), Guardie (riflessi), Hacking (logica), Caveau (codice), Fuga (rapporti).
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
  var NAMES = ["Centralino", "Guardie", "Hacking", "Caveau", "Fuga"];

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
    hud.appendChild(lEl); hud.appendChild(tEl); hud.appendChild(aEl); root.appendChild(hud);
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
    lEl.textContent = "LIV " + v.level + "/5 · " + NAMES[v.level - 1];
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
    go.addEventListener("click", function () {
      A.haptic("med"); snd("creak");
      post("/api/heist/start").then(function (j) { if (j) handle(j); }).catch(function () {});
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
    var again = el("button", "avi-go hs-go", "TORNA ALLA RAPINA"); again.type = "button";
    again.addEventListener("click", function () { open(); });
    c.appendChild(again); stage.appendChild(c); A.refreshMe();
  }

  // ---------- livelli ----------
  function showLevel(v, ev) {
    clearTimers(); stage.className = "hs-stage lv" + v.level; stage.innerHTML = "";
    if (ev && ev.type === "level") { var up = el("div", "hs-up", "LIVELLO " + ev.level + " SUPERATO ✓"); stage.appendChild(up); later(function () { up.remove(); }, 1500); if (ev.msg) say(ev.msg, "ok"); }
    else if (ev && ev.msg) say(ev.msg, ev.type === "alarm" ? "bad" : "ok");
    if (v.level === 1) lv1(v); else if (v.level === 2) lv2(v); else if (v.level === 3) lv3(v); else if (v.level === 4) lv4(v); else lv5(v);
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

  // ----- 2. Guardie: premi solo quando dormono tutte -----
  function guardSvg(awake) {
    var eye = awake ? '<circle cx="16" cy="22" r="4" fill="#fff"/><circle cx="32" cy="22" r="4" fill="#fff"/><circle cx="16" cy="22" r="1.8" fill="#c00"/><circle cx="32" cy="22" r="1.8" fill="#c00"/>'
      : '<path d="M11 22q5 4 10 0M27 22q5 4 10 0" stroke="#9fd4ff" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 48 56" width="100%" height="100%"><path d="M4 56q0-18 20-18t20 18z" fill="' + (awake ? "#7a1224" : "#1b3a66") + '"/><circle cx="24" cy="22" r="15" fill="' + (awake ? "#e8b08c" : "#c6a58c") + '"/><path d="M8 14q16-16 32 0l-2 5H10z" fill="' + (awake ? "#ff3b4e" : "#3b5ea8") + '"/>' + eye +
      (awake ? '<path d="M18 33h12" stroke="#5a1010" stroke-width="2.4" stroke-linecap="round"/>' : '<text x="36" y="10" font-size="11" fill="#9fd4ff" font-family="Rajdhani,sans-serif" font-weight="700">z</text>') + '</svg>';
  }
  function lv2(v) {
    if (v.phase === "brief") {
      brief("GUARDIE", "Sul monitor vedi lo stato di ogni guardia: dorme o è sveglia. Premi PASSA nel momento in cui TUTTE dormono. Troppo presto, troppo tardi o con una guardia sveglia = allarme. 3 telecamere, sempre più guardie e più veloci.", "ACCENDI IL MONITOR", function () { act("rd"); });
      return;
    }
    stage.appendChild(el("div", "hs-sub", "Telecamera " + (v.r + 1) + "/" + v.rounds));
    var mon = el("div", "hs-monitor"); stage.appendChild(mon);
    var row = el("div", "hs-guards"); mon.appendChild(row);
    var gs = []; for (var i = 0; i < v.n; i++) { var g = el("div", "hs-guard"); g.innerHTML = guardSvg(true); row.appendChild(g); gs.push(g); }
    var bar = el("div", "hs-fbar"); var fill = el("i"); bar.appendChild(fill); mon.appendChild(bar);
    var cap = el("div", "hs-sub", "Attendi…"); stage.appendChild(cap);
    var btn = el("button", "avi-go hs-go hs-pass", "🏃 PASSA ORA!"); btn.type = "button"; btn.disabled = true; stage.appendChild(btn);
    var total = v.frames.length, iv = v.iv * 1000, start = performance.now() + (v.delay || 0) * 1000, last = -2, done = false;
    function draw(f) {
      v.frames[f].forEach(function (aw, k) { gs[k].innerHTML = guardSvg(aw); gs[k].classList.toggle("awake", aw); });
      var all = v.frames[f].every(function (x) { return !x; }); mon.classList.toggle("clear", all);
    }
    var raf = 0;
    (function loop(now) {
      if (done || root.hidden || S.view !== v) { done = true; return; }
      var el_ = now - start;
      if (el_ >= 0) {
        var f = Math.floor(el_ / iv);
        if (f >= total) { done = true; btn.disabled = true; cap.textContent = "Troppo lento…"; act("gm"); return; }
        if (f !== last) { last = f; draw(f); btn.disabled = false; cap.textContent = "Fotogramma " + (f + 1) + "/" + total; }
        fill.style.width = ((el_ / (iv * total)) * 100) + "%";
      }
      raf = requestAnimationFrame(loop);
    })(performance.now());
    function press() {
      if (done || btn.disabled) return; done = true; cancelAnimationFrame(raf); btn.disabled = true; A.haptic("med"); snd("click");
      act("gp");
    }
    btn.addEventListener("pointerdown", function (e) { e.preventDefault(); press(); });
  }

  // ----- 3. Hacking: numeri e mosse contate -----
  var SYM = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  function lv3(v) {
    stage.appendChild(el("div", "hs-sub", "Terminale " + (v.r + 1) + "/" + v.rounds));
    var term = el("div", "hs-term");
    term.appendChild(el("div", "hs-tl", "OBIETTIVO")); term.appendChild(el("div", "hs-target", String(v.target)));
    term.appendChild(el("div", "hs-tl", "VALORE ATTUALE")); term.appendChild(el("div", "hs-val", String(v.val)));
    term.appendChild(el("div", "hs-tl", "Parti da " + v.start + " · mosse rimaste"));
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
