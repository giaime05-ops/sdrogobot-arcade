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
    poker:      { name: "Poker",           ready: true }
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
      stars:  +(j && j.stars) || 0
    };
  }

  function render(me, opts) {
    opts = opts || {};
    ME.admin = !!me.admin;
    var name = me.name || (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.first_name) || "Giocatore";
    var pn = $("pname"); pn.textContent = name;
    if (me.stars > 0) {                                       // Stelle Heist accanto al nome
      var st = document.createElement("span"); st.className = "pstar"; st.title = "Stelle Heist";
      st.innerHTML = '<svg viewBox="0 0 24 24"><path d="m12 2.6 2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6l-6 3.4 1.3-6.7-5-4.7 6.8-.8z"/></svg>' + (me.stars > 1 ? "<b>" + me.stars + "</b>" : "");
      pn.appendChild(st);
    }
    $("avatar").textContent = (name.trim()[0] || "?").toUpperCase();
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
        if (!r.ok) { var e = new Error((j && j.error) || ("Errore " + r.status)); e.status = r.status; e.body = j; throw e; }
        return j;
      });
    }, function (e) { clearTimeout(timer); e.network = true; throw e; });
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
    return refreshMe();
  }

  window.Arcade = { api: api, setSandbox: setSandbox, isSandbox: function () { return SBX; }, isAdmin: function () { return ME.admin; }, fmt: fmt, haptic: haptic, toast: toast, inTelegram: inTelegram, refreshMe: refreshMe, tg: tg,
    setCoins: function (n) { $("pcoins").textContent = fmt(n); } };
  window.ArcadeGames = window.ArcadeGames || {};

  // ---------- Stazioni ----------
  function onStation(key, el) {
    var g = GAMES[key]; if (!g) return;
    if (el) { el.classList.add("press"); setTimeout(function () { el.classList.remove("press"); }, 140); }
    haptic("light");
    if (!g.ready) {
      if (g.note) sheet(g.name, g.note); else toast(g.name + ": in arrivo");
    } else if (window.ArcadeGames && window.ArcadeGames[key]) {
      window.ArcadeGames[key].open();
    } else {
      // il gioco è pronto ma il suo file non è stato caricato (o è vecchio): lo si dice chiaramente
      var file = key === "aviator" ? "aviator.js" : (["slot", "roulette", "scratch"].indexOf(key) >= 0 ? "games3.js" : "games4.js");
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
