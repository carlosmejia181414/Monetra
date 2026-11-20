# Evaluación de IA de Monetra

Qué cubre y cómo ejecutarlo (necesita tu clave real; por eso no se pudo correr en la revisión automática):

1. **Texto (guía + sitio):** `SUPABASE_URL=... ANON_KEY=... USER_JWT=... node run-eval.mjs` — 8 casos de precisión, 4 de alucinación, 6 de inyección/fuga y 4 de sesgo.
   - Cuando los resultados te gusten, copia `results-<fecha>.json` a `baseline.json`. En cada cambio de modelo o de prompt vuelve a correrlo: avisa regresiones.
   - Si lo corres una vez por semana, detectas **deriva** del modelo.
2. **Imágenes (escáner de boletas):** sube las 6 fotos de `images/` desde la app (Movimientos → Escanear). Esperado: 01 lee comercio/fecha/total (11.88); 02-05 leen o piden mejor foto, sin inventar números; 06 responde "no es una boleta" y **no gasta cupo**.
3. **Costo:** ~30 llamadas con el modelo económico ≈ centavos de dólar.
