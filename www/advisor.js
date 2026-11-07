/* Monetra - Asesor financiero: diagnóstico instantáneo (reglas) + análisis con IA (función ai-advisor). */
(function () {
  const $ = id => document.getElementById(id);
  const L = () => (window.I18n && I18n.lang) || "es";
  const S = {
    es: { score: "Salud financiera", good: "Muy buena", ok: "Mejorable", bad: "Atención", income: "Ingresos", expenses: "Gastos", savingsRate: "Tasa de ahorro", fixedRatio: "Gastos fijos / ingresos",
      noData: "Aún no hay datos suficientes en este mes. Registra tus ingresos y gastos para recibir un diagnóstico.",
      needs: "Necesidades (gastos fijos)", wants: "Gustos (gastos variables)", save: "Ahorro e inversión", now: "Ahora", target: "Meta", invest: "Para invertir (aprox.)", emergency: "Fondo de emergencia sugerido (3 meses de gastos)",
      tipNeg: "Gastas más de lo que ganas este mes. Prioridad uno: recorta gastos variables hasta cerrar la brecha.",
      tipSave: p => "Tu ahorro es " + p + "% de tus ingresos. La meta saludable es 20% o más.",
      tipFixed: p => "Tus gastos fijos son " + p + "% de tus ingresos (ideal: 50% o menos). Revisa suscripciones, seguros y contratos.",
      tipTop: (c, p) => "Tu mayor gasto es «" + c + "» (" + p + "% de los gastos). Es el mejor lugar para buscar un recorte.",
      tipUp: (p) => "Tus gastos subieron " + p + "% frente al mes anterior. Identifica qué categoría los empujó.",
      tipGood: "Vas muy bien: mantén el hábito y destina el excedente a tu fondo de emergencia y a inversión.",
      tipInvest: p => "Si ya tienes fondo de emergencia, podrías invertir cerca de " + p + "% de tus ingresos de forma regular.",
      running: "Consultando al experto IA...", done: "Análisis listo.", btnBusy: "Analizando..." },
    en: { score: "Financial health", good: "Very good", ok: "Could improve", bad: "Needs attention", income: "Income", expenses: "Expenses", savingsRate: "Savings rate", fixedRatio: "Fixed expenses / income",
      noData: "Not enough data this month yet. Record your income and expenses to get a diagnosis.",
      needs: "Needs (fixed expenses)", wants: "Wants (variable expenses)", save: "Savings & investing", now: "Now", target: "Target", invest: "To invest (approx.)", emergency: "Suggested emergency fund (3 months of expenses)",
      tipNeg: "You spend more than you earn this month. Priority one: cut variable spending until the gap closes.",
      tipSave: p => "Your savings are " + p + "% of income. A healthy target is 20% or more.",
      tipFixed: p => "Fixed expenses are " + p + "% of income (ideal: 50% or less). Review subscriptions, insurance and contracts.",
      tipTop: (c, p) => "Your biggest expense is \"" + c + "\" (" + p + "% of spending). It is the best place to look for savings.",
      tipUp: p => "Spending rose " + p + "% versus last month. Find which category drove it.",
      tipGood: "You are doing great: keep the habit and send the surplus to your emergency fund and investments.",
      tipInvest: p => "If you already have an emergency fund, you could invest about " + p + "% of income regularly.",
      running: "Asking the AI expert...", done: "Analysis ready.", btnBusy: "Analyzing..." },
    fr: { score: "Santé financière", good: "Très bonne", ok: "À améliorer", bad: "Attention", income: "Revenus", expenses: "Dépenses", savingsRate: "Taux d'épargne", fixedRatio: "Dépenses fixes / revenus",
      noData: "Pas encore assez de données ce mois-ci. Enregistrez vos revenus et dépenses pour obtenir un diagnostic.",
      needs: "Besoins (dépenses fixes)", wants: "Envies (dépenses variables)", save: "Épargne et investissement", now: "Actuel", target: "Objectif", invest: "À investir (approx.)", emergency: "Fonds d'urgence suggéré (3 mois de dépenses)",
      tipNeg: "Vous dépensez plus que vous ne gagnez ce mois-ci. Priorité : réduire les dépenses variables jusqu'à combler l'écart.",
      tipSave: p => "Votre épargne est de " + p + " % des revenus. Un objectif sain est de 20 % ou plus.",
      tipFixed: p => "Les dépenses fixes représentent " + p + " % des revenus (idéal : 50 % ou moins). Passez en revue abonnements, assurances et contrats.",
      tipTop: (c, p) => "Votre plus grosse dépense est « " + c + " » (" + p + " % des dépenses). C'est le meilleur endroit pour économiser.",
      tipUp: p => "Les dépenses ont augmenté de " + p + " % par rapport au mois dernier. Repérez la catégorie responsable.",
      tipGood: "Très bien : gardez cette habitude et dirigez l'excédent vers votre fonds d'urgence et vos placements.",
      tipInvest: p => "Si vous avez déjà un fonds d'urgence, vous pourriez investir environ " + p + " % de vos revenus régulièrement.",
      running: "Consultation de l'expert IA...", done: "Analyse prête.", btnBusy: "Analyse..." }
  };
  const t = () => S[L()] || S.es;
  const money = v => (typeof formatCurrency === "function" ? formatCurrency(v) : "$" + (v || 0).toFixed(2));
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function selected() {
    const y = Number(($("yearFilter") || {}).value) || new Date().getFullYear();
    const m = $("monthFilter") && $("monthFilter").value !== "" ? Number($("monthFilter").value) : new Date().getMonth();
    return { y, m };
  }
  function prevOf(y, m) { return m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }; }

  function collect(n) {
    const { y, m } = selected();
    const out = [];
    let cur = { y, m };
    for (let i = 0; i < n; i++) {
      const items = getTransactionsForMonth(cur.y, cur.m);
      const tot = calculateTotals(items);
      out.push({ y: cur.y, m: cur.m, items, tot });
      cur = prevOf(cur.y, cur.m);
    }
    return out; // [mes actual, anterior, ...]
  }

  function byCategory(items) {
    const map = {};
    items.filter(i => i.type === "fixed" || i.type === "variable").forEach(i => {
      const name = getCategoryName(i.categoryId) || "—";
      map[name] = (map[name] || 0) + i.amount;
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }

  function diagnose() {
    const months = collect(6);
    const cur = months[0], prev = months[1];
    const inc = cur.tot.income, exp = cur.tot.expenses;
    const d = { inc, exp, fixed: cur.tot.fixed, variable: cur.tot.variable, sav: inc - exp, months };
    d.rate = pct(d.sav, inc);
    d.fixedRatio = pct(d.fixed, inc);
    d.cats = byCategory(cur.items);
    d.prevExp = prev.tot.expenses;
    d.hasData = inc > 0 || exp > 0;
    let score = 50;
    if (inc > 0) {
      score += Math.max(-30, Math.min(30, (d.rate - 10) * 1.5));
      score += d.fixedRatio <= 50 ? 12 : d.fixedRatio <= 65 ? 0 : -12;
      if (d.prevExp > 0 && exp > d.prevExp * 1.15) score -= 8;
    } else score = exp > 0 ? 15 : 0;
    d.score = Math.max(0, Math.min(100, Math.round(score)));
    return d;
  }

  function tips(d) {
    const x = t(), out = [];
    if (d.inc > 0 && d.sav < 0) out.push(["bad", x.tipNeg]);
    if (d.inc > 0 && d.rate >= 0 && d.rate < 20) out.push(["warn", x.tipSave(d.rate)]);
    if (d.inc > 0 && d.fixedRatio > 50) out.push(["warn", x.tipFixed(d.fixedRatio)]);
    if (d.cats[0] && d.exp > 0) out.push(["info", x.tipTop(d.cats[0].name, pct(d.cats[0].amount, d.exp))]);
    if (d.prevExp > 0 && d.exp > d.prevExp * 1.1) out.push(["warn", x.tipUp(Math.round(pct(d.exp - d.prevExp, d.prevExp)))]);
    if (d.rate >= 20) { out.push(["good", x.tipGood]); out.push(["good", x.tipInvest(Math.min(15, Math.max(5, Math.round(d.rate / 2))))]); }
    return out;
  }

  function render() {
    if (!$("advScore") || typeof getTransactionsForMonth !== "function") return;
    const x = t(), d = diagnose();
    if (!d.hasData) {
      $("advScore").innerHTML = ""; $("advKpis").innerHTML = ""; $("advPlan").innerHTML = "";
      $("advTips").innerHTML = "<li class='info'>" + esc(x.noData) + "</li>";
      return;
    }
    const cls = d.score >= 70 ? "score-good" : d.score >= 45 ? "score-warning" : "score-danger";
    const label = d.score >= 70 ? x.good : d.score >= 45 ? x.ok : x.bad;
    $("advScore").innerHTML = "<div class='adv-ring " + cls + "'><b>" + d.score + "</b><span>/100</span></div><div><div class='adv-title'>" + esc(x.score) + "</div><div class='" + cls + "'>" + esc(label) + "</div></div>";
    $("advKpis").innerHTML = [[x.income, money(d.inc)], [x.expenses, money(d.exp)], [x.savingsRate, d.rate + "%"], [x.fixedRatio, d.fixedRatio + "%"]]
      .map(k => "<div class='adv-kpi'><small>" + esc(k[0]) + "</small><b>" + esc(k[1]) + "</b></div>").join("");
    $("advTips").innerHTML = tips(d).map(tp => "<li class='" + tp[0] + "'>" + esc(tp[1]) + "</li>").join("");
    const rows = [
      [x.needs, pct(d.fixed, d.inc), 50, "var(--rose)"],
      [x.wants, pct(d.variable, d.inc), 30, "var(--coral)"],
      [x.save, Math.max(0, d.rate), 20, "var(--sun)"]
    ];
    const invest = Math.round(Math.max(0, d.sav) > 0 ? Math.min(d.sav, d.inc * 0.15) : 0);
    $("advPlan").innerHTML = rows.map(r => "<div class='adv-row'><div class='adv-row-h'><span>" + esc(r[0]) + "</span><span>" + esc(x.now) + " <b>" + r[1] + "%</b> · " + esc(x.target) + " " + r[2] + "%</span></div><div class='adv-bar'><i style='width:" + Math.min(100, r[1]) + "%;background:" + r[3] + "'></i><u style='left:" + r[2] + "%'></u></div></div>").join("") +
      "<div class='adv-kpis'><div class='adv-kpi'><small>" + esc(x.invest) + "</small><b>" + money(invest) + "</b></div><div class='adv-kpi'><small>" + esc(x.emergency) + "</small><b>" + money(d.exp * 3) + "</b></div></div>";
  }

  function fmtAI(text) {
    const lines = esc(text).split(/\r?\n/);
    let html = "", open = false;
    lines.forEach(l => {
      const b = l.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      if (/^\s*[-•*]\s+/.test(l)) { if (!open) { html += "<ul>"; open = true; } html += "<li>" + b.replace(/^\s*[-•*]\s+/, "") + "</li>"; }
      else { if (open) { html += "</ul>"; open = false; } if (/^#{1,4}\s/.test(l)) html += "<h4>" + b.replace(/^#{1,4}\s+/, "") + "</h4>"; else if (l.trim()) html += "<p>" + b + "</p>"; }
    });
    if (open) html += "</ul>";
    return html;
  }

  async function askAI() {
    const x = t(), btn = $("aiRunBtn"), msg = $("aiMsg");
    const d = diagnose();
    if (!d.hasData) { msg.textContent = x.noData; msg.classList.add("bad"); return; }
    msg.classList.remove("bad"); msg.textContent = x.running; btn.disabled = true;
    const original = btn.textContent; btn.textContent = x.btnBusy;
    try {
      const payload = {
        lang: L(),
        currency: "CAD",
        month: selected().y + "-" + String(selected().m + 1).padStart(2, "0"),
        months: d.months.map(mm => ({ month: mm.y + "-" + String(mm.m + 1).padStart(2, "0"), income: Math.round(mm.tot.income), fixed: Math.round(mm.tot.fixed), variable: Math.round(mm.tot.variable) })),
        categories: d.cats.slice(0, 12).map(c => ({ name: c.name, amount: Math.round(c.amount) })),
        recurring: (d.months[0].items || []).filter(i => i.type === "fixed").map(i => ({ name: i.description || getCategoryName(i.categoryId), amount: i.amount })).slice(0, 20)
      };
      const res = await Data.askAdvisor(payload);
      $("aiResult").innerHTML = fmtAI(res.text || "");
      $("aiResultCard").classList.remove("hidden");
      msg.textContent = x.done;
      if (window.MonetraTrack) MonetraTrack.event("ai_advice");
    } catch (e) {
      msg.textContent = e.message || String(e); msg.classList.add("bad");
    } finally { btn.disabled = false; btn.textContent = original; }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if ($("aiRunBtn")) $("aiRunBtn").addEventListener("click", askAI);
    if ($("aiRefreshBtn")) $("aiRefreshBtn").addEventListener("click", render);
    ["monthFilter", "yearFilter"].forEach(id => $(id) && $(id).addEventListener("change", () => setTimeout(render, 50)));
    document.querySelectorAll('[data-section="advisorSection"]').forEach(b => b.addEventListener("click", () => setTimeout(render, 150)));
  });
  document.addEventListener("monetra:ready", render);
  document.addEventListener("monetra:logout", () => { if ($("aiResultCard")) $("aiResultCard").classList.add("hidden"); });
  window.MonetraAdvisor = { render, diagnose, collect, fmtAI };
})();
