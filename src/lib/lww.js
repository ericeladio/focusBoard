export function toIso(value) {
  if (value == null || value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function newerThan(candidate, current) {
  if (!candidate) return false
  if (!current) return true
  return Date.parse(candidate) > Date.parse(current)
}

function compareTs(a, b) {
  const left = Date.parse(a)
  const right = Date.parse(b)
  if (left === right) return 0
  return left > right ? 1 : -1
}

function pickWinner(candidates) {
  let best = null
  for (const candidate of candidates) {
    if (!best) {
      best = candidate
      continue
    }
    const cmp = compareTs(candidate.ts, best.ts)
    if (cmp > 0 || (cmp === 0 && candidate.state === 'dead')) best = candidate
  }
  return best
}

/**
 * Merge LWW entre lo local (solo registros vivos), lo que baja del servidor
 * (incluye `deletedAt`) y las lápidas locales ({id, ts}).
 * Gana el sello más nuevo; a igual sello gana el borrado (nada resucita solo).
 */
export function mergeCollection(localList, remoteList, tombstones = []) {
  const locals = new Map(localList.map((record) => [record.id, record]))
  const remotes = new Map(remoteList.map((record) => [record.id, record]))
  const tombs = new Map(tombstones.map((item) => [item.id, item.ts]))

  const order = [...locals.keys()]
  for (const id of remotes.keys()) if (!locals.has(id)) order.push(id)
  for (const id of tombs.keys()) if (!locals.has(id) && !remotes.has(id)) order.push(id)

  const records = []
  const nextTombs = []
  let changed = false

  for (const id of order) {
    const local = locals.get(id)
    const remote = remotes.get(id)

    const candidates = []
    if (local) candidates.push({ state: 'live', ts: local.updatedAt, record: local })
    if (tombs.has(id)) candidates.push({ state: 'dead', ts: tombs.get(id) })
    if (remote) {
      if (remote.deletedAt) {
        candidates.push({ state: 'dead', ts: remote.deletedAt })
      } else {
        candidates.push({ state: 'live', ts: remote.updatedAt, record: remote })
      }
    }

    const winner = pickWinner(candidates)
    if (!winner) continue

    if (winner.state === 'live') {
      records.push(winner.record)
      if (!local || local.updatedAt !== winner.record.updatedAt) changed = true
    } else {
      if (local) changed = true
      nextTombs.push({ id, ts: winner.ts })
    }
  }

  return { records, tombstones: nextTombs, changed }
}
