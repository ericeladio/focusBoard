---
name: Vision Board
description: Pared de visión tipo tablero de corcho — polaroids, notas y cinta sobre crema.
colors:
  wall: "#e7e4d6"
  wall-shadow: "#b0ac9a"
  polaroid: "#fbf9f3"
  photo-dark: "#23211d"
  photo-dark-deep: "#1d1b18"
  ink: "#2f2a24"
  ink-soft: "#56503f"
  ink-hover: "#453f36"
  caption-ink: "#4b453a"
  selection: "#cfc9ad"
  metal-hi: "#fdfdff"
  metal-mid: "#b9bec9"
  metal-deep: "#6f7684"
  pin-shadow: "rgba(0, 0, 0, 0.32)"
  tape-shadow: "rgba(0, 0, 0, 0.12)"
  clip-shadow: "rgba(0, 0, 0, 0.2)"
  link-shadow: "rgba(74, 68, 50, 0.18)"
  paper-lined: "#f7ebe6"
  paper-rule: "rgba(122, 146, 178, 0.35)"
  paper-margin: "#963434"
  paper-margin-rule: "rgba(197, 107, 107, 0.55)"
  sticky: "#ece0a6"
  tape: "rgba(176, 182, 156, 0.78)"
  metal: "#8f959e"
typography:
  display:
    fontFamily: "Caveat, 'Segoe Script', cursive"
    fontSize: "clamp(2.4rem, 7vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.1
  handwriting:
    fontFamily: "Caveat, 'Segoe Script', cursive"
    fontSize: "1.3rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.14em"
  small:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.4
  hand-small:
    fontFamily: "Caveat, 'Segoe Script', cursive"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.2
  hand-title:
    fontFamily: "Caveat, 'Segoe Script', cursive"
    fontSize: "1.9rem"
    fontWeight: 700
    lineHeight: 1.15
rounded:
  polaroid: "0"
  note: "0"
  pin: "50%"
  clip: "13px"
spacing:
  wall-inline: "clamp(1.25rem, 4vw, 3rem)"
  wall-block: "clamp(2.5rem, 6vw, 5rem)"
  grid: "clamp(1.75rem, 4vw, 2.75rem)"
components:
  polaroid:
    backgroundColor: "{colors.polaroid}"
    textColor: "{colors.ink-soft}"
    padding: "0.7rem 0.7rem 2.5rem"
  note-lined:
    backgroundColor: "{colors.paper-lined}"
    textColor: "{colors.ink}"
    padding: "1.4rem 1.4rem 1.4rem 2.4rem"
---

## Overview

Un muro físico traducido a pantalla: elementos sujetos con cinta washi, chinches
y clip sobre una pared crema. El sketch (`public/sketch.webp`) es la referencia
de composición; la portada de *Matantei Loki Ragnarok* es el material fotográfico.
Modo Experience: el artefacto lidera, la interfaz desaparece. Tres rutas: el muro
(`/`) con hasta 7 objetivos en foco, el pool (`/pool`) con todos los objetivos
y filtro por tipo, y cumplidos (`/cumplidos`) con los objetivos terminados
agrupados por año y mes.

## Colors

Pared `#e7e4d6` (crema-sage, luz de día indirecta), polaroid `#fbf9f3`, foto
siempre oscura `#23211d`, tinta `#2f2a24`. Acentos materiales: cinta salvia
translúcida y papel rayado rosa con línea roja de margen.
Nunca gris puro para texto secundario: teñir desde la tinta (`#56503f`).
El rojo de margen `#963434` es de una sola voz: borde del sheet, margen de la
nota y alerta de "% sin avance". La variante al 55% `paper-margin-rule` existe
solo para la línea vertical de la nota rayada.

## Typography

`Caveat` (self-host en `/fonts/*.woff2`, rango 400–700) carga títulos, pies de
foto y notas: es la letra del mundo, no un adorno. Interfaz y prosa en stack del
sistema. El cuerpo nunca baja de 0.95rem.

## Layout

Grilla auto-fit `minmax(13.5rem, 1fr)` sobre contenedor de `70rem`, ítems
centrados. Rotaciones de -5deg a +5deg por elemento. En móvil apila en una
columna con las mismas rotaciones. Separación generosa entre filas: cada elemento
es un objeto, no una celda. El pool rompe la grilla a propósito: lista vertical
de filas ancho completo (escaneable cuando hay muchos), que en móvil pasa a dos
bloques por fila. Bajo 48rem el muro deja la grilla y se vuelve mosaico de dos
columnas (multicol): cada foto usa su proporción real (limitada a 0.62–1.6),
las tarjetas se apilan con margen para que chinches y cintas no se pisen.

## Elevation & Depth

Dos capas de sombra con offset y blur: `0 14px 30px -12px rgba(74,68,50,.45)`
+ `0 3px 8px rgba(74,68,50,.14)`. El hover sube a `0 30px 50px -18px`. Sin
halos de color cero-offset, sin borde de 1px bajo sombra ancha.

## Shapes

Esquinas rectas: los objetos del mundo (papel, polaroid) no llevan radio.
El único radio es circular, la chinche. Elevación por sombra, nunca por borde.

## Components

**Polaroid** — marco blanco, foto 4:5, pie manuscrito. Variantes de sujeción:
`frame--pin` (chinche CSS con degradado metálico) y `frame--tape` (tinta washi
rotada). Hover: endereza a 0deg, sube 8px, escala 1.03, eleva la sombra.

**Arrastre del muro** — las polaroids se reordenan arrastrándolas: con ratón
basta con mover (cursor `grab` → `grabbing`) y en táctil hay que mantener
pulsado 350 ms, de modo que el scroll y el doble toque siguen mandando (mover
el dedo antes de ese tiempo es scroll y cancela). La carta levantada sale del
flujo (`position`/`left`/`top`/`width` en inline, según la geometría del
momento), se señala con `is-dragging` (endeza a 2deg, escala 1.04, sombra
alta y `pointer-events: none` para poder medir lo que hay debajo) y la carta
sobre la que se apunta se marca con un punteado `is-drag-over` que no mueve
caja. Al soltar, las dos cambian de sitio (el orden sale de `lib/orden.js`:
`ordenaIds` + `mueveA`). Es **solo visual**: el orden vive en el estado del
muro y no toca datos ni `localStorage`, así que al recargar —o al volver de
otra pantalla— vuelve el orden por defecto, los más recientes primero.

**Nota rayada** — papel con líneas y margen rojo; clip metálico dibujado en CSS.
Su lista es editable con doble clic y el texto se guarda como `{texto, updatedAt}`
en `localStorage` (`fb.note`) y viaja en el sync; sin edición personalizada, muestra los títulos de los objetivos
(siempre actualizados). El cuerpo se acota a 8 líneas con scroll propio y
`overflow-wrap: anywhere`, de modo que ninguna palabra ni línea larga sale de la
hoja.

**Goal card** — polaroid con foto 4:5, etiqueta de tipo en `label`, nombre en
`hand-small` y su seguimiento: barra de avance de lectura o el toggle
`Hoy` / `Deshacer hoy` (`btn--ink`, estado `is-active`) + contador de racha.
El avance **en el muro no se mueve**: la barra (porcentaje y páginas) es fija,
del mismo grosor que el slider y con su lectura en `handwriting` — el único
`Guardar` vive en la modal, así que tocar la tarjeta es abrirla. La racha se deriva de
`marcas` (cadena consecutiva): si se rompe el hilo se
pinta 0 sola. Puede llevar **meta de días** (`metaDias`, 1..3650) o ser
indefinida: se lee `4 de 30 días` (o `4 días` sin meta) y, al llegar, el
contador añade "Meta de días cumplida" en tinta. El botón **Terminado**
archiva el objetivo (fecha `finalizadoEn`: sale del muro y del pool y pasa a
`/cumplidos`): en rachas está siempre visible, en porcentaje/páginas solo al
llegar al 100% y en compuestas cuando está lista hoy. Si era **parte de una
compuesta, se sale de ella sola** (la lista solo guarda lo que falta por
hacer) y, si era la última que quedaba, la compuesta se termina también: sin
partes no hay nada que rastrear y una compuesta vacía no se puede terminar a
mano. Con meta de días el
botón se enciende (`btn--ink`) al llegar, pero nunca archiva solo: el gesto
siempre es del usuario. Los objetivos **compuestos** no muestran slider ni `Hoy`: una
línea de estado `Listo · N días` (tinta), `Falta M de K · N días` (rojo
`paper-margin`) o `Sin partes` sobre chips-cinta de sus partes — fondo `tape`, invertidos a
tinta cuando esa parte avanza hoy. **En pantalla solo caben 3 partes**: la
tarjeta (chips) y la modal (lista `parts`) pintan `partesVisibles()` de
`composite.js` — ventana `PARTES_VISIBLES = 3`, primero las que faltan y detrás
las hechas (`parteHecha` es archivada, 100% o al tope de páginas). Al completar
una, la ventana avanza a las siguientes que falten y, si no queda ninguna
pendiente, se ven las hechas (la lista nunca se vacía); el recuento `Falta M de
K` sigue hablando de todas las partes y el `pick` de checkbox del form sigue
listándolas todas. En objetivos en porcentaje, si el valor es > 0 y lleva 3+
días sin subir aparece en rojo `paper-margin` "N días sin avance" (reset solo
cuando el slider sube). Acciones fantasma debajo de una línea fina. En móvil
(≤48rem) solo se ven foto y nombre: el doble clic (o el segundo toque, con
`touch-action: manipulation` en la tarjeta) abre la modal `sheet` con tipo,
seguimiento y acciones — el mismo contenido que la tarjeta, pero con el slider
de verdad, porque es donde se mueve el avance. Su botón **Guardar** es el
único sitio donde se guarda (y **cierra la modal** al pulsarlo): el slider
mueve un borrador que se avisa con `onPendiente`, el borrador muere al cerrar
la modal y las partes de una compuesta comparten ese mismo botón (escribe
todas las que tengan pendiente); el form con el objetivo cargado
se abre desde el pool. La foto adopta su
proporción natural para que el mosaico no
tenga huecos. Las partes de una compuesta no aparecen en el muro (se editan en
el pool y dentro de la modal, donde la lista enseña esas mismas 3) y, cuando
una se termina, desaparece de ahí sola; su chip-cinta es lo que se ve en
celular.

**Goal row** — fila de papel del pool: miniatura 4:5, tipo y nombre, seguimiento
solo lectura (barra fina de tinta + `%`, días con su meta, o `Listo hoy · N días`
en tinta para compuestas) y acciones fantasma (Editar, Terminado, Poner/Quitar
del muro, Borrar).
Las partes llevan la etiqueta `dentro de: <compuesta>` bajo el nombre y su botón
"Poner en el muro" queda deshabilitado con ese motivo. Doble clic en la fila abre
el form con los datos cargados. Lleva el mismo indicador rojo "N días sin
avance" que la tarjeta.
Hover: sube 2px con la misma sombra, a media suavidad. Orden: los más
recientes primero (`createdAt`).

**Paginación** — pool y cumplidos comparten el componente `Pager` (clases
`pager*`): la lista sale de 10 en 10 y, bajo las filas, pinta el rango
(`Mostrando 11–20 de 47`) y los controles: `‹ Anterior`, los números (la
actual en tinta sólida; pasadas 7 páginas se encogen los huecos con `…` y
siguen cabiendo extremos y vecinas) y `Siguiente ›`, con los extremos
deshabilitados. Cambiar el filtro del pool vuelve a la primera página; un
borrado o un `Reabrir` que acortan la lista recortan la página pedida (nunca
acaba en una página vacía); pasar de página lleva el scroll al inicio de la
lista. Con menos de 10 no aparece el pager: en el pool solo queda el aviso de
doble clic.

**Cumplidos** — página `/cumplidos`: los objetivos terminados agrupados por
año y por mes (`Septiembre (2)`), de lo más reciente a lo más antiguo. La
lista pagina como el pool (`paginaCumplidos` reagrupa la ventana de 10 por año
y mes) y, cuando una página parte un mes, su cabecera se lee
`Septiembre (4 de 12)`: cuántas filas hay en esta página de cuántas tiene el
mes. El año es una etiqueta de cinta rotada en Caveat display; cada cumplido
es una fila
`.row` como las del pool (miniatura, tipo, nombre, `Terminado el 29 sep 2026`
en `label` y el logro final: racha con meta, páginas o %) con acciones
**Reabrir** (limpia solo la fecha y lo devuelve al pool, nunca al muro) y
**Borrar**. Estado vacío en manuscrito sobre polaroid rotada. La cabecera
repite el patrón del muro: título, contador (`N cumplidos · M este año`),
tape-links al muro/pool y el sync badge.

**Botón-polaroid** — el "Añadir" del muro: marco con foto punteada y `+` dibujado
en CSS; deshabilitado con pie "Muro lleno" a 7/7.

**Iconos PWA** — la misma polaroid (pared sage, cinta salvia, foto 4:5 oscura,
pie de dos trazos, inclinación -4°) generada en píxeles por
`scripts/gen-icons.mjs` (`npm run icons`): PNG 192/512, maskable con la pieza
dentro de la zona segura, apple-touch 180 y `favicon.svg` equivalente a mano.
Manifest y theme/background color salen de tokens (`wall`); SW con precache y
fallback a `index.html` para que el muro abra sin red.

**Tape-link** — navegación como etiqueta de cinta salvia en Caveat. Las tres
cintas de la nav (Pool, Cumplidos y el sync badge) se parten en dos filas
antes que apretarse: `.wall__nav` envuelve (`flex-wrap`) y, en pantallas de
≤48rem, crece el aire entre ellas y las cintas se estrechan un poco, para que
en un móvil no se queden encogidas y pegadas.

**Sync badge** — la etiqueta de estado junto a la navegación en las dos rutas:
misma cinta salvia, pero en `label` (0.78rem, tracking .14em, mayúsculas) y
rotación de +1.5°. Textos según estado: `Sincronizado`, `Sincronizando`,
`N por subir`, `Sin conexión`, `Reintentar` y, sin sesión, `Entrar` en negrita.
Clic: reintentar la sincronización (o abrir la hoja de passcode). Sin iconos ni
emoji; el color nunca es rojo (el `paper-margin` sigue siendo de una sola voz).

**Hoja de entrada** — modal `sheet` ya existente con passcode (`type="password"`,
autofocus): una línea de ayuda (incluye la política de bloqueo), el campo y
`Cancelar`/`Entrar`. Se abre sola cuando el servidor rechaza la sesión (401) y no
vuelve a molestar tras cerrarla hasta el siguiente rechazo; `Escape` y `×` la
cierran. El error va en `field__error`: `Passcode incorrecto: quedan N
intentos` (si el servidor manda `restantes`), `Sin conexión: …` y, con el
bloqueo activo, `Bloqueado por demasiados intentos: vuelve a probar en mm:ss`
con la cuenta atrás corriendo (sobrevive a cerrar la hoja o a un reload vía
`fb.bloqueadoHasta`); mientras tanto el botón se desactiva y dice `Espera
mm:ss`.

**Filtro del pool** — `select` de papel (`pool__filter`) en la barra junto a
Tipos/Nuevo objetivo: borde tinta, fondo polaroid, esquinas rectas; opciones
"Todos los tipos" + cada tipo. Los chips de partes (`goal__chip`) siguen siendo
etiquetas de cinta más pequeñas: `tape` pendiente, fondo tinta cuando avanza hoy. **Sheet** — modal de papel con
margen rojo, esquinas rectas y sombra alta; `opt` son las fichas de opción
(porcentaje, racha) y `pick` la lista de partes con checkbox del form. Con más
de 10 candidatos `pick` no se despliega entero: entra el buscador por nombre
(`pick__search`, compara sin acentos ni mayúsculas y vuelve a la primera
página al escribir) y el mismo `Pager` que el pool (10 en 10, con el rango
`Mostrando …`); las partes elegidas se quedan a la vista como chips
(`pick__chip`, con `×` a la derecha para quitarlas) para no perderlas si
están en otra página o filtradas. Con 10 candidatos o menos todo sigue
saliendo como antes, sin buscador ni pager.
Para racha, `opt` también elige la meta de días: `Llegar a N días` (input
numérico 1..3650) o `Indefinido`, separados del resto por una línea punteada.
La compuesta no es una ficha de seguimiento: se activa eligiendo el tipo
`Compuesto`, que viaja siempre en el desplegable (si todavía no existe, el
store lo crea al guardar). Con ese tipo elegido, Seguimiento no se despliega
y solo se piden las partes; al cambiar a otro tipo, el seguimiento vuelve a
porcentaje o racha y las partes se sueltan.

**Ejemplos y tour** — un navegador que todavía no ha sincronizado con una
cuenta (`!hasSynced()`) no arranca vacío: `lib/seeds.js` carga dos tipos
(Personal y Lectura) y ocho objetivos que cubren las tres formas de seguir —
porcentaje con la alerta de "4 días sin avance", racha con meta ("4 de 30
días") y lectura por páginas —, una compuesta con sus tres partes (una
hecha, una con avance hoy, una pendiente; sin cupo en el muro) y un cumplido
archivado para que `/cumplidos` también enseñe algo. Con los mismos
visitantes se enseña el **tutorial guiado** (`components/Tutorial.jsx` +
`lib/tutorial.js`, `tut*` en `VisionBoard.css`): seis pasos sobre la
interfaz real, sin cambiar de ruta — el muro, Añadir objetivo, las cartas,
Pool y cumplidos, la nota y el cierre con el aviso de que los ejemplos son
tuyos —, cada uno resaltando su elemento con una ventana de luz y una
tarjeta al lado con Siguiente, Atrás y **Saltar** (también Esc y flechas).
Termina o salta → la clave `fb.tutorial` queda puesta y ya no vuelve a
aparecer; en cuanto alguien sincroniza con una cuenta se va. Los ejemplos
siguen, marcados `solo aquí`, hasta que los borres o los subas.

La **cuenta de prueba** (una segunda pass, la de negocios) es la excepción:
trae sus propios ejemplos sembrados en el servidor (`scripts/seed-demo.mjs`,
misma parrilla pero de negocio: facturación, clientes, llamadas en racha,
lectura, lanzamiento compuesto, algo en el pool, un cumplido y la nota TODO),
con su propio tipo `Compuesto` (los `id` de `types` son clave global, el de
serie es de la principal) y sin foto, así que sale con la genérica. Al entrar
con esa pass se borran los ejemplos del visitante y, con ellos, el tutorial
guiado: ya no es un visitante.

**Buttons** — `btn` papel con borde tinta, hover `sticky`; `btn--ink` relleno
tinta; `btn--ghost` subrayado discreto.

## Offline & sync

Local-first: el estado vive en `localStorage`/IndexedDB y el servidor es un
espejo con sello LWW por registro (`updatedAt`). Toda edición local se sella con
`nextTs()` = `max(Date.now(), serverTime+1)` y entra a un outbox que sube en
tandas; los borrados dejan lápidas (90 días) que también viajan. El orden de cada
sync es pull → imágenes → outbox → borrado de objetos ya no usados, así lo del
servidor manda sobre lo local sin pisar ediciones en vuelo. Conflicto: gana el
sello más nuevo; a igual sello, el borrado. Los campos de cumplimiento
(`metaDias`, `finalizadoEn`) viajan siempre en la op: si un cliente viejo no
los manda, el servidor conserva lo que hay en la fila; escribir `null` de forma
explícita es la orden de reabrir (o de dejar la meta indefinida) y una fecha
que no sea `YYYY-MM-DD` rechaza la op (`bad_finalizado`) en vez de
desarchivar nada.

Imágenes: WebP a máx. 2048px y calidad .9 (JPEG como plan B en Safari), blob en
IndexedDB (`imagenKey`) subido a un bucket R2 privado por `PUT /api/images/<clave>`
dentro de la carpeta `img-goals/` (clave `img-goals/<uuid>`, una sola barra, sin
puntos ni espacios) y servido por el mismo proxy con caché `CacheFirst`; en la URL
la barra se codifica como `~` porque Vercel solo enruta un segmento bajo
`/api/images/` (con dos, la petición cae en un 404 que el cliente lee como HTML
y termina en el badge "Sin servidor"); sin red, el service worker reencola la
subida (Background Sync). Al borrar una foto (o
reemplazarla) el objeto se pide con `DELETE` al volver la red y el servidor lo
borra solo si ninguna meta viva lo referencia. El tablero abre sin red: el shell va en
precache y los datos ya están locales; el badge dice cuánto falta por subir.
Ningún hueco queda sin foto: el componente `Foto` muestra
`public/foto-generica.svg` cuando el objetivo no tiene imagen (aún sin subir,
o mientras la clave de la base sigue resolviéndose) y cae a ella con `onError`
cuando la URL real no carga (404 o red caída) — sin bucle si la genérica
tampoco carga, y su `onLoad` no mide nada, así que el hueco se queda en su
4:5. Por ahí pasan la polaroid del muro, las miniaturas del pool y de
cumplidos y la previsualización del form.

El badge de estado (cinta rotada arriba a la derecha) es el único indicador y
tiene texto propio para cada caso: `Sincronizando` (mientras hay una ronda),
`Entrar` (online sin sesión), `N por subir` (hay cola), `Sin conexión` (offline),
`Sin servidor` (la API no responde o responde HTML: un fallo de despliegue, no
de red) y `Sincronizado`; el `title` añade el motivo. Nunca se informa "todo
bien" mientras quede cola, y los cambios siempre quedan guardados en el
dispositivo aunque el servidor esté caído.

Datos "solo aquí": lo que existía cuando se activó el passcode por primera vez
(metas, tipos y la nota creadas sin cuenta) se marca `local: true` al cargar y
al crear, y ese dueño manda sobre todo lo demás: no entra en el outbox, su foto
no se sube, el badge no lo cuenta como "N por subir" y `applyRemote` no lo pisa
con lo que traiga el servidor. En la tarjeta, en la fila del pool y en
`/cumplidos` se enseña el chip `solo aquí` junto al botón `Subir a la cuenta`
(`Subir la nota` en la nota TODO): quitar la marca es el único camino para que
esos datos suban, y es una acción del usuario, nunca automática. Los borrados
de lo local no dejan lápida ni op: solo se elimina su blob. Límite conocido: lo
que ya se había subido antes de existir este dueño sigue en la cuenta (no hay
acción para retirarlo de allí). Para quien ya tiene cuenta, localStorage pasa a
ser caché: el servidor manda y la marca `local` es el dueño explícito de lo que
no debe viajar.

Acceso: passcode propio (env `PASSCODE`) + cookie firmada por 30 días. Sin
sesión el muro sigue siendo usable en local y la hoja de entrada aparece sola
cuando el servidor rechaza.

Límite de intentos (tabla `login_attempts`): cada fallo cuenta a la vez contra
la IP (primer tramo de `x-forwarded-for`), el user-agent y el id de dispositivo
(`x-focus-device`, UUID en `fb.device`), guardados hasheados con
`LOGIN_LOCK_SALT` (o `SESSION_SECRET`). 5 fallos bloquean 30 minutos; a partir
de ahí, 2 fallos bloquean 24 h, con el contador empezando de cero en cada
bloqueo, y un acierto borra la fila entera (vuelve el cupo de 5). El bloqueo se
comprueba ANTES de mirar el passcode: dentro de él la clave correcta también da
429 con `Retry-After`, así que probar sigue siendo caro y la hoja muestra la
cuenta atrás. Si la tabla no existe (migración pendiente) no se bloquea nada
(fail-open: mejor dejar pasar que dejar al dueño fuera). Desbloquear sin
esperar: `node scripts/unlock-login.mjs` (o esperar). La migración:
`node scripts/migrate-login-limite.mjs` (idempotente).

En desarrollo, `npm run dev` monta las mismas funciones de `api/` mediante el
plugin `scripts/dev-api.mjs`, así `/api/*` existe también en local (mismo
Neon, mismo R2, sin Vercel CLI); la única diferencia es que la cookie sale sin
`Secure` porque el navegador la descartaría en `http://localhost`. Ese plugin
se activa solo en `serve` y escribe en los datos reales, igual que producción.

## Do's and Don'ts

- Do: mantener rotaciones entre -5deg y 5deg; enderezar solo en hover.
- Do: sombras con offset y blur suave; foto siempre en marco con proporción 4:5.
- Do: tope de 7 objetivos en el muro; el pool no tiene cota: se filtra por tipo, y pool y cumplidos paginan de 10 en 10.
- Do: la alerta "N días sin avance" solo con `% > 0` y a partir de 3 días; en rojo `paper-margin`.
- Do: el avance solo se mueve y se guarda en la modal: su `Guardar` escribe el borrador y cierra, así que en el muro la barra es de lectura.
- Do: la compuesta se auto-marca sola cuando todas sus partes avanzan hoy y pierde la marca si alguna deja de avanzar; las partes no ocupan cupo del muro, y al borrar una parte queda desenganchada de la compuesta (también al cargar datos viejos). En pantalla solo caben 3: la tarjeta y la modal enseñan las 3 primeras pendientes y, al completar una, la ventana pasa a las que faltan.
- Do: terminar una parte la saca de su compuesta sola; si era la última que quedaba, la compuesta se termina también.
- Do: `Terminado` siempre disponible en rachas; la meta de días solo resalta el botón, nunca archiva sola.
- Don't: gradiente en texto, glassmorphism decorativo, tarjetas redondeadas.
- Don't: más de 7 en foco; con el muro lleno, el objetivo nuevo va al pool.
- Don't: anidar compuestas (un solo nivel) ni mostrar las partes como cartas independientes en el muro.
- Don't: iconos Unicode/emoji; la chinche y el clip se dibujan en CSS.
- Don't: cumplidos dentro del muro o del pool: su página es `/cumplidos`, y un objetivo archivado no ocupa cupo de los 7.
