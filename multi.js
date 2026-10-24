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
    fit(false); epoch++; body.innerHTML = ""; var b = el("div", "mp-soon"); b.appendChild(el("b", "", "IN ARRIVO")); b.appendChild(el("span", "", "Il multiplayer sta per arrivare")); body.appendChild(b);
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
  function backBar(title, to) {
    var h = el("div", "mp-top"); var bk = el("button", "mp-back", "‹ Multi"); bk.type = "button"; bk.addEventListener("click", to || lobby);
    h.appendChild(bk); h.appendChild(el("div", "mp-title", title)); body.appendChild(h); return h;
  }
  // ---- home del multiplayer: grandi riquadri, uno per sezione
  function lobby() {
    fit(true); epoch++; body.innerHTML = "";
    body.appendChild(el("div", "pg-me", "🛠️ Prototipo (solo admin): gli avversari sono simulati"));
    var g = el("div", "mp-hub"); body.appendChild(g);
    [["🃏", "TAVOLI", "Blackjack e Poker fino a 4 giocatori", tables, true], ["⚔️", "SFIDE 1v1", "Sasso-carta-forbici, dadi, tris, roulette…", duels, true],
     ["🏎️", "CORSA F1", "Giri a tempo, fantasma e classifica", function () { if (window.ArcadeRace) { fit(true); epoch++; body.innerHTML = ""; window.ArcadeRace.open(body, lobby); } }, true],
     ["🧠", "QUIZ", "Quiz multiplayer: in arrivo", null, false]].forEach(function (t) {
      var b = el("button", "mp-tile" + (t[4] ? "" : " off")); b.type = "button";
      b.appendChild(el("i", "", t[0])); b.appendChild(el("b", "", t[1])); b.appendChild(el("span", "", t[2]));
      b.addEventListener("click", function () { if (t[3]) { A.haptic("light"); t[3](); } else A.toast("Presto!"); }); g.appendChild(b);
    });
  }
  // ---- tavoli
  function tables() {
    fit(true); epoch++; body.innerHTML = ""; backBar("TAVOLI");
    [["Poker Texas", "🂡", "pk"], ["Blackjack insieme", "🃏", "bj"]].forEach(function (t) {
      var tc = el("div", "mp-card tbl"); tc.appendChild(el("div", "mp-ttl", t[1] + " " + t[0]));
      var seats = el("div", "mp-seats"); tc.appendChild(seats); var n = 1;
      function paintSeats() {
        seats.innerHTML = "";
        for (var i = 0; i < 4; i++) { var s = el("span", "mp-seat" + (i === 0 ? " me" : ""), i < n ? (i === 0 ? "Tu" : "🤖 Bot " + i) : "libero"); seats.appendChild(s); }
      }
      paintSeats();
      var rw = el("div", "mp-end");
      var j = el("button", "mp-go", "+ BOT"); j.type = "button";
      j.addEventListener("click", function () { if (n < 4) { n++; paintSeats(); A.haptic("light"); } else A.toast("Tavolo pieno"); });
      var gt = el("button", "mp-go mp-alt", "▶ GIOCA"); gt.type = "button";
      gt.addEventListener("click", function () { var bots = Math.max(1, n - 1); if (t[2] === "bj") bjTable(bots); else pkTable(bots); });
      rw.appendChild(j); rw.appendChild(gt); tc.appendChild(rw); body.appendChild(tc);
    });
  }
  // ---- sfide 1v1, tutto in una schermata
  var ICON = { srf: "✊", dadi: "🎲", hl: "⬆️", tris: "❌", quiz: "🧠", ghig: "🪓", rou: "🎡" };
  function duels() {
    fit(true); epoch++; body.innerHTML = ""; backBar("SFIDE 1v1");
    var c = el("div", "mp-card mp-duel"); body.appendChild(c);
    if (!st.opp) st.opp = BOT;
    c.appendChild(el("div", "mp-lab", "Avversario"));
    var rp = el("div", "mp-row scroll"); c.appendChild(rp);
    function pPlayers() { chips(rp, names().slice(0, 12).map(function (p) { return [p.id, p.name]; }), st.opp.id, function (it) { st.opp = { id: it[0], name: it[1] }; pPlayers(); }); } pPlayers();
    c.appendChild(el("div", "mp-lab", "Gioco"));
    var rg = el("div", "mp-games"); c.appendChild(rg);
    function pG() {
      rg.innerHTML = "";
      GAMES.forEach(function (it) {
        var b = el("button", "mp-gt" + (it[0] === st.game ? " on" : "") + (it[2] === false ? " off" : "")); b.type = "button";
        b.appendChild(el("i", "", ICON[it[0]] || "🎮")); b.appendChild(el("span", "", it[1].replace(/^\S+\s/, "")));
        b.addEventListener("click", function () { if (it[2] === false) { A.toast(it[1] + ": presto"); return; } A.haptic("light"); st.game = it[0]; pG(); }); rg.appendChild(b);
      });
    } pG();
    var two = el("div", "mp-two"); c.appendChild(two);
    var cb = el("div"); cb.appendChild(el("div", "mp-lab", "Puntata")); var rb = el("div", "mp-row scroll"); cb.appendChild(rb); two.appendChild(cb);
    function pB() { chips(rb, [10, 50, 100, 500, 1000].map(function (n) { return [n, A.fmt(n)]; }), st.bet, function (it) { st.bet = it[0]; pB(); }); } pB();
    var cr = el("div"); cr.appendChild(el("div", "mp-lab", "Round")); var rr = el("div", "mp-row"); cr.appendChild(rr); two.appendChild(cr);
    function pR() { chips(rr, [1, 3, 5].map(function (n) { return [n, String(n)]; }), st.rounds, function (it) { st.rounds = it[0]; pR(); }); } pR();
    var rw = el("div", "mp-end");
    var go = el("button", "mp-go", "INVIA SFIDA"); go.type = "button"; go.addEventListener("click", send);
    var gb = el("button", "mp-go mp-alt", "🤖 PROVA COL BOT"); gb.type = "button"; gb.addEventListener("click", function () { st.opp = BOT; duel(); });
    rw.appendChild(go); rw.appendChild(gb); c.appendChild(rw);
  }
  function send() {
    fit(false); epoch++; body.innerHTML = ""; var c = el("div", "mp-card"); c.appendChild(el("div", "mp-sec", "SFIDA INVIATA A " + st.opp.name.toUpperCase()));
    c.appendChild(el("div", "pg-me", "In attesa che accetti…")); body.appendChild(c);
    wait(1500).then(duel);
  }

  // ====================================================================== 1v1 (struttura comune)
  function duel() {
    fit(false);
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
      var r2 = el("button", "mp-go mp-alt", "LOBBY"); r2.type = "button"; r2.addEventListener("click", duels); area.appendChild(r1); area.appendChild(r2);
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
  // banner centrale con l'esito della mano (sparisce da solo)
  function banner(felt, big, small, cls) {
    var b = el("div", "mx-banner " + (cls || "")); b.appendChild(el("b", "", big)); if (small) b.appendChild(el("span", "", small)); felt.appendChild(b);
    var e = epoch; setTimeout(function () { if (b.parentNode) { b.classList.add("off"); setTimeout(function () { b.remove(); }, 400); } }, 3200);
  }
  // "Rigioca": si riparte solo quando tutti i giocatori hanno confermato (i bot confermano uno alla volta)
  function rematch(area, n, go, E) {
    area.innerHTML = ""; var w = el("div", "mp-wait"), k = 1; area.appendChild(w);
    var bk = el("button", "mp-go mp-alt", "LOBBY"); bk.type = "button"; bk.addEventListener("click", lobby); area.appendChild(bk);
    function paintW() { w.textContent = "⏳ Rigioca · " + k + "/" + n + " pronti"; }
    paintW();
    (function tick() { if (!alive(E)) return; if (k >= n) return go(); wait(600 + rnd(600)).then(function () { if (!alive(E)) return; k++; paintW(); tick(); }); })();
  }
  function fit(on) { body.classList.toggle("fit", !!on); }
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
      var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
      var ROT = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };      // [rotX, rotY] che portano la faccia v davanti
      function cube() {
        var d = el("div", "mx-die"), c = el("div", "mx-cube"); d.appendChild(c);
        for (var v = 1; v <= 6; v++) { var f = el("div", "mx-f f" + v); for (var k = 0; k < 9; k++) f.appendChild(PIPS[v].indexOf(k) >= 0 ? el("i") : el("span")); c.appendChild(f); }
        d._c = c; c.style.transition = "none"; c.style.transform = "rotateX(" + (rnd(4) * 90) + "deg) rotateY(" + (rnd(4) * 90) + "deg)"; return d;
      }
      function panel(cls, name) {
        var p = el("div", "mx-pan " + cls), stage = el("div", "mx-stage"), cup = el("div", "mx-cup"), dice = [cube(), cube()];
        p.appendChild(el("div", "mx-nm", name)); dice.forEach(function (d) { stage.appendChild(d); }); stage.appendChild(cup); p.appendChild(stage);
        var tot = el("div", "mx-tot", ""); p.appendChild(tot); return { p: p, cup: cup, dice: dice, tot: tot };
      }
      function throwDice(P, vals) {
        P.cup.className = "mx-cup gone"; snd("whoosh");
        P.dice.forEach(function (d, i) {
          d.classList.add("on", "hop"); var c = d._c, r = ROT[vals[i]];
          void c.offsetWidth; c.style.transition = "transform 1.15s cubic-bezier(.15,.75,.2,1)";
          c.style.transform = "rotateX(" + (r[0] + 720 + 360 * i) + "deg) rotateY(" + (r[1] + 1080 - 360 * i) + "deg)";
        });
        return wait(1250);
      }
      var split = el("div", "mx-split"), O = panel("opp", st.opp.name), M = panel("me", "Tu"), hint = el("div", "mx-hint", "");
      split.appendChild(O.p); split.appendChild(M.p); area.appendChild(split); area.appendChild(hint);
      O.cup.classList.add("auto"); O.cup.style.animation = "none";
      say(msg, "Prendi il bussolotto: tieni premuto per agitare, rilascia per lanciare");
      hint.textContent = "👇 tieni premuto il tuo bussolotto";
      return new Promise(function (res) {
        var t0 = 0, iv = 0, done = false;
        function stop() { clearInterval(iv); iv = 0; }
        function down(ev) {
          if (done || t0) return; ev.preventDefault(); t0 = Date.now(); M.cup.classList.add("hold"); hint.textContent = "Agita… rilascia per lanciare";
          snd("tick"); iv = setInterval(function () { if (!alive(E)) return stop(); snd("creak", Math.random()); A.haptic("light"); }, 140);
        }
        function up() {
          if (!t0 || done) return; stop(); var held = Date.now() - t0; t0 = 0; M.cup.classList.remove("hold");
          if (held < 600) { hint.textContent = "Agita di più! Tieni premuto almeno un secondo"; return; }
          done = true; hint.textContent = ""; M.p.classList.add("act");
          var mv = [1 + rnd(6), 1 + rnd(6)], ov = [1 + rnd(6), 1 + rnd(6)];
          throwDice(M, mv).then(function () {
            if (!alive(E)) return; var a = mv[0] + mv[1]; M.tot.textContent = a; M.p.classList.remove("act"); O.p.classList.add("act");
            say(msg, st.opp.name + " agita il bussolotto…"); O.cup.style.animation = ""; O.cup.classList.add("hold"); snd("creak", .5);
            var n = 0, iv2 = setInterval(function () { if (!alive(E)) return clearInterval(iv2); snd("creak", Math.random()); if (++n > 7) clearInterval(iv2); }, 140);
            return wait(1250).then(function () { O.cup.classList.remove("hold"); return throwDice(O, ov); }).then(function () {
              if (!alive(E)) return; var b = ov[0] + ov[1]; O.tot.textContent = b; O.p.classList.remove("act");
              var r = a === b ? 0 : (a > b ? 1 : -1); say(msg, "Tu " + a + " · " + st.opp.name + " " + b + (r === 0 ? " — pari: si rilancia" : ""), r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : ""));
              (r > 0 ? M : O).tot.style.color = r === 0 ? "" : "#58ffa8"; snd(r > 0 ? "win" : (r < 0 ? "lose" : "click"));
              return wait(1300).then(function () { res(r); });
            });
          });
        }
        M.cup.addEventListener("pointerdown", down); M.cup.addEventListener("pointerup", up); M.cup.addEventListener("pointercancel", up); M.cup.addEventListener("pointerleave", up);
      });
    },
    hl: function (area, msg, E) {
      var c1 = rnd(13), c2 = rnd(13); while (c2 === c1) c2 = rnd(13);
      var s1 = rnd(4), s2 = rnd(4), SUITS = ["♠", "♥", "♦", "♣"];
      function flipCard(r, s, up) {
        var w = el("span", "mx-fl"), i = el("span", "mx-fi" + (up ? " up" : "")); w.appendChild(i);
        i.appendChild(el("span", "mx-fa", "?")); i.appendChild(el("span", "mx-fb" + (s === 1 || s === 2 ? " red" : ""), RK[r] + SUITS[s])); w._i = i; return w;
      }
      var split = el("div", "mx-split"), O = el("div", "mx-pan opp"), M = el("div", "mx-pan me"), mid = el("div", "mx-pan");
      O.appendChild(el("div", "mx-nm", st.opp.name)); var op = el("div", "mx-pick", "🤔 sta scegliendo…"); O.appendChild(op);
      var k1 = flipCard(c1, s1, true), k2 = flipCard(c2, s2, false); mid.appendChild(k1); mid.appendChild(k2);
      M.appendChild(el("div", "mx-nm", "Tu")); split.appendChild(O); split.appendChild(mid); split.appendChild(M); area.appendChild(split);
      say(msg, "La seconda carta sarà più ALTA o più BASSA della prima?");
      return btnRow(M, [["⬆️ ALTO", ""], ["⬇️ BASSO", ""]]).then(function (i) {
        var bi = rnd(2), up = c2 > c1; M.querySelectorAll("button").forEach(function (b) { b.style.opacity = ".5"; });
        op.textContent = "✔ ha scelto"; snd("click");
        return wait(800).then(function () {
          snd("flip"); k2._i.classList.add("up"); return wait(800);
        }).then(function () {
          var me = (i === 0) === up, bot = (bi === 0) === up, r = me === bot ? 0 : (me ? 1 : -1);
          op.textContent = bi ? "⬇️ BASSO" : "⬆️ ALTO"; op.style.color = bot ? "#58ffa8" : "#ff6b8a";
          say(msg, "Tu: " + (i ? "basso" : "alto") + " · " + st.opp.name + ": " + (bi ? "basso" : "alto") + " — " + (r === 0 ? (me ? "entrambi giusti: pari" : "entrambi sbagliati: pari") : (r > 0 ? "indovinato!" : "sbagliato!")), r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : ""));
          snd(r > 0 ? "win" : (r < 0 ? "lose" : "click")); return wait(1500).then(function () { return r; });
        });
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
      var ORD = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
      say(msg, "Scegli il tuo colore: l'altro va a " + st.opp.name);
      return btnRow(area, [["🔴 ROSSO", ""], ["⚫ NERO", ""]]).then(function (i) {
        area.innerHTML = "";
        var S = 250, cv = el("canvas", "mx-wheel"); cv.width = S * 2; cv.height = S * 2; cv.style.width = S + "px"; cv.style.height = S + "px"; area.appendChild(cv);
        var ctx = cv.getContext("2d"), cx = S, cy = S, R = S - 6, n = rnd(37), idx = ORD.indexOf(n), seg = Math.PI * 2 / 37, T = 5200;
        say(msg, "Tu " + (i ? "NERO" : "ROSSO") + " · " + st.opp.name + " " + (i ? "ROSSO" : "NERO"));
        var th0 = Math.random() * 6, whTurns = 1.4, ballTurns = 7;
        var thEnd = th0 + Math.PI * 2 * whTurns, phEnd = thEnd + idx * seg;          // la pallina si ferma sulla casella n
        function ease(x) { return 1 - Math.pow(1 - x, 3); }
        function frame(t) {
          var x = Math.min(1, t / T), e = ease(x), th = th0 + Math.PI * 2 * whTurns * e, ph = phEnd - Math.PI * 2 * ballTurns * (1 - ease(Math.min(1, x * 1.03)));
          ctx.clearRect(0, 0, S * 2, S * 2);
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = "#3a1d0e"; ctx.fill();
          for (var k = 0; k < 37; k++) {
            var a0 = th + k * seg - seg / 2, v = ORD[k]; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R - 14, a0, a0 + seg); ctx.closePath();
            ctx.fillStyle = v === 0 ? "#0f8a4a" : (RED.indexOf(v) >= 0 ? "#c4162f" : "#15101f"); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1; ctx.stroke();
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + seg / 2); ctx.fillStyle = "#fff"; ctx.font = "700 17px Rajdhani,sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(v), R - 36, 5); ctx.restore();
          }
          ctx.beginPath(); ctx.arc(cx, cy, R - 74, 0, 7); ctx.fillStyle = "#2a1450"; ctx.fill(); ctx.strokeStyle = "#8a4aff"; ctx.lineWidth = 3; ctx.stroke();
          var br = R - 14 - (R - 14 - (R - 36)) * Math.min(1, Math.max(0, (x - .55) / .45)), bx = cx + Math.cos(ph) * (x < .55 ? R - 8 : br), by = cy + Math.sin(ph) * (x < .55 ? R - 8 : br);
          ctx.beginPath(); ctx.arc(bx, by, 7, 0, 7); ctx.fillStyle = "#fff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
        }
        return new Promise(function (res) {
          var t0 = performance.now(), lastTick = 0; snd("ball");
          (function loop(now) {
            if (!alive(E)) return; var t = now - t0; frame(t);
            if (t - lastTick > 260 && t < T - 600) { lastTick = t; snd("tick"); }
            if (t < T) return requestAnimationFrame(loop);
            frame(T); var red = RED.indexOf(n) >= 0, r = n === 0 ? 0 : (((i === 0) === red) ? 1 : -1);
            say(msg, n === 0 ? "Zero! Nessun vincitore: si rigioca" : (red ? "Rosso " : "Nero ") + n + (r > 0 ? " — vinci il round!" : " — round a " + st.opp.name), r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : ""));
            snd(r > 0 ? "win" : (r < 0 ? "lose" : "click")); setTimeout(function () { if (alive(E)) res(r); }, 1400);
          })(t0);
        });
      });
    }
  };

  // ====================================================================== carte
  var SU = ["♠", "♥", "♦", "♣"], RK = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  function newDeck() { var d = []; for (var s = 0; s < 4; s++) for (var r = 0; r < 13; r++) d.push({ r: r, s: s }); for (var i = d.length - 1; i > 0; i--) { var j = rnd(i + 1), t = d[i]; d[i] = d[j]; d[j] = t; } return d; }
  function cardEl(c, hidden) { var e = el("span", "pc" + (hidden ? " back" : (c.s === 1 || c.s === 2 ? " red" : "")), hidden ? "" : RK[c.r] + SU[c.s]); return e; }
  function cardsRow(cards, hideFrom) { var r = el("span", "pcs"); cards.forEach(function (c, i) { r.appendChild(cardEl(c, hideFrom !== undefined && i >= hideFrom)); }); return r; }
  function snd(n, a) { try { window.ArcadeAudio && window.ArcadeAudio.sfx && window.ArcadeAudio.sfx(n, a); } catch (e) {} }
  // carta del tavolo (vista dall'alto): c = {r,s}; hidden = dorso
  function mcEl(c, hidden, cls) {
    var e = el("span", "mc" + (cls ? " " + cls : "") + (hidden ? " back" : (c.s === 1 || c.s === 2 ? " red" : "")));
    if (!hidden) { e.appendChild(el("span", "", RK[c.r])); e.appendChild(el("small", "", SU[c.s])); }
    e._card = c; e._hid = !!hidden; return e;
  }
  // anima le carte nuove (volano dal mazzo) e i giri delle carte coperte che si scoprono
  function settle(felt, shoe) {
    var k = 0, s = shoe.getBoundingClientRect();
    felt.querySelectorAll(".mc").forEach(function (e) {
      var c = e._card; if (!c) return;
      if (!c._seen) {
        c._seen = true; c._hid = e._hid; var r = e.getBoundingClientRect(), d = k++ * 120;
        e.animate([{ transform: "translate(" + (s.left - r.left) + "px," + (s.top - r.top) + "px) rotate(-30deg) scale(.6)", opacity: 0 }, { opacity: 1, offset: .2 }, { transform: "none", opacity: 1 }], { duration: 420, delay: d, easing: "ease-out", fill: "backwards" });
        setTimeout(function () { snd("card"); }, d + 60);
      } else if (c._hid && !e._hid) { c._hid = false; e.animate([{ transform: "rotateY(90deg) scale(1.1)" }, { transform: "none" }], { duration: 380, easing: "ease-out" }); snd("flip"); }
      else c._hid = e._hid;
    });
    return k;
  }

  // ---------------------------------------------------------------- Blackjack insieme (a turni, carte scoperte, tavolo dall'alto)
  function bjVal(cs) { var t = 0, a = 0; cs.forEach(function (c) { if (c.r === 12) { a++; t += 11; } else t += c.r >= 8 ? 10 : c.r + 2; }); while (t > 21 && a > 0) { t -= 10; a--; } return t; }
  function bjTable(bots) {
    fit(true); epoch++; var E = epoch; body.innerHTML = "";
    var deck = newDeck(), profit = 0, c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "BLACKJACK · " + A.fmt(st.bet) + " $SDG a mano"));
    var felt = el("div", "mx-felt bj"), shoe = el("div", "mx-shoe"), msg = el("div", "pg-me", ""), area = el("div", "mp-area"), tot = el("div", "pg-me", "");
    c.appendChild(felt); c.appendChild(msg); c.appendChild(area); c.appendChild(tot);
    var P = [{ name: "Tu", me: true }]; for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i });
    var order = P.length === 1 ? [0] : P.length === 2 ? [1, 0] : P.length === 3 ? [1, 0, 2] : [1, 0, 2, 3];       // io al centro, gli altri accanto (stesso lato)
    var dealer, cur = -1;
    function draw() { return deck.length < 12 ? (deck = newDeck()).pop() : deck.pop(); }
    function paint(hideDealer) {
      felt.innerHTML = ""; felt.appendChild(shoe);
      var d = el("div", "mx-seat bjd");
      d.appendChild(el("div", "mx-tag", "BANCO")); var dc = el("div", "mx-cs"); dealer.forEach(function (x, i) { dc.appendChild(mcEl(x, hideDealer && i === 1)); }); d.appendChild(dc);
      d.appendChild(el("div", "mx-info", hideDealer ? "" : "= " + bjVal(dealer))); felt.appendChild(d);
      var bro = el("div", "bj-bots"), mro = el("div", "bj-me"); felt.appendChild(bro); felt.appendChild(mro);      // avversari in fila sopra, io in basso al centro
      P.forEach(function (p, pi) {
        var s = el("div", "mx-seat" + (p.me ? " me" : "") + (pi === cur ? " turn" : ""));
        if (p.res) s.appendChild(el("div", "mx-res " + p.res[0], p.res[1]));
        var cs = el("div", "mx-cs"); p.cards.forEach(function (x) { cs.appendChild(mcEl(x, false)); }); s.appendChild(cs);
        s.appendChild(el("div", "mx-info", bjVal(p.cards) + (p.st === "bust" ? " 💥" : (p.st === "stand" ? " ✋" : "")))); s.appendChild(el("div", "mx-tag", p.name)); (p.me ? mro : bro).appendChild(s);
      });
      return settle(felt, shoe);
    }
    function hand() {
      area.innerHTML = ""; tot.textContent = ""; dealer = [draw(), draw()]; P.forEach(function (p) { p.cards = [draw(), draw()]; p.st = bjVal(p.cards) === 21 ? "stand" : "play"; p.res = null; });
      cur = -1; say(msg, "Si distribuiscono le carte…"); var n = paint(true);
      wait(300 + n * 120).then(round);
    }
    function round() {                                            // un "giro": ogni giocatore attivo chiede UNA carta oppure sta
      if (!alive(E)) return;
      var ord = P.filter(function (p) { return p.st === "play"; });
      if (!ord.length) return dealerTurn();
      var k = 0;
      (function step() {
        if (!alive(E)) return;
        if (k >= ord.length) { cur = -1; paint(true); return wait(500).then(round); }
        var p = ord[k++]; cur = P.indexOf(p); paint(true);
        function took() { if (bjVal(p.cards) > 21) { p.st = "bust"; snd("lose"); } else if (bjVal(p.cards) === 21) p.st = "stand"; }
        if (p.me) {
          say(msg, "Tocca a te: CARTA o STAI?"); area.innerHTML = "";
          btnRow(area, [["➕ CARTA", ""], ["✋ STAI", ""]]).then(function (i) {
            area.innerHTML = "";
            if (i === 0) { p.cards.push(draw()); took(); } else p.st = "stand";
            paint(true); wait(700).then(step);
          });
        } else {
          say(msg, p.name + " decide…"); wait(900).then(function () {
            if (bjVal(p.cards) < 17 && (bjVal(p.cards) < 12 || Math.random() < 0.8)) { p.cards.push(draw()); took(); } else p.st = "stand";
            paint(true); wait(700).then(step);
          });
        }
      })();
    }
    function dealerTurn() {
      cur = -1; say(msg, "Il banco scopre la carta…"); paint(false);
      (function go() {
        if (!alive(E)) return;
        if (bjVal(dealer) < 17 && P.some(function (p) { return p.st !== "bust"; })) { wait(1000).then(function () { dealer.push(draw()); paint(false); go(); }); return; }
        wait(600).then(function () {
          if (!alive(E)) return; var dv = bjVal(dealer);
          P.forEach(function (p) {
            var v = bjVal(p.cards), nat = p.cards.length === 2 && v === 21;
            if (p.st === "bust") p.res = ["lose", "perde"]; else if (dv > 21 || v > dv) p.res = ["win", nat ? "BLACKJACK!" : "vince"]; else if (v === dv) p.res = ["push", "pari"]; else p.res = ["lose", "perde"];
            if (p.me) profit += p.res[0] === "win" ? Math.round(st.bet * (nat ? 1.5 : 1)) : (p.res[0] === "lose" ? -st.bet : 0);
          });
          paint(false); var me = P[0].res; var dme = me[0] === "win" ? Math.round(st.bet * (P[0].cards.length === 2 && bjVal(P[0].cards) === 21 ? 1.5 : 1)) : (me[0] === "lose" ? -st.bet : 0);
          banner(felt, me[0] === "win" ? (me[1] === "BLACKJACK!" ? "BLACKJACK!" : "HAI VINTO!") : (me[0] === "push" ? "PAREGGIO" : "VINCE IL BANCO"), (dme >= 0 ? "+" : "−") + A.fmt(Math.abs(dme)) + " $SDG · tu " + bjVal(P[0].cards) + " vs banco " + bjVal(dealer), me[0]);
          snd(me[0] === "win" ? "win" : (me[0] === "lose" ? "lose" : "click"));
          say(msg, me[0] === "win" ? "Hai vinto la mano!" : (me[0] === "push" ? "Pareggio" : "Il banco batte la tua mano"), me[0] === "win" ? "mp-win" : (me[0] === "lose" ? "mp-lose" : ""));
          tot.textContent = "Saldo prova: " + (profit >= 0 ? "+" : "−") + A.fmt(Math.abs(profit)) + " $SDG (simulato)"; area.innerHTML = "";
          var en = el("div", "mp-end"); area.appendChild(en);
          var a1 = el("button", "mp-go", "RIGIOCA"); a1.type = "button"; a1.addEventListener("click", function () { rematch(area, P.length, hand, E); });
          var a2 = el("button", "mp-go mp-alt", "LOBBY"); a2.type = "button"; a2.addEventListener("click", lobby); en.appendChild(a1); en.appendChild(a2);
        });
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
    fit(true); epoch++; var E = epoch; body.innerHTML = "";
    var u = Math.max(1, Math.round(st.bet / 10)), P = [{ name: "Tu", me: true, stack: 20 }];
    for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i, stack: 20 });
    var POS = P.length === 2 ? ["b", "t"] : P.length === 3 ? ["b", "l", "r"] : ["b", "l", "t", "r"];          // io in basso, avversari a sinistra / di fronte / a destra
    var PS = { b: "left:50%;bottom:8px;transform:translateX(-50%)", t: "left:50%;top:8px;transform:translateX(-50%)", l: "left:2px;top:36%", r: "right:2px;top:36%" };
    var c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "POKER TEXAS · ante " + A.fmt(u) + " $SDG (simulato)"));
    var felt = el("div", "mx-felt pk"), shoe = el("div", "mx-shoe"), msg = el("div", "pg-me", ""), area = el("div", "mp-area");
    shoe.style.cssText = "right:46%;top:46%;width:1px;height:1px;opacity:0;box-shadow:none"; 
    c.appendChild(felt); c.appendChild(msg); c.appendChild(area);
    var deck, board, pot, cur, dealer = 0;
    function paint(show) {
      felt.innerHTML = ""; felt.appendChild(shoe);
      var cm = el("div", "mx-cs"); cm.style.cssText = "position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);flex-wrap:wrap;max-width:124px;row-gap:5px";
      for (var k = 0; k < 5; k++) cm.appendChild(k < board.length ? mcEl(board[k], false, "cm") : el("span", "mc cm empty")); felt.appendChild(cm);
      felt.appendChild(el("div", "mx-pot", "Piatto " + A.fmt(pot * u) + " $SDG"));
      P.forEach(function (p, i) {
        var s = el("div", "mx-seat" + (p.me ? " me" : "") + (i === cur ? " turn" : "") + (p.fold ? " fold" : "")); s.style.cssText = PS[POS[i]];
        var cs = el("div", "mx-cs"); if (p.hole) p.hole.forEach(function (x) { cs.appendChild(mcEl(x, !(p.me || (show && !p.fold)), p.me ? "" : "")); }); s.appendChild(cs);
        s.appendChild(el("div", "mx-tag", p.name + " · " + A.fmt(p.stack * u)));
        var inf = (p.fold ? "fold" : (p.act || "")) + (show && !p.fold && p.hole ? (p.act ? " · " : "") + CATN[catOf(best7(p.hole.concat(board)))] : "");
        if (!p.fold && p.me && p.hole && board.length >= 3 && !show) inf += (inf ? " · " : "") + CATN[catOf(best7(p.hole.concat(board)))];
        if (inf) s.appendChild(el("div", "mx-info", inf)); if (p.win) s.appendChild(el("div", "mx-res win", "🏆 VINCE"));
        felt.appendChild(s);
      });
      return settle(felt, shoe);
    }
    function strength(p) {
      if (board.length < 3) { var a = p.hole[0].r, b = p.hole[1].r, hi = Math.max(a, b), lo = Math.min(a, b); return a === b ? 0.5 + a / 12 * 0.4 : (hi + lo) / 24 * 0.5 + (p.hole[0].s === p.hole[1].s ? 0.05 : 0) + (hi - lo <= 2 ? 0.03 : 0); }
      var v = best7(p.hole.concat(board)), cat = catOf(v); var rk = Math.floor(v / Math.pow(13, 4)) % 13;
      return [0.15 + rk / 12 * 0.15, 0.35 + rk / 12 * 0.25, 0.65, 0.75, 0.8, 0.85, 0.92, 0.97, 1][cat];
    }
    function live() { return P.filter(function (p) { return !p.fold; }); }
    function hand() {
      if (!alive(E)) return; area.innerHTML = ""; deck = newDeck(); board = []; pot = 0;
      if (P.some(function (p) { return p.stack < 2; })) P.forEach(function (p) { p.stack = 20; });
      P.forEach(function (p) { p.fold = false; p.act = ""; p.win = false; p.hole = [deck.pop(), deck.pop()]; p.stack -= 1; pot += 1; });   // ante = 1 unità
      cur = -1; say(msg, "Carte distribuite. Ante pagato da tutti."); var n = paint(false);
      wait(500 + n * 110).then(function () { return street(0); });
    }
    function street(s) {
      if (!alive(E)) return;
      if (live().length < 2) return showdown();
      if (s === 1) board.push(deck.pop(), deck.pop(), deck.pop()); else if (s === 2 || s === 3) board.push(deck.pop());
      if (s === 4) return showdown();
      P.forEach(function (p) { p.act = ""; }); var nn = paint(false);
      var base = s >= 2 ? 4 : 2, toCall = 0, ord = [];
      for (var i = 1; i <= P.length; i++) ord.push(P[(dealer + i) % P.length]);
      ord = ord.filter(function (p) { return !p.fold; });
      var queue = ord.slice(), bettor = null;
      P.forEach(function (p) { p.paid = 0; });
      wait(s ? 400 + nn * 130 : 0).then(function step() {
        if (!alive(E)) return;
        if (live().length < 2) return showdown();
        if (!queue.length) return wait(500).then(function () { street(s + 1); });
        var p = queue.shift(); if (p.fold) return step();
        var owe = toCall - (p.paid || 0); cur = P.indexOf(p); paint(false);
        function apply(a, amt) {
          if (a === "fold") { p.fold = true; p.act = "fold"; snd("lose"); }
          else if (a === "check") p.act = "check";
          else if (a === "call") { var pay = Math.min(owe, p.stack); p.stack -= pay; pot += pay; p.paid = (p.paid || 0) + pay; p.act = "call " + A.fmt(pay * u); snd("chip"); }
          else { var pay2 = Math.min(owe + amt, p.stack); p.stack -= pay2; pot += pay2; p.paid = (p.paid || 0) + pay2; toCall = Math.max(toCall, p.paid); p.act = (owe ? "rilancia " : "punta ") + A.fmt(amt * u); bettor = p; snd("chip");
            queue = ord.filter(function (q) { return q !== p && !q.fold; }); }
          paint(false); wait(a === "fold" ? 450 : 750).then(step);
        }
        if (p.me) {
          area.innerHTML = ""; var bx = el("div", "mx-bets"), bx2 = el("div", "mx-bets r2"); area.appendChild(bx); area.appendChild(bx2);       // due righe compatte: FOLD · CHECK/CALL, poi i rilanci
          function add(label, cls, f, row) { var b = el("button", cls || "", label); b.type = "button"; b.addEventListener("click", function () { A.haptic("medium"); area.innerHTML = ""; f(); }); (row || bx).appendChild(b); }
          var room = p.stack - owe;
          add("🏳️ FOLD", "f", function () { apply("fold"); });
          if (owe) { say(msg, "Devi pagare " + A.fmt(owe * u) + " $SDG"); add("✅ CALL " + A.fmt(Math.min(owe, p.stack) * u), "", function () { apply("call"); }); }
          else { say(msg, "Tocca a te: CHECK o PUNTA"); add("✔️ CHECK", "", function () { apply("check"); }); }
          var opts = [base, base * 2, base * 4].filter(function (m) { return room > m; });
          opts.forEach(function (m) { add((owe ? "+" : "") + A.fmt(m * u), "r", function () { apply("raise", m); }, bx2); });
          if (room > 0) add("ALL-IN " + A.fmt(room * u), "r allin", function () { apply("raise", room); }, bx2);
        } else {
          var str = strength(p) + (Math.random() - 0.5) * 0.12; say(msg, p.name + " decide…");
          var thr = 0.33 + Math.min(0.35, owe / Math.max(1, p.stack + owe) * 0.6), amt = str > 0.9 ? base * 2 : base;
          var a = owe ? (str > 0.78 && Math.random() < 0.35 && !bettor ? "raise" : (str > thr || Math.random() < 0.1 ? "call" : "fold")) : (str > 0.58 || Math.random() < 0.1 ? "raise" : "check");
          if (a === "raise" && p.stack < owe + amt) a = owe ? "call" : "check";
          wait(900).then(function () { apply(a, amt); });
        }
      });
    }
    function showdown() {
      cur = -1; var L = live(), win = [];
      if (L.length === 1) win = [L[0]];
      else { while (board.length < 5) board.push(deck.pop()); var bv = -1; L.forEach(function (p) { p.v = best7(p.hole.concat(board)); if (p.v > bv) { bv = p.v; win = [p]; } else if (p.v === bv) win.push(p); }); }
      win.forEach(function (p) { p.win = true; p.stack += Math.floor(pot / win.length); }); dealer = (dealer + 1) % P.length;
      paint(true); var mw = win.indexOf(P[0]) >= 0;
      banner(felt, mw ? "HAI VINTO!" : (win[0].name.replace("🤖 ", "") + " VINCE"), "Piatto " + A.fmt(pot * u) + " $SDG" + (L.length > 1 && win[0].v != null ? " · " + CATN[catOf(win[0].v)] : " · tutti gli altri hanno foldato"), mw ? "win" : "lose");
      say(msg, mw ? "Hai vinto il piatto di " + A.fmt(pot * u) + " $SDG!" : (P[0].fold ? "Hai foldato — vince " + win[0].name : "Vince " + win[0].name + " (" + A.fmt(pot * u) + " $SDG)"), mw ? "mp-win" : "mp-lose"); A.haptic(mw ? "ok" : "light"); snd(mw ? "win" : "lose");
      area.innerHTML = ""; var en = el("div", "mp-end"); area.appendChild(en); var a1 = el("button", "mp-go", "RIGIOCA"); a1.type = "button"; a1.addEventListener("click", function () { rematch(area, P.length, hand, E); });
      var a2 = el("button", "mp-go mp-alt", "LOBBY"); a2.type = "button"; a2.addEventListener("click", lobby); en.appendChild(a1); en.appendChild(a2);
    }
    hand();
  }

  window.ArcadeMulti = { load: function () {
    if (!(A.isSandbox && A.isSandbox())) { soon(); return; }
    A.api("/api/social/donors").then(function (j) { st.players = j.players || []; st.opp = null; lobby(); }).catch(function () { lobby(); });
  } };
})();
