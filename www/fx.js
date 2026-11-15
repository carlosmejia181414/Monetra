/*
 * Monetra - monedas y conversor.
 * Las tasas vienen de un servicio gratuito (open.er-api.com; respaldo: frankfurter.app), se guardan
 * en el navegador y se actualizan como máximo cada 12 horas. Sin conexión se usan las últimas guardadas.
 * Cada movimiento guarda su monto en SU moneda; la pantalla lo convierte a la moneda elegida en el perfil.
 */
(function () {
  // Códigos ISO 4217 más usados (el nombre se obtiene del navegador en el idioma activo).
  const CODES = ["USD", "CAD", "EUR", "GBP", "MXN", "COP", "PEN", "CLP", "ARS", "BRL", "UYU", "BOB", "PYG", "DOP", "CRC", "GTQ", "HNL", "NIO", "PAB", "VES",
    "CHF", "JPY", "CNY", "KRW", "INR", "AUD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "TRY", "AED", "SAR", "ILS", "ZAR", "NGN", "MAD", "EGP", "PHP", "THB", "SGD", "HKD", "IDR", "MYR", "VND"];
  const LEGACY = "CAD";            // los movimientos antiguos (sin moneda) estaban en dólares canadienses
  const KEY = "mb_fx";
  const TTL = 12 * 3600 * 1000;
  const LOCALES = { es: "es-CA", en: "en-CA", fr: "fr-CA" };
  const lang = (window.I18n && I18n.lang) || "es";

  let rates = null;                // { USD: 1, CAD: 1.39, ... } (unidades de cada moneda por 1 USD)
  let stamp = 0;                   // cuándo se obtuvieron
  let source = "";
  let display = LEGACY;
  const listeners = [];

  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || "null");
      if (c && c.rates && c.rates.USD) { rates = c.rates; stamp = c.t || 0; source = c.src || ""; }
    } catch (e) { /* sin almacenamiento */ }
  }
  readCache();

  async function getJSON(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error("http " + r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  // Actualiza las tasas si hacen falta. Devuelve true si cambiaron.
  async function refresh(force) {
    if (!force && rates && Date.now() - stamp < TTL) return false;
    let next = null, src = "";
    try {
      const j = await getJSON("https://open.er-api.com/v6/latest/USD");
      if (j && j.result === "success" && j.rates && j.rates.USD) { next = j.rates; src = "open.er-api.com"; }
    } catch (e) { /* se prueba el respaldo */ }
    if (!next) {
      try {
        const j = await getJSON("https://api.frankfurter.app/latest?from=USD");
        if (j && j.rates) { next = Object.assign({ USD: 1 }, j.rates); src = "frankfurter.app"; }
      } catch (e) { /* sin conexión: se mantienen las guardadas */ }
    }
    if (!next) return false;
    rates = next; stamp = Date.now(); source = src;
    try { localStorage.setItem(KEY, JSON.stringify({ t: stamp, rates, src })); } catch (e) { /* ignorar */ }
    listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    return true;
  }

  const supported = code => !!(rates && rates[code]) || code === "USD";

  // Convierte un monto entre monedas. Si falta la tasa, devuelve el monto sin cambiar (y lo registra en 'missing').
  const missing = new Set();
  function convert(amount, from, to) {
    const a = Number(amount) || 0;
    from = from || LEGACY; to = to || display;
    if (from === to) return a;
    if (!rates || !rates[from] || !rates[to]) { missing.add(!rates || !rates[from] ? from : to); return a; }
    return a / rates[from] * rates[to];
  }

  function format(value, cur) {
    const c = cur || display;
    try {
      return new Intl.NumberFormat(LOCALES[lang] || "es-CA", { style: "currency", currency: c }).format(value || 0);
    } catch (e) { return (Number(value) || 0).toFixed(2) + " " + c; }
  }

  function name(code) {
    try { return new Intl.DisplayNames([LOCALES[lang] || "es"], { type: "currency" }).of(code) || code; } catch (e) { return code; }
  }

  const list = () => CODES.filter(c => c === "USD" || !rates || rates[c]);
  const setDisplay = c => { if (/^[A-Z]{3}$/.test(c || "")) display = c; };

  window.MonetraFX = {
    LEGACY, refresh, convert, format, name, list, supported, setDisplay,
    get display() { return display; },
    get updatedAt() { return stamp; },
    get source() { return source; },
    get ready() { return !!rates; },
    get missing() { return Array.from(missing); },
    onUpdate: fn => listeners.push(fn)
  };
})();
