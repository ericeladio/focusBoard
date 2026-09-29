#!/usr/bin/env node
// Desbloquea el login: borra los contadores de intentos fallidos.
//
//   node scripts/unlock-login.mjs           (toda la tabla)
//   node scripts/unlock-login.mjs ip        (solo las identidades por IP)
//   node scripts/unlock-login.mjs disp ua   (dispositivo y user-agent)
//
// Uso para cuando te has quedado sin intentos (5 fallos → 30 min; después
// 2 fallos → 24 h) y no quieres esperar, o para limpiarlo tras un despliegue.
import { readFileSync, existsSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const ROOT = new URL('..', import.meta.url).pathname
const TIPOS = new Set(['ip', 'disp', 'ua'])

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

  const tipos = process.argv.slice(2).filter((tipo) => TIPOS.has(tipo))
  for (const arg of process.argv.slice(2)) {
    if (!TIPOS.has(arg)) {
      console.error(`Argumento desconocido: ${arg} (valores: ip, disp, ua).`)
      process.exit(1)
    }
  }

  const sql = neon(url)
  const donde = tipos.length ? `where split_part(clave, ':', 1) = any($1::text[])` : ''
  const params = tipos.length ? [tipos] : []
  const antes = await sql.query(`select count(*)::int as n from login_attempts ${donde}`, params)
  const n = antes[0]?.n ?? 0

  await sql.query(`delete from login_attempts ${donde}`, params)

  const alcance = tipos.length ? tipos.join(' + ') : 'toda la tabla'
  console.log(
    n
      ? `desbloqueado: ${n} fila(s) borradas (${alcance}).`
      : `nada que borrar: no había contadores (${alcance}).`,
  )
}

main().catch((error) => {
  console.error(error?.message ?? error)
  process.exit(1)
})
