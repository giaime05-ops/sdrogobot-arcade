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
  var HANDN = [3, 5, 7, 10, 12, 15, 18, 20, 25];
  function handsSlider(row, cur, inf, on) {                              // barra a tacche per il numero di mani (∞ solo contro i bot)
    row.innerHTML = ""; var vals = HANDN.slice(); if (inf) vals.push(0); var i = vals.indexOf(cur); if (i < 0) i = vals.indexOf(10);
    function lb(v) { return v ? v + " mani" : "∞ senza limite"; }
    var w = el("div", "hs"), v = el("b", "hs-v", lb(vals[i])), r = el("input", "hs-r"); r.type = "range"; r.min = 0; r.max = vals.length - 1; r.step = 1; r.value = i;
    r.addEventListener("input", function () { v.textContent = lb(vals[+r.value]); A.haptic("light"); }); r.addEventListener("change", function () { on(vals[+r.value]); });
    var tk = el("div", "hs-t"); vals.forEach(function (x) { tk.appendChild(el("i", "", x ? String(x) : "∞")); });
    w.appendChild(v); w.appendChild(r); w.appendChild(tk); row.appendChild(w);
  }
  function names() { return [BOT].concat(st.players.length ? st.players : [{ id: "1", name: "Marco" }, { id: "2", name: "Giulia" }, { id: "3", name: "Luca" }]); }

  // ====================================================================== lobby
  function backBar(title, to) {
    var h = el("div", "mp-top"); var bk = el("button", "mp-back", "‹ Multi"); bk.type = "button"; bk.addEventListener("click", to || lobby);
    h.appendChild(bk); h.appendChild(el("div", "mp-title", title)); body.appendChild(h); return h;
  }
  // ---- amici (da /api/social/friends: nome e stile profilo veri), per scegliere chi invitare
  var frCache = null;
  function loadFriends() {
    if (frCache) return Promise.resolve(frCache);
    return A.api("/api/social/friends").then(function (j) { frCache = (j.friends || []).filter(function (f) { return !/^bot\d/.test(f.pid || ""); }).map(function (f) { f.real = true; return f; }); if (!frCache.length) throw 0; frCache.sort(function (a, b) { return (b.online ? 1 : 0) - (a.online ? 1 : 0); }); return frCache; }).catch(function () {
      return names().filter(function (p) { return p.id !== "bot"; }).map(function (p) { return { pid: p.id, name: p.name, style: p.style || {}, online: false }; });
    });
  }
  function myName() { var n = A.me && A.me() && A.me().name; if (!n) { try { var u = window.Telegram.WebApp.initDataUnsafe.user; n = u && (u.first_name || u.username); } catch (e) {} } return n || "Tu"; }
  // invito a un amico offline: avviso prima, poi tag nel gruppo su Telegram
  function offlineAsk(f, ok) {
    var sh = el("div", "fr-sheet"), bx = el("div", "fr-sbox"); bx.appendChild(el("b", "", f.name + " è offline"));
    bx.appendChild(el("div", "pg-me", "Se lo inviti, verrà taggato nel gruppo su Telegram (con il suo @username) e potrà entrare quando vede il messaggio."));
    var a = el("button", "mp-go", "📣 INVITA E TAGGA"), b = el("button", "mp-go mp-alt", "ANNULLA"); a.type = b.type = "button";
    a.addEventListener("click", function () { sh.remove(); ok(); }); b.addEventListener("click", function () { sh.remove(); });
    bx.appendChild(a); bx.appendChild(b); sh.appendChild(bx); document.body.appendChild(sh);
  }
  function friendSheet(exclude, pick) {
    var sh = el("div", "fr-sheet"), bx = el("div", "fr-sbox"); bx.appendChild(el("b", "", "SCEGLI UN AMICO")); var lst = el("div", "fr-list"); bx.appendChild(lst); lst.appendChild(el("div", "pg-empty", "Carico…"));
    var cl = el("button", "mp-go mp-alt", "CHIUDI"); cl.type = "button"; cl.addEventListener("click", function () { sh.remove(); }); bx.appendChild(cl); sh.appendChild(bx); sh.addEventListener("click", function (e) { if (e.target === sh) sh.remove(); }); document.body.appendChild(sh);
    loadFriends().then(function (L) {
      lst.innerHTML = ""; L = L.filter(function (f) { return exclude.indexOf(f.pid) < 0; });
      if (!L.length) { lst.appendChild(el("div", "pg-empty", "Nessun amico da invitare.")); return; }
      L.forEach(function (f) {
        var r = el("button", "fr-r" + (f.online ? " on" : "")); r.type = "button"; var av = el("div", "avatar rav"); A.styleAvatar(av, f.style || {}, (f.name || "?").charAt(0).toUpperCase()); r.appendChild(av);
        var n = el("div", "nm"); n.appendChild(A.nameEl(f.name, f.style || {})); r.appendChild(n); r.appendChild(el("span", "st", f.online ? "● online" : "offline"));
        r.addEventListener("click", function () { sh.remove(); if (f.online) pick(f); else offlineAsk(f, function () { pick(f); }); }); lst.appendChild(r);
      });
    });
  }
  var HUBART = {
    pk: '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet"><g transform="translate(118 66)"><g transform="rotate(-24)"><rect x="-26" y="-40" width="52" height="76" rx="6" fill="#fff"/><text x="-19" y="-22" font-size="16" font-weight="900" fill="#c0182f" font-family="Bungee,sans-serif">A</text><text x="-12" y="14" font-size="38" fill="#c0182f">♥</text></g><g transform="rotate(-4)"><rect x="-26" y="-40" width="52" height="76" rx="6" fill="#fff"/><text x="-19" y="-22" font-size="16" font-weight="900" fill="#111" font-family="Bungee,sans-serif">K</text><text x="-12" y="14" font-size="38" fill="#111">♠</text></g><g transform="rotate(18)"><rect x="-26" y="-40" width="52" height="76" rx="6" fill="#fff"/><text x="-19" y="-22" font-size="16" font-weight="900" fill="#c0182f" font-family="Bungee,sans-serif">Q</text><text x="-12" y="14" font-size="38" fill="#c0182f">♦</text></g></g><g><circle cx="176" cy="96" r="13" fill="#e8233f" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/><circle cx="176" cy="88" r="13" fill="#2b6fff" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/><circle cx="160" cy="100" r="13" fill="#111" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/></g></svg>',
    du: '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet"><g transform="translate(130 62)"><g transform="rotate(42)"><rect x="-5" y="-52" width="10" height="82" rx="3" fill="#dfe6f2"/><rect x="-1.5" y="-50" width="3" height="78" fill="#9fb0c8"/><rect x="-16" y="28" width="32" height="7" rx="3" fill="#ffb300"/><rect x="-4" y="34" width="8" height="20" rx="3" fill="#7a3b12"/></g><g transform="rotate(-42)"><rect x="-5" y="-52" width="10" height="82" rx="3" fill="#dfe6f2"/><rect x="-1.5" y="-50" width="3" height="78" fill="#9fb0c8"/><rect x="-16" y="28" width="32" height="7" rx="3" fill="#ffb300"/><rect x="-4" y="34" width="8" height="20" rx="3" fill="#7a3b12"/></g><g fill="#ffd23b"><path d="M0 -22 L5 -6 L20 -2 L5 3 L0 18 L-5 3 L-20 -2 L-5 -6Z" opacity=".95"/></g></g><g fill="#fff" opacity=".7"><circle cx="86" cy="26" r="2.5"/><circle cx="178" cy="22" r="3"/><circle cx="96" cy="104" r="2"/><circle cx="184" cy="100" r="2.5"/></g></svg>',
    rc: '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet"><path d="M100 120 L128 0 L176 0 L200 120Z" fill="#2a1d55"/><path d="M128 0 L134 0 L112 120 L100 120Z" fill="#ff3db0"/><path d="M176 0 L170 0 L196 120 L200 120Z" fill="#ff3db0"/><g stroke="#fff" stroke-width="3" stroke-dasharray="9 9"><line x1="152" y1="0" x2="156" y2="120"/></g><g transform="translate(150 78)"><rect x="-17" y="-8" width="34" height="30" rx="7" fill="#19d3ff"/><rect x="-12" y="-17" width="24" height="14" rx="5" fill="#0a7fa6"/><rect x="-22" y="8" width="10" height="16" rx="3" fill="#111"/><rect x="12" y="8" width="10" height="16" rx="3" fill="#111"/><rect x="-14" y="22" width="28" height="5" rx="2" fill="#ffd23b"/></g><g stroke="#fff" opacity=".6" stroke-width="2"><line x1="60" y1="30" x2="92" y2="30"/><line x1="48" y1="52" x2="84" y2="52"/><line x1="66" y1="76" x2="96" y2="76"/></g><g transform="translate(10 8)"><path d="M0 0h8v8h-8zM16 0h8v8h-8zM8 8h8v8h-8zM24 8h8v8h-8z" fill="#fff" opacity=".85"/></g></svg>',
    qz: '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet"><text x="106" y="96" font-size="110" font-weight="900" fill="#fff" opacity=".9" font-family="Bungee,sans-serif">?</text><text x="170" y="52" font-size="48" font-weight="900" fill="#ffd23b" font-family="Bungee,sans-serif">?</text><text x="76" y="40" font-size="34" font-weight="900" fill="#2ee6c0" font-family="Bungee,sans-serif">?</text></svg>'
  };
  // ---- home del multiplayer: grandi riquadri, uno per sezione
  var lastAct = {};
  function act(k) { try { if (!isReal() || (lastAct[k] && Date.now() - lastAct[k] < 15000)) return; lastAct[k] = Date.now(); A.api("/api/act", "POST", { a: k }).catch(function () {}); } catch (e) {} }
  function lobby() {
    act("multi");
    dropTl(); netClose(); fit(true); epoch++; body.innerHTML = "";
    if (A.isSandbox && A.isSandbox()) body.appendChild(el("div", "pg-me", "🛠️ Prototipo (solo admin): gli avversari sono simulati"));
    body.appendChild(invBox());
    var g = el("div", "mp-hub"); body.appendChild(g);
    [["pk", "TAVOLI", "Poker, Blackjack e Scopa con gli amici", tables, true], ["du", "SFIDE 1v1", "Sasso-carta-forbici, dadi, tris, roulette…", duels, true],
     ["rc", "GRAND PRIX", "Giri a tempo, gare e classifiche", function () { if (window.ArcadeRace) { fit(true); epoch++; body.innerHTML = ""; window.ArcadeRace.open(body, lobby); } }, true],
     ["qz", "QUIZ", "Sfida il gruppo: in arrivo", null, false]].forEach(function (t) {
      var b = el("button", "mp-tile t-" + t[0] + (t[4] ? "" : " off")); b.type = "button";
      var art = el("div", "mp-art"); art.innerHTML = HUBART[t[0]]; b.appendChild(art);
      var tx = el("div", "mp-tx"); tx.appendChild(el("b", "", t[1])); tx.appendChild(el("span", "", t[2])); if (!t[4]) tx.appendChild(el("em", "", "🔒 PRESTO")); b.appendChild(tx);
      b.addEventListener("click", function () { if (t[3]) { A.haptic("light"); t[3](); } else A.toast("Presto!"); }); g.appendChild(b);
    });
  }
  // ---- tavoli: elenco (un banner per gioco) → GIOCA apre la lobby del tavolo
  var TBL = {
    pk: { name: "Poker Texas", sub: "Fino a 4 giocatori · buy-in e puntate", max: 4, art: HUBART.pk },
    bj: { name: "Blackjack insieme", sub: "Tutti contro il banco · fino a 4", max: 4, art: '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet"><text x="62" y="104" font-size="96" font-weight="900" fill="#ffd23b" font-family="Bungee,sans-serif" opacity=".95">21</text><g transform="translate(150 60) rotate(14)"><rect x="-22" y="-32" width="44" height="64" rx="6" fill="#fff"/><text x="-16" y="-14" font-size="14" font-weight="900" fill="#111" font-family="Bungee,sans-serif">A</text><text x="-11" y="16" font-size="32" fill="#111">♠</text></g></svg>' },
    sc: { name: "Scopa", sub: "In 2 o in 4 · a 11 o 21 punti", max: 4, art: '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet"><g transform="translate(78 60)"><circle r="40" fill="#ffd23b" stroke="#b8860b" stroke-width="5"/><circle r="30" fill="none" stroke="#b8860b" stroke-width="3" stroke-dasharray="4 5"/><text x="-14" y="14" font-size="40" font-weight="900" fill="#8a5a00" font-family="Bungee,sans-serif">7</text></g><g transform="translate(150 62) rotate(10)"><rect x="-24" y="-36" width="48" height="72" rx="6" fill="#fdf3d8"/><path d="M0 -20 L12 0 L0 20 L-12 0Z" fill="#c0182f"/></g></svg>' }
  };
  function dropTl() { var L = st.tl; if (L && L.rm && !L.started) { A.api("/api/room/leave", "POST", { id: L.rm }).catch(function () {}); } if (L && L._pt) { clearInterval(L._pt); L._pt = 0; } st.tl = null; }
  function tables() {
    act("tavoli");
    if (st.tl && st.tl.rm && !st.tl.started) dropTl(); netClose(); fit(true); epoch++; body.innerHTML = ""; backBar("TAVOLI"); body.appendChild(invBox());
    var g = el("div", "mp-hub tbl-list"); body.appendChild(g);
    ["pk", "bj", "sc"].forEach(function (k) {
      var t = TBL[k], b = el("button", "mp-tile tb-" + k); b.type = "button"; var art = el("div", "mp-art"); art.innerHTML = t.art; b.appendChild(art);
      var tx = el("div", "mp-tx"); tx.appendChild(el("b", "", t.name)); tx.appendChild(el("span", "", t.sub)); tx.appendChild(el("em", "", "▶ GIOCA")); b.appendChild(tx);
      b.addEventListener("click", function () { A.haptic("light"); st.tl = null; tableLobby(k); }); g.appendChild(b);
    });
  }
  // ---- lobby di un tavolo: posti (tu, amici invitati, bot) + regole + AVVIA. Stessa schermata che userà il server.
  function tblFromRoom(k, room, host) {                                // ricostruisce posti e regole dalla stanza (host dopo una partita, ospite sempre)
    var c = room.cfg || {}, x = c.x || {}, L = { k: k, hands: c.hands || 0, seats: [null, null, null, null], mode: "4s", rm: room.id, view: room };
    var hs = room.players.filter(function (p) { return p.uid === room.host; })[0] || room.players[0] || {};
    L.seats[0] = host ? { t: "me" } : { t: "friend", host: true, human: true, uid: hs.uid, name: hs.name, style: hs.style, rdy: true, you: room.me === hs.uid };
    room.players.filter(function (p) { return p.uid !== room.host; }).forEach(function (p) { var fi = L.seats.indexOf(null); if (fi >= 0) L.seats[fi] = { t: "friend", human: true, uid: p.uid, pid: p.pid, name: p.name, style: p.style, rdy: !!p.ready, you: p.uid === room.me }; });
    for (var b = 0; b < (x.bots | 0); b++) { var fj = L.seats.indexOf(null); if (fj >= 0) L.seats[fj] = { t: "bot", name: "Bot " + (b + 1) }; }
    if (k === "pk") { L.buy = c.stake || 0; L.rich = (x.u | 0) === 50; } else if (k === "bj") { L.bet = x.bet || 50; } else { L.pot = c.stake || 50; L.target = x.tgt || 0; L.mode = x.m4 ? "4c" : "4s"; }
    return L;
  }
  function tblToLobby(id, round, k, auto) {                            // fine tavolo: si torna nella stessa lobby con gli stessi giocatori
    netClose(); fit(true); epoch++; var E = epoch; body.innerHTML = ""; backBar("TAVOLO", tables); body.appendChild(el("div", "rc-note", "Torno alla lobby…")); var tries = 0;
    function fail() { A.toast("Il tavolo è già ripartito o chiuso"); tables(); }
    function open(rm) { if (rm.host === rm.me) { var L = tblFromRoom(k, rm, true); L.auto = auto ? 1 : 0; L.prevN = rm.players.length; st.tl = L; tableLobby(k); } else tableLobby(k, rm); }
    (function go() {
      if (!alive(E)) return;
      A.api("/api/room/rematch", "POST", { id: id, round: round }).then(function (j) {
        if (!alive(E)) return; if (j && j.wait) { setTimeout(go, 1500); return; }
        if (!j || !j.success) return fail(); open(j.room);
      }).catch(function (e) {
        if (!alive(E)) return;
        if (e && e.status === 409) return A.api("/api/room/join", "POST", { id: id }).then(function (j) { if (j && j.success) open(j.room); else fail(); }).catch(fail);
        if (++tries < 3) setTimeout(go, 1200); else fail();
      });
    })();
  }
  function tableLobby(k, guestRoom) {
    var ro = !!guestRoom; fit(true); epoch++; body.innerHTML = ""; var T = TBL[k];
    function leaveG() { A.api("/api/room/leave", "POST", { id: guestRoom.id }).catch(function () {}); netClose(); tables(); }
    backBar(T.name.toUpperCase(), ro ? leaveG : tables);
    var L = ro ? tblFromRoom(k, guestRoom, false) : (st.tl && st.tl.k === k ? st.tl : (st.tl = { k: k, hands: 0, seats: [{ t: "me" }, null, null, null], buy: 0, rich: false, mode: "4s", target: st.scTarget == null ? 11 : st.scTarget }));
    var wallet = walletNow(), TE = epoch, GK = { pk: "poker", bj: "bj", sc: "scopa" }[k];
    L.started = false; if (L.rm && !L._pt && !ro) tlWatch();
    var seatsE = el("div", "tl-seats"); body.appendChild(seatsE);
    var rules = el("div", "mp-card tl-rules"); body.appendChild(rules);
    var go = el("div", "mp-end dl-go"); body.appendChild(go);
    function count() { return L.seats.filter(Boolean).length; }
    function addBot(i) { var n = L.seats.filter(function (x) { return x && x.t === "bot"; }).length + 1; L.seats[i] = { t: "bot", name: "Bot " + n }; A.haptic("light"); paint(); }
    function tlCfg() {
      var bn = L.seats.filter(function (x) { return x && x.t === "bot"; }).length;
      if (k === "pk") return { stake: L.buy, hands: L.hands || 10, max: T.max, x: { u: L.rich ? 50 : 5, bots: bn } };
      if (k === "bj") return { stake: (L.bet || 50) * 20, hands: L.hands || 10, max: T.max, x: { bet: L.bet || 50, bots: bn } };
      return { stake: L.pot || 50, max: 4, x: { tgt: L.target || 0, m4: L.mode === "4c" ? 1 : 0, bots: bn } };
    }
    function tlWatch() {
      if (L._pt) return; L._pt = setInterval(function () {
        if (st.tl !== L || !L.rm) { clearInterval(L._pt); L._pt = 0; return; }
        A.api("/api/room/sync", "POST", { id: L.rm, since: 1e9 }).then(function (j) {
          if (!j || !j.room) return; L.view = j.room; var pl = j.room.players, ch = false;
          L.seats.forEach(function (sl) { if (sl && sl.human && sl.t === "wait") { var f = pl.filter(function (p) { return p.pid === sl.pid; })[0]; if (f) { sl.t = "friend"; sl.uid = f.uid; sl.rdy = !!f.ready; ch = true; } } });
          L.seats.forEach(function (sl, i) { if (sl && sl.human && sl.t === "friend") { var f = pl.filter(function (p) { return p.uid === sl.uid; })[0]; if (!f) { L.seats[i] = null; ch = true; } else if (sl.rdy !== !!f.ready) { sl.rdy = !!f.ready; ch = true; } } });
          pl.forEach(function (p) { if (p.uid === j.room.me || L.seats.some(function (sl) { return sl && sl.uid === p.uid; })) return; var fi = L.seats.indexOf(null); if (fi >= 0) { L.seats[fi] = { t: "friend", human: true, uid: p.uid, pid: p.pid, name: p.name, style: p.style, rdy: !!p.ready }; ch = true; } });
          if (ch && epoch === TE) paint();
        }).catch(function () {});
      }, 1500);
    }
    function invite(i) { friendSheet(L.seats.filter(Boolean).map(function (x) { return x.pid; }), function (f) {
      if (f.real && isReal()) {                                       // amico vero: stanza sul server, puntata trattenuta, invito su Telegram
        var go2 = function () { A.api("/api/room/invite", "POST", { id: L.rm, pid: f.pid }).then(function (j) { L.seats[i] = { t: "wait", name: f.name, style: f.style, pid: f.pid, human: true }; if (j && j.offline) A.toast(f.name + " è offline: l'ho taggato nel gruppo"); tlWatch(); paint(); }).catch(function (x) { A.toast((x && x.message) || "Invito non riuscito"); }); };
        if (L.rm) return go2();
        A.api("/api/room/create", "POST", { game: GK, cfg: tlCfg() }).then(function (j) { L.rm = j.room.id; L.view = j.room; go2(); }).catch(function (x) { A.toast((x && x.message) || "Server non raggiungibile"); }); return;
      }
      var sl = { t: "wait", name: f.name, style: f.style, pid: f.pid }; L.seats[i] = sl; paint(); wait(1400).then(function () { if (L.seats[i] === sl) { sl.t = "friend"; if (st.tl === L) paint(); } }); }); }
    function paintSeats() {
      seatsE.innerHTML = "";
      for (var i = 0; i < T.max; i++) (function (i) {
        var x = L.seats[i], c = el("div", "tl-seat" + (x ? " full " + (x.host ? "me" : x.t) : ""));
        if (!x) {
          c.appendChild(el("div", "tl-no", "Posto " + (i + 1)));
          if (ro) c.appendChild(el("div", "tl-free", "libero"));
          else { var r = el("div", "tl-btns"); var a = el("button", "", "👥 INVITA"), b = el("button", "alt", "🤖 BOT"); a.type = b.type = "button";
          a.addEventListener("click", function () { invite(i); }); b.addEventListener("click", function () { addBot(i); }); r.appendChild(a); r.appendChild(b); c.appendChild(r); }
        } else {
          var av = el("div", "avatar rav"); if (x.t === "bot") av.textContent = "🤖"; else A.styleAvatar(av, x.t === "me" ? ((A.me && A.me().style) || {}) : (x.style || {}), (x.t === "me" ? myName().charAt(0).toUpperCase() : (x.name || "?").charAt(0).toUpperCase())); c.appendChild(av);
          var nm = el("div", "tl-nm"); if (x.t === "me") nm.appendChild(A.nameEl(myName(), (A.me && A.me().style) || {})); else if (x.t === "bot") nm.appendChild(el("span", "", x.name)); else nm.appendChild(A.nameEl(x.name, x.style || {}));
          nm.appendChild(el("small", "", x.t === "me" || x.host ? "HOST" + (x.you ? " · tu" : "") : x.t === "bot" ? "bot" : x.t === "wait" ? "invitato…" : (x.rdy === false ? "sta guardando i risultati…" : "pronto ✓" + (x.you ? " · tu" : "")))); c.appendChild(nm);
          if (!ro && x.t !== "me" && !(x.human && x.t === "friend")) { var rm = el("button", "tl-x", "✕"); rm.type = "button"; rm.addEventListener("click", function () { L.seats[i] = null; paint(); }); c.appendChild(rm); }
        }
        seatsE.appendChild(c);
      })(i);
    }
    function paintRules() { paintRules0(); if (!ro && L.rm) pushCfg(); }
    function paintRules0() {
      rules.innerHTML = ""; var n = count();
      if (k === "pk") {
        rules.appendChild(el("div", "mp-sec", "REGOLE · POKER"));
        var steps = L.rich ? [1000, 2000, 5000] : [100, 200, 500], opts = ro ? (steps.indexOf(L.buy) < 0 ? steps.concat([L.buy]) : steps) : steps.filter(function (v) { return v <= wallet; }); if (!opts.length && wallet > 0 && !L.rich) opts = [wallet];
        if (!ro && opts.indexOf(L.buy) < 0) L.buy = opts[0] || 0;
        function row(lab) { var r = el("div", "tl-row"); r.appendChild(el("span", "", lab)); var c = el("div", "mp-rowc"); r.appendChild(c); rules.appendChild(r); return c; }
        var r1 = row("Buy-in"), r2 = row("Tavolo"), r5 = row("Mani");
        if (opts.length) chips(r1, opts.map(function (v) { return [v, A.fmt(v)]; }), L.buy, function (it) { L.buy = it[0]; paintRules(); paintGo(); }); else r1.appendChild(el("span", "tl-warn", L.rich ? "Servono 1.000 $SDG" : "Nessun $SDG"));
        chips(r2, [[0, "Normale"], [1, "💎 Ricco ×10"]], L.rich ? 1 : 0, function (it) { L.rich = !!it[0]; L.buy = 0; paintRules(); paintGo(); });
        var onl = !!L.rm || L.seats.some(function (x) { return x && x.human; });
        handsSlider(r5, onl ? (L.hands || 10) : L.hands, !onl, function (v) { L.hands = v; paintRules(); });
        rules.appendChild(el("div", "tl-info", "Saldo " + A.fmt(wallet) + " $SDG · ante " + A.fmt(L.rich ? 50 : 5) + " a mano"));
      } else if (k === "bj") {
        rules.appendChild(el("div", "mp-sec", "REGOLE"));
        rules.appendChild(el("div", "pg-me", "Ognuno punta a ogni mano e gioca contro il banco. Vince chi si avvicina di più a 21 senza sballare."));
        if (!L.bet) L.bet = 50;
        var rb = el("div", "tl-row"); rb.appendChild(el("span", "", "Puntata a mano")); var rbc = el("div", "mp-rowc"); rb.appendChild(rbc); rules.appendChild(rb); chips(rbc, [10, 25, 50, 100, 250].map(function (v) { return [v, A.fmt(v)]; }), L.bet, function (it) { L.bet = it[0]; st.bet = L.bet; paintRules(); });
        var hasH = L.rm || L.seats.some(function (x) { return x && x.human; });
        if (hasH) { var rh = el("div", "tl-row"); rh.appendChild(el("span", "", "Mani")); var rhc = el("div", "mp-rowc"); rh.appendChild(rhc); rules.appendChild(rh); handsSlider(rhc, L.hands || 10, false, function (v) { L.hands = v; paintRules(); });
        rules.appendChild(el("div", "tl-info", "Online: buy-in " + A.fmt(L.bet * 20) + " $SDG (20 puntate) · a fine tavolo si incassa in base alle fiches")); }
      } else {
        rules.appendChild(el("div", "mp-sec", "REGOLE · SCOPA"));
        if (n > 2) { var r3 = el("div", "mp-rowc"); rules.appendChild(r3); chips(r3, [["4s", "Ognuno per sé"], ["4c", "A coppie"]], L.mode, function (it) { L.mode = it[0]; paintRules(); }); }
        else rules.appendChild(el("div", "pg-me", "2 giocatori. Con 3 o 4 posti si gioca in 4."));
        rules.appendChild(el("div", "mp-lab", "Punteggio finale")); var r4 = el("div", "mp-rowc"); rules.appendChild(r4);
        chips(r4, [[0, "Una mano"], [11, "A 11"], [21, "A 21"]], L.target, function (it) { L.target = it[0]; st.scTarget = L.target; paintRules(); });
        if (!L.pot) L.pot = 50;
        var rp = el("div", "tl-row"); rp.appendChild(el("span", "", "Posta a testa")); var rpc = el("div", "mp-rowc"); rp.appendChild(rpc); rules.appendChild(rp); chips(rpc, [10, 50, 100, 500, 1000].map(function (v) { return [v, A.fmt(v)]; }), L.pot, function (it) { L.pot = it[0]; st.bet = L.pot; paintRules(); });
        rules.appendChild(el("div", "tl-info", "Il piatto (posta × giocatori veri) va a chi vince la partita"));
      }
    }
    function lockMoney() {
      if (L.rm && k !== "sc" && !ro) rules.appendChild(el("div", "tl-info tl-lock", "💰 La puntata viene trattenuta a tutti insieme quando l'host preme AVVIA"));
      if (ro) { rules.classList.add("ro"); rules.querySelectorAll("button,input").forEach(function (b) { b.disabled = true; }); rules.appendChild(el("div", "tl-info tl-lock", "Solo l'host può cambiare le regole · le vedi in diretta")); }
    }
    function paintGo() {
      go.innerHTML = "";
      if (ro) { go.appendChild(el("div", "mp-wait", "⏳ In attesa che l'host avvii il tavolo…")); var ex = el("button", "mp-go mp-alt", "ESCI DALLA LOBBY"); ex.type = "button"; ex.addEventListener("click", leaveG); go.appendChild(ex); return; }
      var n = count(), ok = n >= 2 && !(k === "pk" && !L.buy), b = el("button", "mp-go", n < 2 ? "AGGIUNGI UN GIOCATORE" : "▶ AVVIA"); b.type = "button"; b.disabled = !ok;
      var waitingH = L.seats.some(function (x) { return x && x.human && x.t === "wait"; }), joined = L.seats.filter(function (x) { return x && x.human && x.t === "friend"; }).length;
      var notBack = L.seats.some(function (x) { return x && x.human && x.t === "friend" && x.rdy === false; });
      if (L.rm) { b.disabled = !joined || waitingH || notBack || (k === "pk" && !L.buy); if (waitingH || !joined) b.textContent = "IN ATTESA DEGLI AMICI…"; else if (notBack) b.textContent = "ASPETTO CHE TORNINO…"; }
      b.addEventListener("click", function () {
        if (L.rm) return tlStart();
        var bots = Math.max(1, count() - 1);
        if (k === "pk") pkTable(bots, { buy: L.buy, wallet: wallet - L.buy, u: L.rich ? 50 : 5, hands: L.hands }); else if (k === "bj") bjTable(bots); else scopaTable(count() > 2 ? L.mode : "2", L.target);
      }); go.appendChild(b);
    }
    function tlStart() {                                              // host: manda le regole finali, poi il via: tutti i telefoni partono insieme
      var botsN = L.seats.filter(function (x) { return x && x.t === "bot"; }).length, c0 = tlCfg(); c0.x.bots = botsN;
      if (k === "sc") c0.x.n4 = (botsN + 1 + L.seats.filter(function (x) { return x && x.human; }).length) > 2 ? 1 : 0;
      L.started = true; clearInterval(L._pt); L._pt = 0;
      A.api("/api/room/cfg", "POST", { id: L.rm, cfg: { stake: c0.stake, hands: c0.hands || 0, x: c0.x } }).then(function () {
        var N0 = netOpen(L.view || { id: L.rm, me: null, players: [] }, function () { runTable(GK); });
        return A.api("/api/room/start", "POST", { id: L.rm });
      }).catch(function (x) { L.started = false; A.toast((x && x.message) || "Non riesco ad avviare"); tlWatch(); });
    }
    function pushCfg() { if (!L.rm || L.started) return; clearTimeout(L._pc); L._pc = setTimeout(function () { var c0 = tlCfg(); A.api("/api/room/cfg", "POST", { id: L.rm, cfg: { stake: c0.stake, hands: c0.hands || 0, x: c0.x } }).catch(function () {}); }, 350); }
    function paint() { paintSeats(); paintRules(); lockMoney(); paintGo(); if (!ro) pushCfg(); }
    paint();
    if (ro) {                                                          // ospite: stessa schermata dell'host, in sola lettura e sempre aggiornata
      A.api("/api/room/ready", "POST", { id: guestRoom.id, ready: true }).catch(function () {});
      var N0 = netOpen(guestRoom, function () { if (epoch === TE) runTable(GK); }), host0 = guestRoom.host, sig0 = "";
      var piv = setInterval(function () {
        if (epoch !== TE || NET !== N0) return clearInterval(piv);
        if (N0.gone) { clearInterval(piv); A.toast("Il tavolo è stato chiuso"); netClose(); return tables(); }
        var v = N0.view; if (!v) return;
        if (v.host && v.host !== host0 && !N0.started) { clearInterval(piv); A.toast("L'host ha lasciato il tavolo"); leaveG(); return; }
        var sg = JSON.stringify([v.cfg, v.players.map(function (p) { return [p.uid, p.ready]; })]); if (sg === sig0) return; sig0 = sg;
        var nl = tblFromRoom(k, v, false); Object.keys(L).forEach(function (q) { delete L[q]; }); Object.keys(nl).forEach(function (q) { L[q] = nl[q]; }); paint();
      }, 600);
    } else if (L.auto) {                                               // "Rigioca": appena tutti sono tornati in lobby riparte con le stesse regole
      var at = setInterval(function () {
        if (st.tl !== L || epoch !== TE || L.started) return clearInterval(at);
        var v = L.view; if (!v || !L.auto) return; var oth = v.players.filter(function (p) { return p.uid !== v.host; });
        if (oth.length && oth.every(function (p) { return p.ready; })) { clearInterval(at); L.auto = 0; tlStart(); }
      }, 700); setTimeout(function () { L.auto = 0; clearInterval(at); }, 45000);
    }
  }
  // ---- sfide 1v1, tutto in una schermata
var REV = '<svg viewBox="0 0 180 90" width="100%" height="100%"><defs><linearGradient id="rvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9cfdb"/><stop offset=".5" stop-color="#7b8394"/><stop offset="1" stop-color="#3a3f4c"/></linearGradient><linearGradient id="rvw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a5a2c"/><stop offset="1" stop-color="#4a2a12"/></linearGradient></defs><rect x="70" y="21" width="106" height="12" rx="2" fill="url(#rvg)"/><rect x="70" y="18" width="106" height="3.5" fill="#dfe4ee"/><rect x="168" y="14" width="6" height="6" fill="#aab1c0"/><path d="M28 20H72V47H46L28 38Z" fill="url(#rvg)"/><rect x="50" y="15" width="28" height="31" rx="4" fill="#5b6272" stroke="#2b2f3a" stroke-width="1.5"/><g stroke="#2b2f3a" stroke-width="1.5"><path d="M58 17V44M66 17V44M74 17V44"/></g><path d="M28 20L19 10H31L36 20Z" fill="#3a3f4c"/><path d="M30 37L50 46L45 87H20Z" fill="url(#rvw)" stroke="#2a1608" stroke-width="1.5"/><path d="M48 47Q62 68 80 47" fill="none" stroke="#7b8394" stroke-width="3.5"/><path d="M62 48L66 58" stroke="#c9cfdb" stroke-width="3"/></svg>';
  var ICON = { srf: "✊", dadi: "🎲", hl: "⬆️", tris: "❌", quiz: "🧠", ghig: "🪓", rou: "🎡", rr: REV };
  var GMETA = { srf: ["✊", "Sasso Carta Forbici", "Al meglio dei round"], dadi: ["🎲", "Dadi", "Agita e lancia il bussolotto"], hl: ["⬆️", "Alto / Basso", "La prossima carta è più alta?"], tris: ["❌", "Tris", "Tre in fila vince"], ghig: ["🪓", "Ghigliottina", "Indovina la parola"], rr: ["🔫", "Roulette Russa", "Un colpo solo nel tamburo"] };
  function duels() {
    act("sfide");                                                                                            // 1) si sceglie il gioco: schede grandi e colorate
    netClose(); fit(true); epoch++; body.innerHTML = ""; backBar("SFIDE 1v1");
    body.appendChild(el("div", "dl-hint", "Scegli il gioco"));
    var g = el("div", "dl-grid"); body.appendChild(g);
    GAMES.forEach(function (it) { var m = GMETA[it[0]], c = el("button", "dl-card g-" + it[0]); c.type = "button";
      var ic = el("i", "", m[0]); if (it[0] === "rr" && ICON.rr && ICON.rr.indexOf("<svg") === 0) { ic.textContent = ""; ic.innerHTML = ICON.rr; ic.className = "svgic"; } c.appendChild(ic); c.appendChild(el("b", "", m[1])); c.appendChild(el("span", "", m[2]));
      c.addEventListener("click", function () { A.haptic("light"); st.game = it[0]; duelSetup(); }); g.appendChild(c); });
  }
  function duelSetup() {                                                                                        // 2) avversario, puntata e round: tutto in una schermata
    fit(true); epoch++; body.innerHTML = ""; backBar(GMETA[st.game][1].toUpperCase(), duels);
    if (!st.opp) st.opp = BOT;
    var m = GMETA[st.game], hero = el("div", "dl-hero g-" + st.game); hero.appendChild(el("i", "", m[0])); var hx = el("div"); hx.appendChild(el("b", "", m[1])); hx.appendChild(el("span", "", m[2])); hero.appendChild(hx); body.appendChild(hero);
    var c = el("div", "dl-set"); body.appendChild(c);
    c.appendChild(el("div", "mp-lab", "Avversario")); var og = el("div", "dl-opp"); c.appendChild(og);
    function pO() {
      og.innerHTML = ""; var p = st.opp, isB = p.id === "bot", b = el("button", "dl-sel" + (isB ? "" : " on")); b.type = "button";
      var av = el("div", "avatar rav"); if (isB) av.textContent = "🤖"; else A.styleAvatar(av, p.style || {}, p.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase()); b.appendChild(av);
      var nm = el("div", "dl-nm"); nm.appendChild(isB ? el("span", "", "Scegli un amico") : A.nameEl(p.name, p.style || {})); nm.appendChild(el("small", "", isB ? "Tocca per vedere i tuoi amici" : "Tocca per cambiare")); b.appendChild(nm); b.appendChild(el("em", "", "▾"));
      b.addEventListener("click", function () { friendSheet([], function (f) { st.opp = { id: f.pid, name: f.name, style: f.style, real: !!f.real }; pO(); }); });
      var bb = el("button", "dl-bot" + (isB ? " on" : "")); bb.type = "button"; bb.appendChild(el("i", "", "🤖")); bb.appendChild(el("span", "", "Bot")); bb.addEventListener("click", function () { st.opp = BOT; pO(); });
      og.appendChild(b); og.appendChild(bb);
    } pO();
    c.appendChild(el("div", "mp-lab", "Puntata $SDG")); var bg = el("div", "dl-seg"); c.appendChild(bg);
    function pB() { bg.innerHTML = ""; [10, 50, 100, 500, 1000].forEach(function (n) { var b = el("button", st.bet === n ? "on" : "", A.fmt(n)); b.type = "button"; b.addEventListener("click", function () { st.bet = n; pB(); }); bg.appendChild(b); }); } pB();
    c.appendChild(el("div", "mp-lab", "Round (al meglio di)")); var rg = el("div", "dl-seg r3"); c.appendChild(rg);
    function pR() { rg.innerHTML = ""; [1, 3, 5].forEach(function (n) { var b = el("button", st.rounds === n ? "on" : "", String(n)); b.type = "button"; b.addEventListener("click", function () { st.rounds = n; pR(); }); rg.appendChild(b); }); } pR();
    body.appendChild(invBox());
    var rw = el("div", "mp-end dl-go"); var go = el("button", "mp-go", "INVIA SFIDA"); go.type = "button"; go.addEventListener("click", function () { if (st.opp.real && isReal()) sendNet(); else send(); });
    var gb = el("button", "mp-go mp-alt", "🤖 PROVA COL BOT"); gb.type = "button"; gb.addEventListener("click", function () { st.opp = BOT; duel(); }); rw.appendChild(go); rw.appendChild(gb); body.appendChild(rw);
  }
  function send() {
    fit(false); epoch++; body.innerHTML = ""; var c = el("div", "mp-card"); c.appendChild(el("div", "mp-sec", "SFIDA INVIATA A " + st.opp.name.toUpperCase()));
    c.appendChild(el("div", "pg-me", "In attesa che accetti…")); body.appendChild(c);
    wait(1500).then(duel);
  }


  // ====================================================================== rete (stanze del server)
  function isReal() { return !(A.isSandbox && A.isSandbox()); }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var NET = null;
  function gr(n) { return NET ? Math.floor(NET.R() * n) : rnd(n); }          // casualità condivisa: stessa su entrambi i telefoni
  function netClose() { if (NET) { NET.dead = true; clearTimeout(NET.t); } NET = null; }
  function netOpen(room, onStart) {
    netClose();
    var N = NET = { id: room.id, me: room.me, view: room, since: 0, inbox: [], out: [], busy: false, dead: false, waiters: [], seed: 0, order: [], idx: 0, calls: 0, seq: 0, seen: {}, onStart: onStart, t: 0, started: false, R: Math.random, offT: 0 };
    function handle(e) {
      var key = e.u + ":" + e.s; if (e.s != null) { if (N.seen[key]) return; N.seen[key] = 1; }
      if (e.k === "start") { if (N.started) return; N.started = true; N.seed = e.seed; N.order = e.order || []; N.idx = Math.max(0, N.order.indexOf(N.me)); N.opp = N.order[1 - N.idx]; if (N.onStart) N.onStart(e); return; }
      if (e.k === "join" || e.k === "leave") { if (e.k === "leave") N.left = e.u; return; }
      N.inbox.push(e); N.waiters = N.waiters.filter(function (w) { var i = N.inbox.indexOf(e); if (i >= 0 && w.pred(e)) { N.inbox.splice(i, 1); clearInterval(w.iv); w.res(e); return false; } return true; });
    }
    function pump() {
      if (N.dead || N.busy) return; N.busy = true; var ev = N.out.shift();
      var body = { id: N.id, since: N.since }; if (ev) body.ev = ev;
      A.api("/api/room/sync", "POST", body).then(function (j) {
        N.busy = false; if (N.dead) return;
        if (j.gone) N.gone = true;
        if (j.room) N.view = j.room; if (typeof j.n === "number") N.since = j.n;
        (j.events || []).forEach(handle); sched();
      }).catch(function () { N.busy = false; if (ev) N.out.unshift(ev); if (!N.dead) N.t = setTimeout(pump, 1200); });
    }
    function sched() { if (N.dead) return; clearTimeout(N.t); N.t = setTimeout(pump, N.out.length ? 0 : 420); }
    N.pump = pump; pump();
    return N;
  }
  function netSend(ev) { if (!NET) return; ev.s = ++NET.seq; NET.out.push(ev); clearTimeout(NET.t); NET.t = setTimeout(NET.pump, 0); }
  function oppOffline(who) { var N = NET; if (!N || !N.view) return false; who = who || N.opp; var p = (N.view.players || []).filter(function (q) { return q.uid === who; })[0]; return !p || N.left === who || (p && p.online === false); }
  function netTake(pred, who) {                                       // aspetta un evento dell'avversario; se sparisce per più di 25 s → abbandono
    var N = NET;
    return new Promise(function (res, rej) {
      for (var i = 0; i < N.inbox.length; i++) if (pred(N.inbox[i])) return res(N.inbox.splice(i, 1)[0]);
      var w = { pred: pred, res: res }, off = 0;
      w.iv = setInterval(function () { if (N.dead) { clearInterval(w.iv); return; } if (oppOffline(who)) { off += 1; if (off >= 25) { clearInterval(w.iv); rej({ forfeit: true }); } } else off = 0; }, 1000);
      N.waiters.push(w);
    });
  }

  // ---- tavoli online: tutti i telefoni eseguono lo stesso gioco con gli stessi dadi/mazzi (seme del server); si scambiano solo le scelte
  function gf() { return NET ? NET.R() : Math.random(); }
  function remoteAct(p, d) {
    if (p.gone) return Promise.resolve(null);
    return netTake(function (e) { return e.k === "m" && e.d === d && e.u === p.net; }, p.net).catch(function (x) { if (x && x.forfeit) { p.gone = true; return null; } throw x; });
  }
  function tblBarrier(P, tag) {
    netSend({ k: "b", t: tag });
    return Promise.all(P.filter(function (p) { return p.net && !p.gone; }).map(function (p) { return netTake(function (e) { return e.k === "b" && e.t === tag && e.u === p.net; }, p.net).catch(function (x) { if (x && x.forfeit) { p.gone = true; return null; } throw x; }); }));
  }
  // tra una mano e l'altra: ognuno deve premere PRONTO (mostra quanti sono pronti); nessuno viene buttato fuori
  function tblReady(P, tag, en, topup) {
    var live = P.filter(function (p) { return p.net && !p.gone; }), k = 1, tot = live.length + 1, pressed = false;
    var w = el("div", "mp-wait", ""), b = el("button", "mp-go", "✅ PRONTO" + (topup ? " · +" + A.fmt(topup) + " $SDG" : "")); b.type = "button";
    function paintW() { w.textContent = "Pronti " + k + "/" + tot; }
    paintW(); en.appendChild(b); en.appendChild(w);
    live.forEach(function (p) { netTake(function (e) { return e.k === "b" && e.t === tag && e.u === p.net; }, p.net).then(function () { k++; paintW(); }, function (x) { if (x && x.forfeit) { p.gone = true; tot--; paintW(); } }); });
    return new Promise(function (res) {
      b.addEventListener("click", function () {
        if (pressed) return; pressed = true; A.haptic("medium"); b.disabled = true; b.textContent = "⏳ In attesa degli altri…"; k++; paintW();
        netSend({ k: "b", t: tag });
        var chk = setInterval(function () { if (!NET || NET.dead) return clearInterval(chk); if (k >= tot) { clearInterval(chk); res(); } }, 200);
      });
    });
  }
  // fine tavolo: invio le fiches finali; il server paga in proporzione se la maggioranza concorda (o se chi manca è sparito)
  function tblFinish(P, net, box, en, label, S) {
    var N = NET, ch = {}, any = 0; P.forEach(function (p) { if (p.uid) { ch[p.uid] = Math.max(0, Math.round(p.stack != null ? p.stack : p.chips)); any += ch[p.uid]; } });
    if (!any) P.forEach(function (p) { if (p.uid) ch[p.uid] = 1; });
    var order = Object.keys(ch).sort(function (a, b) { return ch[b] - ch[a]; }), done = false, tries = 0, me = N.me, game = (N.view || {}).game, kk = { poker: "pk", bj: "bj", scopa: "sc" }[game] || "pk";
    var host = (N.view || {}).host === me, rid = N.id, rnd = (N.view || {}).round | 0;
    var sm = tblSummary({ k: kk, title: { pk: "POKER TEXAS", bj: "BLACKJACK", sc: "SCOPA" }[kk], names: P.map(function (p) { return p.me ? "Tu" : String(p.name || "").replace("🤖 ", "🤖"); }), me: Math.max(0, P.findIndex(function (p) { return p.me; })), rows: (S && S.rows) || [], note: S && S.note,
      lobby: function () { tblToLobby(rid, rnd, kk, false); }, again: host ? function () { tblToLobby(rid, rnd, kk, true); } : null });
    (function post() {
      if (done || tries++ > 30) return;
      A.api("/api/room/result", "POST", { id: N.id, order: order, chips: ch }).then(function (j) {
        if (j && (j.settled || j.result) && j.result) {
          done = true; var r = j.result, py = (r.pay || {})[me] || 0, put = (N.view.cfg && N.view.cfg.stake) || 0;
          if (r.refund) sm.res("↩️ Esito non concordante: puntate restituite", "");
          else if (r.sim) sm.res("🏁 Tavolo finito (prova, soldi finti)", "");
          else { var d = py - put; sm.res("🏁 Tavolo finito: incassi " + A.fmt(py) + " $SDG (" + (d >= 0 ? "+" : "−") + A.fmt(Math.abs(d)) + ")", d > 0 ? "mp-win" : (d < 0 ? "mp-lose" : "")); }
          try { A.refreshMe(); } catch (e) {}
        } else setTimeout(post, tries < 4 ? 1200 : 3000);
      }).catch(function () { setTimeout(post, 3000); });
    })();
  }
  // riepilogo di fine tavolo: tabella mano per mano (chi ha guadagnato / perso), poi RIGIOCA o TORNA ALLA LOBBY
  function tblSummary(o) {
    fit(true); epoch++; body.innerHTML = ""; var c = el("div", "mp-card tsum"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "RIEPILOGO · " + o.title));
    var res = el("div", "tsum-res", ""); res.hidden = true; c.appendChild(res);
    var n = o.names.length, tot = o.names.map(function (_, i) { return o.rows.reduce(function (a, r) { return a + (r[i] || 0); }, 0); }), PER = 10, pages = Math.max(1, Math.ceil(o.rows.length / PER)), pg = 0;
    var pgE = el("div", "tsum-pg"), tb = el("div", "tsum-tb"); if (pages > 1) c.appendChild(pgE); c.appendChild(tb);
    function f(d) { return d > 0 ? "+" + A.fmt(d) : d < 0 ? "−" + A.fmt(-d) : "0"; }
    function paintT() {
      tb.innerHTML = ""; tb.style.gridTemplateColumns = "44px repeat(" + n + ", 1fr)"; function cell(t, cl) { tb.appendChild(el("span", cl || "", t)); }
      if (o.rows.length) {
        cell("#", "h"); o.names.forEach(function (nm, i) { cell(nm, "h" + (i === o.me ? " me" : "")); });
        o.rows.slice(pg * PER, pg * PER + PER).forEach(function (r, ri) { cell(String(pg * PER + ri + 1), "lb"); r.forEach(function (d, i) { cell(f(d), d > 0 ? "pos" : d < 0 ? "neg" : ""); }); });
        cell("TOT", "lb tt"); var mx = Math.max.apply(null, tot); tot.forEach(function (d) { cell(f(d), "tt " + (d > 0 ? "pos" : d < 0 ? "neg" : "") + (d === mx && d > 0 ? " top" : "")); });
      } else if (o.note) { tb.style.gridTemplateColumns = "1fr"; cell(o.note, "note"); }
      if (pages > 1) { chips(pgE, Array.apply(null, Array(pages)).map(function (_, i) { return [i, "M" + (i * PER + 1) + "–" + Math.min(o.rows.length, i * PER + PER)]; }), pg, function (it) { pg = it[0]; paintT(); }); }
    }
    paintT();
    var en = el("div", "mp-end tsum-b"); c.appendChild(en);
    if (o.again) { var a1 = el("button", "mp-go", "▶ RIGIOCA"); a1.type = "button"; a1.addEventListener("click", function () { a1.disabled = true; o.again(); }); en.appendChild(a1); }
    var a2 = el("button", "mp-go mp-alt", "TORNA ALLA LOBBY"); a2.type = "button"; a2.addEventListener("click", function () { a2.disabled = true; o.lobby(); }); en.appendChild(a2);
    return { res: function (t, cl) { res.hidden = false; res.textContent = t; res.className = "tsum-res " + (cl || ""); } };
  }
  function mvf(c) { return function (e) { return e.k === "m" && e.c === c && NET && e.u === NET.opp; }; }
  // ---- inviti ricevuti (non Grand Prix): in alto nella lobby e nelle schermate Sfide/Tavoli
  var DUELS = { srf: 1, dadi: 1, hl: 1, tris: 1, rou: 1, rr: 1, ghig: 1 };
  function invites(box) {
    if (!isReal()) return;
    A.api("/api/room/mine", "GET").then(function (j) {
      if (!j || !j.success || !box.isConnected) return; box.innerHTML = "";
      (j.rooms || []).filter(function (r) { return r.game !== "race" && r.host !== r.me && !(r.players || []).some(function (q) { return q.uid === r.me; }); }).forEach(function (r) {
        var row = el("div", "lb-open"), d = el("div", "d"), hn = (r.players[0] || {}).name || "un amico", gname = (GNAME[r.game] || (TBL[r.game === "poker" ? "pk" : r.game === "bj" ? "bj" : "sc"] || {}).name || r.game);
        d.appendChild(el("b", "", "Invito di " + hn)); d.appendChild(el("span", "", gname + (r.cfg.stake ? " · puntata " + A.fmt(r.cfg.stake) + " $SDG" : ""))); row.appendChild(d);
        var g = el("button", "lb-j", "ENTRA"); g.type = "button";
        g.addEventListener("click", function () { A.api("/api/room/join", "POST", { id: r.id }).then(function (k) { if (k && k.success) guestJoin(k.room); else A.toast((k && k.error) || "Non riesco a entrare"); }).catch(function (x) { A.toast((x && x.message) || "Server non raggiungibile"); }); });
        row.appendChild(g); box.appendChild(row);
      });
    }).catch(function () {});
  }
  function invBox() { var b = el("div", "gl-inv"); invites(b); var iv = setInterval(function () { if (!b.isConnected && b._seen) return clearInterval(iv); if (b.isConnected) { b._seen = 1; invites(b); } }, 4000); return b; }
  // avvio di un tavolo online (uguale per tutti): stesso seme, stessi giocatori nello stesso ordine
  function runTable(game) {
    var N = NET, v = N.view || {}, cfg = v.cfg || {}, x = cfg.x || {}; N.R = mulberry(N.seed | 0); N.d = 0;
    var roster = N.order.map(function (uid) { var p = (v.players || []).filter(function (q) { return q.uid === uid; })[0] || {}; return { uid: uid, name: p.name || "Amico", style: p.style, me: uid === N.me }; });
    var bots = x.bots | 0; st.bet = x.bet || cfg.stake || st.bet;
    if (game === "poker") pkTable(bots, { buy: cfg.stake, wallet: walletNow(), u: x.u || 5, hands: cfg.hands || 10 }, { roster: roster });
    else if (game === "bj") bjTable(bots, { roster: roster, bet: x.bet || 50, buy: cfg.stake, hands: cfg.hands || 10 });
    else { var n4 = x.n4 ? 4 : 2; scopaTable(n4 === 2 ? "2" : (x.m4 ? "4c" : "4s"), x.tgt || 0, null, 1, { roster: roster, stake: cfg.stake }); }
  }
  // l'invitato aspetta in una piccola sala: vede chi è seduto e le regole, poi parte tutto insieme
  function tableGuest(room) {
    fit(true); epoch++; var E = epoch; body.innerHTML = ""; var game = room.game, cfg = room.cfg || {}, x = cfg.x || {}, h = room.players.filter(function (p) { return p.uid === room.host; })[0] || room.players[0] || {};
    var nm = { poker: "POKER TEXAS", bj: "BLACKJACK", scopa: "SCOPA" }[game];
    var c = el("div", "mp-card"); body.appendChild(c); c.appendChild(el("div", "mp-sec", nm + " · TAVOLO DI " + String(h.name || "").toUpperCase()));
    var info = el("div", "pg-me", ""); c.appendChild(info); var seats = el("div", "pg-me", ""); c.appendChild(seats);
    function paintInfo(rm) { var cfg = rm.cfg || {}, x = cfg.x || {};
    info.textContent = (game === "poker" ? "Buy-in " + A.fmt(cfg.stake) + " $SDG · ante " + A.fmt(x.u || 5) + " · " + (cfg.hands || 10) + " mani" : game === "bj" ? "Puntata " + A.fmt(x.bet || 50) + " a mano · buy-in " + A.fmt(cfg.stake) + " $SDG · " + (cfg.hands || 10) + " mani" : "Posta " + A.fmt(cfg.stake) + " $SDG a testa" + (x.tgt ? " · a " + x.tgt + " punti" : " · una mano")) + " — già trattenuti dal tuo saldo"; }
    paintInfo(room);
    var rw = el("div", "mp-end"), cn = el("button", "mp-go mp-alt", "ESCI (puntata restituita)"); cn.type = "button"; rw.appendChild(cn); c.appendChild(rw);
    var N = netOpen(room, function () { if (alive(E)) runTable(game); }), host0 = room.host;
    function leave(msg) { A.api("/api/room/leave", "POST", { id: room.id }).catch(function () {}); netClose(); if (msg) A.toast(msg); tables(); }
    cn.addEventListener("click", function () { leave(); });
    var iv = setInterval(function () {
      if (!alive(E) || NET !== N) return clearInterval(iv);
      if (N.gone) { clearInterval(iv); return leave("Il tavolo è stato chiuso"); }
      var v = N.view || room; paintInfo(v); seats.textContent = "Seduti: " + (v.players || []).map(function (p) { return p.name; }).join(", ") + " — l'host sta preparando il tavolo, attendi il via";
      if (v.host && v.host !== host0 && !N.started) { clearInterval(iv); leave("L'host ha lasciato il tavolo: puntata restituita"); }
    }, 800);
  }
  function guestJoin(room) {
    if (DUELS[room.game]) {
      st.game = room.game; st.bet = room.cfg.stake; st.rounds = (room.cfg.x && room.cfg.x.rounds) || 3; var h = room.players.filter(function (p) { return p.uid === room.host; })[0] || room.players[0];
      st.opp = { id: h.pid, name: h.name, style: h.style, uid: h.uid, real: true };
      waitStart(room, "In attesa che " + h.name + " avvii la sfida…", false);
    } else tableLobby({ poker: "pk", bj: "bj", scopa: "sc" }[room.game] || "pk", room);
  }
  // schermata d'attesa: chi ha creato la stanza avvia appena l'invitato è dentro; l'invitato aspetta il via
  function waitStart(room, txt, isHost) {
    fit(false); epoch++; var E = epoch; body.innerHTML = ""; var c = el("div", "mp-card"); c.appendChild(el("div", "mp-sec", isHost ? "SFIDA INVIATA A " + st.opp.name.toUpperCase() : "SFIDA DI " + st.opp.name.toUpperCase()));
    var inf = el("div", "pg-me", ""), pls = el("div", "pg-me", ""); c.appendChild(inf); c.appendChild(pls); c.appendChild(el("div", "pg-me", txt));
    function paintLobby(rm) { var cf = rm.cfg || {}; inf.textContent = (GNAME[rm.game] || rm.game) + " · puntata " + (cf.stake ? A.fmt(cf.stake) + " $SDG" : "nessuna") + ((cf.x || {}).rounds ? " · al meglio di " + (cf.x || {}).rounds : "");
      pls.textContent = "Nella lobby: " + (rm.players || []).map(function (p) { return p.name + (p.uid === rm.host ? " (host)" : ""); }).join(" · "); }
    paintLobby(room);
    var rw = el("div", "mp-end"), cn = el("button", "mp-go mp-alt", "ANNULLA"); cn.type = "button"; rw.appendChild(cn); c.appendChild(rw); body.appendChild(c);
    var N = netOpen(room, function () { if (alive(E)) duel(); }), t0 = Date.now(), started = false;
    cn.addEventListener("click", function () { A.api("/api/room/leave", "POST", { id: room.id }).catch(function () {}); netClose(); (DUELS[room.game] ? duels : tables)(); });
    var iv = setInterval(function () {
      if (!alive(E) || !NET || NET !== N) return clearInterval(iv);
      if (N.view) paintLobby(N.view);
      if (N.gone) { clearInterval(iv); A.toast("La stanza è stata chiusa"); netClose(); return DUELS[room.game] ? duels() : tables(); }
      if (isHost && !started && N.view && (N.view.players || []).length >= 2) { started = true; A.api("/api/room/start", "POST", { id: room.id }).catch(function () { started = false; }); }
      if (isHost && Date.now() - t0 > 180000) { clearInterval(iv); A.api("/api/room/leave", "POST", { id: room.id }).catch(function () {}); netClose(); A.toast("Nessuna risposta: puntata restituita"); (DUELS[room.game] ? duels : tables)(); }
    }, 900);
  }
  function sendNet() {
    var o = st.opp; fit(false); epoch++; body.innerHTML = ""; var c = el("div", "mp-card"); c.appendChild(el("div", "pg-me", "Creo la sfida…")); body.appendChild(c);
    A.api("/api/room/create", "POST", { game: st.game, cfg: { stake: st.bet, max: 2, x: { rounds: st.rounds } } }).then(function (j) {
      if (!j || !j.success) throw new Error((j && j.error) || "Impossibile creare la sfida");
      return A.api("/api/room/invite", "POST", { id: j.room.id, pid: o.id }).then(function (k) {
        if (k && k.offline) A.toast(o.name + " è offline: l'ho taggato nel gruppo");
        waitStart(j.room, "In attesa che " + o.name + " accetti…", true);
      }, function (x) { A.api("/api/room/leave", "POST", { id: j.room.id }).catch(function () {}); throw x; });
    }).catch(function (x) { A.toast((x && x.message) || "Server non raggiungibile"); duelSetup(); });
  }
  // fine partita online: invio la classifica, il server paga se concordiamo (o se l'altro è sparito)
  function netSettle(won, box) {
    var N = NET; if (!N) return; var ord = won ? [N.me, N.opp] : [N.opp, N.me], tries = 0, done = false;
    box.textContent = "⏳ Conferma dell'esito…"; box.className = "pg-me";
    (function post() {
      if (done || tries++ > 30) return;
      A.api("/api/room/result", "POST", { id: N.id, order: ord }).then(function (j) {
        if (j && (j.settled || j.result) && j.result) {
          done = true; var r = j.result, py = (r.pay || {})[N.me] || 0;
          if (r.refund) box.textContent = "↩️ Esito non concordante: puntate restituite"; else if (r.sim) box.textContent = won ? "🏆 Vinto (prova, soldi finti)" : "💀 Perso (prova, soldi finti)";
          else box.textContent = won ? "🏆 Hai vinto +" + A.fmt(py - st.bet) + " $SDG" : "💀 Hai perso −" + A.fmt(st.bet) + " $SDG";
          box.className = "pg-me " + (won ? "mp-win" : "mp-lose"); try { A.refreshMe(); } catch (e) {}
        } else setTimeout(post, tries < 4 ? 1200 : 3000);
      }).catch(function () { setTimeout(post, 3000); });
    })();
  }


  // tris online: il giocatore 1 è ❌, il 2 è ⭕; a ogni round comincia a turno uno dei due
  function trisNet(area, msg, E) {
    var N = NET, me = N.idx + 1, c0 = N.calls, b = [0, 0, 0, 0, 0, 0, 0, 0, 0], L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]], starter = c0 % 2;
    function win(p) { return L.some(function (l) { return l.every(function (x) { return b[x] === p; }); }); }
    function free() { return b.filter(function (v) { return !v; }).length; }
    var grid = el("div", "mp-board"), cells = []; area.appendChild(grid);
    return new Promise(function (res, rej) {
      function paint() { cells.forEach(function (c, i) { c.textContent = b[i] === 1 ? "❌" : (b[i] === 2 ? "⭕" : ""); }); }
      function finish(r, t) { grid.classList.add("lock"); say(msg, t, r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : "")); setTimeout(function () { if (alive(E)) res(r); }, 1100); }
      function check() { if (win(me)) { finish(1, "Tris! Round tuo"); return true; } if (win(3 - me)) { finish(-1, st.opp.name + " ha fatto tris"); return true; } if (!free()) { finish(0, "Pari: si rigioca"); return true; } return false; }
      function mine() { grid.classList.remove("lock"); say(msg, "Sei la " + (me === 1 ? "❌" : "⭕") + ": tocca una casella"); }
      function theirs() { grid.classList.add("lock"); say(msg, "⏳ " + st.opp.name + " pensa…"); netTake(mvf(c0)).then(function (e) { if (!alive(E)) return; var i = e.v | 0; if (i >= 0 && i < 9 && !b[i]) b[i] = 3 - me; snd("pen"); paint(); if (!check()) mine(); }, rej); }
      for (var i = 0; i < 9; i++) (function (i) {
        var c = el("button", "mp-cell"); c.type = "button"; cells.push(c);
        c.addEventListener("click", function () { if (b[i] || grid.classList.contains("lock")) return; A.haptic("light"); snd("pen"); b[i] = me; paint(); netSend({ k: "m", c: c0, v: i }); if (!check()) theirs(); });
        grid.appendChild(c);
      })(i);
      grid.classList.add("lock"); if (starter === N.idx) mine(); else theirs();
    });
  }

  // ====================================================================== 1v1 (struttura comune)
  function duel() {
    fit(true);
    epoch++; var E = epoch, need = Math.floor(st.rounds / 2) + 1, me = 0, op = 0, rd = 1;
    body.innerHTML = ""; var c = el("div", "mp-card mp-duel dg-" + st.game); body.appendChild(c);
    var head = el("div", "mp-sec"), vs = el("div", "mp-vs"), msg = el("div", "pg-me", ""), area = el("div", "mp-area");
    var a = el("div"), b = el("div"), sa = el("div", "big", "0"), sb = el("div", "big", "0");
    a.appendChild(sa); a.appendChild(el("small", "", "Tu")); b.appendChild(sb); b.appendChild(el("small", "", st.opp.name)); vs.appendChild(a); vs.appendChild(b);
    c.appendChild(head); c.appendChild(vs); c.appendChild(msg); c.appendChild(area);
    function draw() { head.textContent = GNAME[st.game] + " · round " + Math.min(rd, st.rounds) + "/" + st.rounds + " · " + A.fmt(st.bet) + " $SDG"; sa.textContent = me; sb.textContent = op; }
    function end() {
      var won = me > op; draw(); area.innerHTML = "";
      A.haptic(won ? "ok" : "bad");
      if (NET) { netSettle(won, msg); var r3 = el("button", "mp-go mp-alt", "TORNA ALLA LOBBY"); r3.type = "button"; r3.addEventListener("click", function () { netClose(); duels(); }); area.appendChild(r3); return; }
      msg.textContent = won ? "🏆 HAI VINTO +" + A.fmt(st.bet) + " $SDG (simulato)" : "💀 HAI PERSO −" + A.fmt(st.bet) + " $SDG (simulato)"; msg.className = "pg-me " + (won ? "mp-win" : "mp-lose");
      var r1 = el("button", "mp-go", "RIGIOCA"); r1.type = "button"; r1.addEventListener("click", duel);
      var r2 = el("button", "mp-go mp-alt", "TORNA ALLA LOBBY"); r2.type = "button"; r2.addEventListener("click", duels); area.appendChild(r1); area.appendChild(r2);
    }
    function next() {
      if (!alive(E)) return; draw(); area.innerHTML = ""; msg.className = "pg-me";
      if (NET) { NET.calls++; NET.R = mulberry((NET.seed + NET.calls * 7919) | 0); NET.waiters.forEach(function (w) { clearInterval(w.iv); }); NET.waiters = []; }
      GAME[st.game](area, msg, E).catch(function (x) { if (x && x.forfeit && alive(E)) { me = need; op = 0; msg.textContent = ""; A.toast(st.opp.name + " ha abbandonato"); return 99; } throw x; }).then(function (r) {                    // r: 1 vinto, -1 perso, 0 pari (si rigioca)
        if (!alive(E)) return;
        if (r === 99) return end();
        if (r > 0) me++; else if (r < 0) op++;
        if (r) rd++;
        draw();
        if (r && (st.game === "srf" || st.game === "tris")) snd(r > 0 ? "win" : "lose");
        if (me >= need || op >= need) { setTimeout(function () { snd(me >= need ? "matchwin" : "matchlose"); }, 500); return wait(1400).then(end); }
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
        if (!NET) return [i, rnd(3)]; var c0 = NET.calls; netSend({ k: "m", c: c0, v: i }); say(msg, "⏳ In attesa di " + st.opp.name + "…"); return netTake(mvf(c0)).then(function (e) { return [i, e.v | 0]; });
      }).then(function (pr) {
        var i = pr[0], o = pr[1], clash = el("div", "mp-clash"); area.innerHTML = ""; area.appendChild(clash);
        var L = el("span", "shake", "✊"), R = el("span", "shake r", "✊"); clash.appendChild(L); clash.appendChild(R); say(msg, "Sasso…"); snd("rps"); setTimeout(function () { say(msg, "Carta…"); snd("rps"); }, 330); setTimeout(function () { say(msg, "Forbici…"); snd("rps"); }, 660);
        return wait(1000).then(function () {
          snd("rpsgo"); L.className = "pop"; R.className = "pop"; L.textContent = HANDS[i][0]; R.textContent = HANDS[o][0];
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
      say(msg, "Tocca il bussolotto per lanciare");
      hint.textContent = "";
      return new Promise(function (res, rej) {
        var t0 = 0, iv = 0, done = false;
        function stop() { clearInterval(iv); iv = 0; }
        function down(ev) {
          if (done || t0) return; ev.preventDefault(); t0 = Date.now(); M.cup.classList.add("hold"); hint.textContent = "";
          snd("tick"); iv = setInterval(function () { if (!alive(E)) return stop(); snd("creak", Math.random()); A.haptic("light"); }, 140);
        }
        function up() { if (!t0 || done) return; var held = Date.now() - t0; t0 = 0; done = true; hint.textContent = ""; setTimeout(function () { if (!alive(E)) return; stop(); M.cup.classList.remove("hold"); go(); }, Math.max(0, 700 - held)); }
        function go() {
          hint.textContent = ""; M.p.classList.add("act");
          var mv = [1 + rnd(6), 1 + rnd(6)], ov = [1 + rnd(6), 1 + rnd(6)], gate = Promise.resolve();
          if (NET) { var dv = [1 + gr(6), 1 + gr(6), 1 + gr(6), 1 + gr(6)], c0 = NET.calls; mv = NET.idx ? dv.slice(2) : dv.slice(0, 2); ov = NET.idx ? dv.slice(0, 2) : dv.slice(2); netSend({ k: "m", c: c0 }); gate = netTake(mvf(c0)); }
          throwDice(M, mv).then(function () {
            if (!alive(E)) return; var a = mv[0] + mv[1]; M.tot.textContent = a; M.p.classList.remove("act"); O.p.classList.add("act");
            say(msg, NET ? "⏳ " + st.opp.name + " sta per lanciare…" : st.opp.name + " agita il bussolotto…"); O.cup.style.animation = ""; O.cup.classList.add("hold"); snd("creak", .5);
            var n = 0, iv2 = setInterval(function () { if (!alive(E)) return clearInterval(iv2); snd("creak", Math.random()); if (++n > 7) clearInterval(iv2); }, 140);
            return gate.then(function () { return wait(1250); }).then(function () { O.cup.classList.remove("hold"); return throwDice(O, ov); }).then(function () {
              if (!alive(E)) return; var b = ov[0] + ov[1]; O.tot.textContent = b; O.p.classList.remove("act");
              var r = a === b ? 0 : (a > b ? 1 : -1); say(msg, "Tu " + a + " · " + st.opp.name + " " + b + (r === 0 ? " — pari: si rilancia" : ""), r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : ""));
              (r > 0 ? M : O).tot.style.color = r === 0 ? "" : "#58ffa8"; snd(r > 0 ? "win" : (r < 0 ? "lose" : "click"));
              return wait(1300).then(function () { res(r); });
            });
          }).catch(rej);
        }
        M.cup.style.touchAction = "none"; M.cup.addEventListener("contextmenu", function (e) { e.preventDefault(); }); M.cup.addEventListener("pointerdown", function (e) { try { M.cup.setPointerCapture(e.pointerId); } catch (x) {} down(e); }); M.cup.addEventListener("pointerup", up); M.cup.addEventListener("pointercancel", up);
      });
    },
    hl: function (area, msg, E) {
      var c1 = gr(13), c2 = gr(13); while (c2 === c1) c2 = gr(13);
      var s1 = gr(4), s2 = gr(4), SUITS = ["♠", "♥", "♦", "♣"];
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
        if (!NET) return [i, rnd(2)]; var c0 = NET.calls; netSend({ k: "m", c: c0, v: i }); return netTake(mvf(c0)).then(function (e) { return [i, e.v | 0]; });
      }).then(function (pr) {
        var i = pr[0], bi = pr[1], up = c2 > c1; M.querySelectorAll("button").forEach(function (b) { b.style.opacity = ".5"; });
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
      if (NET) return trisNet(area, msg, E);
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
            if (b[i] || grid.classList.contains("lock")) return; A.haptic("light"); snd("pen"); b[i] = 1; paint();
            if (win(1)) { grid.classList.add("lock"); return finish(1, "Tris! Round tuo"); }
            if (!free().length) { grid.classList.add("lock"); return finish(0, "Pari: si rigioca"); }
            grid.classList.add("lock"); say(msg, st.opp.name + " pensa…");
            wait(650).then(function () {
              b[botMove()] = 2; snd("pen"); paint();
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
      var pi = pool[gr(pool.length)]; ghUsed.push(pi); var sol = GHIG[pi][0], cl = GHIG[pi][1].split(" "), shown = 0, lock = 0, over = false, word = "";
      var botAt = NET ? 99 : 2 + rnd(3), botOk = !NET && Math.random() < 0.72, c0 = NET ? NET.calls : 0, okSeen = false;                     // il bot risponde dopo N indizi (e ci azzecca 7 volte su 10)
      return new Promise(function (res, rej) {
        area.innerHTML = ""; var box = el("div", "gh-box"), list = el("div", "gh-list"), disp = el("div", "gh-in"), kb = el("div", "gh-kb"), tm = el("div", "gh-t");
        box.appendChild(tm); box.appendChild(list); box.appendChild(disp); box.appendChild(kb); area.appendChild(box);
        function show() { disp.textContent = word || "scrivi la parola in comune…"; disp.classList.toggle("ph", !word); }
        show();
        function finish(r, txt) { if (over) return; over = true; kb.classList.add("off"); say(msg, txt, r > 0 ? "mp-win" : (r < 0 ? "mp-lose" : "")); list.appendChild(el("div", "gh-sol", "🔑 " + sol)); wait(1500).then(function () { res(r); }); }
        function reveal() { if (over || !alive(E)) return; shown++; list.appendChild(el("div", "gh-c", cl[shown - 1].toUpperCase())); list.scrollTop = list.scrollHeight; snd("chip");
          if (shown === botAt && botOk) return wait(1200 + rnd(1800)).then(function () { if (!over && alive(E)) finish(-1, st.opp.name + " ha indovinato: " + sol); });
          if (shown >= 5) { tm.textContent = "ultimo indizio: 12 secondi…"; return wait(12000).then(function () { if (!over && alive(E)) (NET ? wait(1500) : Promise.resolve()).then(function () { if (!over && alive(E)) finish(0, "Nessuno ha indovinato: nuova parola"); }); }); }
          tm.textContent = "indizio " + shown + "/5"; wait(5200).then(reveal); }
        function send() { if (over || Date.now() < lock || !word) return; if (norm(word) === sol) { A.haptic("ok"); snd("good"); if (NET) { netSend({ k: "ok", c: c0 }); say(msg, "✔ Giusto! Verifico chi è stato più veloce…"); kb.classList.add("off"); } else finish(1, "Giusto! Era " + sol); } else { A.haptic("bad"); snd("bad"); lock = Date.now() + 2500; word = ""; disp.textContent = "Sbagliato! attendi 2,5 s"; disp.classList.add("ph"); setTimeout(show, 2500); } }
        ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].forEach(function (rw, ri) {
          var r = el("div", "gh-kr"); rw.split("").forEach(function (ch) { var k = el("button", "gh-k", ch); k.type = "button"; k.addEventListener("click", function () { if (over || Date.now() < lock || word.length >= 12) return; word += ch; A.haptic("light"); show(); }); r.appendChild(k); });
          if (ri === 2) { var d = el("button", "gh-k w", "⌫"); d.type = "button"; d.addEventListener("click", function () { word = word.slice(0, -1); show(); }); r.appendChild(d); }
          kb.appendChild(r);
        });
        var go = el("button", "gh-k go", "INVIA"); go.type = "button"; go.addEventListener("click", send); kb.appendChild(go);
        var tn = 0; (function tock() { if (over || !alive(E)) return; snd(tn++ % 2 ? "tic" : "tac"); if (shown >= 5 && tn % 2 === 0) snd("beat"); setTimeout(tock, shown >= 5 ? 320 : 520); })();
        if (NET) netTake(function (e) { return e.k === "ok" && e.c === c0; }).then(function (e) { if (e.u === NET.me) finish(1, "Giusto! Era " + sol); else finish(-1, st.opp.name + " ha indovinato: " + sol); }, rej);
        reveal();
      });
    },
    rr: function (area, msg, E) {
      var bullet = gr(6), shot = 0, turn = NET ? (gr(2) === NET.idx ? 0 : 1) : rnd(2), opn = st.opp.name, c0 = NET ? NET.calls : 0;
      return new Promise(function (res, rej) {
        area.innerHTML = ""; var box = el("div", "rr-box"), cyl = el("div", "rr-cyl"), chs = [], btn = el("button", "mp-go rr-go", "SPARA"), fl = el("div", "rr-flash");
        for (var i = 0; i < 6; i++) { var ch = el("i", "rr-ch"); ch.style.transform = "rotate(" + i * 60 + "deg) translateY(-50px)"; cyl.appendChild(ch); chs.push(ch); }
        var gun = el("div", "rr-gun"); gun.innerHTML = REV; box.appendChild(gun); box.appendChild(cyl); box.appendChild(btn); box.appendChild(fl); area.appendChild(box); btn.type = "button"; btn.hidden = true;
        say(msg, "Un solo proiettile. Si sorteggia chi inizia…"); cyl.classList.add("spin"); snd("rspin"); A.vib([0, 12, 60, 12, 80, 12, 110, 12, 150]);
        wait(1500).then(function () { cyl.classList.remove("spin"); say(msg, (turn === 0 ? "Inizi TU" : "Inizia " + opn)); return wait(900); }).then(next);
        function next() {
          if (!alive(E)) return; chs.forEach(function (c) { c.classList.remove("on"); }); chs[shot].classList.add("on");
          if (turn === 0) { say(msg, "Tocca a te: premi il grilletto…"); btn.hidden = false; btn.onclick = function () { btn.hidden = true; A.haptic("heavy"); if (NET) netSend({ k: "m", c: c0 }); fire(); }; }
          else { say(msg, opn + " prende la pistola…"); (NET ? netTake(mvf(c0)) : wait(1100 + rnd(900))).then(fire, rej); }
        }
        function fire() {
          if (!alive(E)) return; say(msg, turn === 0 ? "…" : opn + " preme il grilletto…"); wait(1000).then(function () {
            if (!alive(E)) return;
            if (shot === bullet) { chs[shot].classList.add("bang"); fl.className = "rr-flash on"; snd("gun"); A.haptic("bad"); A.vib([0, 70, 30, 160]); say(msg, "💥 BANG! " + (turn === 0 ? "Sei morto." : opn + " è morto!"), turn === 0 ? "mp-lose" : "mp-win"); wait(1700).then(function () { res(turn === 0 ? -1 : 1); }); }
            else { chs[shot].classList.add("em"); snd("rclick"); A.vib(18); say(msg, "*click* — vuoto. " + (turn === 0 ? "Sei salvo… per ora." : opn + " è salvo.")); shot++; turn = 1 - turn; wait(1200).then(next); }
          });
        }
      });
    },
    rou: function (area, msg, E) {
      var ORD = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
      var chooser = NET ? (NET.calls % 2 === NET.idx) : true, c0 = NET ? NET.calls : 0, pick;
      if (chooser) { say(msg, "Scegli il tuo colore: l'altro va a " + st.opp.name); pick = btnRow(area, [["🔴 ROSSO", ""], ["⚫ NERO", ""]]).then(function (i) { if (NET) netSend({ k: "m", c: c0, v: i }); return i; }); }
      else { say(msg, "⏳ " + st.opp.name + " sceglie il colore…"); pick = netTake(mvf(c0)).then(function (e) { return 1 - (e.v | 0); }); }
      return pick.then(function (i) {
        area.innerHTML = "";
        var S = 250, cv = el("canvas", "mx-wheel"); cv.width = S * 2; cv.height = S * 2; cv.style.width = S + "px"; cv.style.height = S + "px"; area.appendChild(cv);
        var ctx = cv.getContext("2d"), cx = S, cy = S, R = S - 6, n = gr(37), idx = ORD.indexOf(n), seg = Math.PI * 2 / 37, T = 5200;
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
  function newDeck() { var d = []; for (var s = 0; s < 4; s++) for (var r = 0; r < 13; r++) d.push({ r: r, s: s }); for (var i = d.length - 1; i > 0; i--) { var j = gr(i + 1), t = d[i]; d[i] = d[j]; d[j] = t; } return d; }
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
  function bjTable(bots, net) {
    fit(true); epoch++; var E = epoch; body.innerHTML = "";
    var HS = [], deck = newDeck(), profit = 0, bet = net ? net.bet : st.bet, hn = 0, hands = net ? net.hands : 0, c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "BLACKJACK · " + A.fmt(bet) + " $SDG a mano" + (net ? " · mano 1/" + hands : "")));
    var felt = el("div", "mx-felt bj"), shoe = el("div", "mx-shoe"), msg = el("div", "pg-me", ""), area = el("div", "mp-area"), tot = el("div", "pg-me", "");
    c.appendChild(felt); c.appendChild(msg); c.appendChild(area); c.appendChild(tot);
    var P = [];
    if (net) { net.roster.forEach(function (r) { P.push({ name: r.me ? "Tu" : r.name, me: r.me, net: r.me ? null : r.uid, uid: r.uid, chips: net.buy }); }); for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i, bot: 1 }); }
    else { P.push({ name: "Tu", me: true }); for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i }); }
    var ME = 0; P.forEach(function (p, i) { if (p.me) ME = i; });
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
        s.appendChild(el("div", "mx-info", bjTxt(p.cards) + (p.st === "bust" ? " 💥" : (p.st === "stand" ? " ✋" : "")) + (p.chips != null ? " · 🪙" + A.fmt(p.chips) : ""))); s.appendChild(el("div", "mx-tag", p.name + (pi === lead ? " ▶" : ""))); (p.me ? mro : bro).appendChild(s);
      });
      return settle(felt, shoe);
    }
    function hand() {
      area.innerHTML = ""; tot.textContent = ""; lead = (lead + 1) % P.length; dealer = [draw(), draw()]; P.forEach(function (p) { if (p.chips != null && p.chips <= 0) { p.cards = []; p.st = "out"; p.res = null; return; } p.cards = [draw(), draw()]; p.st = bjVal(p.cards) === 21 ? "stand" : "play"; p.res = null; });
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
          say(msg, "Tocca a te: CARTA o STAI?"); area.innerHTML = ""; var dn = net ? ++NET.d : 0;
          btnRow(area, [["➕ CARTA", ""], ["✋ STAI", ""]]).then(function (i) {
            area.innerHTML = ""; if (net) netSend({ k: "m", d: dn, a: i });
            if (i === 0) { var nc = draw(); p.cards.push(nc); say(msg, "Hai pescato " + RK[nc.r] + SU[nc.s] + (nc.r === 12 ? " (l'asso vale 1 o 11)" : "") + " → " + bjTxt(p.cards)); took(); } else p.st = "stand";
            paint(true); wait(700).then(step);
          });
        } else if (p.net) {
          say(msg, "⏳ " + p.name + " decide…"); var dr = ++NET.d;
          remoteAct(p, dr).then(function (e) { if (!alive(E)) return; if (e && e.a === 0) { p.cards.push(draw()); took(); } else p.st = "stand"; paint(true); wait(700).then(step); });
        } else {
          say(msg, p.name + " decide…"); wait(900).then(function () {
            if (bjVal(p.cards) < 17 && (bjVal(p.cards) < 12 || gf() < 0.8)) { p.cards.push(draw()); took(); } else p.st = "stand";
            paint(true); wait(700).then(step);
          });
        }
      })();
    }
    function dealerTurn() {
      cur = -1; say(msg, "Il banco scopre la carta…"); paint(false);
      (function go() {
        if (!alive(E)) return;
        if (bjVal(dealer) < 17 && P.some(function (p) { return p.st !== "bust" && p.st !== "out"; })) { wait(1000).then(function () { dealer.push(draw()); paint(false); go(); }); return; }
        wait(600).then(function () {
          if (!alive(E)) return; var dv = bjVal(dealer);
          P.forEach(function (p) {
            if (p.st === "out") { p.res = ["push", "fuori"]; return; }
            var v = bjVal(p.cards), nat = p.cards.length === 2 && v === 21;
            if (p.st === "bust") p.res = ["lose", "perde"]; else if (dv > 21 || v > dv) p.res = ["win", nat ? "BLACKJACK!" : "vince"]; else if (v === dv) p.res = ["push", "pari"]; else p.res = ["lose", "perde"];
            var bb = p.chips != null ? Math.min(bet, p.chips) : bet, dl = p.res[0] === "win" ? Math.round(bb * (nat ? 1.5 : 1)) : (p.res[0] === "lose" ? -bb : 0);
            if (p.chips != null) p.chips = Math.max(0, p.chips + dl); p.dl = dl;
            if (p.me) profit += dl;
          });
          HS.push(P.map(function (p) { return p.st === "out" ? 0 : (p.dl || 0); }));
          paint(false); var me = P[ME].res; if (P[ME].st === "out") me = ["lose", "fuori"]; var dme = P[ME].dl || 0;
          banner(felt, me[0] === "win" ? (me[1] === "BLACKJACK!" ? "BLACKJACK!" : "HAI VINTO!") : (me[0] === "push" ? "PAREGGIO" : "VINCE IL BANCO"), (dme >= 0 ? "+" : "−") + A.fmt(Math.abs(dme)) + " $SDG · tu " + bjVal(P[ME].cards) + " vs banco " + bjVal(dealer), me[0]);
          snd(me[0] === "win" ? "win" : (me[0] === "lose" ? "lose" : "click"));
          say(msg, me[0] === "win" ? "Hai vinto la mano!" : (me[0] === "push" ? "Pareggio" : "Il banco batte la tua mano"), me[0] === "win" ? "mp-win" : (me[0] === "lose" ? "mp-lose" : ""));
          tot.textContent = net ? "Le tue fiches: " + A.fmt(P[ME].chips) : "Saldo prova: " + (profit >= 0 ? "+" : "−") + A.fmt(Math.abs(profit)) + " $SDG (simulato)"; area.innerHTML = "";
          var en = el("div", "mp-end"); area.appendChild(en); hn++;
          if (net) {
            var live = P.filter(function (p) { return !p.bot && p.chips > 0; }).length, fin = hn >= hands || live < 1 || (net.roster.length > 1 && live < 2);
            if (fin) { tblFinish(P, net, tot, en, null, { rows: HS }); return; }
            tblReady(P, "h" + hn, en, 0).then(function () { if (alive(E)) { c.firstChild.textContent = "BLACKJACK · " + A.fmt(bet) + " $SDG a mano · mano " + (hn + 1) + "/" + hands; hand(); } });
            return;
          }
          var a1 = el("button", "mp-go", "RIGIOCA"); a1.type = "button"; a1.addEventListener("click", function () { rematch(area, P.length, hand, E); });
          var a2 = el("button", "mp-go mp-alt", "TORNA ALLA LOBBY"); a2.type = "button"; a2.addEventListener("click", function () { tableLobby("bj"); }); en.appendChild(a1); en.appendChild(a2);
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
    var row = el("div", "mp-rowc"), row2 = el("div", "mp-rowc"), info = el("div", "pg-me", ""), go = el("div", "mp-end"), target = st.scTarget == null ? 11 : st.scTarget; c.appendChild(row); c.appendChild(el("div", "mp-lab", "Punteggio finale")); c.appendChild(row2); c.appendChild(info); c.appendChild(go);
    function paintSetup() {
      chips(row, [["2", "2 giocatori"], ["4s", "4 · ognuno per sé"], ["4c", "4 · a coppie"]], mode, function (it) { mode = it[0]; paintSetup(); });
      chips(row2, [[0, "Una mano"], [11, "A 11 punti"], [21, "A 21 punti"]], target, function (it) { target = it[0]; st.scTarget = target; paintSetup(); });
      say(info, (target ? "Vince chi arriva per primo a " + target + " punti (carte, denari, settebello, primiera e scope di ogni mano). " : "Si gioca una sola mano. ") + (mode === "2" ? "Tu contro un bot." : mode === "4s" ? "Tutti contro tutti (1v1v1v1): vince chi fa più punti." : "Tu e il Bot 2 (di fronte a te) contro Bot 1 e Bot 3: le carte prese si sommano."));
      go.innerHTML = ""; var a = el("button", "mp-go", "▶ GIOCA · " + A.fmt(st.bet) + " $SDG"); a.type = "button"; a.addEventListener("click", function () { scopaTable(mode, target); }); go.appendChild(a);
    }
    paintSetup();
  }
  function scopaTable(mode, target, tot, rn, net) {
    fit(true); epoch++; var E = epoch; body.innerHTML = ""; target = target || 0; rn = rn || 1;
    var N = mode === "2" ? 2 : 4, c = el("div", "mp-card"); body.appendChild(c); tot = tot || (mode === "4s" ? [0, 0, 0, 0] : [0, 0]);
    c.appendChild(el("div", "mp-sec", "SCOPA · " + (mode === "2" ? "1 contro 1" : mode === "4s" ? "1v1v1v1" : "2 contro 2") + (target ? " · a " + target + " · mano " + rn : "") + " · " + A.fmt(net ? net.stake : st.bet) + " $SDG"));
    var felt = el("div", "mx-felt bl sc-felt"), msg = el("div", "pg-me", ""), area = el("div", "mp-area pkarea"); c.appendChild(felt); c.appendChild(msg); c.appendChild(area);
    var names = N === 2 ? ["Tu", "🤖 Bot"] : ["Tu", "🤖 Bot 1", mode === "4c" ? "🤖 Bot 2 (socio)" : "🤖 Bot 2", "🤖 Bot 3"];
    var P = names.map(function (n, i) { return { name: n, me: i === 0, ent: mode === "4c" ? i % 2 : i, hand: [], cap: [] }; });
    if (net) { var bn = 0; P = []; for (var pi0 = 0; pi0 < N; pi0++) { var rr = net.roster[pi0]; P.push(rr ? { name: rr.me ? "Tu" : rr.name, me: rr.me, net: rr.me ? null : rr.uid, uid: rr.uid, ent: mode === "4c" ? pi0 % 2 : pi0, hand: [], cap: [] } : { name: "🤖 Bot " + (++bn), bot: 1, ent: mode === "4c" ? pi0 % 2 : pi0, hand: [], cap: [] }); } }
    var ME = 0; P.forEach(function (p, i) { if (p.me) ME = i; }); var myEnt = P[ME].ent, myD = 0, lockP = false;
    var NE = mode === "4c" ? 2 : N, ENT = mode === "4c" ? ["Noi", "Loro"] : P.map(function (p) { return p.name.replace("🤖 ", ""); });
    if (mode === "4c") ENT = [myEnt === 0 ? "Noi" : "Loro", myEnt === 0 ? "Loro" : "Noi"];
    var deck = [], table = [], turn = (rn - 1) % N, lastCap = 0, scope = []; for (var q0 = 0; q0 < NE; q0++) scope.push(0);
    var sel = null, picks = [];
    for (var s2 = 0; s2 < 4; s2++) for (var v = 1; v <= 10; v++) deck.push({ s: s2, v: v });
    for (var i = deck.length - 1; i > 0; i--) { var j = gr(i + 1), tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp; }
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
      var top = el("div", "sc-top"); P.forEach(function (p, i) { if (p.me) return; var o = el("div", "sc-opp" + (i === turn ? " turn" : "")); var bk = el("div", "sc-bk"); for (var q = 0; q < p.hand.length; q++) bk.appendChild(el("span", "sc-c back")); o.appendChild(bk); o.appendChild(el("div", "mx-tag", p.name + (target ? " · " + (tot[p.ent] + scope[p.ent]) + " pt" : ""))); top.appendChild(o); }); felt.appendChild(top);
      var tb = el("div", "sc-table"); table.forEach(function (t, i) { var on = picks.indexOf(i) >= 0, e = scEl(t, on ? "pick" : (sel ? "can" : "")); if (sel && turn === ME && !lockP) e.addEventListener("click", function () { var x = picks.indexOf(i); if (x >= 0) picks.splice(x, 1); else picks.push(i); A.haptic("light"); paint(); upd(); }); tb.appendChild(e); }); if (!table.length) tb.appendChild(el("div", "sc-empty", "tavolo vuoto")); felt.appendChild(tb);
      felt.appendChild(el("div", "sc-info", "Mazzo " + deck.length + (target ? " · Punti: " + ENT.map(function (n, i) { return n + " " + (tot[i] + scope[i]); }).join(" – ") : " · Scope: " + ENT.map(function (n, i) { return n + " " + scope[i]; }).join(" · "))));
      var me = el("div", "sc-me"); P[ME].hand.forEach(function (cd) { var e = scEl(cd, turn === ME ? (cd === sel ? "sel" : "pl") : "dis"); if (turn === ME && !lockP) e.addEventListener("click", function () { sel = (sel === cd ? null : cd); picks = []; A.haptic("light"); paint(); upd(); }); me.appendChild(e); }); felt.appendChild(me);
    }
    function upd() {                                                  // pulsanti e testo guida durante la tua mano
      if (turn !== ME || lockP) return; area.innerHTML = "";
      if (!sel) { say(msg, "Tocca a te: scegli una delle tue carte"); return; }
      var sum = picks.reduce(function (a, ix) { return a + table[ix].v; }, 0), can = opts(sel).length > 0;
      say(msg, "Carta " + sel.v + " (vale " + sel.v + ")" + (picks.length ? " · prendi " + picks.map(function (ix) { return table[ix].v; }).join(" + ") + " = " + sum + (valid() ? " ✓" : "") : (can ? " · tocca le carte del tavolo da prendere" : " · niente da prendere: buttala")));
      var bx = el("div", "mx-bets"); area.appendChild(bx);
      var tk = el("button", "ok big", "✅ PRENDI"); tk.type = "button"; tk.disabled = !valid(); tk.addEventListener("click", function () { var cd = sel, ids = picks.slice(); sel = null; picks = []; area.innerHTML = ""; if (net) netSend({ k: "m", d: myD, ci: P[ME].hand.indexOf(cd), ids: ids }); doPlay(ME, cd, ids); paint(); wait(900).then(advance); }); bx.appendChild(tk);
      var th = el("button", "f big", "⬇️ BUTTA"); th.type = "button"; th.disabled = can; th.addEventListener("click", function () { var cd = sel; sel = null; picks = []; area.innerHTML = ""; if (net) netSend({ k: "m", d: myD, ci: P[ME].hand.indexOf(cd), ids: null }); doPlay(ME, cd, null); paint(); wait(900).then(advance); }); bx.appendChild(th);
    }
    function doPlay(pi, cd, take) {
      var p = P[pi]; if (pi === ME) lockP = true; p.hand.splice(p.hand.indexOf(cd), 1);
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
      if (turn === ME) { lockP = false; sel = null; picks = []; if (net) myD = ++NET.d; paint(); upd(); return; }
      if (net && P[turn].net) {
        var pi2 = turn, dn = ++NET.d; say(msg, "⏳ " + P[pi2].name + " gioca…"); area.innerHTML = "";
        remoteAct(P[pi2], dn).then(function (e) {
          if (!alive(E)) return; var m = null, pp = P[pi2];
          if (e && e.ci >= 0 && pp.hand[e.ci]) { var cd = pp.hand[e.ci], ids = Array.isArray(e.ids) ? e.ids.map(Number).sort() : null, os = opts(cd), key = ids ? ids.join(",") : "";
            if (ids && ids.length && os.some(function (o) { return o.slice().sort().join(",") === key; })) m = [cd, ids]; else if ((!ids || !ids.length) && !os.length) m = [cd, null]; }
          if (!m) m = botMove(pi2);
          doPlay(pi2, m[0], m[1]); paint(); wait(900).then(advance);
        });
        return;
      }
      say(msg, P[turn].name + " pensa…"); area.innerHTML = ""; var pi = turn; wait(1000 + rnd(500)).then(function () { if (!alive(E)) return; var m = botMove(pi); doPlay(pi, m[0], m[1]); paint(); wait(900).then(advance); });
    }
    function finish() {
      if (table.length) { P[lastCap].cap = P[lastCap].cap.concat(table); table = []; }
      var E2 = ENT.map(function (n, i) { var cs = []; P.forEach(function (p) { if (p.ent === i) cs = cs.concat(p.cap); }); var pr = 0; for (var s3 = 0; s3 < 4; s3++) { var b = 0; cs.forEach(function (x) { if (x.s === s3) b = Math.max(b, PRIM[x.v]); }); pr += b; }
        return { n: n, car: cs.length, den: cs.filter(function (x) { return x.s === 0; }).length, sb: cs.some(function (x) { return x.s === 0 && x.v === 7; }), pr: pr, sc: scope[i], pt: 0 }; });
      function top(key) { var mx = Math.max.apply(null, E2.map(function (e) { return e[key]; })), w = E2.filter(function (e) { return e[key] === mx; }); return w.length === 1 && mx > 0 ? w[0] : null; }
      var wCar = top("car"), wDen = top("den"), wPr = top("pr"), wSc = null; E2.forEach(function (e) { e.pt = e.sc + (e === wCar ? 1 : 0) + (e === wDen ? 1 : 0) + (e === wPr ? 1 : 0) + (e.sb ? 1 : 0); });
      E2.forEach(function (e, i) { tot[i] += e.pt; });
      felt.innerHTML = ""; var rs = el("div", "sc-res"), tbl = el("div", "sc-tbl"); tbl.style.gridTemplateColumns = "auto " + E2.map(function () { return "1fr"; }).join(" ");
      function cell(t, cls) { tbl.appendChild(el("div", "sc-cl" + (cls ? " " + cls : ""), t)); }
      cell(""); E2.forEach(function (e, ei) { cell(e.n, "hd" + (ei === myEnt ? " me" : "")); });
      var maxSc = Math.max.apply(null, E2.map(function (e) { return e.sc; }));
      [["Carte", "car", wCar], ["Denari", "den", wDen], ["Settebello", "sb", null], ["Primiera", "pr", wPr], ["Scope", "sc", null]].forEach(function (r) {
        cell(r[0], "lb"); E2.forEach(function (e) { var hi = r[1] === "sb" ? e.sb : (r[1] === "sc" ? (e.sc > 0 && e.sc === maxSc) : e === r[2]); cell(r[1] === "sb" ? (e.sb ? "✓" : "–") : String(e[r[1]]), hi ? "wn" : ""); });
      });
      cell("PUNTI", "lb tot"); var mxp = Math.max.apply(null, E2.map(function (e) { return e.pt; })); E2.forEach(function (e) { cell(String(e.pt), "tot" + (e.pt === mxp ? " wn" : "")); });
      var winners = E2.filter(function (e) { return e.pt === mxp; }), wonH = winners.length === 1 && winners[0] === E2[myEnt], tieH = winners.length > 1 && winners.indexOf(E2[myEnt]) >= 0;
      rs.appendChild(el("b", "", (target ? "MANO " + rn + ": " : "") + (wonH ? "HAI VINTO!" : (tieH ? "PAREGGIO" : (winners.length === 1 ? "VINCE " + winners[0].n.toUpperCase() : "HAI PERSO"))))); rs.appendChild(tbl); felt.appendChild(rs);
      area.innerHTML = ""; var en = el("div", "mp-end"); area.appendChild(en);
      function gameEnd(won, tie, winEnts) {
        if (net) {                                                    // online: vincono tutte le fiches i giocatori della squadra vincente
          area.innerHTML = ""; var en3 = el("div", "mp-end"); area.appendChild(en3); A.haptic(won ? "ok" : "light"); snd(won ? "win" : "lose");
          say(msg, tie ? "Pari" : (won ? "Hai vinto la partita!" : "Partita persa"), won ? "mp-win" : (tie ? "" : "mp-lose"));
          P.forEach(function (p) { p.chips = (winEnts || []).indexOf(p.ent) >= 0 ? 1 : 0; }); tblFinish(P, net, msg, en3, null, { rows: [], note: (winEnts && winEnts.length ? "🏆 " + P.filter(function (p) { return p.chips; }).map(function (p) { return p.me ? "Tu" : p.name; }).join(" + ") + (tie ? "" : " vince la partita") : "Pari: nessun vincitore") }); return;
        }
        say(msg, tie ? "Pari: nessuno vince" : (won ? "Hai vinto " + A.fmt(st.bet) + " $SDG (simulato)" : "Hai perso " + A.fmt(st.bet) + " $SDG (simulato)"), won ? "mp-win" : (tie ? "" : "mp-lose")); A.haptic(won ? "ok" : "light"); snd(won ? "win" : "lose");
        area.innerHTML = ""; var en2 = el("div", "mp-end"); area.appendChild(en2); var a1 = el("button", "mp-go", "RIGIOCA"); a1.type = "button"; a1.addEventListener("click", function () { scopaTable(mode, target); });
        var a2 = el("button", "mp-go mp-alt", "TORNA ALLA LOBBY"); a2.type = "button"; a2.addEventListener("click", function () { tableLobby("sc"); }); en2.appendChild(a1); en2.appendChild(a2);
      }
      if (!target) { gameEnd(wonH, tieH, winners.map(function (w) { return E2.indexOf(w); })); return; }
      var nx = el("button", "mp-go", "AVANTI ▶"); nx.type = "button"; en.appendChild(nx); say(msg, "Tocca AVANTI per vedere la classifica");
      nx.addEventListener("click", function () {
        felt.innerHTML = ""; area.innerHTML = ""; var mx = Math.max.apply(null, tot), lead = tot.filter(function (v) { return v === mx; }).length === 1, over = mx >= target && lead, st2 = el("div", "sc-stand");
        st2.appendChild(el("b", "", over ? "PARTITA FINITA" : "CLASSIFICA · A " + target)); var ord = E2.map(function (e, i) { return { n: e.n, t: tot[i], d: e.pt, me: i === myEnt }; }).sort(function (x, y) { return y.t - x.t; });
        ord.forEach(function (o, i) { var r = el("div", "sc-sr" + (o.me ? " me" : "") + (i === 0 ? " top" : "")); r.appendChild(el("u", "", String(i + 1))); r.appendChild(el("span", "n", o.n)); r.appendChild(el("em", "", "+" + o.d)); r.appendChild(el("i", "t", String(o.t))); var bar = el("div", "bar"), f = el("s"); f.style.width = Math.min(100, o.t / target * 100) + "%"; bar.appendChild(f); r.appendChild(bar); st2.appendChild(r); });
        st2.appendChild(el("div", "sc-tg", over ? "" : "Primo a " + target + " punti" + (mx >= target ? " (pari in testa: si gioca un'altra mano)" : ""))); felt.appendChild(st2);
        if (over) { var w0 = tot.indexOf(mx); gameEnd(w0 === myEnt, false, [w0]); if (net) return; say(msg, w0 === 0 ? "HAI VINTO LA PARTITA! +" + A.fmt(st.bet) + " $SDG (simulato)" : "Partita persa: " + ENT[w0] + " arriva a " + mx + " (−" + A.fmt(st.bet) + " $SDG simulato)", w0 === 0 ? "mp-win" : "mp-lose"); return; }
        var cb = el("button", "mp-go", "CONTINUA ▶"); cb.type = "button"; var cw = el("div", "mp-end"); if (net) { area.appendChild(cw); say(msg, "Premi PRONTO: la prossima mano parte quando lo sono tutti"); tblReady(P, "r" + rn, cw, 0).then(function () { if (alive(E)) scopaTable(mode, target, tot, rn + 1, net); }); return; } cw.appendChild(cb); area.appendChild(cw); say(msg, "Premi CONTINUA: la prossima mano parte quando sono tutti pronti");
        cb.addEventListener("click", function () {
          if (net) { cb.remove(); tblReady(P, "r" + rn, cw, 0).then(function () { if (alive(E)) scopaTable(mode, target, tot, rn + 1, net); }); return; }
          area.innerHTML = ""; var w = el("div", "mp-wait"), k = 1; area.appendChild(w); function paintW() { w.textContent = "⏳ Continua · " + k + "/" + N + " pronti"; } paintW();
          (function tick() { if (!alive(E)) return; if (k >= N) return scopaTable(mode, target, tot, rn + 1); wait(500 + rnd(500)).then(function () { if (!alive(E)) return; k++; paintW(); tick(); }); })();
        });
      });

    }
    paint(); next();
  }
  function pkTable(bots, cfg, net) {
    cfg = cfg || { buy: 100, wallet: 0, u: 5 };
    fit(true); epoch++; var E = epoch; body.innerHTML = "";
    var u = cfg.u, S0 = Math.max(4, Math.round(cfg.buy / u)), wallet = cfg.wallet, P = [];
    if (net) { net.roster.forEach(function (r) { P.push({ name: r.me ? "Tu" : r.name, me: r.me, net: r.me ? null : r.uid, uid: r.uid, stack: S0 }); }); for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i, stack: S0, bot: 1 }); }
    else { P.push({ name: "Tu", me: true, stack: S0 }); for (var i = 1; i <= bots; i++) P.push({ name: "🤖 Bot " + i, stack: S0 }); }
    var ME = 0; P.forEach(function (p, i) { if (p.me) ME = i; });
    var POS = P.length === 2 ? ["b", "t"] : P.length === 3 ? ["b", "l", "r"] : ["b", "l", "t", "r"];          // io in basso, avversari a sinistra / di fronte / a destra
    var PS = { b: "left:50%;bottom:8px;transform:translateX(-50%)", t: "left:50%;top:8px;transform:translateX(-50%)", l: "left:2px;top:36%", r: "right:2px;top:36%" };
    var c = el("div", "mp-card"); body.appendChild(c);
    c.appendChild(el("div", "mp-sec", "POKER TEXAS · ante " + A.fmt(u) + " $SDG" + (net ? "" : " (simulato)") + (u >= 50 ? " 💎" : "")));
    var felt = el("div", "mx-felt pk"), shoe = el("div", "mx-shoe"), msg = el("div", "pg-me", ""), area = el("div", "mp-area pkarea");
    shoe.style.cssText = "right:46%;top:46%;width:1px;height:1px;opacity:0;box-shadow:none"; 
    c.appendChild(felt); c.appendChild(msg); c.appendChild(area);
    var deck, board, pot, cur, dealer = 0, hn = 0;
    function paint(show) {
      felt.innerHTML = ""; felt.appendChild(shoe);
      var mid = el("div", "pk-mid"), prow = el("div", "pk-pot"), heap = el("span", "heap"), cm = el("div", "mx-cs pk-board");
      prow.appendChild(el("span", "", "Piatto " + A.fmt(pot * u) + " $SDG"));
      for (var q = 0; q < Math.min(14, 1 + Math.floor(pot / 2)); q++) { var ch = el("i", "ch c" + (q % 3)); ch.style.left = (6 + ((q * 37) % 31)) + "px"; ch.style.top = (6 - ((q * 53) % 9) - (q > 8 ? 4 : 0)) + "px"; heap.appendChild(ch); }
      prow.appendChild(heap); mid.appendChild(prow);
      for (var k = 0; k < 5; k++) cm.appendChild(k < board.length ? mcEl(board[k], false, "cm") : el("span", "mc cm empty")); mid.appendChild(cm); felt.appendChild(mid);
      P.forEach(function (p, i) {
        var s = el("div", "mx-seat" + (p.me ? " me" : "") + (i === cur ? " turn" : "") + (p.fold ? " fold" : "") + (p.hl ? " hl-" + p.hl : "")); s.style.cssText = PS[POS[(i - ME + P.length) % P.length]];
        var cs = el("div", "mx-cs"); if (p.hole) p.hole.forEach(function (x) { cs.appendChild(mcEl(x, !(p.me || (show && !p.fold)), p.me ? "" : "")); }); s.appendChild(cs);
        s.appendChild(el("div", "mx-tag", p.name + " · " + A.fmt(p.stack * u) + (i === dealer ? " Ⓓ" : "") + (p.out ? " (fuori)" : "") + (p.gone ? " (disconnesso)" : "")));
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
    function autoAmt() { var o = (u >= 50 ? [1000, 2000, 5000] : [50, 100, 200, 500]).filter(function (n) { return n <= wallet; }); var t = cfg.buy || 0, best = 0; o.forEach(function (n) { if (!best || Math.abs(n - t) < Math.abs(best - t)) best = n; }); return best || (wallet > 0 ? wallet : 0); }
    function rebuy(cb) {                                         // fiche finite: ricompra dal tuo saldo oppure esci
      area.innerHTML = ""; var opts = (u >= 50 ? [1000, 2000, 5000] : [50, 100, 200, 500]).filter(function (n) { return n <= wallet; });
      if (!opts.length && wallet > 0) opts = [wallet];
      say(msg, opts.length ? "Fiche finite! Ricompra per restare al tavolo (saldo " + A.fmt(wallet) + ")" : "Fiche finite e saldo insufficiente: non puoi ricomprare.");
      var bx = el("div", "mx-bets"); area.appendChild(bx);
      opts.forEach(function (n) { var b = el("button", "r", "💰 " + A.fmt(n)); b.type = "button"; b.addEventListener("click", function () { A.haptic("medium"); area.innerHTML = ""; if (cb) return cb(n); wallet -= n; P[0].stack = Math.max(2, Math.round(n / u)); hand(); }); bx.appendChild(b); });
      var ex = el("button", "f", "🚪 ESCI"); ex.type = "button"; ex.addEventListener("click", function () { if (cb) { area.innerHTML = ""; cb(0); } else lobby(); }); bx.appendChild(ex);
    }
    function hand() {
      if (!alive(E)) return; area.innerHTML = ""; deck = newDeck(); board = []; pot = 0;
      P.forEach(function (p) { if ((p.bot || (!p.me && !net)) && p.stack < 2) p.stack = S0; p.hl = ""; });
      if (!net && P[0].stack < 2) return rebuy();
      if (net) return netRebuys(0);
      deal();
    }
    var HS = [];
    function deal() {
      P.forEach(function (p) { p.s0 = p.stack; });
      P.forEach(function (p) { p.fold = false; p.act = ""; p.win = false; if (p.out) { p.fold = true; p.hole = []; return; } p.hole = [deck.pop(), deck.pop()]; p.stack -= 1; pot += 1; });   // ante = 1 unità
      cur = -1; say(msg, "Carte distribuite. Ante pagato da tutti."); var n = paint(false);
      wait(500 + n * 110).then(function () { return street(0); });
    }
    function netRebuys(i) {                                          // chi ha finito le fiches ricompra (soldi veri dal saldo) oppure esce dal tavolo
      if (!alive(E)) return;
      while (i < P.length && (P[i].bot || P[i].out || P[i].stack >= 2)) i++;
      if (i >= P.length) { if (P.filter(function (p) { return !p.out && !p.gone && p.stack >= 2; }).length < 2) return pkEnd(true); return deal(); }
      var p = P[i], dn = ++NET.d;
      function apply2(e) { if (e && e.a === "rebuy" && e.n > 0) { p.stack = Math.max(2, Math.round(e.n / u)); } else { p.out = true; p.fold = true; } netRebuys(i + 1); }
      if (p.me) { var aa = autoAmt(); (function (cbk) { if (aa > 0) { A.toast("💰 Fiche finite: +" + A.fmt(aa) + " $SDG dal tuo saldo"); cbk(aa); } else rebuy(cbk); })(function (n) { if (n > 0) { A.api("/api/room/topup", "POST", { id: NET.id, amount: n }).then(function () { wallet -= n; netSend({ k: "m", d: dn, a: "rebuy", n: n }); apply2({ a: "rebuy", n: n }); }).catch(function (x) { A.toast((x && x.message) || "Ricompra non riuscita"); netSend({ k: "m", d: dn, a: "out" }); apply2(null); }); } else { netSend({ k: "m", d: dn, a: "out" }); apply2(null); } }); }
      else { say(msg, "⏳ " + p.name + " ha finito le fiches…"); remoteAct(p, dn).then(function (e) { if (alive(E)) apply2(e); }); }
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
          var dn = net ? ++NET.d : 0; function go(a, amt) { if (net) netSend({ k: "m", d: dn, a: a, n: amt || 0 }); apply(a, amt); }
          area.innerHTML = ""; var bx = el("div", "mx-bets"), bx2 = el("div", "mx-bets r2"); area.appendChild(bx); area.appendChild(bx2);       // due righe compatte: FOLD · CHECK/CALL, poi i rilanci
          function add(label, cls, f, row) { var b = el("button", cls || "", label); b.type = "button"; b.addEventListener("click", function () { A.haptic("medium"); area.innerHTML = ""; f(); }); (row || bx).appendChild(b); }
          var room = p.stack - owe;
          add("🏳️ FOLD", "f big", function () { go("fold"); });
          if (owe) { say(msg, "Devi pagare " + A.fmt(owe * u) + " $SDG"); add("✅ CALL " + A.fmt(Math.min(owe, p.stack) * u), "ok big", function () { go("call"); }); }
          else { say(msg, "Tocca a te: CHECK o PUNTA"); add("✔️ CHECK", "ok big", function () { go("check"); }); }
          var opts = [base, base * 2, base * 4].filter(function (m) { return room > m; });
          opts.forEach(function (m) { add((owe ? "+" : "") + A.fmt(m * u), "r", function () { go("raise", m); }, bx2); });
          if (room > 0) add("ALL-IN " + A.fmt(room * u), "r allin", function () { go("raise", room); }, bx2);
        } else if (p.net) {
          say(msg, "⏳ " + p.name + " decide…"); var dr = ++NET.d;
          remoteAct(p, dr).then(function (e) {
            if (!alive(E)) return; var a = e ? String(e.a) : (owe ? "fold" : "check"), amt = e ? Math.max(0, e.n | 0) : 0;
            if (a === "raise") { amt = Math.min(amt, Math.max(0, p.stack - owe)); if (amt <= 0) a = owe ? "call" : "check"; }
            if (a === "call" && !owe) a = "check"; if (a === "check" && owe) a = "fold"; if (a !== "fold" && a !== "check" && a !== "call" && a !== "raise") a = owe ? "fold" : "check";
            wait(600).then(function () { apply(a, amt); });
          });
        } else {
          var str = strength(p) + (gf() - 0.5) * 0.12; say(msg, p.name + " decide…");
          var thr = 0.33 + Math.min(0.35, owe / Math.max(1, p.stack + owe) * 0.6), amt = str > 0.9 ? base * 2 : base;
          var a = owe ? (str > 0.78 && gf() < 0.35 && !bettor ? "raise" : (str > thr || gf() < 0.1 ? "call" : "fold")) : (str > 0.58 || gf() < 0.1 ? "raise" : "check");
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
      HS.push(P.map(function (p) { return ((p.stack - (p.s0 != null ? p.s0 : p.stack)) | 0) * u; }));
      paint(true); var mw = win.indexOf(P[ME]) >= 0;
      banner(felt, mw ? "HAI VINTO!" : (win[0].name.replace("🤖 ", "") + " VINCE"), "Piatto " + A.fmt(pot * u) + " $SDG" + (L.length > 1 && win[0].v != null ? " · " + CATN[catOf(win[0].v)] : " · tutti gli altri hanno foldato"), mw ? "win" : "lose");
      say(msg, mw ? "Hai vinto il piatto di " + A.fmt(pot * u) + " $SDG!" : (P[ME].fold ? "Hai foldato — vince " + win[0].name : "Vince " + win[0].name + " (" + A.fmt(pot * u) + " $SDG)"), mw ? "mp-win" : "mp-lose"); A.haptic(mw ? "ok" : "light"); snd(mw ? "win" : "lose");
      area.innerHTML = ""; var en = el("div", "mp-end"); area.appendChild(en); hn++;
      var fin = cfg.hands && hn >= cfg.hands;
      if (net) {
        if (fin) return pkEnd();
        tblReady(P, "h" + hn, en, P[ME].stack < 2 ? autoAmt() : 0).then(function () { if (alive(E)) { c.firstChild.textContent = "POKER TEXAS · ante " + A.fmt(u) + " $SDG · mano " + (hn + 1) + "/" + cfg.hands; hand(); } }); return;
      }
      if (fin) {
        var sm = tblSummary({ k: "pk", title: "POKER TEXAS · simulato", names: P.map(function (p) { return p.me ? "Tu" : p.name.replace("🤖 ", "🤖"); }), me: ME, rows: HS, again: function () { pkTable(bots, Object.assign({}, cfg, { wallet: walletNow() })); }, lobby: function () { tableLobby("pk"); } });
        var diff = P[ME].stack * u - cfg.buy; sm.res("🏁 Fine del tavolo dopo " + cfg.hands + " mani: " + (diff > 0 ? "+" : diff < 0 ? "−" : "") + A.fmt(Math.abs(diff)) + " $SDG (simulato)", diff > 0 ? "mp-win" : (diff < 0 ? "mp-lose" : "")); return;
      }
      else { var a1 = el("button", "mp-go", "RIGIOCA" + (cfg.hands ? " · mano " + (hn + 1) + "/" + cfg.hands : "")); a1.type = "button"; a1.addEventListener("click", function () { rematch(area, P.length, hand, E); }); en.appendChild(a1); }
      var a2 = el("button", "mp-go mp-alt", "TORNA ALLA LOBBY"); a2.type = "button"; a2.addEventListener("click", function () { tableLobby("pk"); }); en.appendChild(a2);
    }
    function pkEnd(early) { area.innerHTML = ""; var en = el("div", "mp-end"); area.appendChild(en); say(msg, early ? "Tavolo concluso: restano meno di 2 giocatori con fiches" : "Fine del tavolo dopo " + cfg.hands + " mani"); tblFinish(P, net, msg, en, null, { rows: HS }); }
    hand();
  }

  window.ArcadeMulti = { friendSheet: function (ex, pick) { friendSheet(ex || [], pick); }, myName: function () { return myName(); }, load: function () {
    if (!(A.multiOn && A.multiOn())) { soon(); return; }
    A.api("/api/social/donors").then(function (j) { st.players = j.players || []; st.opp = null; lobby(); }).catch(function () { lobby(); });
  }, openGP: function (rid) { if (!(A.multiOn && A.multiOn()) || !window.ArcadeRace) return false; fit(true); epoch++; body.innerHTML = ""; window.ArcadeRace.open(body, lobby, rid || ""); return true; } };
  // link diretto dal gruppo (t.me/…?startapp=multiplayer oppure grandprix): apre il Multiplayer (o subito il Grand Prix), già col tuo account
  (function () {
    var sp = ""; try { sp = String((window.Telegram.WebApp.initDataUnsafe || {}).start_param || ""); } catch (e) {}
    if (!sp) { try { sp = new URLSearchParams(location.search).get("go") || ""; } catch (e) {} }
    var rm = /^room_([A-Za-z0-9_-]{4,24})$/.exec(sp); if (sp !== "grandprix" && sp !== "multiplayer" && !rm) return;
    var tries = 0, iv = setInterval(function () {
      if (++tries > 40) return clearInterval(iv);
      if (!(A.multiOn && A.multiOn()) || !(A.me && A.me()) || !document.querySelector(".tab[data-tab=mp]")) return;
      clearInterval(iv); document.querySelector(".tab[data-tab=mp]").click(); if (sp === "grandprix") setTimeout(function () { window.ArcadeMulti.openGP(); }, 250); else if (rm) setTimeout(function () { window.ArcadeMulti.openGP(rm[1]); }, 250);
    }, 300);
  })();
})();
