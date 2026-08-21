/* ===========================================================
   DIESELIS — panel de administración sobre GitHub
   Todo el catálogo vive en memoria mientras editas; cada
   acción de guardar escribe el JSON completo y hace un commit.
   =========================================================== */

import {
  conf, configurado,
  obtenerToken, guardarToken, olvidarToken, verificarToken,
  leerCatalogo, guardarCatalogo, subirFoto, siguienteId,
  dinero, normalizar, escapar, ETIQUETA_EXISTENCIA,
} from "./datos.js";
import { generarPDF } from "./pdf.js";

const $ = (id) => document.getElementById(id);

let productos = [];
let categorias = [];
let sha = null;
let editandoId = null;

/* ===========================================================
   Arranque
   =========================================================== */

async function arrancar() {
  if (!configurado()) {
    $("sinConfig").hidden = false;
    return;
  }

  const token = obtenerToken();
  if (!token) return pedirToken();

  try {
    const usuario = await verificarToken(token);
    await abrirPanel(usuario);
  } catch (e) {
    olvidarToken();
    pedirToken(e.message);
  }
}

function pedirToken(mensaje) {
  $("acceso").hidden = false;
  if (mensaje) {
    $("avisoAcceso").textContent = mensaje;
    $("avisoAcceso").hidden = false;
  }
  $("token").focus();
}

async function abrirPanel(usuario) {
  $("acceso").hidden = true;
  $("panel").hidden = false;
  $("sesionCorreo").textContent = usuario.login;
  await recargar();
}

/* ===========================================================
   Acceso por token
   =========================================================== */

$("btnEntrar").addEventListener("click", intentarEntrar);
$("token").addEventListener("keydown", (e) => {
  if (e.key === "Enter") intentarEntrar();
});

async function intentarEntrar() {
  const aviso = $("avisoAcceso");
  const btn = $("btnEntrar");
  const token = $("token").value.trim();

  aviso.hidden = true;
  if (!token) {
    aviso.textContent = "Pega tu token de GitHub.";
    aviso.hidden = false;
    return;
  }

  btn.disabled = true;
  btn.textContent = "Verificando…";

  try {
    const usuario = await verificarToken(token);
    guardarToken(token);
    $("token").value = "";
    await abrirPanel(usuario);
  } catch (e) {
    aviso.textContent = e.message;
    aviso.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}

$("btnSalir").addEventListener("click", () => {
  if (!confirm("¿Cerrar sesión? Se borra el token de este dispositivo.")) return;
  olvidarToken();
  location.reload();
});

/* ===========================================================
   Cargar y pintar
   =========================================================== */

async function recargar() {
  $("adminConteo").textContent = "Cargando catálogo…";
  try {
    const datos = await leerCatalogo();
    productos = datos.productos;
    categorias = datos.categorias;
    sha = datos.sha;
  } catch (e) {
    $("adminConteo").textContent = "Error al cargar: " + e.message;
    return;
  }
  pintarTabla();
}

function visibles() {
  const t = normalizar($("adminQ").value).trim();
  if (!t) return productos;
  return productos.filter((p) =>
    t.split(/\s+/).every((w) =>
      normalizar([p.parte, p.nombre, p.marca, p.categoria].join(" ")).includes(w)
    )
  );
}

function pintarTabla() {
  const lista = visibles();
  const cuerpo = $("adminCuerpo");

  if (!lista.length) {
    cuerpo.innerHTML = `<tr><td colspan="7" class="vacio-tabla">${
      productos.length
        ? "Ningún producto coincide con el filtro."
        : "Todavía no hay productos. Empieza con «Nuevo producto»."
    }</td></tr>`;
  } else {
    cuerpo.innerHTML = lista.map(renglon).join("");
  }

  const agotados = productos.filter((p) => p.existencia === "agotado").length;
  const ocultos = productos.filter((p) => p.visible === false).length;
  $("adminConteo").textContent =
    `${productos.length} productos · ${agotados} agotados · ${ocultos} ocultos del sitio`;

  const cats = [...new Set([...categorias, ...productos.map((p) => p.categoria)])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));
  $("listaCategorias").innerHTML = cats.map((c) => `<option value="${escapar(c)}">`).join("");
}

function renglon(p) {
  const opciones = Object.entries(ETIQUETA_EXISTENCIA)
    .map(([v, t]) => `<option value="${v}" ${p.existencia === v ? "selected" : ""}>${t}</option>`)
    .join("");

  return `<tr data-id="${escapar(p.id)}">
    <td class="celda-parte">${escapar(p.parte)}</td>
    <td class="celda-nombre">${escapar(p.nombre)}<small>${escapar(p.marca || "")}</small></td>
    <td>${escapar(p.categoria)}</td>
    <td class="celda-precio">${p.precio ? dinero(p.precio) : "—"}</td>
    <td>
      <select class="sel-existencia" data-v="${escapar(p.existencia)}"
              data-accion="existencia" aria-label="Existencia de ${escapar(p.parte)}">
        ${opciones}
      </select>
    </td>
    <td>
      <input type="checkbox" data-accion="visible" ${p.visible !== false ? "checked" : ""}
             aria-label="Mostrar ${escapar(p.parte)} en el catálogo público">
    </td>
    <td class="celda-acciones">
      <button type="button" data-accion="editar">Editar</button>
      <button type="button" class="borrar" data-accion="borrar">Eliminar</button>
    </td>
  </tr>`;
}

$("adminQ").addEventListener("input", pintarTabla);

const local = (id) => productos.find((p) => p.id === id);

/* ===========================================================
   Guardar en GitHub
   =========================================================== */

function avisarEstado(texto, tipo = "trabajando") {
  const barra = $("estadoGuardado");
  barra.textContent = texto;
  barra.className = `estado-guardado estado-guardado--${tipo}`;
  barra.hidden = false;
  if (tipo === "ok") setTimeout(() => (barra.hidden = true), 4000);
}

/** Escribe el catálogo completo y hace un commit. */
async function publicar(mensaje) {
  avisarEstado("Guardando en GitHub…");
  try {
    sha = await guardarCatalogo({ productos, categorias, sha }, mensaje);
    avisarEstado("Guardado. El sitio se actualiza en menos de un minuto.", "ok");
    return true;
  } catch (e) {
    avisarEstado("No se guardó: " + e.message, "error");
    return false;
  }
}

/* --- acciones rápidas en la tabla --- */

$("adminCuerpo").addEventListener("change", async (e) => {
  const fila = e.target.closest("tr");
  if (!fila) return;
  const p = local(fila.dataset.id);
  if (!p) return;

  const previo = { existencia: p.existencia, visible: p.visible };

  if (e.target.dataset.accion === "existencia") {
    p.existencia = e.target.value;
    e.target.dataset.v = e.target.value;
    if (!(await publicar(`${p.parte}: ${ETIQUETA_EXISTENCIA[p.existencia].toLowerCase()}`))) {
      Object.assign(p, previo);
    }
    pintarTabla();
  }

  if (e.target.dataset.accion === "visible") {
    p.visible = e.target.checked;
    if (!(await publicar(`${p.parte}: ${p.visible ? "visible" : "oculto"} en el sitio`))) {
      Object.assign(p, previo);
    }
    pintarTabla();
  }
});

$("adminCuerpo").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-accion]");
  if (!btn) return;
  const p = local(btn.closest("tr").dataset.id);
  if (!p) return;

  if (btn.dataset.accion === "editar") return abrirForma(p);

  if (btn.dataset.accion === "borrar") {
    const ok = confirm(
      `¿Eliminar ${p.parte} — ${p.nombre}?\n\n` +
      `Si solo quieres que deje de aparecer en el sitio, mejor desmarca "En el sitio".`
    );
    if (!ok) return;

    const respaldo = [...productos];
    productos = productos.filter((x) => x.id !== p.id);
    if (!(await publicar(`Elimina ${p.parte}`))) productos = respaldo;
    pintarTabla();
  }
});

/* ===========================================================
   Formulario
   =========================================================== */

const dlg = $("dlg");

$("btnNuevo").addEventListener("click", () => abrirForma(null));
$("btnCerrar").addEventListener("click", () => dlg.close());
$("btnCancelar").addEventListener("click", () => dlg.close());

function abrirForma(p) {
  editandoId = p?.id || null;
  $("dlgTitulo").textContent = p ? `Editar ${p.parte}` : "Nuevo producto";
  $("avisoForma").hidden = true;

  $("fParte").value = p?.parte || "";
  $("fNombre").value = p?.nombre || "";
  $("fMarca").value = p?.marca || "";
  $("fCategoria").value = p?.categoria || "";
  $("fPrecio").value = p?.precio ?? "";
  $("fMotores").value = (p?.motores || []).join(", ");
  $("fExistencia").value = p?.existencia || "en-stock";
  $("fVisible").checked = p ? p.visible !== false : true;
  $("fImagen").value = "";

  const previa = $("fPreview");
  previa.hidden = !p?.imagen;
  previa.src = p?.imagen || "";

  pintarSpecs(p?.specs || []);
  dlg.showModal();
  $("fParte").focus();
}

function pintarSpecs(specs) {
  $("fSpecs").innerHTML = "";
  (specs.length ? specs : [["", ""]]).forEach(([k, v]) => agregarSpec(k, v));
}

function agregarSpec(k = "", v = "") {
  const fila = document.createElement("div");
  fila.className = "spec-fila";
  fila.innerHTML = `
    <input placeholder="Etiqueta (ej. Rosca)" value="${escapar(k)}">
    <input placeholder="Valor (ej. 1-1/8 - 16 UN)" value="${escapar(v)}">
    <button type="button" class="spec-quitar" aria-label="Quitar renglón">&times;</button>`;
  fila.querySelector(".spec-quitar").addEventListener("click", () => fila.remove());
  $("fSpecs").appendChild(fila);
}

$("btnSpec").addEventListener("click", () => agregarSpec());

$("fImagen").addEventListener("change", (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  $("fPreview").src = URL.createObjectURL(archivo);
  $("fPreview").hidden = false;
});

$("btnGuardar").addEventListener("click", async () => {
  const aviso = $("avisoForma");
  const btn = $("btnGuardar");
  aviso.hidden = true;

  const parte = $("fParte").value.trim().toUpperCase();
  const nombre = $("fNombre").value.trim();
  const categoria = $("fCategoria").value.trim();

  if (!parte || !nombre || !categoria) {
    aviso.textContent = "Número de parte, nombre y categoría son obligatorios.";
    aviso.hidden = false;
    return;
  }

  const repetido = productos.find((p) => p.parte === parte && p.id !== editandoId);
  if (repetido) {
    aviso.textContent = `Ya existe un producto con el número de parte ${parte}.`;
    aviso.hidden = false;
    return;
  }

  const specs = [...$("fSpecs").querySelectorAll(".spec-fila")]
    .map((f) => [...f.querySelectorAll("input")].map((i) => i.value.trim()))
    .filter(([k, v]) => k && v);

  const anterior = editandoId ? local(editandoId) : null;

  const datos = {
    id: editandoId || siguienteId(productos),
    parte,
    nombre,
    categoria,
    marca: $("fMarca").value.trim() || null,
    motores: $("fMotores").value.split(",").map((s) => s.trim()).filter(Boolean),
    specs,
    precio: $("fPrecio").value === "" ? null : Number($("fPrecio").value),
    existencia: $("fExistencia").value,
    imagen: anterior?.imagen || null,
    visible: $("fVisible").checked,
  };

  btn.disabled = true;
  const respaldo = productos.map((p) => ({ ...p }));

  try {
    const archivo = $("fImagen").files[0];
    if (archivo) {
      btn.textContent = "Subiendo foto…";
      datos.imagen = await subirFoto(archivo, parte);
    }

    btn.textContent = "Guardando…";

    if (anterior) Object.assign(anterior, datos);
    else productos.push(datos);

    const ok = await publicar(anterior ? `Actualiza ${parte}` : `Agrega ${parte}`);
    if (!ok) {
      productos = respaldo;
      throw new Error("El cambio no se guardó. Revisa el mensaje de arriba.");
    }

    dlg.close();
    pintarTabla();
  } catch (e) {
    productos = respaldo;
    aviso.textContent = e.message;
    aviso.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar";
  }
});

/* ===========================================================
   PDF
   =========================================================== */

$("btnPdfAdmin").addEventListener("click", async () => {
  const btn = $("btnPdfAdmin");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Generando…";
  try {
    await generarPDF(productos.filter((p) => p.visible !== false));
  } catch (e) {
    alert("No se pudo generar el PDF: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

arrancar();
