/* Monetra - navegación móvil: barra inferior (Registrar, Gráficos, Asesor IA, Hogar, Más) y hoja "Más". */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var bar = $("mobileBar"), sheet = $("moreSheet"), back = $("moreBack");
  if (!bar || !sheet) return;
  var MORE = { categoriesSection: 1, analyticsSection: 1, goalsSection: 1, debtsSection: 1, profileSection: 1 };

  function activeSection() {
    var b = document.querySelector(".nav-btn.active[data-section]");
    return b ? b.getAttribute("data-section") : "transactionsSection";
  }
  function sync() {
    var cur = activeSection(), open = !sheet.classList.contains("hidden");
    bar.querySelectorAll("[data-go]").forEach(function (b) { b.classList.toggle("on", !open && b.getAttribute("data-go") === cur); });
    $("mbMore").classList.toggle("on", open || !!MORE[cur]);
    sheet.querySelectorAll("[data-go]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-go") === cur); });
  }
  function go(id) {
    var btn = document.querySelector('.nav-btn[data-section="' + id + '"]');
    if (btn) btn.click();
    close(); sync();
  }
  function planRow() {
    var box = $("msPlan"), src = $("planCard");
    box.innerHTML = "";
    if (!src) return;
    var c = src.cloneNode(true); c.removeAttribute("id"); box.appendChild(c);
    var real = src.querySelector("[data-plans]"), mine = c.querySelector("[data-plans]");
    if (mine && real) mine.addEventListener("click", function (e) { e.preventDefault(); close(); real.click(); });
  }
  function open() {
    planRow();
    var adm = $("adminLink");
    $("msAdmin").classList.toggle("hidden", !adm || adm.classList.contains("hidden"));
    sheet.classList.remove("hidden"); back.classList.remove("hidden");
    document.body.classList.add("sheet-open"); sync();
  }
  function close() {
    sheet.classList.add("hidden"); back.classList.add("hidden");
    document.body.classList.remove("sheet-open"); sync();
  }
  document.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { go(b.getAttribute("data-go")); }); });
  $("mbMore").addEventListener("click", function () { sheet.classList.contains("hidden") ? open() : close(); });
  $("mobAvatar").addEventListener("click", open);
  back.addEventListener("click", close);
  $("msAdmin").addEventListener("click", function () { var a = $("adminLink"); if (a) location.href = a.getAttribute("href"); });
  $("msExport").addEventListener("click", function () { close(); $("exportBtn").click(); });
  $("msImport").addEventListener("click", function () { close(); $("importBtn").click(); });
  $("msLogout").addEventListener("click", function () { close(); var l = $("logoutBtn"); if (l) l.click(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  // Mantener sincronizado el botón activo y la etiqueta PRO.
  var menu = document.querySelector(".menu");
  if (menu && window.MutationObserver) new MutationObserver(sync).observe(menu, { attributes: true, subtree: true, attributeFilter: ["class"] });
  function pro() {
    var el = $("mobPro"); if (!el) return;
    var on = window.MonetraPlan && MonetraPlan.isPro && MonetraPlan.isPro();
    el.classList.toggle("hidden", !on);
  }
  document.addEventListener("monetra:ready", function () { pro(); sync(); });
  document.addEventListener("monetra:plan", pro);
  setInterval(pro, 4000);
  sync();
})();

// Accesibilidad: el foco con Tab se queda dentro de la ventana (modal) abierta.
(function () {
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var modals = [].slice.call(document.querySelectorAll(".modal")).filter(function (m) { return m.offsetParent !== null || m.getClientRects().length; });
    var m = modals[modals.length - 1]; if (!m) return;
    var f = [].slice.call(m.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!m.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });
})();
