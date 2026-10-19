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

  section("🖥️ Grafica");
  seg("Qualità 3D", [["auto", "Auto"], [0, "Alta"], [1, "Media"], [2, "Bassa"]], function () { return S.q; }, function (v) { S.q = v; save(); apply(); });
  sw("Animazioni della sala", function () { return S.anim; }, function (v) { S.anim = v; save(); apply(); });
  section("🔊 Audio");
  slider("Musica della sala", function () { return S.mHub; }, function (v) { S.mHub = v; save(); apply(); });
  slider("Musica dei giochi", function () { return S.mGame; }, function (v) { S.mGame = v; save(); apply(); });
  slider("Suoni dei giochi", function () { return S.sfx; }, function (v) { S.sfx = v; save(); apply(); }, function () { if (window.ArcadeAudio) { window.ArcadeAudio.sfx("chip"); setTimeout(function () { window.ArcadeAudio.sfx("win"); }, 250); } });
  section("📳 Vibrazione");
  sw("Vibrazione", function () { return S.vib; }, function (v) { S.vib = v; save(); if (v) A.haptic("med"); });
  var ok = el("button", "set-ok", "Chiudi"); ok.type = "button"; ok.addEventListener("click", close); card.appendChild(ok);
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  $("app").appendChild(box);

  var adminDone = false;
  function open() {
    box.hidden = false; A.haptic("light");
    if (adminDone) return; adminDone = true;
    A.api("/api/wheel/state").then(function (v) {                    // il server dice se sei l'admin
      if (!v || !v.admin) return;
      var sec = el("div", "set-sec", "🧪 Prova (solo admin)");
      var b = el("button", "set-ok", "Prova la Ruota Daily"); b.type = "button"; b.style.marginTop = "6px";
      b.addEventListener("click", function () { close(); if (window.ArcadeGames && window.ArcadeGames.wheel) window.ArcadeGames.wheel.open({ test: true }); });
      card.insertBefore(sec, ok); card.insertBefore(b, ok);
    }).catch(function () { adminDone = false; });
  }
  function close() { box.hidden = true; }
  var g = $("gear"); if (g) g.addEventListener("click", open);
  window.ArcadeSettingsUI = { open: open, close: close, isOpen: function () { return !box.hidden; } };
  apply();
  window.addEventListener("load", apply);
  setTimeout(apply, 1500);          // il 3D si carica dopo: gli si ripassano le impostazioni
})();
