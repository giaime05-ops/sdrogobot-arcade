/* Sdrogo Arcade – sezioni: Saloon (hub), Classifica, Diario.
 * La barra in basso sta SOTTO ai giochi (z-index minore): quando un gioco è aperto non si vede e non copre nulla.
 * Si cambia sezione toccando la barra oppure con uno swipe laterale (solo quando nessun gioco è aperto). */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  var $ = function (id) { return document.getElementById(id); };
  var ORDER = ["hub", "lead", "diary"];
  var cur = "hub", cat = "coins", loaded = {}, busy = {};
  var tabs = document.querySelectorAll(".tab");

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function gameOpen() { return ["avi", "gm", "g4"].some(function (id) { var n = $(id); return n && !n.hidden; }); }
  function syncCoins() {
    var v = $("pcoins") ? $("pcoins").textContent : "—";
    Array.prototype.forEach.call(document.querySelectorAll(".pgcoins"), function (n) { n.textContent = v; });
  }
  function errMsg(e) { return e && e.network ? "Server non raggiungibile." : ((e && e.message) || "Errore."); }
  function empty(box, t) { box.innerHTML = ""; box.appendChild(el("div", "pg-empty", t)); }

  function show(name, fromUser) {
    if (ORDER.indexOf(name) < 0) return;
    cur = name;
    if (name !== "lead") cat = "coins";                 // uscendo dalla classifica, al ritorno si riparte dai Ricconi
    $("pgLead").hidden = name !== "lead";
    $("pgDiary").hidden = name !== "diary";
    Array.prototype.forEach.call(tabs, function (t) { t.classList.toggle("on", t.getAttribute("data-tab") === name); });
    if (fromUser) A.haptic("light");
    syncCoins();
    if (name === "lead") loadLead();
    if (name === "diary") loadDiary();
    if (name === "hub") A.refreshMe();
  }
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

  // ---------- diario ----------
  function when(ts) {
    var d = new Date(ts * 1000), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function loadDiary() {
    var box = $("diaryBody");
    if (!loaded.diary) empty(box, "Carico il diario…");
    if (busy.diary) return; busy.diary = true;
    A.api("/api/social/diary").then(function (j) {
      loaded.diary = true; box.innerHTML = "";
      var s = j.stats, sum = el("div", "pg-sum");
      [[(s.net_profit >= 0 ? "+" : "") + A.fmt(s.net_profit), "netto totale"], [A.fmt(s.casino_wins), "vittorie casinò"], [A.fmt(s.duels_wins), "duelli vinti"]].forEach(function (x) {
        var d = el("div"); d.appendChild(el("b", "", x[0])); d.appendChild(document.createTextNode(x[1])); sum.appendChild(d);
      });
      box.appendChild(sum);
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

  // ---------- swipe laterale ----------
  var sx = 0, sy = 0, st = 0, on = false;
  var app = $("app");
  app.addEventListener("touchstart", function (e) {
    if (gameOpen() || e.touches.length !== 1) { on = false; return; }
    if (e.target.closest && e.target.closest(".pg-cats")) { on = false; return; }   // le categorie scorrono da sole
    on = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  app.addEventListener("touchend", function (e) {
    if (!on) return; on = false;
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || Date.now() - st > 700) return;
    var i = ORDER.indexOf(cur) + (dx < 0 ? 1 : -1);
    if (i >= 0 && i < ORDER.length) show(ORDER[i], true);
  }, { passive: true });

  // il saldo nelle sezioni segue quello dell'hub
  new MutationObserver(syncCoins).observe($("pcoins"), { childList: true, characterData: true, subtree: true });
  window.ArcadeTabs = { show: show };
})();
