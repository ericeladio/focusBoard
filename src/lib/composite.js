import { shiftISO, todayISO } from './dates.js'

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
//   percent → lo subiste hoy, o ya está en 100%
//   streak  → lo marcaste hoy
//   compuesta → no aplica (un solo nivel, no se anidan)
export function esAvanceHoy(goal, hoy = todayISO()) {
  if (goal.seguimiento === 'percent') {
    return goal.valor >= 100 || goal.ultimoMovimiento === hoy
  }
  if (goal.seguimiento === 'streak') return goal.marcas.includes(hoy)
  return false
}

export function estadoCompuesta(meta, goals, hoy = todayISO()) {
  const partes = (meta.componentes ?? []).map((id) =>
    goals.find((goal) => goal.id === id),
  )
  const total = partes.length
  const existentes = partes.filter(Boolean)
  const cumplidas = existentes.filter((goal) => esAvanceHoy(goal, hoy)).length
  return {
    partes,
    total,
    cumplidas,
    completa: total > 0 && existentes.length === total && cumplidas === total,
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
