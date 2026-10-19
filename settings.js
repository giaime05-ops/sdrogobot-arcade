/* Sdrogo Arcade – impostazioni: qualità grafica, animazioni, volumi, vibrazione. Si salvano sul telefono. */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "arc_settings";
  var S = { q: "auto", anim: true, mHub: 0.4, mGame: 0.4, sfx: 0.7, vib: true };
  try { var j = JSON.parse(localStorage.getItem(KEY) || "{}"); Object.keys(S).forEach(function (k) { if (j[k] !== undefined) S[k] = j[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function apply() {
    window.ArcadeSettings = S;
    if (window.ArcadeAudio) window.ArcadeAudio.set({ mHub: S.mHub, mGame: S.mGame, sfx: S.sfx });
    if (window.Arcade3D && window.Arcade3D.setQuality) { window.Arcade3D.setQuality(S.q); window.Arcade3D.setAnim(S.anim); }
  }
  window.ArcadeSettings = S;

  var box = el("div", "set-ov"); box.id = "settings"; box.hidden = true;
  var card = el("div", "set-card"); box.appendChild(card);
  card.appendChild(el("h2", "", "IMPOSTAZIONI"));

  function section(t) { card.appendChild(el("div", "set-sec", t)); }
  function seg(label, opts, get, set) {
    var row = el("div", "set-row"); row.appendChild(el("div", "set-lab", label));
    var g = el("div", "set-seg");
    opts.forEach(function (o) {
      var b = el("button", "", o[1]); b.type = "button";
      function paint() { b.classList.toggle("on", String(get()) === String(o[0])); }
      b.addEventListener("click", function () { set(o[0]); Array.prototype.forEach.call(g.children, function (x) { x._p && x._p(); }); });
      b._p = paint; paint(); g.appendChild(b);
    });
    row.appendChild(g); card.appendChild(row);
  }
  function sw(label, get, set) {
    var row = el("div", "set-row"); row.appendChild(el("div", "set-lab", label));
    var b = el("button", "set-sw"); b.type = "button";
    function paint() { b.classList.toggle("on", !!get()); b.textContent = get() ? "SÌ" : "NO"; }
    b.addEventListener("click", function () { set(!get()); paint(); }); paint();
    row.appendChild(b); card.appendChild(row);
  }
  function slider(label, get, set, test) {
    var row = el("div", "set-row"); row.appendChild(el("div", "set-lab", label));
    var r = el("input", "set-rng"); r.type = "range"; r.min = 0; r.max = 100; r.value = Math.round(get() * 100);
    var v = el("span", "set-val", r.value + "%");
    r.addEventListener("input", function () { set(r.value / 100); v.textContent = r.value + "%"; });
    r.addEventListener("change", function () { if (test) test(); });
    row.appendChild(r); row.appendChild(v); card.appendChild(row);
  }

  // Account admin: primo elemento. Solo l'admin entra; per gli altri il server non lo permette comunque.
  var adm = el("button", "set-adm", "ACCOUNT ADMIN"); adm.type = "button";
  adm.addEventListener("click", function () {
    A.haptic("light");
    if (!A.isAdmin()) { A.toast("Funzione riservata all'admin."); return; }
    close(); openAdmin();
  });
  card.appendChild(adm);
  section("Grafica");
  seg("Qualità 3D", [["auto", "Auto"], [0, "Alta"], [1, "Media"], [2, "Bassa"]], function () { return S.q; }, function (v) { S.q = v; save(); apply(); });
  sw("Animazioni della sala", function () { return S.anim; }, function (v) { S.anim = v; save(); apply(); });
  section("Audio");
  slider("Musica della sala", function () { return S.mHub; }, function (v) { S.mHub = v; save(); apply(); });
  slider("Musica dei giochi", function () { return S.mGame; }, function (v) { S.mGame = v; save(); apply(); });
  slider("Suoni dei giochi", function () { return S.sfx; }, function (v) { S.sfx = v; save(); apply(); }, function () { if (window.ArcadeAudio) { window.ArcadeAudio.sfx("chip"); setTimeout(function () { window.ArcadeAudio.sfx("win"); }, 250); } });
  section("Vibrazione");
  sw("Vibrazione", function () { return S.vib; }, function (v) { S.vib = v; save(); if (v) A.haptic("med"); });
  var ok = el("button", "set-ok", "Chiudi"); ok.type = "button"; ok.addEventListener("click", close); card.appendChild(ok);
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  $("app").appendChild(box);

  function open() { box.hidden = false; A.haptic("light"); }
  function close() { box.hidden = true; var a = $("adminpg"); if (a) a.hidden = true; }
  var g = $("gear"); if (g) g.addEventListener("click", open);
  // ---------- pagina "Account admin": profilo di prova con 30.000.000 $SDG, ruota e missioni illimitate ----------
  var abox = el("div", "set-ov"); abox.id = "adminpg"; abox.hidden = true;
  var acard = el("div", "set-card"); abox.appendChild(acard);
  abox.addEventListener("click", function (e) { if (e.target === abox) abox.hidden = true; });
  $("app").appendChild(abox);
  function tool(what, value, msg) {
    A.api("/api/shop/admin", "POST", { key: what, value: value }).then(function (r) {
      A.haptic("ok"); A.toast(msg || r.message);
      if (r.balance != null) A.setCoins(r.balance);
      if (window.ArcadeTabs) window.ArcadeTabs.reset();
    }, function (e) { A.toast((e && e.message) || "Errore"); });
  }
  function openAdmin() {
    acard.innerHTML = ""; acard.appendChild(el("h2", "", "ACCOUNT ADMIN"));
    var on = A.isSandbox();
    acard.appendChild(el("div", "set-note", on
      ? "Sei nel profilo di prova: saldo di 30.000.000 $SDG, Ruota Daily illimitata, Banco e sfida di gruppo non vengono toccati. Il tuo account vero resta com'è."
      : "Entra in un profilo di prova separato dal tuo vero account: 30.000.000 $SDG, Ruota Daily e missioni a volontà per provare tutto."));
    var sw1 = el("button", "set-ok" + (on ? " off" : ""), on ? "ESCI DALL'ACCOUNT DI PROVA" : "ENTRA NELL'ACCOUNT DI PROVA"); sw1.type = "button";
    sw1.addEventListener("click", function () { A.setSandbox(!on).then(function () { A.toast(!on ? "Account di prova attivo" : "Sei tornato al tuo account"); if (!on) openAdmin(); else abox.hidden = true; }); });
    acard.appendChild(sw1);
    if (on) {
      acard.appendChild(el("div", "set-sec", "Strumenti di prova"));
      [["Ruota Daily: ricarica", function () { tool("wheel", 0, "Ruota Daily pronta"); }],
       ["Nuove missioni", function () { tool("quests_new", 0, "Missioni rigenerate"); }],
       ["Completa le missioni (prova il pallino)", function () { tool("quests_done", 0, "Missioni completate: guarda Attività"); }],
       ["+5 di ogni oggetto", function () { tool("items", 0, "Oggetti aggiunti"); }],
       ["Saldo a 30.000.000", function () { tool("reset", 0, "Saldo ripristinato"); }],
       ["Saldo a 1.000", function () { tool("coins", 1000, "Saldo a 1.000"); }]].forEach(function (t) {
        var b = el("button", "set-tool", t[0]); b.type = "button"; b.addEventListener("click", t[1]); acard.appendChild(b);
      });
    }
    var cl = el("button", "set-ok", "Chiudi"); cl.type = "button"; cl.addEventListener("click", function () { abox.hidden = true; });
    acard.appendChild(cl);
    abox.hidden = false;
  }
  var so = $("sbxOut"); if (so) so.addEventListener("click", function () { A.setSandbox(false).then(function () { A.toast("Sei tornato al tuo account"); }); });

  window.ArcadeSettingsUI = { open: open, close: close, isOpen: function () { return !box.hidden || !abox.hidden; } };
  apply();
  window.addEventListener("load", apply);
  setTimeout(apply, 1500);          // il 3D si carica dopo: gli si ripassano le impostazioni
})();
