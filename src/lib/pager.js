// Paginación del pool: cuántas filas caben por página y cómo se pintan los
// números. Con datos de años no caben 80 botones seguidos, así que los huecos
// se encogen con '…' sin perder los extremos ni la página en la que estás.

export const POR_PAGINA = 10

// Elementos del pager para `total` páginas. Hasta 7 páginas se ven todas; a
// partir de ahí siempre están 1, `total` y la ventana `actual ± 1`, y los
// huecos de más de uno se rellenan con '…'.
export function paginasVisibles(actual, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const candidatas = [1, total, actual - 1, actual, actual + 1]
  const numeros = [...new Set(candidatas)].filter((n) => n >= 1 && n <= total)
  numeros.sort((a, b) => a - b)

  const salidas = []
  for (const numero of numeros) {
    const anterior = salidas.at(-1)
    if (typeof anterior === 'number' && numero - anterior > 1) salidas.push('…')
    salidas.push(numero)
  }
  return salidas
}
