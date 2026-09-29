---
version: 1
slug: "src-visionboard-jsx"
primary_target: "src/VisionBoard.jsx"
related_targets: []
---

# Vision Board + Objetivos (foxus-board)

Scope: surface con tres rutas (`/` muro, `/pool` lista, `/cumplidos`
terminados), modo Experience.

## Direction contract

THESIS: un tablero físico donde los objetivos SON las fotos del muro — polaroids
sujetos con cinta y chinches sobre pared crema — y el pool es una lista de filas
de papel escaneable, no otra cuadrícula. Rechaza: cards con iconos y dashboard
de progreso.

OWN-WORLD: pared sage-crema #e7e4d6 con textura tenue; polaroid #fbf9f3 con foto
4:5; tinta #2f2a24 / #56503f; papel rayado #f7ebe6 con margen rojo;
cinta salvia rgba(176,182,156,.78); Caveat self-host para títulos,
nombres y pies; sistema para el resto. Esquinas rectas, sombra doble, sin glass.

STORY: el visitante ve su muro (tope 7 en foco) y el pool en lista con filtro por
tipo. Crea objetivos con nombre, tipo, imagen y seguimiento (porcentaje con
slider o racha de días; los compuestos agrupan otros y se eligen con el tipo
`Compuesto`) validados con
zod. La compuesta se auto-marca en el muro cuando todas sus partes tienen avance
hoy (percent: subido hoy o en 100%; racha: marcada hoy) y desmarca sola si alguna
deja de avanzar; sus partes no ocupan cupo de los 7 pero siguen en el pool, con
la etiqueta "dentro de: <compuesta>", y se editan dentro de su modal. En
pantalla solo caben 3 de sus partes: la tarjeta (chips) y la modal enseñan
las 3 primeras pendientes y, al completar una, la ventana pasa a las que
siguen faltando (el recuento "Falta M de K" sigue hablando de todas). En
Seguimiento no hay ficha "Compuesta": solo porcentaje y racha, y el tipo
`Compuesto` viaja siempre en el desplegable (se crea al vuelo si no existía);
elegido él, Seguimiento desaparece y solo se ven sus partes (se sale cambiando
de tipo). La racha se deriva de la cadena de
marcas: `Hoy` la extiende, `Deshacer hoy` la revierte, y si se rompe el hilo se
pinta 0 sola. La nota rayada "TODO" es la única nota decorativa: su lista
es editable con doble clic y se persiste en localStorage (`fb.note`), acotada a
8 líneas con `overflow-wrap` para que el texto no desborde la hoja. Doble clic en
una fila del pool abre el form con los datos
cargados; orden por `createdAt` descendente. En el muro, la modal que abre el
doble clic (o el segundo toque) lleva `Editar`: un clic cierra la modal y abre
el form con ese objetivo. La barra de avance (% y páginas) mueve un borrador
que solo escribe el botón `Guardar` de al lado (con `Deshacer` al lado), así
que un roce accidental no carga el progreso. Los % que llevan 3+ días sin
subir (con valor > 0) muestran "N días sin avance" en rojo `paper-margin`, en
muro y pool; resetea solo al subir el slider.

Cada objetivo se puede TERMINAR: el botón `Terminado` (muro, modal y fila del
pool) lo archiva con fecha de hoy, lo saca del muro y del pool y lo pasa a
`/cumplidos`. En porcentaje/páginas aparece solo al 100%, en rachas SIEMPRE
y en compuestas cuando está lista hoy. La racha acepta meta de días
(`metaDias` 1..3650) o `Indefinido`: con meta se lee "4 de 30 días" y, al
llegar, el botón se enciende — pero nunca archiva sola. Terminar una parte
la saca de su compuesta sola (y si era la última, la compuesta se termina
también); una parte todavía enganchada a mano cuenta como avance y no
desmonta nada. `Reabrir` (desde
`/cumplidos`) solo limpia la fecha: el objetivo vuelve al pool.

DUEÑO "solo aquí": lo creado antes de entrar con passcode (o sin cuenta) se
marca `local` y no viaja — ni a la cola de subida, ni con su foto —; el chip
`solo aquí` (tinta sobre cinta, `LocalChip`) aparece junto al nombre en la
tarjeta del muro, en la fila del pool, en las filas de `/cumplidos` y en la
nota rayada "TODO", siempre acompañado del botón ghost `Subir a la cuenta`
(`Subir la nota` en la nota) que lo promueve a cuenta (`SubirCuenta`). No
cuenta como pendiente en el badge. Borrarlo no deja lápida.

FIRST VIEWPORT (`/`): título manuscrito + "{n} de 7 en el muro" + tape-links
al pool y a cumplidos + sync badge de cinta (estado del sync; "Entrar" abre la hoja de passcode);
polaroids de objetivos (con chip `solo aquí` + `Subir a la cuenta` cuando el
objetivo es solo local), nota rayada "TODO" (editable; su botón `Subir la nota`
solo si es local) y botón-polaroid
"Añadir" (deshabilitado a 7/7). En celular (≤48rem) el muro es un mosaico de dos
columnas con cada foto a su proporción real; en celular la tarjeta es foto +
nombre y el doble clic/segundo toque abre la modal con las opciones. FIRST VIEWPORT (`/pool`): título + select de
tipo + barra Tipos/Nuevo objetivo + los mismos tape-links y sync badge en la
nav; lista de filas (miniatura, tipo, nombre, seguimiento solo lectura,
Editar/Terminado/Poner/Borrar, con `solo aquí` + `Subir a la cuenta` cuando
aplica) y hint de doble clic. FIRST VIEWPORT
(`/cumplidos`): título + contador de cumplidos + tape-links y sync badge;
años como etiqueta de cinta, meses con recuento (si la página parte un mes,
"4 de 12") y filas con Reabrir/Borrar (y `solo aquí` + `Subir a la cuenta`
cuando aplica), paginadas de 10 en 10 con el mismo pager que el pool.

FORM: réplica del sketch.webp (pinned por brief) ampliada a app de objetivos.
Seed key: pinned-request, sin roll.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
