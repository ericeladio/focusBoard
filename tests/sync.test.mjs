import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import * as idb from '../src/lib/idb.js'
import { adoptServerTime, faltanRegistros, nextTs } from '../src/lib/sync.js'

const SERVER = '2026-09-28T12:00:00.000Z'
const SERVER_MS = Date.parse(SERVER)
const realNow = Date.now

afterEach(() => {
  Date.now = realNow
})

test('un reloj atrasado no genera sellos por detrás del servidor', () => {
  adoptServerTime(SERVER)
  Date.now = () => SERVER_MS - 3_600_000
  assert.equal(Date.parse(nextTs()), SERVER_MS + 1)
})

test('un reloj adelantado solo se adelanta hasta TS_LEAD_MS', () => {
  adoptServerTime(SERVER)
  Date.now = () => SERVER_MS + 3_600_000
  assert.equal(Date.parse(nextTs()), SERVER_MS + 60_000)
})

test('con el reloj local razonable, manda el reloj local', () => {
  adoptServerTime(SERVER)
  Date.now = () => SERVER_MS + 5_000
  assert.equal(Date.parse(nextTs()), SERVER_MS + 5_000)
})

test('los sellos nunca retroceden', () => {
  adoptServerTime(SERVER)
  Date.now = () => SERVER_MS + 5_000
  const first = Date.parse(nextTs())
  const second = Date.parse(nextTs())
  assert.ok(second > first, `${second} > ${first}`)
})

test('faltanRegistros detecta la brecha contra los totales del servidor', () => {
  assert.equal(faltanRegistros(null, { goalsTotal: 9 }), false, 'sin dato local no se repara')
  assert.equal(
    faltanRegistros({ goals: 9, types: 2 }, { goalsTotal: 9, typesTotal: 2 }),
    false,
    'todo presente',
  )
  assert.equal(
    faltanRegistros({ goals: 8, types: 2 }, { goalsTotal: 9, typesTotal: 2 }),
    true,
    'falta una meta',
  )
  assert.equal(
    faltanRegistros({ goals: 9, types: 1 }, { goalsTotal: 9, typesTotal: 2 }),
    true,
    'falta un tipo',
  )
  assert.equal(
    faltanRegistros({ goals: 5, types: 0 }, { goalsTotal: undefined, typesTotal: undefined }),
    false,
    'servidor sin totales (versión vieja)',
  )
})

test('una foto rechazada deja de bloquear la cola de subidas', async () => {
  const key = 'img-goals/prueba-rechazada'
  await idb.saveBlob(key, { blob: {}, contentType: 'image/png' })
  assert.equal((await idb.pendingUploads()).some((record) => record.key === key), true, 'pendiente')

  await idb.rejectImage(key)
  assert.equal((await idb.pendingUploads()).some((record) => record.key === key), false, 'apartada')
  assert.deepEqual(await idb.readRejectedImages(), [key], 'queda registrada para avisar')

  await idb.deleteBlob(key)
  assert.deepEqual(await idb.readRejectedImages(), [], 'al borrar la foto se olvida')
})
