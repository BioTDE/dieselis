/* ===========================================================
   DIESELIS — capa de datos sobre GitHub
   Sin base de datos y sin dependencias externas.

   Lectura pública : el navegador baja datos/productos.json
                     directamente del sitio.
   Escritura       : API de GitHub. Cada cambio es un commit.
   Permisos        : quien tenga un token con permiso de
                     escritura en el repositorio.
   =========================================================== */

export const conf = window.CONFIG;
const GH = conf.github;
const API = "https://api.github.com";
const CLAVE_TOKEN = "dieselis:token";

/* ---------- token ---------- */

export const obtenerToken = () => localStorage.getItem(CLAVE_TOKEN) || "";
export const guardarToken = (t) => localStorage.setItem(CLAVE_TOKEN, t);
export const olvidarToken = () => localStorage.removeItem(CLAVE_TOKEN);

export const configurado = () => GH.usuario && !GH.usuario.startsWith("TU-USUARIO");

/* ---------- utilidades base64 con acentos ---------- */

function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function deBase64(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* ---------- llamadas a la API ---------- */

async function api(ruta, opciones = {}) {
  const token = opciones.token ?? obtenerToken();

  const resp = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers || {}),
    },
  });

  if (resp.status === 401) throw new Error("El token no es válido o ya expiró.");
  if (resp.status === 403) throw new Error("El token no tiene permiso de escritura en el repositorio.");
  if (resp.status === 409)
    throw new Error("Alguien más guardó un cambio hace un momento. Recarga la página y vuelve a intentar.");
  if (resp.status === 404)
    throw new Error("No se encontró el repositorio o el archivo. Revisa 'github' en config.js.");

  if (!resp.ok) {
    let detalle = "";
    try { detalle = (await resp.json()).message || ""; } catch {}
    throw new Error(`GitHub respondió ${resp.status}. ${detalle}`);
  }

  return resp.status === 204 ? null : resp.json();
}

const rutaContenido = (archivo) =>
  `/repos/${GH.usuario}/${GH.repo}/contents/${archivo}`;

/* ---------- sesión ---------- */

/** Confirma que el token sirve Y que tiene permiso de escritura. */
export async function verificarToken(token) {
  const usuario = await api("/user", { token });
  const repo = await api(`/repos/${GH.usuario}/${GH.repo}`, { token });

  if (!repo.permissions?.push) {
    throw new Error(
      `La cuenta ${usuario.login} no tiene permiso para modificar ${GH.usuario}/${GH.repo}.`
    );
  }
  return { login: usuario.login, avatar: usuario.avatar_url };
}

/* ---------- lectura ---------- */

/** Catálogo para el sitio público: se baja del propio sitio.
 *  No consume cuota de la API y va por CDN, así que es rápido. */
export async function listarProductos() {
  const resp = await fetch(`${GH.archivoDatos}?v=${Date.now()}`, { cache: "no-cache" });
  if (!resp.ok) throw new Error("No se pudo cargar el catálogo.");
  const datos = await resp.json();
  return {
    productos: (datos.productos || []).filter((p) => p.visible !== false),
    categorias: datos.categorias || [],
  };
}

/** Catálogo para el panel: se lee de la API para tener la
 *  versión más reciente (el sitio tarda ~1 min en actualizarse)
 *  y para obtener el 'sha', que hace falta para poder guardar. */
export async function leerCatalogo() {
  const archivo = await api(`${rutaContenido(GH.archivoDatos)}?ref=${GH.rama}`);
  const datos = JSON.parse(deBase64(archivo.content));
  return {
    productos: datos.productos || [],
    categorias: datos.categorias || [],
    sha: archivo.sha,
  };
}

/* ---------- escritura ---------- */

export async function guardarCatalogo({ productos, categorias, sha }, mensaje) {
  const cuerpo = {
    actualizado: new Date().toISOString().slice(0, 10),
    categorias: [...new Set([...(categorias || []), ...productos.map((p) => p.categoria)])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "es")),
    productos,
  };

  const resp = await api(rutaContenido(GH.archivoDatos), {
    method: "PUT",
    body: JSON.stringify({
      message: mensaje,
      content: aBase64(JSON.stringify(cuerpo, null, 2) + "\n"),
      sha,
      branch: GH.rama,
    }),
  });

  return resp.content.sha;   // el sha nuevo, para el siguiente guardado
}

/* ---------- fotos ---------- */

/** Reduce la imagen antes de subirla: el repositorio guarda cada
 *  versión para siempre, así que subir un JPEG de 5 MB se paga
 *  en peso para siempre. */
export function reducirImagen(archivo, ladoMax = conf.anchoFoto) {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(img.width * escala);
      lienzo.height = Math.round(img.height * escala);
      lienzo.getContext("2d").drawImage(img, 0, 0, lienzo.width, lienzo.height);
      lienzo.toBlob((blob) => (blob ? ok(blob) : mal(new Error("No se pudo procesar la imagen."))),
        "image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => mal(new Error("El archivo no parece ser una imagen."));
    img.src = URL.createObjectURL(archivo);
  });
}

export async function subirFoto(archivo, parte) {
  const blob = await reducirImagen(archivo);

  if (blob.size > 1.4 * 1024 * 1024) {
    throw new Error("La foto sigue pesando demasiado. Prueba con una imagen más chica.");
  }

  const b64 = await new Promise((ok, mal) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(",")[1]);
    fr.onerror = mal;
    fr.readAsDataURL(blob);
  });

  const nombre = `${slug(parte)}-${Date.now()}.jpg`;
  const ruta = `${GH.carpetaFotos}/${nombre}`;

  await api(rutaContenido(ruta), {
    method: "PUT",
    body: JSON.stringify({
      message: `Foto de ${parte}`,
      content: b64,
      branch: GH.rama,
    }),
  });

  return ruta;   // ruta relativa: funciona igual en el sitio y en el PDF
}

const slug = (s) =>
  String(s || "parte")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Siguiente id disponible, para no repetir. */
export function siguienteId(productos) {
  const max = productos.reduce((n, p) => {
    const m = /^p(\d+)$/.exec(p.id || "");
    return m ? Math.max(n, Number(m[1])) : n;
  }, 0);
  return `p${String(max + 1).padStart(4, "0")}`;
}

/* ---------- utilidades compartidas ---------- */

export const ETIQUETA_EXISTENCIA = {
  "en-stock": "En existencia",
  pedido: "Sobre pedido",
  agotado: "Agotado",
};

export const dinero = (n) =>
  new Intl.NumberFormat(conf.local, {
    style: "currency",
    currency: conf.moneda,
    maximumFractionDigits: 0,
  }).format(n);

export const normalizar = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

export function enlaceWhatsApp(texto) {
  return `https://wa.me/${conf.whatsapp}?text=${encodeURIComponent(texto)}`;
}
