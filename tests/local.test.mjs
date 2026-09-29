import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  clavesOutbox,
  debeSubir,
  esLocal,
  imagenesLocales,
  marcarLocal,
  marcarLocales,
  marcarNotaLocal,
} from '../src/lib/local.js'
import { collectOps, stampArray } from '../src/lib/ops.js'

const meta = (id, extra = {}) => ({
  id,
  nombre: `Meta ${id}`,
  seguimiento: 'percent',
  valor: 0,
  marcas: [],
  updatedAt: '2026-09-29T10:00:00.000Z',
  ...extra,
})

test('marcarLocal no duplica la marca ni toca lo que ya es local', () => {
  const cuenta = meta('a')
  const local = marcarLocal(cuenta)
  assert.equal(esLocal(cuenta), false, 'el registro original no cambia')
  assert.equal(local.local, true)
  assert.equal(marcarLocal(local), local, 'lo local se queda igual (misma referencia)')
})

test('marcarLocales deja fuera lo que ya es de la cuenta cuando lo está', () => {
  const lista = marcarLocales([meta('a'), meta('b', { local: true })])
  assert.deepEqual(
    lista.map(esLocal),
    [true, true],
    'la primera sesión marca todo lo que hay',
  )
  assert.equal(lista[1].local, true)
})

test('una nota vacía no se marca: la de la cuenta puede entrar', () => {
  assert.equal(marcarNotaLocal({ texto: null, updatedAt: null }).local, undefined)
  const nota = marcarNotaLocal({ texto: 'comprar pan', updatedAt: null })
  assert.equal(esLocal(nota), true, 'la nota escrita sin cuenta es local')
})

test('solo lo local aparece en las claves del outbox', () => {
  const claves = clavesOutbox({
    goals: [meta('m1', { local: true }), meta('m2')],
    types: [{ id: 't1', nombre: 'Personal', local: true }, { id: 't2', nombre: 'Trabajo' }],
    note: { texto: 'hola', updatedAt: null, local: true },
  })
  assert.deepEqual([...claves].sort(), ['goal:m1', 'note:note', 'type:t1'])
})

test('las fotos de los objetivos locales no se suben', () => {
  const fotos = imagenesLocales([
    meta('m1', { local: true, imagenKey: 'img-goals/uno' }),
    meta('m2', { imagenKey: 'img-goals/dos' }),
  ])
  assert.deepEqual([...fotos], ['img-goals/uno'])
  assert.deepEqual([...imagenesLocales([meta('m2', { imagenKey: 'img-goals/dos' })])], [])
})

test('debeSubir: solo lo de la cuenta y sellado', () => {
  assert.equal(debeSubir(meta('a')), true)
  assert.equal(debeSubir(meta('a', { local: true })), false, 'lo local nunca sube')
  assert.equal(debeSubir({ id: 'x' }), false, 'sin sello no sube')
  assert.equal(debeSubir(undefined), false)
})

test('collectOps no encola nada de lo local', () => {
  const prev = [meta('m1', { local: true, valor: 0 })]
  const next = [meta('m1', { local: true, valor: 50, updatedAt: '2026-09-29T11:00:00.000Z' })]
  const ops = []
  collectOps(prev, next, 'goal', ops)
  assert.deepEqual(ops, [], 'una meta local editada no sale por el outbox')
})

test('collectOps encola lo de la cuenta, y lo que se sube a la cuenta', () => {
  const prev = [meta('m1')]
  const next = [meta('m1', { valor: 50, updatedAt: '2026-09-29T11:00:00.000Z' })]
  const ops = []
  collectOps(prev, next, 'goal', ops)
  assert.equal(ops.length, 1, 'una meta de la cuenta editada se sube')
  assert.equal(ops[0].id, 'm1')

  // Promoción: al subirlo se quita la marca y se sella con fecha nueva
  // (es lo que hace `setGoals` → `stampArray`), y a partir de ahí sube.
  const antes = [meta('m2', { local: true })]
  const despues = [meta('m2', { updatedAt: '2026-09-29T12:00:00.000Z' })]
  const trasOps = []
  collectOps(antes, despues, 'goal', trasOps)
  assert.equal(trasOps.length, 1, 'al subirlo a la cuenta, sale por el outbox')
})

test('collectOps respeta los sellos: sin cambio no hay op', () => {
  const registro = meta('m1')
  const ops = []
  collectOps([registro], [registro], 'goal', ops)
  assert.deepEqual(ops, [], 'la misma referencia no genera op')
  const mismoSello = meta('m1')
  const ops2 = []
  collectOps([registro], [mismoSello], 'goal', ops2)
  assert.deepEqual(ops2, [], 'mismo sello (por ejemplo al bajar del servidor) no genera op')
})

test('stampArray sigue sellando lo que cambia (lo local no se queda sin sello)', () => {
  const prev = [meta('m1')]
  const next = [...prev, meta('m2', { local: true, updatedAt: '2026-09-29T10:00:00.000Z' })]
  const resultado = stampArray(prev, next)
  assert.notEqual(resultado, prev)
  assert.equal(resultado[0], prev[0], 'lo que no cambió conserva su sello')
  assert.ok(resultado[1].local, 'la marca de local no se pierde')
})
