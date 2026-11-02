/* Tornei di Grand Prix: scheda "Tornei" (al posto di Classifica) con due grandi pillole: Tornei / Classifiche.
   Visibile solo all'account di prova finché l'admin non accende "Novità GP e Tornei" su Telegram. */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function $(id) { return document.getElementById(id); }
  function on() { return !!(A.gpxOn && A.gpxOn()); }
  var pg = $("pgLead"), body = null, mounted = false, view = "t", off = 0, list = [], cur = null, mode = "list", poll = 0, tick = 0, form = null, busy = 0;
  var PTS = [10, 8, 6, 4, 3, 2, 1, 0];

  function now() { return Date.now() + off; }
  function cd(sec) {
    sec = Math.max(0, Math.floor(sec)); var d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (d ? d + "g " : "") + (h || d ? h + "h " : "") + m + "m " + (s < 10 ? "0" : "") + s + "s";
  }
  function tracks() { try { return window.ArcadeRace._t.TRACKS.filter(function (t) { return !(t.sbx && !A.isSandbox()) && !(t.hideSbx && A.isSandbox()); }); } catch (e) { return []; } }
  function tname(id) { var t = tracks().filter(function (x) { return x.id === id; })[0]; return t ? t.name : id; }
  function api(p, b) { return A.api(p, "POST", b || {}).then(function (j) { if (j && j.now) off = j.now * 1000 - Date.now(); return j; }); }
  function err(e) { A.toast((e && e.message) || "Server non raggiungibile"); }

  function mount() {
    if (mounted || !pg) return; mounted = true;
    var head = pg.querySelector(".pg-head"), pills = el("div", "tn-pills");
    [["t", "🏆 Tornei"], ["c", "📊 Classifiche"]].forEach(function (p) {
      var b = el("button", "tn-p" + (view === p[0] ? " on" : ""), p[1]); b.type = "button"; b.setAttribute("data-v", p[0]);
      b.addEventListener("click", function () { setView(p[0]); A.haptic("light"); }); pills.appendChild(b);
    });
    head.parentNode.insertBefore(pills, head.nextSibling);
    body = el("div", "pg-body tn-body"); body.id = "tnBody"; pg.appendChild(body);
    var tb = document.querySelector('.tab[data-tab="lead"]');
    if (tb && window.MutationObserver) new MutationObserver(function () { if (tb.classList.contains("on")) onShow(); else stop(); }).observe(tb, { attributes: true, attributeFilter: ["class"] });
    setInterval(function () { tickCd(); }, 1000);
  }
  function sync() {
    var o = on(); if (o) mount(); if (!pg) return;
    pg.classList.toggle("tn-on", o && mounted); pg.classList.toggle("tn-v-t", o && view === "t"); pg.classList.toggle("tn-v-c", !o || view === "c");
    var tb = document.querySelector('.tab[data-tab="lead"]'); if (tb) { var lab = o ? "Tornei" : "Classifica"; if (tb.lastChild && tb.lastChild.nodeType === 3 && tb.lastChild.nodeValue !== lab) tb.lastChild.nodeValue = lab; }
    var tt = pg.querySelector(".pg-title"); if (tt) tt.textContent = o ? "TORNEI" : "CLASSIFICA";
  }
  function setView(v) {
    view = v; sync(); Array.prototype.forEach.call(pg.querySelectorAll(".tn-p"), function (b) { b.classList.toggle("on", b.getAttribute("data-v") === v); });
    if (v === "c" && window.ArcadeTabs) window.ArcadeTabs.show("lead"); else if (v === "t") onShow();
  }
  function stop() { clearInterval(poll); poll = 0; }
  function onShow() {
    if (!on() || view !== "t") return; stop();
    if (mode === "detail" && cur) loadDetail(cur); else loadList();
    poll = setInterval(function () { if (mode === "detail" && cur) loadDetail(cur, true); else if (mode === "list") loadList(true); }, 5000);
  }

  // ---------- elenco
  function loadList(quiet) {
    if (busy) return; busy = 1; if (!quiet && !list.length) { body.innerHTML = ""; body.appendChild(el("div", "pg-me", "Carico i tornei…")); }
    api("/api/tourn/list").then(function (j) { busy = 0; list = j.list || []; if (mode === "list") paintList(); }).catch(function (e) { busy = 0; if (!quiet) err(e); });
  }
  function paintList() {
    mode = "list"; body.innerHTML = "";
    var mk = el("button", "mp-go tn-new", "＋ CREA TORNEO"); mk.type = "button"; mk.addEventListener("click", function () { openForm(); }); body.appendChild(mk);
    if (!list.length) { body.appendChild(el("div", "pg-me", "Nessun torneo in programma. Creane uno!")); return; }
    body.appendChild(el("div", "mp-lab", "TORNEI APERTI E PROGRAMMATI"));
    list.forEach(function (t) { body.appendChild(card(t)); });
  }
  function card(t) {
    var c = el("div", "tn-card " + t.status); c.setAttribute("data-id", t.id);
    var h = el("div", "tn-h"); h.appendChild(el("b", "", t.name)); h.appendChild(el("em", "tn-st " + t.status, t.status === "sched" ? "IN PROGRAMMA" : (t.status === "open" ? "IN CORSO" : "CHIUSO"))); c.appendChild(h);
    c.appendChild(el("div", "tn-sub", "👤 " + t.hostName + " · 🏁 " + t.races + " gare · regole scelte prima di ogni gara"));
    c.appendChild(el("div", "tn-sub", "💳 Quota " + (t.fee ? A.fmt(t.fee) : "gratis") + " · 💰 Montepremi " + A.fmt(t.pot) + (t.bonus ? " + bonus " + A.fmt(t.bonus) : "") + " · 👥 " + t.n));
    var cdn = el("div", "tn-cd"); cdn.setAttribute("data-t", t.status === "sched" ? t.start : t.expires); cdn.setAttribute("data-k", t.status); c.appendChild(cdn);
    var row = el("div", "tn-btns"), go = el("button", "mp-go tn-go", ""); go.type = "button"; go.setAttribute("data-start", t.start); go.setAttribute("data-st", t.status);
    if (t.status === "sched") { go.disabled = true; go.textContent = "🔒 ENTRA"; } else go.textContent = t.status === "closed" ? "📊 RISULTATI" : (t.joined ? "▶ APRI" : "▶ ENTRA" + (t.fee ? " · " + A.fmt(t.fee) : ""));
    go.addEventListener("click", function () { if (go.disabled) return; if (t.status === "open" && !t.joined) join(t); else openDetail(t.id); });
    var inf = el("button", "mp-go mp-alt tn-inf", "ℹ Info"); inf.type = "button"; inf.addEventListener("click", function () { infoSheet(t); });
    row.appendChild(go); row.appendChild(inf); c.appendChild(row); tickCd(c); return c;
  }
  function tickCd(root) {
    var scope = root || document;
    Array.prototype.forEach.call(scope.querySelectorAll(".tn-cd,.tn-go[data-start]"), function (e) {
      if (e.classList.contains("tn-cd")) { var tg = +e.getAttribute("data-t") * 1000, k = e.getAttribute("data-k"), d = (tg - now()) / 1000; e.textContent = k === "closed" ? "" : (d > 0 ? (k === "sched" ? "⏳ Parte fra " : "⌛ Si chiude fra ") + cd(d) : (k === "sched" ? "▶ È partito!" : "⌛ In chiusura…")); }
      else if (e.getAttribute("data-st") === "sched") { var d2 = (+e.getAttribute("data-start") * 1000 - now()) / 1000; if (d2 <= 0 && e.disabled) { e.disabled = false; e.setAttribute("data-st", "open"); e.textContent = "▶ ENTRA"; loadList(true); } }
    });
  }
  function join(t) {
    api("/api/tourn/join", { id: t.id }).then(function (j) { if (j && j.success) { A.haptic("ok"); try { A.refreshMe(); } catch (e) {} openDetail(t.id); } else A.toast((j && j.error) || "Non riesco a entrare"); }).catch(err);
  }

  // ---------- info
  function infoSheet(t) {
    var ov = el("div", "tn-ov"), bx = el("div", "tn-sheet"); ov.appendChild(bx);
    bx.appendChild(el("b", "tn-it", "ℹ " + t.name));
    var rows = [
      ["Gare", t.races + " gare: pista, giri e regole le sceglie l'host nella lobby prima di ognuna"],
      ["Piste giocate", (t.tracks || []).filter(Boolean).map(tname).join(" → ") || "ancora da scegliere"],
      ["Partenza", new Date(t.start * 1000).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })],
      ["Durata", "fino a " + new Date(t.expires * 1000).toLocaleString("it-IT", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })],
      ["Iscrizione", t.fee ? A.fmt(t.fee) + " $SDG (vanno nel montepremi)" : "Gratis"],
      ["Premi", "Montepremi " + (t.bonus ? "+ bonus del Banco " + A.fmt(t.bonus) + " " : "") + "diviso 60% / 30% / 10% tra i primi tre della classifica"],
      ["Punti", PTS.join(" · ") + " (1°→8°), +1 al giro veloce di ogni gara"],
      ["Regole", "Niente bot. Puoi uscire e rientrare finché il torneo è aperto: classifica e punti restano salvati. Le gare possono essere anche in giorni diversi, con piloti diversi."],
      ["Come si gioca", "L'host lancia una gara alla volta: entra nella lobby, premi PRONTO e aspetta il via. Quando l'host chiude il torneo (o scade il tempo) si pagano i premi."]
    ];
    rows.forEach(function (r) { var d = el("div", "tn-ir"); d.appendChild(el("u", "", r[0])); d.appendChild(el("span", "", r[1])); bx.appendChild(d); });
    var x = el("button", "mp-go", "OK"); x.type = "button"; x.addEventListener("click", function () { ov.remove(); }); bx.appendChild(x);
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); }); document.body.appendChild(ov);
  }

  // ---------- dettaglio
  function openDetail(id) { cur = id; mode = "detail"; body.innerHTML = ""; body.appendChild(el("div", "pg-me", "Carico il torneo…")); loadDetail(id); }
  function loadDetail(id, quiet) {
    api("/api/tourn/get", { id: id }).then(function (j) { if (mode === "detail" && cur === id && j && j.t) paintDetail(j.t); else if (j && !j.success && !quiet) { A.toast(j.error || "Torneo non trovato"); back(); } }).catch(function (e) { if (!quiet) err(e); });
  }
  function back() { mode = "list"; cur = null; paintList(); loadList(true); }
  function confirmBtn(txt, ask, fn, cls) {
    var b = el("button", "mp-go " + (cls || ""), txt), t = 0; b.type = "button";
    b.addEventListener("click", function () { if (!t) { b.textContent = ask; t = setTimeout(function () { t = 0; b.textContent = txt; }, 3500); return; } clearTimeout(t); fn(); });
    return b;
  }
  function paintDetail(t) {
    var sc = body.scrollTop; body.innerHTML = "";
    var bk = el("button", "tn-back", "‹ Tornei"); bk.type = "button"; bk.addEventListener("click", back); body.appendChild(bk);
    var c = el("div", "tn-card " + t.status), h = el("div", "tn-h"); h.appendChild(el("b", "", t.name)); h.appendChild(el("em", "tn-st " + t.status, t.status === "sched" ? "IN PROGRAMMA" : (t.status === "open" ? "IN CORSO" : "CHIUSO"))); c.appendChild(h);
    c.appendChild(el("div", "tn-sub", "👤 " + t.hostName + " · 🏁 " + t.races + " gare · regole scelte prima di ogni gara"));
    c.appendChild(el("div", "tn-sub", "💰 Montepremi " + A.fmt(t.pot) + (t.bonus ? " + bonus " + A.fmt(t.bonus) : "") + " · 👥 " + t.n + " piloti"));
    var cdn = el("div", "tn-cd"); cdn.id = "tnDetCd"; cdn.setAttribute("data-t", t.status === "sched" ? t.start : t.expires); cdn.setAttribute("data-k", t.status); if (t.status !== "closed") c.appendChild(cdn); body.appendChild(c);
    var host = t.host === t.me, done = t.results.length;
    if (t.status === "closed") body.appendChild(podium(t));
    if (t.status === "open") {
      var gb = el("div", "tn-race"), rcN = (t.rc || [])[done] || {};
      if (t.room) {
        gb.appendChild(el("b", "", "🏁 GARA " + (done + 1) + "/" + t.races + " · " + tname(t.tracks[done]))); gb.appendChild(el("span", "", "La lobby è aperta: entra, premi PRONTO e aspetta il via."));
        var eb = el("button", "mp-go", "ENTRA NELLA LOBBY"); eb.type = "button"; eb.addEventListener("click", function () { enterRoom(t.room); }); gb.appendChild(eb);
      } else if (done >= t.races) {
        gb.appendChild(el("b", "", "🏆 Tutte le gare sono state corse")); gb.appendChild(el("span", host ? "Chiudi il torneo per pagare i premi." : "L'host chiude il torneo e pagano i premi."));
      } else if (host) {
        gb.appendChild(el("b", "", "Lobby · GARA " + (done + 1) + "/" + t.races)); gb.appendChild(el("span", "", "Scegli pista e regole di questa gara, poi lancia: si apre la lobby dove i piloti premono PRONTO."));
        body.appendChild(gb); gb = null; body.appendChild(setupPanel(t, done));
      } else { gb.appendChild(el("b", "", "Lobby · GARA " + (done + 1) + "/" + t.races)); gb.appendChild(el("span", "", "L'host sta scegliendo pista e regole. Appena lancia la gara comparirà qui il pulsante per entrare.")); }
      if (gb) body.appendChild(gb);
      body.appendChild(lobbyList(t));
    }
    // classifica
    body.appendChild(el("div", "mp-lab", "CLASSIFICA DEL TORNEO"));
    var tb = el("div", "tn-tbl"), hd = el("div", "tn-tr hd"); hd.appendChild(el("u", "", "#")); hd.appendChild(el("span", "nm", "Pilota"));
    for (var i = 0; i < t.races; i++) { var gh = el("i", "", "G" + (i + 1)); if (t.results[i]) gh.title = tname(t.results[i].track); hd.appendChild(gh); }
    hd.appendChild(el("b", "", "PT")); hd.style.setProperty("--n", t.races); tb.appendChild(hd);
    t.standings.forEach(function (r, k) {
      var tr = el("div", "tn-tr" + (r.uid === t.me ? " me" : "") + (r.in ? "" : " out")); tr.style.setProperty("--n", t.races); tr.appendChild(el("u", "", String(k + 1)));
      tr.appendChild(el("span", "nm", r.name + (r.fl ? "  ⏱" + (r.fl > 1 ? "×" + r.fl : "") : "")));
      for (var q = 0; q < t.races; q++) { var rs = t.results[q], v = r.rs[q], ce = el("i", rs && rs.fl === r.uid ? "fl" : "", rs ? (v == null ? "–" : String(v)) : "·"); tr.appendChild(ce); }
      tr.appendChild(el("b", "", String(r.pts))); tb.appendChild(tr);
    });
    if (!t.standings.length) tb.appendChild(el("div", "pg-me", "Nessun pilota ancora."));
    body.appendChild(tb); body.appendChild(el("div", "rc-note", "Punti 10-8-6-4-3-2-1-0 · ⏱ giro veloce di gara = +1 (cella viola)"));
    if (t.pay && Object.keys(t.pay).length) {
      body.appendChild(el("div", "mp-lab", "PREMI PAGATI"));
      Object.keys(t.pay).sort(function (a, b) { return t.pay[b] - t.pay[a]; }).forEach(function (u) { var p = t.standings.filter(function (s) { return s.uid === u; })[0]; body.appendChild(el("div", "tn-pay", "💰 " + (p ? p.name : "?") + " · +" + A.fmt(t.pay[u]) + " $SDG")); });
    }
    var inf = el("button", "mp-go mp-alt", "ℹ Info e regole"); inf.type = "button"; inf.addEventListener("click", function () { infoSheet(t); }); body.appendChild(inf);
    if (t.status !== "closed") {
      if (host) body.appendChild(confirmBtn("⛔ CHIUDI TORNEO", "Sicuro? Si pagano i premi", function () { api("/api/tourn/close", { id: t.id }).then(function (j) { if (j && j.success) { A.toast("Torneo chiuso"); try { A.refreshMe(); } catch (e) {} loadDetail(t.id); } else A.toast((j && j.error) || "Errore"); }).catch(err); }, "tn-close"));
      else if (t.joined) body.appendChild(confirmBtn("Esci dal torneo", "Sicuro? Potrai rientrare", function () { api("/api/tourn/leave", { id: t.id }).then(function () { loadDetail(t.id); }).catch(err); }, "mp-alt"));
      else if (t.status === "open") { var jb = el("button", "mp-go", "▶ ENTRA NEL TORNEO" + (t.fee ? " · " + A.fmt(t.fee) : "")); jb.type = "button"; jb.addEventListener("click", function () { join(t); }); body.appendChild(jb); }
    }
    body.scrollTop = sc; tickCd();
  }
  function enterLocal(t, o) {
    var done = t.results.length, tr2 = (t.tracks || []).slice(); tr2[done] = o.track; var t2 = Object.assign({}, t, { tracks: tr2, laps: o.laps, lng: o.laps >= 10, qual: o.qual, o: o });
    var bots = t.standings.filter(function (p) { return p.bot; }); if (o.bots < bots.length) { t2.standings = t.standings.filter(function (p) { return !p.bot; }).concat(bots.slice(0, o.bots)); }
    window.__tournCtx = t.id; var tb = document.querySelector('.tab[data-tab="mp"]'); if (tb) tb.click();
    setTimeout(function () { if (window.ArcadeMulti && window.ArcadeMulti.openGP) window.ArcadeMulti.openGP("", { t: t2 }); }, 350);
  }
  function enterRoom(rid) {
    window.__tournCtx = cur;
    var tb = document.querySelector('.tab[data-tab="mp"]'); if (tb) tb.click();
    setTimeout(function () { if (window.ArcadeMulti && window.ArcadeMulti.openGP) window.ArcadeMulti.openGP(rid); }, 350);
  }

  // ---------- lobby del torneo: opzioni della prossima gara (host) e partecipanti con stato pronto
  var rs = {};
  function setupPanel(t, done) {
    var FREE = !!(A.isSandbox && A.isSandbox()), k = t.id + ":" + done, T = tracks();
    var o = rs[k] || (rs[k] = { track: t.tracks[done] || (T[(done * 3 + 1) % Math.max(1, T.length)] || {}).id || "", laps: 5, coll: true, slip: false, assist: false, obst: true, pads: true, qual: "short", bots: 0 });
    var c = el("div", "mp-card tn-setup");
    c.appendChild(el("div", "mp-sec", "REGOLE DELLA GARA " + (done + 1)));
    c.appendChild(el("div", "mp-lab", "Pista"));
    var s = el("select", "tn-sel"); T.forEach(function (x) { var op = el("option", "", x.name); op.value = x.id; if (o.track === x.id) op.selected = true; s.appendChild(op); }); s.addEventListener("change", function () { o.track = s.value; }); c.appendChild(s);
    function seg(lab, opts, get, set) { c.appendChild(el("div", "mp-lab", lab)); var r = el("div", "dl-seg tn-seg"); opts.forEach(function (x) { var b = el("button", get() === x[0] ? "on" : "", x[1]); b.type = "button"; b.addEventListener("click", function () { set(x[0]); Array.prototype.forEach.call(r.children, function (q) { q.classList.remove("on"); }); b.classList.add("on"); if (lapsHook) lapsHook(); }); r.appendChild(b); }); c.appendChild(r); }
    var lapsHook = null, qb = el("div", "");
    if (FREE) { c.appendChild(el("div", "mp-lab", "Giri · 1-60 (da 10: gara lunga con pit)")); var ni = el("input", "tn-num"); ni.type = "number"; ni.min = 1; ni.max = 60; ni.value = o.laps; ni.addEventListener("change", function () { o.laps = Math.max(1, Math.min(60, Math.round(+ni.value || 5))); ni.value = o.laps; if (o.laps < 10) o.qual = "short"; paintQ(); }); c.appendChild(ni); }
    else seg("Giri", [3, 5, 10, 15, 20].map(function (n) { return [n, String(n)]; }), function () { return o.laps; }, function (v) { o.laps = v; });
    c.appendChild(qb);
    function paintQ() { qb.innerHTML = ""; if (FREE && o.laps >= 10) { qb.appendChild(el("div", "mp-lab", "Qualifica")); var r = el("div", "dl-seg tn-seg"); [["short", "Breve"], ["long", "Lunga 5 min"]].forEach(function (x) { var b = el("button", o.qual === x[0] ? "on" : "", x[1]); b.type = "button"; b.addEventListener("click", function () { o.qual = x[0]; paintQ(); }); r.appendChild(b); }); qb.appendChild(r); } else qb.appendChild(el("div", "rc-note", "Qualifica breve: un giro lanciato decide la griglia.")); }
    paintQ();
    [["coll", "Contatti tra le auto"], ["slip", "Scia"], ["assist", "Assistenza di guida"], ["obst", "Ostacoli (olio e acqua)"], ["pads", "Boost sulla pista"]].forEach(function (x) {
      var r = el("button", "lb-tog tn-tog" + (o[x[0]] ? " on" : ""), ""); r.type = "button"; r.appendChild(el("span", "", x[1])); r.appendChild(el("em", "", o[x[0]] ? "ON" : "OFF"));
      r.addEventListener("click", function () { o[x[0]] = !o[x[0]]; r.classList.toggle("on", o[x[0]]); r.lastChild.textContent = o[x[0]] ? "ON" : "OFF"; }); c.appendChild(r);
    });
    if (FREE) { c.appendChild(el("div", "mp-lab", "Bot in gara · 0-7, solo prova")); var bi = el("input", "tn-num"); bi.type = "number"; bi.min = 0; bi.max = 7; bi.value = o.bots; bi.addEventListener("change", function () { o.bots = Math.max(0, Math.min(7, Math.round(+bi.value || 0))); bi.value = o.bots; }); c.appendChild(bi); }
    var lb = el("button", "mp-go", "▶ LANCIA GARA " + (done + 1) + (FREE && o.bots ? " (contro i bot)" : "")); lb.type = "button";
    lb.addEventListener("click", function () {
      var botsList = (t.standings || []).filter(function (p) { return p.bot; }).length;
      if (FREE && (o.bots > 0 || botsList)) { enterLocal(t, o); return; }
      lb.disabled = true; api("/api/tourn/race", { id: t.id, opts: { track: o.track, laps: o.laps, qual: o.qual, coll: o.coll, slip: o.slip, assist: o.assist, obst: o.obst, pads: o.pads } }).then(function (j) { if (j && j.success) enterRoom(j.room); else { lb.disabled = false; A.toast((j && j.error) || "Non riesco a lanciare la gara"); } }).catch(function (e) { lb.disabled = false; err(e); });
    });
    c.appendChild(lb); return c;
  }
  function lobbyList(t) {
    var c = el("div", "tn-lobby"), L = t.lobby, ps = t.standings.filter(function (r) { return r.in; });
    c.appendChild(el("div", "mp-lab", "👥 PARTECIPANTI " + ps.length));
    ps.forEach(function (r) {
      var inRoom = L && L.players.filter(function (q) { return q.uid === r.uid; })[0], row = el("div", "tn-lr");
      row.appendChild(el("span", "nm", r.name + (r.uid === t.host ? " 👑" : "") + (r.uid === t.me ? " (tu)" : "")));
      row.appendChild(el("em", inRoom ? (inRoom.ready ? "ok" : "wt") : "off", L ? (inRoom ? (inRoom.ready ? "✅ PRONTO" : "⏳ in lobby") : "non ancora entrato") : "—"));
      c.appendChild(row);
    });
    if (!ps.length) c.appendChild(el("div", "pg-me", "Nessun pilota ancora."));
    return c;
  }
  function podium(t) {
    var c = el("div", "tn-pod"), top3 = t.standings.slice(0, 3), med = ["🥇", "🥈", "🥉"], ord = [1, 0, 2];
    c.appendChild(el("div", "tn-pod-t", "🏆 TORNEO CONCLUSO"));
    var row = el("div", "tn-pod-r");
    ord.forEach(function (i) { var r = top3[i]; if (!r) return; var b = el("div", "tn-pb p" + (i + 1)); b.appendChild(el("i", "", med[i])); b.appendChild(el("b", "", r.name)); b.appendChild(el("span", "", r.pts + " pt")); var pr = t.pay && t.pay[r.uid]; if (pr) b.appendChild(el("em", "", "+" + A.fmt(pr) + " $SDG")); row.appendChild(b); });
    c.appendChild(row);
    if (!top3.length) c.appendChild(el("div", "pg-me", "Nessuna gara corsa: quote restituite."));
    return c;
  }

  // ---------- creazione: solo le impostazioni generali; pista e regole di ogni gara si scelgono nella lobby prima del via
  var WD = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  function dayLabel(d, i) { return (i === 0 ? "Oggi" : i === 1 ? "Domani" : WD[d.getDay()]) + " " + d.getDate() + "/" + (d.getMonth() + 1); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function openForm() {
    mode = "form"; stop();
    var h0 = new Date(Date.now() + 3600000), f = form = { races: 3, fee: 100, bonus: 0, dur: 24, now: true, day: 0, time: pad2(h0.getHours()) + ":00" };
    function startTs() { if (f.now) return 0; var p = f.time.split(":"), d = new Date(); d.setDate(d.getDate() + f.day); d.setHours(+p[0] || 0, +p[1] || 0, 0, 0); return Math.round(d.getTime() / 1000) + Math.round(off / 1000); }
    function paint() {
      body.innerHTML = ""; var bk = el("button", "tn-back", "‹ Tornei"); bk.type = "button"; bk.addEventListener("click", function () { back(); onShow(); }); body.appendChild(bk);
      var c = el("div", "mp-card"); body.appendChild(c); c.appendChild(el("div", "mp-sec", "NUOVO TORNEO"));
      function row(lab, opts, get, set) { c.appendChild(el("div", "mp-lab", lab)); var r = el("div", "dl-seg tn-seg"); opts.forEach(function (o) { var b = el("button", get() === o[0] ? "on" : "", o[1]); b.type = "button"; b.addEventListener("click", function () { set(o[0]); paint(); }); r.appendChild(b); }); c.appendChild(r); }
      var FREE = !!(A.isSandbox && A.isSandbox());
      function num(lab, get, set, mn, mx, hint) { c.appendChild(el("div", "mp-lab", lab + (hint ? " · " + hint : ""))); var i = el("input", "tn-num"); i.type = "number"; i.min = mn; i.max = mx; i.value = get(); i.addEventListener("change", function () { var v = Math.max(mn, Math.min(mx, Math.round(+i.value || 0))); set(v); i.value = v; }); c.appendChild(i); }
      if (FREE) num("Numero di gare", function () { return f.races; }, function (v) { f.races = v; }, 1, 30, "1-30");
      else row("Numero di gare", [1, 2, 3, 4, 5, 6, 8].map(function (n) { return [n, String(n)]; }), function () { return f.races; }, function (v) { f.races = v; });
      row("Partenza", [[true, "Subito"], [false, "Data e ora"]], function () { return f.now; }, function (v) { f.now = v; });
      if (!f.now) {
        c.appendChild(el("div", "mp-lab", "Giorno e ora di inizio"));
        var tr = el("div", "tn-time"), ds = el("select", "tn-sel"); for (var i = 0; i < (FREE ? 30 : 14); i++) { var d = new Date(Date.now() + i * 86400000), o = el("option", "", dayLabel(d, i)); o.value = i; if (f.day === i) o.selected = true; ds.appendChild(o); }
        ds.addEventListener("change", function () { f.day = +ds.value; }); tr.appendChild(ds);
        var ti = el("input"); ti.type = "time"; ti.step = 60; ti.value = f.time; ti.addEventListener("change", function () { if (ti.value) f.time = ti.value; }); tr.appendChild(ti); c.appendChild(tr);
      }
      if (FREE) { num("Quota d'iscrizione $SDG", function () { return f.fee; }, function (v) { f.fee = v; }, 0, 1000000); num("Bonus dal Banco $SDG", function () { return f.bonus; }, function (v) { f.bonus = v; }, 0, 10000000); num("Durata (ore)", function () { return f.dur; }, function (v) { f.dur = v; }, 1, 720, "1-720"); }
      else {
        row("Quota d'iscrizione $SDG", [[0, "Gratis"], [50, "50"], [100, "100"], [250, "250"], [500, "500"], [1000, "1000"]], function () { return f.fee; }, function (v) { f.fee = v; });
        if (!A.guest()) row("Bonus dal Banco", [[0, "No"], [2000, "2.000"], [5000, "5.000"], [10000, "10.000"]], function () { return f.bonus; }, function (v) { f.bonus = v; });
        row("Durata massima", [[1, "1 h"], [6, "6 h"], [12, "12 h"], [24, "24 h"], [48, "48 h"]], function () { return f.dur; }, function (v) { f.dur = v; });
      }
      c.appendChild(el("div", "rc-note", "Pista, giri, contatti, scia, assistenza, ostacoli, boost e qualifica li scegli nella lobby, prima di ogni gara. Punti 10-8-6-4-3-2-1-0 +1 al giro veloce; il montepremi va 60/30/10 ai primi tre."));
      var go = el("button", "mp-go", "🏆 CREA TORNEO"); go.type = "button";
      go.addEventListener("click", function () {
        go.disabled = true;
        api("/api/tourn/create", { races: f.races, laps: 5, qual: "short", start: startTs(), fee: f.fee, bonus: f.bonus, dur: f.dur, bots: 0, tracks: [] }).then(function (j) { if (j && j.success) { A.haptic("ok"); A.toast("Torneo creato ✅"); mode = "list"; loadList(); onShow(); } else { go.disabled = false; A.toast((j && j.error) || "Non riesco a creare il torneo"); } }).catch(function (e) { go.disabled = false; err(e); });
      });
      c.appendChild(go);
    }
    paint();
  }

  window.ArcadeTourn = { open: function (id) { var tb = document.querySelector('.tab[data-tab="lead"]'); if (tb) tb.click(); view = "t"; try { sync(); } catch (e) {} Array.prototype.forEach.call(pg.querySelectorAll(".tn-p"), function (b) { b.classList.toggle("on", b.getAttribute("data-v") === "t"); }); mode = "detail"; cur = id; if (body) { body.innerHTML = ""; body.appendChild(el("div", "pg-me", "Carico il torneo…")); } onShow(); } };

  setInterval(sync, 700); sync();
})();
