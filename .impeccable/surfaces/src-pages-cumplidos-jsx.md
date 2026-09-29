---
version: 1
slug: "src-pages-cumplidos-jsx"
primary_target: "src/pages/Cumplidos.jsx"
related_targets:
  - "src/lib/cumplidos.js"
  - "src/components/GoalDone.jsx"
---

# Cumplidos (foxus-board)

Scope: surface de la tercera ruta (`/cumplidos`), el archivo de lo terminado.

## Direction contract

THESIS: cumplir es dejar de estar en el muro. La página es el reverso del
tablero: no otra cuadrícula de tarjetas, sino un recorrido por el tiempo —
años como etiquetas de cinta pegadas en la pared y, dentro, las filas de
papel que ya conoces del pool. Rechaza: paneles de métricas, gráficos de
progreso y celebraciones con emoji.

OWN-WORLD: misma pared sage-crema con textura y viñeta, misma cabecera
manuscrita con contador y tape-links. Cada año es `done__label` (fondo cinta
salvia, Caveat, rotación -2°, sombra suave); cada mes un título manuscrito
con su recuento entre paréntesis; cada cumplido una fila `.row` idéntica a
la del pool (miniatura 4:5, tipo en `label`, nombre en Caveat) con la fecha
`Terminado el 29 sep 2026` en `label` y el logro final en tinta. Esquinas
rectas, sombra doble, sin glass, sin degradado; rotaciones que desaparecen
con `prefers-reduced-motion`.

STORY: entras a `/cumplidos` desde el tape-link del muro o del pool. El
contador dice `N cumplidos · M este años` (o `Nada terminado todavía`). Los
objetivos llegan aquí con `Terminado`: al 100% en porcentaje/páginas, al
cumplir la meta de días de una racha (o cuando quieras en rachas
indefinidas), o con su compuesta lista. Orden: de lo más reciente a lo más
antiguo, agrupado año → mes. `Reabrir` limpia solo la fecha (`finalizadoEn`)
y el objetivo vuelve al pool, nunca al muro, para no pisar el cupo de los
siete; `Borrar` pide confirmación y lo borra igual que en el pool. Si no hay
nada, un polaroid rotado con texto manuscrito explica cómo se llega aquí.
El grupo de mes nace de `groupCumplidos()` (puro, testeado en
`tests/cumplidos.test.mjs`), que descarta lo no archivado y lo que no sea
fecha `YYYY-MM-DD`.

FIRST VIEWPORT (`/cumplidos`): `Cumplidos` en manuscrito display + contador
+ tape-links al muro/pool + sync badge; primer año con su etiqueta de cinta
y el primer mes con sus filas visibles sin scroll en escritorio.

FORM: sin formulario propio: solo Reabrir/Borrar (mismos `btn btn--ghost`
que el pool) y el diálogo `window.confirm` de borrado.

Seed key: pinned-request, sin roll.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
