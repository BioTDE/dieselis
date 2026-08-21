/* ===========================================================
   DIESELIS — configuración central
   Lo cargan el catálogo público y el panel.
   =========================================================== */

window.CONFIG = {
  negocio: "Dieselis",
  razonSocial: "Diesel Integrated Solutions LLC",
  whatsapp: "16193569548",     // internacional, sin + ni espacios
  telefono: "+1 619 356 9548",
  ciudad: "Tijuana, B.C.",

  direccion: "9096 Avocado St, Spring Valley, CA 91977",
  mapa: "https://www.google.com/maps/search/?api=1&query=9096+Avocado+St+Spring+Valley+CA+91977",
  horario: "Lunes a viernes · 8:00 – 17:00",
  zonaVenta: "Venta y entrega en Tijuana y zona conurbada",
  moneda: "MXN",
  local: "es-MX",

  /* --- Repositorio de GitHub ---
     Aquí vive todo: el sitio, el catálogo y las fotos.
     ⚠ CAMBIA "usuario" por tu nombre de usuario de GitHub antes
     de publicar, o el panel no va a poder guardar.               */
  github: {
    usuario: "BioTDE",
    repo: "dieselis",
    rama: "main",
    archivoDatos: "datos/productos.json",
    carpetaFotos: "assets/img/productos",
  },

  /* Máximo lado largo de las fotos, en píxeles. El panel las
     reduce antes de subirlas para no inflar el repositorio.      */
  anchoFoto: 1000,
};
