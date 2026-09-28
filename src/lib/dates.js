export function todayISO() {
  const now = new Date()
  return toISO(now)
}

export function yesterdayISO() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return toISO(date)
}

export function pastISO(daysAgo) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return toISO(date)
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function parseISO(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function isLive(iso) {
  return iso === todayISO() || iso === yesterdayISO()
}

// Cadena consecutiva de días marcados que termina en `ultimoMarca`.
export function chainFrom(racha, ultimoMarca) {
  if (!ultimoMarca || !racha || racha < 1) return []
  const date = parseISO(ultimoMarca)
  const chain = []
  for (let i = 0; i < racha; i += 1) {
    chain.unshift(toISO(date))
    date.setDate(date.getDate() - 1)
  }
  return isLive(chain[chain.length - 1]) ? chain : []
}

// Racha visible: solo cuenta si la cadena llega a hoy o ayer; si se rompió, 0.
export function streakOf(marcas = []) {
  if (marcas.length === 0) return 0
  return isLive(marcas[marcas.length - 1]) ? marcas.length : 0
}

export function markedToday(marcas = []) {
  return marcas[marcas.length - 1] === todayISO()
}

// Días calendario transcurridos desde `iso` (0 = hoy), a prueba de DST.
export function daysSince(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  const then = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((today - then) / 86400000))
}

// Objetivo en %: días seguidos sin subir. 0 = no se muestra nada.
export function inactiveDays(goal) {
  if (goal.seguimiento !== 'percent') return 0
  if (!goal.valor || goal.valor <= 0) return 0
  if (typeof goal.ultimoMovimiento !== 'string') return 0
  return daysSince(goal.ultimoMovimiento)
}
