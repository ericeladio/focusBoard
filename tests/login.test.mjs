import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.SESSION_SECRET = 'test-secret-para-los-hash'
process.env.PASSCODE = '1234'

const {
  BLOQUEO_DIARIO_MS,
  BLOQUEO_INICIAL_MS,
  NIVEL_0_MAX,
  NIVEL_1_MAX,
  clavesDe,
  estadoDe,
  hashClave,
  menosRestantes,
  peorBloqueo,
  peorFila,
  planDeBloqueo,
  primeraIp,
} = await import('../api/_lib/limiter.js')

const HORA = Date.parse('2026-09-29T10:00:00.000Z')
const MIN = 60 * 1000

function fila(overrides = {}) {
  return { clave: 'x', fallos: 0, nivel: 0, bloqueado_hasta: null, ...overrides }
}

test('la IP sale del primer tramo de x-forwarded-for', () => {
  assert.equal(primeraIp({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }), '1.2.3.4')
  assert.equal(primeraIp({ 'x-forwarded-for': '  1.2.3.4  ' }), '1.2.3.4')
  assert.equal(primeraIp({ 'x-real-ip': '5.6.7.8' }), '5.6.7.8')
  assert.equal(primeraIp({}), 'desconocido')
  assert.equal(primeraIp({ 'x-forwarded-for': '' }), 'desconocido')
})

test('tres claves por intento, con el tipo de prefijo', () => {
  const req = {
    headers: {
      'x-forwarded-for': '203.0.113.9, 10.0.0.1',
      'x-focus-device': 'uuid-dispositivo',
      'user-agent': 'Mozilla/5.0',
    },
  }
  const claves = clavesDe(req)
  assert.deepEqual(
    claves.map((clave) => clave.tipo),
    ['ip', 'ua', 'disp'],
  )
  for (const clave of claves) assert.ok(clave.clave.startsWith(`${clave.tipo}:`))
  // La misma petición da las mismas claves (y distinta sal cambia todas).
  assert.deepEqual(clavesDe(req).map((clave) => clave.clave), claves.map((clave) => clave.clave))
  const otraSal = hashClave('ip', '203.0.113.9')
  process.env.LOGIN_LOCK_SALT = 'sal-otra'
  assert.notEqual(hashClave('ip', '203.0.113.9'), otraSal)
  delete process.env.LOGIN_LOCK_SALT
})

test('sin dispositivo solo hay dos claves (y la UA vacía no se inventa)', () => {
  const claves = clavesDe({ headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': '   ' } })
  assert.deepEqual(
    claves.map((clave) => clave.tipo),
    ['ip', 'ua'],
  )
  assert.equal(claves.find((clave) => clave.tipo === 'ua').valor, 'desconocido')
})

test('estado: sin fila hay 5 intentos y no hay bloqueo', () => {
  const estado = estadoDe(undefined, HORA)
  assert.equal(estado.bloqueado, false)
  assert.equal(estado.restantes, NIVEL_0_MAX)
  assert.equal(estado.hasta, null)
})

test('estado: dentro del bloqueo no quedan intentos y se lee la fecha', () => {
  const hasta = new Date(HORA + 30 * MIN).toISOString()
  const estado = estadoDe(fila({ fallos: NIVEL_0_MAX, bloqueado_hasta: hasta }), HORA + MIN)
  assert.equal(estado.bloqueado, true)
  assert.equal(estado.restantes, 0)
  assert.equal(estado.restanteMs, 29 * MIN)
  assert.equal(estado.hasta, hasta)

  // Pasado el bloqueo se vuelve a tener su cupo (nivel 1: 2).
  const pasada = estadoDe(fila({ fallos: 0, nivel: 1, bloqueado_hasta: hasta }), HORA + 31 * MIN)
  assert.equal(pasada.bloqueado, false)
  assert.equal(pasada.restantes, NIVEL_1_MAX)
})

test('estado: acepta fechas como Date (neon) además de ISO', () => {
  const estado = estadoDe(fila({ bloqueado_hasta: new Date(HORA + 5 * MIN) }), HORA)
  assert.equal(estado.bloqueado, true)
  assert.equal(estado.restanteMs, 5 * MIN)
})

test('peorBloqueo se queda con el bloqueo más largo', () => {
  const corto = estadoDe(fila({ bloqueado_hasta: new Date(HORA + MIN) }), HORA)
  const largo = estadoDe(fila({ bloqueado_hasta: new Date(HORA + 60 * MIN) }), HORA)
  const libre = estadoDe(fila({ fallos: 1 }), HORA)
  assert.equal(peorBloqueo([libre, corto]), corto)
  assert.equal(peorBloqueo([corto, largo]), largo)
  assert.equal(peorBloqueo([libre, estadoDe(undefined, HORA)]), null)
  assert.equal(peorBloqueo([]), null)
  assert.equal(peorBloqueo(null), null)
})

test('menosRestantes devuelve el mínimo entre las claves', () => {
  const estados = [estadoDe(fila({ fallos: 1 }), HORA), estadoDe(fila({ fallos: 3 }), HORA)]
  assert.equal(menosRestantes(estados), NIVEL_0_MAX - 3)
  assert.equal(menosRestantes([estadoDe(fila({ fallos: 9 }), HORA)]), 0)
  assert.equal(menosRestantes([]), null)
})

test('peorFila se queda con la que más ha fallado', () => {
  const filas = new Map([
    ['a', fila({ clave: 'a', fallos: 2 })],
    ['b', fila({ clave: 'b', fallos: 4 })],
    ['c', fila({ clave: 'c', fallos: 1 })],
  ])
  assert.equal(peorFila(filas).clave, 'b')
  assert.equal(peorFila([fila({ fallos: 5 })]).fallos, 5)
  assert.equal(peorFila([]), undefined)
})

test('plan: 4 fallos no bloquean, el 5º bloquea 30 min', () => {
  assert.equal(planDeBloqueo(fila({ fallos: NIVEL_0_MAX - 1 }), HORA), null)
  const plan = planDeBloqueo(fila({ fallos: NIVEL_0_MAX }), HORA)
  assert.ok(plan)
  assert.equal(plan.ms, BLOQUEO_INICIAL_MS)
  assert.equal(plan.nivel, 1, 'tras el primer bloqueo sube al nivel 1')
  assert.equal(plan.fallos, 0, 'el bloqueo deja el contador a cero')
  assert.equal(plan.bloqueado_hasta, new Date(HORA + BLOQUEO_INICIAL_MS).toISOString())
})

test('plan: en nivel 1 bastan 2 fallos y el bloqueo es de 24 h', () => {
  assert.equal(planDeBloqueo(fila({ fallos: 1, nivel: 1 }), HORA), null)
  const plan = planDeBloqueo(fila({ fallos: NIVEL_1_MAX, nivel: 1 }), HORA)
  assert.ok(plan)
  assert.equal(plan.ms, BLOQUEO_DIARIO_MS)
  assert.equal(plan.nivel, 1)
})

test('plan: si la fila viene vacía o rota no se bloquea nada', () => {
  assert.equal(planDeBloqueo(undefined, HORA), null)
  assert.equal(planDeBloqueo(fila({ fallos: Number.NaN }), HORA), null)
})

test('escalonado: 5 fallos → 30 min; al liberarse, 2 fallos → 24 h; un acierto lo deja a cero', () => {
  let ahora = HORA
  let filaActual = fila()

  for (let intento = 1; intento <= NIVEL_0_MAX; intento++) {
    filaActual = { ...filaActual, fallos: filaActual.fallos + 1 }
    const plan = planDeBloqueo(filaActual, ahora)
    if (intento < NIVEL_0_MAX) {
      assert.equal(plan, null, `el fallo ${intento} no bloquea todavía`)
      continue
    }
    assert.ok(plan, 'el 5º fallo bloquea')
    filaActual = { ...filaActual, ...plan, bloqueado_hasta: Date.parse(plan.bloqueado_hasta) }
  }

  assert.equal(estadoDe({ ...filaActual, bloqueado_hasta: new Date(filaActual.bloqueado_hasta) }, ahora).bloqueado, true)
  ahora = filaActual.bloqueado_hasta + 1

  for (let intento = 1; intento <= NIVEL_1_MAX; intento++) {
    filaActual = { ...filaActual, fallos: filaActual.fallos + 1 }
    const plan = planDeBloqueo(filaActual, ahora)
    if (intento < NIVEL_1_MAX) {
      assert.equal(plan, null, 'el primer fallo del nivel 1 no bloquea')
      continue
    }
    assert.ok(plan, 'el 2º fallo del nivel 1 bloquea 24 h')
    assert.equal(plan.ms, BLOQUEO_DIARIO_MS)
    filaActual = { ...filaActual, ...plan, bloqueado_hasta: Date.parse(plan.bloqueado_hasta) }
  }

  // Un acierto borra la fila entera: no solo el contador, también el nivel,
  // así que vuelve a hacer falta medio decenio de fallos para bloquear.
  assert.equal(planDeBloqueo(undefined, ahora), null)
  assert.equal(estadoDe(undefined, ahora).restantes, NIVEL_0_MAX)
})

console.log('login.test: OK')
