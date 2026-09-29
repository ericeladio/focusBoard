#!/usr/bin/env node
// Cuenta de prueba (pass de negocios): crea su usuario en Neon con el hash de
// el passcode y le siembra los ejemplos de `demo-examples.mjs`.
//
//   node scripts/seed-demo.mjs <passcode> [--reset]
//   PASSCODE_DEMO=<passcode> npm run demo
//
// El passcode no se guarda en ningún sitio: en Neon solo va su hash, igual
// que la principal (la del env `PASSCODE`). Para cambiarlo, vuelve a correrlo
// con el nuevo. Idempotente: si la cuenta ya tiene objetivos, solo se
// renueva el hash y los datos se quedan como están. Con `--reset` se borra
// todo lo de esa cuenta (objetivos, tipos, nota y fotos) y se vuelve a
// sembrar desde cero.
import { existsSync, readFileSync } from 'node:fs'
import { hashPasscode } from '../api/_lib/config.js'
import { db, rows } from '../api/_lib/db.js'
import { normalizeOp } from '../api/_lib/validate.js'
import {
  GOAL_UPSERT,
  NOTE_UPSERT,
  TYPE_UPSERT,
  goalParams,
  noteParams,
  typeParams,
} from '../api/_lib/shape.js'
import { DEMO_GOALS, DEMO_NOTE, DEMO_TYPES, DEMO_USER_ID } from './demo-examples.mjs'

const ROOT = new URL('..', import.meta.url).pathname

// Mismo lector que `scripts/migrate.mjs`: respeta comillas y no pisa el
// entorno que ya exista.
function loadEnvLocal() {
  const file = `${ROOT}.env.local`
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || line.trim().startsWith('#')) continue
    let value = m[2]
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value
  }
}

function fail(mensaje) {
  console.error(mensaje)
  process.exit(1)
}

async function main() {
  loadEnvLocal()

  const args = process.argv.slice(2)
  const reset = args.includes('--reset')
  const passcode = args.find((arg) => !arg.startsWith('--')) ?? process.env.PASSCODE_DEMO
  if (!passcode || passcode.length < 4) {
    fail('Falta el passcode: `node scripts/seed-demo.mjs <passcode>` (mínimo 4 caracteres).')
  }
  if (!process.env.DATABASE_URL) {
    fail('Falta DATABASE_URL: cópiala en .env.local (ver .env.example).')
  }

  const sql = db()

  await sql.query(
    `insert into users (id, passcode_hash) values ($1, $2)
       on conflict (id) do update set passcode_hash = excluded.passcode_hash`,
    [DEMO_USER_ID, hashPasscode(passcode)],
  )

  if (reset) {
    // Solo lo de esta cuenta: las lápidas que queden en clientes viejos no
    // importan porque la cuenta de prueba no tiene datos que conservar.
    await sql.query('delete from goals where user_id = $1', [DEMO_USER_ID])
    await sql.query('delete from types where user_id = $1', [DEMO_USER_ID])
    await sql.query('delete from images where user_id = $1', [DEMO_USER_ID])
    await sql.query('delete from notes where user_id = $1', [DEMO_USER_ID])
    console.log(`${DEMO_USER_ID}: datos borrados, se vuelve a sembrar.`)
  }

  const vivos = rows(
    await sql.query(
      'select count(*)::int as n from goals where user_id = $1 and deleted_at is null',
      [DEMO_USER_ID],
    ),
  )[0].n
  if (vivos > 0) {
    console.log(
      `${DEMO_USER_ID}: ya tiene ${vivos} objetivos — solo se ha renovado el hash del passcode.`,
    )
    return
  }

  // Sellos estrictamente crecientes, como los de un cliente real.
  const ts = (seq) => new Date(Date.now() + seq).toISOString()
  const aplica = (seq, entity, id, data, upsert, params) => {
    const op = normalizeOp({ seq, entity, op: 'put', id, ts: ts(seq), data })
    if (!op.ok) throw new Error(`${entity} ${id}: ${op.error}`)
    return sql.query(upsert, params(op.record, DEMO_USER_ID))
  }

  let seq = 0
  for (const tipo of DEMO_TYPES) {
    await aplica(seq++, 'type', tipo.id, tipo, TYPE_UPSERT, typeParams)
  }
  for (const goal of DEMO_GOALS) {
    await aplica(seq++, 'goal', goal.id, goal, GOAL_UPSERT, goalParams)
  }
  await aplica(seq++, 'note', 'note', { texto: DEMO_NOTE }, NOTE_UPSERT, noteParams)

  console.log(
    `${DEMO_USER_ID} lista: ${DEMO_TYPES.length} tipos, ${DEMO_GOALS.length} objetivos y la nota. ` +
      'El passcode solo queda como hash en la tabla users.',
  )
  console.log('Para comprobarlo: PASSCODE_DEMO=<passcode> node scripts/smoke.mjs')
}

try {
  await main()
} catch (error) {
  console.error('seed-demo failed:', error?.message ?? error)
  process.exit(1)
}
