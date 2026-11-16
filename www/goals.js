/* Monetra - Metas de ahorro: tarjetas con progreso, plan mensual sugerido, aportes e hogar compartido. */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const T = s => (window.T ? window.T(s) : s);
  const LOCALES = { es: "es-CA", en: "en-CA", fr: "fr-CA" };
  const money = v => (typeof formatCurrency === "function" ? formatCurrency(v) : "$" + Number(v).toFixed(2));
  const FREE_LIMIT = 2;

  let goals = [];
  let loaded = false;
  let showArchived = false;
  let busy = false;

  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const parse = s => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtDate = s => parse(s).toLocaleDateString(LOCALES[(window.I18n && I18n.lang) || "es"] || "es-CA", { year: "numeric", month: "short", day: "numeric" });
  const isPro = () => !window.MonetraPlan || MonetraPlan.isPro();

  const TEMPLATES = [
    ["home", "Casa"], ["car", "Carro"], ["plane", "Viaje"], ["shield", "Fondo de emergencia"],
    ["school", "Educación"], ["ring", "Boda"], ["laptop", "Computadora"], ["business", "Negocio"]
  ];

  const saved = g => g.contributions.reduce((s, c) => s + c.amount, 0);

  // Cálculo de estado y plan mensual de una meta
  function info(g) {
    const s = saved(g), left = Math.max(0, g.target - s);
    const pct = Math.max(0, Math.min(100, g.target > 0 ? (s / g.target) * 100 : 0));
    const out = { saved: s, left, pct, done: s >= g.target, status: "none", monthly: null, months: null };
    if (out.done) { out.status = "done"; return out; }
    const now = parse(today());
    if (g.targetDate) {
      const end = parse(g.targetDate);
      if (end <= now) { out.status = "late"; return out; }
      const monthsLeft = Math.max(1, Math.ceil((end - now) / (86400000 * 30.4375)));
      out.months = monthsLeft;
      out.monthly = left / monthsLeft;
      const start = parse(String(g.createdAt || today()).slice(0, 10));
      const total = Math.max(1, end - start), elapsed = Math.min(total, Math.max(0, now - start));
      const expected = g.target * (elapsed / total);
      out.status = s + 0.01 >= expected * 0.95 ? "ok" : "behind";
    } else {
      // Sin fecha: estima los meses según el promedio de aportes de los últimos 3 meses
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const recent = g.contributions.filter(c => parse(c.date) >= from).reduce((a, c) => a + c.amount, 0);
      const avg = recent / 3;
      if (avg > 0) out.months = Math.ceil(left / avg);
      out.status = "nodate";
    }
    return out;
  }

  const STATUS = {
    done:   ["goal-chip done",   "¡Meta cumplida!"],
    ok:     ["goal-chip ok",     "Vas al día"],
    behind: ["goal-chip behind", "Vas atrasado"],
    late:   ["goal-chip late",   "Fecha vencida"],
    nodate: ["goal-chip nodate", "Sin fecha"]
  };

  function card(g) {
    const i = info(g);
    const st = STATUS[i.status];
    let plan = "";
    if (i.status === "done") plan = `<p class="goal-plan">🎉 ${esc(T("Lo lograste. ¡Felicitaciones!"))}</p>`;
    else if (i.status === "late") plan = `<p class="goal-plan">${esc(T("Te faltan"))} <b>${money(i.left)}</b>. ${esc(T("Edita la fecha para recalcular tu plan."))}</p>`;
    else if (i.monthly != null) plan = `<p class="goal-plan">${esc(T("Ahorra"))} <b>${money(i.monthly)}</b> ${esc(T("al mes para llegar a tiempo"))} (${i.months} ${esc(T(i.months === 1 ? "mes" : "meses"))}).</p>`;
    else if (i.months != null) plan = `<p class="goal-plan">${esc(T("A tu ritmo actual llegas en"))} <b>${i.months}</b> ${esc(T(i.months === 1 ? "mes" : "meses"))}.</p>`;
    else plan = `<p class="goal-plan">${esc(T("Agrega una fecha o un aporte para ver tu plan."))}</p>`;

    const hist = g.contributions.length
      ? `<details class="goal-hist"><summary>${esc(T("Historial"))} (${g.contributions.length})</summary><ul>${g.contributions.map(c =>
          `<li><span>${esc(fmtDate(c.date))}${c.note ? " · " + esc(c.note) : ""}${g.shared ? " · " + esc(T(c.mine ? "Tú" : "Otro miembro")) : ""}</span>` +
          `<b class="${c.amount < 0 ? "neg" : ""}">${c.amount < 0 ? "−" : "+"}${money(Math.abs(c.amount))}</b>` +
          (c.mine ? `<button type="button" class="gc-del" data-del-contrib="${esc(c.id)}" aria-label="${esc(T("Eliminar aporte"))}">✕</button>` : "") + `</li>`).join("")}</ul></details>`
      : "";
    const ico = window.MonetraIcons ? MonetraIcons.goal(g.icon) : "🎯";
    const dateTxt = g.targetDate ? `<span class="goal-date">📅 ${esc(fmtDate(g.targetDate))}</span>` : "";
    return `<article class="goal-card${g.archived ? " is-archived" : ""}" data-goal="${esc(g.id)}">
      <header class="goal-top">
        <span class="goal-ico" aria-hidden="true">${ico}</span>
        <div class="goal-title"><h4 translate="no">${esc(g.name)}</h4><div class="goal-meta">${dateTxt}${g.shared ? `<span class="goal-shared">👥 ${esc(T("Compartida"))}</span>` : ""}</div></div>
        <span class="${st[0]}">${esc(T(st[1]))}</span>
      </header>
      <div class="goal-amounts"><b>${money(i.saved)}</b><span>${esc(T("de"))} ${money(g.target)}</span><em>${Math.round(i.pct)}%</em></div>
      <div class="goal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(i.pct)}" aria-label="${esc(g.name)}"><i style="width:${i.pct.toFixed(1)}%"></i></div>
      ${plan}
      <div class="goal-actions">
        ${g.archived ? "" : `<button type="button" class="goal-add" data-add="${esc(g.id)}">+ ${esc(T("Aportar"))}</button>`}
        <button type="button" class="secondary" data-edit="${esc(g.id)}">${esc(T("Editar"))}</button>
        <button type="button" class="secondary" data-archive="${esc(g.id)}">${esc(T(g.archived ? "Reactivar" : "Archivar"))}</button>
        <button type="button" class="secondary danger" data-remove="${esc(g.id)}">${esc(T("Eliminar"))}</button>
      </div>
      ${hist}
    </article>`;
  }

  function summary(active) {
    if (!active.length) return "";
    const tot = active.reduce((a, g) => a + saved(g), 0), target = active.reduce((a, g) => a + g.target, 0);
    const mFrom = today().slice(0, 7);
    const month = active.reduce((a, g) => a + g.contributions.filter(c => c.date.slice(0, 7) === mFrom).reduce((x, c) => x + c.amount, 0), 0);
    const pct = target > 0 ? Math.round(Math.min(100, tot / target * 100)) : 0;
    const tile = (k, v) => `<div class="gs-tile"><span>${esc(T(k))}</span><b>${v}</b></div>`;
    return tile("Ahorrado en metas", money(tot)) + tile("Objetivo total", money(target)) + tile("Avance general", pct + "%") + tile("Aportado este mes", money(month));
  }

  function render() {
    const list = $("goalsList"), sum = $("goalsSummary");
    if (!list) return;
    const active = goals.filter(g => !g.archived), arch = goals.filter(g => g.archived);
    sum.innerHTML = summary(active);
    let html = "";
    if (!loaded) html = `<p class="muted">${esc(T("Cargando…"))}</p>`;
    else if (!active.length) {
      html = `<div class="goals-empty card"><div class="ge-ico">🎯</div><h3>${esc(T("Crea tu primera meta de ahorro"))}</h3>
        <p class="muted">${esc(T("Elige para qué quieres ahorrar y Monetra te dice cuánto separar cada mes."))}</p>
        <div class="goal-templates">${TEMPLATES.map(t => `<button type="button" class="secondary" data-template="${t[0]}|${esc(t[1])}"><span aria-hidden="true">${MonetraIcons.goal(t[0])}</span> ${esc(T(t[1]))}</button>`).join("")}</div></div>`;
    } else html = active.map(card).join("");
    if (arch.length) {
      html += `<div class="goals-arch-toggle"><button type="button" class="secondary" id="goalArchToggle">${esc(T(showArchived ? "Ocultar archivadas" : "Ver archivadas"))} (${arch.length})</button></div>`;
      if (showArchived) html += arch.map(card).join("");
    }
    list.innerHTML = html;
    const btn = $("goalNewBtn");
    if (btn) btn.disabled = !loaded;
  }

  async function load() {
    try {
      goals = await Data.getGoals();
    } catch (e) {
      goals = [];
      $("goalsList").innerHTML = `<div class="card"><p class="muted">${esc(e.message || String(e))}</p></div>`;
      loaded = false;
      return;
    }
    loaded = true;
    render();
  }

  function canCreate() {
    if (isPro()) return true;
    if (Data.getScope && Data.getScope() !== "personal") return true;
    return goals.filter(g => !g.archived && !g.shared).length < FREE_LIMIT;
  }

  function fail(e) {
    if (e && e.code === "limit_goals") { MonetraPlan.upsell("goals"); return; }
    alert(T("No se pudo guardar:") + " " + ((e && e.message) || String(e)));
  }

  // ---------- Ventanas ----------
  function goalForm(g, tpl) {
    const icon = (g && g.icon) || (tpl && tpl[0]) || "target";
    const name = (g && g.name) || (tpl && T(tpl[1])) || "";
    const icons = Object.keys(MonetraIcons.GOAL_ICONS).map(k =>
      `<label class="gi"><input type="radio" name="gIcon" value="${k}"${k === icon ? " checked" : ""}><span aria-hidden="true">${MonetraIcons.goal(k)}</span><i class="sr-only">${esc(k)}</i></label>`).join("");
    MonetraPlan.show(`<h3>${esc(T(g ? "Editar meta" : "Nueva meta de ahorro"))}</h3>
      <form id="goalForm" class="goal-form" novalidate>
        <label>${esc(T("Nombre"))}<input type="text" id="gName" maxlength="60" required value="${esc(name)}" placeholder="${esc(T("Ej.: Casa, Viaje a Perú"))}"></label>
        <fieldset class="gi-grid"><legend>${esc(T("Ícono"))}</legend>${icons}</fieldset>
        <label>${esc(T("Monto objetivo"))}<input type="number" id="gTarget" min="1" step="0.01" inputmode="decimal" required value="${g ? g.target : ""}"></label>
        <label>${esc(T("Fecha objetivo (opcional)"))}<input type="date" id="gDate" value="${g && g.targetDate ? esc(g.targetDate) : ""}"></label>
        <p class="goal-err hidden" id="gErr" role="alert"></p>
        <div class="goal-form-actions"><button type="button" class="secondary" data-close>${esc(T("Cancelar"))}</button><button type="submit">${esc(T(g ? "Guardar cambios" : "Crear meta"))}</button></div>
      </form>`);
    const f = $("goalForm");
    setTimeout(() => { const n = $("gName"); if (n) n.focus(); }, 60);
    f.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (busy) return;
      const nm = $("gName").value.trim(), tg = Number($("gTarget").value), dt = $("gDate").value || null;
      const err = $("gErr");
      const bad = !nm ? "Escribe un nombre para la meta." : !(tg > 0) ? "Ingresa un monto objetivo mayor que cero." : null;
      if (bad) { err.textContent = T(bad); err.classList.remove("hidden"); return; }
      const ic = (f.querySelector('input[name="gIcon"]:checked') || {}).value || "target";
      busy = true; f.querySelector('button[type="submit"]').disabled = true;
      try {
        if (g) await Data.updateGoal(g.id, { name: nm, icon: ic, target: tg, targetDate: dt });
        else await Data.createGoal({ name: nm, icon: ic, target: tg, targetDate: dt });
        MonetraPlan.close();
        await load();
      } catch (e) { MonetraPlan.close(); fail(e); }
      finally { busy = false; }
    });
  }

  function contribForm(g) {
    const i = info(g);
    const hint = i.monthly != null ? `<p class="muted goal-hint">${esc(T("Sugerido este mes"))}: <b>${money(i.monthly)}</b></p>` : "";
    MonetraPlan.show(`<h3>${esc(T("Aportar a"))} ${esc(g.name)}</h3>
      <form id="contribForm" class="goal-form" novalidate>
        ${hint}
        <div class="seg" role="radiogroup" aria-label="${esc(T("Tipo"))}">
          <label class="seg-i"><input type="radio" name="cKind" value="in" checked><span>${esc(T("Aporte"))}</span></label>
          <label class="seg-i"><input type="radio" name="cKind" value="out"><span>${esc(T("Retiro"))}</span></label>
        </div>
        <label>${esc(T("Monto"))}<input type="number" id="cAmount" min="0.01" step="0.01" inputmode="decimal" required></label>
        <label>${esc(T("Fecha"))}<input type="date" id="cDate" value="${today()}"></label>
        <label>${esc(T("Nota (opcional)"))}<input type="text" id="cNote" maxlength="200"></label>
        <p class="goal-err hidden" id="cErr" role="alert"></p>
        <div class="goal-form-actions"><button type="button" class="secondary" data-close>${esc(T("Cancelar"))}</button><button type="submit">${esc(T("Guardar"))}</button></div>
      </form>`);
    const f = $("contribForm");
    setTimeout(() => { const n = $("cAmount"); if (n) n.focus(); }, 60);
    f.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (busy) return;
      const amt = Number($("cAmount").value), out = (f.querySelector('input[name="cKind"]:checked') || {}).value === "out";
      const err = $("cErr");
      let bad = null;
      if (!(amt > 0)) bad = "Ingresa un monto mayor que cero.";
      else if (out && amt > info(g).saved + 0.001) bad = "No puedes retirar más de lo que has ahorrado en esta meta.";
      if (bad) { err.textContent = T(bad); err.classList.remove("hidden"); return; }
      busy = true; f.querySelector('button[type="submit"]').disabled = true;
      try {
        await Data.addGoalContribution(g.id, { amount: out ? -amt : amt, note: $("cNote").value.trim(), date: $("cDate").value || today() });
        MonetraPlan.close();
        await load();
        const ng = goals.find(x => x.id === g.id);
        if (ng && !out && info(ng).done && !info(g).done) celebrate();
      } catch (e) { MonetraPlan.close(); fail(e); }
      finally { busy = false; }
    });
  }

  function celebrate() {
    const el = document.createElement("div");
    el.className = "goal-confetti";
    el.setAttribute("aria-hidden", "true");
    el.textContent = "🎉 🎊 ✨ 🎉";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // ---------- Eventos ----------
  function newGoal(tpl) {
    if (!canCreate()) { MonetraPlan.upsell("goals"); return; }
    goalForm(null, tpl);
  }

  document.addEventListener("click", async ev => {
    const t = ev.target;
    if (!t.closest) return;
    if (t.closest("#goalNewBtn")) { newGoal(null); return; }
    const tpl = t.closest("[data-template]");
    if (tpl) { const [k, n] = tpl.dataset.template.split("|"); newGoal([k, n]); return; }
    if (t.closest("#goalArchToggle")) { showArchived = !showArchived; render(); return; }
    const find = id => goals.find(g => g.id === id);
    let b;
    if ((b = t.closest("[data-add]"))) { const g = find(b.dataset.add); if (g) contribForm(g); return; }
    if ((b = t.closest("[data-edit]"))) { const g = find(b.dataset.edit); if (g) goalForm(g); return; }
    if ((b = t.closest("[data-archive]"))) {
      const g = find(b.dataset.archive); if (!g) return;
      try { await Data.updateGoal(g.id, { archived: !g.archived }); await load(); } catch (e) { fail(e); }
      return;
    }
    if ((b = t.closest("[data-remove]"))) {
      const g = find(b.dataset.remove); if (!g) return;
      if (!confirm(T("¿Eliminar esta meta y todos sus aportes? Esta acción no se puede deshacer."))) return;
      try { await Data.deleteGoal(g.id); await load(); } catch (e) { fail(e); }
      return;
    }
    if ((b = t.closest("[data-del-contrib]"))) {
      if (!confirm(T("¿Eliminar este aporte?"))) return;
      try { await Data.deleteGoalContribution(b.dataset.delContrib); await load(); } catch (e) { fail(e); }
    }
  });

  document.addEventListener("click", e => { if (e.target.closest && e.target.closest('.nav-btn[data-section="goalsSection"]')) load(); });
  document.addEventListener("monetra:ready", load);
  document.addEventListener("change", e => { if (e.target && e.target.id === "scopeSelect") { loaded = false; render(); load(); } });
  document.addEventListener("monetra:lang", render);
  window.MonetraGoals = { reload: load };
})();
