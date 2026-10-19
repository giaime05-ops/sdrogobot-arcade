/* Multiplayer — PROTOTIPO visibile solo nell'Account admin (sandbox). Gli avversari sono simulati: nessun dato reale viene toccato. */
(function () {
  "use strict";
  var A = window.Arcade, body = document.getElementById("mpBody");
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var st = { opp: null, game: "srf", bet: 50, rounds: 3, players: [] };
  var GAMES = [["srf", "✊ Sasso-Carta-Forbici", true], ["dadi", "🎲 Dadi", false], ["hl", "⬆️ Alto/Basso", false], ["tris", "❌ Tris", false],
    ["quiz", "🧠 Quiz 1v1", false], ["ghig", "🪓 Ghigliottina", false], ["rou", "🎡 Roulette 1v1", false]];
  var HANDS = [["✊", "Sasso"], ["✋", "Carta"], ["✌️", "Forbici"]];

  function soon() {
    body.innerHTML = ""; var b = el("div", "mp-soon"); b.appendChild(el("b", "", "IN ARRIVO")); b.appendChild(el("span", "", "Il multiplayer sta per arrivare")); body.appendChild(b);
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
  function lobby() {
    body.innerHTML = "";
    body.appendChild(el("div", "pg-me", "🛠️ Prototipo (solo admin): gli avversari sono simulati"));
    body.appendChild(el("div", "mp-sec", "SFIDA DIRETTA"));
    var c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "", "Avversario"));
    var rp = el("div", "mp-row"); c.appendChild(rp);
    function names() { return (st.players.length ? st.players : [{ id: "1", name: "Marco" }, { id: "2", name: "Giulia" }, { id: "3", name: "Luca" }]); }
    if (!st.opp) st.opp = names()[0];
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

    body.appendChild(el("div", "mp-sec", "TAVOLI (fino a 4 giocatori)"));
    [["Poker Texas", "🂡"], ["Blackjack insieme", "🃏"]].forEach(function (t) {
      var tc = el("div", "mp-card"); tc.appendChild(el("div", "", t[1] + " " + t[0]));
      var seats = el("div"); tc.appendChild(seats); var n = 1;
      function paintSeats() {
        seats.innerHTML = "";
        for (var i = 0; i < 4; i++) { var s = el("span", "mp-seat" + (i === 0 ? " me" : ""), i < n ? (i === 0 ? "Tu" : names()[(i - 1) % names().length].name) : "libero"); seats.appendChild(s); }
      }
      paintSeats();
      var j = el("button", "mp-go", "AGGIUNGI GIOCATORE (simulato)"); j.type = "button";
      j.addEventListener("click", function () { if (n < 4) { n++; paintSeats(); A.haptic("light"); } else A.toast("Tavolo pieno: in partita (prototipo)"); });
      tc.appendChild(j); body.appendChild(tc);
    });
  }
  function send() {
    body.innerHTML = ""; var c = el("div", "mp-card"); c.appendChild(el("div", "mp-sec", "SFIDA INVIATA A " + st.opp.name.toUpperCase()));
    c.appendChild(el("div", "pg-me", "In attesa che accetti…")); body.appendChild(c);
    setTimeout(function () { srf(); }, 1500);
  }
  function srf() {
    var need = Math.floor(st.rounds / 2) + 1, me = 0, op = 0, rd = 1;
    function view(msg, over) {
      body.innerHTML = "";
      var c = el("div", "mp-card"); body.appendChild(c);
      c.appendChild(el("div", "mp-sec", "SASSO-CARTA-FORBICI · round " + Math.min(rd, st.rounds) + "/" + st.rounds + " · " + A.fmt(st.bet) + " $SDG"));
      var vs = el("div", "mp-vs"); var a = el("div"), b = el("div"); a.appendChild(el("div", "big", String(me))); a.appendChild(el("small", "", "Tu")); b.appendChild(el("div", "big", String(op))); b.appendChild(el("small", "", st.opp.name));
      vs.appendChild(a); vs.appendChild(b); c.appendChild(vs);
      c.appendChild(el("div", "pg-me", msg || "Scegli la tua mossa"));
      if (over) { var again = el("button", "mp-go", "TORNA ALLA LOBBY"); again.type = "button"; again.addEventListener("click", lobby); c.appendChild(again); return; }
      var h = el("div", "mp-hand");
      HANDS.forEach(function (x, i) {
        var bt = el("button", "", x[0]); bt.type = "button"; bt.title = x[1];
        bt.addEventListener("click", function () {
          A.haptic("medium");
          var o = Math.floor(Math.random() * 3), r = (i - o + 3) % 3;     // 0 pari, 1 vinco, 2 perdo
          var t = HANDS[o][0] + " " + st.opp.name + " — ";
          if (r === 1) { me++; t += "round tuo!"; } else if (r === 2) { op++; t += "round suo."; } else t += "pari: rigioca";
          if (r) rd++;
          if (me >= need || op >= need) { view(t + (me > op ? "  HAI VINTO +" + A.fmt(st.bet) : "  HAI PERSO −" + A.fmt(st.bet)) + " $SDG (simulato)", true); return; }
          view(t);
        }); h.appendChild(bt);
      });
      c.appendChild(h);
    }
    view("");
  }
  window.ArcadeMulti = { load: function () {
    if (!(A.isSandbox && A.isSandbox())) { soon(); return; }
    A.api("/api/social/donors").then(function (j) { st.players = j.players || []; st.opp = null; lobby(); }).catch(function () { lobby(); });
  } };
})();
