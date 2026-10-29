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
  var hb = gear.parentNode;
  if (!hb.classList.contains("hbtns")) { hb = el("div", "hbtns"); gear.parentNode.insertBefore(hb, gear); hb.appendChild(gear); }
  hb.appendChild(btn); hb.classList.add("has");

  var list = [], told = {}, timer = 0, box = null;
  function ago(s) { return s < 60 ? "ora" : s < 3600 ? Math.floor(s / 60) + " min fa" : s < 86400 ? Math.floor(s / 3600) + " h fa" : Math.floor(s / 86400) + " g fa"; }

  // fumetto sotto il tasto: "Marco è online", un nome alla volta (scorre se sono più persone), resta finché c'è qualcuno online
  var bub = null, bi = 0, bt = 0, names = [], bubRaf = 0;   // il fumetto segue il tasto ad ogni frame: niente salti quando cambi schermata
  function placeBub() {
    if (!bub) return;
    var gameOpen = ["avi", "gm", "g4", "heist"].some(function (id) { var n = $(id); return n && !n.hidden; }) || !!document.querySelector(".set-ov:not([hidden]),#sheet:not([hidden]),.rc2");
    if (gameOpen || document.body.getAttribute("data-tab") !== "hub" || !btn.getClientRects().length || btn.getBoundingClientRect().width < 10 || !document.getElementById("top") || document.getElementById("top").offsetParent === null) { bub.style.display = "none"; return; }
    bub.style.display = ""; var r = btn.getBoundingClientRect(), hr = hb.getBoundingClientRect(), W = window.innerWidth;
    bub.style.top = Math.round(hr.bottom + 10) + "px";
    var w = bub.offsetWidth || 150, left = Math.max(8, Math.min(W - w - 8, r.left + r.width / 2 - w / 2));
    bub.style.left = left + "px"; bub.style.setProperty("--cx", Math.round(r.left + r.width / 2 - left) + "px"); if (bub._n && bub._n.textContent) bub.style.visibility = "";
  }
  function showName() {
    if (!names.length) { if (bub) { bub.remove(); bub = null; } return; }
    if (!bub) { bub = el("div", "frbub"); bub.style.visibility = "hidden"; bub.addEventListener("click", open); document.body.appendChild(bub); } if (!bubRaf) { var lp = function () { placeBub(); bubRaf = bub ? requestAnimationFrame(lp) : 0; }; bubRaf = requestAnimationFrame(lp); }
    var nm0 = names[bi % names.length]; bi++;
    if (!bub._n) { bub.textContent = ""; bub._n = el("span", "nm"); bub.appendChild(bub._n); bub.appendChild(document.createTextNode(" è online")); }
    bub._n.textContent = nm0; bub._n.classList.remove("swap"); if (names.length > 1) { void bub._n.offsetWidth; bub._n.classList.add("swap"); } placeBub();   // un solo online: il nome sta fermo
  }
  function setNames(n) {
    var same = n.join("|") === names.join("|"); names = n;
    if (!same || !bub) { bi = 0; showName(); }
    clearInterval(bt); if (names.length > 1) bt = setInterval(showName, 3200);
  }
  function poll() {
    try { localStorage.setItem("arc_mo", A.multiOn() ? "1" : "0"); } catch (e) {}
    if (!A.multiOn()) { btn.hidden = true; document.documentElement.classList.remove("mo"); setNames([]); return; }
    btn.hidden = false;
    A.api("/api/social/friends").then(function (j) {
      list = j.friends || [];
      var on = list.filter(function (f) { return f.online; });
      dot.hidden = !on.length; dot.textContent = String(on.length);
      setNames(on.slice(0, 8).map(function (f) { return f.name; }));
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
  btn.addEventListener("click", function () { if (bub) bub.style.display = "none"; open(); });
  poll(); timer = setInterval(poll, 25000); setInterval(placeBub, 300);
  setInterval(function () { if (A.multiOn() === btn.hidden) poll(); }, 1500);
})();
