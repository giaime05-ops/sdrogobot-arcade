/* Sdrogo Arcade – sezioni: Saloon (hub), Classifica, Diario.
 * La barra in basso sta SOTTO ai giochi (z-index minore): quando un gioco è aperto non si vede e non copre nulla.
 * Si cambia sezione toccando la barra oppure con uno swipe laterale (solo quando nessun gioco è aperto). */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  var $ = function (id) { return document.getElementById(id); };
  var ORDER = ["act", "hub", "lead"];
  var cur = "hub", cat = "coins", sub = "quests", loaded = {}, busy = {};
  var tabs = document.querySelectorAll(".tab");
  var views = { hub: $("pgHub"), lead: $("pgLead"), act: $("pgAct") };
  var pos = 1, offTimer = null, badgeBusy = false;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function gameOpen() { return ["avi", "gm", "g4"].some(function (id) { var n = $(id); return n && !n.hidden; }); }
  function syncCoins() {
    var v = $("pcoins") ? $("pcoins").textContent : "—";
    Array.prototype.forEach.call(document.querySelectorAll(".pgcoins"), function (n) { n.textContent = v; });
  }
  function errMsg(e) { return e && e.network ? "Server non raggiungibile." : ((e && e.message) || "Errore."); }
  function empty(box, t) { box.innerHTML = ""; box.appendChild(el("div", "pg-empty", t)); }

  // ---------- transizioni: le sezioni scorrono affiancate, seguono il dito e hanno un leggero effetto di profondità ----------
  function paint(p, anim) {
    ORDER.forEach(function (n, i) {
      var d = i - p, ad = Math.min(1, Math.abs(d)), v = views[n];
      v.style.transition = anim ? "" : "none";
      v.style.transform = "translate3d(" + (d * 100).toFixed(2) + "%,0,0) scale(" + (1 - 0.06 * ad).toFixed(3) + ")";
      v.style.opacity = String((1 - 0.55 * ad).toFixed(3));
      if (Math.abs(d) < 1) v.classList.remove("off");
    });
  }
  function settle(idx) {
    clearTimeout(offTimer);
    offTimer = setTimeout(function () { ORDER.forEach(function (n, i) { if (i !== idx) views[n].classList.add("off"); }); }, 340);
  }
  // pallino rosso sulla scheda Attività quando c'è un premio da riscattare
  function setBadge(n) {
    var t = document.querySelector('.tab[data-tab="act"]'); if (!t) return;
    var d = t.querySelector(".dot");
    if (!n) { if (d) d.remove(); return; }
    if (!d) { d = document.createElement("i"); d.className = "dot"; t.appendChild(d); }
    d.textContent = String(n);
  }
  function refreshBadge() {
    if (!A.inTelegram || badgeBusy) return; badgeBusy = true;
    A.api("/api/social/quests").then(function (j) {
      setBadge((j.quests || []).filter(function (q) { return q.done && !q.claimed; }).length);
    }).catch(function () {}).then(function () { badgeBusy = false; });
  }
  function show(name, fromUser) {
    var idx = ORDER.indexOf(name); if (idx < 0) return;
    cur = name; pos = idx;
    if (name !== "lead") cat = "coins";                 // uscendo dalla classifica, al ritorno si riparte dai Ricconi
    document.body.setAttribute("data-tab", name === "hub" ? "hub" : "other");
    Array.prototype.forEach.call(tabs, function (t) { t.classList.toggle("on", t.getAttribute("data-tab") === name); });
    paint(idx, true); settle(idx);
    if (fromUser) A.haptic("light");
    syncCoins();
    if (name === "lead") loadLead();
    if (name === "act") loadAct();
    if (name === "hub") { A.refreshMe(); refreshBadge(); }
  }
  views.lead.style.transform = "translate3d(100%,0,0)"; views.act.style.transform = "translate3d(-100%,0,0)";
  document.body.setAttribute("data-tab", "hub");
  Array.prototype.forEach.call(tabs, function (t) { t.addEventListener("click", function () { show(t.getAttribute("data-tab"), true); }); });

  // ---------- classifica ----------
  function renderCats(cats) {
    var box = $("leadCats"); box.innerHTML = "";
    cats.forEach(function (c) {
      var b = el("button", "pcat" + (c.key === cat ? " on" : ""), c.icon + " " + c.title); b.type = "button";
      b.addEventListener("click", function () { if (cat !== c.key) { cat = c.key; A.haptic("light"); loadLead(); } });
      box.appendChild(b);
    });
  }
  function loadLead() {
    var box = $("leadBody");
    if (!loaded.lead) empty(box, "Carico la classifica…");
    if (busy.lead) return; busy.lead = true;
    A.api("/api/social/leaderboard?cat=" + encodeURIComponent(cat)).then(function (j) {
      loaded.lead = true; cat = j.cat; renderCats(j.cats);
      box.innerHTML = "";
      if (!j.top.length) { empty(box, "Nessuno in questa classifica, per ora."); return; }
      var medals = ["🥇", "🥈", "🥉"];
      j.top.forEach(function (r) {
        var row = el("div", "row" + (r.me ? " me" : ""));
        row.appendChild(el("div", "rk", r.rank <= 3 ? medals[r.rank - 1] : String(r.rank)));
        row.appendChild(el("div", "nm", r.name + (r.me ? " (tu)" : "")));
        row.appendChild(el("div", "vl", A.fmt(r.value) + " " + j.unit));
        box.appendChild(row);
      });
      if (j.me && j.me.rank && j.me.rank > j.top.length) box.appendChild(el("div", "pg-me", "Sei al " + j.me.rank + "° posto con " + A.fmt(j.me.value) + " " + j.unit));
      else if (j.me && !j.me.rank) box.appendChild(el("div", "pg-me", "Tu non sei ancora in classifica."));
    }).catch(function (e) { if (!loaded.lead) empty(box, errMsg(e)); else A.toast(errMsg(e)); })
      .then(function () { busy.lead = false; });
  }

  // ---------- attività: sfide e missioni / storico ----------
  function when(ts) {
    var d = new Date(ts * 1000), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function timeLeft(end) {
    var s = Math.max(0, end - Date.now() / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return d > 0 ? d + "g " + h + "h" : (h > 0 ? h + "h " + m + "m" : m + "m");
  }
  Array.prototype.forEach.call(document.querySelectorAll("#actTabs .pcat"), function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-sub"); if (k === sub) return; sub = k; A.haptic("light");
      Array.prototype.forEach.call(document.querySelectorAll("#actTabs .pcat"), function (x) { x.classList.toggle("on", x === b); });
      loadAct();
    });
  });
  function loadAct() { if (sub === "quests") loadQuests(); else loadDiary(); }

  function loadQuests() {
    var box = $("actBody"), key = "quests";
    if (!loaded[key]) empty(box, "Carico sfide e missioni…");
    if (busy[key]) return; busy[key] = true;
    A.api("/api/social/quests").then(function (j) {
      loaded[key] = true; setBadge((j.quests || []).filter(function (q) { return q.done && !q.claimed; }).length); if (sub !== "quests") return;
      box.innerHTML = "";
      var ch = j.challenge, card = el("div", "qcard"); card.appendChild(el("h3", "", "🎯 SFIDA DI GRUPPO"));
      if (ch.active) {
        var pct = Math.min(100, Math.floor(ch.spent * 100 / ch.goal));
        card.appendChild(el("div", "qtxt", "Spendete " + A.fmt(ch.goal) + " $SDG nei giochi: premio " + A.fmt(ch.reward) + " $SDG + Boost Fortuna a ogni partecipante."));
        var bar = el("div", "qbar"), fill = el("i"); fill.style.width = pct + "%"; bar.appendChild(fill); card.appendChild(bar);
        var m = el("div", "qmeta"); m.appendChild(el("span", "", A.fmt(ch.spent) + " / " + A.fmt(ch.goal) + " (" + pct + "%)"));
        m.appendChild(el("span", "", "👥 " + ch.players + " · ⏳ " + timeLeft(ch.end))); card.appendChild(m);
        if (ch.mine) card.appendChild(el("div", "qmeta", "Il tuo contributo: " + A.fmt(ch.mine) + " $SDG"));
      } else card.appendChild(el("div", "qtxt", "Nessuna sfida attiva al momento: la prossima partirà presto!"));
      box.appendChild(card);
      var q = el("div", "qcard"); q.appendChild(el("h3", "", "📋 MISSIONI DI OGGI"));
      if (!j.quests.length) q.appendChild(el("div", "qtxt", j.v2 ? "Nessuna missione disponibile." : "Le missioni sono riservate a chi ha la V2."));
      j.quests.forEach(function (x) {
        var row = el("div", "qrow"); row.style.marginTop = "8px";
        row.appendChild(el("div", "qk", x.kind === "sp" ? "🎮" : "⚔️"));
        var b = el("div", "qb"); b.appendChild(el("div", "qtxt", x.text));
        var pc = x.target ? Math.min(100, Math.floor(x.progress * 100 / x.target)) : 0;
        var bar2 = el("div", "qbar"), f2 = el("i"); f2.style.width = (x.done ? 100 : pc) + "%"; bar2.appendChild(f2); b.appendChild(bar2);
        b.appendChild(el("div", "qmeta", (x.done ? "Completata" : x.progress + x.unit + " / " + x.target + x.unit) + " · 🎁 " + x.reward + " $SDG"));
        row.appendChild(b);
        if (x.done && !x.claimed) {
          var btn = el("button", "qclaim", "RISCATTA"); btn.type = "button";
          btn.addEventListener("click", function () {
            if (btn.disabled) return; btn.disabled = true; A.haptic("med");
            A.api("/api/social/claim", "POST", { idx: x.idx }).then(function (r) {
              A.haptic("ok"); A.toast("🎁 +" + x.reward + " $SDG"); if (r.balance != null) A.setCoins(r.balance); loaded[key] = true; busy[key] = false; loadQuests();
            }, function (e) { btn.disabled = false; A.toast(errMsg(e)); });
          });
          row.appendChild(btn);
        } else if (x.done) row.appendChild(el("div", "qdone", "✅ riscattata"));
        q.appendChild(row);
      });
      q.appendChild(el("div", "qmeta", "🎮 single player · ⚔️ multiplayer · si rinnovano a mezzanotte")); q.lastChild.style.marginTop = "10px";
      box.appendChild(q);
    }).catch(function (e) { if (!loaded[key]) empty(box, errMsg(e)); else A.toast(errMsg(e)); })
      .then(function () { busy[key] = false; });
  }

  function loadDiary() {
    var box = $("actBody");
    if (!loaded.diary) empty(box, "Carico lo storico…");
    if (busy.diary) return; busy.diary = true;
    A.api("/api/social/diary").then(function (j) {
      loaded.diary = true; if (sub !== "history") return;
      box.innerHTML = "";
      var s = j.stats, sum = el("div", "pg-sum");
      [[(s.net_profit >= 0 ? "+" : "") + A.fmt(s.net_profit), "netto totale"], [A.fmt(s.casino_wins), "vittorie casinò"], [A.fmt(s.duels_wins), "duelli vinti"]].forEach(function (x) {
        var d = el("div"); d.appendChild(el("b", "", x[0])); d.appendChild(document.createTextNode(x[1])); sum.appendChild(d);
      });
      box.appendChild(sum);
      box.appendChild(speedBox());
      if (!j.history.length) { box.appendChild(el("div", "pg-empty", "Nessuna giocata registrata, per ora.")); return; }
      var ic = { vinta: "✅", persa: "❌", pareggio: "⚖️" };
      j.history.forEach(function (h) {
        var row = el("div", "row"); row.appendChild(el("div", "rk", ic[h.outcome] || "•"));
        var nm = el("div", "nm", h.game); nm.appendChild(el("small", "", when(h.t) + " · puntata " + A.fmt(h.bet) + " · incasso " + A.fmt(h.paid)));
        row.appendChild(nm);
        row.appendChild(el("div", "vl " + (h.net > 0 ? "win" : (h.net < 0 ? "lose" : "push")), (h.net > 0 ? "+" : "") + A.fmt(h.net)));
        box.appendChild(row);
      });
    }).catch(function (e) { if (!loaded.diary) empty(box, errMsg(e)); else A.toast(errMsg(e)); })
      .then(function () { busy.diary = false; });
  }

  // ---------- test di velocità (dal tuo telefono al bot) ----------
  function speedBox() {
    var wrap = el("div", "pg-speed"), btn = el("button", "pcat", "⚡ Test di velocità"), out = el("div", "pg-me", "");
    btn.type = "button";
    btn.addEventListener("click", function () {
      if (btn.disabled) return; btn.disabled = true; A.haptic("light");
      var N = 20, ts = [], fails = 0, i = 0;
      (function next() {
        if (i >= N) {
          btn.disabled = false;
          if (!ts.length) { out.textContent = "Nessuna risposta: server non raggiungibile."; return; }
          ts.sort(function (a, b) { return a - b; });
          var q = function (p) { return Math.round(ts[Math.min(ts.length - 1, Math.floor(ts.length * p))]); };
          out.textContent = "Risposta in ms — migliore " + q(0) + " · mediana " + q(0.5) + " · 95% sotto " + q(0.95) + " · peggiore " + q(1) + (fails ? " · errori: " + fails : "");
          return;
        }
        out.textContent = "Misuro… " + (i + 1) + "/" + N;
        var t0 = performance.now(); i++;
        A.api("/api/me").then(function () { ts.push(performance.now() - t0); }, function () { fails++; })
          .then(function () { setTimeout(next, 200); });
      })();
    });
    wrap.appendChild(btn); wrap.appendChild(out);
    return wrap;
  }

  // ---------- swipe laterale: la pagina segue il dito ----------
  var g = null, app = $("app");
  function W() { return app.clientWidth || innerWidth; }
  app.addEventListener("touchstart", function (e) {
    if (gameOpen() || e.touches.length !== 1) { g = null; return; }
    if (e.target.closest && e.target.closest(".pg-cats")) { g = null; return; }   // le categorie scorrono da sole
    g = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), lock: 0, base: ORDER.indexOf(cur) };
  }, { passive: true });
  app.addEventListener("touchmove", function (e) {
    if (!g) return;
    var t = e.touches[0], dx = t.clientX - g.x, dy = t.clientY - g.y;
    if (!g.lock) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.3) { g.lock = 1; clearTimeout(offTimer); document.body.setAttribute("data-tab", "other"); } else { g = null; return; }
    }
    pos = Math.max(0, Math.min(ORDER.length - 1, g.base - dx / W()));
    paint(pos, false);
  }, { passive: true });
  function endSwipe(e) {
    if (!g) return; var s = g; g = null; if (!s.lock) return;
    var t = (e.changedTouches && e.changedTouches[0]) || { clientX: s.x }, dx = t.clientX - s.x, v = dx / Math.max(1, Date.now() - s.t);
    var target = s.base;
    if (Math.abs(dx) > W() * 0.22 || Math.abs(v) > 0.45) target = s.base + (dx < 0 ? 1 : -1);
    target = Math.max(0, Math.min(ORDER.length - 1, target));
    show(ORDER[target], target !== s.base);
  }
  app.addEventListener("touchend", endSwipe, { passive: true });
  app.addEventListener("touchcancel", endSwipe, { passive: true });

  // il saldo nelle sezioni segue quello dell'hub
  new MutationObserver(syncCoins).observe($("pcoins"), { childList: true, characterData: true, subtree: true });
  window.ArcadeTabs = { show: show, refreshBadge: refreshBadge, setBadge: setBadge };
  setTimeout(refreshBadge, 1200);

  // ---------- tasto Indietro di Telegram (anche il tasto/gesto "indietro" del telefono) ----------
  (function () {
    var tg = A.tg; if (!tg || !tg.BackButton) return;
    var GB = { avi: "aviBack", gm: "gmBack", g4: "g4Back" };
    function openGame() { var r = null; Object.keys(GB).forEach(function (id) { var n = $(id); if (n && !n.hidden) r = id; }); return r; }
    function settingsOpen() { return !!(window.ArcadeSettingsUI && window.ArcadeSettingsUI.isOpen()); }
    function onBack() {
      if (settingsOpen()) { window.ArcadeSettingsUI.close(); return; }
      var g = openGame();
      if (g) { var b = $(GB[g]); if (b && b.disabled) A.toast("Termina prima la partita"); else if (b) b.click(); return; }
      if (cur !== "hub") show("hub", true);
    }
    function update() {
      try { if (openGame() || cur !== "hub" || settingsOpen()) tg.BackButton.show(); else tg.BackButton.hide(); } catch (e) {}
    }
    try { tg.BackButton.onClick(onBack); } catch (e) { return; }
    var mo = new MutationObserver(update);
    Object.keys(GB).forEach(function (id) { var n = $(id); if (n) mo.observe(n, { attributes: true, attributeFilter: ["hidden"] }); });
    mo.observe(document.body, { attributes: true, attributeFilter: ["data-tab"] });
    var st = $("settings"); if (st) mo.observe(st, { attributes: true, attributeFilter: ["hidden"] });
    setTimeout(function () { var st2 = $("settings"); if (st2) mo.observe(st2, { attributes: true, attributeFilter: ["hidden"] }); update(); }, 600);
    update();
  })();
})();
