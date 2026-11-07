/* Monetra - métricas anónimas de uso (sin cookies, sin IP, sin datos personales).
   Registra: página vista, clics clave (data-track), idioma, tipo de dispositivo y sitio de origen. */
(function () {
  var cfg = window.APP_CONFIG || {};
  var ok = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY.indexOf("PEGA_AQUI") !== 0;
  var sid;
  try { sid = sessionStorage.getItem("mb_sid"); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("mb_sid", sid); } }
  catch (e) { sid = "anon"; }
  function ref() { try { return document.referrer ? new URL(document.referrer).hostname.slice(0, 80) : ""; } catch (e) { return ""; } }
  function send(name) {
    if (!ok) return;
    var body = {
      event: String(name).slice(0, 40),
      path: location.pathname.split("/").pop() || "index.html",
      lang: (window.I18n && I18n.lang) || (document.documentElement.lang || "es").slice(0, 2),
      device: window.innerWidth <= 760 ? "mobile" : "desktop",
      referrer: ref(),
      session_id: sid
    };
    try {
      fetch(cfg.SUPABASE_URL + "/rest/v1/page_events", {
        method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY, Prefer: "return=minimal" },
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (e) {}
  }
  window.MonetraTrack = { event: send };
  if (/admin\.html$/.test(location.pathname)) return; // no cuenta las visitas al panel
  send("page_view");
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-track]");
    if (el) send(el.getAttribute("data-track"));
  });
  document.addEventListener("monetra:ready", function () { send("app_open"); });
})();
