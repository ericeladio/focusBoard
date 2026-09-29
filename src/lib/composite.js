import { shiftISO, todayISO } from './dates.js'
import { esNombreLectura, totalPaginasDe } from './lectura.js'

// El tipo Compuesto es el que define los objetivos compuestos: id y nombre
// viven aquí para que el store y el formulario hablen de lo mismo.
export const ID_COMPUESTO = 'tipo-compuesto'
export const NOMBRE_COMPUESTO = 'Compuesto'

export function esCompuestoType(type) {
  return type.id === ID_COMPUESTO || type.nombre.toLowerCase() === 'compuesto'
}

export function compuestoId(types) {
  return types.find(esCompuestoType)?.id ?? ID_COMPUESTO
}

// `extra` permite que el llamante le ponga el dueño (ver `lib/local.js`):
// un tipo de sistema creado antes de tener cuenta también es local.
export function ensureCompuestoType(types, extra = {}) {
  return types.some(esCompuestoType)
    ? types
    : [...types, { id: ID_COMPUESTO, nombre: NOMBRE_COMPUESTO, ...extra }]
}

// ¿El objetivo es del tipo Compuesto? (si el tipo ni siquiera está en la
// lista, manda el id: es el que usa el store al guardar una compuesta)
export function esTipoCompuesto(tipoId, types) {
  const tipo = types.find((type) => type.id === tipoId)
  return tipo ? esCompuestoType(tipo) : tipoId === ID_COMPUESTO
}

// El tipo manda el modo de seguimiento: `Compuesto` → compuesta y `lectura`
// → páginas. Lo demás vuelve a porcentaje si lo que había no puede ser
// (una compuesta con otro tipo, o páginas con un tipo normal); sin tipo
// todavía, manda lo elegido en el formulario.
export function modoPorTipo(seguimiento, tipoId, types) {
  if (esTipoCompuesto(tipoId, types)) return 'compuesta'
  const tipo = types.find((type) => type.id === tipoId)
  if (esNombreLectura(tipo?.nombre)) return 'paginas'
  if (!tipoId) return seguimiento
  return seguimiento === 'compuesta' || seguimiento === 'paginas'
    ? 'percent'
    : seguimiento
}

export function esHijoDe(id, goals) {
  return goals.some(
    (goal) => Array.isArray(goal.componentes) && goal.componentes.includes(id),
  )
}

export function padreDe(id, goals) {
  return goals.find(
    (goal) => Array.isArray(goal.componentes) && goal.componentes.includes(id),
  )
}

// ¿Este objetivo tiene avance hoy?
//   archivado → siempre (ya se terminó: cuenta como cumplido)
//   percent  → lo subiste hoy, o ya está en 100%
//   paginas  → leíste hoy, o ya está en su total
//   streak   → lo marcaste hoy
//   compuesta → no aplica (un solo nivel, no se anidan)
export function esAvanceHoy(goal, hoy = todayISO()) {
  // Terminado = cumplido: una parte archivada nunca desmonta su compuesta.
  if (goal.finalizadoEn) return true
  if (goal.seguimiento === 'percent') {
    return goal.valor >= 100 || goal.ultimoMovimiento === hoy
  }
  if (goal.seguimiento === 'paginas') {
    return (
      (Number(goal.valor) || 0) >= totalPaginasDe(goal) || goal.ultimoMovimiento === hoy
    )
  }
  if (goal.seguimiento === 'streak') return goal.marcas.includes(hoy)
  return false
}

export function estadoCompuesta(meta, goals, hoy = todayISO()) {
  const partes = (meta.componentes ?? []).map((id) =>
    goals.find((goal) => goal.id === id),
  )
  const existentes = partes.filter(Boolean)
  const total = existentes.length
  const cumplidas = existentes.filter((goal) => esAvanceHoy(goal, hoy)).length
  return {
    partes,
    total,
    cumplidas,
    completa: total > 0 && cumplidas === total,
  }
}

// Auto-marcado: la compuesta se marca si todas sus partes avanzan hoy,
// y pierde la marca de hoy en cuanto alguna deja de avanzar.
// Devuelve el mismo array si nada cambia (evita bucles de render).
export function reconcileComposites(goals, hoy = todayISO()) {
  let changed = false

  const next = goals.map((goal) => {
    if (goal.seguimiento !== 'compuesta') return goal

    const { completa } = estadoCompuesta(goal, goals, hoy)
    const last = goal.marcas[goal.marcas.length - 1]

    if (completa && last !== hoy) {
      changed = true
      const marcas = last === shiftISO(hoy, -1) ? [...goal.marcas, hoy] : [hoy]
      return { ...goal, marcas }
    }

    if (!completa && last === hoy) {
      changed = true
      return { ...goal, marcas: goal.marcas.slice(0, -1) }
    }

    return goal
  })

  return changed ? next : goals
}
