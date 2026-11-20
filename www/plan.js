/* Monetra - planes Gratis / Pro: estado del plan, tarjeta lateral, ventana de planes y avisos para mejorar. */
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const LOCALES = { es: "es-CA", en: "en-CA", fr: "fr-CA" };
  let info = null;               // null = plan.sql no instalado: sin límites
  let modal = null;

  const T = s => (window.T ? window.T(s) : s);
  const isPro = () => !info || info.plan === "pro";

  const FEATURES = {
    household:  ["Hogar compartido", "Comparte ingresos y gastos en tiempo real con tu pareja o familia. Crear un hogar es una función Pro (unirte con un código es gratis)."],
    categories: ["Categorías ilimitadas", "El plan Gratis permite hasta 12 categorías. Con Pro creas todas las que necesites."],
    ai:         ["Asesor IA sin límite mensual", "El plan Gratis incluye 3 consultas al mes con el asesor de IA. Con Pro puedes consultarlo cuando quieras."],
    scan:       ["Escaneo de boletas", "El plan Gratis incluye 3 boletas escaneadas al mes. Con Pro escaneas hasta 100 al mes."],
    history:    ["Historial y análisis completos", "El plan Gratis muestra el mes actual y 3 meses. Con Pro ves 6 y 12 meses, el año completo y todas las vistas (Pareto, 50/30/20, acumulado, mapa de calor)."],
    debts:      ["Deudas ilimitadas y plan de salida", "El plan Gratis permite 2 deudas activas. Con Pro registras todas las que tengas, simulas pagos extra (avalancha y bola de nieve) y las compartes con tu hogar."],
    goals:      ["Metas de ahorro ilimitadas", "El plan Gratis permite 2 metas activas. Con Pro creas todas las que quieras (casa, carro, viajes…) y las compartes con tu hogar."],
    currency:   ["Varias monedas", "Registra movimientos en otras monedas (viajes, compras en el extranjero) y Monetra los convierte por ti."]
  };

  const ROWS = [
    ["Movimientos y respaldo", "Ilimitados", "Ilimitados"],
    ["Categorías propias", "Hasta 12", "Ilimitadas"],
    ["Gráfico de análisis", "Mes actual y 3 meses", "6 y 12 meses, año y todas las vistas"],
    ["Asesor IA", "3 consultas al mes", "Sin límite mensual"],
    ["Escaneo de boletas", "3 al mes", "Hasta 100 al mes"],
    ["Metas de ahorro", "Hasta 2", "Ilimitadas"],
    ["Deudas", "Hasta 2", "Ilimitadas + plan de salida"],
    ["Hogar compartido", "—", "Incluido"],
    ["Monedas", "Una moneda a elegir", "Varias monedas"]
  ];

  function daysLeft() {
    if (!info || !info.pro_until) return null;
    return Math.max(0, Math.ceil((new Date(info.pro_until) - Date.now()) / 86400000));
  }
  const fmtDate = d => new Date(d).toLocaleDateString(LOCALES[I18n.lang] || "es-CA", { year: "numeric", month: "short", day: "numeric" });

  function renderCard() {
    let el = document.getElementById("planCard");
    if (!info) { if (el) el.classList.add("hidden"); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "planCard";
      const anchor = document.getElementById("sideProfile");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor);
      else return;
      el.addEventListener("click", e => { if (e.target.closest("[data-plans]")) open(); });
    }
    el.classList.remove("hidden");
    const pro = info.plan === "pro";
    el.className = "plan-card " + (pro ? "is-pro" : "is-free");
    if (pro) {
      const d = daysLeft();
      const trial = info.source === "trial";
      el.innerHTML = `<div class="plan-top"><span class="pro-tag">PRO</span><b>${esc(T(trial ? "Prueba Pro" : "Plan Pro"))}</b></div>` +
        `<small>${d == null ? esc(T("Sin vencimiento")) : esc(T(trial ? "Te quedan" : "Vence en")) + " " + d + " " + esc(T(d === 1 ? "día" : "días"))}</small>` +
        `<button type="button" class="plan-btn" data-plans>${esc(T("Ver planes"))}</button>`;
    } else {
      const lim = info.limits || {};
      el.innerHTML = `<div class="plan-top"><b>${esc(T("Plan Gratis"))}</b></div>` +
        `<small>${esc(T("Asesor IA"))}: ${info.ai_month}/${lim.ai_month || 3} · ${esc(T("Boletas"))}: ${info.scans_month}/${lim.scans_month || 3}</small>` +
        `<button type="button" class="plan-btn" data-plans>${esc(T("Pasar a Pro"))}</button>`;
    }
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "modal-back hidden";
    modal.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><button type="button" class="modal-x" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button><div id="modalBody"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if (e.target === modal || e.target.closest(".modal-x") || e.target.closest("[data-close]")) close(); if (e.target.closest("[data-open-plans]")) open(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    return modal;
  }
  function show(html) {
    ensureModal();
    modal.querySelector("#modalBody").innerHTML = html;
    modal.classList.remove("hidden");
    if (window.I18n) { /* el observador de i18n traduce el contenido insertado */ }
  }
  function close() { if (modal) modal.classList.add("hidden"); }

  function upgradeButton() {
    const url = (window.APP_CONFIG || {}).UPGRADE_URL;
    if (url && /^https:\/\//.test(url)) return `<a class="btn-pro" href="${esc(url)}" target="_blank" rel="noopener">${esc(T("Pasar a Pro"))} · US$5 / ${esc(T("mes"))}</a>`;
    return `<button type="button" class="btn-pro" disabled>${esc(T("Pasar a Pro"))} · US$5 / ${esc(T("mes"))}</button><p class="muted small">${esc(T("El pago con tarjeta se activará pronto. Mientras tanto, durante la marcha blanca el administrador puede activarte Pro."))}</p>`;
  }

  function open() {
    const pro = isPro();
    const ck = '<svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    const no = '<svg class="ck no" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>';
    const list = col => ROWS.map(r => `<li>${r[col] === "—" ? no : ck}<span><b>${esc(T(r[0]))}</b><br>${r[col] === "—" ? esc(T("No incluido")) : esc(T(r[col]))}</span></li>`).join("");
    show(`<h3>${esc(T("Elige tu plan"))}</h3>
      <p class="muted plan-sub">${esc(T("Lo básico es gratis para siempre. Pro suma las herramientas que más ahorran tiempo y dinero."))}</p>
      <div class="plan-cards">
        <div class="plan-col"><div class="pc-name">${esc(T("Gratis"))}</div><div class="pc-price">US$0</div><ul>${list(1)}</ul></div>
        <div class="plan-col is-pro"><span class="pc-rec">${esc(T("Recomendado"))}</span><div class="pc-name">Pro</div><div class="pc-price">US$5<small>/${esc(T("mes"))}</small></div><ul>${list(2)}</ul></div>
      </div>
      ${info && info.plan === "pro" ? `<p class="plan-note">${esc(T("Ya tienes Pro"))}${info.pro_until ? " · " + esc(T("hasta")) + " " + esc(fmtDate(info.pro_until)) : ""}.</p>` : upgradeButton()}
      <button type="button" class="secondary plan-close" data-close>${esc(T("Cerrar"))}</button>`);
    return pro;
  }

  // Aviso cuando el usuario toca una función que su plan no incluye.
  function upsell(feature) {
    const f = FEATURES[feature] || FEATURES.history;
    if (window.MonetraTrack) MonetraTrack.event("upsell_" + (FEATURES[feature] ? feature : "history"));
    show(`<div class="upsell-ico">★</div><h3>${esc(T(f[0]))}</h3><p>${esc(T(f[1]))}</p>
      <div class="modal-actions"><button type="button" data-open-plans>${esc(T("Ver planes"))}</button><button type="button" class="secondary" data-close>${esc(T("Ahora no"))}</button></div>`);
  }

  async function load() {
    try { info = await Data.myPlan(); } catch (e) { info = null; }
    renderCard();
    return info;
  }
  const lockIcon = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>';

  window.MonetraPlan = { load, isPro, upsell, open, close, lockIcon, show, get info() { return info; } };
  document.addEventListener("monetra:logout", () => { info = null; });
})();
