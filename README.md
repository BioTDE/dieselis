# Dieselis — catálogo de refacciones

Diesel Integrated Solutions LLC · Tijuana, B.C.

Catálogo público + panel de administración con acceso restringido y exportación a PDF.
**Todo vive en GitHub.** No hay base de datos, ni servidor, ni segunda cuenta que mantener.

---

## Estructura

```
dieselis/
├── index.html                 ← catálogo público
├── admin.html                 ← panel (solo colaboradores del repositorio)
├── assets/
│   ├── css/estilos.css        ← identidad visual (colores del logo)
│   ├── css/admin.css          ← estilos del panel
│   ├── js/config.js           ← ⚠ datos del negocio + tu usuario de GitHub
│   ├── js/datos.js            ← única capa que habla con GitHub
│   ├── js/app.js              ← lógica del catálogo público
│   ├── js/admin.js            ← lógica del panel
│   ├── js/pdf.js              ← generador del catálogo en PDF
│   └── img/
│       ├── (4 variantes del logo)
│       └── productos/         ← fotos, subidas desde el panel
├── datos/
│   └── productos.json         ← EL CATÁLOGO. No lo edites a mano.
└── README.md
```

---

## Cómo funciona

El catálogo es un archivo, `datos/productos.json`, que vive en el repositorio.

- **El sitio público** lo descarga y arma las fichas en el navegador.
- **El panel** lo lee por la API de GitHub, tú editas, y al guardar escribe el archivo de vuelta: eso es un commit.
- **GitHub Pages** ve el commit y reconstruye el sitio.
- **Los permisos** son los del repositorio: quien puede hacer commit, puede editar el catálogo.

Consecuencias que conviene tener claras:

**Cada cambio tarda de 30 a 60 segundos en verse en el sitio**, porque GitHub tiene que reconstruir la página. El panel te avisa cuando ya guardó.

**El historial de git es tu respaldo.** Cada guardado queda registrado con fecha y autor. Si algo sale mal, en la pestaña *Commits* del repositorio ves qué cambió y puedes revertirlo.

**No edites `datos/productos.json` a mano** mientras usas el panel. Si lo haces, el panel puede quedar con una versión vieja y marcarte un error de conflicto al guardar. Si pasa: recarga la página y vuelve a intentar.

---

## Puesta en marcha

### 1. Subir el proyecto a GitHub

Crea un repositorio en GitHub (por ejemplo `dieselis`) y sube la carpeta:

```bash
cd dieselis
git init
git add .
git commit -m "Catálogo Dieselis"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/dieselis.git
git push -u origin main
```

### 2. Configurar

Abre `assets/js/config.js` y en el bloque `github` cambia:

```js
usuario: "TU-USUARIO-DE-GITHUB",   // ← tu usuario real
repo: "dieselis",                  // ← el nombre del repositorio
```

Guarda y sube el cambio (`git add`, `git commit`, `git push`). Sin esto el panel no puede guardar nada.

### 3. Publicar el sitio

En GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.

En un par de minutos queda en `https://TU-USUARIO.github.io/dieselis/`.

### 4. Generar tu token

El panel necesita un token para poder escribir. En GitHub:

1. Foto de perfil → **Settings** → hasta abajo, **Developer settings**
2. **Personal access tokens → Fine-grained tokens → Generate new token**
3. **Repository access**: *Only select repositories* → marca `dieselis`
4. **Permissions → Repository permissions → Contents**: *Read and write*
5. **Expiration**: 90 días o un año, tú decides
6. Genera, **copia el token** (GitHub solo te lo muestra una vez) y pégalo en el panel

Entra a `https://TU-USUARIO.github.io/dieselis/admin.html`, pega el token y listo. Se guarda en tu navegador; no lo vuelves a pegar hasta que expire o cierres sesión.

---

## Dar y quitar acceso a otras personas

**Agregar:** en el repositorio, **Settings → Collaborators → Add people**, con permiso **Write**. Esa persona genera su propio token siguiendo los mismos pasos.

**Quitar:** quítala de *Collaborators*. Su token deja de funcionar de inmediato para este repositorio.

Cada persona usa su propio token, así que en el historial de commits queda registrado quién hizo cada cambio.

### Sobre el token — léelo

El token es tan poderoso como el permiso que le diste. Como lo limitaste a *Contents* en un solo repositorio, lo peor que puede pasar si se filtra es que alguien edite el catálogo. Aun así:

- **No lo pegues en WhatsApp, correo ni chats.** Cada quien genera el suyo.
- **No uses el panel en una computadora compartida** sin darle *Salir* al terminar, porque el token queda guardado en ese navegador.
- **Si crees que se filtró**, en *Developer settings* le das *Revoke* y generas otro. Toma un minuto.
- **Ponle fecha de expiración.** Un token que caduca solo es un token que no te va a doler olvidar.

---

## Usar el panel

| Qué | Cómo |
|---|---|
| Agregar producto | Botón **Nuevo producto** |
| Editar | Botón **Editar** en el renglón |
| Marcar agotado | El menú de **Existencia** en el renglón — un clic, sin abrir el formulario |
| Quitarlo del sitio sin borrarlo | Desmarca **En el sitio**. Sigue en tu panel, deja de verse en el catálogo |
| Eliminar de verdad | Botón **Eliminar** (pide confirmación) |
| Descargar PDF | Botón **Descargar PDF** |

**Agotado vs. oculto:** un producto agotado se le sigue mostrando al cliente con su etiqueta roja, y eso conviene: le dice que tú manejas esa parte y puede preguntarte cuándo llega. Ocúltalo solo si dejaste de venderlo.

### Las fotos

Se suben desde el formulario y el panel las reduce automáticamente a 1000 px de lado antes de subirlas. Esto importa: git guarda cada versión de cada archivo para siempre, así que una foto de 5 MB pesa para siempre. Con la reducción, cada foto queda en 100–200 KB.

Aun así, evita cambiar la misma foto muchas veces. Si el repositorio empieza a sentirse lento (no antes de varios cientos de fotos), la salida es mover las imágenes a un servicio de imágenes y guardar la URL.

---

## El PDF

Se genera en el navegador, sin mandar nada a ningún servidor. Sale agrupado por categoría, con encabezado, número de página, fecha, dirección, horario y tu WhatsApp en cada hoja. Incluye solo los productos visibles.

Está en los dos lados: en el panel y en el catálogo público, para que el cliente se lo lleve él mismo. Sirve mucho para mandar por WhatsApp.

---

## Ver el sitio en tu computadora

Los módulos de JavaScript **no funcionan abriendo el archivo con doble clic**. Necesitas un servidor local:

```bash
cd dieselis
python3 -m http.server 8000
# abre http://localhost:8000
```

El panel funciona igual en local: guarda directo en GitHub.

---

## Costo

Cero. GitHub Pages es gratis para sitios públicos y no se pausa ni caduca. GitHub da 1 GB de repositorio y 100 GB de tráfico al mes, que para un catálogo de refacciones es muchísimo.

Si algún día quieres dominio propio (`dieselis.com`, unos 12–15 USD al año), GitHub Pages lo acepta con HTTPS gratis.

---

## Estructura de los datos

`datos/productos.json` es el catálogo completo. Esta es su forma:

```json
{
  "actualizado": "2026-08-21",
  "categorias": ["Filtración", "Motor", "Frenos"],
  "productos": [ { ... } ]
}
```

Cada producto:

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | texto | sí | Identificador interno, `p0001`, `p0002`… Lo asigna el panel. **Nunca lo cambies**: es lo que amarra un producto a su historial |
| `parte` | texto | sí | Número de parte. Debe ser único en todo el catálogo. El panel lo pasa a mayúsculas |
| `nombre` | texto | sí | Nombre comercial de la refacción |
| `categoria` | texto | sí | Debe coincidir exactamente con una de `categorias`, o se crea una nueva |
| `marca` | texto o `null` | no | Fleetguard, Bendix, Holset… |
| `motores` | lista de textos | sí | Compatibilidad. Lista vacía `[]` si es universal |
| `specs` | lista de pares | sí | `[["Rosca", "1-1/8 - 16 UN"], ["Micraje", "25 µm"]]`. Lista vacía si no aplica |
| `precio` | número o `null` | sí | En pesos. `null` significa "bajo cotización" |
| `existencia` | texto | sí | Solo tres valores: `en-stock`, `pedido`, `agotado` |
| `imagen` | texto o `null` | sí | Ruta relativa, ej. `assets/img/productos/lf9080-1234.jpg` |
| `visible` | booleano | sí | `false` lo esconde del sitio público pero lo deja en tu panel |

El panel valida todo esto antes de guardar. Si alguna vez editas el JSON a mano, respeta los tipos: un `precio` entre comillas o un `existencia` mal escrito rompen la ficha en el sitio.

> **Migrar a base de datos en el futuro.** Si algún día el catálogo se te queda corto y te mueves a Postgres, esta tabla es el esquema: un `id` como llave primaria, `parte` con restricción de único, `motores` como arreglo de texto, `specs` como JSON, y `existencia` restringido a esos tres valores. La conversión es directa.

---

## Cargar el catálogo la primera vez

`datos/productos.json` trae 12 productos de ejemplo para que veas el formato. Bórralos conforme captures los tuyos.

Si ya tienes los productos en Excel, no los captures uno por uno. Mándame el archivo y te genero el JSON completo de un jalón; o conviértelo tú respetando la estructura del archivo (cada producto necesita `id` único, `parte`, `nombre`, `categoria` y `existencia`).

---

## Datos del negocio

Todos viven en `assets/js/config.js`. Si cambia un teléfono, un horario o la dirección, se edita ahí y se refleja en el sitio y en el PDF.

| Dato | Valor actual |
|---|---|
| Mostrador | 9096 Avocado St, Spring Valley, CA 91977 |
| Horario | Lunes a viernes, 8:00 – 17:00 |
| WhatsApp | +1 619 356 9548 |
| Cobertura de venta | Tijuana y zona conurbada |
| Moneda | MXN |

El `index.html` incluye datos estructurados (`schema.org/AutoPartsStore`) con dirección, coordenadas, horario y zona de servicio, para que el negocio salga en búsquedas locales de Google.

---

## Cuándo tendrías que cambiar de arquitectura

Esta versión aguanta bien hasta unos mil productos y un puñado de administradores técnicos. Las señales de que ya no alcanza:

- Necesitas que alguien **no técnico** edite el catálogo y los tokens se vuelven un problema de soporte.
- El retraso de un minuto empieza a estorbar.
- El repositorio se vuelve pesado por las fotos.

Ahí el siguiente paso es una base de datos con autenticación por correo y contraseña (Supabase, plan gratis). El diseño, el PDF y la estructura de datos no cambiarían; solo la capa `datos.js`.

---

## Archivos del logo

| Archivo | Uso |
|---|---|
| `assets/img/marca-dis.png` | símbolo solo, negro — barra superior |
| `assets/img/marca-dis-blanco.png` | símbolo solo, blanco — encabezado del PDF |
| `assets/img/logo-dieselis.png` | logo completo con texto, negro |
| `assets/img/logo-dieselis-blanco.png` | logo completo con texto, blanco — pie de página |
| `assets/img/favicon-512.png` | ícono cuadrado, símbolo blanco sobre negro |
| `assets/img/apple-touch-icon.png` | 180×180, cuando alguien guarda el sitio en su celular |
| `assets/img/compartir.jpg` | 1200×630, la miniatura al pegar el link en WhatsApp o Facebook |
| `favicon.ico` | ícono de la pestaña del navegador. Va en la **raíz**, no en assets |

Los del logo tienen fondo transparente; los íconos y la miniatura llevan fondo negro a propósito, porque un logo transparente sobre el fondo blanco de WhatsApp se ve como recorte.

### Consigue el logo en vectorial

Todos estos archivos salen del PNG que ya tenías, y un PNG tiene resolución fija. Para el sitio va perfecto, pero si algún día quieres el logo en una lona, en la camioneta o en tarjetas de presentación, va a salir pixeleado.

Pídele el archivo vectorial (`.svg`, `.ai` o `.eps`) a quien te hizo el logo. Si lo generaste con IA, hay servicios de vectorización automática que dan buen resultado con un logo tan geométrico como el tuyo. Con el `.svg` en mano se reemplazan los PNG y se regeneran los íconos.

---

## Pendientes

- Confirmar si abren sábado
- Confirmar si los precios van en pesos o en dólares
- Definir si el sitio necesita versión en inglés
- Reclamar el perfil de Google Business Profile con esta dirección
