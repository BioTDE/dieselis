/* ===========================================================
   DIESELIS — catálogo público
   =========================================================== */

import {
  listarProductos, conf,
  dinero, normalizar, escapar, enlaceWhatsApp, ETIQUETA_EXISTENCIA,
} from "./datos.js";
import { generarPDF } from "./pdf.js";

const el = {
  q: document.getElementById("q"),
  limpiar: document.getElementById("limpiar"),
  chips: document.getElementById("chips"),
  soloStock: document.getElementById("soloStock"),
  conteo: document.getElementById("conteo"),
  rejilla: document.getElementById("rejilla"),
  vacio: document.getElementById("vacio"),
  vacioWa: document.getElementById("vacioWa"),
  pdf: document.getElementById("btnPdf"),
};

const estado = { texto: "", categoria: "todas", soloStock: false };
let productos = [];

/* ---------- carga ---------- */

async function cargar() {
  el.conteo.textContent = "Cargando catálogo…";
  try {
    const datos = await listarProductos();
    productos = datos.productos;
  } catch (e) {
    console.error(e);
    el.rejilla.innerHTML = "";
    el.conteo.textContent = "No se pudo cargar el catálogo.";
    el.vacio.hidden = false;
    el.vacio.querySelector(".vacio__titulo").textContent = "El catálogo no cargó";
    el.vacio.querySelector("p:not(.vacio__titulo)").textContent =
      "Recarga la página. Si sigue igual, escríbenos por WhatsApp y te cotizamos directo.";
    el.vacioWa.href = enlaceWhatsApp(`Hola ${conf.negocio}, necesito cotizar una refacción.`);
    return;
  }
  montarChips();
  pintar();
}

/* ---------- filtrado ---------- */

function filtrar() {
  const t = normalizar(estado.texto).trim();

  return productos.filter((p) => {
    if (estado.categoria !== "todas" && p.categoria !== estado.categoria) return false;
    if (estado.soloStock && p.existencia !== "en-stock") return false;
    if (!t) return true;

    const heno = normalizar(
      [p.parte, p.nombre, p.marca, p.categoria, (p.motores || []).join(" ")].join(" ")
    );
    return t.split(/\s+/).every((palabra) => heno.includes(palabra));
  });
}

/* ---------- render ---------- */

function tarjeta(p) {
  const specs = (p.specs || [])
    .map(([k, v]) => `<div><dt>${escapar(k)}</dt><dd>${escapar(v)}</dd></div>`)
    .join("");

  const foto = p.imagen
    ? `<img class="ficha__foto" src="${escapar(p.imagen)}" alt="${escapar(p.nombre)}" loading="lazy">`
    : "";

  const precio = p.precio
    ? `<p class="precio">${dinero(p.precio)}<small>${conf.moneda}</small></p>`
    : `<p class="precio precio--cotiza">Precio bajo cotización</p>`;

  const mensaje =
    `Hola ${conf.negocio}, me interesa la parte ${p.parte} — ${p.nombre}` +
    `${p.marca ? ` (${p.marca})` : ""}. ¿Precio y disponibilidad?`;

  return `
  <article class="ficha">
    <div class="ficha__placa">
      <span class="ficha__parte">${escapar(p.parte)}</span>
      <span class="estado estado--${escapar(p.existencia)}">${ETIQUETA_EXISTENCIA[p.existencia] || ""}</span>
    </div>
    ${foto}
    <div class="ficha__cuerpo">
      <p class="ficha__cat">${escapar(p.categoria)}</p>
      <h3 class="ficha__nombre">${escapar(p.nombre)}</h3>
      <p class="ficha__marca">${escapar(p.marca || "")}</p>
      <dl class="specs">${specs}</dl>
      <p class="compat"><strong>Compatible con</strong>${escapar((p.motores || []).join(" · "))}</p>
    </div>
    <div class="ficha__pie">
      ${precio}
      <a class="boton" href="${enlaceWhatsApp(mensaje)}" target="_blank" rel="noopener">Cotizar</a>
    </div>
  </article>`;
}

function pintar() {
  const lista = filtrar();

  el.rejilla.innerHTML = lista.map(tarjeta).join("");
  el.vacio.hidden = lista.length > 0;

  el.conteo.textContent =
    lista.length === 1 ? "1 refacción" : `${lista.length} de ${productos.length} refacciones`;

  el.limpiar.hidden = estado.texto === "";

  const buscado = estado.texto.trim();
  el.vacioWa.href = enlaceWhatsApp(
    buscado
      ? `Hola ${conf.negocio}, busco "${buscado}" y no lo vi en el catálogo. ¿Lo consiguen?`
      : `Hola ${conf.negocio}, necesito cotizar una refacción.`
  );
}

/* ---------- chips de categoría ---------- */

function montarChips() {
  const cats = [...new Set(productos.map((p) => p.categoria))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  el.chips.innerHTML = ["todas", ...cats]
    .map(
      (c) =>
        `<button type="button" class="chip" data-cat="${escapar(c)}" aria-pressed="${
          c === estado.categoria
        }">${c === "todas" ? "Todas" : escapar(c)}</button>`
    )
    .join("");
}

el.chips.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  estado.categoria = btn.dataset.cat;
  el.chips.querySelectorAll(".chip").forEach((b) =>
    b.setAttribute("aria-pressed", String(b === btn))
  );
  pintar();
});

/* ---------- eventos ---------- */

let temporizador;
el.q.addEventListener("input", (e) => {
  clearTimeout(temporizador);
  const valor = e.target.value;
  temporizador = setTimeout(() => {
    estado.texto = valor;
    pintar();
  }, 120);
});

el.limpiar.addEventListener("click", () => {
  el.q.value = "";
  estado.texto = "";
  el.q.focus();
  pintar();
});

el.soloStock.addEventListener("change", (e) => {
  estado.soloStock = e.target.checked;
  pintar();
});

document.querySelectorAll(".atajo").forEach((b) => {
  b.addEventListener("click", () => {
    el.q.value = b.dataset.buscar;
    estado.texto = b.dataset.buscar;
    pintar();
    document.getElementById("catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

if (el.pdf) {
  el.pdf.addEventListener("click", async () => {
    const original = el.pdf.textContent;
    el.pdf.disabled = true;
    el.pdf.textContent = "Generando…";
    try {
      await generarPDF(productos);
    } catch (e) {
      alert("No se pudo generar el PDF: " + e.message);
    } finally {
      el.pdf.disabled = false;
      el.pdf.textContent = original;
    }
  });
}

/* ---------- arranque ---------- */

cargar();
