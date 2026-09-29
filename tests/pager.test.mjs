import assert from 'node:assert/strict'
import { POR_PAGINA, paginasVisibles } from '../src/lib/pager.js'

// diez filas por página
assert.equal(POR_PAGINA, 10)

// pocas páginas → se ven todas, sin puntos suspensivos
assert.deepEqual(paginasVisibles(1, 1), [1], 'una sola página')
assert.deepEqual(paginasVisibles(3, 7), [1, 2, 3, 4, 5, 6, 7], 'siete sin huecos')

// muchas páginas → extremos + vecinas de la actual, huecos con '…'
assert.deepEqual(paginasVisibles(1, 10), [1, 2, '…', 10], 'recién entrado')
assert.deepEqual(paginasVisibles(5, 10), [1, '…', 4, 5, 6, '…', 10], 'en medio')
assert.deepEqual(paginasVisibles(10, 10), [1, '…', 9, 10], 'en la última')

// la actual siempre está pintada y dentro de rango
for (const [actual, total] of [[1, 5], [3, 8], [8, 8], [4, 12]]) {
  const elementos = paginasVisibles(actual, total)
  assert.ok(elementos.includes(actual), `la página ${actual} se ve en ${total}`)
}

// fuera de rango no se rompe: solo se filtra
assert.deepEqual(paginasVisibles(0, 4), [1, 2, 3, 4], 'página 0 → todas')

console.log('pager.test: OK')
