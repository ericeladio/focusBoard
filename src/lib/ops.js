// Operaciones del outbox: sellado local y construcción de `put`/`del`.
// Viven fuera de `store.jsx` para poder probarlas sin React.
import { nextTs } from './sync.js'
import { debeSubir } from './local.js'

// Escrituras locales: sellan `updatedAt` solo a lo que cambió.
export function stampArray(prev, next) {
  if (next === prev) return next
  const prevById = new Map(prev.map((record) => [record.id, record]))
  let stamped = null
  return next.map((record) => {
    if (!record || typeof record !== 'object') return record
    const old = prevById.get(record.id)
    if (old === record) return record
    // Cambió: sello nuevo. Sin esto el servidor rechazaría la edición
    // (su guarda exige `updated_at` estrictamente mayor).
    if (!stamped) stamped = nextTs()
    return { ...record, updatedAt: stamped }
  })
}

export function goalOp(record) {
  return {
    entity: 'goal',
    op: 'put',
    id: record.id,
    ts: record.updatedAt,
    data: {
      id: record.id,
      nombre: record.nombre,
      tipoId: record.tipoId ?? null,
      seguimiento: record.seguimiento,
      componentes: Array.isArray(record.componentes) ? record.componentes : [],
      valor: Number(record.valor) || 0,
      // null = "no sé": en el servidor se conserva el total que ya esté en
      // la fila, en vez de pisarlo con un 0.
      totalPaginas:
        Number.isFinite(Number(record.totalPaginas)) && Number(record.totalPaginas) > 0
          ? Math.round(Number(record.totalPaginas))
          : null,
      marcas: Array.isArray(record.marcas) ? record.marcas : [],
      ultimoMovimiento: record.ultimoMovimiento ?? null,
      // Ambas claves viajan siempre: en el servidor "la clave está" significa
      // "escribe esto" (por eso vaciar la fecha sirve para reabrir) y una
      // clave ausente (cliente viejo) conserva lo que ya esté en la fila.
      metaDias:
        Number.isFinite(Number(record.metaDias)) && Number(record.metaDias) > 0
          ? Math.round(Number(record.metaDias))
          : null,
      finalizadoEn: typeof record.finalizadoEn === 'string' ? record.finalizadoEn : null,
      imagenKey: record.imagenKey ?? null,
      createdAt: record.createdAt ?? Date.now(),
      enMuro: Boolean(record.enMuro),
      updatedAt: record.updatedAt,
    },
  }
}

export function typeOp(record) {
  return {
    entity: 'type',
    op: 'put',
    id: record.id,
    ts: record.updatedAt,
    data: { id: record.id, nombre: record.nombre, updatedAt: record.updatedAt },
  }
}

export function noteOp(note) {
  return {
    entity: 'note',
    op: 'put',
    id: 'note',
    ts: note.updatedAt,
    data: { texto: note.texto },
  }
}

// Lo local nunca se sube: `debeSubir` es la única puerta de salida.
export function collectOps(prevList, list, entity, ops) {
  const prevById = new Map(prevList.map((record) => [record.id, record]))
  for (const record of list) {
    const old = prevById.get(record.id)
    if (old === record) continue
    if (!debeSubir(record)) continue
    if (old && old.updatedAt === record.updatedAt) continue
    ops.push(entity === 'goal' ? goalOp(record) : typeOp(record))
  }
}
