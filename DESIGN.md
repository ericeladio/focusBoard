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
  note-sticky:
    backgroundColor: "{colors.sticky}"
    textColor: "{colors.ink}"
    padding: "1.4rem 1.3rem"
---

## Overview

Un muro físico traducido a pantalla: elementos sujetos con cinta washi, chinches
y clip sobre una pared crema. El sketch (`public/sketch.webp`) es la referencia
de composición; la portada de *Matantei Loki Ragnarok* es el material fotográfico.
Modo Experience: el artefacto lidera, la interfaz desaparece. Dos rutas: el muro
(`/`) con hasta 7 objetivos en foco, y el pool (`/pool`) con todos los objetivos
y filtro por tipo.

## Colors

Pared `#e7e4d6` (crema-sage, luz de día indirecta), polaroid `#fbf9f3`, foto
siempre oscura `#23211d`, tinta `#2f2a24`. Acentos materiales: cinta salvia
translúcida, post-it `#ece0a6`, papel rayado rosa con línea roja de margen.
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
bloques por fila.

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

**Nota rayada** — papel con líneas y margen rojo; clip metálico dibujado en CSS.
**Post-it** — papel sólido, misma elevación y hover que el resto.

**Goal card** — polaroid con foto 4:5, etiqueta de tipo en `label`, nombre en
`hand-small` y su seguimiento: slider con lectura en `handwriting` o el toggle
`Hoy` / `Deshacer hoy` (`btn--ink`, estado `is-active`) + contador de racha.
La racha se deriva de `marcas` (cadena consecutiva): si se rompe el hilo se
pinta 0 sola. En objetivos en porcentaje, si el valor es > 0 y lleva 3+
días sin subir aparece en rojo `paper-margin` "N días sin avance" (reset solo
cuando el slider sube). Acciones fantasma debajo de una línea fina.

**Goal row** — fila de papel del pool: miniatura 4:5, tipo y nombre, seguimiento
solo lectura (barra fina de tinta + `%` o días) y acciones fantasma (Editar,
Poner/Quitar del muro, Borrar). Doble clic en la fila abre el form con los datos
cargados. Lleva el mismo indicador rojo "N días sin avance" que la tarjeta.
Hover: sube 2px con la misma sombra, a media suavidad. Orden: los más
recientes primero (`createdAt`).

**Botón-polaroid** — el "Añadir" del muro: marco con foto punteada y `+` dibujado
en CSS; deshabilitado con pie "Muro lleno" a 7/7.

**Iconos PWA** — la misma polaroid (pared sage, cinta salvia, foto 4:5 oscura,
pie de dos trazos, inclinación -4°) generada en píxeles por
`scripts/gen-icons.mjs` (`npm run icons`): PNG 192/512, maskable con la pieza
dentro de la zona segura, apple-touch 180 y `favicon.svg` equivalente a mano.
Manifest y theme/background color salen de tokens (`wall`); SW con precache y
fallback a `index.html` para que el muro abra sin red.

**Tape-link** — navegación como etiqueta de cinta salvia en Caveat.

**Chip** — filtro del pool como etiqueta de cinta: borde tinta, activa con fondo
`tape`. **Sheet** — modal de papel con margen rojo, esquinas rectas y sombra alta;
`opt` son las fichas de opción (seguimiento).

**Buttons** — `btn` papel con borde tinta, hover `sticky`; `btn--ink` relleno
tinta; `btn--ghost` subrayado discreto.

## Do's and Don'ts

- Do: mantener rotaciones entre -5deg y 5deg; enderezar solo en hover.
- Do: sombras con offset y blur suave; foto siempre en marco con proporción 4:5.
- Do: tope de 7 objetivos en el muro; el pool no tiene cota y se filtra por tipo.
- Do: la alerta "N días sin avance" solo con `% > 0` y a partir de 3 días; en rojo `paper-margin`.
- Don't: gradiente en texto, glassmorphism decorativo, tarjetas redondeadas.
- Don't: más de 7 en foco; con el muro lleno, el objetivo nuevo va al pool.
- Don't: iconos Unicode/emoji; la chinche y el clip se dibujan en CSS.
