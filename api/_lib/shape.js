export function rowToGoal(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    tipoId: row.tipo_id ?? null,
    seguimiento: row.seguimiento,
    componentes: row.componentes ?? [],
    valor: row.valor,
    marcas: row.marcas ?? [],
    ultimoMovimiento: row.ultimo_movimiento ?? null,
    imagenKey: row.imagen_key ?? null,
    createdAt: Date.parse(row.created_at),
    enMuro: row.en_muro,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

export function rowToType(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    createdAt: Date.parse(row.created_at),
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function rowToNote(row) {
  if (!row) return null
  return { texto: row.texto, updatedAt: row.updated_at }
}

export const GOAL_UPSERT = `
  insert into goals (id, user_id, nombre, tipo_id, seguimiento, componentes, valor, marcas,
                     ultimo_movimiento, imagen_key, created_at, en_muro, updated_at, deleted_at)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, null)
  on conflict (id) do update set
    nombre = excluded.nombre,
    tipo_id = excluded.tipo_id,
    seguimiento = excluded.seguimiento,
    componentes = excluded.componentes,
    valor = excluded.valor,
    marcas = excluded.marcas,
    ultimo_movimiento = excluded.ultimo_movimiento,
    imagen_key = excluded.imagen_key,
    en_muro = excluded.en_muro,
    updated_at = excluded.updated_at,
    deleted_at = null
  where goals.user_id = excluded.user_id and excluded.updated_at > goals.updated_at
`

export function goalParams(record, userId) {
  return [
    record.id,
    userId,
    record.nombre,
    record.tipoId,
    record.seguimiento,
    record.componentes,
    record.valor,
    record.marcas,
    record.ultimoMovimiento,
    record.imagenKey,
    record.createdAt,
    record.enMuro,
    record.updatedAt,
  ]
}

export const TYPE_UPSERT = `
  insert into types (id, user_id, nombre, created_at, updated_at, deleted_at)
  values ($1, $2, $3, now(), $4, null)
  on conflict (id) do update set
    nombre = excluded.nombre,
    updated_at = excluded.updated_at,
    deleted_at = null
  where types.user_id = excluded.user_id and excluded.updated_at > types.updated_at
`

export function typeParams(record, userId) {
  return [record.id, userId, record.nombre, record.updatedAt]
}

export const NOTE_UPSERT = `
  insert into notes (user_id, texto, updated_at)
  values ($1, $2, $3)
  on conflict (user_id) do update set
    texto = excluded.texto,
    updated_at = excluded.updated_at
  where excluded.updated_at > notes.updated_at
`

export function noteParams(record, userId) {
  return [userId, record.texto, record.updatedAt]
}

export const GOAL_DELETE = `
  update goals set deleted_at = $3, updated_at = $3
  where id = $1 and user_id = $2 and $3::timestamptz > updated_at
`

export const TYPE_DELETE = `
  update types set deleted_at = $3, updated_at = $3
  where id = $1 and user_id = $2 and $3::timestamptz > updated_at
`
