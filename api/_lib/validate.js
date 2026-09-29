import { isValidImageKey } from '../../shared/imageKey.js'

export { isValidImageKey }

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const SEGUIMIENTO = ['percent', 'streak', 'compuesta', 'paginas']
const ACTIONS = ['put', 'del']
const ENTITIES = ['goal', 'type', 'note']

const MAX_OPS = 200

export function toIso(value) {
  if (value == null || value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function cleanString(value, min, max) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length < min || trimmed.length > max) return null
  return trimmed
}

function stringList(value, maxItems, maxLen) {
  if (value == null) return []
  if (!Array.isArray(value) || value.length > maxItems) return null
  const out = []
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0 || item.length > maxLen) return null
    out.push(item)
  }
  return out
}

function asInt(value, fallback, min, max) {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

// Total de páginas del modo `paginas`. `null` = el cliente no lo sabe (o es
// un cliente viejo): en el upsert se conserva el valor que ya esté en la fila
// en vez de pisarlo con un 0.
function totalPaginasOf(input) {
  const parsed =
    typeof input === 'string' ? Number(input) : typeof input === 'number' ? input : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.max(1, Math.min(10000, Math.round(parsed)))
}

// ¿Trae la clave el cliente? Distingue "ausente" (cliente viejo: no se toca
// lo que ya esté en la fila) de "vacío" (cliente nuevo que limpia el dato,
// p. ej. al reabrir un objetivo terminado).
function trae(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

// Meta de días de una racha: entero 1..3650 o null = indefinida.
function metaDiasOf(value) {
  if (value == null || value === '') return null
  const parsed = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(parsed)) return null
  const dias = Math.round(parsed)
  if (dias <= 0) return null
  return Math.min(3650, dias)
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

// Fecha de archivado (YYYY-MM-DD) o null = vivo. Una fecha mal escrita no se
// tolera: fallamos en vez de desarchivar el objetivo por una op rota.
function finalizadoOf(value) {
  if (value == null || value === '') return { ok: true, value: null }
  const texto = String(value)
  if (!FECHA_RE.test(texto)) return { ok: false, value: null }
  return { ok: true, value: texto }
}

function fail(error) {
  return { ok: false, error }
}

export function sanitizeGoal(input, ts) {
  if (!input || typeof input !== 'object') return fail('bad_shape')
  if (typeof input.id !== 'string' || !ID_RE.test(input.id)) return fail('bad_id')

  const nombre = cleanString(input.nombre, 1, 120)
  if (!nombre) return fail('bad_nombre')

  if (!SEGUIMIENTO.includes(input.seguimiento)) return fail('bad_seguimiento')

  const tipoId =
    input.tipoId == null || input.tipoId === '' ? null : String(input.tipoId).slice(0, 64)
  if (tipoId && !ID_RE.test(tipoId)) return fail('bad_tipo')

  const componentes = stringList(input.componentes, 30, 64)
  if (!componentes) return fail('bad_componentes')

  const marcas = stringList(input.marcas, 1000, 24)
  if (!marcas) return fail('bad_marcas')

  const imagenKey =
    input.imagenKey == null || input.imagenKey === '' ? null : String(input.imagenKey)
  if (imagenKey && !isValidImageKey(imagenKey)) return fail('bad_image_key')

  const ultimoMovimiento =
    input.ultimoMovimiento == null || input.ultimoMovimiento === ''
      ? null
      : cleanString(input.ultimoMovimiento, 1, 24)
  if (input.ultimoMovimiento != null && input.ultimoMovimiento !== '' && !ultimoMovimiento) {
    return fail('bad_movimiento')
  }

  const createdAt = toIso(input.createdAt) ?? ts

  const metaSet = trae(input, 'metaDias')
  const metaDias = metaSet ? metaDiasOf(input.metaDias) : null

  const fechaSet = trae(input, 'finalizadoEn')
  const finalizado = fechaSet
    ? finalizadoOf(input.finalizadoEn)
    : { ok: true, value: null }
  if (!finalizado.ok) return fail('bad_finalizado')

  return {
    ok: true,
    record: {
      id: input.id,
      nombre,
      tipoId,
      seguimiento: input.seguimiento,
      componentes,
      valor: asInt(input.valor, 0, 0, 100000),
      totalPaginas: totalPaginasOf(input.totalPaginas),
      metaDias,
      metaDiasSet: metaSet,
      finalizadoEn: finalizado.value,
      finalizadoSet: fechaSet,
      marcas,
      ultimoMovimiento,
      imagenKey,
      createdAt,
      enMuro: Boolean(input.enMuro),
      updatedAt: ts,
      deletedAt: null,
    },
  }
}

export function sanitizeType(input, ts) {
  if (!input || typeof input !== 'object') return fail('bad_shape')
  if (typeof input.id !== 'string' || !ID_RE.test(input.id)) return fail('bad_id')
  const nombre = cleanString(input.nombre, 1, 60)
  if (!nombre) return fail('bad_nombre')
  return {
    ok: true,
    record: { id: input.id, nombre, updatedAt: ts, deletedAt: null },
  }
}

export function sanitizeNote(input, ts) {
  if (!input || typeof input !== 'object') return fail('bad_shape')
  const texto = input.texto
  if (texto == null) return { ok: true, record: { texto: null, updatedAt: ts } }
  if (typeof texto !== 'string' || texto.length > 4000) return fail('bad_texto')
  return {
    ok: true,
    record: { texto: texto.length ? texto : null, updatedAt: ts },
  }
}

export function normalizeOp(op) {
  if (!op || typeof op !== 'object') return fail('bad_shape')
  if (!ENTITIES.includes(op.entity)) return fail('bad_entity')
  if (!ACTIONS.includes(op.op ?? op.action)) return fail('bad_action')

  const action = op.op ?? op.action
  const ts = toIso(op.ts)
  if (!ts) return fail('bad_ts')

  if (op.entity === 'note') {
    if (action === 'del') return fail('bad_action')
    const result = sanitizeNote(op.data ?? op.record, ts)
    if (!result.ok) return result
    return { ok: true, entity: 'note', action, id: 'note', ts, record: result.record }
  }

  if (typeof op.id !== 'string' || !ID_RE.test(op.id)) return fail('bad_id')
  if (action === 'del') return { ok: true, entity: op.entity, action, id: op.id, ts, record: null }

  const result =
    op.entity === 'goal'
      ? sanitizeGoal(op.data ?? op.record, ts)
      : sanitizeType(op.data ?? op.record, ts)
  if (!result.ok) return result
  return { ok: true, entity: op.entity, action, id: op.id, ts, record: result.record }
}

export function normalizeOps(payload) {
  const list = Array.isArray(payload) ? payload : payload?.ops
  if (!Array.isArray(list)) return { ok: false, error: 'bad_ops' }
  if (list.length > MAX_OPS) return { ok: false, error: 'too_many_ops' }
  return { ok: true, ops: list }
}
