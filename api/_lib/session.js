import { createHmac, timingSafeEqual } from 'node:crypto'
import { SESSION_COOKIE, SESSION_MAX_AGE, USER_ID } from './config.js'

function b64(value) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function unb64(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function hmac(payload) {
  return createHmac('sha256', process.env.SESSION_SECRET ?? '')
    .update(payload)
    .digest('base64url')
}

export function signSession(userId = USER_ID, now = Date.now()) {
  const expiresAt = now + SESSION_MAX_AGE * 1000
  const payload = `${b64(userId)}.${expiresAt}`
  return `${payload}.${hmac(payload)}`
}

export function verifySession(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [user, expiresAt, signature] = parts
  const expected = hmac(`${user}.${expiresAt}`)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (Number(expiresAt) < Date.now()) return null
  return unb64(user)
}

export function readCookie(req, name = SESSION_COOKIE) {
  const header = req.headers?.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim()
  }
  return null
}

export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`,
  )
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; Max-Age=0`)
}

export function requireSession(req, res) {
  const userId = verifySession(readCookie(req))
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' })
    return null
  }
  return userId
}
