/* Multiplayer — PROTOTIPO visibile solo nell'Account admin (sandbox). Gli avversari sono simulati (bot): nessun dato reale viene toccato.
   Sfide 1v1 (Sasso-Carta-Forbici, Dadi, Alto/Basso, Tris, Roulette) e tavoli (Blackjack insieme, Poker Texas) da provare con i bot. */
(function () {
  "use strict";
  var A = window.Arcade, body = document.getElementById("mpBody");
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var st = { opp: null, game: "srf", bet: 50, rounds: 3, players: [] };
  var GAMES = [["srf", "✊ Sasso-Carta-Forbici", true], ["dadi", "🎲 Dadi", true], ["hl", "⬆️ Alto/Basso", true], ["tris", "❌ Tris", true],
    ["quiz", "🧠 Quiz 1v1", false], ["ghig", "🪓 Ghigliottina", false], ["rou", "🎡 Roulette 1v1", true]];
  var GNAME = { srf: "SASSO-CARTA-FORBICI", dadi: "DADI", hl: "ALTO/BASSO", tris: "TRIS", rou: "ROULETTE 1v1" };
  var BOT = { id: "bot", name: "🤖 Bot" };
  var epoch = 0;                                              // cambia a ogni schermata: i timer vecchi si fermano
  function wait(ms) { var e = epoch; return new Promise(function (res) { setTimeout(function () { if (e === epoch) res(); }, ms); }); }
  function alive(e) { return e === epoch; }
  function rnd(n) { return Math.floor(Math.random() * n); }

  function soon() {
    epoch++; body.innerHTML = ""; var b = el("div", "mp-soon"); b.appendChild(el("b", "", "IN ARRIVO")); b.appendChild(el("span", "", "Il multiplayer sta per arrivare")); body.appendChild(b);
  }
  function chips(row, items, cur, on) {
    row.innerHTML = "";
    items.forEach(function (it) {
      var b = el("button", "pcat" + (it[0] === cur ? " on" : ""), it[1]); b.type = "button";
      if (it[2] === false) { b.style.opacity = ".5"; }
      b.addEventListener("click", function () { A.haptic("light"); on(it); });
      row.appendChild(b);
    });
  }
  function names() { return [BOT].concat(st.players.length ? st.players : [{ id: "1", name: "Marco" }, { id: "2", name: "Giulia" }, { id: "3", name: "Luca" }]); }

  // ====================================================================== lobby
  function lobby() {
    epoch++; body.innerHTML = "";
    body.appendChild(el("div", "pg-me", "🛠️ Prototipo (solo admin): gli avversari sono simulati"));
    body.appendChild(el("div", "mp-sec", "SFIDA DIRETTA"));
    var c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "", "Avversario"));
    var rp = el("div", "mp-row"); c.appendChild(rp);
    if (!st.opp) st.opp = BOT;
    function pPlayers() { chips(rp, names().slice(0, 12).map(function (p) { return [p.id, p.name]; }), st.opp.id, function (it) { st.opp = { id: it[0], name: it[1] }; pPlayers(); }); }
    pPlayers();
    c.appendChild(el("div", "", "Gioco"));
    var rg = el("div", "mp-row"); c.appendChild(rg);
    function pG() { chips(rg, GAMES, st.game, function (it) { if (it[2] === false) { A.toast(it[1] + ": presto"); return; } st.game = it[0]; pG(); }); } pG();
    c.appendChild(el("div", "", "Puntata"));
    var rb = el("div", "mp-row"); c.appendChild(rb);
    function pB() { chips(rb, [10, 50, 100, 500, 1000].map(function (n) { return [n, A.fmt(n)]; }), st.bet, function (it) { st.bet = it[0]; pB(); }); } pB();
    c.appendChild(el("div", "", "Round (al meglio di)"));
    var rr = el("div", "mp-row"); c.appendChild(rr);
    function pR() { chips(rr, [1, 3, 5].map(function (n) { return [n, String(n)]; }), st.rounds, function (it) { st.rounds = it[0]; pR(); }); } pR();
    var go = el("button", "mp-go", "INVIA SFIDA"); go.type = "button"; go.addEventListener("click", send); c.appendChild(go);
    var gb = el("button", "mp-go mp-alt", "🤖 PROVA SUBITO CONTRO UN BOT"); gb.type = "button"; gb.addEventListener("click", function () { st.opp = BOT; duel(); }); c.appendChild(gb);

    body.appendChild(el("div", "mp-sec", "TAVOLI (fino a 4 giocatori)"));
    [["Poker Texas", "🂡", "pk"], ["Blackjack insieme", "🃏", "bj"]].forEach(function (t) {
      var tc = el("div", "mp-card"); tc.appendChild(el("div", "", t[1] + " " + t[0]));
      var seats = el("div"); tc.appendChild(seats); var n = 1;
      function paintSeats() {
        seats.innerHTML = "";
        for (var i = 0; i < 4; i++) { var s = el("span", "mp-seat" + (i === 0 ? " me" : ""), i < n ? (i === 0 ? "Tu" : "🤖 Bot " + i) : "libero"); seats.appendChild(s); }
      }
      paintSeats();
      var j = el("button", "mp-go", "AGGIUNGI BOT AL TAVOLO"); j.type = "button";
      j.addEventListener("click", function () { if (n < 4) { n++; paintSeats(); A.haptic("light"); } else A.toast("Tavolo pieno"); });
      var gt = el("button", "mp-go mp-alt", "▶ GIOCA CON I BOT"); gt.type = "button";
      gt.addEventListener("click", function () { var bots = Math.max(1, n - 1); if (t[2] === "bj") bjTable(bots); else pkTable(bots); });
      tc.appendChild(j); tc.appendChild(gt); body.appendChild(tc);
    });
  }
  function send() {
    epoch++; body.innerHTML = ""; var c = el("div", "mp-card"); c.appendChild(el("div", "mp-sec", "SFIDA INVIATA A " + st.opp.name.toUpperCase()));
    c.appendChild(el("div", "pg-me", "In attesa che accetti…")); body.appendChild(c);
    wait(1500).then(duel);
  }

  // ====================================================================== 1v1 (struttura comune)
  function duel() {
    epoch++; var E = epoch, need = Math.floor(st.rounds / 2) + 1, me = 0, op = 0, rd = 1;
    body.innerHTML = ""; var c = el("div", "mp-card"); body.appendChild(c);
    var head = el("div", "mp-sec"), vs = el("div", "mp-vs"), msg = el("div", "pg-me", ""), area = el("div", "mp-area");
    var a = el("div"), b = el("div"), sa = el("div", "big", "0"), sb = el("div", "big", "0");
    a.appendChild(sa); a.appendChild(el("small", "", "Tu")); b.appendChild(sb); b.appendChild(el("small", "", st.opp.name)); vs.appendChild(a); vs.appendChild(b);
    c.appendChild(head); c.appendChild(vs); c.appendChild(msg); c.appendChild(area);
    function draw() { head.textContent = GNAME[st.game] + " · round " + Math.min(rd, st.rounds) + "/" + st.rounds + " · " + A.fmt(st.bet) + " $SDG"; sa.textContent = me; sb.textContent = op; }
    function end() {
      var won = me > op; draw(); area.innerHTML = "";
      msg.textContent = won ? "🏆 HAI VINTO +" + A.fmt(st.bet) + " $SDG (simulato)" : "💀 HAI PERSO −" + A.fmt(st.bet) + " $SDG (simulato)"; msg.className = "pg-me " + (won ? "mp-win" : "mp-lose"); A.haptic(won ? "ok" : "bad");
      var r1 = el("button", "mp-go", "RIGIOCA"); r1.type = "button"; r1.addEventListener("click", duel);
      var r2 = el("button", "mp-go mp-alt", "TORNA ALLA LOBBY"); r2.type = "button"; r2.addEventListener("click", lobby); area.appendChild(r1); area.appendChild(r2);
    }
    function next() {
      if (!alive(E)) return; draw(); area.innerHTML = ""; msg.className = "pg-me";
      GAME[st.game](area, msg, E).then(function (r) {                    // r: 1 vinto, -1 perso, 0 pari (si rigioca)
        if (!alive(E)) return;
        if (r > 0) me++; else if (r < 0) op++;
        if (r) rd++;
        draw();
        if (me >= need || op >= need) return wait(1400).then(end);
        wait(1500).then(next);
      });
    }
    next();
  }
  function say(msg, t, cls) { msg.textContent = t; msg.className = "pg-me " + (cls || ""); }
  function btnRow(area, items) {                                         // ritorna una Promise con l'indice scelto
    return new Promise(function (res) {
      var h = el("div", "mp-hand"); area.appendChild(h);
      items.forEach(function (x, i) { var bt = el("button", x[0].length > 3 ? "txt" : "", x[0]); bt.type = "button"; if (x[1]) bt.title = x[1]; bt.addEventListener("click", function () { A.haptic("medium"); h.querySelectorAll("button").forEach(function (q) { q.disabled = true; }); res(i); }); h.appendChild(bt); });
    });
  }
  var HANDS = [["✊", "Sasso"], ["✋", "Carta"], ["✌️", "Forbici"]];
  var DIE = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  var RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  var GAME = {
    srf: function (area, msg, E) {
      say(msg, "Scegli la tua mossa");
      return btnRow(area, HANDS).then(function (i) {
        var o = rnd(3), clash = el("div", "mp-clash"); area.innerHTML = ""; area.appendChild(clash);
        var L = el("span", "shake", "✊"), R = el("span", "shake r", "✊"); clash.appendChild(L); clash.appendChild(R); say(msg, "Sasso… carta… forbici…");
        return wait(900).then(function () {
          L.className = "pop"; R.className = "pop"; L.textContent = HANDS[i][0]; R.textContent = HANDS[o][0];
          var r = (i - o + 3) % 3, res = r === 0 ? 0 : (r === 1 ? 1 : -1);
          say(msg, res === 0 ? "Pari: si rigioca" : (res > 0 ? "Round tuo!" : "Round a " + st.opp.name), res > 0 ? "mp-win" : (res < 0 ? "mp-lose" : "")); return wait(900).then(function () { return res; });
        });
      });
    },
    dadi: function (area, msg, E) {
      say(msg, "Lancia i dadi!");
      var rows = el("div", "mp-dice"); var mine = el("div", "dr"), theirs = el("div", "dr"); rows.appendChild(mine); rows.appendChild(theirs); area.appendChild(rows);
      function show(box, vals) { box.innerHTML = ""; vals.forEach(function (v) { box.appendChild(el("span", "die", DIE[v])); }); }
      show(mine, [0, 0]); show(theirs, [0, 0]);
      return btnRow(area, [["🎲 LANCIA", ""]]).then(function () {
        var f = 0, mv = [rnd(6), rnd(6)], ov = [rnd(6), rnd(6)];
        return new Promise(function (res) {
          var iv = setInterval(function () {
            if (!alive(E)) { clearInterval(iv); return; }
            f++; show(mine, f < 11 ? [rnd(6), rnd(6)] : mv); show(theirs, f < 14 ? [rnd(6), rnd(6)] : ov);
            if (f >= 14) { clearInterval(iv); var a = mv[0] + mv[1] + 2, b = ov[0] + ov[1] + 2, r = a === b ? 0 : (a > b ? 1 : -1); say(msg, "Tu " + a + " · " + st.opp.name + " " + b + (r === 0 ? " — pari" : ""), r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : "")); setTimeout(function () { res(r); }, 900); }
          }, 90);
        });
      });
    },
    hl: function (area, msg, E) {
      var c1 = rnd(13), c2 = rnd(13); while (c2 === c1) c2 = rnd(13);
      var RK = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
      var board = el("div", "mp-hlb"); var k1 = el("div", "pc big", RK[c1]), k2 = el("div", "pc big back", "?"); board.appendChild(k1); board.appendChild(k2); area.appendChild(board);
      say(msg, "La prossima carta sarà più ALTA o più BASSA?");
      return btnRow(area, [["⬆️ ALTO", ""], ["⬇️ BASSO", ""]]).then(function (i) {
        var bi = rnd(2), up = c2 > c1;
        k2.textContent = RK[c2]; k2.classList.remove("back"); k2.classList.add("flip");
        var me = (i === 0) === up, bot = (bi === 0) === up, r = me === bot ? 0 : (me ? 1 : -1);
        say(msg, "Tu: " + (i ? "basso" : "alto") + " · " + st.opp.name + ": " + (bi ? "basso" : "alto") + " — " + (r === 0 ? (me ? "entrambi giusti: pari" : "entrambi sbagliati: pari") : (r > 0 ? "indovinato!" : "sbagliato!")), r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : ""));
        return wait(1500).then(function () { return r; });
      });
    },
    tris: function (area, msg, E) {
      var b = [0, 0, 0, 0, 0, 0, 0, 0, 0], L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      function win(p) { for (var i = 0; i < 8; i++) if (L[i].every(function (x) { return b[x] === p; })) return true; return false; }
      function free() { var f = []; b.forEach(function (v, i) { if (!v) f.push(i); }); return f; }
      function minimax(p) {                                           // p muove; punteggio dal punto di vista del bot (2)
        if (win(2)) return 1; if (win(1)) return -1; var f = free(); if (!f.length) return 0;
        var best = p === 2 ? -2 : 2; f.forEach(function (m) { b[m] = p; var s = minimax(3 - p); b[m] = 0; best = p === 2 ? Math.max(best, s) : Math.min(best, s); }); return best;
      }
      function botMove() {
        var f = free(); if (Math.random() < 0.35) return f[rnd(f.length)];
        var best = -2, mv = [];
        f.forEach(function (m) { b[m] = 2; var s = minimax(1); b[m] = 0; if (s > best) { best = s; mv = [m]; } else if (s === best) mv.push(m); }); return mv[rnd(mv.length)];
      }
      var grid = el("div", "mp-board"), cells = []; area.appendChild(grid);
      return new Promise(function (res) {
        say(msg, "Sei la ❌: tocca una casella");
        function paint() { cells.forEach(function (c, i) { c.textContent = b[i] === 1 ? "❌" : (b[i] === 2 ? "⭕" : ""); }); }
        function finish(r, t) { say(msg, t, r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : "")); setTimeout(function () { if (alive(E)) res(r); }, 1100); }
        for (var i = 0; i < 9; i++) (function (i) {
          var c = el("button", "mp-cell"); c.type = "button"; cells.push(c);
          c.addEventListener("click", function () {
            if (b[i] || grid.classList.contains("lock")) return; A.haptic("light"); b[i] = 1; paint();
            if (win(1)) { grid.classList.add("lock"); return finish(1, "Tris! Round tuo"); }
            if (!free().length) { grid.classList.add("lock"); return finish(0, "Pari: si rigioca"); }
            grid.classList.add("lock"); say(msg, st.opp.name + " pensa…");
            wait(650).then(function () {
              b[botMove()] = 2; paint();
              if (win(2)) return finish(-1, st.opp.name + " ha fatto tris");
              if (!free().length) return finish(0, "Pari: si rigioca");
              grid.classList.remove("lock"); say(msg, "Tocca una casella");
            });
          });
          grid.appendChild(c);
        })(i);
      });
    },
    rou: function (area, msg, E) {
      say(msg, "Scegli il tuo colore: l'altro va a " + st.opp.name);
      return btnRow(area, [["🔴 ROSSO", ""], ["⚫ NERO", ""]]).then(function (i) {
        area.innerHTML = ""; var w = el("div", "mp-wheel", "0"); area.appendChild(w); var n = rnd(37), f = 0;
        say(msg, "Tu " + (i ? "NERO" : "ROSSO") + " · " + st.opp.name + " " + (i ? "ROSSO" : "NERO"));
        return new Promise(function (res) {
          var iv = setInterval(function () {
            if (!alive(E)) { clearInterval(iv); return; }
            f++; var v = f < 22 ? rnd(37) : n; w.textContent = v; w.className = "mp-wheel " + (v === 0 ? "g" : (RED.indexOf(v) >= 0 ? "r" : "n"));
            if (f >= 22) {
              clearInterval(iv); var red = RED.indexOf(n) >= 0, r = n === 0 ? 0 : (((i === 0) === red) ? 1 : -1);
              say(msg, n === 0 ? "Zero! Nessun vincitore: si rigioca" : (red ? "Rosso " : "Nero ") + n + (r > 0 ? " — vinci il round!" : " — round a " + st.opp.name), r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : ""));
              setTimeout(function () { res(r); }, 1100);
            }
          }, 110 + 0);
        });
      });
    }
  };

  // ====================================================================== carte
  var SU = ["♠", "♥", "♦", "♣"], RK = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  function newDeck() { var d = []; for (var s = 0; s < 4; s++) for (var r = 0; r < 13; r++) d.push({ r: r, s: s }); for (var i = d.length - 1; i > 0; i--) { var j = rnd(i + 1), t = d[i]; d[i] = d[j]; d[j] = t; } return d; }
  function cardEl(c, hidden) { var e = el("span", "pc" + (hidden ? " back" : (c.s === 1 || c.s === 2 ? " red" : "")), hidden ? "" : RK[c.r] + SU[c.s]); return e; }
  function cardsRow(cards, hideFrom) { var r = el("span", "pcs"); cards.forEach(function (c, i) { r.appendChild(cardEl(c, hideFrom !== undefined && i >= hideFrom)); }); return r; }

  // ---------------------------------------------------------------- Blackjack insieme (a turni, carte scoperte)
  function bjVal(cs) { var t = 0, a = 0; cs.forEach(function (c) { if (c.r === 12) { a++; t += 11; } else t += c.r >= 8 ? 10 : c.r + 2; }); while (t > 21 && a > 0) { t -= 10; a--; } return t; }
  function bjTable(bots) {
    epoch++; var E = epoch; body.innerHTML = "";
    var deck = newDeck(), profit = 0, c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "BLACKJACK INSIEME · " + A.fmt(st.bet) + " $SDG a mano"));
    var dealerBox = el("div", "mp-pl"), plBox = el("div"), msg = el("div", "pg-me", ""), area = el("div", "mp-area"), tot = el("div", "pg-me", "");
    c.appendChild(dealerBox); c.appendChild(plBox); c.appendChild(msg); c.appendChild(area); c.appendChild(tot);
    var P = [{ name: "Tu", me: true }]; for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i });
    var dealer, cur = -1;
    function draw() { return deck.length < 12 ? (deck = newDeck()).pop() : deck.pop(); }
    function paint(hideDealer, tag) {
      dealerBox.innerHTML = ""; dealerBox.appendChild(el("b", "", "Banco ")); dealerBox.appendChild(cardsRow(dealer, hideDealer ? 1 : undefined)); dealerBox.appendChild(el("span", "pt", hideDealer ? "" : " = " + bjVal(dealer)));
      plBox.innerHTML = "";
      P.forEach(function (p, i) {
        var r = el("div", "mp-pl" + (p.me ? " me" : "") + (i === cur ? " turn" : "")); r.appendChild(el("b", "", p.name + " ")); r.appendChild(cardsRow(p.cards));
        r.appendChild(el("span", "pt", " = " + bjVal(p.cards) + (p.st === "bust" ? " 💥" : (p.st === "stand" ? " ✋" : "")))); if (p.res) r.appendChild(el("span", "mp-res " + p.res[0], " " + p.res[1])); plBox.appendChild(r);
      });
    }
    function hand() {
      area.innerHTML = ""; dealer = [draw(), draw()]; P.forEach(function (p) { p.cards = [draw(), draw()]; p.st = bjVal(p.cards) === 21 ? "stand" : "play"; p.res = null; });
      cur = -1; say(msg, "Si distribuiscono le carte…"); paint(true);
      wait(700).then(round);
    }
    function round() {                                            // un "giro": ogni giocatore attivo chiede UNA carta oppure sta
      if (!alive(E)) return;
      var order = P.filter(function (p) { return p.st === "play"; });
      if (!order.length) return dealerTurn();
      var k = 0;
      (function step() {
        if (!alive(E)) return;
        if (k >= order.length) { cur = -1; paint(true); return wait(500).then(round); }
        var p = order[k++]; cur = P.indexOf(p); paint(true);
        if (p.me) {
          say(msg, "Tocca a te: CARTA o STAI?"); area.innerHTML = "";
          btnRow(area, [["➕ CARTA", ""], ["✋ STAI", ""]]).then(function (i) {
            area.innerHTML = "";
            if (i === 0) { p.cards.push(draw()); if (bjVal(p.cards) > 21) p.st = "bust"; else if (bjVal(p.cards) === 21) p.st = "stand"; } else p.st = "stand";
            paint(true); wait(600).then(step);
          });
        } else {
          say(msg, p.name + " decide…"); wait(800).then(function () {
            if (bjVal(p.cards) < 17 && (bjVal(p.cards) < 12 || Math.random() < 0.8)) { p.cards.push(draw()); if (bjVal(p.cards) > 21) p.st = "bust"; else if (bjVal(p.cards) === 21) p.st = "stand"; } else p.st = "stand";
            paint(true); wait(500).then(step);
          });
        }
      })();
    }
    function dealerTurn() {
      cur = -1; say(msg, "Il banco scopre la carta…"); paint(false);
      (function go() {
        if (!alive(E)) return;
        if (bjVal(dealer) < 17 && P.some(function (p) { return p.st !== "bust"; })) { wait(800).then(function () { dealer.push(draw()); paint(false); go(); }); return; }
        var dv = bjVal(dealer);
        P.forEach(function (p) {
          var v = bjVal(p.cards), nat = p.cards.length === 2 && v === 21;
          if (p.st === "bust") p.res = ["lose", "perde"]; else if (dv > 21 || v > dv) p.res = ["win", nat ? "BLACKJACK!" : "vince"]; else if (v === dv) p.res = ["push", "pari"]; else p.res = ["lose", "perde"];
          if (p.me) profit += p.res[0] === "win" ? Math.round(st.bet * (nat ? 1.5 : 1)) : (p.res[0] === "lose" ? -st.bet : 0);
        });
        paint(false); var me = P[0].res; say(msg, me[0] === "win" ? "Hai vinto la mano!" : (me[0] === "push" ? "Pareggio" : "Il banco batte la tua mano"), me[0] === "win" ? "mp-win" : (me[0] === "lose" ? "mp-lose" : ""));
        tot.textContent = "Saldo prova: " + (profit >= 0 ? "+" : "−") + A.fmt(Math.abs(profit)) + " $SDG (simulato)"; area.innerHTML = "";
        var a1 = el("button", "mp-go", "NUOVA MANO"); a1.type = "button"; a1.addEventListener("click", hand);
        var a2 = el("button", "mp-go mp-alt", "TORNA ALLA LOBBY"); a2.type = "button"; a2.addEventListener("click", lobby); area.appendChild(a1); area.appendChild(a2);
      })();
    }
    hand();
  }

  // ---------------------------------------------------------------- Poker Texas Hold'em (compatto, con bot)
  var CATN = ["Carta alta", "Coppia", "Doppia coppia", "Tris", "Scala", "Colore", "Full", "Poker", "Scala colore"];
  function ev5(cs) {
    var r = cs.map(function (c) { return c.r; }).sort(function (a, b) { return b - a; }), fl = cs.every(function (c) { return c.s === cs[0].s; }), cnt = {};
    r.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
    var g = Object.keys(cnt).map(function (k) { return [cnt[k], +k]; }).sort(function (a, b) { return b[0] - a[0] || b[1] - a[1]; });
    var st5 = false, hi = r[0];
    if (g.length === 5) { if (r[0] - r[4] === 4) st5 = true; else if (r[0] === 12 && r[1] === 3 && r[2] === 2 && r[3] === 1 && r[4] === 0) { st5 = true; hi = 3; } }
    var cat = st5 && fl ? 8 : g[0][0] === 4 ? 7 : (g[0][0] === 3 && g[1][0] === 2) ? 6 : fl ? 5 : st5 ? 4 : g[0][0] === 3 ? 3 : (g[0][0] === 2 && g[1][0] === 2) ? 2 : g[0][0] === 2 ? 1 : 0;
    var tb = st5 ? [hi] : g.map(function (x) { return x[1]; }), v = cat;
    for (var i = 0; i < 5; i++) v = v * 13 + (tb[i] || 0);
    return v;
  }
  function best7(cs) { if (cs.length === 5) return ev5(cs); var b = -1, idx = []; (function pick(s, k) { if (k === 5) { var v = ev5(idx.map(function (i) { return cs[i]; })); if (v > b) b = v; return; } for (var i = s; i < cs.length; i++) { idx.push(i); pick(i + 1, k + 1); idx.pop(); } })(0, 0); return b; }
  function catOf(v) { for (var i = 0; i < 5; i++) v = Math.floor(v / 13); return v; }
  function pkTable(bots) {
    epoch++; var E = epoch; body.innerHTML = "";
    var u = Math.max(1, Math.round(st.bet / 10)), P = [{ name: "Tu", me: true, stack: 20 }];
    for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i, stack: 20 });
    var c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "POKER TEXAS · ante " + A.fmt(u) + " · puntata " + A.fmt(u * 2) + " $SDG (simulato)"));
    var comm = el("div", "mp-comm"), potEl = el("div", "pg-me", ""), plBox = el("div"), msg = el("div", "pg-me", ""), area = el("div", "mp-area");
    c.appendChild(comm); c.appendChild(potEl); c.appendChild(plBox); c.appendChild(msg); c.appendChild(area);
    var deck, board, pot, cur, dealer = 0;
    function paint(show) {
      comm.innerHTML = ""; for (var k = 0; k < 5; k++) comm.appendChild(k < board.length ? cardEl(board[k], false) : el("span", "pc empty", ""));
      potEl.textContent = "Piatto: " + A.fmt(pot * u) + " $SDG";
      plBox.innerHTML = "";
      P.forEach(function (p, i) {
        var r = el("div", "mp-pl" + (p.me ? " me" : "") + (i === cur ? " turn" : "") + (p.fold ? " fold" : "")); r.appendChild(el("b", "", p.name + " "));
        if (p.hole) r.appendChild(cardsRow(p.hole, (p.me || show) && !p.fold ? undefined : 0));
        r.appendChild(el("span", "pt", " " + A.fmt(p.stack * u) + (p.fold ? " · fold" : (p.act ? " · " + p.act : "")) + (show && !p.fold && p.hole ? " · " + CATN[catOf(best7(p.hole.concat(board)))] : "")));
        if (p.win) r.appendChild(el("span", "mp-res win", " 🏆")); plBox.appendChild(r);
      });
    }
    function strength(p) {
      if (board.length < 3) { var a = p.hole[0].r, b = p.hole[1].r, hi = Math.max(a, b), lo = Math.min(a, b); return a === b ? 0.5 + a / 12 * 0.4 : (hi + lo) / 24 * 0.5 + (p.hole[0].s === p.hole[1].s ? 0.05 : 0) + (hi - lo <= 2 ? 0.03 : 0); }
      var v = best7(p.hole.concat(board)), cat = catOf(v); var rk = Math.floor(v / Math.pow(13, 4)) % 13;
      return [0.15 + rk / 12 * 0.15, 0.35 + rk / 12 * 0.25, 0.65, 0.75, 0.8, 0.85, 0.92, 0.97, 1][cat];
    }
    function live() { return P.filter(function (p) { return !p.fold; }); }
    function hand() {
      if (!alive(E)) return; area.innerHTML = ""; deck = newDeck(); board = []; pot = 0;
      var broke = P.filter(function (p) { return p.stack < 2; }); if (broke.length) { P.forEach(function (p) { p.stack = 20; }); }
      P.forEach(function (p) { p.fold = false; p.act = ""; p.win = false; p.hole = [deck.pop(), deck.pop()]; p.stack -= 1; pot += 1; });   // ante = 1 unità
      cur = -1; say(msg, "Carte distribuite. Ante pagato da tutti."); paint(false);
      wait(800).then(function () { return street(0); });
    }
    function street(s) {
      if (!alive(E)) return;
      if (live().length < 2) return showdown();
      if (s === 1) board.push(deck.pop(), deck.pop(), deck.pop()); else if (s === 2 || s === 3) board.push(deck.pop());
      if (s === 4) return showdown();
      P.forEach(function (p) { p.act = ""; }); paint(false);
      var bet = s >= 2 ? 4 : 2, toCall = 0, need = {}, order = [];
      for (var i = 1; i <= P.length; i++) order.push(P[(dealer + i) % P.length]);
      order = order.filter(function (p) { return !p.fold; });
      var queue = order.slice(), bettor = null;
      P.forEach(function (p) { p.paid = 0; });
      (function step() {
        if (!alive(E)) return;
        if (live().length < 2) return showdown();
        if (!queue.length) return wait(500).then(function () { street(s + 1); });
        var p = queue.shift(); if (p.fold) return step();
        var owe = toCall - (p.paid || 0); cur = P.indexOf(p); paint(false);
        function apply(a) {
          if (a === "fold") { p.fold = true; p.act = "fold"; }
          else if (a === "check") p.act = "check";
          else if (a === "call") { var pay = Math.min(owe, p.stack); p.stack -= pay; pot += pay; p.paid = (p.paid || 0) + pay; p.act = "call"; }
          else { var pay2 = Math.min(owe + bet, p.stack); p.stack -= pay2; pot += pay2; p.paid = (p.paid || 0) + pay2; toCall = p.paid; p.act = owe ? "rilancia" : "punta"; bettor = p;
            queue = order.filter(function (q) { return q !== p && !q.fold; }); }
          paint(false); wait(a === "fold" ? 400 : 650).then(step);
        }
        if (p.me) {
          say(msg, owe ? "Devi pagare " + A.fmt(owe * u) + " $SDG: CALL, RILANCIA o FOLD" : "Tocca a te: CHECK o PUNTA " + A.fmt(bet * u));
          area.innerHTML = ""; var items = owe ? [["✅ CALL", ""], ["⬆️ RILANCIA", ""], ["🏳️ FOLD", ""]] : [["✔️ CHECK", ""], ["💰 PUNTA", ""], ["🏳️ FOLD", ""]];
          btnRow(area, items).then(function (i) { area.innerHTML = ""; apply(owe ? ["call", "raise", "fold"][i] : ["check", "raise", "fold"][i]); });
        } else {
          var str = strength(p) + (Math.random() - 0.5) * 0.12; say(msg, p.name + " decide…");
          var a = owe ? (str > 0.78 && Math.random() < 0.35 && !bettor ? "raise" : (str > 0.33 || Math.random() < 0.12 ? "call" : "fold")) : (str > 0.58 || Math.random() < 0.1 ? "raise" : "check");
          if (a === "raise" && p.stack < owe + bet) a = owe ? "call" : "check";
          wait(700).then(function () { apply(a); });
        }
      })();
    }
    function showdown() {
      cur = -1; var L = live(), win = [];
      if (L.length === 1) win = [L[0]];
      else { while (board.length < 5) board.push(deck.pop()); var bv = -1; L.forEach(function (p) { p.v = best7(p.hole.concat(board)); if (p.v > bv) { bv = p.v; win = [p]; } else if (p.v === bv) win.push(p); }); }
      win.forEach(function (p) { p.win = true; p.stack += Math.floor(pot / win.length); }); dealer = (dealer + 1) % P.length;
      paint(true); potEl.textContent = "Piatto: " + A.fmt(pot * u) + " $SDG → " + win.map(function (p) { return p.name; }).join(" + ");
      var mw = win.indexOf(P[0]) >= 0; say(msg, mw ? "Hai vinto il piatto!" : (P[0].fold ? "Hai foldato" : "Vince " + win[0].name), mw ? "mp-win" : "mp-lose"); A.haptic(mw ? "ok" : "light");
      area.innerHTML = ""; var a1 = el("button", "mp-go", "NUOVA MANO"); a1.type = "button"; a1.addEventListener("click", hand);
      var a2 = el("button", "mp-go mp-alt", "TORNA ALLA LOBBY"); a2.type = "button"; a2.addEventListener("click", lobby); area.appendChild(a1); area.appendChild(a2);
    }
    hand();
  }

  window.ArcadeMulti = { load: function () {
    if (!(A.isSandbox && A.isSandbox())) { soon(); return; }
    A.api("/api/social/donors").then(function (j) { st.players = j.players || []; st.opp = null; lobby(); }).catch(function () { lobby(); });
  } };
})();
