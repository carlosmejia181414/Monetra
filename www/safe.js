/* Monetra - red de seguridad contra XSS: todo HTML que se asigne con innerHTML pasa por un filtro
   que elimina <script>, <iframe>, atributos on*="..." y enlaces javascript:. Es una segunda capa:
   además, el texto del usuario se escapa donde se dibuja. */
(function () {
  var desc = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  if (!desc || !desc.set) return;
  var BAD = "script,iframe,object,embed,link,meta,base,frame,frameset,applet";
  function clean(html) {
    if (typeof html !== "string" || html.indexOf("<") === -1) return html;
    var t = document.createElement("template");
    desc.set.call(t, html);
    t.content.querySelectorAll(BAD).forEach(function (n) { n.remove(); });
    t.content.querySelectorAll("*").forEach(function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        var name = a.name.toLowerCase(), val = String(a.value).replace(/[\s\u0000-\u001f]/g, "").toLowerCase();
        if (name.indexOf("on") === 0 || name === "srcdoc" ||
            (/^(href|src|xlink:href|action|formaction|data)$/.test(name) && /^(javascript|vbscript|data:text\/html)/.test(val))) n.removeAttribute(a.name);
      });
    });
    return t.innerHTML;
  }
  Object.defineProperty(Element.prototype, "innerHTML", {
    configurable: true, enumerable: desc.enumerable, get: desc.get,
    set: function (v) { desc.set.call(this, clean(v)); }
  });
})();
