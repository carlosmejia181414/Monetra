/* Español/English: el texto fuente está en español; en inglés se traduce por coincidencia exacta. */
(function () {
  const EN = {
    "Iniciar sesión":"Log in","Crear cuenta":"Sign up","Entrar":"Log in","Cerrar sesión":"Log out","Sesión cerrada.":"Logged out.",
    "Correo":"Email","Contraseña":"Password","¿Olvidaste tu contraseña?":"Forgot your password?","Enviar enlace":"Send link",
    "Guardar contraseña":"Save password","Nueva contraseña":"New password","Entrando...":"Signing in...",
    "Inicia sesión para ver tus finanzas.":"Log in to see your finances.","Crea tu cuenta gratis.":"Create your free account.",
    "Escribe tu correo y te enviaremos un enlace.":"Enter your email and we'll send you a link.","Escribe tu nueva contraseña.":"Enter your new password.",
    "Cuenta creada. Revisa tu correo para confirmarla.":"Account created. Check your email to confirm it.",
    "Te enviamos un enlace para cambiar tu contraseña.":"We sent you a link to change your password.",
    "Correo o contraseña incorrectos.":"Wrong email or password.","Falta configurar la base de datos (archivo config.js).":"Database not configured (config.js).",
    "Sin conexión con la base de datos. Revisa tu internet e inténtalo de nuevo.":"Can't reach the database. Check your connection and try again.",
    "Registrar":"Record","Categorías":"Categories","Gráficos":"Charts","Analytics":"Analytics","Finanzas personales":"Personal finances",
    "Registrar movimientos":"Record transactions","Controla ingresos, gastos y ahorro.":"Track income, expenses and savings.",
    "Exportar respaldo":"Export backup","Importar respaldo":"Import backup","Filtros":"Filters","Mes":"Month","Año":"Year",
    "Ingresos":"Income","Gastos fijos":"Fixed expenses","Variables":"Variable","Ahorro":"Savings",
    "Registrar ingreso o gasto":"Add income or expense","Fecha":"Date","Tipo":"Type","Categoría":"Category","Monto":"Amount","Descripción":"Description",
    "Ingreso":"Income","Gasto fijo recurrente":"Recurring fixed expense","Gasto variable":"Variable expense",
    "Agregar":"Add","Cancelar edición":"Cancel edit","Cancelar":"Cancel","Editar":"Edit","Eliminar":"Delete","Acción":"Action",
    "Gráfico del mes":"Month chart","Detalle del mes":"Month detail","Movimientos del mes":"Month transactions",
    "Administrar categorías":"Manage categories","Nombre":"Name","Agregar categoría":"Add category","Lista de categorías":"Category list","Uso":"Usage",
    "Primero crea una categoría":"Create a category first",
    "Distribución mensual":"Monthly breakdown","Gasto por categoría":"Spending by category","Tendencia de gastos y ahorro":"Spending and savings trend",
    "Pareto de gastos":"Spending Pareto","Ahorro acumulado anual":"Cumulative yearly savings","Panel financiero ejecutivo":"Financial dashboard",
    "Top categorías del mes":"Top categories this month","Regla 50/30/20":"50/30/20 rule","Promedios anuales":"Yearly averages","Proyección anual":"Yearly projection",
    "Score financiero":"Financial score","Calidad de datos":"Data quality","Plan de optimización":"Optimization plan","Alertas de gasto":"Spending alerts",
    "Sugerencias automáticas":"Automatic suggestions","Insights generales":"General insights","Compromisos recurrentes":"Recurring commitments",
    "Hogar":"Household","Crear hogar":"Create household","Unirme":"Join","Unirme a un hogar":"Join a household","Salir del hogar":"Leave household",
    "Nombre del hogar":"Household name","Código de invitación":"Invitation code","Personal":"Personal",
    "Comparte ingresos y gastos con otras personas (pareja, familia). Cada una usa su cuenta y todas ven los mismos datos del hogar.":"Share income and expenses with other people (partner, family). Everyone uses their own account and sees the same household data.",
    "Código de invitación (compártelo con quien quieras agregar):":"Invitation code (share it with whoever you want to add):",
    "Usa el selector Personal/Hogar de arriba para cambiar entre tus datos y los del hogar.":"Use the Personal/Household selector above to switch between your data and the household's.",
    "Ya perteneces a un hogar.":"You already belong to a household.","Código de invitación no válido.":"Invalid invitation code.",
    "← Volver al inicio":"← Back to home",
    "Resumen de gastos":"Spending breakdown","Gasto total":"Total spending","Ver funciones":"See features",
    "La base de datos no está actualizada: ejecuta supabase/hogar.sql en el SQL Editor de Supabase.":"The database is out of date: run supabase/hogar.sql in the Supabase SQL Editor.",
    "Eliminar solo este mes":"Delete this month only","Eliminar serie":"Delete series","Guardar cambios":"Save changes",
    "Editar este mes":"Edit this month","Editar serie":"Edit series","Quitar cambio del mes":"Remove this month's change","Guardar cambio de este mes":"Save this month's change",
    /* landing */
    "Funciones":"Features","Cómo funciona":"How it works","Preguntas":"FAQ","Empezar gratis":"Start free","Ya tengo cuenta":"I already have an account",
    "Finanzas personales, sin complicaciones":"Personal finance, made simple","Domina tu dinero":"Master your money","con claridad":"with clarity",
    "Registra ingresos y gastos, automatiza tus pagos fijos y entiende a dónde va cada peso. Gratis, en tu navegador y en tu celular.":"Track income and expenses, automate recurring bills and see where every dollar goes. Free, in your browser and on your phone.",
    "Gratis · Sin tarjeta · Web, Android y iPhone":"Free · No card needed · Web, Android and iPhone","Gastos":"Expenses","Ahorro del mes":"Monthly savings","Ingresos y gastos":"Income and expenses",
    "100%":"100%","Gratis":"Free","Un solo sistema":"One system","Español e inglés":"Spanish and English","Privado":"Private","Datos protegidos por usuario":"Data protected per user",
    "Todo lo que necesitas para tomar el control":"Everything you need to take control","Herramientas simples, análisis de nivel profesional.":"Simple tools, professional-grade insights.",
    "Gastos recurrentes":"Recurring expenses","Registra la renta o el internet una vez y se repite cada mes. Ajusta un mes sin afectar los demás.":"Record rent or internet once and it repeats every month. Adjust one month without affecting the others.",
    "Gráficos y análisis":"Charts and analytics","Tendencias, Pareto 80/20, regla 50/30/20 y un puntaje financiero para decidir mejor.":"Trends, 80/20 Pareto, the 50/30/20 rule and a financial score to decide better.",
    "Todos tus dispositivos":"All your devices","Tus datos viven en la nube y se sincronizan entre computadora, Android y iPhone.":"Your data lives in the cloud and syncs across computer, Android and iPhone.",
    "Privado y seguro":"Private and secure","Cada usuario ve solo su información, protegida con inicio de sesión.":"Each user only sees their own information, protected by login.",
    "Modo hogar":"Household mode","Comparte ingresos y gastos con tu pareja o familia en un espacio común.":"Share income and expenses with your partner or family in a common space.",
    "Respaldo y exportación":"Backup and export","Exporta tus datos en un archivo cuando quieras.":"Export your data to a file whenever you want.",
    "Empieza en tres pasos":"Get started in three steps","Crea tu cuenta":"Create your account","Regístrate con tu correo en menos de un minuto.":"Sign up with your email in under a minute.",
    "Registra tus movimientos":"Record your transactions","Anota ingresos, gastos fijos y variables.":"Log income, fixed and variable expenses.",
    "Entiende tu dinero":"Understand your money","Mira gráficos y recomendaciones al instante.":"See charts and recommendations instantly.",
    "Finanzas en pareja o en familia":"Finances as a couple or family","Crea un hogar, comparte el código de invitación y todos verán los mismos movimientos al instante. Tus datos personales siguen siendo solo tuyos.":"Create a household, share the invitation code and everyone sees the same transactions instantly. Your personal data stays yours alone.",
    "Actualización en tiempo real":"Real-time updates","Cada persona con su propia cuenta":"Everyone with their own account","Cambia entre Personal y Hogar con un toque":"Switch between Personal and Household in one tap",
    "Preguntas frecuentes":"Frequently asked questions","¿Es gratis?":"Is it free?","Sí. Puedes crear tu cuenta y usar Monetra sin costo.":"Yes. You can create your account and use Monetra at no cost.",
    "¿Mis datos son privados?":"Is my data private?","Sí. Cada cuenta ve solo su información; el hogar solo se comparte con quien tenga tu código.":"Yes. Each account only sees its own information; a household is only shared with whoever has your code.",
    "¿Funciona sin internet?":"Does it work offline?","Necesitas conexión para guardar y sincronizar tus movimientos.":"You need a connection to save and sync your transactions.",
    "¿Puedo instalarla en mi celular?":"Can I install it on my phone?","Sí: en Android como app y en iPhone desde Safari con “Añadir a pantalla de inicio”.":"Yes: on Android as an app and on iPhone from Safari with “Add to Home Screen”.",
    "Empieza a ordenar tus finanzas hoy":"Start organizing your finances today","© 2026 Monetra. Todos los derechos reservados.":"© 2026 Monetra. All rights reserved.","← Inicio":"← Home"
  };
  let lang = localStorage.getItem("mb_lang");
  if (!lang) lang = (navigator.language || "es").toLowerCase().startsWith("en") ? "en" : "es";
  const T = s => (lang === "en" && EN[s]) || s;
  let busy = false;

  function translateNode(n) {
    if (lang !== "en" || !n || (n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11)) return;
    busy = true;
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    let x;
    while ((x = w.nextNode())) {
      const k = x.nodeValue.trim();
      if (k && EN[k]) x.nodeValue = x.nodeValue.replace(k, EN[k]);
    }
    (n.querySelectorAll ? n.querySelectorAll("[placeholder],[title]") : []).forEach(e => {
      ["placeholder", "title"].forEach(a => { const v = e.getAttribute(a); if (v && EN[v]) e.setAttribute(a, EN[v]); });
    });
    busy = false;
  }

  document.documentElement.lang = lang;
  window.T = T;
  window.I18n = { lang, T, setLang(l) { localStorage.setItem("mb_lang", l); location.reload(); } };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-lang-toggle]").forEach(b => {
      b.textContent = lang === "en" ? "Español" : "English";
      b.addEventListener("click", () => I18n.setLang(lang === "en" ? "es" : "en"));
    });
    if (lang === "en") document.querySelectorAll("[data-en]").forEach(e => { e.textContent = e.dataset.en; });
    translateNode(document.body);
    if (lang === "en") new MutationObserver(ms => {
      if (busy) return;
      ms.forEach(m => { m.addedNodes.forEach(a => translateNode(a.nodeType === 3 ? a.parentNode : a)); if (m.type === "characterData") translateNode(m.target.parentNode); });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
