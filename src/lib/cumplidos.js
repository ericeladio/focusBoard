// Cumplimientos: la acción "Terminado" y la página de cumplidos.
//
// Terminar archiva el objetivo (`finalizadoEn`): sale del muro y del pool y
// vive en `/cumplidos`, agrupado por año y por mes. "Reabrir" solo limpia la
// fecha y lo devuelve al pool. La racha puede tener meta de días
// (`metaDias`) o ser indefinida (`null`): la meta nunca archiva sola, solo
// resalta el botón.
import { markedToday, streakOf } from './dates.js'
import { pctDe } from './lectura.js'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const MESES_CORTO = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

// Meta de días de una racha; null = indefinido.
export function metaDiasDe(goal) {
  const meta = Number(goal?.metaDias)
  if (!Number.isFinite(meta) || meta <= 0) return null
  return Math.round(meta)
}

// ¿Se puede pulsar "Terminado"?
//   percent/paginas → solo al 100%
//   streak          → siempre (el botón es la única salida de una racha)
//   compuesta       → cuando enseña "Listo" hoy (misma condición que la tarjeta)
export function puedeFinalizar(goal) {
  if (!goal || goal.finalizadoEn) return false
  if (goal.seguimiento === 'percent' || goal.seguimiento === 'paginas') {
    return pctDe(goal) >= 100
  }
  if (goal.seguimiento === 'streak') return true
  if (goal.seguimiento === 'compuesta') return markedToday(goal.marcas)
  return false
}

// La meta de días resalta el botón, pero no archiva nada por sí sola.
export function metaAlcanzada(goal) {
  if (goal?.seguimiento !== 'streak') return false
  const meta = metaDiasDe(goal)
  if (!meta) return false
  return streakOf(goal.marcas) >= meta
}

// "4 de 30 días" con meta; "4 días" si es indefinida.
export function etiquetaRacha(goal) {
  const dias = streakOf(goal?.marcas)
  const meta = metaDiasDe(goal)
  if (!meta) return `${dias} ${dias === 1 ? 'día' : 'días'}`
  return `${dias} de ${meta} ${meta === 1 ? 'día' : 'días'}`
}

// "29 sep 2026", sin husos: el ISO se lee a mano.
export function fechaCorta(iso) {
  if (typeof iso !== 'string' || !ISO_RE.test(iso)) return ''
  const [anio, mes, dia] = iso.split('-').map(Number)
  return `${dia} ${MESES_CORTO[mes - 1] ?? ''} ${anio}`
}

// Cumplidos agrupados de lo más reciente a lo más antiguo:
// [{ anio, total, meses: [{ key, anio, mes, label, total, goals }] }]
export function groupCumplidos(goals) {
  const lista = Array.isArray(goals) ? goals : []
  const archivados = lista.filter(
    (goal) => typeof goal?.finalizadoEn === 'string' && ISO_RE.test(goal.finalizadoEn),
  )
  const ordenados = [...archivados].sort((a, b) => {
    if (a.finalizadoEn !== b.finalizadoEn) {
      return a.finalizadoEn < b.finalizadoEn ? 1 : -1
    }
    return Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0)
  })

  const anios = []
  const porAnio = new Map()
  const porMes = new Map()

  for (const goal of ordenados) {
    const [anio, mes] = goal.finalizadoEn.split('-').map(Number)
    let bloque = porAnio.get(anio)
    if (!bloque) {
      bloque = { anio, total: 0, meses: [] }
      porAnio.set(anio, bloque)
      anios.push(bloque)
    }
    const clave = goal.finalizadoEn.slice(0, 7)
    let grupo = porMes.get(clave)
    if (!grupo) {
      grupo = {
        key: clave,
        anio,
        mes,
        label: MESES[mes - 1] ?? String(mes),
        total: 0,
        goals: [],
      }
      porMes.set(clave, grupo)
      bloque.meses.push(grupo)
    }
    grupo.total += 1
    grupo.goals.push(goal)
    bloque.total += 1
  }

  return anios
}
