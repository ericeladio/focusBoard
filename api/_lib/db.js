import { neon } from '@neondatabase/serverless'
import { passcodeHash, USER_ID } from './config.js'

let sql = null

export function db() {
  if (!sql) sql = neon(process.env.DATABASE_URL)
  return sql
}

export async function ensureUser() {
  await db().query(
    'insert into users (id, passcode_hash) values ($1, $2) on conflict (id) do nothing',
    [USER_ID, passcodeHash()],
  )
}

export function rows(result) {
  return Array.isArray(result) ? result : (result?.rows ?? [])
}

// --- contadores de intentos de login ---

export async function leerIntentos(claves) {
  const lista = rows(
    await db().query(
      `select clave, fallos, nivel, bloqueado_hasta, actualizado
         from login_attempts
        where clave = any($1::text[])`,
      [claves],
    ),
  )
  return new Map(lista.map((fila) => [fila.clave, fila]))
}

// Incremento atómico de las tres claves a la vez: dos intentos simultáneos no
// pueden pisarse el contador el uno al otro.
export async function incrementarIntentos(claves) {
  const lista = rows(
    await db().query(
      `insert into login_attempts (clave, fallos, nivel, bloqueado_hasta, actualizado)
         select t.clave, 1, 0, null, now() from unnest($1::text[]) as t(clave)
         on conflict (clave) do update
            set fallos = login_attempts.fallos + 1,
                actualizado = now()
       returning clave, fallos, nivel, bloqueado_hasta`,
      [claves],
    ),
  )
  return new Map(lista.map((fila) => [fila.clave, fila]))
}

export async function aplicarBloqueo(claves, plan) {
  await db().query(
    `update login_attempts
        set fallos = $2,
            nivel = $3,
            bloqueado_hasta = $4,
            actualizado = now()
      where clave = any($1::text[])`,
    [claves, plan.fallos, plan.nivel, plan.bloqueado_hasta],
  )
}

export async function borrarIntentos(claves) {
  await db().query('delete from login_attempts where clave = any($1::text[])', [claves])
}
