#!/usr/bin/env node
// Comprueba el despliegue REAL de Vercel, no el puente local: ahí es donde se
// coló el bug de las imágenes (en local el bridge fabricaba req.query.key y el
// 400/404 de producción no aparecían).
//
//   node scripts/verify-deploy.mjs [url]     (por defecto, el alias de producción)
//
// Solo lee: hace login, baja los datos y pide las imágenes que devuelven las
// metas. No escribe nada en la BD ni en R2.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const BASE = (process.argv[2] ?? 'https://focus-board-one-blue.vercel.app').replace(/\/+$/, '')

if (!existsSync(path.join(ROOT, '.env.local'))) {
  console.error('Falta .env.local (copia .env.example y pega tus valores).')
  process.exit(1)
}
let passcode
for (const line of readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  if (line.trim().startsWith('#')) continue
  const m = line.match(/^\s*PASSCODE\s*=\s*(.*)\s*$/)
  if (!m) continue
  passcode = m[1]
  if ((passcode.startsWith('"') && passcode.endsWith('"')) || (passcode.startsWith("'") && passcode.endsWith("'"))) {
    passcode = passcode.slice(1, -1)
  }
}
if (!passcode) {
  console.error('Falta PASSCODE en .env.local.')
  process.exit(1)
}

let fallos = 0
const paso = (ok, detalle, grave = true) => {
  if (!ok && grave) fallos += 1
  const marca = ok ? '  ok ' : grave ? '  FALLO ' : '  aviso '
  console.log(`${marca}${detalle}`)
}
const esJson = (res) => (res.headers.get('content-type') ?? '').includes('json')
const esImagen = (res) => (res.headers.get('content-type') ?? '').startsWith('image/')

console.log(`VERIFY: ${BASE}\n`)

// 1. La app se sirve (y no el login de Vercel).
{
  const res = await fetch(`${BASE}/`, { redirect: 'manual' })
  const tipo = res.headers.get('content-type') ?? ''
  paso(
    res.status === 200 && tipo.includes('text/html'),
    `GET / → ${res.status} ${tipo}${res.status === 200 ? '' : ' (¿protección de Vercel?)'}`,
  )
}

// 2. La API responde JSON sin sesión (aquí es donde el HTML del login de
//    Vercel se colaba como respuesta y se traducía en "Sin servidor").
let cookie = null
{
  const res = await fetch(`${BASE}/api/sync`)
  paso(
    res.status === 401 && esJson(res),
    `GET /api/sync sin sesión → ${res.status} ${res.headers.get('content-type')}`,
  )
}

// 3. Login (toca PASSCODE y fija la cookie; no imprime nada).
{
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passcode }),
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  cookie = setCookie.split(';')[0] ?? null
  paso(
    res.status === 200 && /fb_session=/.test(setCookie),
    `POST /api/login → ${res.status} (cookie ${/HttpOnly/.test(setCookie) ? 'HttpOnly' : 'sin HttpOnly'})`,
  )
}
if (!cookie) {
  console.error('\nSin cookie: no puedo seguir.')
  process.exit(1)
}
const auth = { headers: { cookie } }

// 4. Pull contra Neon.
let metas = []
{
  const res = await fetch(`${BASE}/api/sync`, auth)
  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  const ok = res.status === 200 && body && typeof body.serverTime === 'string'
  paso(ok, `GET /api/sync con sesión → ${res.status} (metas=${body?.goals?.length ?? '?'}, tipos=${body?.types?.length ?? '?'})`)
  if (ok) metas = body.goals ?? []

  // Los totales vivos es lo que permite a un cliente notar que le faltan
  // registros; sin ellos la reparación automática no puede funcionar.
  const vivos = (metas.filter((g) => !g.deletedAt) ?? []).length
  const totalesOk =
    Number.isInteger(body?.goalsTotal) &&
    Number.isInteger(body?.typesTotal) &&
    body.goalsTotal >= vivos &&
    body.typesTotal >= (body?.types ?? []).filter((t) => !t.deletedAt).length
  paso(
    totalesOk,
    `totales vivos → goals=${body?.goalsTotal} (vistas ${vivos}), types=${body?.typesTotal}`,
  )
}

// 5. Cada foto que anuncian las metas tiene que venir por su URL nueva:
//    un solo segmento (`img-goals~<id>` o el id plano de las legacy).
{
  const claves = [...new Set(metas.map((g) => g.imagenKey).filter(Boolean))]
  if (!claves.length) console.log('  --  ninguna meta con foto: no hay nada que comprobar')
  for (const key of claves) {
    const segmento = encodeURIComponent(key.includes('/') ? key.replace('/', '~') : key)
    const res = await fetch(`${BASE}/api/images/${segmento}`, auth)
    if (res.status === 200 && esImagen(res)) {
      const bytes = Number(res.headers.get('content-length') ?? 0)
      paso(true, `/api/images/${segmento} → 200 imagen (${bytes} bytes)`)
      continue
    }
    if (res.status === 404 && esJson(res)) {
      paso(false, `/api/images/${segmento} → 404: el objeto no está en R2`, false)
      continue
    }
    const cuerpo = (await res.text()).replace(/\s+/g, ' ').slice(0, 60)
    paso(false, `/api/images/${segmento} → ${res.status} ${res.headers.get('content-type')} ${cuerpo}`)
  }

  // Referencia: el formato viejo (dos barras) es el que traían los clientes
  // antiguos. Si responde HTML, esos clientes tienen que recargar.
  const vieja = claves.find((k) => k.includes('/'))
  if (vieja) {
    const res = await fetch(`${BASE}/api/images/${vieja}`, auth)
    console.log(
      `  --  formato viejo (/api/images/${vieja}) → ${res.status} ` +
        `${esJson(res) ? 'JSON' : 'HTML'} (los clientes sin recargar siguen usándolo)`,
    )
  }
}

console.log(fallos ? `\nVERIFY: ${fallos} fallo(s).` : '\nVERIFY: todo responde como en producción.')
process.exit(fallos ? 1 : 0)
