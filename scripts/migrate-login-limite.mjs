#!/usr/bin/env node
// Crea la tabla de intentos de login (idempotente) y enseña el estado actual
// de los contadores.
//
//   node scripts/migrate-login-limite.mjs
//
// Equivalente a `npm run db:migrate` (el esquema ya la incluye); este script
// existe para aplicarla sola y poder mirar qué está bloqueado.
import { readFileSync, existsSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const ROOT = new URL('..', import.meta.url).pathname

function loadEnvLocal() {
  const file = `${ROOT}.env.local`
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || line.trim().startsWith('#')) continue
    let value = m[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value
  }
}

const DDL = `
  create table if not exists login_attempts (
    clave           text primary key,
    fallos          integer not null default 0,
    nivel           integer not null default 0,
    bloqueado_hasta timestamptz,
    actualizado     timestamptz not null default now()
  )
`

async function main() {
  loadEnvLocal()
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Falta DATABASE_URL: cópiala en .env.local (ver .env.example).')
    process.exit(1)
  }

  const sql = neon(url)
  await sql.query(DDL)
  await sql.query(
    'create index if not exists login_attempts_bloqueo_idx on login_attempts (bloqueado_hasta)',
  )
  console.log('login_attempts: ok (idempotente)')

  const filas = await sql.query(
    `select clave, fallos, nivel, bloqueado_hasta,
            (bloqueado_hasta > now()) as bloqueada
       from login_attempts
      order by bloqueado_hasta desc nulls last`,
  )
  if (!filas.length) {
    console.log('sin contadores todavía.')
    return
  }
  console.log(`${filas.length} identidad(es):`)
  for (const fila of filas) {
    const tipo = String(fila.clave).split(':')[0]
    const estado = fila.bloqueada
      ? `bloqueada hasta ${new Date(fila.bloqueado_hasta).toISOString()}`
      : `libre (${fila.fallos} fallo(s), nivel ${fila.nivel})`
    console.log(`  - ${tipo}: ${estado}`)
  }
}

main().catch((error) => {
  console.error(error?.message ?? error)
  process.exit(1)
})
