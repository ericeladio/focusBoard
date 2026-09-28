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
  paper-lined: "#f7ebe6"
  paper-rule: "rgba(122, 146, 178, 0.35)"
  paper-margin: "rgba(197, 107, 107, 0.55)"
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
rounded:
  polaroid: "0"
  note: "0"
  pin: "50%"
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
Modo Experience: el artefacto lidera, la interfaz desaparece.

## Colors

Pared `#e7e4d6` (crema-sage, luz de día indirecta), polaroid `#fbf9f3`, foto
siempre oscura `#23211d`, tinta `#2f2a24`. Acentos materiales: cinta salvia
translúcida, post-it `#ece0a6`, papel rayado rosa con línea roja de margen.
Nunca gris puro para texto secundario: teñir desde la tinta (`#56503f`).

## Typography

`Caveat` (self-host en `/fonts/*.woff2`, rango 400–700) carga títulos, pies de
foto y notas: es la letra del mundo, no un adorno. Interfaz y prosa en stack del
sistema. El cuerpo nunca baja de 0.95rem.

## Layout

Grilla auto-fit `minmax(13.5rem, 1fr)` sobre contenedor de `70rem`, ítems
centrados. Rotaciones de -5deg a +5deg por elemento. En móvil apila en una
columna con las mismas rotaciones. Separación generosa entre filas: cada elemento
es un objeto, no una celda.

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

## Do's and Don'ts

- Do: mantener rotaciones entre -5deg y 5deg; enderezar solo en hover.
- Do: sombras con offset y blur suave; foto siempre en marco con proporción 4:5.
- Don't: gradiente en texto, glassmorphism decorativo, tarjetas redondeadas.
- Don't: añadir elementos fuera de los siete; el número es la intención.
- Don't: iconos Unicode/emoji; la chinche y el clip se dibujan en CSS.
