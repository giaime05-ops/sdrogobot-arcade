/* Sdrogo Arcade – hub (Fase 1)
 * - legge i dati del giocatore dal bot (/api/me) con l'initData firmato da Telegram
 * - mostra nome, saldo, Banco e Follia
 * - le stazioni del saloon sono i giochi (per ora solo segnaposto: Aviator sarà il primo)
 */
(function () {
  "use strict";
  var CFG = window.ARCADE_CONFIG || {};
  var tg = (window.Telegram && window.Telegram.WebApp) || null;
  var inTelegram = !!(tg && tg.initData);

  var $ = function (id) { return document.getElementById(id); };

  // ---------- Giochi ----------
  var GAMES = {
    aviator:    { name: "Aviator",         ready: true },
    slot:       { name: "Slot 777",        ready: true },
    roulette:   { name: "Roulette",        ready: true },
    scratch:    { name: "Gratta e Vinci",  ready: true },
    wordle:     { name: "Wordle",          ready: true },
    mastermind: { name: "Mastermind",      ready: true },
    blackjack:  { name: "Blackjack",       ready: true },
    poker:      { name: "Poker",           ready: true },
    heist:      { name: "Sdrogo Heist",    ready: true }
  };

  // ---------- Utilità ----------
  function fmt(n) {
    n = Math.round(Number(n) || 0);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function haptic(kind) {
    try {
      if (!tg || !tg.HapticFeedback) return;
      if (window.ArcadeSettings && window.ArcadeSettings.vib === false) return;
      if (kind === "ok") tg.HapticFeedback.notificationOccurred("success");
      else if (kind === "bad") tg.HapticFeedback.notificationOccurred("error");
      else if (kind === "med") tg.HapticFeedback.impactOccurred("medium");
      else tg.HapticFeedback.impactOccurred("light");
    } catch (e) {}
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function sheet(title, text) {
    $("sheetTitle").textContent = title; $("sheetText").textContent = text; $("sheet").hidden = false;
  }
  $("sheetClose").addEventListener("click", function () { $("sheet").hidden = true; });

  // ---------- Telegram ----------
  if (tg) {
    try { tg.ready(); } catch (e) {}
    try { tg.expand(); } catch (e) {}
    try { tg.setHeaderColor("#0d0706"); tg.setBackgroundColor("#0d0706"); } catch (e) {}
    try { if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); } catch (e) {}
  }

  // ---------- Dati del giocatore ----------
  function pick(o, keys, dflt) {
    for (var i = 0; i < keys.length; i++) {
      var v = o && o[keys[i]];
      if (v !== undefined && v !== null) return v;
    }
    return dflt;
  }
  // Rende uniforme la risposta del server: se i nomi dei campi cambiano si corregge solo qui.
  function normalizeMe(j) {
    var u = pick(j, ["user", "player", "me"], null) || j || {};
    var eco = pick(j, ["economy", "economia"], null) || {};
    var banco = pick(j, ["banco", "banco_balance", "bank"], pick(eco, ["bank_balance", "banco", "banco_balance", "bank"], null));
    var follia = pick(j, ["follia", "follia_active", "madness"], pick(eco, ["follia_active", "follia", "madness"], null));
    if (banco && typeof banco === "object") {
      if (follia === null) follia = pick(banco, ["follia", "follia_active", "active"], null);
      banco = pick(banco, ["balance", "coins", "value", "saldo"], null);
    }
    if (follia && typeof follia === "object") follia = pick(follia, ["active", "on", "attiva"], false);
    return {
      name:   pick(u, ["name", "first_name", "nome", "display_name"], null),
      coins:  pick(u, ["coins", "balance", "saldo", "sdg"], pick(j, ["coins", "balance", "saldo"], null)),
      banco:  banco,
      follia: !!follia,
      daily:  !!pick(pick(j, ["daily"], {}), ["available"], false),
      admin:  !!(j && j.admin),
      badge:  (j && j.badge) || "",
      stars:  +(j && j.stars) || 0,
      stars_old: +(j && j.stars_old) || 0,
      isnew:  !!(j && j.new),
      style:  (j && j.style) || {},
      maint:  (j && j.maintenance) || "off"
    };
  }

  var tipT = null;
  function tip(anchor, text) {                              // piccolo fumetto sopra l'elemento, sparisce dopo 3 secondi
    var old = document.getElementById("miniTip"); if (old) old.remove(); clearTimeout(tipT);
    var t = document.createElement("div"); t.id = "miniTip"; t.className = "mini-tip"; t.textContent = text; document.body.appendChild(t);
    var r = anchor.getBoundingClientRect(), w = t.offsetWidth;
    t.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
    t.style.top = Math.max(8, r.top - t.offsetHeight - 8) + "px";
    tipT = setTimeout(function () { t.classList.add("off"); setTimeout(function () { t.remove(); }, 250); }, 3000);
  }
  function starEl(n, old) {
    var st = document.createElement("span"); st.className = "pstar" + (old ? " old" : "");
    st.innerHTML = '<svg viewBox="0 0 24 24"><path d="m12 2.6 2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6l-6 3.4 1.3-6.7-5-4.7 6.8-.8z"/></svg>' + (n > 1 ? "<b>" + n + "</b>" : "");
    var what = old ? "Sdrogo Heist V1" : "Sdrogo Heist V2";
    st.addEventListener("click", function (ev) { ev.stopPropagation(); haptic("light"); tip(st, n > 1 ? "Win " + what + " ×" + n : "Win " + what); });
    return st;
  }
  function badgeEl(b) {
    var wrap = document.createElement("span"); wrap.className = "bdgs";
    String(b || "").split(",").forEach(function (k) {
      k = k.trim(); if (!k) return;
      var e = document.createElement("span"); e.className = "bdg";
      if (k === "h5") {                                             // 5 vittorie nella vecchia Struggle Heist (V1)
        e.classList.add("h5"); e.title = "5 Win — Sdrogo Heist V1";
        e.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l2.2 5.6L20 8.3l-4.3 3.9L17 18l-5-3-5 3 1.3-5.8L4 8.3l5.8-.7z"/><circle cx="12" cy="21" r="1.6"/></svg>H5';
        e.addEventListener("click", function (ev) { ev.stopPropagation(); haptic("light"); tip(e, "5 Win — Sdrogo Heist V1"); });
      } else {
        e.title = "Sdrogobot v1 — Re del Casinò originale";
        e.addEventListener("click", function (ev) { ev.stopPropagation(); haptic("light"); tip(e, "Re del Casinò — Sdrogobot V1"); });
        e.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>V1';
      }
      wrap.appendChild(e);
    });
    return wrap;
  }

  // colore dell'avatar (per ora solo account admin di prova): scelto nel profilo, salvato sul telefono
  var AV = [
    { id: "viola", g: ["#ff6fc8", "#7a5cff"] }, { id: "nero", g: ["#15151c", "#3b3b4d"] }, { id: "rosso", g: ["#ff5a6e", "#a8102a"] },
    { id: "giallo", g: ["#ffe45a", "#e0a800"], fg: "#3a2a00" }, { id: "verde", g: ["#52ff9a", "#14a05a"] }, { id: "blu", g: ["#4d8bff", "#1c3fd0"] },
    { id: "azzurro", g: ["#35e6ff", "#2a6bff"] }, { id: "arancio", g: ["#ffb347", "#ff5a36"] }, { id: "argento", g: ["#f4f7fb", "#8e98aa"], fg: "#1b2230", cls: "av-metal" },
    { id: "smeraldo", g: ["#2cffa0", "#047a4a"], cls: "av-metal" }, { id: "neonfucsia", g: ["#2a0a2a", "#5a0a4e"], fg: "#ff4de0", cls: "av-neon" },
    { id: "neonviola", g: ["#14062e", "#2c0f6e"], fg: "#b97bff", cls: "av-neon" }, { id: "oro", g: ["#ffe27a", "#d9a94a"], fg: "#3a2600", cls: "av-metal" },
    { id: "notte", g: ["#2b2b3a", "#00ffd5"] }, { id: "tramonto", g: ["#ff9a3c", "#b0208a"], cls: "av-gr" }, { id: "oceano", g: ["#35e6ff", "#0a3fa8"], cls: "av-gr" }, { id: "lava", g: ["#ffd23b", "#c4160a"], cls: "av-gr" },
    { id: "aurora", g: ["#52ff9a", "#7a5cff"], cls: "av-gr" }, { id: "galassia", g: ["#2a0a5e", "#ff4dc8"], cls: "av-gal" },
    { id: "diamante", g: ["#e8fbff", "#7ad9ff"], fg: "#12315a", cls: "av-dia" }, { id: "arcobaleno", rb: true }
  ];
  function avStyle(c) { return c.rb ? "conic-gradient(#ff3b4e,#ffd23b,#2fd36f,#35e6ff,#a855f7,#ff3b4e)" : "linear-gradient(135deg," + c.g[0] + "," + c.g[1] + ")"; }
  // ---- personalizzazione profilo: salvata sul server, visibile a tutti (classifica, profili) ----
  var NAMEC = { nero: "#0b0b10", ciano: "#35e6ff", viola: "#c28bff", rosa: "#ff6fc8", verde: "#52ff9a", rosso: "#ff5a6e", arancio: "#ffb347", giallo: "#ffe45a", blu: "#4d8bff" };
  var NMFX = { argento: 1, smeraldo: 1, neonfucsia: 1, neonviola: 1, oro: 1, diamante: 1, tramonto: 1, oceano: 1, lava: 1, aurora: 1, galassia: 1 };
  var BARFX = { fiamme: 1, fiammeblu: 1, inferno: 1, fiammeverdi: 1, dragone: 1, leggenda: 1, onde: 1, vento: 1, tempesta: 1, aurora: 1 };
  function avById(id) { return AV.filter(function (c) { return c.id === id; })[0] || null; }
  function nameEl(text, st) {
    var n = document.createElement("span"); st = st || {};
    if (st.name === "arcobaleno" || NMFX[st.name]) {                              // effetti con testo sfumato: il testo sta dentro un guscio (che nei podi/barre diventa una pillola scura leggibile)
      n.className = "nm-c"; var i = document.createElement("span"); i.textContent = text; i.className = st.name === "arcobaleno" ? "nm-rb" : "nm-fx nm-" + st.name; n.appendChild(i); return n;
    }
    n.textContent = text;
    if (NAMEC[st.name]) { n.style.color = NAMEC[st.name]; n.className = "nm-c" + (st.name === "nero" ? " nm-dark" : ""); }
    return n;
  }
  function styleAvatar(av, st, letter) {
    if (!av) return; st = st || {};
    if (letter) av.textContent = letter;
    av.className = av.className.replace(/\b(fr|av)-\w+/g, "").replace(/\s+/g, " ").trim();
    if (st.frame) av.classList.add("fr-" + st.frame);
    var c = avById(st.av);
    av.style.background = c ? avStyle(c) : ""; av.style.color = c && c.fg ? c.fg : "";
    if (c && c.cls) av.classList.add(c.cls, "av-" + c.id);
  }
  function styleRow(row, st) { if (st && st.bar) { row.classList.add("bar-" + st.bar); if (BARFX[st.bar]) row.classList.add("bar-fx"); } }
  function applyAvatar() { styleAvatar($("avatar"), ME.style); }

  function render(me, opts) {
    opts = opts || {};
    ME.admin = !!me.admin; ME.isnew = !!me.isnew;
    try { if (window.Arcade3D && window.Arcade3D.setHeist) window.Arcade3D.setHeist(SBX || ME.isnew); } catch (e) {}
    var name = me.name || (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.first_name) || "Giocatore";
    ME.style = me.style || {}; maintBanner(me.maint);
    var pn = $("pname"); pn.textContent = ""; pn.appendChild(nameEl(name, ME.style));
    if (SBX) { me = Object.assign({}, me, { badge: "v1,h5", stars: Math.max(3, me.stars || 0), stars_old: Math.max(2, me.stars_old || 0) }); }     // account admin: badge e stelle sempre visibili, per provarli
    if (me.badge) pn.appendChild(badgeEl(me.badge));
    ME.stars = me.stars; ME.stars_old = me.stars_old; ME.badge = me.badge;
    if (me.stars_old > 0) pn.appendChild(starEl(me.stars_old, true));
    if (me.stars > 0) pn.appendChild(starEl(me.stars));
    $("avatar").textContent = (name.trim()[0] || "?").toUpperCase(); applyAvatar();
    $("pcoins").textContent = me.coins === null || me.coins === undefined ? "—" : fmt(me.coins);
    if (me.banco !== null && me.banco !== undefined) { $("bancoVal").textContent = fmt(me.banco); $("bancoChip").hidden = false; }
    $("folliaChip").hidden = !me.follia;
    $("wheelChip").hidden = !(me.daily && !opts.demo);
    $("demoChip").hidden = !opts.demo;
  }

  function showError(title, text, detail) {
    $("player").classList.add("err");
    $("pname").textContent = title;
    $("pcoins").textContent = "—";
    if (detail) { $("pdetail").textContent = detail; $("pdetail").hidden = false; }
    if (text) sheet(title, text);
  }

  function loadMe() {
    if (!inTelegram) {
      if (CFG.ALLOW_DEMO) {
        render({ name: "Giocatore Demo", coins: 12345, banco: 8420, follia: false }, { demo: true });
      } else {
        showError("Apri da Telegram", "Questa app funziona solo dentro Telegram.");
      }
      return;
    }
    var url = (CFG.API_BASE || "") + (CFG.ME_PATH || "/api/me");
    var init = {method: "GET", headers: {}, cache: "no-store"};
    if (CFG.AUTH_MODE === "xheader") init.headers["X-Telegram-Init-Data"] = tg.initData;
    else if (CFG.AUTH_MODE === "query") url += (url.indexOf("?") < 0 ? "?" : "&") + "initData=" + encodeURIComponent(tg.initData);
    else init.headers["Authorization"] = "tma " + tg.initData;

    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    if (ctrl) init.signal = ctrl.signal;

    fetch(url, init).then(function (r) {
      clearTimeout(timer);
      if (r.status === 401) throw { kind: "auth" };
      if (r.status === 403) throw { kind: "forbidden" };
      if (!r.ok) throw { kind: "http", status: r.status, url: url };
      return r.json();
    }).then(function (j) {
      render(normalizeMe(j));
    }).catch(function (e) {
      clearTimeout(timer);
      var k = e && e.kind;
      var detail = k === "http" ? ("Errore HTTP " + e.status + " da " + (CFG.API_BASE || "?"))
                 : (k ? "" : ("Nessuna risposta da " + (CFG.API_BASE || "?") + " (" + ((e && e.name) || "rete") + ")"));
      if (k === "forbidden") showError("Accesso riservato", "Questa mini app è ancora in costruzione: per ora è visibile solo all'amministratore.");
      else if (k === "auth") showError("Accesso non valido", "Non sono riuscito a verificare la tua identità. Chiudi e riapri l'app da Telegram.");
      else showError("Server non raggiungibile", "Non riesco a collegarmi al bot. Riprova tra poco.", detail);
      // il nome da Telegram resta visibile anche se il server non risponde
      try { var u = tg.initDataUnsafe.user; if (u && u.first_name) { $("avatar").textContent = u.first_name[0].toUpperCase(); } } catch (x) {}
    });
  }

  // ---------- Chiamate al bot (generiche, usate dai giochi) ----------
  var SBX = false, ME = { admin: false };
  function api(path, method, body) {
    var url = (CFG.API_BASE || "") + path;
    var init = { method: method || "GET", headers: {}, cache: "no-store" };
    if (body !== undefined) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
    if (SBX) init.headers["X-Arcade-Sandbox"] = "1";            // account admin di prova: il server lo accetta solo dall'admin
    if (CFG.AUTH_MODE === "xheader") init.headers["X-Telegram-Init-Data"] = tg.initData;
    else if (CFG.AUTH_MODE === "query") url += (url.indexOf("?") < 0 ? "?" : "&") + "initData=" + encodeURIComponent(tg.initData);
    else init.headers["Authorization"] = "tma " + tg.initData;
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    if (ctrl) init.signal = ctrl.signal;
    return fetch(url, init).then(function (r) {
      clearTimeout(timer);
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok && j && j.maintenance) showMaint(j.maintenance);
        if (!r.ok) { var e = new Error((j && j.error) || ("Errore " + r.status)); e.status = r.status; e.body = j; throw e; }
        return j;
      });
    }, function (e) { clearTimeout(timer); e.network = true; throw e; });
  }

  // manutenzione: graduale (avviso, si finisce la partita in corso) oppure totale (schermata bloccante, si chiude la mini app)
  function showMaint(mode, forced) {
    var ov = $("maint");
    if (!ov) { ov = document.createElement("div"); ov.id = "maint"; ov.className = "maint"; document.body.appendChild(ov); }
    var hard = mode === "hard" || forced;
    ov.innerHTML = '<div class="maint-card"><div class="maint-ic">🛠️</div><h2>SERVER IN MANUTENZIONE</h2><p>' +
      (hard ? "Il server è in manutenzione: riprova tra qualche minuto." : "Puoi finire la partita già iniziata, ma non cominciarne di nuove finché la manutenzione non è terminata.") +
      '</p><button type="button" class="set-ok">' + (hard ? "CHIUDI" : "OK") + '</button></div>';
    ov.hidden = false;
    ov.querySelector("button").onclick = function () { if (hard) { try { tg.close(); } catch (e) {} } else ov.hidden = true; };
  }
  function maintBanner(mode) {
    var b = $("maintBar");
    if (mode !== "soft") { if (b) b.hidden = true; return; }
    if (!b) { b = document.createElement("div"); b.id = "maintBar"; b.className = "maint-bar"; b.textContent = "🛠️ Manutenzione al termine di questa partita"; document.body.appendChild(b); }
    b.hidden = false;
  }

  // aggiorna in silenzio saldo, Banco e Follia dopo una partita
  function refreshMe() {
    if (!inTelegram) return Promise.resolve();
    return api(CFG.ME_PATH || "/api/me").then(function (j) { render(normalizeMe(j)); if (window.ArcadeTabs) window.ArcadeTabs.refreshBadge(); }).catch(function () {});
  }

  function setSandbox(on) {
    SBX = !!on && ME.admin;
    document.body.classList.toggle("sbx", SBX);
    var b = $("sbxBar"); if (b) b.hidden = !SBX;
    if (window.ArcadeTabs && window.ArcadeTabs.reset) window.ArcadeTabs.reset();
    try { if (window.Arcade3D && window.Arcade3D.setHeist) window.Arcade3D.setHeist(SBX || ME.isnew); } catch (e) {}
    return refreshMe();
  }

  window.Arcade = { newOn: function () { return !!(SBX || ME.isnew); }, tip: tip, avatars: AV, avStyle: avStyle, nameEl: nameEl, styleAvatar: styleAvatar, styleRow: styleRow, applyAvatar: applyAvatar, badgeEl: badgeEl, starEl: starEl, me: function () { return ME; }, api: api, setSandbox: setSandbox, isSandbox: function () { return SBX; }, isAdmin: function () { return ME.admin; }, fmt: fmt, haptic: haptic, toast: toast, inTelegram: inTelegram, refreshMe: refreshMe, tg: tg,
    setCoins: function (n) { $("pcoins").textContent = fmt(n); } };
  window.ArcadeGames = window.ArcadeGames || {};

  // ---------- Stazioni ----------
  function onStation(key, el) {
    var g = GAMES[key]; if (!g) return;
    if (el) { el.classList.add("press"); setTimeout(function () { el.classList.remove("press"); }, 140); }
    haptic("light");
    if (key === "heist" && !(SBX || ME.isnew)) return;                      // per ora solo nell'account admin di prova
    if (!g.ready) {
      if (g.note) sheet(g.name, g.note); else toast(g.name + ": in arrivo");
    } else if (window.ArcadeGames && window.ArcadeGames[key]) {
      window.ArcadeGames[key].open();
    } else {
      // il gioco è pronto ma il suo file non è stato caricato (o è vecchio): lo si dice chiaramente
      var file = key === "aviator" ? "aviator.js" : (["slot", "roulette", "scratch"].indexOf(key) >= 0 ? "games3.js" : (key === "heist" ? "heist.js" : "games4.js"));
      sheet(g.name, "Il gioco è pronto, ma manca il file " + file + " nel repo della mini app (o la pagina è ancora quella vecchia: chiudi e riapri l'app).");
    }
  }

  // il tocco sugli oggetti della sala 3D apre lo stesso gioco della stazione 2D
  window.Arcade3D = { onTap: function (key) { onStation(key, null); } };

  var stations = document.querySelectorAll(".station");
  Array.prototype.forEach.call(stations, function (el) {
    var key = el.getAttribute("data-game");
    if (GAMES[key] && !GAMES[key].ready) el.classList.add("soon");
    el.addEventListener("click", function () { onStation(key, el); });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStation(key, el); } });
  });

  $("wheelChip").addEventListener("click", function () {
    haptic("light");
    if (window.ArcadeGames && window.ArcadeGames.wheel) window.ArcadeGames.wheel.open();
    else sheet("Ruota Daily", "Manca il file games3.js nel repo della mini app.");
  });


  loadMe();
})();
