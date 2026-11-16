/* Monetra - iconos automáticos según el nombre de la categoría (ES / EN / FR) e iconos de metas de ahorro. */
(function () {
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  // Orden importa: lo más específico primero. Cada regla: [emoji, expresión sobre el texto sin acentos].
  const RULES = [
    ["🏠", /\b(renta|alquiler|arriendo|rent|loyer|hipoteca|mortgage|hypotheque|vivienda|housing|logement|condominio|condo|hoa)\b/],
    ["💡", /\b(luz|electricidad|electricity|electricite|hydro|energia|energy|energie|light)\b/],
    ["💧", /\b(agua|water|eau)\b/],
    ["🔥", /\b(gas natural|natural gas|gaz naturel|calefaccion|heating|chauffage|calefaccion)\b/],
    ["⛽", /\b(gasolina|gasoil|combustible|fuel|essence|petrol|nafta|bencina|gas)\b/],
    ["🌐", /\b(internet|wifi|wi-fi|fibra|cable|fibre)\b/],
    ["📱", /\b(celular|movil|telefono|phone|mobile|cell|cellular|telephone|telefon|forfait)\b/],
    ["🛒", /\b(supermercado|super|mercado|grocer\w*|groceries|epicerie|despensa|market|compras de comida|alimentos|alimentacion|alimentation|comida|food|courses|abarrotes|bodega)\b/],
    ["🍽️", /\b(restaurante\w*|restaurant\w*|cena|dinner|diner|almuerzo|lunch|dejeuner|cafe|cafeteria|coffee|brunch|comer fuera|dining|take ?out|delivery|bar|bares)\b/],
    ["🛡️", /\b(seguro\w*|insurance|assurance)\b/],
    ["🚗", /\b(carro|auto|coche|car|voiture|vehiculo|vehicle|lavado de carro|mantenimiento del auto|auto payment|car payment)\b/],
    ["🚌", /\b(transporte|transport\w*|bus|metro|subway|tren|train|taxi|uber|lyft|pasaje|presto|opus|estacionamiento|parking|peaje|toll|commute)\b/],
    ["🦷", /\b(dentista|dentist\w*|dental|dentaire|ortodoncia|orthodont\w*)\b/],
    ["🩺", /\b(salud|health|sante|medic\w*|doctor|clinica|clinic|farmacia|pharmac\w*|hospital|medicina|medicine|terapia|therapy|psicolog\w*|vision|optica|lentes)\b/],
    ["🎓", /\b(educacion|education|escuela|school|ecole|universidad|university|universite|colegio|curso\w*|course\w*|cours|matricula|tuition|colegiatura|libros|books|livres|estudio\w*|study)\b/],
    ["🧸", /\b(hijos?|ninos?|kids?|children|enfants?|bebe|baby|guarderia|daycare|garderie|panales|diapers|escuela infantil)\b/],
    ["🐾", /\b(mascotas?|pets?|perro|dog|chien|gato|cat|chat|animal\w*|veterinari\w*|vet)\b/],
    ["🎬", /\b(ocio|entretenimiento|entertainment|divertissement|leisure|loisirs?|cine|cinema|netflix|spotify|disney|streaming|suscripci\w*|subscription\w*|abonnement\w*|juegos|games?|jeux|musica|music|musique|conciertos?|concerts?|fiesta|party|salidas|outings?)\b/],
    ["✈️", /\b(viajes?|travel\w*|voyages?|vacaciones|vacations?|vacances|vuelos?|flights?|vols?|hotel\w*|turismo|tourism)\b/],
    ["🏋️", /\b(gimnasio|gym|gimnasia|deportes?|sports?|fitness|entrenamiento|yoga|natacion|swimming)\b/],
    ["👕", /\b(ropa|clothes|clothing|vetements?|zapatos|shoes|chaussures|moda|fashion|vestimenta)\b/],
    ["🛍️", /\b(compras|shopping|achats?|tienda|store|boutique|amazon|capricho\w*)\b/],
    ["🎁", /\b(regalos?|gifts?|cadeaux?|presentes?|obsequios?)\b/],
    ["🤝", /\b(donaciones?|donations?|dons?|caridad|charity|charite|diezmo|tithe|ofrenda|iglesia|church|eglise)\b/],
    ["🧾", /\b(impuestos?|taxes?|tax|impots?|tributos?|iva|gst|hst|qst|cra|sat|sunat)\b/],
    ["💳", /\b(deudas?|debts?|dettes?|prestamos?|loans?|prets?|creditos?|credit|tarjeta\w*|cards?|cartes?|visa|mastercard|amex|cuotas?|financiamiento)\b/],
    ["🐷", /\b(ahorros?|savings?|epargne\w*|fondo de emergencia|emergency fund|inversion\w*)\b/],
    ["💈", /\b(belleza|beauty|beaute|peluquer\w*|barber\w*|salon|salon de coiffure|coiffure|hair|cabello|spa|manicure|unas|nails|cosmeticos?)\b/],
    ["🛋️", /\b(hogar|home|maison|muebles?|furniture|meubles?|decoracion|decor|limpieza|cleaning|menage|reparaciones|repairs?|reparations?|mantenimiento|maintenance)\b/],
    ["💻", /\b(tecnologia|technology|tech|electronica|electronics|electronique|computador\w*|computer\w*|ordinateur|software|apps?|hosting|dominio|domain)\b/],
    ["📦", /\b(otros?|other|others|autres?|varios|misc\w*|diversos|imprevistos|unexpected|general)\b/],
    // Ingresos
    ["💼", /\b(salario|sueldo|salary|salaire|nomina|payroll|paie|pay|paycheck|wage\w*|quincena|trabajo|work|job|empleo|honorarios)\b/],
    ["💰", /\b(extra|bonus|bono|prime|propinas?|tips?|pourboires?|comisi\w*|commission\w*|freelance|independiente|side ?hustle|ingreso extra|extra income|revenu extra)\b/],
    ["🏷️", /\b(ventas?|sales?|ventes?|negocio|business|affaires|emprendimiento)\b/],
    ["📈", /\b(dividendos?|dividends?|intereses?|interest|interets?|rendimientos?|returns?|renta variable|alquiler ingreso)\b/],
    ["↩️", /\b(reembolsos?|refunds?|remboursements?|devoluci\w*|cashback|reintegro)\b/]
  ];

  const DEFAULT = { income: "💵", fixed: "📌", variable: "🧾", savings: "🐷" };
  const cache = Object.create(null);

  function cat(name, kind) {
    const key = norm(name) + "|" + (kind || "");
    if (cache[key]) return cache[key];
    const n = norm(name);
    let out = null;
    for (let i = 0; i < RULES.length; i++) { if (RULES[i][1].test(n)) { out = RULES[i][0]; break; } }
    return (cache[key] = out || DEFAULT[kind] || "🏷️");
  }

  // Metas: clave guardada en la base (solo a-z y _) -> emoji
  const GOAL_ICONS = {
    home: "🏠", car: "🚗", plane: "✈️", shield: "🛡️", school: "🎓", ring: "💍", laptop: "💻", business: "💼",
    baby: "👶", beach: "🏖️", health: "🏥", gift: "🎁", bike: "🚲", phone: "📱", tools: "🛠️", pet: "🐾", piggy: "🐷", target: "🎯"
  };
  const goal = key => GOAL_ICONS[key] || GOAL_ICONS.target;

  window.MonetraIcons = { cat, goal, GOAL_ICONS, norm };
})();
