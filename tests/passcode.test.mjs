import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.PASSCODE = '1234'

const { USER_ID, hashPasscode, usuarioDePasscode } = await import('../api/_lib/config.js')

// La pass principal (la del env) siempre gana y no consulta la BD.
test('la pass del env devuelve la cuenta principal', async () => {
  const consultas = []
  const id = await usuarioDePasscode('1234', (hash) => {
    consultas.push(hash)
    return null
  })
  assert.equal(id, USER_ID)
  assert.deepEqual(consultas, [], 'no se consulta Neon si ya coincide el env')
})

// Cualquier otra pass sale de `users`: el hash es lo único que la define.
test('una pass de otra cuenta sale del hash guardado', async () => {
  const esperado = hashPasscode('1717')
  const id = await usuarioDePasscode('1717', (hash) => (hash === esperado ? 'demo-negocios' : null))
  assert.equal(id, 'demo-negocios')
})

test('una pass que no es de nadie no abre nada', async () => {
  assert.equal(await usuarioDePasscode('9999', () => null), null)
  assert.equal(await usuarioDePasscode('1717', () => null), null, 'sin fila en users → nada')
})

test('las longitudes fuera de rango ni se miran', async () => {
  const llamadas = []
  const porHash = (hash) => {
    llamadas.push(hash)
    return 'demo-negocios'
  }
  assert.equal(await usuarioDePasscode('123', porHash), null, 'corto de más')
  assert.equal(await usuarioDePasscode('1'.repeat(65), porHash), null, 'largo de más')
  assert.equal(await usuarioDePasscode(null, porHash), null, 'sin cadena')
  assert.equal(await usuarioDePasscode(undefined, porHash), null)
  assert.deepEqual(llamadas, [], 'un candidato inválido no llega a Neon')
})

test('el hash es estable y distinto para cada pass', () => {
  assert.equal(hashPasscode('1717'), hashPasscode('1717'))
  assert.notEqual(hashPasscode('1717'), hashPasscode('1718'))
  assert.match(hashPasscode('1717'), /^[0-9a-f]{64}$/, 'sha256 en hex')
})
