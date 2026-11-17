/* Monetra - Guía con IA dentro del dashboard: explica cómo usar cada sección (función app-guide). */
(function () {
  const $ = id => document.getElementById(id);
  const D = {
    es: { fab: "Guía", title: "Guía de Monetra", sub: "Te explico cómo usar tu dashboard", ph: "Escribe tu pregunta…", send: "Enviar", typing: "Escribiendo…", close: "Cerrar guía",
      hi: "¡Hola! Soy tu guía de Monetra. Pregúntame cómo usar cualquier parte del dashboard y te doy los pasos.",
      err: "No pude responder ahora. Inténtalo de nuevo en un momento.", lim: "Llegaste al límite de preguntas de hoy. Mañana podrás seguir; con Pro tienes más.", limPro: "Llegaste al límite de preguntas de hoy. Vuelve mañana.",
      nd: "La guía aún no está activada en Supabase (falta publicar la función app-guide; ver ACTUALIZAR-V11.md).",
      chips: {
        transactionsSection: ["¿Cómo registro un gasto?", "¿Cómo escaneo una boleta?", "¿Qué es un gasto fijo?"],
        categoriesSection: ["¿Cómo creo una categoría?", "¿Cuántas categorías puedo tener?", "¿Para qué sirven los iconos?"],
        chartsSection: ["¿Cómo cambio el gráfico?", "¿Qué es el Pareto 80/20?", "¿Qué vistas son Pro?"],
        analyticsSection: ["¿Qué significa mi score?", "¿Qué es la regla 50/30/20?", "¿Cómo leo el comparativo?"],
        goalsSection: ["¿Cómo creo una meta?", "¿Cómo aporto a una meta?", "¿Qué significa «Vas atrasado»?"],
        advisorSection: ["¿Cómo uso el asesor IA?", "¿Cuántas consultas tengo?", "¿Qué datos se envían a la IA?"],
        householdSection: ["¿Cómo creo un hogar?", "¿Cómo invito a mi pareja?", "¿Qué ve cada persona?"],
        profileSection: ["¿Cómo cambio mi moneda?", "¿Cómo cambio el idioma?", "¿Cómo cierro sesión?"] } },
    en: { fab: "Guide", title: "Monetra guide", sub: "I'll show you how to use your dashboard", ph: "Type your question…", send: "Send", typing: "Typing…", close: "Close guide",
      hi: "Hi! I'm your Monetra guide. Ask me how to use any part of the dashboard and I'll give you the steps.",
      err: "I couldn't answer right now. Please try again in a moment.", lim: "You've reached today's question limit. You can continue tomorrow; Pro gives you more.", limPro: "You've reached today's question limit. Come back tomorrow.",
      nd: "The guide isn't enabled in Supabase yet (the app-guide function needs publishing; see ACTUALIZAR-V11.md).",
      chips: {
        transactionsSection: ["How do I log an expense?", "How do I scan a receipt?", "What is a fixed expense?"],
        categoriesSection: ["How do I create a category?", "How many categories can I have?", "What are the icons for?"],
        chartsSection: ["How do I change the chart?", "What is the 80/20 Pareto?", "Which views are Pro?"],
        analyticsSection: ["What does my score mean?", "What is the 50/30/20 rule?", "How do I read the comparison?"],
        goalsSection: ["How do I create a goal?", "How do I contribute to a goal?", "What does “Behind schedule” mean?"],
        advisorSection: ["How do I use the AI advisor?", "How many queries do I have?", "What data is sent to the AI?"],
        householdSection: ["How do I create a household?", "How do I invite my partner?", "What does each person see?"],
        profileSection: ["How do I change my currency?", "How do I change the language?", "How do I sign out?"] } },
    fr: { fab: "Guide", title: "Guide Monetra", sub: "Je vous explique comment utiliser votre tableau de bord", ph: "Écrivez votre question…", send: "Envoyer", typing: "Écriture…", close: "Fermer le guide",
      hi: "Bonjour ! Je suis votre guide Monetra. Demandez-moi comment utiliser n'importe quelle partie du tableau de bord et je vous donne les étapes.",
      err: "Je n'ai pas pu répondre. Réessayez dans un instant.", lim: "Vous avez atteint la limite de questions du jour. Vous pourrez continuer demain ; Pro en offre plus.", limPro: "Vous avez atteint la limite de questions du jour. Revenez demain.",
      nd: "Le guide n'est pas encore activé dans Supabase (la fonction app-guide doit être publiée ; voir ACTUALIZAR-V11.md).",
      chips: {
        transactionsSection: ["Comment saisir une dépense ?", "Comment scanner un reçu ?", "Qu'est-ce qu'une dépense fixe ?"],
        categoriesSection: ["Comment créer une catégorie ?", "Combien de catégories puis-je avoir ?", "À quoi servent les icônes ?"],
        chartsSection: ["Comment changer le graphique ?", "Qu'est-ce que le Pareto 80/20 ?", "Quelles vues sont Pro ?"],
        analyticsSection: ["Que signifie mon score ?", "Qu'est-ce que la règle 50/30/20 ?", "Comment lire la comparaison ?"],
        goalsSection: ["Comment créer un objectif ?", "Comment verser à un objectif ?", "Que veut dire « En retard » ?"],
        advisorSection: ["Comment utiliser le conseiller IA ?", "Combien de requêtes ai-je ?", "Quelles données sont envoyées à l'IA ?"],
        householdSection: ["Comment créer un foyer ?", "Comment inviter mon conjoint ?", "Que voit chaque personne ?"],
        profileSection: ["Comment changer ma devise ?", "Comment changer la langue ?", "Comment me déconnecter ?"] } }
  };
  let hist = [], busy = false, started = false, built = false;
  const L = () => { const l = (window.I18n && I18n.lang) || "es"; return D[l] ? l : "es"; };
  const T = () => D[L()];
  const sect = () => document.body.getAttribute("data-page") || "transactionsSection";

  function build() {
    if (built) return; built = true;
    const w = document.createElement("div");
    w.innerHTML =
      '<button id="gdFab" type="button" translate="no"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/><path d="M9.5 10a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 17h.01"/></svg><span id="gdFabTxt"></span></button>' +
      '<div id="gdBox" role="dialog" aria-label="Guía" translate="no"><div id="gdHead"><img src="logo.png" alt=""><b><span id="gdTitle"></span><small id="gdSub"></small></b><button id="gdClose" type="button">×</button></div>' +
      '<div id="gdMsgs" aria-live="polite"></div><form id="gdForm" autocomplete="off"><input id="gdIn" maxlength="500" aria-label="Pregunta"><button id="gdSend" type="submit"></button></form></div>';
    while (w.firstChild) document.body.appendChild(w.firstChild);
    $("gdFab").onclick = open;
    $("gdClose").onclick = close;
    $("gdForm").onsubmit = e => { e.preventDefault(); ask($("gdIn").value); };
    document.addEventListener("keydown", e => { if (e.key === "Escape" && $("gdBox").classList.contains("open")) close(); });
    paint();
  }
  function paint() {
    if (!built) return;
    const t = T();
    $("gdFabTxt").textContent = t.fab; $("gdTitle").textContent = t.title; $("gdSub").textContent = t.sub;
    $("gdIn").placeholder = t.ph; $("gdSend").textContent = t.send; $("gdClose").setAttribute("aria-label", t.close);
  }
  function add(cls, text) { const d = document.createElement("div"); d.className = "gm " + cls; d.textContent = text; $("gdMsgs").appendChild(d); $("gdMsgs").scrollTop = 1e9; return d; }
  function chips() {
    document.querySelectorAll("#gdMsgs .gchips").forEach(n => n.remove());
    const list = (T().chips[sect()] || T().chips.transactionsSection);
    const c = document.createElement("div"); c.className = "gchips";
    list.forEach(q => { const b = document.createElement("button"); b.type = "button"; b.textContent = q; b.onclick = () => ask(q); c.appendChild(b); });
    $("gdMsgs").appendChild(c); $("gdMsgs").scrollTop = 1e9;
  }
  function open() {
    build(); paint();
    $("gdBox").classList.add("open"); $("gdFab").hidden = true;
    if (!started) { started = true; add("bot", T().hi); }
    chips();
    setTimeout(() => $("gdIn").focus(), 60);
  }
  function close() { $("gdBox").classList.remove("open"); $("gdFab").hidden = false; $("gdFab").focus(); }

  async function ask(q) {
    q = String(q || "").trim(); if (!q || busy) return;
    busy = true; $("gdSend").disabled = true;
    document.querySelectorAll("#gdMsgs .gchips").forEach(n => n.remove());
    add("me", q); hist.push({ role: "user", content: q }); $("gdIn").value = "";
    const typ = add("bot typing", T().typing);
    try {
      const r = await Data.askGuide({ lang: L(), section: sect(), messages: hist.slice(-8) });
      typ.remove();
      if (!r || !r.text) add("err", T().err);
      else { add("bot", r.text); hist.push({ role: "assistant", content: r.text }); }
    } catch (e) {
      typ.remove();
      if (e && (e.code === "free_limit")) add("err", T().lim);
      else if (e && e.code === "limit") add("err", T().limPro);
      else if (e && e.code === "not_deployed") add("err", T().nd);
      else add("err", T().err);
      if (hist.length && hist[hist.length - 1].role === "user") hist.pop();
    }
    busy = false; $("gdSend").disabled = false; $("gdIn").focus();
    chips();
  }

  document.addEventListener("monetra:ready", build);
  window.MonetraGuide = { open, close };
})();
