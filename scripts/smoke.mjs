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
const { clavesDe } = await import(P('api/_lib/limiter.js'))

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

// Todas las llamadas a login viajan con la misma identidad sintética: no toca
// la IP real ni el navegador, y sus contadores se borran antes y después.
// (En producción el bloqueo es por IP + dispositivo + user-agent.)
const IDENTIDAD = {
  'x-forwarded-for': '203.0.113.9',
  'x-focus-device': 'smoke-device',
  'user-agent': 'focus-smoke',
}
const clavesSmoke = clavesDe({ headers: IDENTIDAD }).map((clave) => clave.clave)
const loginCon = (passcode) =>
  call(login, { method: 'POST', headers: { ...IDENTIDAD }, body: { passcode } })
const limpiarIntentos = () =>
  db().query('delete from login_attempts where clave = any($1::text[])', [clavesSmoke])
await limpiarIntentos()

// --- login ---
let res = await loginCon('incorrecto')
assert.equal(res.code, 401, 'passcode malo → 401')
assert.equal(res.body.restantes, 4, 'el servidor dice cuántos intentos quedan')
paso(1, 'passcode incorrecto → 401 con restantes ✓')

res = await loginCon(process.env.PASSCODE)
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
  {
    // El tipo lectura se sigue por páginas: el total va en el propio objetivo.
    seq: 5,
    entity: 'goal',
    op: 'put',
    id: 'smoke-libro',
    ts: TS,
    data: {
      id: 'smoke-libro',
      nombre: 'Libro de prueba',
      tipoId: 'smoke-tipo',
      seguimiento: 'paginas',
      totalPaginas: 1181,
      componentes: [],
      valor: 468,
      marcas: [],
      ultimoMovimiento: '2026-09-28',
      enMuro: true,
      createdAt: Date.now(),
      updatedAt: TS,
    },
  },
]
res = await call(sync, { method: 'POST', ...auth, body: { ops } })
assert.equal(res.code, 200, 'push → 200')
assert.deepEqual(res.body.acked, [0, 1, 2, 5], `ackeados: ${JSON.stringify(res.body.acked)}`)
assert.deepEqual(
  res.body.rejected,
  [{ seq: 4, reason: 'stale' }],
  `sello viejo → rejected: ${JSON.stringify(res.body.rejected)}`,
)
assert.equal(res.body.failed[0].seq, 3, 'la op con imagenKey inválida falla')
assert.equal(res.body.failed[0].error, 'bad_image_key', 'error bad_image_key')
paso(
  5,
  'push → acked [0,1,2,5]; sello viejo → rejected(stale); seq 3 falla (bad_image_key) ✓',
)

res = await call(sync, { method: 'GET', ...auth })
const goal = res.body.goals.find((g) => g.id === 'smoke-meta')
assert.ok(goal, 'la meta volvió en el pull')
assert.equal(goal.nombre, 'Meta de prueba', 'el sello viejo no pisó el nombre')
assert.equal(goal.valor, 10, 'el sello viejo no pisó el valor')
assert.equal(goal.imagenKey, IMG_KEY, 'imagenKey con carpeta intacta')
assert.equal(res.body.goals.find((g) => g.id === 'smoke-mala'), undefined, 'la meta con clave mala no existe')
const libro = res.body.goals.find((g) => g.id === 'smoke-libro')
assert.ok(libro, 'la meta por páginas volvió')
assert.equal(libro.seguimiento, 'paginas', 'modo páginas')
assert.equal(libro.totalPaginas, 1181, 'el total por objetivo viaja en el pull')
assert.equal(libro.valor, 468, 'las páginas leídas viajan como valor')
assert.equal(res.body.types.find((t) => t.id === 'smoke-tipo')?.nombre, 'Smoke', 'el tipo volvió')
assert.equal(res.body.note?.texto, NOTA_SMOKE, 'la nota volvió')
// Los totales vivos son lo único que permite a un cliente notar que le
// faltan registros: una ventana vacía no lo dice.
const vivos = rows(
  await db().query(`select
    (select count(*)::int from goals where user_id = 'local' and deleted_at is null) as goals_total,
    (select count(*)::int from types where user_id = 'local' and deleted_at is null) as types_total`),
)[0]
assert.equal(res.body.goalsTotal, vivos.goals_total, 'goalsTotal = metas vivas reales')
assert.equal(res.body.typesTotal, vivos.types_total, 'typesTotal = tipos vivos reales')
paso(
  6,
  `pull → meta/tipo/nota correctos, LWW respetado y totales (goals=${res.body.goalsTotal}, types=${res.body.typesTotal}) ✓`,
)

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

// Un borrador que nunca subió (la fila no existe) no es un rechazo, y una
// escritura que perdió por sello tiene que verse como tal: si se contara
// como aplicada, el cliente se quedaría con una copia que ya nadie arregla.
res = await call(sync, {
  method: 'POST',
  ...auth,
  body: {
    ops: [
      {
        seq: 0,
        entity: 'goal',
        op: 'del',
        id: 'smoke-nunca-existio',
        ts: new Date().toISOString(),
      },
      {
        seq: 1,
        entity: 'goal',
        op: 'del',
        id: 'smoke-meta',
        ts: '2020-01-01T00:00:00.000Z',
      },
    ],
  },
})
assert.deepEqual(res.body.acked, [0], 'borrar algo que no existe → no-op aplicado')
assert.deepEqual(
  res.body.rejected,
  [{ seq: 1, reason: 'stale' }],
  'borrado con sello viejo sobre fila viva → rejected',
)
paso(12, 'del → no-op aplicado; del con sello viejo → rejected(stale) ✓')

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
paso(13, 'borré la meta → el objeto sale de R2 ✓')

// Un cliente viejo (que no manda totalPaginas) no puede borrar el total de un
// objetivo por páginas: el valor queda en la fila y el SQL lo conserva.
res = await call(sync, {
  method: 'POST',
  ...auth,
  body: {
    ops: [
      {
        seq: 0,
        entity: 'goal',
        op: 'put',
        id: 'smoke-libro',
        ts: new Date().toISOString(),
        data: {
          id: 'smoke-libro',
          nombre: 'Libro de prueba',
          seguimiento: 'paginas',
          componentes: [],
          marcas: [],
          valor: 469,
        },
      },
    ],
  },
})
assert.deepEqual(res.body.acked, [0], 'put sin total → aplicado')
res = await call(sync, { method: 'GET', ...auth })
const libroViejo = res.body.goals.find((g) => g.id === 'smoke-libro')
assert.equal(libroViejo.totalPaginas, 1181, 'el cliente viejo no pisa el total')
assert.equal(libroViejo.valor, 469, 'el resto del put sí se aplicó')
paso(14, 'put sin totalPaginas → total 1181 intacto ✓')

// --- cumplimientos: meta de días, archivar y reabrir ---
// ISO local: la app escribe fechas con `todayISO()` (no UTC).
const _hoy = new Date()
const HOY_ISO = `${_hoy.getFullYear()}-${String(_hoy.getMonth() + 1).padStart(2, '0')}-${String(_hoy.getDate()).padStart(2, '0')}`
const rachaData = (extra) => ({
  id: 'smoke-racha',
  nombre: 'Racha de prueba',
  tipoId: 'smoke-tipo',
  seguimiento: 'streak',
  componentes: [],
  marcas: [],
  valor: 0,
  enMuro: true,
  createdAt: Date.now(),
  ...extra,
})
const ts = () => new Date().toISOString()

res = await call(sync, {
  method: 'POST',
  ...auth,
  body: {
    ops: [
      {
        seq: 0,
        entity: 'goal',
        op: 'put',
        id: 'smoke-racha',
        ts: ts(),
        data: rachaData({ metaDias: 30, finalizadoEn: null, updatedAt: ts() }),
      },
    ],
  },
})
assert.deepEqual(res.body.acked, [0], 'racha con meta → aplicado')
res = await call(sync, { method: 'GET', ...auth })
let racha = res.body.goals.find((g) => g.id === 'smoke-racha')
assert.ok(racha, 'la racha volvió')
assert.equal(racha.metaDias, 30, 'la meta de días viaja en el pull')
assert.equal(racha.finalizadoEn, null, 'sigue viva')

// Un cliente viejo no manda las claves nuevas: no puede vaciarlas.
res = await call(sync, {
  method: 'POST',
  ...auth,
  body: {
    ops: [
      {
        seq: 1,
        entity: 'goal',
        op: 'put',
        id: 'smoke-racha',
        ts: ts(),
        data: rachaData({ valor: 1, updatedAt: ts() }),
      },
    ],
  },
})
assert.deepEqual(res.body.acked, [1], 'put sin claves nuevas → aplicado')
res = await call(sync, { method: 'GET', ...auth })
racha = res.body.goals.find((g) => g.id === 'smoke-racha')
assert.equal(racha.metaDias, 30, 'el cliente viejo no pisa la meta')
assert.equal(racha.finalizadoEn, null, 'el cliente viejo no archiva')
assert.equal(racha.valor, 1, 'el resto del put sí se aplicó')

// Terminar (archivar) y luego reabrir (vaciar la fecha).
res = await call(sync, {
  method: 'POST',
  ...auth,
  body: {
    ops: [
      {
        seq: 2,
        entity: 'goal',
        op: 'put',
        id: 'smoke-racha',
        ts: ts(),
        data: rachaData({ finalizadoEn: HOY_ISO, metaDias: 7, updatedAt: ts() }),
      },
    ],
  },
})
assert.deepEqual(res.body.acked, [2], 'terminar → aplicado')
res = await call(sync, { method: 'GET', ...auth })
racha = res.body.goals.find((g) => g.id === 'smoke-racha')
assert.equal(racha.finalizadoEn, HOY_ISO, 'la fecha de archivado viaja en el pull')
assert.equal(racha.metaDias, 7, 'la meta se actualizó')

res = await call(sync, {
  method: 'POST',
  ...auth,
  body: {
    ops: [
      {
        seq: 0,
        entity: 'goal',
        op: 'put',
        id: 'smoke-racha',
        ts: ts(),
        data: rachaData({ finalizadoEn: null, metaDias: null, updatedAt: ts() }),
      },
    ],
  },
})
assert.deepEqual(res.body.acked, [0], 'reabrir → aplicado')
res = await call(sync, { method: 'GET', ...auth })
racha = res.body.goals.find((g) => g.id === 'smoke-racha')
assert.equal(racha.finalizadoEn, null, 'reabrir limpia la fecha')
assert.equal(racha.metaDias, null, 'la meta vacía queda indefinida')

// Una fecha ilegible no desarchiva nada: la op falla.
res = await call(sync, {
  method: 'POST',
  ...auth,
  body: {
    ops: [
      {
        seq: 1,
        entity: 'goal',
        op: 'put',
        id: 'smoke-racha',
        ts: ts(),
        data: rachaData({ finalizadoEn: 'ayer', updatedAt: ts() }),
      },
    ],
  },
})
assert.equal(res.body.failed[0]?.seq, 1, 'fecha ilegible → falla')
assert.equal(res.body.failed[0]?.error, 'bad_finalizado', 'error bad_finalizado')
paso(
  15,
  'meta de días → pull; cliente viejo no la pisa; terminar/reabrir; fecha ilegible → bad_finalizado ✓',
)

// --- logout y limpieza ---
res = await call(logout, { method: 'POST' })
assert.equal(res.code, 200)
assert.match(res.headers['Set-Cookie'], /^fb_session=;/, 'cookie borrada')
paso(16, 'logout → cookie expirada ✓')

// --- límite de intentos ---
// 5 fallos → 30 min (nivel 1). El bloqueo se mira antes del passcode, así que
// dentro de él ni siquiera la clave correcta sirve.
await limpiarIntentos()
for (let intento = 1; intento <= 4; intento++) {
  res = await loginCon('incorrecto')
  assert.equal(res.code, 401, `fallo ${intento} → 401`)
  assert.equal(res.body.restantes, 5 - intento, `fallo ${intento} → quedan ${5 - intento}`)
}
res = await loginCon('incorrecto')
assert.equal(res.code, 429, '5º fallo → 429')
assert.equal(res.headers['Retry-After'], '1800', 'Retry-After de 30 minutos')
assert.equal(res.body.retry_after, 1800, 'el cuerpo trae lo mismo')
assert.ok(res.body.hasta, 'y hasta cuándo dura')
paso(17, '4 fallos → 401 con restantes; el 5º → 429 + Retry-After 1800 ✓')

res = await loginCon(process.env.PASSCODE)
assert.equal(res.code, 429, 'bloqueado: el passcode correcto no pasa')
paso(18, 'con bloqueo activo, el passcode correcto → 429 ✓')

// `node scripts/unlock-login.mjs` hace exactamente esto.
await limpiarIntentos()
res = await loginCon(process.env.PASSCODE)
assert.equal(res.code, 200, 'sin contadores → el login correcto vuelve')
paso(19, 'desbloqueamos (borramos la identidad) → 200 ✓')

// Un acierto borra la fila entera: el siguiente fallo vuelve a su cupo.
res = await loginCon('incorrecto')
assert.equal(res.code, 401, 'fallo tras el acierto → 401')
assert.equal(res.body.restantes, 4, 'el contador empezó de cero')
res = await loginCon(process.env.PASSCODE)
assert.equal(res.code, 200, 'y el acierto lo vuelve a limpiar')
paso(20, 'un acierto reinicia los contadores ✓')

// --- cuenta de prueba (pass de negocios) ---
// Si hay PASSCODE_DEMO en .env.local probamos también la pass de prueba:
// entra a su cuenta (nunca a la principal) y sus ejemplos no se mezclan.
// Falla si no está sembrada → `npm run demo -- <passcode>`.
const DEMO_PASS = process.env.PASSCODE_DEMO
if (DEMO_PASS) {
  await limpiarIntentos()
  res = await loginCon(DEMO_PASS)
  assert.equal(res.code, 200, 'pass de prueba → 200')
  assert.equal(res.body.perfil, 'negocios', 'responde perfil de negocios')
  assert.notEqual(cookieOf(res), cookie, 'sesión distinta de la principal')
  const demo = { headers: { cookie: cookieOf(res) } }

  res = await call(sync, { method: 'GET', ...demo })
  assert.equal(res.code, 200, 'pull de la cuenta de prueba → 200')
  assert.ok(res.body.goals.length > 0, 'trae sus ejemplos')
  assert.ok(
    res.body.goals.some((goal) => goal.id === 'demo-lanzamiento'),
    'sus objetivos de negocio',
  )
  assert.ok(res.body.note?.texto, 'su nota')
  assert.ok(
    res.body.types.some((tipo) => tipo.nombre === 'Compuesto'),
    'su tipo Compuesto propio (el de serie es de la principal)',
  )
  assert.equal(
    res.body.goals.some((goal) => goal.id.startsWith('seed-')),
    false,
    'sin los ejemplos del visitante',
  )

  res = await call(sync, { method: 'GET', ...auth })
  assert.equal(
    res.body.goals.some((goal) => goal.id.startsWith('demo-')),
    false,
    'la principal no ve los de la de prueba',
  )
  paso(21, 'pass de prueba → 200 + perfil negocios, sus ejemplos sin mezclarse ✓')
} else {
  console.log('  (sin PASSCODE_DEMO en .env.local: se omite la cuenta de prueba)')
}

const sql = db()
// La BD puede tener datos reales: solo borramos lo que creó este smoke.
await sql.query(`delete from goals where user_id = 'local' and id like 'smoke-%'`)
await sql.query(`delete from types where user_id = 'local' and id like 'smoke-%'`)
await sql.query(
  `delete from images where user_id = 'local' and (key like 'img-goals/smoke-%' or key like 'smoke-%')`,
)
await limpiarIntentos()

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
