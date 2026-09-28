---
version: 1
slug: "src-visionboard-jsx"
primary_target: "src/VisionBoard.jsx"
related_targets: []
---

# Vision Board + Objetivos (foxus-board)

Scope: surface con dos rutas (`/` muro, `/pool` pool), modo Experience.

## Direction contract

THESIS: un tablero físico donde los objetivos SON las fotos del muro — polaroids
sujetos con cinta y chinches sobre pared crema — y no una lista de tarjetas web.
Rechaza: cuadrícula de cards con iconos y dashboard de progreso.

OWN-WORLD: pared sage-crema #e7e4d6 con textura tenue; polaroid #fbf9f3 con foto
4:5; tinta #2f2a24 / #56503f; papel rayado #f7ebe6 con margen rojo; post-it
#ece0a6; cinta salvia rgba(176,182,156,.78); Caveat self-host para títulos,
nombres y pies; sistema para el resto. Esquinas rectas, sombra doble, sin glass.

STORY: el visitante ve su muro, entiende que hay tope 7 en foco y un pool con
filtro por tipo, y crea objetivos con nombre, tipo, imagen y seguimiento
(porcentaje con slider o racha de días) validados con zod.

FIRST VIEWPORT: título manuscrito + subtítulo "{n} de 7 en el muro" + tape-link
al pool; grilla con polaroids de objetivos, la nota rayada "Este año" con los
nombres, el post-it y el botón-polaroid "Añadir objetivo" (deshabilitado con
"Muro lleno" a 7/7). Pool: chips = catálogo de tipos + "Todos", barra con
"Tipos" y "Nuevo objetivo", tarjetas con "Poner en el muro".

FORM: réplica del sketch.webp (pinned por brief) ampliada a app de objetivos.
Seed key: pinned-request, sin roll.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
