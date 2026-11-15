/* Monetra - métricas anónimas de uso (sin cookies, sin IP, sin datos personales).
   Registra: página vista, clics clave (data-track), idioma, tipo de dispositivo y sitio de origen. */
(function () {
  var cfg = window.APP_CONFIG || {};
  var ok = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY.indexOf("PEGA_AQUI") !== 0;
  var sid;
  try { sid = sessionStorage.getItem("mb_sid"); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("mb_sid", sid); } }
  catch (e) { sid = "anon"; }
  function ref() { try { return document.referrer ? new URL(document.referrer).hostname.slice(0, 80) : ""; } catch (e) { return ""; } }
  // País (solo el código de 2 letras, sin IP) vía la función "geo"; se guarda por sesión.
  var country = "";
  try { country = sessionStorage.getItem("mb_cc") || ""; } catch (e) {}
  var geoP = country || !ok ? Promise.resolve(country) : Promise.race([
    fetch(cfg.SUPABASE_URL + "/functions/v1/geo", { headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY } })
      .then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { return /^[A-Z]{2}$/.test(j.country || "") ? j.country : ""; }).catch(function () { return ""; }),
    new Promise(function (res) { setTimeout(function () { res(""); }, 2000); })
  ]).then(function (c) { country = c; try { if (c) sessionStorage.setItem("mb_cc", c); } catch (e) {} window.MonetraCountry = c; return c; });
  window.MonetraCountryReady = geoP;
  function send(name) {
    if (!ok) return;
    geoP.then(function () { post(name); });
  }
  function post(name) {
    var body = {
      country: country,
      event: String(name).slice(0, 40),
      path: location.pathname.split("/").pop() || "index.html",
      lang: (window.I18n && I18n.lang) || (document.documentElement.lang || "es").slice(0, 2),
      device: window.innerWidth <= 760 ? "mobile" : "desktop",
      referrer: ref(),
      session_id: sid
    };
    function ins(b) {
      return fetch(cfg.SUPABASE_URL + "/rest/v1/page_events", {
        method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY, Prefer: "return=minimal" },
        body: JSON.stringify(b)
      });
    }
    try {
      ins(body).then(function (r) {
        if (!r.ok && body.country !== undefined) { delete body.country; return ins(body); } // v9.sql aún no ejecutado
      }).catch(function () {});
    } catch (e) {}
  }
  window.MonetraTrack = { event: send };
  if (/admin\.html$/.test(location.pathname)) return; // no cuenta las visitas al panel
  send("page_view");
  document.addEventListener("click", function (e) {
    var tg = e.target.closest ? e.target : null; if (!tg) return;
    var el = tg.closest("[data-track]");
    if (el) send(el.getAttribute("data-track"));
    var tab = tg.closest(".nav-btn[data-section]");
    if (tab) send("tab_" + tab.getAttribute("data-section").replace("Section", "").toLowerCase());
    if (tg.closest("#exportBtn")) send("export_data");
    if (tg.closest("#importBtn")) send("import_data");
    if (tg.closest("[data-theme-toggle]")) send("theme_toggle");
  });
  document.addEventListener("monetra:ready", function () { send("app_open"); });
})();
