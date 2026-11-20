/* Monetra - Deudas: saldo, pagos, intereses y plan de salida (avalancha / bola de nieve). */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const T = s => (window.T ? window.T(s) : s);
  const LOCALES = { es: "es-CA", en: "en-CA", fr: "fr-CA" };
  const money = v => (typeof formatCurrency === "function" ? formatCurrency(v) : "$" + Number(v).toFixed(2));
  const FREE_LIMIT = 2;
  const MAX_MONTHS = 600;

  /* ---------- Cálculos (puros, sin pantalla) ---------- */
  const round2 = n => Math.round(n * 100) / 100;
  const balance = d => Math.max(0, round2(d.start - d.payments.reduce((s, p) => s + p.amount, 0)));
  const paidSum = d => round2(d.payments.reduce((s, p) => s + p.amount, 0));

  // Meses e intereses para saldar una deuda pagando una cuota fija mensual
  function payoff(bal, rate, pay) {
    if (bal <= 0) return { months: 0, interest: 0 };
    const r = rate / 100 / 12;
    if (!(pay > 0)) return { never: true };
    if (r > 0 && bal * r >= pay) return { never: true };
    let b = bal, m = 0, tot = 0;
    while (b > 0.005 && m < MAX_MONTHS) {
      const i = b * r; tot += i; b += i;
      b -= Math.min(pay, b); m++;
    }
    if (b > 0.005) return { never: true };
    return { months: m, interest: round2(tot) };
  }

  // Todas las deudas pagando solo el mínimo de cada una (sin reasignar)
  function baseline(list) {
    let months = 0, interest = 0;
    for (const d of list) {
      const p = payoff(balance(d), d.rate, d.minPayment);
      if (p.never) return { never: true };
      months = Math.max(months, p.months); interest += p.interest;
    }
    return { months, interest: round2(interest) };
  }

  // Estrategia: mínimos + pago extra; lo liberado al saldar una deuda pasa a la siguiente
  function simulate(list, extra, strategy) {
    const ds = list.map(d => ({ id: d.id, name: d.name, rate: d.rate, min: d.minPayment, bal: balance(d) })).filter(d => d.bal > 0);
    if (!ds.length) return { months: 0, interest: 0, order: [] };
    const budget = ds.reduce((s, d) => s + d.min, 0) + Math.max(0, extra || 0);
    if (!(budget > 0)) return { never: true };
    const orderFn = strategy === "snowball" ? (a, b) => a.bal - b.bal : (a, b) => b.rate - a.rate || a.bal - b.bal;
    let m = 0, tot = 0; const order = [];
    while (ds.some(d => d.bal > 0.005) && m < MAX_MONTHS) {
      m++;
      for (const d of ds) if (d.bal > 0) { const i = d.bal * d.rate / 1200; d.bal += i; tot += i; }
      let left = budget;
      for (const d of ds) if (d.bal > 0.005) { const p = Math.min(d.min, d.bal, left); d.bal -= p; left -= p; }
      const act = ds.filter(d => d.bal > 0.005).sort(orderFn);
      for (const d of act) { if (left <= 0) break; const p = Math.min(left, d.bal); d.bal -= p; left -= p; }
      for (const d of ds) if (d.bal <= 0.005 && !order.includes(d.id) && d.bal > -1) { d.bal = 0; order.push(d.id); }
    }
    if (ds.some(d => d.bal > 0.005)) return { never: true };
    return { months: m, interest: round2(tot), order };
  }

  window.MonetraDebtMath = { balance, payoff, baseline, simulate };

  /* ---------- Pantalla ---------- */
  let debts = [], loaded = false, showArchived = false, busy = false;
  let extra = 0, strategy = "avalanche";

  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const parse = s => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
  const lang = () => (window.I18n && I18n.lang) || "es";
  const fmtDate = s => parse(s).toLocaleDateString(LOCALES[lang()] || "es-CA", { year: "numeric", month: "short", day: "numeric" });
  const fmtMonth = months => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toLocaleDateString(LOCALES[lang()] || "es-CA", { year: "numeric", month: "long" }); };
  const isPro = () => !window.MonetraPlan || MonetraPlan.isPro();
  const dur = m => { const y = Math.floor(m / 12), r = m % 12; const a = y ? y + " " + T(y === 1 ? "año" : "años") : ""; const b = r ? r + " " + T(r === 1 ? "mes" : "meses") : ""; return (a + (a && b ? " " : "") + b) || ("0 " + T("meses")); };

  const KINDS = [["card", "Tarjeta de crédito"], ["loan", "Préstamo"], ["mortgage", "Hipoteca"], ["car", "Préstamo de auto"], ["student", "Préstamo estudiantil"], ["personal", "Deuda con una persona"], ["line", "Línea de crédito"], ["other", "Otra deuda"]];
  const kindLabel = k => { const f = KINDS.find(x => x[0] === k); return T(f ? f[1] : "Otra deuda"); };

  // días hasta el próximo vencimiento (0 = hoy)
  function daysToDue(day) {
    if (!day) return null;
    const n = parse(today()); let y = n.getFullYear(), m = n.getMonth();
    const lastOf = (yy, mm) => new Date(yy, mm + 1, 0).getDate();
    let d = new Date(y, m, Math.min(day, lastOf(y, m)));
    if (d < n) { m++; if (m > 11) { m = 0; y++; } d = new Date(y, m, Math.min(day, lastOf(y, m))); }
    return Math.round((d - n) / 86400000);
  }

  function card(d) {
    const bal = balance(d), paid = Math.min(d.start, Math.max(0, paidSum(d)));
    const pct = d.start > 0 ? Math.max(0, Math.min(100, (paid / d.start) * 100)) : 0;
    const done = bal <= 0;
    const dd = done ? null : daysToDue(d.dueDay);
    let chip = "";
    if (done) chip = `<span class="goal-chip done">${esc(T("¡Deuda pagada!"))}</span>`;
    else if (dd != null && dd <= 5) chip = `<span class="goal-chip behind">${esc(T(dd === 0 ? "Vence hoy" : "Vence pronto"))}</span>`;
    const rateTxt = d.rate > 0 ? `<span class="debt-rate">${d.rate.toLocaleString(LOCALES[lang()] || "es-CA", { maximumFractionDigits: 2 })}% ${esc(T("anual"))}</span>` : "";
    let plan = "";
    if (done) plan = `<p class="goal-plan">🎉 ${esc(T("Saldaste esta deuda. ¡Felicitaciones!"))}</p>`;
    else if (!(d.minPayment > 0)) plan = `<p class="goal-plan">${esc(T("Agrega un pago mensual para ver cuándo terminas."))}</p>`;
    else {
      const p = payoff(bal, d.rate, d.minPayment);
      if (p.never) plan = `<p class="goal-plan debt-warn">⚠️ ${esc(T("Tu pago mensual no cubre los intereses: la deuda crece. Sube el pago para salir de ella."))}</p>`;
      else plan = `<p class="goal-plan">${esc(T("Pagando"))} <b>${money(d.minPayment)}</b> ${esc(T("al mes terminas en"))} <b>${esc(dur(p.months))}</b> (${esc(fmtMonth(p.months))})${d.rate > 0 ? ` ${esc(T("y pagas"))} <b>${money(p.interest)}</b> ${esc(T("en intereses"))}` : ""}.</p>`;
    }
    const dueTxt = d.dueDay && !done ? `<span class="goal-date">📅 ${esc(T("Vence el día"))} ${d.dueDay}</span>` : "";
    const hist = d.payments.length
      ? `<details class="goal-hist"><summary>${esc(T("Historial"))} (${d.payments.length})</summary><ul>${d.payments.map(c =>
          `<li><span>${esc(fmtDate(c.date))}${c.note ? " · " + esc(c.note) : ""}${d.shared ? " · " + esc(T(c.mine ? "Tú" : "Otro miembro")) : ""}</span>` +
          `<b class="${c.amount < 0 ? "neg" : ""}">${c.amount < 0 ? "+" : "−"}${money(Math.abs(c.amount))}</b>` +
          (c.mine ? `<button type="button" class="gc-del" data-del-pay="${esc(c.id)}" aria-label="${esc(T("Eliminar pago"))}">✕</button>` : "") + `</li>`).join("")}</ul></details>`
      : "";
    return `<article class="goal-card debt-card${d.archived ? " is-archived" : ""}" data-debt="${esc(d.id)}">
      <header class="goal-top">
        <span class="goal-ico" aria-hidden="true">${MonetraIcons.debt(d.kind)}</span>
        <div class="goal-title"><h4 translate="no">${esc(d.name)}</h4><div class="goal-meta"><span>${esc(kindLabel(d.kind))}</span>${rateTxt}${dueTxt}${d.shared ? `<span class="goal-shared">👥 ${esc(T("Compartida"))}</span>` : ""}</div></div>
        ${chip}
      </header>
      <div class="goal-amounts"><b>${money(bal)}</b><span>${esc(T("de"))} ${money(d.start)}</span><em>${Math.round(pct)}% ${esc(T("pagado"))}</em></div>
      <div class="goal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="${esc(d.name)}"><i style="width:${pct.toFixed(1)}%"></i></div>
      ${plan}
      <div class="goal-actions">
        ${d.archived || done ? "" : `<button type="button" class="goal-add" data-pay="${esc(d.id)}">+ ${esc(T("Registrar pago"))}</button>`}
        <button type="button" class="secondary" data-edit="${esc(d.id)}">${esc(T("Editar"))}</button>
        <button type="button" class="secondary" data-archive="${esc(d.id)}">${esc(T(d.archived ? "Reactivar" : "Archivar"))}</button>
        <button type="button" class="secondary danger" data-remove="${esc(d.id)}">${esc(T("Eliminar"))}</button>
      </div>
      ${hist}
    </article>`;
  }

  function summary(active) {
    if (!active.length) return "";
    const live = active.filter(d => balance(d) > 0);
    const total = live.reduce((a, d) => a + balance(d), 0);
    const mins = live.reduce((a, d) => a + d.minPayment, 0);
    const intr = live.reduce((a, d) => a + balance(d) * d.rate / 1200, 0);
    const b = baseline(live);
    const free = !live.length ? T("¡Sin deudas!") : b.never ? "—" : fmtMonth(b.months);
    const tile = (k, v, cls) => `<div class="gs-tile${cls ? " " + cls : ""}"><span>${esc(T(k))}</span><b>${v}</b></div>`;
    return tile("Deuda total", money(total)) + tile("Pagos mínimos al mes", money(mins)) + tile("Intereses al mes (aprox.)", money(intr)) + tile("Libre de deudas (pagando el mínimo)", esc(free));
  }

  function strategyCard(active) {
    const live = active.filter(d => balance(d) > 0);
    if (live.length < 1) return "";
    const head = `<h3>${esc(T("Plan para salir de deudas"))}</h3><p class="muted">${esc(T("Suma un pago extra cada mes y compara dos métodos: Avalancha (primero la de mayor interés, ahorras más) o Bola de nieve (primero la más pequeña, ganas motivación)."))}</p>`;
    if (!isPro()) {
      return `<section class="card debt-plan">${head}<div class="debt-lock"><span aria-hidden="true">🔒</span><div><b>${esc(T("Función del plan Pro"))}</b><p class="muted">${esc(T("Simula cuánto tiempo e intereses te ahorras con un pago extra."))}</p></div><button type="button" class="btn-pro" id="debtUnlock">${esc(T("Ver planes"))}</button></div></section>`;
    }
    const base = baseline(live), sim = simulate(live, extra, strategy);
    let res = "";
    if (sim.never) res = `<p class="debt-warn">⚠️ ${esc(T("Con estos pagos no se alcanza a saldar las deudas. Sube los pagos mínimos o el pago extra."))}</p>`;
    else {
      const names = sim.order.map((id, i) => { const d = live.find(x => x.id === id); return `<li><span class="n">${i + 1}</span><span translate="no">${esc(d ? d.name : "")}</span></li>`; }).join("");
      let cmp = "";
      if (!base.never && (extra > 0 || live.length > 1)) {
        const sm = base.months - sim.months, si = round2(base.interest - sim.interest);
        if (sm > 0 || si > 0.5) cmp = `<p class="debt-save">✅ ${esc(T("Frente a pagar solo los mínimos ahorras"))} <b>${money(Math.max(0, si))}</b> ${esc(T("en intereses y terminas"))} <b>${esc(dur(Math.max(0, sm)))}</b> ${esc(T("antes"))}.</p>`;
      }
      res = `<div class="debt-res"><div class="gs-tile"><span>${esc(T("Terminas en"))}</span><b>${esc(dur(sim.months))}</b><small>${esc(fmtMonth(sim.months))}</small></div><div class="gs-tile"><span>${esc(T("Intereses totales"))}</span><b>${money(sim.interest)}</b></div></div>${cmp}<h4>${esc(T("Orden de pago"))}</h4><ol class="debt-order">${names}</ol>`;
    }
    return `<section class="card debt-plan">${head}
      <div class="debt-controls">
        <label>${esc(T("Pago extra al mes"))}<input type="number" id="debtExtra" min="0" step="0.01" inputmode="decimal" value="${extra || ""}" placeholder="0"></label>
        <div class="seg" role="radiogroup" aria-label="${esc(T("Método"))}">
          <label class="seg-i"><input type="radio" name="dStrat" value="avalanche"${strategy === "avalanche" ? " checked" : ""}><span>${esc(T("Avalancha"))}</span></label>
          <label class="seg-i"><input type="radio" name="dStrat" value="snowball"${strategy === "snowball" ? " checked" : ""}><span>${esc(T("Bola de nieve"))}</span></label>
        </div>
      </div><div id="debtRes" aria-live="polite">${res}</div></section>`;
  }

  function render() {
    const list = $("debtsList"), sum = $("debtsSummary"), plan = $("debtsPlan");
    if (!list) return;
    const active = debts.filter(d => !d.archived), arch = debts.filter(d => d.archived);
    sum.innerHTML = summary(active);
    plan.innerHTML = loaded ? strategyCard(active) : "";
    let html = "";
    if (!loaded) html = `<p class="muted">${esc(T("Cargando…"))}</p>`;
    else if (!active.length) {
      html = `<div class="goals-empty card"><div class="ge-ico">💳</div><h3>${esc(T("Registra tu primera deuda"))}</h3>
        <p class="muted">${esc(T("Agrega tus tarjetas y préstamos, anota tus pagos y Monetra te muestra cuándo terminas y cuánto pagas en intereses."))}</p>
        <div class="goal-templates">${KINDS.slice(0, 6).map(t => `<button type="button" class="secondary" data-template="${t[0]}|${esc(t[1])}"><span aria-hidden="true">${MonetraIcons.debt(t[0])}</span> ${esc(T(t[1]))}</button>`).join("")}</div></div>`;
    } else html = active.map(card).join("");
    if (arch.length) {
      html += `<div class="goals-arch-toggle"><button type="button" class="secondary" id="debtArchToggle">${esc(T(showArchived ? "Ocultar archivadas" : "Ver archivadas"))} (${arch.length})</button></div>`;
      if (showArchived) html += arch.map(card).join("");
    }
    list.innerHTML = html;
    const btn = $("debtNewBtn"); if (btn) btn.disabled = !loaded;
  }

  async function load() {
    try { debts = await Data.getDebts(); }
    catch (e) { debts = []; loaded = false; $("debtsList").innerHTML = `<div class="card"><p class="muted">${esc(e.message || String(e))}</p></div>`; return; }
    loaded = true; render();
  }

  function canCreate() {
    if (isPro()) return true;
    if (Data.getScope && Data.getScope() !== "personal") return true;
    return debts.filter(d => !d.archived && !d.shared).length < FREE_LIMIT;
  }
  function fail(e) {
    if (e && e.code === "limit_debts") { MonetraPlan.upsell("debts"); return; }
    alert(T("No se pudo guardar:") + " " + ((e && e.message) || String(e)));
  }

  function debtForm(d, tpl) {
    const kind = (d && d.kind) || (tpl && tpl[0]) || "card";
    const name = (d && d.name) || (tpl && T(tpl[1])) || "";
    const opts = KINDS.map(k => `<option value="${k[0]}"${k[0] === kind ? " selected" : ""}>${MonetraIcons.debt(k[0])} ${esc(T(k[1]))}</option>`).join("");
    MonetraPlan.show(`<h3>${esc(T(d ? "Editar deuda" : "Nueva deuda"))}</h3>
      <form id="debtForm" class="goal-form" novalidate>
        <label>${esc(T("Nombre"))}<input type="text" id="dName" maxlength="60" required value="${esc(name)}" placeholder="${esc(T("Ej.: Visa, Préstamo del carro"))}"></label>
        <label>${esc(T("Tipo"))}<select id="dKind">${opts}</select></label>
        <label>${esc(T(d ? "Monto inicial de la deuda (antes de tus pagos)" : "Cuánto debes hoy"))}<input type="number" id="dStart" min="0.01" step="0.01" inputmode="decimal" required value="${d ? d.start : ""}"></label>
        <label>${esc(T("Tasa de interés anual (%)"))}<input type="number" id="dRate" min="0" max="100" step="0.01" inputmode="decimal" value="${d ? d.rate : ""}" placeholder="0"></label>
        <label>${esc(T("Pago mensual (mínimo o cuota)"))}<input type="number" id="dMin" min="0" step="0.01" inputmode="decimal" value="${d && d.minPayment ? d.minPayment : ""}" placeholder="0"></label>
        <label>${esc(T("Día del mes en que vence (opcional)"))}<input type="number" id="dDay" min="1" max="31" step="1" inputmode="numeric" value="${d && d.dueDay ? d.dueDay : ""}"></label>
        <p class="goal-err hidden" id="dErr" role="alert"></p>
        <div class="goal-form-actions"><button type="button" class="secondary" data-close>${esc(T("Cancelar"))}</button><button type="submit">${esc(T(d ? "Guardar cambios" : "Crear deuda"))}</button></div>
      </form>`);
    const f = $("debtForm");
    setTimeout(() => { const n = $("dName"); if (n) n.focus(); }, 60);
    f.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (busy) return;
      const nm = $("dName").value.trim(), st = Number($("dStart").value), rt = Number($("dRate").value || 0), mn = Number($("dMin").value || 0), dayRaw = $("dDay").value;
      const day = dayRaw === "" ? null : Number(dayRaw);
      const err = $("dErr");
      const bad = !nm ? "Escribe un nombre para la deuda." : !(st > 0) ? "Ingresa un monto mayor que cero." : !(rt >= 0 && rt <= 100) ? "La tasa debe estar entre 0 y 100." : !(mn >= 0) ? "El pago mensual no puede ser negativo." : (day != null && !(Number.isInteger(day) && day >= 1 && day <= 31)) ? "El día de vencimiento debe estar entre 1 y 31." : null;
      if (bad) { err.textContent = T(bad); err.classList.remove("hidden"); return; }
      const body = { name: nm, kind: $("dKind").value, start: st, rate: rt, minPayment: mn, dueDay: day };
      busy = true; f.querySelector('button[type="submit"]').disabled = true;
      try {
        if (d) await Data.updateDebt(d.id, body); else await Data.createDebt(body);
        MonetraPlan.close(); await load();
      } catch (e) { MonetraPlan.close(); fail(e); }
      finally { busy = false; }
    });
  }

  function payForm(d) {
    const bal = balance(d);
    MonetraPlan.show(`<h3>${esc(T("Registrar pago en"))} <span translate="no">${esc(d.name)}</span></h3>
      <form id="payForm" class="goal-form" novalidate>
        <p class="muted goal-hint">${esc(T("Saldo actual"))}: <b>${money(bal)}</b>${d.minPayment > 0 ? ` · ${esc(T("Pago mensual"))}: <b>${money(d.minPayment)}</b>` : ""}</p>
        <div class="seg" role="radiogroup" aria-label="${esc(T("Tipo"))}">
          <label class="seg-i"><input type="radio" name="pKind" value="pay" checked><span>${esc(T("Pago"))}</span></label>
          <label class="seg-i"><input type="radio" name="pKind" value="charge"><span>${esc(T("Nuevo cargo / intereses"))}</span></label>
        </div>
        <label>${esc(T("Monto"))}<input type="number" id="pAmount" min="0.01" step="0.01" inputmode="decimal" required value="${d.minPayment > 0 && d.minPayment <= bal ? d.minPayment : ""}"></label>
        <label>${esc(T("Fecha"))}<input type="date" id="pDate" value="${today()}"></label>
        <label>${esc(T("Nota (opcional)"))}<input type="text" id="pNote" maxlength="200"></label>
        <p class="goal-err hidden" id="pErr" role="alert"></p>
        <div class="goal-form-actions"><button type="button" class="secondary" data-close>${esc(T("Cancelar"))}</button><button type="submit">${esc(T("Guardar"))}</button></div>
      </form>`);
    const f = $("payForm");
    setTimeout(() => { const n = $("pAmount"); if (n) { n.focus(); n.select(); } }, 60);
    f.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (busy) return;
      const amt = Number($("pAmount").value), charge = (f.querySelector('input[name="pKind"]:checked') || {}).value === "charge";
      const err = $("pErr"); let bad = null;
      if (!(amt > 0)) bad = "Ingresa un monto mayor que cero.";
      else if (!charge && amt > bal + 0.001) bad = "El pago es mayor que el saldo de la deuda.";
      if (bad) { err.textContent = T(bad); err.classList.remove("hidden"); return; }
      busy = true; f.querySelector('button[type="submit"]').disabled = true;
      try {
        await Data.addDebtPayment(d.id, { amount: charge ? -amt : amt, note: $("pNote").value.trim(), date: $("pDate").value || today() });
        MonetraPlan.close(); await load();
        const nd = debts.find(x => x.id === d.id);
        if (nd && !charge && balance(nd) <= 0 && bal > 0) celebrate();
      } catch (e) { MonetraPlan.close(); fail(e); }
      finally { busy = false; }
    });
  }

  function celebrate() {
    const el = document.createElement("div");
    el.className = "goal-confetti"; el.setAttribute("aria-hidden", "true"); el.textContent = "🎉 🎊 ✨ 🎉";
    document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
  }

  function newDebt(tpl) { if (!canCreate()) { MonetraPlan.upsell("debts"); return; } debtForm(null, tpl); }

  document.addEventListener("click", async ev => {
    const t = ev.target; if (!t.closest) return;
    if (t.closest("#debtNewBtn")) { newDebt(null); return; }
    if (t.closest("#debtUnlock")) { MonetraPlan.upsell("debts"); return; }
    const tpl = t.closest("#debtsList [data-template]");
    if (tpl) { const [k, n] = tpl.dataset.template.split("|"); newDebt([k, n]); return; }
    if (t.closest("#debtArchToggle")) { showArchived = !showArchived; render(); return; }
    const root = t.closest("#debtsSection"); if (!root) return;
    const find = id => debts.find(d => d.id === id);
    let b;
    if ((b = t.closest("[data-pay]"))) { const d = find(b.dataset.pay); if (d) payForm(d); return; }
    if ((b = t.closest("[data-edit]"))) { const d = find(b.dataset.edit); if (d) debtForm(d); return; }
    if ((b = t.closest("[data-archive]"))) { const d = find(b.dataset.archive); if (!d) return; try { await Data.updateDebt(d.id, { archived: !d.archived }); await load(); } catch (e) { fail(e); } return; }
    if ((b = t.closest("[data-remove]"))) {
      const d = find(b.dataset.remove); if (!d) return;
      if (!confirm(T("¿Eliminar esta deuda y todos sus pagos? Esta acción no se puede deshacer."))) return;
      try { await Data.deleteDebt(d.id); await load(); } catch (e) { fail(e); } return;
    }
    if ((b = t.closest("[data-del-pay]"))) {
      if (!confirm(T("¿Eliminar este pago?"))) return;
      try { await Data.deleteDebtPayment(b.dataset.delPay); await load(); } catch (e) { fail(e); }
    }
  });
  document.addEventListener("input", e => {
    if (e.target && e.target.id === "debtExtra") {
      extra = Math.max(0, Number(e.target.value) || 0);
      const live = debts.filter(d => !d.archived);
      const tmp = document.createElement("div"); tmp.innerHTML = strategyCard(live);
      const r = tmp.querySelector("#debtRes"); if (r && $("debtRes")) $("debtRes").innerHTML = r.innerHTML;
    }
  });
  document.addEventListener("change", e => {
    if (e.target && e.target.name === "dStrat") { strategy = e.target.value; render(); }
    if (e.target && e.target.id === "scopeSelect") { loaded = false; render(); load(); }
  });
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest('.nav-btn[data-section="debtsSection"]')) load(); });
  document.addEventListener("monetra:ready", load);
  document.addEventListener("monetra:lang", render);
  window.MonetraDebts = { reload: load };
})();
