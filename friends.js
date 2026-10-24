/* Sdrogo Arcade – Amici (PROTOTIPO, solo account admin di prova): chi è online adesso, con banner quando qualcuno entra. */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var gear = $("gear"); if (!gear) return;
  var btn = el("button", "gearbtn frbtn"); btn.type = "button"; btn.hidden = true; btn.setAttribute("aria-label", "Amici");
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9" r="2.4"/><path d="M17 14.6c2.4.1 4 1.8 4 4.4"/></svg>';
  var dot = el("i", "frdot"); dot.hidden = true; btn.appendChild(dot);
  gear.parentNode.insertBefore(btn, gear);

  var list = [], told = {}, timer = 0, box = null;
  function ago(s) { return s < 60 ? "ora" : s < 3600 ? Math.floor(s / 60) + " min fa" : s < 86400 ? Math.floor(s / 3600) + " h fa" : Math.floor(s / 86400) + " g fa"; }

  function banner(names) {
    var b = el("div", "q-ban frban"); b.textContent = "🟢 " + names.join(", ") + (names.length > 1 ? " sono online" : " è online");
    b.addEventListener("click", function () { b.remove(); open(); });
    document.body.appendChild(b);
    setTimeout(function () { b.classList.add("off"); setTimeout(function () { b.remove(); }, 400); }, 4500);
  }
  function poll() {
    if (!A.isSandbox()) { btn.hidden = true; return; }
    btn.hidden = false;
    A.api("/api/social/friends").then(function (j) {
      list = j.friends || [];
      var on = list.filter(function (f) { return f.online; });
      dot.hidden = !on.length; dot.textContent = String(on.length);
      var fresh = on.filter(function (f) { return !told[f.pid]; });
      list.forEach(function (f) { if (f.online) told[f.pid] = 1; else delete told[f.pid]; });
      if (fresh.length) banner(fresh.slice(0, 3).map(function (f) { return f.name; }));
      if (box && !box.hidden) paint();
    }).catch(function () {});
  }
  function paint() {
    var body = box._body; body.innerHTML = "";
    if (!list.length) { body.appendChild(el("div", "pg-empty", "Nessun giocatore, per ora.")); return; }
    list.forEach(function (f) {
      var r = el("div", "row fr-row" + (f.online ? " on" : ""));
      var av = el("div", "avatar rav"); A.styleAvatar(av, f.style || {}, (f.name || "?").charAt(0).toUpperCase()); r.appendChild(av);
      var nm = el("div", "nm"); nm.appendChild(A.nameEl(f.name, f.style || {})); if (f.badge) nm.appendChild(A.badgeEl(f.badge)); r.appendChild(nm);
      r.appendChild(el("div", "fr-st", f.online ? "● online" : ago(f.ago)));
      body.appendChild(r);
    });
  }
  function open() {
    if (!box) {
      box = el("div", "set-ov"); box.hidden = true;
      var card = el("div", "set-card"); box.appendChild(card);
      card.appendChild(el("h2", "", "AMICI"));
      card.appendChild(el("div", "qmeta", "Prototipo (solo admin): chi è online adesso nel gruppo."));
      box._body = el("div", "fr-list"); card.appendChild(box._body);
      var c = el("button", "set-ok", "Chiudi"); c.type = "button"; c.addEventListener("click", function () { box.hidden = true; }); card.appendChild(c);
      box.addEventListener("click", function (e) { if (e.target === box) box.hidden = true; });
      $("app").appendChild(box);
    }
    paint(); box.hidden = false; A.haptic("light"); poll();
  }
  btn.addEventListener("click", open);
  poll(); timer = setInterval(poll, 25000);
  setInterval(function () { if (A.isSandbox() === btn.hidden) poll(); }, 1500);
})();
