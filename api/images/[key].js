import { readBody } from '../../_lib/body.js'
import { db, ensureUser } from '../../_lib/db.js'
import { MAX_IMAGE_BYTES } from '../../_lib/config.js'
import { deleteObject, getObject, putObject } from '../../_lib/r2.js'
import { requireSession } from '../../_lib/session.js'

const KEY_RE = /^[A-Za-z0-9_-]{4,64}$/
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png']

function keyOf(req) {
  const value = req.query?.key
  return typeof value === 'string' && KEY_RE.test(value) ? value : null
}

async function getHandler(req, res, key) {
  const cached = await getObject(key)
  if (!cached) return res.status(404).json({ error: 'not_found' })
  if (req.headers['if-none-match'] && req.headers['if-none-match'] === cached.etag) {
    return res.status(304).end()
  }
  res.setHeader('Content-Type', cached.contentType ?? 'application/octet-stream')
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable')
  if (cached.etag) res.setHeader('ETag', cached.etag)
  res.setHeader('Content-Length', String(cached.bytes.length))
  return res.status(200).end(Buffer.from(cached.bytes))
}

async function putHandler(req, res, userId, key) {
  const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim()
  if (!ALLOWED_TYPES.includes(contentType)) {
    return res.status(415).json({ error: 'unsupported_media_type' })
  }
  const body = await readBody(req)
  if (!body.length) return res.status(400).json({ error: 'empty_body' })
  if (body.length > MAX_IMAGE_BYTES) return res.status(413).json({ error: 'image_too_large' })

  await ensureUser()
  await putObject(key, body, contentType)

  const sql = db()
  await sql.query(
    `insert into images (key, user_id, content_type, bytes)
     values ($1, $2, $3, $4)
     on conflict (key) do update set
       content_type = excluded.content_type,
       bytes = excluded.bytes
     where images.user_id = excluded.user_id`,
    [key, userId, contentType, body.length],
  )
  return res.status(200).json({ key, bytes: body.length, contentType })
}

async function deleteHandler(req, res, userId, key) {
  const sql = db()
  const referenced = await sql.query(
    `select count(*)::int as total from goals where user_id = $1 and imagen_key = $2`,
    [userId, key],
  )
  const total = Number(referenced?.[0]?.total ?? 0)
  if (total > 0) return res.status(409).json({ error: 'image_in_use' })

  await deleteObject(key)
  await sql.query(`delete from images where key = $1 and user_id = $2`, [key, userId])
  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  const key = keyOf(req)
  if (!key) return res.status(400).json({ error: 'bad_key' })
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PUT, DELETE')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'server_not_configured' })

  const userId = requireSession(req, res)
  if (!userId) return

  try {
    if (req.method === 'GET') return await getHandler(req, res, key)
    if (req.method === 'PUT') return await putHandler(req, res, userId, key)
    return await deleteHandler(req, res, userId, key)
  } catch (error) {
    if (error?.message === 'image_too_large') {
      return res.status(413).json({ error: 'image_too_large' })
    }
    if (error?.message === 'send_image_binary') {
      return res.status(415).json({ error: 'unsupported_media_type' })
    }
    console.error('images failed:', error)
    return res.status(500).json({ error: 'server_error' })
  }
}
