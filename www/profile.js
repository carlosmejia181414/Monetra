/* Monetra - perfil de usuario: nombre, foto, menú de cuenta y saludo. */
(function () {
  const $ = id => document.getElementById(id);
  const GREET = { es: "Hola", en: "Hello", fr: "Bonjour" };
  let profile = null;

  const displayName = p => (p && (p.name || (p.email || "").split("@")[0])) || "";
  function initials(p) {
    const parts = (displayName(p) || "?").trim().split(/[\s._-]+/).filter(Boolean);
    return (((parts[0] || "?")[0] || "") + ((parts[1] || "")[0] || "")).toUpperCase();
  }

  function paint(el, p) {
    if (!el) return;
    el.classList.remove("has-img");
    el.textContent = initials(p);
    if (!p || !p.avatarUrl) return;
    const img = new Image();
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.onload = () => { el.textContent = ""; el.appendChild(img); el.classList.add("has-img"); };
    img.src = p.avatarUrl;
  }

  function say(text, bad) {
    const m = $("profMsg");
    if (!m) return;
    m.textContent = text || "";
    m.classList.toggle("bad", !!bad);
  }

  function render() {
    const name = displayName(profile);
    ["chipAvatar", "sideAvatar", "profAvatar"].forEach(id => paint($(id), profile));
    $("chipName").textContent = name;
    $("sideName").textContent = name;
    $("sideEmail").textContent = profile.email;
    $("greeting").textContent = (GREET[I18n.lang] || GREET.es) + ", " + name.split(" ")[0];
    $("profName").value = profile.name || "";
    $("profEmail").textContent = profile.email;
    $("profProvider").textContent = profile.provider === "google" ? "Cuenta de Google" : "Cuenta con correo y contraseña";
    $("profRemove").classList.toggle("hidden", !profile.avatarUrl);
  }

  async function load() {
    try {
      profile = await Data.getProfile();
      render();
      if (!profile.ready) say(T("Para guardar tu nombre y foto ejecuta supabase/perfil.sql en Supabase."), true);
    } catch (e) {
      console.error(e);
    }
  }

  // ---- foto: recorte cuadrado 256x256 en JPG antes de subir ----
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")); };
      img.src = url;
    });
  }

  async function toSquareJpeg(file, size) {
    let src;
    try { src = window.createImageBitmap ? await createImageBitmap(file) : await loadImage(file); }
    catch (e) { src = await loadImage(file); }
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, s = Math.min(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, size, size);
    return new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen."))), "image/jpeg", 0.88));
  }

  async function onPickPhoto(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      say(T("Elige una imagen JPG, PNG o WebP de hasta 10 MB."), true);
      return;
    }
    try {
      say(T("Subiendo foto..."));
      const blob = await toSquareJpeg(file, 256);
      profile.avatarUrl = await Data.uploadAvatar(blob);
      profile.ready = true;
      render();
      say(T("Foto actualizada."));
    } catch (e) {
      say(T(e.message || "No se pudo subir la foto."), true);
    }
  }

  async function onRemovePhoto() {
    try {
      await Data.removeAvatar();
      const fresh = await Data.getProfile();
      profile.avatarUrl = fresh.avatarUrl;
      render();
      say(T("Foto eliminada."));
    } catch (e) {
      say(T(e.message || "No se pudo eliminar la foto."), true);
    }
  }

  async function onSaveName(event) {
    event.preventDefault();
    try {
      await Data.saveProfile({ displayName: $("profName").value });
      profile.name = $("profName").value.trim();
      render();
      say(T("Perfil guardado."));
    } catch (e) {
      say(T(e.message || "No se pudo guardar el perfil."), true);
    }
  }

  // ---- menú de cuenta ----
  function toggleMenu(open) {
    const menu = $("userMenu");
    const show = typeof open === "boolean" ? open : menu.classList.contains("hidden");
    menu.classList.toggle("hidden", !show);
    $("userChip").setAttribute("aria-expanded", String(show));
  }

  function goProfile() {
    toggleMenu(false);
    const btn = document.querySelector('.nav-btn[data-section="profileSection"]');
    if (btn) btn.click();
  }

  function init() {
    if (!$("userChip")) return;
    $("userChip").addEventListener("click", e => { e.stopPropagation(); toggleMenu(); });
    document.addEventListener("click", e => { if (!e.target.closest("#userWrap")) toggleMenu(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") toggleMenu(false); });
    $("menuProfile").addEventListener("click", goProfile);
    $("sideProfile").addEventListener("click", goProfile);
    $("profChange").addEventListener("click", () => $("profFile").click());
    $("profFile").addEventListener("change", onPickPhoto);
    $("profRemove").addEventListener("click", onRemovePhoto);
    $("profForm").addEventListener("submit", onSaveName);
    $("profLogout").addEventListener("click", () => $("logoutBtn").click());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  document.addEventListener("monetra:ready", load);
  document.addEventListener("monetra:logout", () => { profile = null; toggleMenu(false); });
})();
