/*
 * Capa de datos de Monetra con base de datos en la nube (Supabase).
 * Mantiene las mismas funciones que usa app.js; la seguridad la dan el inicio de sesión
 * y las reglas de acceso (RLS) configuradas en supabase/setup.sql.
 */
(function () {
  const cfg = window.APP_CONFIG || {};
  const placeholder = /PEGA|TU-PROYECTO|TU_CLAVE/i.test(String(cfg.SUPABASE_URL) + String(cfg.SUPABASE_ANON_KEY));
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) && !placeholder;
  const client = configured
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;

  const PAGE = 1000;
  let scope = localStorage.getItem("mb_scope") || "personal";
  const scoped = q => (scope === "personal" ? q.is("household_id", null) : q.eq("household_id", scope));
  const hid = () => (scope === "personal" ? null : scope);
  let channel = null;

  function friendly(error, fallback) {
    if (!error) return new Error(fallback || "Error desconocido.");
    const msg = String(error.message || "");
    if (error.code === "23505") return new Error("Ya existe una categoría con ese nombre y tipo.");
    if (error.code === "23503") return new Error("No puedes eliminar esta categoría porque tiene movimientos registrados.");
    if (error.code === "42501" || /row-level security/i.test(msg)) {
      return new Error("Tu cuenta no tiene permiso para guardar datos. ");
    }
    if (/bucket not found/i.test(msg) || (error.code === "PGRST205" && /profiles/.test(msg))) {
      return new Error("Falta ejecutar supabase/perfil.sql en el SQL Editor de Supabase.");
    }
    if (/limit_goals/.test(msg)) { const e = new Error("Llegaste al límite de metas del plan Gratis."); e.code = "limit_goals"; return e; }
    if (/\bgoals\b|goal_contributions/.test(msg) && (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST200")) {
      return new Error("Falta ejecutar supabase/v10-metas.sql en el SQL Editor de Supabase.");
    }
    if (/household_id|households|household_members/.test(msg) || error.code === "42703" || error.code === "42P01" || error.code === "PGRST205") {
      return new Error("La base de datos no está actualizada: ejecuta supabase/hogar.sql en el SQL Editor de Supabase.");
    }
    if (/limit_categories/.test(msg)) { const e = new Error("Llegaste al límite de categorías del plan Gratis."); e.code = "limit_categories"; return e; }
    if (/pro_required/.test(msg)) { const e = new Error("Crear un hogar compartido es una función del plan Pro."); e.code = "pro_required"; return e; }
    if (/currency/i.test(msg) && (error.code === "PGRST204" || error.code === "42703")) {
      return new Error("La base de datos no está actualizada: ejecuta supabase/plan.sql en el SQL Editor de Supabase.");
    }
    if (/already_in_household/.test(msg)) return new Error("Ya perteneces a un hogar.");
    if (/invalid_code/.test(msg)) return new Error("Código de invitación no válido.");
    if (/Invalid login credentials/i.test(msg)) return new Error("Correo o contraseña incorrectos.");
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return new Error("Sin conexión con la base de datos. Revisa tu internet e inténtalo de nuevo.");
    }
    return new Error(fallback ? fallback + " (" + msg + ")" : msg || "Error desconocido.");
  }

  function check(result, fallback) {
    if (result.error) throw friendly(result.error, fallback);
    return result.data;
  }

  const catFromRow = r => ({ id: r.id, name: r.name, kind: r.kind });

  const txFromRow = r => ({
    id: r.id,
    date: r.date,
    type: r.type,
    categoryId: r.category_id,
    amount: Number(r.amount),
    description: r.description || "",
    currency: r.currency || null,
    parentRecurringId: r.parent_recurring_id || null,
    overrideYear: Number.isInteger(r.override_year) ? r.override_year : null,
    overrideMonth: Number.isInteger(r.override_month) ? r.override_month : null
  });

  async function fetchAll(table, orderCol) {
    let from = 0;
    const rows = [];
    for (;;) {
      const res = await scoped(client.from(table).select("*")).order(orderCol, { ascending: true }).order("id").range(from, from + PAGE - 1);
      const page = check(res, "No se pudieron leer los datos");
      rows.push(...page);
      if (page.length < PAGE) break;
      from += PAGE;
    }
    return rows;
  }

  // ---------- Sesión ----------
  const isConfigured = () => configured;

  async function getSession() {
    const { data } = await client.auth.getSession();
    return data.session;
  }

  async function signIn(email, password) {
    const res = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (res.error) throw friendly(res.error);
  }

  async function signOut() {
    unsubscribe();
    await client.auth.signOut();
  }

  async function signUp(email, password, lang, name) {
    const res = await client.auth.signUp({
      email: email.trim(), password,
      options: { data: { lang, full_name: String(name || "").trim().slice(0, 60) }, emailRedirectTo: location.origin + location.pathname }
    });
    if (res.error) throw friendly(res.error);
    return res.data.session ? "session" : "confirm";
  }

  async function signInWithGoogle() {
    const res = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } }
    });
    if (res.error) throw friendly(res.error);
  }

  async function resetPassword(email) {
    const res = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname });
    if (res.error) throw friendly(res.error);
  }

  async function updatePassword(password) {
    const res = await client.auth.updateUser({ password });
    if (res.error) throw friendly(res.error);
  }

  const onAuth = cb => client.auth.onAuthStateChange((event) => cb(event));

  // ---------- Tiempo real ----------
  function subscribe(onChange) {
    unsubscribe();
    channel = client
      .channel("monetra-cambios")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, onChange)
      .subscribe();
  }

  function unsubscribe() {
    if (channel) {
      client.removeChannel(channel);
      channel = null;
    }
  }

  // ---------- Datos ----------
  async function getDB() {
    const [cats, txs] = await Promise.all([fetchAll("categories", "name"), fetchAll("transactions", "date")]);
    return { categories: cats.map(catFromRow), transactions: txs.map(txFromRow) };
  }

  async function createTransaction(t) {
    const res = await client
      .from("transactions")
      .insert({
        household_id: hid(),
        date: t.date,
        type: t.type,
        category_id: t.categoryId,
        amount: Number(t.amount),
        description: t.description || "",
        currency: t.currency || null,
        parent_recurring_id: t.parentRecurringId || null,
        override_year: Number.isInteger(t.overrideYear) ? t.overrideYear : null,
        override_month: Number.isInteger(t.overrideMonth) ? t.overrideMonth : null
      })
      .select()
      .single();
    return txFromRow(check(res, "No se pudo guardar el movimiento"));
  }

  async function updateTransaction(id, u) {
    const patch = {
      date: u.date,
      type: u.type,
      category_id: u.categoryId,
      amount: Number(u.amount),
      description: u.description || ""
    };
    if (u.currency) patch.currency = u.currency;
    // Igual que antes: estos campos solo se cambian si vienen informados.
    if (u.parentRecurringId) patch.parent_recurring_id = u.parentRecurringId;
    if (Number.isInteger(u.overrideYear)) patch.override_year = u.overrideYear;
    if (Number.isInteger(u.overrideMonth)) patch.override_month = u.overrideMonth;

    const res = await client.from("transactions").update(patch).eq("id", id).select().single();
    return txFromRow(check(res, "No se pudo actualizar el movimiento"));
  }

  async function deleteTransaction(id) {
    check(await client.from("transactions").delete().eq("id", id), "No se pudo eliminar el movimiento");
    return { success: true };
  }

  async function createCategory(c) {
    if (!c.name || !c.name.trim() || !c.kind) throw new Error("Debes ingresar nombre y tipo de categoría.");
    const res = await client.from("categories").insert({ name: c.name.trim(), kind: c.kind, household_id: hid() }).select().single();
    return catFromRow(check(res, "No se pudo guardar la categoría"));
  }

  async function updateCategory(id, u) {
    if (!u.name || !u.name.trim() || !u.kind) throw new Error("Debes ingresar nombre y tipo de categoría.");
    const res = await client.from("categories").update({ name: u.name.trim(), kind: u.kind }).eq("id", id).select().single();
    const cat = catFromRow(check(res, "No se pudo actualizar la categoría"));
    check(await client.from("transactions").update({ type: u.kind }).eq("category_id", id), "No se pudieron actualizar los movimientos");
    return cat;
  }

  async function deleteCategory(id) {
    const used = await client.from("transactions").select("id", { count: "exact", head: true }).eq("category_id", id);
    if (used.error) throw friendly(used.error);
    if (used.count > 0) throw new Error("No puedes eliminar esta categoría porque tiene movimientos registrados.");
    check(await client.from("categories").delete().eq("id", id), "No se pudo eliminar la categoría");
    return { success: true };
  }

  // Importar un respaldo = FUSIONAR: agrega lo que falta, no borra nada y no duplica
  // si importas el mismo archivo dos veces (los movimientos se identifican por su id).
  async function importDB(raw) {
    if (!raw || !Array.isArray(raw.categories) || !Array.isArray(raw.transactions)) {
      throw new Error("El archivo no tiene el formato de respaldo de Monetra.");
    }

    const session = await getSession();
    const prefix = (scope === "personal" ? session.user.id : scope).slice(0, 8) + "_";
    const current = await fetchAll("categories", "name");
    const key = c => c.name.trim().toLowerCase() + "|" + c.kind;
    const byKey = new Map(current.map(c => [key(c), c.id]));
    const byId = new Set(current.map(c => c.id));
    const idMap = new Map();
    const toInsert = [];

    for (const c of raw.categories) {
      if (!c || !c.name || !c.kind) continue;
      const existingId = byKey.get(key(c));
      if (existingId) {
        idMap.set(c.id, existingId);
      } else {
        const newId = prefix + (c.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "" + Math.random()));
        idMap.set(c.id, newId);
        byKey.set(key(c), newId);
        byId.add(newId);
        toInsert.push({ id: newId, name: c.name.trim(), kind: c.kind, household_id: hid() });
      }
    }
    if (toInsert.length) check(await client.from("categories").insert(toInsert), "No se pudieron importar las categorías");

    const rows = raw.transactions
      .filter(t => t && t.id && t.date && idMap.has(t.categoryId) && Number.isFinite(Number(t.amount)))
      .map(t => ({
        id: prefix + t.id,
        household_id: hid(),
        date: t.date,
        type: t.type,
        category_id: idMap.get(t.categoryId),
        amount: Number(t.amount),
        description: t.description || "",
        currency: /^[A-Z]{3}$/.test(String(t.currency || "")) ? t.currency : null,
        parent_recurring_id: t.parentRecurringId || null,
        override_year: Number.isInteger(t.overrideYear) ? t.overrideYear : null,
        override_month: Number.isInteger(t.overrideMonth) ? t.overrideMonth : null
      }));

    for (let i = 0; i < rows.length; i += 500) {
      check(await client.from("transactions").upsert(rows.slice(i, i + 500), { onConflict: "id" }), "No se pudieron importar los movimientos");
    }
    return { categories: toInsert.length, transactions: rows.length, skipped: raw.transactions.length - rows.length };
  }

  async function getHousehold() {
    const res = await client.from("households").select("id,name,invite_code").maybeSingle();
    if (res.error) throw friendly(res.error);
    if (!res.data) return null;
    const cnt = await client.from("household_members").select("user_id", { count: "exact", head: true }).eq("household_id", res.data.id);
    return { ...res.data, members: cnt.count || 1 };
  }

  // ---------- Asesor IA y administrador ----------
  async function askAdvisor(payload) {
    const res = await client.functions.invoke("ai-advisor", { body: payload });
    if (res.error) {
      let msg = res.error.message || "", code = "";
      try { const j = await res.error.context.json(); if (j && j.error) msg = j.error; if (j && j.code) code = j.code; } catch (e) {}
      if (/not found|404|failed to send/i.test(msg)) msg = "La función ai-advisor aún no está publicada en Supabase (ver GUIA-INSTALACION.md, paso del asesor IA).";
      const err = new Error(msg || "No se pudo consultar a la IA.");
      err.code = code;
      throw err;
    }
    if (res.data && res.data.error) throw new Error(res.data.error);
    return res.data;
  }

  // Última recomendación del asesor IA (una por usuario; la nueva reemplaza a la anterior)
  async function getLastAdvice() {
    try {
      const u = await sessionUser();
      const r = await client.from("ai_last").select("advice,month,lang,created_at").eq("user_id", u.id).maybeSingle();
      if (r.error) return null; // tabla ausente: se ignora
      return r.data || null;
    } catch (e) { return null; }
  }
  async function saveLastAdvice(advice, month, lang) {
    try {
      const u = await sessionUser();
      const row = { user_id: u.id, advice: String(advice).slice(0, 20000), month: month || null, lang: lang || null, created_at: new Date().toISOString() };
      const r = await client.from("ai_last").upsert(row, { onConflict: "user_id" }).select("created_at").maybeSingle();
      return r.error ? null : row.created_at;
    } catch (e) { return null; }
  }

  async function isAdmin() {
    const u = await sessionUser();
    const r = await client.from("admins").select("user_id").eq("user_id", u.id).maybeSingle();
    return !r.error && !!r.data;
  }

  async function adminStats(from, to, tz) {
    return check(await client.rpc("admin_stats", { p_from: from, p_to: to, p_tz: tz || "UTC" }), "No se pudieron cargar las estadísticas");
  }
  async function adminGeo(from, to) {
    const r = await client.rpc("admin_geo", { p_from: from, p_to: to });
    return r.error ? null : r.data; // null si falta v9.sql
  }
  async function setMyCountry(code) {
    try { await client.rpc("set_my_country", { p_country: code }); } catch (e) {}
  }

  async function adminUsers(limit, offset, search) {
    return check(await client.rpc("admin_users", { p_limit: limit || 25, p_offset: offset || 0, p_search: search || "" }), "No se pudo cargar la lista de usuarios");
  }

  // ---------- Planes (Gratis / Pro) y escaneo de boletas ----------
  // Devuelve null si plan.sql aún no está instalado: la app entonces no aplica límites.
  async function myPlan() {
    const res = await client.rpc("my_plan");
    return res.error ? null : res.data;
  }
  async function adminPlans() {
    const res = await client.rpc("admin_plans");
    return res.error ? [] : res.data || [];
  }
  async function adminSetPlan(email, plan, days) {
    return check(await client.rpc("admin_set_plan", { p_email: email, p_plan: plan, p_days: days == null ? null : days }), "No se pudo cambiar el plan");
  }
  async function scanReceipt(payload) {
    const res = await client.functions.invoke("receipt-scan", { body: payload });
    if (res.error) {
      let msg = res.error.message || "", code = "";
      try { const j = await res.error.context.json(); if (j && j.error) msg = j.error; if (j && j.code) code = j.code; } catch (e) {}
      if (/not found|404|failed to send/i.test(msg)) msg = "La función receipt-scan aún no está publicada en Supabase (ver ACTUALIZAR-V8.md).";
      const err = new Error(msg || "No se pudo leer la boleta.");
      err.code = code;
      throw err;
    }
    if (res.data && res.data.error) { const e = new Error(res.data.error); e.code = res.data.code || ""; throw e; }
    return res.data;
  }

  const setScope = s => { scope = s; localStorage.setItem("mb_scope", s); };
  const getScope = () => scope;

  async function createHousehold(name, lang) {
    return check(await client.rpc("create_household", { p_name: name, p_lang: lang }), "No se pudo crear el hogar");
  }
  async function joinHousehold(code) {
    return check(await client.rpc("join_household", { p_code: code }), "No se pudo unir al hogar");
  }
  async function leaveHousehold() {
    check(await client.rpc("leave_household"), "No se pudo salir del hogar");
    setScope("personal");
  }

  // ---------- Perfil (nombre y foto) ----------
  async function sessionUser() {
    const s = await getSession();
    if (!s) throw new Error("Sesión no válida. Vuelve a iniciar sesión.");
    return s.user;
  }

  async function getProfile() {
    const u = await sessionUser();
    const m = u.user_metadata || {};
    const base = {
      id: u.id, email: u.email || "", name: m.full_name || m.name || "", avatarUrl: m.avatar_url || m.picture || "",
      provider: (u.app_metadata && u.app_metadata.provider) || "email", ready: false
    };
    base.currency = "";
    let res = await client.from("profiles").select("display_name,avatar_url,currency").eq("user_id", u.id).maybeSingle();
    if (res.error) res = await client.from("profiles").select("display_name,avatar_url").eq("user_id", u.id).maybeSingle(); // plan.sql aún no ejecutado
    if (res.error) return base; // perfil.sql aún no ejecutado: se usan los datos de la cuenta
    base.ready = true;
    if (res.data) {
      if (res.data.currency) base.currency = res.data.currency;
      if (res.data.display_name) base.name = res.data.display_name;
      if (res.data.avatar_url) base.avatarUrl = res.data.avatar_url;
    }
    return base;
  }

  async function saveProfile(patch) {
    const u = await sessionUser();
    const row = { user_id: u.id, updated_at: new Date().toISOString() };
    if ("displayName" in patch) row.display_name = String(patch.displayName || "").trim().slice(0, 60) || null;
    if ("avatarUrl" in patch) row.avatar_url = patch.avatarUrl || null;
    if ("currency" in patch) row.currency = /^[A-Z]{3}$/.test(String(patch.currency || "")) ? patch.currency : null;
    check(await client.from("profiles").upsert(row, { onConflict: "user_id" }), "No se pudo guardar el perfil");
  }

  async function uploadAvatar(blob) {
    const u = await sessionUser();
    const path = u.id + "/avatar.jpg";
    const up = await client.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
    if (up.error) throw friendly(up.error, "No se pudo subir la foto");
    const url = client.storage.from("avatars").getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
    await saveProfile({ avatarUrl: url });
    return url;
  }

  async function removeAvatar() {
    const u = await sessionUser();
    await client.storage.from("avatars").remove([u.id + "/avatar.jpg"]);
    await saveProfile({ avatarUrl: null });
  }

  // ---------- Metas de ahorro ----------
  const goalFromRow = (r, uid) => ({
    id: r.id, name: r.name, icon: r.icon, target: Number(r.target_amount), targetDate: r.target_date || null,
    archived: !!r.archived, shared: !!r.household_id, createdAt: r.created_at,
    contributions: (r.goal_contributions || []).map(c => ({ id: c.id, amount: Number(c.amount), note: c.note || "", date: c.date, mine: c.user_id === uid }))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  });

  async function getGoals() {
    const sess = await client.auth.getSession();
    const uid = sess && sess.data && sess.data.session ? sess.data.session.user.id : null;
    const res = await scoped(client.from("goals").select("*, goal_contributions(id, amount, note, date, user_id)").order("created_at", { ascending: true }));
    return check(res, "No se pudieron cargar las metas").map(r => goalFromRow(r, uid));
  }

  async function createGoal(g) {
    const res = await client.from("goals").insert({
      household_id: hid(), name: String(g.name || "").trim(), icon: g.icon || "target",
      target_amount: Number(g.target), target_date: g.targetDate || null
    }).select("*, goal_contributions(id, amount, note, date, user_id)").single();
    return goalFromRow(check(res, "No se pudo guardar la meta"), null);
  }

  async function updateGoal(id, g) {
    const patch = {};
    if (g.name != null) patch.name = String(g.name).trim();
    if (g.icon != null) patch.icon = g.icon;
    if (g.target != null) patch.target_amount = Number(g.target);
    if (g.targetDate !== undefined) patch.target_date = g.targetDate || null;
    if (g.archived != null) patch.archived = !!g.archived;
    check(await client.from("goals").update(patch).eq("id", id), "No se pudo actualizar la meta");
    return { success: true };
  }

  async function deleteGoal(id) {
    check(await client.from("goals").delete().eq("id", id), "No se pudo eliminar la meta");
    return { success: true };
  }

  async function addGoalContribution(goalId, c) {
    check(await client.from("goal_contributions").insert({
      goal_id: goalId, amount: Number(c.amount), note: c.note || "", date: c.date
    }), "No se pudo guardar el aporte");
    return { success: true };
  }

  async function deleteGoalContribution(id) {
    check(await client.from("goal_contributions").delete().eq("id", id), "No se pudo eliminar el aporte");
    return { success: true };
  }

  window.Data = {
    getProfile, saveProfile, uploadAvatar, removeAvatar, askAdvisor, getLastAdvice, saveLastAdvice, isAdmin, adminStats, adminGeo, setMyCountry, adminUsers,
    myPlan, adminPlans, adminSetPlan, scanReceipt,
    getHousehold, setScope, getScope, createHousehold, joinHousehold, leaveHousehold,
    isConfigured,
    getSession,
    signIn,
    signOut,
    signUp,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    onAuth,
    subscribe,
    getDB,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createCategory,
    updateCategory,
    deleteCategory,
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addGoalContribution,
    deleteGoalContribution,
    importDB
  };

  // Sin configuración (config.js ausente o sin completar) las funciones fallan con un mensaje claro.
  Object.keys(window.Data).forEach(name => {
    if (name === "isConfigured" || typeof window.Data[name] !== "function") return;
    const fn = window.Data[name];
    window.Data[name] = (...args) => {
      if (!client) throw new Error("Falta configurar la base de datos (archivo config.js).");
      return fn(...args);
    };
  });
})();
