---
version: 1
slug: "src-visionboard-jsx"
primary_target: "src/VisionBoard.jsx"
related_targets: []
---

# Vision Board + Objetivos (foxus-board)

Scope: surface con dos rutas (`/` muro, `/pool` lista), modo Experience.

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
slider, racha de días u objetivos compuestos que agrupan otros) validados con
zod. La compuesta se auto-marca en el muro cuando todas sus partes tienen avance
hoy (percent: subido hoy o en 100%; racha: marcada hoy) y desmarca sola si alguna
deja de avanzar; sus partes no ocupan cupo de los 7 pero siguen en el pool, con
la etiqueta "dentro de: <compuesta>", y se editan dentro de su modal. Los
compuestos no piden tipo: van solos al tipo `Compuesto` (se crea al vuelo) y el
form oculta las tarjetas de seguimiento cuando el tipo es `Compuesto` (solo se
ven sus partes; se sale cambiando de tipo). La racha se deriva de la cadena de
marcas: `Hoy` la extiende, `Deshacer hoy` la revierte, y si se rompe el hilo se
pinta 0 sola. La nota rayada "TODO" es la única nota decorativa: su lista
es editable con doble clic y se persiste en localStorage (`fb.note`), acotada a
8 líneas con `overflow-wrap` para que el texto no desborde la hoja. Doble clic en
una fila del pool abre el form con los datos
cargados; orden por `createdAt` descendente. Los % que llevan 3+ días sin
subir (con valor > 0) muestran "N días sin avance" en rojo `paper-margin`, en
muro y pool; resetea solo al subir el slider.

FIRST VIEWPORT (`/`): título manuscrito + "{n} de 7 en el muro" + tape-link al
pool + sync badge de cinta (estado del sync; "Entrar" abre la hoja de passcode);
polaroids de objetivos, nota rayada "TODO" (editable) y botón-polaroid
"Añadir" (deshabilitado a 7/7). En celular (≤48rem) el muro es un mosaico de dos
columnas con cada foto a su proporción real; en celular la tarjeta es foto +
nombre y el doble clic/segundo toque abre la modal con las opciones. FIRST VIEWPORT (`/pool`): título + select de
tipo + barra Tipos/Nuevo objetivo + el mismo sync badge en la nav; lista de filas (miniatura, tipo, nombre,
seguimiento solo lectura, Editar/Poner/Borrar) y hint de doble clic.

FORM: réplica del sketch.webp (pinned por brief) ampliada a app de objetivos.
Seed key: pinned-request, sin roll.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
