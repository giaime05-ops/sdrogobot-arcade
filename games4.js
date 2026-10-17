/* Sdrogo Arcade – giochi a più mosse: Blackjack, Wordle, Mastermind, Poker.
 * Lo stato vero sta sul server (carte nascoste, parola e codice segreti): qui si mostra e si chiedono le mosse.
 * Se esci a metà partita il server la tiene per 5 minuti (poi rimborsa); riaprendo il gioco la riprendi.
 */
(function () {
  "use strict";
  var A = window.Arcade;
  if (!A) return;
  var $ = function (id) { return document.getElementById(id); };

  var root = $("g4"), stage = $("g4Stage"), elTitle = $("g4Title"), elBal = $("g4Bal"), elBack = $("g4Back"),
      elMsg = $("g4Msg"), elBets = $("g4Bets"), elPad = $("g4Pad"), elActs = $("g4Acts"), elNotes = $("g4Notes");

  var S = { game: null, busy: false, balance: 0, bet: 10 };
  var timers = [];
  try { var sb = parseInt(localStorage.getItem("g4_bet"), 10); if (sb > 0) S.bet = sb; } catch (e) {}

  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function setBalance(n) { S.balance = n; elBal.textContent = A.fmt(n); A.setCoins(n); }
  function showBal(n) { elBal.textContent = A.fmt(n); A.setCoins(n); }
  function msg(t, cls) { elMsg.textContent = t || ""; elMsg.className = "gm-msg" + (cls ? " " + cls : ""); }
  function notes(l) { elNotes.textContent = (l && l.length) ? l.join("  •  ") : ""; }
  function errText(e) { return e && e.network ? "Server non raggiungibile." : ((e && e.message) || "Errore."); }
  function setBusy(b) { S.busy = b; elBack.disabled = b; if (S.game) S.game.render(); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function sgn(n) { return (n >= 0 ? "+" : "") + A.fmt(n); }

  // ---------- barra delle puntate ----------
  function renderBets(bets, show) {
    elBets.innerHTML = ""; elBets.hidden = !show;
    if (!show) return;
    (bets || [10, 25, 50, 100]).forEach(function (v) {
      var b = el("button", "avi-bet" + (v === S.bet ? " on" : ""), v); b.type = "button"; b.disabled = S.busy;
      b.addEventListener("click", function () {
        S.bet = v; try { localStorage.setItem("g4_bet", String(v)); } catch (e) {}
        A.haptic("light"); S.game.render();
      });
      elBets.appendChild(b);
    });
  }
  // bottoni d'azione: [{t:"TESTO", cls:"alt|danger", on:fn, off:true}]
  function renderActs(list) {
    elActs.innerHTML = "";
    (list || []).forEach(function (a) {
      var b = el("button", "avi-go " + (a.cls || ""), a.t); b.type = "button"; b.disabled = !!(a.off || S.busy);
      b.addEventListener("click", function () { if (!S.busy) a.on(); });
      elActs.appendChild(b);
    });
  }

  // ---------- carte ----------
  var SUITS_BJ = ["♠", "♥", "♦", "♣"], SUITS_PK = ["♠", "♥", "♦", "♣"];
  function cardEl(label, suit, red) {
    var c = el("div", "pcard" + (red ? " red" : ""));
    c.appendChild(el("span", "r", label)); c.appendChild(el("span", "s", suit)); c.appendChild(el("span", "r2", label));
    return c;
  }
  function backEl() { return el("div", "pcard back"); }
  function emptyEl() { return el("div", "pcard empty"); }
  function pkRank(r) { return { 11: "J", 12: "Q", 13: "K", 14: "A" }[r] || String(r); }

  // ======================================================================
  //  BLACKJACK
  // ======================================================================
  var bj = {
    title: "🃏 BLACKJACK", st: null, P: [], D: [], hideDealer: false, res: null, dTot: null, dFinal: false,
    // le carte hanno solo il valore: il seme e le figure sono pura grafica, decisi una volta e conservati
    label: function (v, store, i) {
      if (store[i] && store[i].v === v) return store[i];
      var lab = v === 11 ? "A" : (v === 10 ? ["10", "J", "Q", "K"][Math.floor(Math.random() * 4)] : String(v));
      var s = Math.floor(Math.random() * 4);
      return (store[i] = { v: v, lab: lab, suit: SUITS_BJ[s], red: s === 1 || s === 2 });
    },
    sync: function (list, store) { for (var i = 0; i < list.length; i++) bj.label(list[i], store, i); store.length = list.length; },
    build: function () {
      stage.innerHTML = '<div class="who2">BANCO <span class="tot" id="bjDT">–</span></div><div class="hand" id="bjD"></div>' +
        '<div class="gm-hint" id="bjHint">Charlie: 5 carte senza sballare = vittoria · Blackjack paga 3:2</div>' +
        '<div class="who2">TU <span class="tot" id="bjPT">–</span></div><div class="hand" id="bjP"></div>';
      bj.P = []; bj.D = []; bj.res = null;
    },
    draw: function () {
      var dh = $("bjD"), ph = $("bjP"); if (!dh) return;
      dh.innerHTML = ""; ph.innerHTML = "";
      var st = bj.st || {};
      var player = bj.res ? bj.res.player : (st.player || []);
      var dealer = bj.res ? bj.res.dealer : (st.dealer || []);
      bj.sync(player, bj.P); bj.sync(dealer, bj.D);
      bj.D.slice(0, bj.dShown != null ? bj.dShown : bj.D.length).forEach(function (c) { dh.appendChild(cardEl(c.lab, c.suit, c.red)); });
      if (!bj.res && st.active) dh.appendChild(backEl());
      bj.P.forEach(function (c) { ph.appendChild(cardEl(c.lab, c.suit, c.red)); });
      $("bjPT").textContent = bj.res ? bj.res.player_total : (st.total != null ? st.total : "–");
      var dt = "–";
      if (bj.res && bj.dFinal) dt = bj.res.dealer_total;
      else if (bj.D.length) dt = bj.D[0].v === 11 ? 11 : bj.D[0].v;
      $("bjDT").textContent = dt;
    },
    render: function () {
      var st = bj.st || {}, active = !!st.active && !bj.res;
      renderBets(st.bets, !active && !S.busy);
      bj.draw();
      if (active) renderActs([{ t: "CARTA", on: bj.hit }, { t: "STAI", cls: "alt", on: bj.stand }]);
      else {
        var ok = S.balance >= S.bet && st.enabled !== false;
        renderActs([{ t: (bj.res ? "RIGIOCA  " : "DISTRIBUISCI  ") + S.bet + " $SDG", on: bj.start, off: !ok }]);
      }
    },
    apply: function (j) { if (j.state) { bj.st = j.state; if (typeof j.state.balance === "number") setBalance(j.state.balance); } },
    onOpen: function () {
      msg("Scegli la puntata e distribuisci.", "");
      A.api("/api/g/bj/state").then(function (j) {
        bj.apply(j); if (bj.st.active) msg("Hai una mano in corso: continua!", ""); bj.render();
      }).catch(function (e) { msg(errText(e), "lose"); });
    },
    start: function () {
      bj.res = null; bj.dShown = null; bj.dFinal = false; bj.P = []; bj.D = [];
      msg("", ""); notes([]); setBusy(true); A.haptic("med");
      A.api("/api/g/bj/start", "POST", { bet: S.bet }).then(function (j) {
        bj.apply(j); S.busy = false; elBack.disabled = false;
        if (j.result) bj.finish(j.result, false); else bj.render();
      }).catch(function (e) { msg(errText(e), "lose"); setBusy(false); });
    },
    hit: function () {
      setBusy(true); A.haptic("light");
      A.api("/api/g/bj/hit", "POST", {}).then(function (j) {
        bj.apply(j); S.busy = false; elBack.disabled = false;
        if (j.result) bj.finish(j.result, false); else bj.render();
      }).catch(function (e) { msg(errText(e), "lose"); setBusy(false); });
    },
    stand: function () {
      setBusy(true); A.haptic("light");
      A.api("/api/g/bj/stand", "POST", {}).then(function (j) {
        bj.apply(j); S.busy = false; bj.finish(j.result, true);
      }).catch(function (e) { msg(errText(e), "lose"); setBusy(false); });
    },
    finish: function (res, dealerPlays) {
      bj.res = res; bj.dFinal = false;
      var n = res.dealer.length;
      function done() {
        bj.dShown = null; bj.dFinal = true; bj.draw();
        var o = res.outcome, t;
        if (o === "blackjack") t = ["✨ BLACKJACK! " + sgn(res.net) + " $SDG", "win"];
        else if (o === "charlie") t = ["🖐️ CHARLIE! " + sgn(res.net) + " $SDG", "win"];
        else if (o === "win") t = ["🏆 Vittoria! " + sgn(res.net) + " $SDG", "win"];
        else if (o === "push") t = ["⚖️ Pareggio: puntata restituita.", ""];
        else if (o === "bust") t = ["💥 Sballato! " + sgn(res.net) + " $SDG", "lose"];
        else t = ["❌ Sconfitta " + sgn(res.net) + " $SDG", "lose"];
        msg(t[0], t[1]); A.haptic(t[1] === "win" ? "ok" : (t[1] === "lose" ? "bad" : "light"));
        setBalance(res.balance); notes(res.notes); S.busy = false; elBack.disabled = false; bj.render(); A.refreshMe();
      }
      if (!dealerPlays || n <= 1) { bj.draw(); S.busy = true; later(done, 450); return; }
      // il banco scopre la seconda carta e pesca, una alla volta
      S.busy = true; bj.dShown = 1; bj.draw();
      var k = 1;
      (function next() {
        bj.dShown = k + 1; bj.draw(); A.haptic("light"); k++;
        if (k < n) later(next, 650); else later(done, 650);
      })();
    }
  };

  // ======================================================================
  //  WORDLE
  // ======================================================================
  var KB = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  var wd = {
    title: "🔠 WORDLE", st: null, cur: "", rows: [], keyst: {}, res: null, rowEls: [],
    build: function () {
      stage.innerHTML = '<div class="wd-grid" id="wdGrid"></div><div class="gm-hint">Indovina la parola di 5 lettere in 5 tentativi.<br>Premio per tentativo (1°→5°): +50 · +40 · +30 · +20 · +10 $SDG</div>';
      var g = $("wdGrid"); wd.rowEls = [];
      for (var r = 0; r < 5; r++) {
        var row = el("div", "wd-row"), tiles = [];
        for (var c = 0; c < 5; c++) { var t = el("div", "wd-tile"); row.appendChild(t); tiles.push(t); }
        g.appendChild(row); wd.rowEls.push({ row: row, tiles: tiles });
      }
      wd.cur = ""; wd.keyst = {}; wd.res = null;
    },
    paintRows: function (animateLast) {
      var guesses = (wd.res ? wd.res.guesses : (wd.st && wd.st.guesses)) || [];
      wd.rowEls.forEach(function (R, i) {
        var g = guesses[i];
        R.tiles.forEach(function (t, c) {
          var wasMarked = /\b[GYB]\b/.test(t.className);
          if (g) {
            t.textContent = g.word[c];
            if (!(animateLast && i === guesses.length - 1)) t.className = "wd-tile " + g.marks[c];
          } else if (i === guesses.length && !wd.res) {
            t.textContent = wd.cur[c] || ""; t.className = "wd-tile" + (wd.cur[c] ? " fill" : "");
          } else { t.textContent = ""; t.className = "wd-tile"; }
        });
      });
      wd.keyst = {};
      guesses.forEach(function (g) {
        for (var i = 0; i < 5; i++) {
          var l = g.word[i], m = g.marks[i], o = wd.keyst[l];
          if (m === "G" || (m === "Y" && o !== "G") || (m === "B" && !o)) wd.keyst[l] = m;
        }
      });
    },
    renderPad: function () {
      elPad.innerHTML = "";
      var active = wd.st && wd.st.active && !wd.res;
      elPad.hidden = !active;
      if (!active) return;
      var kb = el("div", "kb");
      KB.forEach(function (row, ri) {
        var r = el("div", "kb-row");
        if (ri === 2) { var en = el("button", "key wide", "INVIO"); en.type = "button"; en.addEventListener("click", wd.submit); en.disabled = S.busy; r.appendChild(en); }
        row.split("").forEach(function (ch) {
          var k = el("button", "key " + (wd.keyst[ch] || ""), ch); k.type = "button"; k.disabled = S.busy;
          k.addEventListener("click", function () { if (!S.busy && wd.cur.length < 5) { wd.cur += ch; A.haptic("light"); wd.paintRows(); } });
          r.appendChild(k);
        });
        if (ri === 2) { var bs = el("button", "key wide", "⌫"); bs.type = "button"; bs.disabled = S.busy; bs.addEventListener("click", function () { wd.cur = wd.cur.slice(0, -1); wd.paintRows(); }); r.appendChild(bs); }
        kb.appendChild(r);
      });
      elPad.appendChild(kb);
    },
    render: function () {
      renderBets(null, false);
      wd.paintRows(false); wd.renderPad();
      var st = wd.st || {}, active = !!st.active && !wd.res;
      if (active) renderActs([]);
      else renderActs([{ t: (wd.res ? "NUOVA PARTITA  " : "INIZIA  ") + (st.cost || 10) + " $SDG", on: wd.start, off: S.balance < (st.cost || 10) || st.enabled === false }]);
    },
    apply: function (j) { if (j.state) { wd.st = j.state; if (typeof j.state.balance === "number") setBalance(j.state.balance); } },
    onOpen: function () {
      msg("", "");
      A.api("/api/g/wd/state").then(function (j) {
        wd.apply(j);
        msg(wd.st.active ? "Partita in corso: tentativo " + (wd.st.attempts + 1) + "/5" : (wd.st.enabled === false ? "Wordle non è disponibile." : "Premi INIZIA per giocare."), "");
        wd.render();
      }).catch(function (e) { msg(errText(e), "lose"); });
    },
    start: function () {
      setBusy(true); msg("", ""); notes([]); A.haptic("med");
      A.api("/api/g/wd/start", "POST", {}).then(function (j) {
        wd.res = null; wd.cur = ""; wd.apply(j); S.busy = false; elBack.disabled = false;
        msg("Tentativo " + ((wd.st.attempts || 0) + 1) + "/5", ""); wd.render();
      }).catch(function (e) { msg(errText(e), "lose"); setBusy(false); });
    },
    submit: function () {
      if (S.busy) return;
      if (wd.cur.length < 5) { msg("Servono 5 lettere.", "lose"); wd.shake(); return; }
      var word = wd.cur; setBusy(true); msg("", "");
      A.api("/api/g/wd/guess", "POST", { word: word }).then(function (j) {
        var prev = (wd.st.guesses || []).length;
        wd.apply(j); wd.cur = "";
        var guesses = j.result ? j.result.guesses : j.state.guesses;
        var idx = guesses.length - 1, g = guesses[idx], R = wd.rowEls[idx];
        wd.res = j.result || null;
        // rivela le lettere una alla volta
        wd.paintRows(true);
        R.tiles.forEach(function (t, c) {
          t.textContent = g.word[c];
          later(function () { t.className = "wd-tile flip " + g.marks[c]; }, c * 260);
        });
        later(function () {
          wd.paintRows(false);
          if (j.result) {
            var r = j.result;
            if (r.won) { msg("🎉 Esatto! +" + A.fmt(r.net) + " $SDG netti", "win"); A.haptic("ok"); }
            else { msg("💥 Game over: la parola era " + r.secret + " (-10 $SDG)", "lose"); A.haptic("bad"); }
            setBalance(r.balance); notes(r.notes); A.refreshMe();
          } else msg("Tentativo " + (j.state.attempts + 1) + "/5", "");
          S.busy = false; elBack.disabled = false; wd.render();
        }, 5 * 260 + 250);
      }).catch(function (e) {
        msg(errText(e), "lose"); wd.shake(); S.busy = false; elBack.disabled = false; wd.render();
        if (e && e.status === 409) wd.onOpen();
      });
    },
    shake: function () {
      var n = (wd.st && wd.st.guesses ? wd.st.guesses.length : 0), R = wd.rowEls[Math.min(n, 4)];
      if (!R) return; R.row.classList.remove("shake"); void R.row.offsetWidth; R.row.classList.add("shake"); A.haptic("bad");
    }
  };

  // ======================================================================
  //  MASTERMIND
  // ======================================================================
  var mm = {
    title: "🔐 MASTERMIND", st: null, cur: "", res: null,
    build: function () {
      stage.innerHTML = '<div class="mm-slots" id="mmSlots"></div><div class="mm-hist" id="mmHist"></div>' +
        '<div class="gm-hint">Codice segreto di 3 cifre tutte diverse, 5 tentativi.<br>🎯 giusta al posto giusto · 🔄 giusta ma altrove<br>Premio: +40 entro il 3° tentativo, +20 al 4° o 5°</div>';
      mm.cur = ""; mm.res = null;
    },
    paint: function () {
      var sl = $("mmSlots"); if (!sl) return;
      sl.innerHTML = "";
      for (var i = 0; i < 3; i++) sl.appendChild(el("div", "mm-slot", mm.cur[i] || ""));
      var h = $("mmHist"); h.innerHTML = "";
      var guesses = (mm.res ? mm.res.guesses : (mm.st && mm.st.guesses)) || [];
      guesses.forEach(function (g) {
        var line = el("div", "mm-line"); line.appendChild(el("b", "", g.code));
        line.appendChild(el("span", "", "🎯 " + g.hits + "   🔄 " + g.present));
        h.appendChild(line);
      });
      h.scrollTop = h.scrollHeight;
    },
    renderPad: function () {
      elPad.innerHTML = "";
      var active = mm.st && mm.st.active && !mm.res; elPad.hidden = !active;
      if (!active) return;
      var pad = el("div", "mm-pad");
      "1234567890".split("").forEach(function (d) {
        var k = el("button", "key", d); k.type = "button"; k.style.height = "44px"; k.style.fontSize = "19px";
        k.disabled = S.busy || mm.cur.length >= 3 || mm.cur.indexOf(d) >= 0;
        k.addEventListener("click", function () { mm.cur += d; A.haptic("light"); mm.paint(); mm.renderPad(); mm.renderActs(); });
        pad.appendChild(k);
      });
      elPad.appendChild(pad);
    },
    renderActs: function () {
      var st = mm.st || {}, active = !!st.active && !mm.res;
      if (active) renderActs([
        { t: "⌫", cls: "alt", on: function () { mm.cur = mm.cur.slice(0, -1); mm.paint(); mm.renderPad(); mm.renderActs(); }, off: !mm.cur.length },
        { t: "INVIA", on: mm.submit, off: mm.cur.length < 3 }]);
      else renderActs([{ t: (mm.res ? "NUOVA PARTITA  " : "INIZIA  ") + (st.cost || 10) + " $SDG", on: mm.start, off: S.balance < (st.cost || 10) || st.enabled === false }]);
    },
    render: function () { renderBets(null, false); mm.paint(); mm.renderPad(); mm.renderActs(); },
    apply: function (j) { if (j.state) { mm.st = j.state; if (typeof j.state.balance === "number") setBalance(j.state.balance); } },
    onOpen: function () {
      msg("", "");
      A.api("/api/g/mm/state").then(function (j) {
        mm.apply(j);
        msg(mm.st.active ? "Partita in corso: tentativo " + (mm.st.attempts + 1) + "/5" : "Premi INIZIA per giocare.", "");
        mm.render();
      }).catch(function (e) { msg(errText(e), "lose"); });
    },
    start: function () {
      setBusy(true); msg("", ""); notes([]); A.haptic("med");
      A.api("/api/g/mm/start", "POST", {}).then(function (j) {
        mm.res = null; mm.cur = ""; mm.apply(j); S.busy = false; elBack.disabled = false;
        msg("Tentativo " + ((mm.st.attempts || 0) + 1) + "/5", ""); mm.render();
      }).catch(function (e) { msg(errText(e), "lose"); setBusy(false); });
    },
    submit: function () {
      if (S.busy || mm.cur.length < 3) return;
      var code = mm.cur; setBusy(true);
      A.api("/api/g/mm/guess", "POST", { code: code }).then(function (j) {
        mm.apply(j); mm.cur = ""; mm.res = j.result || null; S.busy = false; elBack.disabled = false;
        if (j.result) {
          var r = j.result;
          if (r.won) { msg("🎉 Esatto! Il codice era " + r.secret + " · +" + A.fmt(r.net) + " $SDG netti", "win"); A.haptic("ok"); }
          else { msg("💥 Game over: il codice era " + r.secret + " (-10 $SDG)", "lose"); A.haptic("bad"); }
          setBalance(r.balance); notes(r.notes); A.refreshMe();
        } else msg("🎯 " + j.hits + "   🔄 " + j.present + "   ·   tentativo " + (j.state.attempts + 1) + "/5", "");
        mm.render();
      }).catch(function (e) {
        msg(errText(e), "lose"); S.busy = false; elBack.disabled = false; mm.render();
        if (e && e.status === 409) mm.onOpen();
      });
    }
  };

  // ======================================================================
  //  POKER
  // ======================================================================
  var pk = {
    title: "♠ POKER", st: null, res: null,
    build: function () {
      stage.innerHTML = '<div class="who2">BOT</div><div class="hand" id="pkB"></div>' +
        '<div class="pot" id="pkPot">—</div><div class="hand" id="pkT"></div>' +
        '<div class="who2" id="pkStreet">TU</div><div class="hand" id="pkP"></div>';
      pk.res = null;
    },
    cardOf: function (c) { var red = c.s === 1 || c.s === 2; return cardEl(pkRank(c.r), SUITS_PK[c.s], red); },
    draw: function () {
      var B = $("pkB"); if (!B) return;
      var T = $("pkT"), P = $("pkP"); B.innerHTML = ""; T.innerHTML = ""; P.innerHTML = "";
      var st = pk.st || {}, r = pk.res;
      var board = r ? r.board : (st.board || []), hole = r ? r.hole : (st.hole || []);
      if (r && r.hole_b) r.hole_b.forEach(function (c) { B.appendChild(pk.cardOf(c)); });
      else if (st.active || r) { B.appendChild(backEl()); B.appendChild(backEl()); }
      for (var i = 0; i < 5; i++) T.appendChild(board[i] ? pk.cardOf(board[i]) : emptyEl());
      hole.forEach(function (c) { P.appendChild(pk.cardOf(c)); });
      $("pkPot").textContent = r ? (r.outcome === "win" ? "Hai vinto " + A.fmt(r.paid) + " $SDG" : (r.outcome === "push" ? "Pareggio" : "Mano persa")) :
        (st.active ? "Piatto: " + A.fmt((st.pot_p || 0) + (st.pot_b || 0)) + " $SDG" : "Scegli la puntata e gioca");
      $("pkStreet").textContent = r ? (r.mine ? "TU · " + r.mine + "  vs  BOT · " + r.theirs : "TU") : (st.active ? "TU · " + (st.street_name || "") : "TU");
    },
    render: function () {
      var st = pk.st || {}, active = !!st.active && !pk.res;
      renderBets(st.bets, !active && !S.busy);
      pk.draw();
      if (active) {
        var L = { check: st.phase === "respond" ? "VEDI +" + st.bet : "PASSA", raise: "RILANCIA +" + st.bet, allin: "ALL-IN " + A.fmt(S.balance), fold: "LASCIA" };
        var C = { check: "", raise: "alt", allin: "alt", fold: "danger" };
        renderActs((st.actions || []).map(function (a) { return { t: L[a], cls: C[a], on: function () { pk.act(a); } }; }));
      } else {
        var ok = S.balance >= S.bet && st.enabled !== false;
        renderActs([{ t: (pk.res ? "NUOVA MANO  " : "GIOCA  ") + S.bet + " $SDG", on: pk.start, off: !ok }]);
      }
    },
    apply: function (j) { if (j.state) { pk.st = j.state; if (typeof j.state.balance === "number") setBalance(j.state.balance); } },
    onOpen: function () {
      msg("Texas Hold'em contro il bot: la puntata è anche l'importo di ogni rilancio.", "");
      A.api("/api/g/pk/state").then(function (j) {
        pk.apply(j); if (pk.st.active) msg(pk.st.footer || "Mano in corso: continua!", ""); pk.render();
      }).catch(function (e) { msg(errText(e), "lose"); });
    },
    start: function () {
      pk.res = null; msg("", ""); notes([]); setBusy(true); A.haptic("med");
      A.api("/api/g/pk/start", "POST", { bet: S.bet }).then(function (j) {
        pk.apply(j); S.busy = false; elBack.disabled = false; pk.render();
      }).catch(function (e) { msg(errText(e), "lose"); setBusy(false); });
    },
    act: function (a) {
      var seq = pk.st.seq; setBusy(true); A.haptic("light");
      A.api("/api/g/pk/act", "POST", { action: a, seq: seq }).then(function (j) {
        pk.apply(j); S.busy = false; elBack.disabled = false;
        if (j.result) pk.finish(j.result);
        else { msg(j.state.footer || "", ""); pk.render(); }
      }).catch(function (e) {
        S.busy = false; elBack.disabled = false; msg(errText(e), "lose");
        if (e && e.body && e.body.state) pk.apply({ state: e.body.state });
        pk.render();
      });
    },
    finish: function (r) {
      pk.res = r;
      var t;
      if (r.how === "fold") t = ["🏳️ Hai lasciato la mano: " + sgn(r.net) + " $SDG", "lose"];
      else if (r.how === "bot_fold") t = ["🏆 Il bot lascia! " + sgn(r.net) + " $SDG", "win"];
      else if (r.outcome === "win") t = ["🏆 Showdown vinto! " + sgn(r.net) + " $SDG", "win"];
      else if (r.outcome === "push") t = ["⚖️ Pareggio: ti torna quanto hai messo.", ""];
      else t = ["❌ Il bot vince lo showdown: " + sgn(r.net) + " $SDG", "lose"];
      msg(t[0], t[1]); A.haptic(t[1] === "win" ? "ok" : (t[1] === "lose" ? "bad" : "light"));
      setBalance(r.balance); notes(r.notes); pk.render(); A.refreshMe();
    }
  };

  // ---------- apertura / chiusura ----------
  function open(game) {
    if (!A.inTelegram) { A.toast("Apri da Telegram per giocare"); return; }
    clearTimers();
    S.game = game; S.busy = false;
    root.hidden = false; elTitle.textContent = game.title;
    msg("", ""); notes([]); elBets.hidden = true; elPad.innerHTML = ""; elActs.innerHTML = "";
    game.build();
    A.api("/api/me").then(function (j) { var u = j.user || {}; if (typeof u.balance === "number") { setBalance(u.balance); game.render(); } }).catch(function () {});
    game.render();
    game.onOpen();
  }
  function close() {
    if (S.busy) { A.toast("Aspetta un attimo…"); return; }
    var g = S.game;
    var live = g && ((g.st && g.st.active && !g.res));
    clearTimers(); S.game = null; root.hidden = true; stage.innerHTML = ""; elPad.innerHTML = ""; elActs.innerHTML = "";
    if (live) A.toast("Partita salvata: hai 5 minuti per riprenderla");
    A.refreshMe();
  }
  elBack.addEventListener("click", close);

  window.ArcadeGames.blackjack = { open: function () { open(bj); } };
  window.ArcadeGames.wordle = { open: function () { open(wd); } };
  window.ArcadeGames.mastermind = { open: function () { open(mm); } };
  window.ArcadeGames.poker = { open: function () { open(pk); } };
})();
