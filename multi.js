/* Multiplayer — PROTOTIPO visibile solo nell'Account admin (sandbox). Gli avversari sono simulati (bot): nessun dato reale viene toccato.
   Sfide 1v1 (Sasso-Carta-Forbici, Dadi, Alto/Basso, Tris, Roulette) e tavoli (Blackjack insieme, Poker Texas) da provare con i bot. */
(function () {
  "use strict";
  var A = window.Arcade, body = document.getElementById("mpBody");
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var st = { opp: null, game: "srf", bet: 50, rounds: 3, players: [] };
  var GAMES = [["srf", "✊ Sasso-Carta-Forbici", true], ["dadi", "🎲 Dadi", true], ["hl", "⬆️ Alto/Basso", true], ["tris", "❌ Tris", true],
    ["ghig", "🪓 Ghigliottina", true], ["rr", "🔫 Roulette russa", true]];
  var GNAME = { srf: "SASSO-CARTA-FORBICI", dadi: "DADI", hl: "ALTO/BASSO", tris: "TRIS", rou: "ROULETTE 1v1", rr: "ROULETTE RUSSA", ghig: "GHIGLIOTTINA" };
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
    [["Poker Texas", "🂡", "pk"], ["Blackjack insieme", "🃏", "bj"], ["Scopa (2 o 4)", "🎴", "sc"]].forEach(function (t) {
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
      gt.addEventListener("click", function () { var bots = Math.max(1, n - 1); if (t[2] === "sc") scopaSetup(); else if (t[2] === "bj") bjTable(bots); else pkSetup(bots); });
      rw.appendChild(j); rw.appendChild(gt); tc.appendChild(rw); body.appendChild(tc);
    });
  }
  // ---- sfide 1v1, tutto in una schermata
var REV = '<svg viewBox="0 0 180 90" width="100%" height="100%"><defs><linearGradient id="rvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9cfdb"/><stop offset=".5" stop-color="#7b8394"/><stop offset="1" stop-color="#3a3f4c"/></linearGradient><linearGradient id="rvw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a5a2c"/><stop offset="1" stop-color="#4a2a12"/></linearGradient></defs><rect x="70" y="21" width="106" height="12" rx="2" fill="url(#rvg)"/><rect x="70" y="18" width="106" height="3.5" fill="#dfe4ee"/><rect x="168" y="14" width="6" height="6" fill="#aab1c0"/><path d="M28 20H72V47H46L28 38Z" fill="url(#rvg)"/><rect x="50" y="15" width="28" height="31" rx="4" fill="#5b6272" stroke="#2b2f3a" stroke-width="1.5"/><g stroke="#2b2f3a" stroke-width="1.5"><path d="M58 17V44M66 17V44M74 17V44"/></g><path d="M28 20L19 10H31L36 20Z" fill="#3a3f4c"/><path d="M30 37L50 46L45 87H20Z" fill="url(#rvw)" stroke="#2a1608" stroke-width="1.5"/><path d="M48 47Q62 68 80 47" fill="none" stroke="#7b8394" stroke-width="3.5"/><path d="M62 48L66 58" stroke="#c9cfdb" stroke-width="3"/></svg>';
  var ICON = { srf: "✊", dadi: "🎲", hl: "⬆️", tris: "❌", quiz: "🧠", ghig: "🪓", rou: "🎡", rr: REV };
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
        var ic = el("i", "", ICON[it[0]] && ICON[it[0]].indexOf("<svg") === 0 ? "" : (ICON[it[0]] || "🎮")); if (ICON[it[0]] && ICON[it[0]].indexOf("<svg") === 0) { ic.innerHTML = ICON[it[0]]; ic.className = "svgic"; } b.appendChild(ic); b.appendChild(el("span", "", it[1].replace(/^\S+\s/, "")));
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
    fit(true);
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

  // ---------- Ghigliottina: 5 indizi, una parola in comune ----------
  var GHIG = [["LUNA", "Miele Piena Chiaro Mezza Nuova"], ["PORTA", "Finestra Foglio Chiavi Bagagli Ombrelli"], ["CANE", "Pastore Guardia Lupo Randagio Fedele"], ["CAPO", "Tavola Lavoro Stazione Squadra Classe"],
    ["FUOCO", "Amico Armi Cessate Fatuo Greco"], ["MARE", "Alto Oltre Moto Aperto Mosso"], ["TESTA", "Croce Dura Calda Mal Quadrata"], ["FILO", "Spinato Rosso Interdentale Conduttore Ferro"],
    ["CARTA", "Credito Identità Igienica Geografica Bianca"], ["PALLA", "Canestro Volo Mano Nuoto Neve"], ["CIELO", "Gratta Stellato Azzurro Settimo Terra"], ["LATTE", "Caffè Scremato Condensato Intero Cioccolato"],
    ["BANCO", "Prova Nebbia Sabbia Scuola Corallo"], ["GIOCO", "Azzardo Fuori Squadra Prestigio Tavolo"], ["VENTO", "Contro Mulino Buon Colpo Raffica"], ["SALE", "Pepe Grosso Fino Miniera Marino"],
    ["PANE", "Burro Integrale Tostato Grattugiato Raffermo"], ["OCCHIO", "Colpo Bue Nero Lince Mira"], ["NOTTE", "Buona Bianca Fonda Mezza Magica"], ["STELLA", "Cadente Polare Marina Alpina Filante"],
    ["PESCE", "Rosso Spada Palla Cane Aprile"], ["VOLO", "Palla Libero Pindarico Charter Planare"], ["MANO", "Palla Stretta Seconda Fatta Mezza"], ["CUORE", "Batti Crepa Buon Trapianto Spezza"],
    ["DENTE", "Mal Latte Giudizio Leone Aglio"], ["CAMPO", "Minato Santo Profughi Base Visivo"], ["PIATTO", "Forte Fondo Unico Doccia Piano"], ["SCALA", "Mobile Reale Musicale Mercalli Antincendio"],
    ["LETTO", "Matrimoniale Castello Fiume Divano Singolo"], ["TEMPO", "Libero Pieno Perso Primo Brutto"]];
  var ghUsed = [];
  function norm(x) { return String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").toUpperCase(); }
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
    ghig: function (area, msg, E) {
      var pool = GHIG.map(function (_, i) { return i; }).filter(function (i) { return ghUsed.indexOf(i) < 0; }); if (!pool.length) { ghUsed = []; pool = GHIG.map(function (_, i) { return i; }); }
      var pi = pool[rnd(pool.length)]; ghUsed.push(pi); var sol = GHIG[pi][0], cl = GHIG[pi][1].split(" "), shown = 0, lock = 0, over = false, word = "";
      var botAt = 2 + rnd(3), botOk = Math.random() < 0.72;                     // il bot risponde dopo N indizi (e ci azzecca 7 volte su 10)
      return new Promise(function (res) {
        area.innerHTML = ""; var box = el("div", "gh-box"), list = el("div", "gh-list"), disp = el("div", "gh-in"), kb = el("div", "gh-kb"), tm = el("div", "gh-t");
        box.appendChild(tm); box.appendChild(list); box.appendChild(disp); box.appendChild(kb); area.appendChild(box);
        function show() { disp.textContent = word || "scrivi la parola in comune…"; disp.classList.toggle("ph", !word); }
        show();
        say(msg, "Indovina la parola in comune prima di " + st.opp.name + " (meno indizi = più bello)");
        function finish(r, txt) { if (over) return; over = true; kb.classList.add("off"); say(msg, txt, r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : "")); list.appendChild(el("div", "gh-sol", "🔑 " + sol)); wait(1500).then(function () { res(r); }); }
        function reveal() { if (over || !alive(E)) return; shown++; list.appendChild(el("div", "gh-c", cl[shown - 1].toUpperCase())); snd("chip");
          if (shown === botAt && botOk) return wait(1200 + rnd(1800)).then(function () { if (!over && alive(E)) finish(-1, st.opp.name + " ha indovinato: " + sol); });
          if (shown >= 5) { tm.textContent = "ultimo indizio: 12 secondi…"; return wait(12000).then(function () { if (!over && alive(E)) finish(0, "Nessuno ha indovinato: nuova parola"); }); }
          tm.textContent = "indizio " + shown + "/5"; wait(5200).then(reveal); }
        function send() { if (over || Date.now() < lock || !word) return; if (norm(word) === sol) { A.haptic("ok"); finish(1, "Giusto! Era " + sol); } else { A.haptic("bad"); lock = Date.now() + 2500; word = ""; disp.textContent = "Sbagliato! attendi 2,5 s"; disp.classList.add("ph"); setTimeout(show, 2500); } }
        ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].forEach(function (rw, ri) {
          var r = el("div", "gh-kr"); rw.split("").forEach(function (ch) { var k = el("button", "gh-k", ch); k.type = "button"; k.addEventListener("click", function () { if (over || Date.now() < lock || word.length >= 12) return; word += ch; A.haptic("light"); show(); }); r.appendChild(k); });
          if (ri === 2) { var d = el("button", "gh-k w", "⌫"); d.type = "button"; d.addEventListener("click", function () { word = word.slice(0, -1); show(); }); r.appendChild(d); }
          kb.appendChild(r);
        });
        var go = el("button", "gh-k go", "INVIA"); go.type = "button"; go.addEventListener("click", send); kb.appendChild(go);
        reveal();
      });
    },
    rr: function (area, msg, E) {
      var bullet = rnd(6), shot = 0, turn = rnd(2), opn = st.opp.name;
      return new Promise(function (res) {
        area.innerHTML = ""; var box = el("div", "rr-box"), cyl = el("div", "rr-cyl"), chs = [], btn = el("button", "mp-go rr-go", "SPARA"), fl = el("div", "rr-flash");
        for (var i = 0; i < 6; i++) { var ch = el("i", "rr-ch"); ch.style.transform = "rotate(" + i * 60 + "deg) translateY(-50px)"; cyl.appendChild(ch); chs.push(ch); }
        var gun = el("div", "rr-gun"); gun.innerHTML = REV; box.appendChild(gun); box.appendChild(cyl); box.appendChild(btn); box.appendChild(fl); area.appendChild(box); btn.type = "button"; btn.hidden = true;
        say(msg, "Un solo proiettile. Si sorteggia chi inizia…"); cyl.classList.add("spin"); snd("rspin");
        wait(1500).then(function () { cyl.classList.remove("spin"); say(msg, (turn === 0 ? "Inizi TU" : "Inizia " + opn)); return wait(900); }).then(next);
        function next() {
          if (!alive(E)) return; chs.forEach(function (c) { c.classList.remove("on"); }); chs[shot].classList.add("on");
          if (turn === 0) { say(msg, "Tocca a te: premi il grilletto…"); btn.hidden = false; btn.onclick = function () { btn.hidden = true; A.haptic("heavy"); fire(); }; }
          else { say(msg, opn + " prende la pistola…"); wait(1100 + rnd(900)).then(fire); }
        }
        function fire() {
          if (!alive(E)) return; say(msg, turn === 0 ? "…" : opn + " preme il grilletto…"); wait(1000).then(function () {
            if (!alive(E)) return;
            if (shot === bullet) { chs[shot].classList.add("bang"); fl.className = "rr-flash on"; snd("gun"); A.haptic("bad"); say(msg, "💥 BANG! " + (turn === 0 ? "Sei morto." : opn + " è morto!"), turn === 0 ? "mp-lose" : "mp-win"); wait(1700).then(function () { res(turn === 0 ? -1 : 1); }); }
            else { chs[shot].classList.add("em"); snd("rclick"); say(msg, "*click* — vuoto. " + (turn === 0 ? "Sei salvo… per ora." : opn + " è salvo.")); shot++; turn = 1 - turn; wait(1200).then(next); }
          });
        }
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
  function bjSoft(cs) { var t = 0, a = 0; cs.forEach(function (c) { if (c.r === 12) { a++; t += 11; } else t += c.r >= 8 ? 10 : c.r + 2; }); while (t > 21 && a > 0) { t -= 10; a--; } return a > 0; }
  function bjTxt(cs) { return (bjSoft(cs) ? "soft " : "") + bjVal(cs); }
  function bjVal(cs) { var t = 0, a = 0; cs.forEach(function (c) { if (c.r === 12) { a++; t += 11; } else t += c.r >= 8 ? 10 : c.r + 2; }); while (t > 21 && a > 0) { t -= 10; a--; } return t; }
  function bjTable(bots) {
    fit(true); epoch++; var E = epoch; body.innerHTML = "";
    var deck = newDeck(), profit = 0, c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "BLACKJACK · " + A.fmt(st.bet) + " $SDG a mano"));
    var felt = el("div", "mx-felt bj"), shoe = el("div", "mx-shoe"), msg = el("div", "pg-me", ""), area = el("div", "mp-area"), tot = el("div", "pg-me", "");
    c.appendChild(felt); c.appendChild(msg); c.appendChild(area); c.appendChild(tot);
    var P = [{ name: "Tu", me: true }]; for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i });
    var order = P.length === 1 ? [0] : P.length === 2 ? [1, 0] : P.length === 3 ? [1, 0, 2] : [1, 0, 2, 3];       // io al centro, gli altri accanto (stesso lato)
    var dealer, cur = -1, lead = -1;
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
        s.appendChild(el("div", "mx-info", bjTxt(p.cards) + (p.st === "bust" ? " 💥" : (p.st === "stand" ? " ✋" : "")))); s.appendChild(el("div", "mx-tag", p.name + (pi === lead ? " ▶" : ""))); (p.me ? mro : bro).appendChild(s);
      });
      return settle(felt, shoe);
    }
    function hand() {
      area.innerHTML = ""; tot.textContent = ""; lead = (lead + 1) % P.length; dealer = [draw(), draw()]; P.forEach(function (p) { p.cards = [draw(), draw()]; p.st = bjVal(p.cards) === 21 ? "stand" : "play"; p.res = null; });
      cur = -1; say(msg, "Si distribuiscono le carte…"); var n = paint(true);
      wait(300 + n * 120).then(round);
    }
    function round() {                                            // un "giro": ogni giocatore attivo chiede UNA carta oppure sta
      if (!alive(E)) return;
      var ord = P.slice(lead).concat(P.slice(0, lead)).filter(function (p) { return p.st === "play"; });      // si parte da chi è "di mano": ruota ogni mano
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
            if (i === 0) { var nc = draw(); p.cards.push(nc); say(msg, "Hai pescato " + RK[nc.r] + SU[nc.s] + (nc.r === 12 ? " (l'asso vale 1 o 11)" : "") + " → " + bjTxt(p.cards)); took(); } else p.st = "stand";
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
  // scelta del tavolo e del buy-in PRIMA di sedersi (simulato: il saldo reale non cambia)
  function walletNow() { var n = parseInt(String((document.getElementById("pcoins") || {}).textContent || "").replace(/\D/g, ""), 10); return isNaN(n) ? 0 : n; }
  function pkSetup(bots) {
    fit(true); epoch++; body.innerHTML = ""; backBar("TAVOLI");
    var wallet = walletNow(), rich = false, c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "POKER · SCEGLI IL BUY-IN"));
    var info = el("div", "pg-me", ""), r1 = el("div", "mp-rowc"), r2 = el("div", "mp-rowc"), go = el("div", "mp-end"); c.appendChild(info); c.appendChild(r1); c.appendChild(r2); c.appendChild(go);
    var buy = 0;
    function paintSetup() {
      var steps = rich ? [1000, 2000, 5000] : [100, 200, 500], opts = steps.filter(function (n) { return n <= wallet; });
      info.textContent = "Il tuo saldo: " + A.fmt(wallet) + " $SDG · ante " + A.fmt(rich ? 50 : 5) + " a mano";
      if (!opts.length && wallet > 0 && !rich) opts = [wallet];
      if (!opts.length) { buy = 0; r1.innerHTML = ""; r2.innerHTML = ""; go.innerHTML = ""; say(info, rich ? "Servono almeno 1.000 $SDG per il tavolo ricco." : "Non hai $SDG per sederti."); var b0 = el("button", "mp-go mp-alt", "TAVOLO NORMALE"); b0.type = "button"; b0.addEventListener("click", function () { rich = false; buy = 0; paintSetup(); }); go.appendChild(b0); return; }
      if (opts.indexOf(buy) < 0) buy = opts[0];
      chips(r1, opts.map(function (n) { return [n, A.fmt(n)]; }), buy, function (it) { buy = it[0]; paintSetup(); });
      chips(r2, [[0, "Normale"], [1, "💎 Ricco (puntate ×10)"]], rich ? 1 : 0, function (it) { rich = !!it[0]; buy = 0; paintSetup(); });
      go.innerHTML = ""; var a = el("button", "mp-go", "SIEDITI CON " + A.fmt(buy)); a.type = "button"; a.addEventListener("click", function () { pkTable(bots, { buy: buy, wallet: wallet - buy, u: rich ? 50 : 5 }); }); go.appendChild(a);
    }
    paintSetup();
  }

  // ====================================================================== SCOPA (carte napoletane): 2 giocatori, 4 ognuno per sé, oppure 4 a coppie
  var SNM = ["denari", "coppe", "spade", "bastoni"], PRIM = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 }, FIGN = { 8: "Fante", 9: "Cavallo", 10: "Re" }, FIGE = { 8: "🧒", 9: "🏇", 10: "👑" };
  var PIPL = { 1: [[.5, .5]], 2: [[.5, .27], [.5, .73]], 3: [[.5, .2], [.5, .5], [.5, .8]], 4: [[.3, .28], [.7, .28], [.3, .72], [.7, .72]], 5: [[.3, .26], [.7, .26], [.5, .5], [.3, .74], [.7, .74]],
    6: [[.3, .22], [.7, .22], [.3, .5], [.7, .5], [.3, .78], [.7, .78]], 7: [[.3, .22], [.7, .22], [.5, .36], [.3, .5], [.7, .5], [.3, .78], [.7, .78]] };
  function pip(s) {                                                  // semi in stile carte napoletane: moneta, coppa, spada, bastone
    if (s === 0) return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#e8b52a" stroke="#6b4a00" stroke-width="1.2"/><circle cx="12" cy="12" r="8.9" fill="none" stroke="#9a6a00" stroke-width="1" stroke-dasharray="1.5 1.3"/><circle cx="12" cy="12" r="7" fill="#f6d35c" stroke="#a87400" stroke-width=".8"/><polygon points="12.0,5.8 13.3,8.9 16.4,7.6 15.1,10.7 18.2,12.0 15.1,13.3 16.4,16.4 13.3,15.1 12.0,18.2 10.7,15.1 7.6,16.4 8.9,13.3 5.8,12.0 8.9,10.7 7.6,7.6 10.7,8.9" fill="#c88a10" stroke="#8a5a00" stroke-width=".5"/><circle cx="12" cy="12" r="2.1" fill="#8a5a00"/></svg>';
    if (s === 1) return '<svg viewBox="0 0 24 24"><path d="M4 3.4h16c.4 6-2.4 10-6.4 10.6V17h4.2v1.8c0 1.2-.8 2.2-2.2 2.2H8.4c-1.4 0-2.2-1-2.2-2.2V17h4.2v-3C6.4 13.4 3.6 9.4 4 3.4z" fill="#e0a822" stroke="#6b3a00" stroke-width="1.1"/><ellipse cx="12" cy="3.6" rx="8" ry="1.7" fill="#f6d35c" stroke="#6b3a00" stroke-width=".9"/><path d="M5.4 7.6h13.2" stroke="#c4162f" stroke-width="1.7"/><circle cx="12" cy="15.4" r="1.5" fill="#c4162f" stroke="#6b3a00" stroke-width=".5"/><path d="M6.6 5.2c.2 2.6 1.2 4.6 3 6" stroke="#fff3b0" stroke-width=".9" fill="none"/></svg>';
    if (s === 2) return '<svg viewBox="0 0 24 24"><g transform="rotate(35 12 12)"><path d="M12 .6l2.5 3.4c.3 3.6.3 7.4 0 11H9.5c-.3-3.6-.3-7.4 0-11z" fill="#c9d3e6" stroke="#2a3558" stroke-width="1"/><path d="M12 1.6v13.4" stroke="#7d8db8" stroke-width=".9"/><path d="M3.4 15.4c2.2-2 4.6-1.8 6.1-.6h5c1.5-1.2 3.9-1.4 6.1.6-1 2.6-3.6 2.8-5.2 1.6h-6.8c-1.6 1.2-4.2 1-5.2-1.6z" fill="#e0a822" stroke="#6b3a00" stroke-width=".9"/><rect x="10.7" y="16.6" width="2.6" height="4.4" rx="1" fill="#7a2410" stroke="#3a0e04" stroke-width=".6"/><circle cx="12" cy="22.2" r="1.6" fill="#e0a822" stroke="#6b3a00" stroke-width=".7"/></g></svg>';
    return '<svg viewBox="0 0 24 24"><g transform="rotate(32 12 12)"><path d="M9.4 1.6c-1.7.2-2.6 1.4-2.4 3 .2 2.4 1.4 4.4 1.4 7.4 0 3.4-1.5 5.8-1.3 8.2.2 1.6 1.8 2.6 4.9 2.6s4.5-1 4.7-2.6c.2-2.4-1.3-4.8-1.3-8.2 0-3 1.2-5 1.4-7.4.1-1.6-.8-2.8-2.4-3z" fill="#a8742f" stroke="#4a2c0c" stroke-width="1"/><ellipse cx="10.4" cy="10" rx="1.5" ry="1" fill="#6a3f14"/><ellipse cx="13.8" cy="15.4" rx="1.4" ry=".9" fill="#6a3f14"/><path d="M10.6 3.6c-.4 3 .6 5 .6 8.4" stroke="#d9a866" stroke-width=".9" fill="none"/><path d="M7 7.2c-2.6-.6-4.2-2.2-4-4.6 2.6.2 4.2 1.8 4 4.6z" fill="#3a9a3a" stroke="#14501c" stroke-width=".7"/></g></svg>';
  }
  var FTH = ["#d9a21b", "#c4162f", "#2f57b8", "#2f8a2f"];
  function figSvg(v, s) {                                           // Fante, Cavallo, Re: figure stilizzate come sulle carte napoletane (colore del vestito = seme)
    var c = FTH[s], d = "#2a1a0a", sk = "#f1c9a0", o = ' stroke="' + d + '" stroke-width="1" stroke-linejoin="round"';
    if (v === 8) return '<svg viewBox="0 0 40 56"><path d="M12 12c0-6 4-9 8-9s8 3 8 9z" fill="' + c + '"' + o + '/><path d="M24 5c4-4 9-3 10 0-3-1-6 0-8 3z" fill="#fff"' + o + '/><ellipse cx="20" cy="12.4" rx="10" ry="2.2" fill="' + c + '"' + o + '/><circle cx="20" cy="18" r="5" fill="' + sk + '"' + o + '/><path d="M11 24h18l2 20H9z" fill="' + c + '"' + o + '/><path d="M9 33h22" stroke="' + d + '" stroke-width="2"/><rect x="12" y="43" width="6" height="11" fill="#fff"' + o + '/><rect x="22" y="43" width="6" height="11" fill="' + shadeHex(c) + '"' + o + '/><path d="M7 26l5 2v10l-4 2z" fill="' + c + '"' + o + '/></svg>';
    if (v === 9) { var hb = "#8a5a2b", hd = "#5a3510", ho = ' stroke="#2a1a0a" stroke-width="1" stroke-linejoin="round"';
      return '<svg viewBox="0 0 40 56"><path d="M5 35c-3 2-4 7-3 12" stroke="' + hd + '" stroke-width="2.6" fill="none" stroke-linecap="round"/><rect x="8" y="42" width="4" height="12" fill="' + hd + '"' + ho + '/><rect x="22" y="42" width="4" height="12" fill="' + hd + '"' + ho + '/><ellipse cx="17" cy="38" rx="13" ry="7.5" fill="' + hb + '"' + ho + '/><rect x="13" y="42" width="4" height="12" fill="' + hb + '"' + ho + '/><rect x="27" y="42" width="4" height="12" fill="' + hb + '"' + ho + '/><path d="M24 34l4-16 5-3 5 5-1 4-5 1-2 6z" fill="' + hb + '"' + ho + '/><path d="M29 16l1-5 3 4z" fill="' + hb + '"' + ho + '/><circle cx="34.5" cy="19.6" r="1" fill="#fff"/><path d="M28 18c-1 6-2 10-4 15" stroke="' + hd + '" stroke-width="2.4" fill="none"/><path d="M14 29l-9-24" stroke="' + hd + '" stroke-width="1.8"/><path d="M5 5l7 2-6 4z" fill="' + c + '"' + ho + '/><rect x="12" y="19" width="10" height="15" rx="3" fill="' + c + '"' + ho + '/><circle cx="17" cy="14.5" r="4.6" fill="' + sk + '"' + ho + '/><path d="M12 14c0-6 3-8.600 5-8.600s5 2.600 5 8.600z" fill="' + c + '"' + ho + '/><path d="M15 6c0-3 2-4 4-3" stroke="#fff" stroke-width="2" fill="none"/></svg>'; }
    return '<svg viewBox="0 0 40 56"><rect x="6" y="14" width="28" height="40" rx="3" fill="#6b3a18"' + o + '/><path d="M10 25h20l4 29H6z" fill="' + c + '"' + o + '/><path d="M12 28h16v4H12z" fill="#fff"' + o + '/><circle cx="20" cy="19" r="5.4" fill="' + sk + '"' + o + '/><path d="M15 21c0 7 10 7 10 0z" fill="#e8e4dc"' + o + '/><path d="M13 14l2-8 3 5 2-6 2 6 3-5 2 8z" fill="#f2c230"' + o + '/><path d="M31 10v34" stroke="' + d + '" stroke-width="2"/><circle cx="31" cy="9" r="3" fill="#f2c230"' + o + '/><path d="M6 25l6 2v14l-4-2z" fill="' + c + '"' + o + '/></svg>';
  }
  function shadeHex(h) { var n = parseInt(h.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return "rgb(" + Math.round(r * 0.7) + "," + Math.round(g * 0.7) + "," + Math.round(b * 0.7) + ")"; }
  function scEl(c, cls) {
    var w = el("div", "sc-w" + (cls ? " " + cls : "")), e = el("span", "sc-c s" + c.s); e.appendChild(el("b", "", String(c.v))); var pc = el("div", "sc-pips");
    if (c.v <= 7) PIPL[c.v].forEach(function (p) { var i = el("i"); i.innerHTML = pip(c.s); i.style.left = (p[0] * 100) + "%"; i.style.top = (p[1] * 100) + "%"; if (c.v <= 2) i.className = "big"; pc.appendChild(i); });
    else { var f = el("span", "sc-fig"); f.innerHTML = figSvg(c.v, c.s); pc.appendChild(f); var sm = el("i", "sm"); sm.innerHTML = pip(c.s); pc.appendChild(sm); }
    e.appendChild(pc); w.appendChild(e); w.appendChild(el("div", "sc-nm", c.v > 7 ? FIGN[c.v] + " = " + c.v : "")); w._card = c; return w;
  }
  function scopaSetup() {
    fit(true); epoch++; body.innerHTML = ""; backBar("TAVOLI"); var mode = "2", c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "SCOPA · COME VUOI GIOCARE?"));
    var row = el("div", "mp-rowc"), info = el("div", "pg-me", ""), go = el("div", "mp-end"); c.appendChild(row); c.appendChild(info); c.appendChild(go);
    function paintSetup() {
      chips(row, [["2", "2 giocatori"], ["4s", "4 · ognuno per sé"], ["4c", "4 · a coppie"]], mode, function (it) { mode = it[0]; paintSetup(); });
      say(info, mode === "2" ? "Tu contro un bot, 18 mani a testa." : mode === "4s" ? "Tutti contro tutti (1v1v1v1): vince chi fa più punti." : "Tu e il Bot 2 (di fronte a te) contro Bot 1 e Bot 3: le carte prese si sommano.");
      go.innerHTML = ""; var a = el("button", "mp-go", "▶ GIOCA · " + A.fmt(st.bet) + " $SDG"); a.type = "button"; a.addEventListener("click", function () { scopaTable(mode); }); go.appendChild(a);
    }
    paintSetup();
  }
  function scopaTable(mode) {
    fit(true); epoch++; var E = epoch; body.innerHTML = "";
    var N = mode === "2" ? 2 : 4, c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "SCOPA · " + (mode === "2" ? "1 contro 1" : mode === "4s" ? "1v1v1v1" : "2 contro 2") + " · " + A.fmt(st.bet) + " $SDG"));
    var felt = el("div", "mx-felt bl sc-felt"), msg = el("div", "pg-me", ""), area = el("div", "mp-area pkarea"); c.appendChild(felt); c.appendChild(msg); c.appendChild(area);
    var names = N === 2 ? ["Tu", "🤖 Bot"] : ["Tu", "🤖 Bot 1", mode === "4c" ? "🤖 Bot 2 (socio)" : "🤖 Bot 2", "🤖 Bot 3"];
    var P = names.map(function (n, i) { return { name: n, me: i === 0, ent: mode === "4c" ? i % 2 : i, hand: [], cap: [] }; });
    var NE = mode === "4c" ? 2 : N, ENT = mode === "4c" ? ["Noi", "Loro"] : P.map(function (p) { return p.name.replace("🤖 ", ""); });
    var deck = [], table = [], turn = 0, lastCap = 0, scope = []; for (var q0 = 0; q0 < NE; q0++) scope.push(0);
    var sel = null, picks = [];
    for (var s2 = 0; s2 < 4; s2++) for (var v = 1; v <= 10; v++) deck.push({ s: s2, v: v });
    for (var i = deck.length - 1; i > 0; i--) { var j = rnd(i + 1), tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp; }
    for (var k = 0; k < 4; k++) table.push(deck.pop());
    function deal() { P.forEach(function (p) { for (var q = 0; q < 3; q++) p.hand.push(deck.pop()); }); }
    deal();
    function opts(card) {
      var eq = []; table.forEach(function (t, i) { if (t.v === card.v) eq.push([i]); }); if (eq.length) return eq;
      var out = [], n = table.length; for (var m = 1; m < (1 << n); m++) { var sum = 0, ids = []; for (var b = 0; b < n; b++) if (m & (1 << b)) { sum += table[b].v; ids.push(b); } if (sum === card.v) out.push(ids); }
      return out;
    }
    function valid() {
      if (!sel || !picks.length) return false; var eq = table.some(function (t) { return t.v === sel.v; });
      if (eq) return picks.length === 1 && table[picks[0]].v === sel.v;
      return picks.reduce(function (a, ix) { return a + table[ix].v; }, 0) === sel.v;
    }
    function paint() {
      felt.innerHTML = "";
      var top = el("div", "sc-top"); P.forEach(function (p, i) { if (p.me) return; var o = el("div", "sc-opp" + (i === turn ? " turn" : "")); var bk = el("div", "sc-bk"); for (var q = 0; q < p.hand.length; q++) bk.appendChild(el("span", "sc-c back")); o.appendChild(bk); o.appendChild(el("div", "mx-tag", p.name)); top.appendChild(o); }); felt.appendChild(top);
      var tb = el("div", "sc-table"); table.forEach(function (t, i) { var on = picks.indexOf(i) >= 0, e = scEl(t, on ? "pick" : (sel ? "can" : "")); if (sel && turn === 0) e.addEventListener("click", function () { var x = picks.indexOf(i); if (x >= 0) picks.splice(x, 1); else picks.push(i); A.haptic("light"); paint(); upd(); }); tb.appendChild(e); }); if (!table.length) tb.appendChild(el("div", "sc-empty", "tavolo vuoto")); felt.appendChild(tb);
      felt.appendChild(el("div", "sc-info", "Mazzo " + deck.length + " · Scope: " + ENT.map(function (n, i) { return n + " " + scope[i]; }).join(" · ")));
      var me = el("div", "sc-me"); P[0].hand.forEach(function (cd) { var e = scEl(cd, turn === 0 ? (cd === sel ? "sel" : "pl") : "dis"); if (turn === 0) e.addEventListener("click", function () { sel = (sel === cd ? null : cd); picks = []; A.haptic("light"); paint(); upd(); }); me.appendChild(e); }); felt.appendChild(me);
    }
    function upd() {                                                  // pulsanti e testo guida durante la tua mano
      if (turn !== 0) return; area.innerHTML = "";
      if (!sel) { say(msg, "Tocca a te: scegli una delle tue carte"); return; }
      var sum = picks.reduce(function (a, ix) { return a + table[ix].v; }, 0), can = opts(sel).length > 0;
      say(msg, "Carta " + sel.v + " (vale " + sel.v + ")" + (picks.length ? " · prendi " + picks.map(function (ix) { return table[ix].v; }).join(" + ") + " = " + sum + (valid() ? " ✓" : "") : (can ? " · tocca le carte del tavolo da prendere" : " · niente da prendere: buttala")));
      var bx = el("div", "mx-bets"); area.appendChild(bx);
      var tk = el("button", "ok big", "✅ PRENDI"); tk.type = "button"; tk.disabled = !valid(); tk.addEventListener("click", function () { var cd = sel, ids = picks.slice(); sel = null; picks = []; area.innerHTML = ""; doPlay(0, cd, ids); paint(); wait(900).then(advance); }); bx.appendChild(tk);
      var th = el("button", "f big", "⬇️ BUTTA"); th.type = "button"; th.disabled = can; th.addEventListener("click", function () { var cd = sel; sel = null; picks = []; area.innerHTML = ""; doPlay(0, cd, null); paint(); wait(900).then(advance); }); bx.appendChild(th);
    }
    function doPlay(pi, cd, take) {
      var p = P[pi]; p.hand.splice(p.hand.indexOf(cd), 1);
      if (take && take.length) {
        var got = [cd]; take.slice().sort(function (a, b) { return b - a; }).forEach(function (ix) { got.push(table.splice(ix, 1)[0]); }); p.cap = p.cap.concat(got); lastCap = pi;
        var last = !deck.length && P.every(function (q) { return !q.hand.length; });
        if (!table.length && !last) { scope[p.ent]++; say(msg, p.name + " fa SCOPA! 🧹", p.me ? "mp-win" : ""); snd("win"); } else say(msg, p.name + " prende " + got.map(function (g) { return g.v; }).join(" + "));
        snd("chip");
      } else { table.push(cd); say(msg, p.name + " butta il " + cd.v); }
    }
    function advance() {
      if (!alive(E)) return;
      if (P.every(function (q) { return !q.hand.length; })) { if (deck.length) deal(); else return finish(); }
      turn = (turn + 1) % N; paint(); next();
    }
    function botMove(pi) {
      var p = P[pi], best = null, bs = -1e9;
      p.hand.forEach(function (cd) { opts(cd).forEach(function (ids) { var got = ids.map(function (ix) { return table[ix]; }).concat([cd]), sc = got.length + got.filter(function (g) { return g.s === 0; }).length * 2 + got.filter(function (g) { return g.s === 0 && g.v === 7; }).length * 12 + got.filter(function (g) { return g.v === 7; }).length * 2 + (ids.length === table.length ? 10 : 0); if (sc > bs) { bs = sc; best = [cd, ids]; } }); });
      if (best) return best;
      var low = p.hand.slice().sort(function (a, b) { return ((a.s === 0 ? 8 : 0) + (a.v === 7 ? 12 : 0) + a.v) - ((b.s === 0 ? 8 : 0) + (b.v === 7 ? 12 : 0) + b.v); })[0]; return [low, null];
    }
    function next() {
      if (!alive(E)) return;
      if (turn === 0) { sel = null; picks = []; paint(); upd(); return; }
      say(msg, P[turn].name + " pensa…"); area.innerHTML = ""; var pi = turn; wait(1000 + rnd(500)).then(function () { if (!alive(E)) return; var m = botMove(pi); doPlay(pi, m[0], m[1]); paint(); wait(900).then(advance); });
    }
    function finish() {
      if (table.length) { P[lastCap].cap = P[lastCap].cap.concat(table); table = []; }
      var E2 = ENT.map(function (n, i) { var cs = []; P.forEach(function (p) { if (p.ent === i) cs = cs.concat(p.cap); }); var pr = 0; for (var s3 = 0; s3 < 4; s3++) { var b = 0; cs.forEach(function (x) { if (x.s === s3) b = Math.max(b, PRIM[x.v]); }); pr += b; }
        return { n: n, car: cs.length, den: cs.filter(function (x) { return x.s === 0; }).length, sb: cs.some(function (x) { return x.s === 0 && x.v === 7; }), pr: pr, sc: scope[i], pt: 0 }; });
      function top(key) { var mx = Math.max.apply(null, E2.map(function (e) { return e[key]; })), w = E2.filter(function (e) { return e[key] === mx; }); return w.length === 1 && mx > 0 ? w[0] : null; }
      var wCar = top("car"), wDen = top("den"), wPr = top("pr"), wSc = null; E2.forEach(function (e) { e.pt = e.sc + (e === wCar ? 1 : 0) + (e === wDen ? 1 : 0) + (e === wPr ? 1 : 0) + (e.sb ? 1 : 0); });
      felt.innerHTML = ""; var rs = el("div", "sc-res"), tbl = el("div", "sc-tbl"); tbl.style.gridTemplateColumns = "auto " + E2.map(function () { return "1fr"; }).join(" ");
      function cell(t, cls) { tbl.appendChild(el("div", "sc-cl" + (cls ? " " + cls : ""), t)); }
      cell(""); E2.forEach(function (e) { cell(e.n, "hd" + (e === E2[0] ? " me" : "")); });
      var maxSc = Math.max.apply(null, E2.map(function (e) { return e.sc; }));
      [["Carte", "car", wCar], ["Denari", "den", wDen], ["Settebello", "sb", null], ["Primiera", "pr", wPr], ["Scope", "sc", null]].forEach(function (r) {
        cell(r[0], "lb"); E2.forEach(function (e) { var hi = r[1] === "sb" ? e.sb : (r[1] === "sc" ? (e.sc > 0 && e.sc === maxSc) : e === r[2]); cell(r[1] === "sb" ? (e.sb ? "✓" : "–") : String(e[r[1]]), hi ? "hi" : ""); });
      });
      cell("PUNTI", "lb tot"); var mxp = Math.max.apply(null, E2.map(function (e) { return e.pt; })); E2.forEach(function (e) { cell(String(e.pt), "tot" + (e.pt === mxp ? " hi" : "")); });
      var winners = E2.filter(function (e) { return e.pt === mxp; }), won = winners.length === 1 && winners[0] === E2[0], tie = winners.length > 1 && winners.indexOf(E2[0]) >= 0;
      rs.appendChild(el("b", "", won ? "HAI VINTO!" : (tie ? "PAREGGIO" : (winners.length === 1 ? "VINCE " + winners[0].n.toUpperCase() : "HAI PERSO")))); rs.appendChild(tbl); felt.appendChild(rs);
      say(msg, tie ? "Pari: nessuno vince" : (won ? "Hai vinto " + A.fmt(st.bet) + " $SDG (simulato)" : "Hai perso " + A.fmt(st.bet) + " $SDG (simulato)"), won ? "mp-win" : (tie ? "" : "mp-lose")); A.haptic(won ? "ok" : "light"); snd(won ? "win" : "lose");
      area.innerHTML = ""; var en = el("div", "mp-end"); area.appendChild(en); var a1 = el("button", "mp-go", "RIGIOCA"); a1.type = "button"; a1.addEventListener("click", function () { scopaTable(mode); });
      var a2 = el("button", "mp-go mp-alt", "LOBBY"); a2.type = "button"; a2.addEventListener("click", lobby); en.appendChild(a1); en.appendChild(a2);
    }
    paint(); next();
  }
  function pkTable(bots, cfg) {
    cfg = cfg || { buy: 100, wallet: 0, u: 5 };
    fit(true); epoch++; var E = epoch; body.innerHTML = "";
    var u = cfg.u, S0 = Math.max(4, Math.round(cfg.buy / u)), wallet = cfg.wallet, P = [{ name: "Tu", me: true, stack: S0 }];
    for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i, stack: S0 });
    var POS = P.length === 2 ? ["b", "t"] : P.length === 3 ? ["b", "l", "r"] : ["b", "l", "t", "r"];          // io in basso, avversari a sinistra / di fronte / a destra
    var PS = { b: "left:50%;bottom:8px;transform:translateX(-50%)", t: "left:50%;top:8px;transform:translateX(-50%)", l: "left:2px;top:36%", r: "right:2px;top:36%" };
    var c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "POKER TEXAS · ante " + A.fmt(u) + " $SDG (simulato)" + (u >= 50 ? " 💎" : "")));
    var felt = el("div", "mx-felt pk"), shoe = el("div", "mx-shoe"), msg = el("div", "pg-me", ""), area = el("div", "mp-area pkarea");
    shoe.style.cssText = "right:46%;top:46%;width:1px;height:1px;opacity:0;box-shadow:none"; 
    c.appendChild(felt); c.appendChild(msg); c.appendChild(area);
    var deck, board, pot, cur, dealer = 0;
    function paint(show) {
      felt.innerHTML = ""; felt.appendChild(shoe);
      var mid = el("div", "pk-mid"), prow = el("div", "pk-pot"), heap = el("span", "heap"), cm = el("div", "mx-cs pk-board");
      prow.appendChild(el("span", "", "Piatto " + A.fmt(pot * u) + " $SDG"));
      for (var q = 0; q < Math.min(14, 1 + Math.floor(pot / 2)); q++) { var ch = el("i", "ch c" + (q % 3)); ch.style.left = (6 + ((q * 37) % 31)) + "px"; ch.style.top = (6 - ((q * 53) % 9) - (q > 8 ? 4 : 0)) + "px"; heap.appendChild(ch); }
      prow.appendChild(heap); mid.appendChild(prow);
      for (var k = 0; k < 5; k++) cm.appendChild(k < board.length ? mcEl(board[k], false, "cm") : el("span", "mc cm empty")); mid.appendChild(cm); felt.appendChild(mid);
      P.forEach(function (p, i) {
        var s = el("div", "mx-seat" + (p.me ? " me" : "") + (i === cur ? " turn" : "") + (p.fold ? " fold" : "") + (p.hl ? " hl-" + p.hl : "")); s.style.cssText = PS[POS[i]];
        var cs = el("div", "mx-cs"); if (p.hole) p.hole.forEach(function (x) { cs.appendChild(mcEl(x, !(p.me || (show && !p.fold)), p.me ? "" : "")); }); s.appendChild(cs);
        s.appendChild(el("div", "mx-tag", p.name + " · " + A.fmt(p.stack * u) + (i === dealer ? " Ⓓ" : "")));
        var act0 = show && !p.fold ? "" : (p.fold ? "fold" : (p.act || "")), inf = act0 + (show && !p.fold && p.hole ? (act0 ? " · " : "") + CATN[catOf(best7(p.hole.concat(board)))] : "");
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
    function rebuy() {                                         // fiche finite: ricompra dal tuo saldo oppure esci
      area.innerHTML = ""; var opts = (u >= 50 ? [1000, 2000, 5000] : [50, 100, 200, 500]).filter(function (n) { return n <= wallet; });
      if (!opts.length && wallet > 0) opts = [wallet];
      say(msg, opts.length ? "Fiche finite! Ricompra per restare al tavolo (saldo " + A.fmt(wallet) + ")" : "Fiche finite e saldo insufficiente: non puoi ricomprare.");
      var bx = el("div", "mx-bets"); area.appendChild(bx);
      opts.forEach(function (n) { var b = el("button", "r", "💰 " + A.fmt(n)); b.type = "button"; b.addEventListener("click", function () { wallet -= n; P[0].stack = Math.max(2, Math.round(n / u)); A.haptic("medium"); hand(); }); bx.appendChild(b); });
      var ex = el("button", "f", "🚪 ESCI"); ex.type = "button"; ex.addEventListener("click", lobby); bx.appendChild(ex);
    }
    function hand() {
      if (!alive(E)) return; area.innerHTML = ""; deck = newDeck(); board = []; pot = 0;
      P.forEach(function (p) { if (!p.me && p.stack < 2) p.stack = S0; p.hl = ""; });
      if (P[0].stack < 2) return rebuy();
      P.forEach(function (p) { p.fold = false; p.act = ""; p.win = false; p.hole = [deck.pop(), deck.pop()]; p.stack -= 1; pot += 1; });   // ante = 1 unità
      cur = -1; say(msg, "Carte distribuite. Ante pagato da tutti."); var n = paint(false);
      wait(500 + n * 110).then(function () { return street(0); });
    }
    function street(s) {
      if (!alive(E)) return;
      if (live().length < 2) return showdown();
      if (s === 1) board.push(deck.pop(), deck.pop(), deck.pop()); else if (s === 2 || s === 3) board.push(deck.pop());
      if (s === 4) return showdown();
      P.forEach(function (p) { p.act = ""; p.hl = ""; }); var nn = paint(false);
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
          else { var pay2 = Math.min(owe + amt, p.stack); p.stack -= pay2; pot += pay2; p.paid = (p.paid || 0) + pay2; toCall = Math.max(toCall, p.paid); p.act = (p.stack === 0 ? "ALL-IN " : (owe ? "rilancia " : "punta ")) + A.fmt(pay2 * u); p.hl = p.stack === 0 ? "allin" : "raise"; bettor = p; snd("chip");
            queue = ord.filter(function (q) { return q !== p && !q.fold; }); }
          paint(false); wait(a === "fold" ? 450 : 750).then(step);
        }
        if (p.me) {
          area.innerHTML = ""; var bx = el("div", "mx-bets"), bx2 = el("div", "mx-bets r2"); area.appendChild(bx); area.appendChild(bx2);       // due righe compatte: FOLD · CHECK/CALL, poi i rilanci
          function add(label, cls, f, row) { var b = el("button", cls || "", label); b.type = "button"; b.addEventListener("click", function () { A.haptic("medium"); area.innerHTML = ""; f(); }); (row || bx).appendChild(b); }
          var room = p.stack - owe;
          add("🏳️ FOLD", "f big", function () { apply("fold"); });
          if (owe) { say(msg, "Devi pagare " + A.fmt(owe * u) + " $SDG"); add("✅ CALL " + A.fmt(Math.min(owe, p.stack) * u), "ok big", function () { apply("call"); }); }
          else { say(msg, "Tocca a te: CHECK o PUNTA"); add("✔️ CHECK", "ok big", function () { apply("check"); }); }
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
