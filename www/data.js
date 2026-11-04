/*
 * Capa de datos de Monetra con base de datos en la nube (Supabase).
 * Mantiene las mismas funciones que usa app.js; la seguridad la dan el inicio de sesión
 * y las reglas de acceso (RLS) configuradas en supabase/setup.sql.
 */
(function () {
  const cfg = window.APP_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
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
    if (/household_id|households|household_members/.test(msg) || error.code === "42703" || error.code === "42P01" || error.code === "PGRST205") {
      return new Error("La base de datos no está actualizada: ejecuta supabase/hogar.sql en el SQL Editor de Supabase.");
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

  async function signUp(email, password, lang) {
    const res = await client.auth.signUp({
      email: email.trim(), password,
      options: { data: { lang }, emailRedirectTo: location.origin + location.pathname }
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

  window.Data = {
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
    importDB
  };
})();
