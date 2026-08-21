/* ===========================================================
   DIESELIS — generador de catálogo en PDF
   Usa jsPDF + autoTable (cargados por CDN en el HTML).
   Una sola tabla con filas-encabezado por categoría, para que
   los saltos de página caigan solos donde deben.
   =========================================================== */

import { conf, dinero, ETIQUETA_EXISTENCIA } from "./datos.js";

const TINTA = [17, 18, 20];
const GRIS = [107, 112, 118];
const LINEA = [201, 203, 200];

async function cargarImagen(ruta) {
  try {
    const resp = await fetch(ruta);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((ok, mal) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result);
      fr.onerror = mal;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generarPDF(productos) {
  if (!window.jspdf) throw new Error("No se pudo cargar la librería de PDF.");
  if (!productos.length) throw new Error("No hay productos que exportar.");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const margen = 46;

  const fecha = new Date().toLocaleDateString(conf.local, {
    day: "2-digit", month: "long", year: "numeric",
  });

  const logo = await cargarImagen("assets/img/marca-dis-blanco.png");

  /* ---------- filas: encabezado de categoría + productos ---------- */

  const porCategoria = productos.reduce((acc, p) => {
    (acc[p.categoria] = acc[p.categoria] || []).push(p);
    return acc;
  }, {});

  const cuerpo = [];
  Object.keys(porCategoria)
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach((categoria) => {
      cuerpo.push([
        {
          content: categoria.toUpperCase(),
          colSpan: 6,
          styles: {
            fillColor: [241, 241, 238],
            textColor: TINTA,
            fontStyle: "bold",
            fontSize: 9,
            cellPadding: { top: 9, bottom: 9, left: 6, right: 6 },
          },
        },
      ]);

      porCategoria[categoria]
        .sort((a, b) => String(a.parte).localeCompare(String(b.parte)))
        .forEach((p) => {
          cuerpo.push([
            p.parte,
            p.nombre,
            p.marca || "—",
            (p.motores || []).join(", ") || "—",
            p.precio ? dinero(p.precio) : "Cotización",
            ETIQUETA_EXISTENCIA[p.existencia] || "",
          ]);
        });
    });

  /* ---------- tabla ---------- */

  doc.autoTable({
    startY: 168,
    head: [["No. de parte", "Refacción", "Marca", "Compatibilidad", "Precio", "Estado"]],
    body: cuerpo,
    margin: { left: margen, right: margen, top: 64, bottom: 58 },
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
      textColor: TINTA,
      lineColor: LINEA,
      lineWidth: { bottom: 0.5 },
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: TINTA,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 8, bottom: 8, left: 6, right: 6 },
    },
    columnStyles: {
      0: { cellWidth: 76, fontStyle: "bold" },
      1: { cellWidth: 148 },
      2: { cellWidth: 64 },
      3: { cellWidth: 116, textColor: GRIS },
      4: { cellWidth: 62, halign: "right" },
      5: { cellWidth: 54 },
    },
    didDrawPage: (data) => {
      // Encabezado: solo la primera hoja lleva el bloque grande.
      if (data.pageNumber === 1) {
        doc.setFillColor(...TINTA);
        doc.rect(0, 0, ancho, 132, "F");

        if (logo) doc.addImage(logo, "PNG", margen, 32, 116, 44);

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(23);
        doc.text("CATÁLOGO DE REFACCIONES", margen, 104);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(160, 166, 172);
        doc.text(
          `${conf.razonSocial}  ·  ${conf.zonaVenta}  ·  Actualizado al ${fecha}`,
          margen,
          120
        );
      } else {
        doc.setFillColor(...TINTA);
        doc.rect(0, 0, ancho, 34, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`${conf.negocio.toUpperCase()} · CATÁLOGO DE REFACCIONES`, margen, 22);
      }

      // Pie
      doc.setDrawColor(...LINEA);
      doc.setLineWidth(0.5);
      doc.line(margen, alto - 42, ancho - margen, alto - 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...GRIS);
      doc.text(
        `${conf.direccion}  ·  ${conf.horario}  ·  WhatsApp ${conf.telefono}`,
        margen,
        alto - 30
      );
      doc.text(
        `Precios en ${conf.moneda}, sujetos a cambio sin previo aviso  ·  Números OEM citados solo como referencia de compatibilidad`,
        margen,
        alto - 20
      );
    },
  });

  // Numeración, ya que se conoce el total de hojas
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(`${i} / ${total}`, ancho - margen, alto - 20, { align: "right" });
  }

  const nombre = `catalogo-dieselis-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nombre);
  return nombre;
}
