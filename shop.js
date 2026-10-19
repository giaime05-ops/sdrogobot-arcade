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

  function section(box, title, note) {
    var h = el("div", "sh-head", title); box.appendChild(h);
    if (note) box.appendChild(el("div", "sh-note", note));
  }

  function renderShop(box) {
    if (!data.v2) { empty(box, "Lo Shop è riservato a chi ha la V2."); return; }
    [["aiuti", "TI AIUTANO", "Boost per i tuoi giochi."], ["fastidi", "FASTIDIOSI PER IL GRUPPO", "Colpiscono gli altri giocatori in chat."]].forEach(function (c) {
      section(box, c[1], c[2]);
      data.items.filter(function (it) { return it.cat === c[0]; }).forEach(function (it) {
        var card = el("div", "shcard"), left = el("div", "shl");
        left.appendChild(el("div", "shn", it.label.replace(/^[^\wÀ-ÿ]+/, "")));
        left.appendChild(el("div", "shs", it.short));
        left.appendChild(el("div", "shm", "Ne hai " + it.owned + (it.limit ? " · oggi " + it.left + "/" + it.limit + " acquistabili" : "")));
        card.appendChild(left);
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
    section(box, "IL TUO INVENTARIO", "⭐ Stelle Heist: " + inv.stars);
    inv.items.forEach(function (it) {
      if (!it.count && !it.active) return; any = true;
      var card = el("div", "shcard"), left = el("div", "shl");
      left.appendChild(el("div", "shn", it.label + "  ×" + it.count));
      if (it.active) left.appendChild(el("div", "shm on", "ATTIVO: " + it.active + " " + it.unit + " rimaste"));
      if (it.how) left.appendChild(el("div", "shs", it.how));
      card.appendChild(left);
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
