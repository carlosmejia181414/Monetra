/* Monetra - panel de administrador (solo para usuarios listados en la tabla "admins"). */
(function () {
  const $ = id => document.getElementById(id);
  const charts = {};
  const PAL = ["#ff7a5c", "#ffcf4a", "#e8456b", "#4cd4a0", "#d9b8ff", "#8f7bd6"];
  const PAL_DARK = PAL.slice(), PAL_LIGHT = ["#6c1f7c", "#e0a21b", "#1f9d57", "#17408f", "#d92d4f", "#8f3da3"];
  function syncPal() { PAL.splice(0, PAL.length, ...((window.MonetraTheme && MonetraTheme.get() === "light") ? PAL_LIGHT : PAL_DARK)); }
  const EVN = { page_view: "Páginas vistas", click_signup: "Clic en Crear cuenta", click_login: "Clic en Entrar", app_open: "Entradas a la app", download_brochure: "Descarga brochure", download_manual: "Descarga manual", ai_advice: "Consultas al Asesor IA", export_data: "Exportar datos", import_data: "Importar datos", theme_toggle: "Cambio de tema",
    tab_transactions: "Pestaña Registrar", tab_categories: "Pestaña Categorías", tab_charts: "Pestaña Gráficos", tab_analytics: "Pestaña Analytics", tab_advisor: "Pestaña Asesor IA", tab_household: "Pestaña Hogar", tab_profile: "Pestaña Perfil" };
  const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const nf = n => new Intl.NumberFormat("es").format(Number(n) || 0);
  const esc = s => String(s == null ? "" : s).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const tz = (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || "UTC";
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
  let S = null, usersPage = 0, usersSearch = "";
  const PER = 25;

  function state(html) { $("state").classList.remove("hidden"); $("panel").classList.add("hidden"); $("state").innerHTML = html; }
  function draw(id, cfg) {
    syncPal();
    if (charts[id]) charts[id].destroy();
    if (window.MonetraTheme) MonetraTheme.applyChart();
    charts[id] = new Chart($(id), cfg);
  }
  function donut(id, rows, key) {
    draw(id, { type: "doughnut", data: { labels: rows.map(r => r[key] || "—"), datasets: [{ data: rows.map(r => Number(r.n)), backgroundColor: rows.map((_, i) => PAL[i % PAL.length]) }] }, options: { maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" } } } });
  }
  function hbar(id, rows, color) {
    draw(id, { type: "bar", data: { labels: rows.map(r => r.name), datasets: [{ data: rows.map(r => r.n), backgroundColor: color || PAL[0], borderRadius: 6 }] }, options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });
  }
  function kpi(label, cur, prev, fmt) {
    fmt = fmt || nf;
    let d = "";
    if (prev !== undefined && prev !== null) {
      if (prev === 0 && cur === 0) d = "<i class='flat'>= sin cambios</i>";
      else if (prev === 0) d = "<i class='up'>▲ nuevo</i>";
      else { const ch = Math.round(((cur - prev) / prev) * 100); d = ch === 0 ? "<i class='flat'>= igual que antes</i>" : "<i class='" + (ch > 0 ? "up'>▲ +" : "down'>▼ ") + ch + "%</i>"; }
    }
    return "<div class='kpi'><small>" + esc(label) + "</small><b>" + fmt(cur) + "</b>" + d + "</div>";
  }

  function alerts(s) {
    const out = [], c = s.cur, p = s.prev, d = s.daily;
    if (d.length >= 8) {
      const last = Number(d[d.length - 1].visits), base = d.slice(-8, -1).reduce((a, x) => a + Number(x.visits), 0) / 7;
      if (last >= 10 && last > base * 2) out.push(["warn", "Pico de tráfico: hoy " + nf(last) + " visitas a la portada (promedio previo " + nf(Math.round(base)) + ")."]);
    }
    if (p.signups >= 5 && c.signups < p.signups * 0.5) out.push(["bad", "Los registros cayeron más de 50% frente al periodo anterior (" + nf(p.signups) + " → " + nf(c.signups) + ")."]);
    if (p.visitors >= 20 && c.visitors < p.visitors * 0.5) out.push(["bad", "Los visitantes cayeron más de 50% frente al periodo anterior."]);
    if (s.funnel.signup_click >= 10 && s.funnel.accounts < s.funnel.signup_click * 0.2) out.push(["warn", "Pocos clics en \"Crear cuenta\" terminan en una cuenta creada (" + pct(s.funnel.accounts, s.funnel.signup_click) + "%). Revisa el registro y el login con Google."]);
    if (s.inactive_new >= 3) out.push(["warn", nf(s.inactive_new) + " usuarios nuevos (últimos 14 días) todavía no registran ningún movimiento."]);
    $("alerts").innerHTML = out.length ? out.map(a => "<div class='alert " + (a[0] === "bad" ? "bad" : "") + "'>" + esc(a[1]) + "</div>").join("") : "<div class='alert ok'>Sin alertas: todo se ve normal en este periodo.</div>";
  }

  function renderResumen(s) {
    syncPal();
    const c = s.cur, p = s.prev;
    $("kpis").innerHTML = [kpi("Visitantes únicos", c.visitors, p.visitors), kpi("Visitas a la portada", c.visits, p.visits), kpi("Registros nuevos", c.signups, p.signups), kpi("Clics en Crear cuenta", c.signup_clicks, p.signup_clicks),
      kpi("Entradas a la app", c.app_opens, p.app_opens), kpi("Usuarios activos", c.active_users, p.active_users), kpi("Movimientos creados", c.transactions, p.transactions), kpi("Descargas de PDF", c.downloads, p.downloads), kpi("Consultas IA", c.ai_queries, p.ai_queries)].join("");
    const labels = s.daily.map(d => d.day.slice(5));
    const line = (label, key, color, fill) => ({ label, data: s.daily.map(d => Number(d[key])), borderColor: color, backgroundColor: color + "33", tension: .35, fill: !!fill, pointRadius: 2 });
    draw("cDaily", { type: "line", data: { labels, datasets: [line("Visitas", "visits", PAL[0], true), line("Visitantes", "visitors", PAL[1]), line("Registros", "signups", PAL[2]), line("Usuarios activos", "active", PAL[3])] }, options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    const f = s.funnel;
    const steps = [["Visitantes", f.visitors], ["Clic en Crear cuenta", f.signup_click], ["Cuentas creadas", f.accounts], ["Registraron un movimiento", f.first_tx], ["Usuarios activos (2+ días de uso)", f.active]];
    const top = Math.max(1, ...steps.map(x => x[1]));
    $("funnel").innerHTML = steps.map((x, i) => "<div class='fstep'><span>" + esc(x[0]) + "</span><div class='fbar'><i style='width:" + Math.max(2, (x[1] / top) * 100) + "%'></i></div><div class='fval'><b>" + nf(x[1]) + "</b><small>" + (i === 0 ? "100%" : pct(x[1], steps[i - 1][1]) + "% del paso anterior") + "</small></div></div>").join("");
    $("funnelNote").textContent = "Los pasos de visitas y clics se miden por sesión anónima; las cuentas y movimientos son de usuarios creados dentro del periodo, por lo que pueden no coincidir exactamente con los visitantes.";
  }

  function renderAudiencia(s) {
    const grid = {}; let mx = 1;
    s.heatmap.forEach(h => { grid[h.dow + "-" + h.hour] = Number(h.n); mx = Math.max(mx, Number(h.n)); });
    let html = "<div></div>" + Array.from({ length: 24 }, (_, h) => "<div class='hhead'>" + h + "</div>").join("");
    for (let d = 1; d <= 7; d++) { const dow = d % 7; html += "<div class='hlab'>" + DAYS[dow] + "</div>"; for (let h = 0; h < 24; h++) { const n = grid[dow + "-" + h] || 0; html += "<div class='hcell' title='" + DAYS[dow] + " " + h + ":00 — " + n + "' style='opacity:" + (n ? 0.15 + 0.85 * (n / mx) : 0.06) + "'></div>"; } }
    $("heat").innerHTML = html;
    donut("cLang", s.langs.map(l => ({ lang: { es: "Español", en: "English", fr: "Français" }[l.lang] || l.lang || "—", n: l.n })), "lang");
    donut("cDev", s.devices.map(d => ({ device: d.device === "mobile" ? "Móvil" : d.device === "desktop" ? "Escritorio" : d.device || "—", n: d.n })), "device");
    donut("cProv", s.providers.map(p => ({ provider: p.provider === "google" ? "Google" : p.provider === "email" ? "Correo" : p.provider, n: p.n })), "provider");
    $("tRef").innerHTML = s.referrers.length ? s.referrers.map(r => "<tr><td>" + esc(r.referrer) + "</td><td style='text-align:right'><b>" + nf(r.n) + "</b></td></tr>").join("") : "<tr><td class='muted'>Sin datos todavía</td></tr>";
    hbar("cEvents", s.events.map(e => ({ name: EVN[e.event] || e.event, n: Number(e.n) })));
  }

  function renderUso(s) {
    const a = s.all, r = s.retention;
    $("usoKpis").innerHTML = [kpi("Activos hoy (DAU)", a.dau), kpi("Activos 7 días (WAU)", a.wau), kpi("Activos 30 días (MAU)", a.mau), kpi("Movimientos por usuario", a.avg_tx_per_user), kpi("Usuarios totales", a.users), kpi("Con al menos un movimiento", a.users_with_tx), kpi("Hogares", a.households), kpi("Nuevos sin movimientos (14 d)", s.inactive_new)].join("");
    $("retention").innerHTML = [["Retención a 7 días", r.d7_kept, r.d7_base], ["Retención a 30 días", r.d30_kept, r.d30_base]].map(x => "<div class='kpi'><small>" + x[0] + "</small><b>" + (x[2] ? pct(x[1], x[2]) + "%" : "—") + "</b><i class='flat'>" + nf(x[1]) + " de " + nf(x[2]) + " usuarios</i></div>").join("");
    hbar("cFeat", s.features.map(f => ({ name: EVN[f.event] || f.event, n: Number(f.n) })), PAL[1]);
    draw("cHouse", { type: "bar", data: { labels: s.household_sizes.map(h => h.size + " miembros"), datasets: [{ label: "Hogares", data: s.household_sizes.map(h => Number(h.n)), backgroundColor: PAL[2], borderRadius: 6 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  }

  function renderIA(s) {
    const cost = () => (Number($("aiCost").value) || 0) * Number(s.cur.ai_queries);
    const paint = () => { $("iaKpis").innerHTML = [kpi("Consultas en el periodo", s.cur.ai_queries, s.prev.ai_queries), kpi("Usuarios que la usaron", s.ai_users), kpi("Consultas por usuario", s.ai_users ? Math.round((s.cur.ai_queries / s.ai_users) * 10) / 10 : 0), kpi("Costo estimado (USD)", cost(), null, v => "$" + v.toFixed(2))].join(""); };
    try { const saved = localStorage.getItem("mb_ai_cost"); if (saved) $("aiCost").value = saved; } catch (e) {}
    $("aiCost").oninput = () => { try { localStorage.setItem("mb_ai_cost", $("aiCost").value); } catch (e) {} paint(); };
    paint();
    draw("cAI", { type: "bar", data: { labels: s.daily.map(d => d.day.slice(5)), datasets: [{ label: "Consultas", data: s.daily.map(d => Number(d.ai)), backgroundColor: PAL[0], borderRadius: 4 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    $("tAI").innerHTML = s.ai_top.length ? s.ai_top.map(u => "<tr><td>" + esc(u.email) + "</td><td style='text-align:right'><b>" + nf(u.n) + "</b></td></tr>").join("") : "<tr><td colspan='2' class='muted'>Aún no hay consultas</td></tr>";
  }

  async function loadUsers() {
    try {
      const r = await Data.adminUsers(PER, usersPage * PER, usersSearch);
      $("uTotal").textContent = nf(r.total) + " usuarios";
      $("uPage").textContent = "Página " + (usersPage + 1) + " de " + Math.max(1, Math.ceil(r.total / PER));
      $("uPrev").disabled = usersPage === 0; $("uNext").disabled = (usersPage + 1) * PER >= r.total;
      const dt = v => (v ? new Date(v).toLocaleDateString("es") : "—");
      $("tUsers").innerHTML = r.rows.length ? r.rows.map(u => "<tr><td>" + esc(u.email) + "</td><td>" + dt(u.created_at) + "</td><td>" + dt(u.last_sign_in_at) + "</td><td>" + (u.provider === "google" ? "Google" : "Correo") + "</td><td style='text-align:right'>" + nf(u.tx_count) + (Number(u.tx_count) === 0 ? " <span class='pill no'>sin uso</span>" : "") + "</td><td>" + dt(u.last_tx) + "</td><td>" + (u.in_household ? "<span class='pill yes'>Sí</span>" : "—") + "</td><td style='text-align:right'>" + nf(u.ai_30d) + "</td></tr>").join("") : "<tr><td colspan='8' class='muted'>Sin resultados</td></tr>";
    } catch (e) { $("tUsers").innerHTML = "<tr><td colspan='8' class='muted'>" + esc(e.message) + "</td></tr>"; }
  }

  function csvCell(v) { v = v == null ? "" : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(name, rows) {
    const blob = new Blob(["﻿" + rows.map(r => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const userRows = list => [["Correo", "Registro", "Último ingreso", "Método", "Movimientos", "Último movimiento", "En hogar", "Consultas IA (30 d)"]].concat(list.map(u => [u.email, u.created_at, u.last_sign_in_at || "", u.provider, u.tx_count, u.last_tx || "", u.in_household ? "sí" : "no", u.ai_30d]));
  async function exportAll() {
    if (!S) return;
    const rows = [["Monetra - reporte", S.range.from + " a " + S.range.to], [], ["Indicador", "Periodo actual", "Periodo anterior"]];
    const L = { visitors: "Visitantes únicos", visits: "Visitas a la portada", signups: "Registros nuevos", signup_clicks: "Clics en Crear cuenta", app_opens: "Entradas a la app", active_users: "Usuarios activos", transactions: "Movimientos creados", downloads: "Descargas PDF", ai_queries: "Consultas IA" };
    Object.keys(L).forEach(k => rows.push([L[k], S.cur[k], S.prev[k]]));
    rows.push([], ["Embudo", "Cantidad"], ["Visitantes", S.funnel.visitors], ["Clic en Crear cuenta", S.funnel.signup_click], ["Cuentas creadas", S.funnel.accounts], ["Registraron un movimiento", S.funnel.first_tx], ["Usuarios activos", S.funnel.active]);
    rows.push([], ["Activos hoy / 7 d / 30 d", S.all.dau, S.all.wau, S.all.mau], ["Retención 7 d", S.retention.d7_kept, S.retention.d7_base], ["Retención 30 d", S.retention.d30_kept, S.retention.d30_base]);
    rows.push([], ["Día", "Visitas", "Visitantes", "Registros", "Activos", "Consultas IA"]);
    S.daily.forEach(d => rows.push([d.day, d.visits, d.visitors, d.signups, d.active, d.ai]));
    rows.push([], ["Evento", "Cantidad"]); S.events.forEach(e => rows.push([EVN[e.event] || e.event, e.n]));
    try { const u = await Data.adminUsers(1000, 0, ""); rows.push([], ["USUARIOS"]); userRows(u.rows).forEach(r => rows.push(r)); } catch (e) {}
    download("monetra-reporte-" + S.range.from + "_" + S.range.to + ".csv", rows);
  }

  function range() {
    const v = $("range").value; const to = new Date();
    if (v === "custom") return { from: $("dFrom").value || iso(new Date(Date.now() - 29 * 864e5)), to: $("dTo").value || iso(to) };
    return { from: iso(new Date(Date.now() - (Number(v) - 1) * 864e5)), to: iso(to) };
  }

  async function load() {
    try {
      state("<h2>Cargando…</h2>");
      const r = range();
      S = await Data.adminStats(r.from, r.to, tz);
      $("state").classList.add("hidden"); $("panel").classList.remove("hidden");
      alerts(S); renderResumen(S); renderAudiencia(S); renderUso(S); renderIA(S);
      usersPage = 0; loadUsers();
    } catch (e) {
      const msg = /not_admin|42501|permission/i.test(e.message) ? "Tu cuenta no es administradora. Ejecuta supabase/admin.sql con tu correo." : (/admin_stats|schema cache|PGRST202|function/i.test(e.message) ? "Falta actualizar supabase/admin.sql en Supabase (versión nueva)." : e.message);
      state("<h2>No se pudo abrir el panel</h2><p class='muted'>" + esc(msg) + "</p>");
    }
  }

  async function start() {
    if (!Data.isConfigured()) return state("<h2>Falta config.js</h2>");
    try {
      const s = await Data.getSession();
      if (!s) { location.replace("app.html"); return; }
      if (!(await Data.isAdmin())) return state("<h2>Acceso restringido</h2><p class='muted'>Esta sección es solo para el administrador. Si eres tú, ejecuta supabase/admin.sql con tu correo.</p>");
      load();
    } catch (e) { state("<h2>Error</h2><p class='muted'>" + esc(e.message) + "</p>"); }
  }

  $("range").addEventListener("change", () => { const c = $("range").value === "custom"; $("dFrom").classList.toggle("hidden", !c); $("dTo").classList.toggle("hidden", !c); if (c) { if (!$("dTo").value) $("dTo").value = iso(new Date()); if (!$("dFrom").value) $("dFrom").value = iso(new Date(Date.now() - 29 * 864e5)); } else load(); });
  $("dFrom").addEventListener("change", load); $("dTo").addEventListener("change", load);
  $("reload").addEventListener("click", load);
  $("csvAll").addEventListener("click", exportAll);
  $("tabs").addEventListener("click", e => {
    const b = e.target.closest(".tab"); if (!b) return;
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("on", x === b));
    document.querySelectorAll(".pane").forEach(p => p.classList.toggle("on", p.id === b.dataset.pane));
    Object.values(charts).forEach(c => { try { c.resize(); } catch (er) {} });
  });
  $("uSearchBtn").addEventListener("click", () => { usersSearch = $("uSearch").value.trim(); usersPage = 0; loadUsers(); });
  $("uSearch").addEventListener("keydown", e => { if (e.key === "Enter") $("uSearchBtn").click(); });
  $("uPrev").addEventListener("click", () => { if (usersPage > 0) { usersPage--; loadUsers(); } });
  $("uNext").addEventListener("click", () => { usersPage++; loadUsers(); });
  $("uCsv").addEventListener("click", async () => { try { const u = await Data.adminUsers(1000, 0, usersSearch); download("monetra-usuarios.csv", userRows(u.rows)); } catch (e) { $("uTotal").textContent = e.message; } });
  document.addEventListener("monetra:theme", () => { if (S && !$("panel").classList.contains("hidden")) { renderResumen(S); renderAudiencia(S); renderUso(S); renderIA(S); } });
  start();
})();
