import { createHash, timingSafeEqual } from 'node:crypto'

export const USER_ID = 'local'
export const SESSION_COOKIE = 'fb_session'
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60
export const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024

const REQUIRED = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'PASSCODE',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
]

export function missingEnv() {
  return REQUIRED.filter((name) => !process.env[name])
}

function digest(value) {
  return createHash('sha256').update(String(value)).digest()
}

export function passcodeMatches(candidate) {
  const expected = process.env.PASSCODE
  if (typeof candidate !== 'string' || !expected) return false
  if (candidate.length < 4 || candidate.length > 64) return false
  return timingSafeEqual(digest(candidate), digest(expected))
}

export function passcodeHash() {
  return hashPasscode(process.env.PASSCODE ?? '')
}

export function hashPasscode(value) {
  return digest(value).toString('hex')
}

// Cuenta a la que da un passcode: la principal (la del env `PASSCODE`) o
// cualquier otra fila de `users` — cada cuenta guarda su hash en Neon y aquí
// solo se comprueba contra él. `porHash` es la consulta (hash → id | null);
// en los tests es una función falsa, así que nada de esto toca la BD.
export async function usuarioDePasscode(candidate, porHash) {
  if (typeof candidate !== 'string') return null
  if (candidate.length < 4 || candidate.length > 64) return null
  if (passcodeMatches(candidate)) return USER_ID
  return (await porHash(hashPasscode(candidate))) ?? null
}
