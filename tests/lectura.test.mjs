import assert from 'node:assert/strict'
import {
  PAGINAS_POR_DEFECTO,
  esLectura,
  esNombreLectura,
  etiquetaDe,
  pctDe,
  totalPaginasDe,
} from '../src/lib/lectura.js'

// --- el tipo decide el modo, sin importar mayúsculas ni acentos ---
assert.equal(esNombreLectura('lectura'), true)
assert.equal(esNombreLectura('Lectura'), true)
assert.equal(esNombreLectura('  Lectura  '), true)
assert.equal(esNombreLectura('LÉCTURA'), true)
assert.equal(esNombreLectura('lectura y escritura'), false)
assert.equal(esNombreLectura('Libros'), false)
assert.equal(esNombreLectura(null), false)
assert.equal(esLectura({ nombre: 'Lectura' }), true)
assert.equal(esLectura({ nombre: 'Games' }), false)
assert.equal(esLectura(null), false)

// --- el avance por páginas lo calcula el front ---
const libro = { seguimiento: 'paginas', valor: 468, totalPaginas: 1181 }
assert.equal(pctDe(libro), 40, '468 de 1181 es ~40%')
assert.equal(etiquetaDe(libro), '468 de 1181')
assert.equal(pctDe({ ...libro, valor: 0 }), 0, 'sin páginas leídas → 0')
assert.equal(pctDe({ ...libro, valor: 1181 }), 100, 'al terminarlo → 100')
assert.equal(pctDe({ ...libro, valor: 99999 }), 100, 'nunca pasa de 100')
assert.equal(pctDe({ seguimiento: 'percent', valor: 40 }), 40, 'el % sigue como estaba')
assert.equal(etiquetaDe({ seguimiento: 'percent', valor: 40 }), '40%')
assert.equal(pctDe({ seguimiento: 'streak' }), 0, 'la racha no tiene %')

// --- sin total declarado manda el default ---
assert.equal(totalPaginasDe({ seguimiento: 'paginas' }), PAGINAS_POR_DEFECTO)
assert.equal(totalPaginasDe({ seguimiento: 'paginas', totalPaginas: null }), PAGINAS_POR_DEFECTO)
assert.equal(totalPaginasDe({ seguimiento: 'paginas', totalPaginas: 0 }), PAGINAS_POR_DEFECTO)
assert.equal(totalPaginasDe({ seguimiento: 'paginas', totalPaginas: 1181 }), 1181)
assert.equal(pctDe({ seguimiento: 'paginas', valor: 40 }), 20, '40 de 200 → 20%')
assert.equal(etiquetaDe({ seguimiento: 'paginas', valor: 40 }), '40 de 200')

// --- el borrador de la barra pinta su avance sin tocar el objetivo ---
assert.equal(etiquetaDe({ seguimiento: 'percent', valor: 40 }, 55), '55%', 'borrador del slider')
assert.equal(etiquetaDe(libro, 500), '500 de 1181', 'borrador por páginas')
assert.equal(etiquetaDe({ seguimiento: 'percent', valor: 40 }, undefined), '40%', 'sin borrador → el guardado')
assert.equal(etiquetaDe({ seguimiento: 'percent', valor: 40 }, null), '40%', 'null → el guardado')
assert.equal(etiquetaDe({ seguimiento: 'percent', valor: 40 }, 0), '0%', 'el 0 también se puede pintar')

console.log('lectura.test: OK')
