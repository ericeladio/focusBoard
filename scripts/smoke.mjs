#!/usr/bin/env node
// Smoke de la API sin servidor: llama a los handlers de Vercel con req/res
// falsos contra la BD y el bucket reales. No deja datos: limpia al final.
//
//   node scripts/smoke.mjs
import { readFileSync, existsSync } from 'node:fs'
import assert from 'node:assert/strict'

const ROOT = new URL('..', import.meta.url).pathname
const P = (p) => `file://${ROOT}${p}`

if (!existsSync(`${ROOT}.env.local`)) {
  console.error('Falta .env.local (copia .env.example y pega tus valores).')
  process.exit(1)
}
for (const line of readFileSync(`${ROOT}.env.local`, 'utf8').split('\n')) {
  if (line.trim().startsWith('#')) continue
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

const login = (await import(P('api/login.js'))).default
const logout = (await import(P('api/logout.js'))).default
const sync = (await import(P('api/sync.js'))).default
const images = (await import(P('api/images/[...key].js'))).default
const { db, rows } = await import(P('api/_lib/db.js'))

function fakeRes() {
  const res = {
    code: null,
    body: null,
    headers: {},
    ended: null,
    status(v) {
      res.code = v
      return res
    },
    json(v) {
      res.body = v
      return res
    },
    setHeader(n, v) {
      res.headers[n] = v
    },
    end(v) {
      res.ended = v
      return res
    },
  }
  return res
}

const call = async (handler, req) => {
  const res = fakeRes()
  await handler({ headers: {}, ...req }, res)
  return res
}
const paso = (n, detalle) => console.log(`  ${n}. ${detalle}`)
const cookieOf = (res) => String(res.headers['Set-Cookie'] ?? '').split(';')[0]

console.log('SMOKE: API de focusBoard\n')

// --- login ---
let res = await call(login, { method: 'POST', body: { passcode: 'incorrecto' } })
assert.equal(res.code, 401, 'passcode malo → 401')
paso(1, 'passcode incorrecto → 401 ✓')

res = await call(login, { method: 'POST', body: { passcode: process.env.PASSCODE } })
assert.equal(res.code, 200, 'passcode bueno → 200')
const cookie = cookieOf(res)
assert.match(cookie, /^fb_session=/, 'fija fb_session')
assert.match(res.headers['Set-Cookie'], /HttpOnly/, 'cookie HttpOnly')
paso(2, 'passcode correcto → 200 + cookie HttpOnly ✓')

const auth = { headers: { cookie } }

// --- sync ---
res = await call(sync, { method: 'GET' })
assert.equal(res.code, 401, 'sin sesión → 401')
paso(3, 'GET /api/sync sin sesión → 401 ✓')

res = await call(sync, { method: 'GET', ...auth })
assert.equal(res.code, 200, 'pull inicial → 200')
assert.ok(res.body.serverTime && Array.isArray(res.body.goals), 'trae serverTime y listas')
paso(4, `pull inicial → 200 (goals=${res.body.goals.length}, types=${res.body.types.length}) ✓`)

// La nota es una sola fila por usuario: guardamos la real para restaurarla.
const originalNote = res.body.note ?? null
const NOTA_SMOKE = 'nota de prueba'

const TS = new Date().toISOString()
const IMG_KEY = `img-goals/smoke-${Date.now().toString(36)}`
const ops = [
  { seq: 0, entity: 'type', op: 'put', id: 'smoke-tipo', ts: TS, data: { id: 'smoke-tipo', nombre: 'Smoke' } },
  {
    seq: 1,
    entity: 'goal',
    op: 'put',
    id: 'smoke-meta',
    ts: TS,
    data: {
      id: 'smoke-meta',
      nombre: 'Meta de prueba',
      tipoId: 'smoke-tipo',
      seguimiento: 'percent',
      componentes: [],
      valor: 10,
      marcas: [],
      ultimoMovimiento: '2026-09-28',
      imagenKey: IMG_KEY,
      createdAt: Date.now(),
      enMuro: true,
      updatedAt: TS,
    },
  },
  { seq: 2, entity: 'note', op: 'put', id: 'note', ts: TS, data: { texto: NOTA_SMOKE } },
  {
    seq: 3,
    entity: 'goal',
    op: 'put',
    id: 'smoke-mala',
    ts: TS,
    data: {
      id: 'smoke-mala',
      nombre: 'clave mala',
      seguimiento: 'percent',
      componentes: [],
      marcas: [],
      imagenKey: 'a/b/c',
    },
  },
  {
    seq: 4,
    entity: 'goal',
    op: 'put',
    id: 'smoke-meta',
    ts: '2020-01-01T00:00:00.000Z',
    data: { id: 'smoke-meta', nombre: 'pisada vieja', seguimiento: 'percent', componentes: [], marcas: [], valor: 99 },
  },
]
res = await call(sync, { method: 'POST', ...auth, body: { ops } })
assert.equal(res.code, 200, 'push → 200')
assert.deepEqual(res.body.acked, [0, 1, 2, 4], `ackeados: ${JSON.stringify(res.body.acked)}`)
assert.equal(res.body.failed[0].seq, 3, 'la op con imagenKey inválida falla')
assert.equal(res.body.failed[0].error, 'bad_image_key', 'error bad_image_key')
paso(5, 'push → acked [0,1,2,4]; seq 3 rechazado (bad_image_key); sello viejo sin efecto ✓')

res = await call(sync, { method: 'GET', ...auth })
const goal = res.body.goals.find((g) => g.id === 'smoke-meta')
assert.ok(goal, 'la meta volvió en el pull')
assert.equal(goal.nombre, 'Meta de prueba', 'el sello viejo no pisó el nombre')
assert.equal(goal.valor, 10, 'el sello viejo no pisó el valor')
assert.equal(goal.imagenKey, IMG_KEY, 'imagenKey con carpeta intacta')
assert.equal(res.body.goals.find((g) => g.id === 'smoke-mala'), undefined, 'la meta con clave mala no existe')
assert.equal(res.body.types.find((t) => t.id === 'smoke-tipo')?.nombre, 'Smoke', 'el tipo volvió')
assert.equal(res.body.note?.texto, NOTA_SMOKE, 'la nota volvió')
paso(6, 'pull → meta/tipo/nota correctos y LWW respetado ✓')

// --- imágenes ---
// Las peticiones se montan como en producción: la clave viaja en la ruta, en un
// solo segmento (`img-goals~<id>`). `req.query.key` no llega en Vercel, así que
// solo lo usamos en el caso de respaldo.
const { imageKeyToSegment } = await import(P('shared/imageKey.js'))
const urlOf = (key) => `/api/images/${encodeURIComponent(imageKeyToSegment(key))}`
const urlRaw = (key) => `/api/images/${encodeURIComponent(key)}`

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
res = await call(images, {
  method: 'PUT',
  headers: { cookie, 'content-type': 'image/png' },
  body: png,
  url: urlOf(IMG_KEY),
})
assert.equal(res.code, 200, 'PUT → 200')
assert.equal(res.body.bytes, png.length, 'bytes guardados')
paso(7, `PUT ${urlOf(IMG_KEY)} → 200 (${png.length} bytes) ✓`)

res = await call(images, { method: 'GET', headers: { cookie }, url: urlOf(IMG_KEY) })
assert.equal(res.code, 200, 'GET → 200')
assert.equal(res.headers['Content-Type'], 'image/png', 'content-type correcto')
assert.match(res.headers['Cache-Control'], /immutable/, 'cache inmutable')
assert.equal(Buffer.compare(res.ended, png), 0, 'bytes idénticos')
paso(8, 'GET por ruta (un segmento) → 200, bytes idénticos ✓')

// Respaldo: sin `url`, la clave solo en la query (así se llamaba antes).
res = await call(images, {
  method: 'GET',
  headers: { cookie },
  query: { key: IMG_KEY.split('/') },
})
assert.equal(res.code, 200, 'GET por query → 200')
paso(9, 'respaldo por req.query.key (sin url) → 200 ✓')

for (const [malo, motivo] of [
  ['a/b/c', 'dos barras'],
  ['img goals/x', 'espacio'],
  ['../secretos', 'traversal'],
]) {
  res = await call(images, { method: 'GET', headers: { cookie }, url: urlRaw(malo) })
  assert.equal(res.code, 400, `${motivo} → 400`)
}
paso(10, 'claves inválidas (a/b/c, espacio, ..) → 400 ✓')

res = await call(images, { method: 'DELETE', headers: { cookie }, url: urlOf(IMG_KEY) })
assert.equal(res.code, 409, 'imagen en uso → 409')
paso(11, 'DELETE con la meta usándola → 409 image_in_use ✓')

res = await call(sync, {
  method: 'POST',
  ...auth,
  body: { ops: [{ seq: 0, entity: 'goal', op: 'del', id: 'smoke-meta', ts: new Date().toISOString() }] },
})
assert.equal(res.code, 200, 'del de la meta → 200')
res = await call(images, { method: 'DELETE', headers: { cookie }, url: urlOf(IMG_KEY) })
assert.equal(res.code, 200, 'DELETE → 200')
res = await call(images, { method: 'GET', headers: { cookie }, url: urlOf(IMG_KEY) })
assert.equal(res.code, 404, 'objeto borrado → 404')
paso(12, 'borré la meta → el objeto sale de R2 ✓')

// --- logout y limpieza ---
res = await call(logout, { method: 'POST' })
assert.equal(res.code, 200)
assert.match(res.headers['Set-Cookie'], /^fb_session=;/, 'cookie borrada')
paso(13, 'logout → cookie expirada ✓')

const sql = db()
// La BD puede tener datos reales: solo borramos lo que creó este smoke.
await sql.query(`delete from goals where user_id = 'local' and id like 'smoke-%'`)
await sql.query(`delete from types where user_id = 'local' and id like 'smoke-%'`)
await sql.query(
  `delete from images where user_id = 'local' and (key like 'img-goals/smoke-%' or key like 'smoke-%')`,
)

// La nota es única por usuario: la restauramos solo si sigue siendo la nuestra
// (si alguien la editó después, manda lo suyo y no tocamos nada).
const actualNote = rows(await sql.query(`select texto from notes where user_id = 'local'`))[0]
let notaEstado = 'intacta'
if (actualNote?.texto === NOTA_SMOKE) {
  if (originalNote) {
    await sql.query(
      `update notes set texto = $1, updated_at = $2 where user_id = 'local' and texto = $3`,
      [originalNote.texto ?? null, new Date().toISOString(), NOTA_SMOKE],
    )
    notaEstado = 'restaurada'
  } else {
    await sql.query(`delete from notes where user_id = 'local' and texto = $1`, [NOTA_SMOKE])
    notaEstado = 'eliminada'
  }
}
console.log(`\nSMOKE OK — solo se borró lo que creó el smoke (nota: ${notaEstado}).`)
