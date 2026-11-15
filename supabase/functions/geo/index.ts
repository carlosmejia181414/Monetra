// Monetra - función "geo": devuelve SOLO el código de país (ej. "CA") de quien la llama.
// No guarda ni devuelve la IP. Debe publicarse con "Verify JWT" DESACTIVADO (la usan visitantes sin sesión).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const raw = (req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const country = /^[A-Z]{2}$/.test(raw) && raw !== "XX" && raw !== "T1" ? raw : "";
  return new Response(JSON.stringify({ country }), { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
});
