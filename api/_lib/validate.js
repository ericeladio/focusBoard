const ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const IMAGE_FOLDER_RE = /^[A-Za-z0-9_-]{1,40}$/
const IMAGE_NAME_RE = /^[A-Za-z0-9_-]{4,64}$/
const SEGUIMIENTO = ['percent', 'streak', 'compuesta']
const ACTIONS = ['put', 'del']
const ENTITIES = ['goal', 'type', 'note']

const MAX_OPS = 200

// Clave de imagen: `nombre` o `carpeta/nombre` (una sola barra, el único
// separador que rutea la API). Los puntos no están permitidos: nada de `..`
// ni rutas relativas. Lo usan el sanitizador de metas y el proxy de imágenes
// para que los dos no puedan divergir.
export function isValidImageKey(key) {
  if (typeof key !== 'string' || !key) return false
  const parts = key.split('/')
  if (parts.length === 1) return IMAGE_NAME_RE.test(key)
  if (parts.length === 2) {
    return IMAGE_FOLDER_RE.test(parts[0]) && IMAGE_NAME_RE.test(parts[1])
  }
  return false
}

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

  return {
    ok: true,
    record: {
      id: input.id,
      nombre,
      tipoId,
      seguimiento: input.seguimiento,
      componentes,
      valor: asInt(input.valor, 0, 0, 100000),
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
