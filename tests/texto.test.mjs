import assert from 'node:assert/strict'
import { filtraPorNombre, normaliza } from '../src/lib/texto.js'

assert.equal(normaliza('  TÉSIS al 100 '), 'tesis al 100')
assert.equal(normaliza('Correr cada día'), 'correr cada dia')
assert.equal(normaliza(null), '')
assert.equal(normaliza(42), '')

const items = [
  { id: 'a', nombre: 'Correr cada día' },
  { id: 'b', nombre: 'Yoga' },
  { id: 'c', nombre: 'Tesis al 100' },
]

const idsDe = (texto) => filtraPorNombre(items, texto).map((item) => item.id)

assert.deepEqual(idsDe(''), ['a', 'b', 'c'])
assert.deepEqual(idsDe('   '), ['a', 'b', 'c'])
// mayúsculas y acentos sobran
assert.deepEqual(idsDe('DIA'), ['a'])
assert.deepEqual(idsDe('  dÍa  '), ['a'])
assert.deepEqual(idsDe('TESIS'), ['c'])
// subcadena por el medio
assert.deepEqual(idsDe('correr ca'), ['a'])
assert.deepEqual(idsDe('al 100'), ['c'])
// sin coincidencias → lista vacía
assert.deepEqual(idsDe('natacion'), [])
// el campo se puede elegir (útil para otro índice)
assert.deepEqual(
  filtraPorNombre([{ id: 'x', titulo: 'Yoga' }], 'yoga', 'titulo').map(
    (item) => item.id,
  ),
  ['x'],
)
