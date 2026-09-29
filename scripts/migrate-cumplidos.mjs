#!/usr/bin/env node
// Añade las columnas de cumplimientos a `goals` (idempotente):
//   meta_dias     → meta de días de una racha (null = indefinida)
//   finalizado_en → fecha en la que se terminó (null = sigue vivo)
//
//   node scripts/migrate-cumplidos.mjs
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

async function main() {
  loadEnvLocal()
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Falta DATABASE_URL: cópiala en .env.local (ver .env.example).')
    process.exit(1)
  }

  const sql = neon(url)

  await sql.query('alter table goals add column if not exists meta_dias integer')
  await sql.query('alter table goals add column if not exists finalizado_en text')
  console.log('columnas goals.meta_dias / goals.finalizado_en: ok (idempotente)')

  const vivas = await sql.query(
    `select id, nombre, seguimiento, valor, meta_dias, finalizado_en
       from goals
      where deleted_at is null
      order by finalizado_en desc nulls last, nombre`,
  )
  console.log(`metas vivas: ${vivas.length}`)

  const terminadas = vivas.filter((row) => row.finalizado_en)
  const conMeta = vivas.filter((row) => row.meta_dias != null)
  console.log(`  terminadas: ${terminadas.length}, rachas con meta: ${conMeta.length}`)

  for (const row of vivas) {
    const estado = row.finalizado_en
      ? `terminada el ${row.finalizado_en}`
      : row.meta_dias != null
        ? `${row.seguimiento} con meta de ${row.meta_dias} días`
        : row.seguimiento
    console.log(`  - ${row.nombre}: ${estado}`)
  }
}

main().catch((error) => {
  console.error(error?.message ?? error)
  process.exit(1)
})
