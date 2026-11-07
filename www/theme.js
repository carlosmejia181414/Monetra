/* Monetra - modo claro / oscuro. Guarda la preferencia en este navegador y avisa a los gráficos. */
(function () {
  var KEY = "monetra_theme";
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function initial() {
    var s = stored();
    if (s === "light" || s === "dark") return s;
    return window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function applyChart() {
    if (!window.Chart || !Chart.defaults) return;
    Chart.defaults.color = css("--chart-text", "#cdb8da");
    Chart.defaults.borderColor = css("--chart-grid", "rgba(255,255,255,.09)");
    if (Chart.defaults.elements && Chart.defaults.elements.arc) Chart.defaults.elements.arc.borderColor = css("--chart-sep", "#1b0d2b");
  }
  function set(theme, persist) {
    document.documentElement.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f6eef4" : "#160a25");
    if (persist) { try { localStorage.setItem(KEY, theme); } catch (e) {} }
    applyChart();
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      b.title = theme === "light" ? "Modo oscuro" : "Modo claro";
    });
    document.dispatchEvent(new CustomEvent("monetra:theme", { detail: { theme: theme } }));
  }
  function current() { return document.documentElement.getAttribute("data-theme") || "dark"; }
  document.documentElement.setAttribute("data-theme", initial());
  window.MonetraTheme = { get: current, set: function (t) { set(t, true); }, toggle: function () { set(current() === "light" ? "dark" : "light", true); }, applyChart: applyChart };
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-theme-toggle]");
    if (b) window.MonetraTheme.toggle();
  });
  document.addEventListener("DOMContentLoaded", function () { set(current(), false); });
})();
