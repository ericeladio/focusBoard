// Seguimiento por páginas (modo `paginas`).
//
// El modo es automático por tipo: todo objetivo del tipo `lectura` se sigue
// por páginas en lugar de por porcentaje. El dato en bruto sigue siendo
// `goal.valor` (páginas leídas) y el total vive en `goal.totalPaginas`.

export const PAGINAS_POR_DEFECTO = 200

function normaliza(texto) {
  if (typeof texto !== 'string') return ''
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export function esNombreLectura(nombre) {
  return normaliza(nombre) === 'lectura'
}

// `tipo` es el objeto tipo (o null) del objetivo.
export function esLectura(tipo) {
  return esNombreLectura(tipo?.nombre)
}

export function totalPaginasDe(goal) {
  const total = Number(goal?.totalPaginas)
  return Number.isFinite(total) && total > 0 ? Math.round(total) : PAGINAS_POR_DEFECTO
}

// Avance 0..100 que pinta la interfaz. En modo `paginas` se calcula:
// nadie guarda el porcentaje, solo las páginas y el total.
export function pctDe(goal) {
  if (goal?.seguimiento === 'paginas') {
    const total = totalPaginasDe(goal)
    const leidas = Number(goal.valor) || 0
    return Math.max(0, Math.min(100, Math.round((leidas / total) * 100)))
  }
  if (goal?.seguimiento === 'percent') {
    return Math.max(0, Math.min(100, Number(goal.valor) || 0))
  }
  return 0
}

// Etiqueta corta del avance: "468 de 1181" o "40%".
export function etiquetaDe(goal) {
  if (goal?.seguimiento === 'paginas') {
    return `${Number(goal.valor) || 0} de ${totalPaginasDe(goal)}`
  }
  return `${Number(goal.valor) || 0}%`
}
