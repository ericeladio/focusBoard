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
4:5; tinta #2f2a24 / #56503f; papel rayado #f7ebe6 con margen rojo; post-it
#ece0a6; cinta salvia rgba(176,182,156,.78); Caveat self-host para títulos,
nombres y pies; sistema para el resto. Esquinas rectas, sombra doble, sin glass.

STORY: el visitante ve su muro (tope 7 en foco) y el pool en lista con filtro por
tipo. Crea objetivos con nombre, tipo, imagen y seguimiento (porcentaje con
slider o racha de días) validados con zod. La racha se deriva de la cadena de
marcas: `Hoy` la extiende, `Deshacer hoy` la revierte, y si se rompe el hilo se
pinta 0 sola. Doble clic en una fila del pool abre el form con los datos
cargados; orden por `createdAt` descendente. Los % que llevan 3+ días sin
subir (con valor > 0) muestran "N días sin avance" en rojo `paper-margin`, en
muro y pool; resetea solo al subir el slider.

FIRST VIEWPORT (`/`): título manuscrito + "{n} de 7 en el muro" + tape-link al
pool; polaroids de objetivos, nota rayada "Este año", post-it y botón-polaroid
"Añadir" (deshabilitado a 7/7). FIRST VIEWPORT (`/pool`): título + chips de
tipo + barra Tipos/Nuevo objetivo; lista de filas (miniatura, tipo, nombre,
seguimiento solo lectura, Editar/Poner/Borrar) y hint de doble clic.

FORM: réplica del sketch.webp (pinned por brief) ampliada a app de objetivos.
Seed key: pinned-request, sin roll.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
