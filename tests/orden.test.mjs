import assert from 'node:assert/strict'
import { mueveA, ordenaIds } from '../src/lib/orden.js'

// Sin arrastre (o con una lista desconocida) manda el orden por defecto.
assert.deepEqual(ordenaIds(['a', 'b', 'c'], []), ['a', 'b', 'c'])
assert.deepEqual(ordenaIds(['a', 'b', 'c'], null), ['a', 'b', 'c'])
assert.deepEqual(ordenaIds([], ['a']), [])

// El orden guardado manda sobre el por defecto (y lo que no esté en el
// guardado es un objetivo nuevo, que sale primero).
assert.deepEqual(ordenaIds(['a', 'b', 'c'], ['c', 'a']), ['b', 'c', 'a'])

// Un objetivo nuevo (todavía no está en el orden guardado) sale primero,
// como en el orden por defecto (los más recientes primero).
assert.deepEqual(ordenaIds(['nuevo', 'a', 'b'], ['b', 'a']), ['nuevo', 'b', 'a'])

// Un id del orden que ya no existe se ignora (borrado en otra pantalla).
assert.deepEqual(ordenaIds(['a', 'b'], ['x', 'b', 'a']), ['b', 'a'])

// Mover: se saca y se mete en el índice indicado.
assert.deepEqual(mueveA(['a', 'b', 'c'], 'a', 0), ['a', 'b', 'c'])
assert.deepEqual(mueveA(['a', 'b', 'c'], 'a', 1), ['b', 'a', 'c'])
assert.deepEqual(mueveA(['a', 'b', 'c'], 'a', 2), ['b', 'c', 'a'])
assert.deepEqual(mueveA(['a', 'b', 'c'], 'c', 0), ['c', 'a', 'b'])
assert.deepEqual(mueveA(['a', 'b', 'c'], 'b', 2), ['a', 'c', 'b'])

// Índices fuera de rango: se recortan, no revientan.
assert.deepEqual(mueveA(['a', 'b', 'c'], 'a', -5), ['a', 'b', 'c'])
assert.deepEqual(mueveA(['a', 'b', 'c'], 'a', 99), ['b', 'c', 'a'])
assert.deepEqual(mueveA(['a'], 'a', 99), ['a'])
