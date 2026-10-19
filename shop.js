/* Sdrogo Arcade – Strogo Shop: negozio (oggetti che aiutano / fastidiosi per il gruppo) e inventario. */
(function () {
  "use strict";
  var A = window.Arcade; if (!A) return;
  var $ = function (id) { return document.getElementById(id); };
  var sub = "shop", data = null, busy = false;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function errMsg(e) { return e && e.network ? "Server non raggiungibile." : ((e && e.message) || "Errore."); }
  function empty(box, t) { box.innerHTML = ""; box.appendChild(el("div", "pg-empty", t)); }

  var tabs = document.querySelectorAll("#shopTabs .pcat");
  Array.prototype.forEach.call(tabs, function (b) {
    b.addEventListener("click", function () { setSub(b.getAttribute("data-sub")); A.haptic("light"); });
  });
  function setSub(k) {
    sub = k;
    Array.prototype.forEach.call(tabs, function (x) { x.classList.toggle("on", x.getAttribute("data-sub") === k); });
    if (data) render(); else load();
  }

  function load() {
    var box = $("shopBody");
    if (!data) empty(box, "Carico lo shop…");
    if (busy) return; busy = true;
    A.api("/api/social/shop").then(function (j) { data = j; A.setCoins(j.balance); render(); })
      .catch(function (e) { if (!data) empty(box, errMsg(e)); else A.toast(errMsg(e)); })
      .then(function () { busy = false; });
  }

  var IC = {
    boostluck: '<path d="M12 12c-2-4-6-4-6-1s3 4 6 1zm0 0c4-2 4-6 1-6s-4 3-1 6zm0 0c2 4 6 4 6 1s-3-4-6-1zm0 0c-4 2-4 6-1 6s4-3 1-6zM12 13v8"/>',
    boostwin: '<path d="M12 2c3 3 4 7 3 11l3 3-2 3-3-2-3 2-2-3 3-3C8 9 9 5 12 2z"/><circle cx="12" cy="9" r="1.6"/>',
    mutefilter: '<path d="M3 9v6h4l5 4V5L7 9z"/><path d="m16 9 5 6m0-6-5 6"/>',
    persecute: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1.2 2 6.8 2 8 0M9 9.5v.5M15 9.5v.5"/>',
    silence: '<path d="M12 3a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16"/>',
    sang: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/><path d="M9 15l1.5 2M15 15l-1.5 2"/>',
    title: '<path d="M4 7h16v10H4z"/><path d="M8 12h8"/>'
  };
  function icon(key, cls) {
    var d = el("div", "shi " + cls); d.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (IC[key] || IC.title) + "</svg>"; return d;
  }
  function section(box, title, note, cls) {
    var h = el("div", "sh-head " + (cls || ""), title); box.appendChild(h);
    if (note) box.appendChild(el("div", "sh-note", note));
  }

  function renderShop(box) {
    if (!data.v2) { empty(box, "Lo Shop è riservato a chi ha la V2."); return; }
    [["aiuti", "TI AIUTANO", "Boost per i tuoi giochi."], ["fastidi", "FASTIDIOSI PER IL GRUPPO", "Colpiscono gli altri giocatori in chat."]].forEach(function (c) {
      section(box, c[1], c[2], c[0]);
      data.items.filter(function (it) { return it.cat === c[0]; }).forEach(function (it) {
        var card = el("div", "shcard " + c[0]), left = el("div", "shl");
        left.appendChild(el("div", "shn", it.label.replace(/^[^\wÀ-ÿ]+/, "")));
        left.appendChild(el("div", "shs", it.short));
        left.appendChild(el("div", "shm", "Ne hai " + it.owned + (it.limit ? " · oggi " + it.left + "/" + it.limit + " acquistabili" : "")));
        card.insertBefore(icon(it.key, c[0]), card.firstChild); card.appendChild(left);
        var b = el("button", "shbuy"); b.type = "button";
        b.appendChild(document.createTextNode(A.fmt(it.price))); b.appendChild(el("span", "ci"));
        var out = it.left === 0;
        if (out) { b.disabled = true; b.firstChild.nodeValue = "ESAURITO"; b.lastChild.hidden = true; }
        else if (data.balance < it.price) b.classList.add("poor");
        b.addEventListener("click", function () { buy(it, b); });
        card.appendChild(b);
        box.appendChild(card);
      });
    });
  }

  function buy(it, b) {
    if (b.disabled) return; b.disabled = true; A.haptic("med");
    A.api("/api/shop/buy", "POST", { key: it.key }).then(function (r) {
      A.haptic("ok"); A.toast(r.message + (r.how ? " " + r.how : ""));
      data = r.shop; A.setCoins(data.balance); render();
    }, function (e) { b.disabled = false; A.haptic("err"); A.toast(errMsg(e)); });
  }

  function renderInv(box) {
    if (!data.v2) { empty(box, "L'inventario è riservato a chi ha la V2."); return; }
    var inv = data.inventory, any = false;
    section(box, "IL TUO INVENTARIO", "", "inv");
    inv.items.forEach(function (it) {
      if (!it.count && !it.active) return; any = true;
      var card = el("div", "shcard " + (it.cat || "inv")), left = el("div", "shl");
      left.appendChild(el("div", "shn", it.label + "  ×" + it.count));
      if (it.active) left.appendChild(el("div", "shm on", "ATTIVO: " + it.active + " " + it.unit + " rimaste"));
      if (it.how) left.appendChild(el("div", "shs", it.how));
      card.insertBefore(icon(it.key, it.cat || "inv"), card.firstChild); card.appendChild(left);
      if (it.activatable) {
        var b = el("button", "shbuy go", "ATTIVA"); b.type = "button";
        if (!it.count || it.active) b.disabled = true;
        b.addEventListener("click", function () {
          if (b.disabled) return; b.disabled = true; A.haptic("med");
          A.api("/api/shop/activate", "POST", { key: it.key }).then(function (r) {
            A.haptic("ok"); A.toast(r.message); data.inventory = r.inventory; render();
          }, function (e) { b.disabled = false; A.toast(errMsg(e)); });
        });
        card.appendChild(b);
      }
      box.appendChild(card);
    });
    if (!any) box.appendChild(el("div", "pg-empty", "Inventario vuoto: passa dal negozio."));
  }

  function render() {
    var box = $("shopBody"); box.innerHTML = "";
    if (sub === "shop") renderShop(box); else renderInv(box);
  }

  window.ArcadeShop = {
    load: load,
    reset: function () { data = null; },
    openInventory: function () { setSub("inv"); if (window.ArcadeTabs) window.ArcadeTabs.show("shop", true); }
  };
})();
