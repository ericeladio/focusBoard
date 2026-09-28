import assert from 'node:assert/strict'

process.env.SESSION_SECRET = 'test-secret-para-firmar-cookies'
process.env.PASSCODE = '1234'

const { signSession, verifySession, readCookie, requireSession } = await import(
  '../api/_lib/session.js'
)
const { passcodeMatches, missingEnv, USER_ID } = await import('../api/_lib/config.js')

function fakeRes() {
  return {
    code: null,
    body: null,
    headers: {},
    status(value) {
      this.code = value
      return this
    },
    json(value) {
      this.body = value
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
  }
}

// firma y verifica
{
  const token = signSession()
  assert.equal(verifySession(token), USER_ID, 'token propio verifica al usuario')
}

// token alterado / secreto equivocado / expirado
{
  const token = signSession()
  assert.equal(verifySession(`${token}x`), null, 'firma manipulada se rechaza')
  assert.equal(verifySession('a.b.c'), null, 'formato inválido se rechaza')

  const tokenConOriginal = signSession()
  const original = process.env.SESSION_SECRET
  process.env.SESSION_SECRET = 'otro-secreto'
  assert.equal(verifySession(tokenConOriginal), null, 'otro secreto no verifica')
  process.env.SESSION_SECRET = original

  const viejo = signSession(USER_ID, Date.now() - 31 * 24 * 60 * 60 * 1000)
  assert.equal(verifySession(viejo), null, 'token vencido se rechaza')
}

// lectura de cookies
{
  assert.equal(readCookie({ headers: { cookie: 'a=1; fb_session=tok; b=2' } }), 'tok')
  assert.equal(readCookie({ headers: { cookie: 'otra=x' } }), null)
  assert.equal(readCookie({ headers: {} }), null)
}

// requireSession
{
  const res = fakeRes()
  const user = requireSession({ headers: {} }, res)
  assert.equal(user, null, 'sin cookie no hay sesión')
  assert.equal(res.code, 401)
  assert.deepEqual(res.body, { error: 'unauthorized' })
}
{
  const res = fakeRes()
  const req = { headers: { cookie: `fb_session=${signSession()}` } }
  assert.equal(requireSession(req, res), USER_ID, 'con cookie válida hay sesión')
  assert.equal(res.code, null)
}

// passcode
{
  assert.equal(passcodeMatches('1234'), true)
  assert.equal(passcodeMatches('9999'), false)
  assert.equal(passcodeMatches('12'), false, 'muy corto')
  assert.equal(passcodeMatches(undefined), false)
  assert.equal(passcodeMatches(null), false)
}

// entorno
{
  process.env.DATABASE_URL = 'postgres://x'
  process.env.R2_ACCOUNT_ID = 'a'
  process.env.R2_ACCESS_KEY_ID = 'b'
  process.env.R2_SECRET_ACCESS_KEY = 'c'
  process.env.R2_BUCKET = 'd'
  assert.deepEqual(missingEnv(), [], 'todas las claves presentes')
  delete process.env.R2_BUCKET
  assert.deepEqual(missingEnv(), ['R2_BUCKET'], 'falta R2_BUCKET')
}

console.log('session.test: OK')
