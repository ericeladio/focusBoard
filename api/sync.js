import { createHash } from 'node:crypto'

import { jsonBody } from './_lib/body.js'
import { db, ensureUser, rows } from './_lib/db.js'
import { requireSession } from './_lib/session.js'
import { normalizeOp, normalizeOps, toIso } from './_lib/validate.js'
import {
  GOAL_DELETE,
  GOAL_UPSERT,
  NOTE_UPSERT,
  TYPE_DELETE,
  TYPE_UPSERT,
  goalParams,
  noteParams,
  rowToGoal,
  rowToNote,
  rowToType,
  typeParams,
} from './_lib/shape.js'

const EPOCH = '1970-01-01T00:00:00.000Z'

function clientInfo(req) {
  const ua = req.headers['user-agent'] ?? ''
  const raw = `${req.headers.cookie ?? ''}|${ua}`
  const fp = createHash('sha256').update(raw).digest('hex').slice(0, 8)
  const device = /Mobile|Android|iPhone|iPad/i.test(ua)
    ? 'movil'
    : /bot|crawl|spider|curl|node|python/i.test(ua)
      ? 'script'
      : 'escritorio'
  return { fp, device }
}

const GOAL_COLUMNS = `id, nombre, tipo_id, seguimiento, componentes, valor, marcas,
  ultimo_movimiento, imagen_key, created_at, en_muro, updated_at, deleted_at`
const TYPE_COLUMNS = `id, nombre, created_at, updated_at, deleted_at`

async function pull(userId, since) {
  const sql = db()
  const [goals, types, note] = await Promise.all([
    sql.query(
      `select ${GOAL_COLUMNS} from goals where user_id = $1 and updated_at > $2 order by updated_at`,
      [userId, since],
    ),
    sql.query(
      `select ${TYPE_COLUMNS} from types where user_id = $1 and updated_at > $2 order by updated_at`,
      [userId, since],
    ),
    sql.query(`select texto, updated_at from notes where user_id = $1`, [userId]),
  ])
  return {
    serverTime: new Date().toISOString(),
    goals: rows(goals).map(rowToGoal),
    types: rows(types).map(rowToType),
    note: rowToNote(rows(note)[0]),
  }
}

async function applyOp(userId, normalized) {
  const sql = db()
  if (normalized.action === 'del') {
    const statement = normalized.entity === 'goal' ? GOAL_DELETE : TYPE_DELETE
    await sql.query(statement, [normalized.id, userId, normalized.ts])
    return
  }
  if (normalized.entity === 'goal') {
    await sql.query(GOAL_UPSERT, goalParams(normalized.record, userId))
    return
  }
  if (normalized.entity === 'type') {
    await sql.query(TYPE_UPSERT, typeParams(normalized.record, userId))
    return
  }
  await sql.query(NOTE_UPSERT, noteParams(normalized.record, userId))
}

async function push(userId, payload) {
  const parsed = normalizeOps(payload)
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } }

  await ensureUser()
  const acked = []
  const failed = []
  let maxTs = 0

  for (const [index, op] of parsed.ops.entries()) {
    const seq = Number.isFinite(Number(op?.seq)) ? Number(op.seq) : index
    const normalized = normalizeOp(op)
    if (!normalized.ok) {
      failed.push({ seq, error: normalized.error })
      continue
    }
    const tsMs = Date.parse(normalized.ts)
    if (Number.isFinite(tsMs) && tsMs > maxTs) maxTs = tsMs
    try {
      await applyOp(userId, normalized)
      acked.push(seq)
    } catch (error) {
      console.error('op failed:', normalized.entity, normalized.id, error)
      failed.push({ seq, error: 'db_error' })
    }
  }

  return {
    status: 200,
    body: { acked, failed, serverTime: new Date().toISOString() },
    maxTs,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'server_not_configured' })
  }
  const userId = requireSession(req, res)
  if (!userId) return

  try {
    if (req.method === 'GET') {
      const rawSince = req.query?.since
      const since = toIso(rawSince) ?? EPOCH
      const payload = await pull(userId, since)
      const now = Date.parse(payload.serverTime)
      const ageS = Math.round((now - Date.parse(since)) / 1000)
      console.log(
        'sync.pull',
        JSON.stringify({
          ...clientInfo(req),
          since: since === EPOCH ? 'epoch' : since,
          rawSince: rawSince == null ? null : String(rawSince).slice(0, 40),
          ageS,
          goals: payload.goals.length,
          types: payload.types.length,
        }),
      )
      return res.status(200).json(payload)
    }
    const result = await push(userId, jsonBody(req))
    console.log(
      'sync.push',
      JSON.stringify({
        ...clientInfo(req),
        status: result.status,
        acked: result.body?.acked?.length ?? 0,
        failed: result.body?.failed?.length ?? 0,
        skewS: result.maxTs ? Math.round((result.maxTs - Date.now()) / 1000) : null,
      }),
    )
    return res.status(result.status).json(result.body)
  } catch (error) {
    console.error('sync failed:', error)
    return res.status(500).json({ error: 'server_error' })
  }
}
