/* Sdrogo Arcade – Extra (sezione Attività): Lavora (mini quiz a tempo) e Dona (regala $SDG a un giocatore del gruppo). */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function errMsg(e) { return e && e.network ? "Server non raggiungibile." : ((e && e.message) || "Errore."); }
  var box = null, timer = 0, token = 0;

  function fmtWait(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h > 0 ? h + "h " + m + "m" : Math.max(1, m) + " min"; }

  function load(target) {
    box = target; token++; clearInterval(timer);
    box.innerHTML = ""; box.appendChild(el("div", "pg-empty", "Carico…"));
    A.api("/api/social/work").then(function (w) { if (box === target) render(w); })
      .catch(function (e) { box.innerHTML = ""; box.appendChild(el("div", "pg-empty", errMsg(e))); });
  }

  function clock(s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(h) + ":" + p(m) + ":" + p(x); }

  function render(w) {
    box.innerHTML = "";
    var t0 = Date.now(), live = [];
    // ---- RUOTA DAILY ----
    var wc = el("div", "qcard xcard"); wc.appendChild(el("h3", "", "RUOTA DAILY"));
    var wt = el("div", "xtimer"); wc.appendChild(wt);
    wc.appendChild(el("div", "qmeta", "Si rinnova ogni giorno a mezzanotte (ora italiana)."));
    box.appendChild(wc);
    live.push(function (el_s) {
      if (w.wheel_available) { wt.textContent = "Disponibile ora! Gira dalla home"; wt.className = "xtimer on"; }
      else { wt.textContent = "Si rinnova tra " + clock(w.wheel_in - el_s); wt.className = "xtimer"; if (w.wheel_in - el_s <= 0) return true; }
    });
    // ---- PRESTITO DAL BANCO ----
    var ln = w.loan;
    if (ln) {
      var lc = el("div", "qcard xcard"); lc.appendChild(el("h3", "", "PRESTITO DEL BANCO"));
      if (ln.owed > 0) {
        lc.appendChild(el("div", "xdebt", "Da restituire: " + ln.owed + " $SDG"));
        lc.appendChild(el("div", "qtxt", "Prestito " + ln.amount + " $SDG · totale da rendere " + ln.total + " · già restituiti " + ln.paid + " $SDG."));
        var pr = el("div", "xprog"); var pi = el("i"); pi.style.width = Math.min(100, Math.round(ln.paid / Math.max(1, ln.total) * 100)) + "%"; pr.appendChild(pi); lc.appendChild(pr);
        var rp = el("button", "xbtn", "SALDA TUTTO (" + ln.owed + " $SDG)"); rp.type = "button";
        if (ln.balance < ln.owed) { rp.disabled = true; rp.textContent = "SALDA TUTTO (" + ln.owed + ") · mancano " + (ln.owed - ln.balance); }
        rp.addEventListener("click", function () {
          rp.disabled = true; A.haptic("med");
          A.api("/api/extra/loan_repay", "POST", {}).then(function (r) { A.haptic("ok"); if (A.toast) A.toast(r.msg || "Prestito saldato"); load(box); })
            .catch(function (e) { rp.disabled = false; if (A.toast) A.toast(errMsg(e)); });
        });
        lc.appendChild(rp);
        lc.appendChild(el("div", "qmeta", "Il " + ln.cut + "% di ogni tua vincita, in qualsiasi gioco, va al Banco finché il debito non è saldato. Nel frattempo non puoi donare."));
      } else {
        lc.appendChild(el("div", "qtxt", "Il Banco presta fino a " + ln.daily_max + " $SDG al giorno (+" + ln.fee + "% da restituire) a chi ha meno di " + ln.trigger + " $SDG. Ripaghi col " + ln.cut + "% di ogni vincita."));
        var row = el("div", "xloan");
        ln.options.forEach(function (o) {
          var lb = el("button", "xbtn", o + " $SDG"); lb.type = "button";
          if (!ln.eligible) lb.disabled = true;
          lb.addEventListener("click", function () {
            lb.disabled = true; A.haptic("med");
            A.api("/api/extra/loan_take", "POST", { amount: o }).then(function (r) { A.haptic("ok"); if (A.toast) A.toast(r.msg || "Prestito concesso"); load(box); })
              .catch(function (e) { lb.disabled = false; if (A.toast) A.toast(errMsg(e)); });
          });
          row.appendChild(lb);
        });
        lc.appendChild(row);
        if (!ln.options.length) lc.appendChild(el("div", "qmeta", "Hai già preso il massimo di oggi: torna domani."));
        else if (!ln.eligible) lc.appendChild(el("div", "qmeta", "Hai " + ln.balance + " $SDG: il prestito si sblocca sotto i " + ln.trigger + "."));
      }
      box.appendChild(lc);
    }
    // ---- LAVORA ----
    var c = el("div", "qcard xcard"); c.appendChild(el("h3", "", "LAVORA"));
    c.appendChild(el("div", "qtxt", "Risolvi un enigma entro " + w.time + " secondi e guadagni " + w.reward + " $SDG. Riservato a chi ha meno di " + w.max_balance + " $SDG."));
    var b = el("button", "xbtn", "INIZIA"); b.type = "button";
    if (!w.v2) { b.disabled = true; b.textContent = "SOLO V2"; }
    else if (w.too_rich) { b.disabled = true; b.textContent = "HAI GIÀ TROPPI $SDG"; }
    else if (w.cooldown > 0) { b.disabled = true; b.textContent = "DI NUOVO TRA " + clock(w.cooldown);
      live.push(function (el_s) { var r = w.cooldown - el_s; b.textContent = "DI NUOVO TRA " + clock(r); if (r <= 0) return true; }); }
    b.addEventListener("click", function () { startWork(c, b); });
    if (w.too_rich && w.balance >= w.max_balance) c.appendChild(el("div", "qmeta", "Il tuo saldo è sopra la soglia: vai a giocare!"));
    c.appendChild(b); box.appendChild(c);
    // ---- DONA ----
    var d = el("div", "qcard xcard"); d.appendChild(el("h3", "", "DONA"));
    d.appendChild(el("div", "qtxt", "Regala da 1 a 50 $SDG a un giocatore del gruppo (una donazione al giorno per persona)."));
    var db = el("button", "xbtn alt", "SCEGLI CHI"); db.type = "button"; db.addEventListener("click", function () { openDonate(); });
    d.appendChild(db); box.appendChild(d);
    var mine = box;
    timer = setInterval(function () {
      if (box !== mine || !mine.isConnected) { clearInterval(timer); return; }
      var es = (Date.now() - t0) / 1000, again = false;
      live.forEach(function (f) { if (f(es)) again = true; });
      if (again) { clearInterval(timer); load(mine); }
    }, 1000);
    live.forEach(function (f) { f(0); });
  }

  function startWork(card, btn) {
    btn.disabled = true; A.haptic("med");
    A.api("/api/extra/work_start", "POST", {}).then(function (r) {
      card.innerHTML = ""; card.appendChild(el("h3", "", "LAVORA"));
      var pz = el("div", "xpuz"); pz.textContent = r.puzzle.text; card.appendChild(pz);
      var bar = el("div", "qbar"), fill = el("i"); bar.appendChild(fill); card.appendChild(bar);
      var left = r.time, t0 = Date.now(), done = false;
      fill.style.width = "100%";
      var opts = el("div", "xopts");
      r.puzzle.options.forEach(function (o, i) {
        var ob = el("button", "xopt", o); ob.type = "button";
        ob.addEventListener("click", function () { answer(i, ob); });
        opts.appendChild(ob);
      });
      card.appendChild(opts);
      var tick = setInterval(function () {
        var s = Math.max(0, r.time - (Date.now() - t0) / 1000); fill.style.width = (s / r.time * 100) + "%";
        if (s <= 0 && !done) { clearInterval(tick); }
      }, 200);
      function answer(i, ob) {
        if (done) return; done = true; clearInterval(tick); A.haptic("light");
        Array.prototype.forEach.call(opts.children, function (x) { x.disabled = true; });
        A.api("/api/extra/work_answer", "POST", { idx: i }).then(function (j) {
          var res = j.result; ob.classList.add(res.ok ? "ok" : "bad");
          if (!res.ok && res.answer != null && opts.children[res.answer]) opts.children[res.answer].classList.add("ok");
          A.haptic(res.ok ? "ok" : "bad"); A.toast(res.message); if (j.balance != null) A.setCoins(j.balance);
          setTimeout(function () { load(box); A.refreshMe(); }, 1600);
        }, function (e) { A.toast(errMsg(e)); setTimeout(function () { load(box); }, 900); });
      }
    }, function (e) { btn.disabled = false; A.toast(errMsg(e)); load(box); });
  }

  // ---- dona: foglio con elenco giocatori, ricerca e importo ----
  function openDonate() {
    var ov = document.getElementById("donate");
    if (!ov) { ov = el("div", "set-ov"); ov.id = "donate"; ov.addEventListener("click", function (e) { if (e.target === ov) ov.hidden = true; }); document.getElementById("app").appendChild(ov); }
    ov.innerHTML = ""; ov.hidden = false;
    var card = el("div", "set-card"); card.appendChild(el("h2", "", "DONA $SDG"));
    var list = el("div", "dn-list"); list.appendChild(el("div", "pg-empty", "Carico i giocatori…"));
    var amt = 5, amts = el("div", "set-seg"), search = el("input", "dn-search"); search.placeholder = "Cerca un giocatore"; search.type = "text";
    [1, 5, 10, 25, 50].forEach(function (v) {
      var b = el("button", v === amt ? "on" : "", String(v)); b.type = "button";
      b.addEventListener("click", function () { amt = v; Array.prototype.forEach.call(amts.children, function (x) { x.classList.toggle("on", x === b); }); });
      amts.appendChild(b);
    });
    var row = el("div", "set-row"); row.appendChild(el("div", "set-lab", "Importo")); row.appendChild(amts);
    card.appendChild(row); card.appendChild(search); card.appendChild(list);
    var cl = el("button", "set-ok", "Chiudi"); cl.type = "button"; cl.addEventListener("click", function () { ov.hidden = true; }); card.appendChild(cl);
    ov.appendChild(card);
    var players = [];
    function paint() {
      var q = search.value.trim().toLowerCase(); list.innerHTML = "";
      var f = players.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0; });
      if (!f.length) { list.appendChild(el("div", "pg-empty", players.length ? "Nessun risultato." : "Nessun giocatore trovato.")); return; }
      f.forEach(function (p) {
        var b = el("button", "dn-row"); b.type = "button"; b.appendChild(el("span", "dn-av", (p.name[0] || "?").toUpperCase())); b.appendChild(el("span", "dn-nm", p.name)); b.appendChild(el("span", "dn-go", "DONA " + amt));
        b.addEventListener("click", function () {
          if (b.disabled) return; b.disabled = true; A.haptic("med");
          A.api("/api/extra/donate", "POST", { target: p.id, amount: amt }).then(function (r) {
            A.haptic("ok"); A.toast(r.message); if (r.balance != null) A.setCoins(r.balance); ov.hidden = true; A.refreshMe();
          }, function (e) { b.disabled = false; A.toast(errMsg(e)); });
        });
        list.appendChild(b);
      });
    }
    search.addEventListener("input", paint); amts.addEventListener("click", function () { setTimeout(paint, 0); });
    A.api("/api/social/donors").then(function (j) { players = j.players || []; paint(); }).catch(function (e) { list.innerHTML = ""; list.appendChild(el("div", "pg-empty", errMsg(e))); });
  }

  window.ArcadeExtra = { load: load };
})();
