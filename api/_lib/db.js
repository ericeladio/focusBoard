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
