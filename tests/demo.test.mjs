import assert from 'node:assert/strict'
import {
  DEMO_GOALS,
  DEMO_NOTE,
  DEMO_TYPES,
  DEMO_USER_ID,
} from '../scripts/demo-examples.mjs'
import { SEED_GOALS, SEED_TYPES } from '../src/lib/seeds.js'
import { ID_COMPUESTO, NOMBRE_COMPUESTO, esHijoDe } from '../src/lib/composite.js'
import { esNombreLectura } from '../src/lib/lectura.js'
import { MAX_FOCUS } from '../src/lib/schemas.js'

assert.equal(DEMO_USER_ID, 'demo-negocios', 'una cuenta aparte de la principal (local)')

// Sin colisión con los ejemplos del visitante: esos se borran al entrar.
const visitante = new Set([...SEED_GOALS.map((g) => g.id), ...SEED_TYPES.map((t) => t.id)])
const ids = new Set(DEMO_GOALS.map((goal) => goal.id))
assert.equal(ids.size, DEMO_GOALS.length, 'ids sin repetir')
for (const id of ids) assert.ok(!visitante.has(id), `${id} se pisaría con un ejemplo del visitante`)

// `types.id` (y `goals.id`) es clave global en la BD: si choca con un id de
// otra cuenta, el upsert lo salta en silencio y la cuenta se queda sin el
// tipo — justo lo que le pasó al `tipo-compuesto` de serie.
const tipoIds = new Set(DEMO_TYPES.map((tipo) => tipo.id))
assert.equal(tipoIds.size, DEMO_TYPES.length, 'ids de tipo sin repetir')
for (const tipo of [...DEMO_TYPES.map((t) => t.id), ID_COMPUESTO]) {
  assert.ok(!visitante.has(tipo), `${tipo} ya es de otra cuenta`)
}
const compuesto = DEMO_TYPES.find((tipo) => tipo.nombre === NOMBRE_COMPUESTO)
assert.ok(compuesto, 'tiene su propio tipo Compuesto')
assert.notEqual(compuesto.id, ID_COMPUESTO, 'con un id que le pertenece a ella')
for (const goal of DEMO_GOALS) {
  assert.ok(tipoIds.has(goal.tipoId), `${goal.id}: tipo desconocido ${goal.tipoId}`)
}
assert.ok(DEMO_TYPES.some((tipo) => esNombreLectura(tipo.nombre)), 'tipo de lectura para páginas')

// Compuesta con partes existentes y fuera del muro.
const compuesta = DEMO_GOALS.find((goal) => goal.seguimiento === 'compuesta')
assert.ok(compuesta, 'hay una compuesta de ejemplo')
assert.ok(compuesta.componentes.length >= 2, 'la compuesta tiene partes')
for (const parteId of compuesta.componentes) assert.ok(ids.has(parteId), `${parteId} no existe`)
for (const parte of DEMO_GOALS.filter((goal) => esHijoDe(goal.id, DEMO_GOALS))) {
  assert.equal(parte.enMuro, false, `${parte.id}: las partes no ocupan el muro`)
}

// El muro no se llena: siempre tiene que caber "Añadir objetivo".
const enMuro = DEMO_GOALS.filter(
  (goal) => goal.enMuro && !goal.finalizadoEn && !esHijoDe(goal.id, DEMO_GOALS),
)
assert.ok(enMuro.length > 0 && enMuro.length < MAX_FOCUS, `en el muro: ${enMuro.length}`)

// Todas las formas de seguir, el pool y /cumplidos con algo dentro.
assert.ok(enMuro.some((goal) => goal.seguimiento === 'percent'))
assert.ok(enMuro.some((goal) => goal.seguimiento === 'streak' && goal.metaDias > 0), 'racha con meta')
assert.ok(enMuro.some((goal) => goal.seguimiento === 'paginas' && goal.totalPaginas > 0), 'páginas')
assert.ok(
  DEMO_GOALS.some((goal) => !goal.enMuro && !goal.finalizadoEn && !esHijoDe(goal.id, DEMO_GOALS)),
  'algo en el pool',
)
assert.ok(DEMO_GOALS.some((goal) => goal.finalizadoEn), 'algo en /cumplidos')

// La nota es una sola línea por asunto y cabe en la hoja (8 líneas).
const lineas = DEMO_NOTE.split('\n')
assert.ok(lineas.length > 0 && lineas.length <= 8, `${lineas.length} líneas de nota`)
