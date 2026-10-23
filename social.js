/* Sdrogo Arcade – sezioni: Casino (hub), Classifica, Diario.
 * La barra in basso sta SOTTO ai giochi (z-index minore): quando un gioco è aperto non si vede e non copre nulla.
 * Si cambia sezione toccando la barra oppure con uno swipe laterale (solo quando nessun gioco è aperto). */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  var $ = function (id) { return document.getElementById(id); };
  var ORDER = ["shop", "act", "hub", "mp", "lead"];
  var cur = "hub", cat = "coins", sub = "quests", loaded = {}, busy = {};
  var tabs = document.querySelectorAll(".tab");
  var views = { hub: $("pgHub"), lead: $("pgLead"), act: $("pgAct"), shop: $("pgShop"), mp: $("pgMp") };
  var pos = 2, offTimer = null, badgeBusy = false;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function gameOpen() { return ["avi", "gm", "g4", "heist"].some(function (id) { var n = $(id); return n && !n.hidden; }); }
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
  function setBadge(n, isNew) {
    var t = document.querySelector('.tab[data-tab="act"]'); if (!t) return;
    var d = t.querySelector(".dot");
    if (!n && !isNew) { if (d) d.remove(); return; }
    if (!d) { d = document.createElement("i"); d.className = "dot"; t.appendChild(d); }
    d.classList.toggle("new", !n); d.textContent = n ? String(n) : "";           // rosso con numero = premio da riscattare; azzurro vuoto = missioni nuove di oggi
  }
  // missioni nuove ogni giorno: pallino azzurro finché non apri Attività + un banner in alto la prima volta che entri
  function dayKey() { try { return new Date().toLocaleDateString("sv"); } catch (e) { return String(new Date().getDate()); } }
  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function questBanner() {
    var b = document.createElement("div"); b.className = "q-ban"; b.textContent = "🎯 Nuove missioni disponibili!";
    b.addEventListener("click", function () { b.remove(); show("act", true); }); document.body.appendChild(b);
    setTimeout(function () { b.classList.add("off"); setTimeout(function () { b.remove(); }, 400); }, 4200);
  }
  function refreshBadge() {
    if (!A.inTelegram || badgeBusy) return; badgeBusy = true;
    A.api("/api/social/quests").then(function (j) {
      var claim = (j.quests || []).filter(function (q) { return q.done && !q.claimed; }).length, day = dayKey(), has = (j.quests || []).length > 0;
      var fresh = has && lsGet("arc_q_seen") !== day;
      setBadge(claim, fresh);
      if (fresh && lsGet("arc_q_ban") !== day && cur !== "act") { lsSet("arc_q_ban", day); questBanner(); }
    }).catch(function () {}).then(function () { badgeBusy = false; loanBanner(); });
  }
  // saldo basso: avviso una volta al giorno con rimando al prestito del Banco (sezione Extra)
  function loanBanner() {
    if (!A.newOn() || lsGet("arc_l_ban") === dayKey() || cur === "act") return;
    A.api("/api/extra/loan", "POST", {}).then(function (l) {
      if (!l || !l.eligible || lsGet("arc_l_ban") === dayKey()) return;
      lsSet("arc_l_ban", dayKey());
      var b = document.createElement("div"); b.className = "q-ban warn"; b.textContent = "⚠️ Stai finendo i soldi: chiedi un prestito al Banco (Extra)";
      b.addEventListener("click", function () { b.remove(); show("act", true); });
      document.body.appendChild(b);
      setTimeout(function () { b.classList.add("off"); setTimeout(function () { b.remove(); }, 400); }, 6000);
    }).catch(function () {});
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
    if (name === "act") { loadAct(); lsSet("arc_q_seen", dayKey()); refreshBadge(); }
    if (name === "shop" && window.ArcadeShop) window.ArcadeShop.load();
    if (name === "mp" && window.ArcadeMulti) window.ArcadeMulti.load();
    if (name === "hub") { A.refreshMe(); refreshBadge(); }
  }
  views.mp.style.transform = "translate3d(100%,0,0)"; views.lead.style.transform = "translate3d(200%,0,0)"; views.act.style.transform = "translate3d(-100%,0,0)"; views.shop.style.transform = "translate3d(-200%,0,0)";
  document.body.setAttribute("data-tab", "hub");
  Array.prototype.forEach.call(tabs, function (t) { t.addEventListener("click", function () {
    var n = t.getAttribute("data-tab");
    if (n === "mp") A.toast("Multiplayer: in arrivo!");
    show(n, true);
  }); });

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
      j.top.forEach(function (r) {
        var row = el("div", "row" + (r.rank <= 3 ? " r" + r.rank : "") + (r.me ? " me" : ""));
        var rst = r.me && !r.style ? (A.me().style || {}) : (r.style || {});
        row.appendChild(el("div", "rk", String(r.rank)));
        var rav = el("div", "avatar rav"); A.styleAvatar(rav, rst, (r.name || "?").charAt(0).toUpperCase()); row.appendChild(rav);
        A.styleRow(row, rst);
        var nm = el("div", "nm"); nm.appendChild(A.nameEl(r.name + (r.me ? " (tu)" : ""), rst)); if (r.badge && A.badgeEl) nm.appendChild(A.badgeEl(r.badge));
        row.appendChild(nm);
        row.appendChild(el("div", "vl", A.fmt(r.value) + " " + j.unit));
        row.classList.add("tappable"); row.addEventListener("click", function () { openOther(r); });
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
  function loadAct() { if (sub === "quests") loadQuests(); else if (sub === "extra") { if (window.ArcadeExtra) window.ArcadeExtra.load($("actBody")); } else loadDiary(); }

  function loadQuests() {
    var box = $("actBody"), key = "quests";
    if (!loaded[key]) empty(box, "Carico sfide e missioni…");
    if (busy[key]) return; busy[key] = true;
    A.api("/api/social/quests").then(function (j) {
      loaded[key] = true; setBadge((j.quests || []).filter(function (q) { return q.done && !q.claimed; }).length); if (sub !== "quests") return;
      box.innerHTML = "";
      var ch = j.challenge, card = el("div", "qcard grp"); card.appendChild(el("h3", "", "🎯 SFIDA DI GRUPPO"));
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


  // ---------- profilo personale (si apre toccando la barra col nome) ----------
  function profOv() {
    var ov = $("profile");
    if (!ov) {
      ov = el("div", "set-ov"); ov.id = "profile"; ov.hidden = true;
      ov.addEventListener("click", function (e) { if (e.target === ov) closeProfile(); });
      document.getElementById("app").appendChild(ov);
    }
    return ov;
  }
  profOv();
  function openProfile(other) {
    var ov = profOv();
    ov.innerHTML = ""; var card = el("div", "set-card prof-card");
    card.appendChild(el("h2", "", "PORTAFOGLIO E PROFILO"));
    var head = el("div", "prof-head"); head.appendChild(el("div", "avatar", ($("avatar") && $("avatar").textContent) || "?"));
    var wh = el("div", "prof-who"); var nb = el("b", "", ""), pnEl = $("pname");
    if (other) { card.querySelector("h2").textContent = "PROFILO GIOCATORE"; head.firstChild.textContent = (other.name || "?").charAt(0).toUpperCase(); }
    nb.appendChild(A.nameEl(other ? other.name : (pnEl && pnEl.firstChild ? pnEl.firstChild.textContent : ""), other ? other.style : A.me().style));
    var mm = other ? { badge: other.badge, stars: other.stars } : (A.me ? A.me() : {}); if (mm.badge && A.badgeEl) nb.appendChild(A.badgeEl(mm.badge)); if (mm.stars > 0 && A.starEl) nb.appendChild(A.starEl(mm.stars));
    wh.appendChild(nb);
    var bl = el("span", "", ""); bl.appendChild(el("i", "ci")); bl.appendChild(document.createTextNode(" " + (other ? (other.balance != null ? A.fmt(other.balance) : "—") : ($("pcoins") ? $("pcoins").textContent : "—")) + " $SDG"));
    wh.appendChild(bl); head.appendChild(wh); card.appendChild(head);
    var pst = other ? (other.style || {}) : (A.me().style || {});
    A.styleAvatar(head.firstChild, pst);
    if (!other && A.newOn && A.newOn()) {   // personalizzazione: solo account admin di prova
      var eb = el("button", "set-ok prof-edit", "✨ MODIFICA PROFILO"); eb.type = "button";
      eb.addEventListener("click", function () { A.haptic("light"); editProfile(function () { openProfile(); }); });
      card.appendChild(eb);
    }
    var grid = el("div", "pg-sum"); card.appendChild(grid);
    var tail = el("div"); card.appendChild(tail);
    var btns = el("div", "prof-btns");
    var inv = el("button", "set-ok prof-inv", "INVENTARIO"); inv.type = "button";
    inv.addEventListener("click", function () { closeProfile(); if (window.ArcadeShop) window.ArcadeShop.openInventory(); });
    var ok = el("button", "set-ok prof-close", "CHIUDI"); ok.type = "button"; ok.addEventListener("click", closeProfile);
    if (!other) btns.appendChild(inv); btns.appendChild(ok); card.appendChild(btns);
    if (!other) card.appendChild(speedBox());
    ov.appendChild(card); ov.hidden = false;
    grid.appendChild(el("div", "pg-empty", "Carico…"));
    var req = other ? Promise.resolve(other) : A.api("/api/social/wallet");
    req.then(function (w) {
      grid.innerHTML = "";
      var net = (w.net_profit >= 0 ? "+" : "−") + A.fmt(Math.abs(w.net_profit));
      [[net, "profitto netto"], [A.fmt(w.casino_wins), "vittorie casinò"],
       [A.fmt(w.quizzes_won), "quiz vinti"], [A.fmt(w.duels_wins), "duelli vinti"], [w.wr_single + "%", "win rate single player"],
       [w.wr_duels + "%", "win rate duelli"]].forEach(function (x) {
        var d = el("div"); d.appendChild(el("b", "", x[0])); d.appendChild(document.createTextNode(x[1])); grid.appendChild(d);
      });
      if (!other) {
        var wd = el("div", "prof-wheel");
        wd.appendChild(el("b", "", "Ruota Daily"));
        wd.appendChild(document.createTextNode(" " + (w.wheel_available ? "disponibile oggi!" : "già girata oggi: torna domani")));
        grid.parentNode.insertBefore(wd, btns);
      }
    }).catch(function (e) { grid.innerHTML = ""; grid.appendChild(el("div", "pg-empty", errMsg(e))); });
  }
  // ---------- Modifica profilo (colori nome/avatar, cornice, barra classifica) ----------
  // [id, nome]: i requisiti di sblocco arrivano dal server (portafoglio.style_req), così c'è una sola fonte. Senza requisito = libero.
  var KIT = {
    name: { title: "COLORE NOME", items: [["", "Bianco"], ["viola", "Viola"], ["rosso", "Rosso"], ["ciano", "Ciano"], ["rosa", "Rosa"], ["verde", "Verde"], ["giallo", "Giallo"], ["blu", "Blu"], ["arancio", "Arancio"],
      ["argento", "Argento"], ["smeraldo", "Smeraldo"], ["neonfucsia", "Neon fucsia"], ["neonviola", "Neon viola"], ["oro", "Oro"], ["tramonto", "Tramonto"], ["oceano", "Oceano"], ["lava", "Lava"],
      ["aurora", "Aurora"], ["galassia", "Galassia"], ["diamante", "Diamante"], ["arcobaleno", "Arcobaleno"]] },
    av: { title: "COLORE AVATAR", items: [["", "Base"], ["rosso", "Rosso"], ["blu", "Blu"], ["nero", "Nero"], ["giallo", "Giallo"], ["verde", "Verde"], ["azzurro", "Azzurro"], ["arancio", "Arancio"],
      ["argento", "Argento"], ["smeraldo", "Smeraldo"], ["neonfucsia", "Neon fucsia"], ["neonviola", "Neon viola"], ["notte", "Notte"], ["tramonto", "Tramonto"], ["oceano", "Oceano"], ["lava", "Lava"],
      ["aurora", "Aurora"], ["galassia", "Galassia"], ["oro", "Oro"], ["diamante", "Diamante"], ["arcobaleno", "Arcobaleno"]] },
    frame: { title: "CORNICE", items: [["", "Nessuna"], ["neon", "Viola"], ["bianco", "Bianco"], ["ghiaccio", "Ghiaccio"], ["fuoco", "Fuoco"], ["argento", "Argento"], ["smeraldo", "Smeraldo"],
      ["onde", "Onde"], ["vento", "Vento"], ["elettrico", "Elettrico"], ["neonfucsia", "Neon fucsia"], ["galassia", "Galassia"], ["oro", "Oro"], ["diamante", "Diamante"], ["arcobaleno", "Arcobaleno"]] },
    bar: { title: "BARRA IN CLASSIFICA", items: [["", "Classica"], ["viola", "Viola"], ["ciano", "Ciano"], ["fiamme", "Fiamme"], ["onde", "Onde"], ["fiammeblu", "Fiamme blu"], ["vento", "Vento"],
      ["inferno", "Inferno"], ["tempesta", "Tempesta"], ["fiammeverdi", "Fiamme verdi"], ["aurora", "Aurora"], ["dragone", "Dragone"], ["leggenda", "Leggenda"]] }
  };
  function statOf(w, key) {
    if (key.indexOf("gw:") === 0) return (w.game_wins || {})[key.slice(3)] || 0;
    if (key.indexOf("st:") === 0) return (w.stats || {})[key.slice(3)] || 0;
    return w[key] || 0;
  }
  function preview(k, id) {
    var st = {}; if (id) st[k] = id;
    if (k === "name") { var w = el("span", "pe-pv"); w.appendChild(A.nameEl("Aa", st)); return w; }
    if (k === "bar") { var r = el("div", "row pe-mini"); A.styleRow(r, st); return r; }
    var a = el("div", "avatar rav pe-av"); A.styleAvatar(a, st, "A"); return a;
  }
  function editProfile(done) {
    var ov = profOv(); ov.innerHTML = ""; var card = el("div", "set-card prof-card pe-card");
    card.appendChild(el("h2", "", "MODIFICA PROFILO"));
    var cur = Object.assign({}, A.me().style || {});
    var prev = el("div", "row pe-prev"), pav = el("div", "avatar rav"), pnm = el("div", "nm"), pvl = el("div", "vl", "1.234 $SDG");
    prev.appendChild(el("div", "rk", "4")); prev.appendChild(pav); prev.appendChild(pnm); prev.appendChild(pvl); card.appendChild(prev);
    var nameTxt = ($("pname") && $("pname").firstChild ? $("pname").firstChild.textContent : "Tu");
    function paint() {
      pav.className = "avatar rav"; A.styleAvatar(pav, cur, (nameTxt || "?").charAt(0).toUpperCase());
      prev.className = "row pe-prev"; A.styleRow(prev, cur); pnm.innerHTML = ""; pnm.appendChild(A.nameEl(nameTxt, cur));
    }
    var isAd = !!(A.isAdmin && A.isAdmin());
    var hint = el("div", "av-hint", isAd ? "Account di prova: 🔒 = bloccato per i giocatori, tu puoi provarlo lo stesso. Tocca un 🔒 per vedere come si sblocca." : "Tocca un oggetto 🔒 per vedere come si sblocca.");
    A.api("/api/social/wallet").then(function (w) { KIT._w = w; build(); }).catch(function () { KIT._w = {}; build(); });
    var box = el("div", "pe-accs"); card.appendChild(box);
    var openK = {};
    function build() {
      box.innerHTML = "";
      Object.keys(KIT).forEach(function (k) {
        if (k === "_w") return;
        var sec = KIT[k], w = KIT._w || {}, req = w.style_req || {};
        var wrap = el("div", "pe-acc" + (openK[k] ? " open" : "")), head = el("button", "pe-acc-h"); head.type = "button";
        var cur0 = cur[k] ? (sec.items.filter(function (x) { return x[0] === cur[k]; })[0] || [0, ""])[1] : sec.items[0][1];
        head.appendChild(el("b", "", sec.title)); head.appendChild(el("span", "pe-acc-v", cur0)); head.appendChild(el("i", "pe-acc-c", "▾"));
        var bodyW = el("div", "pe-acc-b"), row = el("div", "pe-row"); bodyW.appendChild(row);
        head.addEventListener("click", function () {
          A.haptic("light"); var o = !wrap.classList.contains("open"); openK[k] = o; wrap.classList.toggle("open", o);
          bodyW.style.maxHeight = o ? row.scrollHeight + 16 + "px" : "0px";
        });
        sec.items.forEach(function (it) {
          var rq = req[k + "." + it[0]], locked = !!rq && statOf(w, rq[0]) < rq[1];
          var b = el("button", "pe-sw pe-" + k + (cur[k] === it[0] || (!cur[k] && !it[0]) ? " on" : "") + (locked ? " lock" : "")); b.type = "button";
          b.appendChild(preview(k, it[0])); b.appendChild(el("i", "", it[1]));
          b.addEventListener("click", function () {
            if (locked) { A.tip(b, "🔒 " + it[1] + ": " + rq[2]); A.haptic("light"); if (!isAd) return; }
            else if (rq) A.tip(b, "✅ " + it[1] + " sbloccato: " + rq[2]);
            if (it[0]) cur[k] = it[0]; else delete cur[k];
            Array.prototype.forEach.call(row.children, function (x) { x.classList.toggle("on", x === b); }); head.querySelector(".pe-acc-v").textContent = it[1]; paint(); A.haptic("light");
          });
          row.appendChild(b);
        });
        wrap.appendChild(head); wrap.appendChild(bodyW); box.appendChild(wrap);
        if (openK[k]) bodyW.style.maxHeight = "2000px";
      });
      paint();
    }
    card.appendChild(hint);
    var btns = el("div", "prof-btns"), sv = el("button", "set-ok prof-inv", "SALVA"), no = el("button", "set-ok prof-close", "ANNULLA");
    sv.type = no.type = "button";
    sv.addEventListener("click", function () {
      sv.disabled = true;
      A.api("/api/social/style", "POST", cur).then(function (j) { var m = A.me(); m.style = j.style || {}; A.applyAvatar(); A.refreshMe(); A.toast("Profilo aggiornato"); done(); })
        .catch(function (e) { sv.disabled = false; A.toast(errMsg(e)); });
    });
    no.addEventListener("click", function () { done(); });
    btns.appendChild(sv); btns.appendChild(no); card.appendChild(btns);
    ov.appendChild(card); ov.hidden = false;
  }
  function openOther(r) {
    A.haptic("light");
    if (r.me) { openProfile(); return; }
    A.api("/api/social/profile?pid=" + encodeURIComponent(r.pid || "")).then(function (j) { openProfile(j); })
      .catch(function (e) { A.toast(errMsg(e)); });
  }
  function closeProfile() { var ov = $("profile"); if (ov) ov.hidden = true; }
  (function () { var p = $("player"); if (p) { p.classList.add("tappable"); p.addEventListener("click", function () { A.haptic("light"); openProfile(); }); } })();

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
    target = Math.max(0, Math.min(ORDER.length - 1, target));
    show(ORDER[target], target !== s.base);
  }
  app.addEventListener("touchend", endSwipe, { passive: true });
  app.addEventListener("touchcancel", endSwipe, { passive: true });

  // il saldo nelle sezioni segue quello dell'hub
  new MutationObserver(syncCoins).observe($("pcoins"), { childList: true, characterData: true, subtree: true });
  function reset() {                      // cambio account (normale <-> prova): tutto da ricaricare
    loaded = {}; busy = {}; setBadge(0);
    if (window.ArcadeShop) window.ArcadeShop.reset();
    if (cur === "lead") loadLead(); else if (cur === "act") loadAct(); else if (cur === "shop" && window.ArcadeShop) window.ArcadeShop.load();
    refreshBadge();
  }
  window.ArcadeTabs = { show: show, refreshBadge: refreshBadge, setBadge: setBadge, reset: reset, current: function () { return cur; } };
  setTimeout(refreshBadge, 1200);

  // ---------- tasto Indietro di Telegram (anche il tasto/gesto "indietro" del telefono) ----------
  (function () {
    var tg = A.tg; if (!tg || !tg.BackButton) return;
    var GB = { avi: "aviBack", gm: "gmBack", g4: "g4Back", heist: "hsBack" };
    function openGame() { var r = null; Object.keys(GB).forEach(function (id) { var n = $(id); if (n && !n.hidden) r = id; }); return r; }
    function settingsOpen() { return !!(window.ArcadeSettingsUI && window.ArcadeSettingsUI.isOpen()); }
    function onBack() {
      var pv = $("profile"); if (pv && !pv.hidden) { closeProfile(); return; }
      if (settingsOpen()) { window.ArcadeSettingsUI.close(); return; }
      var g = openGame();
      if (g) { var b = $(GB[g]); if (b && b.disabled) A.toast("Termina prima la partita"); else if (b) b.click(); return; }
      if (cur !== "hub") show("hub", true);
    }
    function update() {
      try { var pv = $("profile"); if (openGame() || cur !== "hub" || settingsOpen() || (pv && !pv.hidden)) tg.BackButton.show(); else tg.BackButton.hide(); } catch (e) {}
    }
    try { tg.BackButton.onClick(onBack); } catch (e) { return; }
    var mo = new MutationObserver(update);
    Object.keys(GB).forEach(function (id) { var n = $(id); if (n) mo.observe(n, { attributes: true, attributeFilter: ["hidden"] }); });
    mo.observe(document.body, { attributes: true, attributeFilter: ["data-tab"] });
    var pv0 = $("profile"); if (pv0) mo.observe(pv0, { attributes: true, attributeFilter: ["hidden"] });
    var st = $("settings"); if (st) mo.observe(st, { attributes: true, attributeFilter: ["hidden"] });
    setTimeout(function () { ["settings", "adminpg"].forEach(function (id) { var st2 = $(id); if (st2) mo.observe(st2, { attributes: true, attributeFilter: ["hidden"] }); }); update(); }, 600);
    update();
  })();
})();
