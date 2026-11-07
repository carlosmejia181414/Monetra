/* Monetra - panel de administrador (solo para usuarios listados en la tabla "admins"). */
(function () {
  const $ = id => document.getElementById(id);
  const charts = {};
  const PAL = ["#e8456b", "#ffcf4a", "#d9b8ff", "#ff7a5c", "#8a5cd0", "#b0236b"];
  const EVN = { page_view: "Visitas", click_signup: "Clic en Crear cuenta", click_login: "Clic en Entrar", app_open: "Entradas a la app", download_brochure: "Descarga brochure", download_manual: "Descarga manual", ai_advice: "Consultas al asesor IA" };
  const nf = n => new Intl.NumberFormat("es").format(Number(n) || 0);

  function state(html) { $("state").classList.remove("hidden"); $("panel").classList.add("hidden"); $("state").innerHTML = html; }
  function draw(id, cfg) {
    if (charts[id]) charts[id].destroy();
    if (window.MonetraTheme) MonetraTheme.applyChart();
    charts[id] = new Chart($(id), cfg);
  }
  function donut(id, rows, key) {
    draw(id, { type: "doughnut", data: { labels: rows.map(r => r[key] || "—"), datasets: [{ data: rows.map(r => Number(r.n)), backgroundColor: rows.map((_, i) => PAL[i % PAL.length]) }] }, options: { maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" } } } });
  }

  function render(s) {
    $("state").classList.add("hidden"); $("panel").classList.remove("hidden");
    const t = s.totals;
    const k = [["Usuarios registrados", t.users], ["Nuevos (periodo)", t.new_users], ["Visitas a la portada", t.visits], ["Visitantes únicos", t.visitors],
      ["Clics en Crear cuenta", t.signup_clicks], ["Entradas a la app", t.app_opens], ["Descargas PDF", t.downloads], ["Consultas IA", t.ai_queries], ["Movimientos guardados", t.transactions], ["Hogares", t.households]];
    $("kpis").innerHTML = k.map(x => "<div class='kpi'><small>" + x[0] + "</small><b>" + nf(x[1]) + "</b></div>").join("");
    const labels = s.daily.map(d => d.day.slice(5));
    const line = (label, key, color) => ({ label, data: s.daily.map(d => Number(d[key])), borderColor: color, backgroundColor: color + "33", tension: .35, fill: key === "visits", pointRadius: 2 });
    draw("cDaily", { type: "line", data: { labels, datasets: [line("Visitas", "visits", PAL[0]), line("Visitantes", "visitors", PAL[1]), line("Registros", "signups", PAL[2])] }, options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    const ev = s.events.map(e => ({ name: EVN[e.event] || e.event, n: Number(e.n) }));
    draw("cEvents", { type: "bar", data: { labels: ev.map(e => e.name), datasets: [{ data: ev.map(e => e.n), backgroundColor: PAL[0], borderRadius: 6 }] }, options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });
    donut("cProv", s.providers.map(p => ({ provider: p.provider === "google" ? "Google" : p.provider === "email" ? "Correo" : p.provider, n: p.n })), "provider");
    donut("cLang", s.langs.map(l => ({ lang: { es: "Español", en: "English", fr: "Français" }[l.lang] || l.lang, n: l.n })), "lang");
    donut("cDev", s.devices.map(d => ({ device: d.device === "mobile" ? "Móvil" : d.device === "desktop" ? "Escritorio" : d.device, n: d.n })), "device");
    $("tRef").innerHTML = s.referrers.length ? s.referrers.map(r => "<tr><td>" + String(r.referrer).replace(/[<>&"]/g, "") + "</td><td style='text-align:right'><b>" + nf(r.n) + "</b></td></tr>").join("") : "<tr><td class='muted'>Sin datos todavía</td></tr>";
  }

  async function load() {
    try {
      state("<h2>Cargando…</h2>");
      render(await Data.adminStats(Number($("range").value)));
    } catch (e) {
      const msg = /not_admin|42501|permission/i.test(e.message) ? "Tu cuenta no es administradora. Ejecuta supabase/admin.sql con tu correo." : (/admin_stats|schema cache|PGRST202/.test(e.message) ? "Falta ejecutar supabase/admin.sql en Supabase." : e.message);
      state("<h2>No se pudo abrir el panel</h2><p class='muted'>" + String(msg).replace(/[<>&]/g, "") + "</p>");
    }
  }

  async function start() {
    if (!Data.isConfigured()) return state("<h2>Falta config.js</h2>");
    try {
      const s = await Data.getSession();
      if (!s) { location.replace("app.html"); return; }
      if (!(await Data.isAdmin())) return state("<h2>Acceso restringido</h2><p class='muted'>Esta sección es solo para el administrador. Si eres tú, ejecuta supabase/admin.sql con tu correo.</p>");
      load();
    } catch (e) { state("<h2>Error</h2><p class='muted'>" + String(e.message).replace(/[<>&]/g, "") + "</p>"); }
  }
  $("range").addEventListener("change", load);
  $("reload").addEventListener("click", load);
  document.addEventListener("monetra:theme", () => { if (!$("panel").classList.contains("hidden")) load(); });
  start();
})();
