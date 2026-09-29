import assert from 'node:assert/strict'
import { SEED_GOALS, SEED_TYPES } from '../src/lib/seeds.js'
import { ID_COMPUESTO, esHijoDe } from '../src/lib/composite.js'
import { esNombreLectura } from '../src/lib/lectura.js'
import { MAX_FOCUS } from '../src/lib/schemas.js'

const ids = new Set(SEED_GOALS.map((goal) => goal.id))
assert.equal(ids.size, SEED_GOALS.length, 'ids de ejemplos sin repetir')

// Cada ejemplo apunta a un tipo que existe; la compuesta usa el tipo compuesto.
const tipoIds = new Set([...SEED_TYPES.map((tipo) => tipo.id), ID_COMPUESTO])
for (const goal of SEED_GOALS) {
  assert.ok(tipoIds.has(goal.tipoId), `${goal.id}: tipo desconocido ${goal.tipoId}`)
}

// Sin un tipo "Lectura" el ejemplo de páginas no encendería el modo.
assert.ok(
  SEED_TYPES.some((tipo) => esNombreLectura(tipo.nombre)),
  'hace falta un tipo de lectura entre los tipos de ejemplo',
)

// La compuesta apunta a partes que existen; las partes no ocupan cupo ni muro.
const compuesta = SEED_GOALS.find((goal) => goal.seguimiento === 'compuesta')
assert.ok(compuesta, 'el set de ejemplos incluye una compuesta')
assert.ok(compuesta.componentes.length >= 2, 'la compuesta de ejemplo tiene partes')
for (const parteId of compuesta.componentes) {
  assert.ok(ids.has(parteId), `la parte ${parteId} no existe`)
}
const partes = SEED_GOALS.filter((goal) => esHijoDe(goal.id, SEED_GOALS))
assert.ok(partes.length > 0, 'las partes se detectan como hijas')
for (const parte of partes) {
  assert.equal(parte.enMuro, false, `${parte.id}: las partes no ocupan el muro`)
}

// El muro no se llena con los ejemplos: siempre debe caber "Añadir objetivo".
const enMuro = SEED_GOALS.filter(
  (goal) => goal.enMuro && !goal.finalizadoEn && !esHijoDe(goal.id, SEED_GOALS),
)
assert.ok(enMuro.length > 0, 'hay ejemplos en el muro')
assert.ok(enMuro.length < MAX_FOCUS, 'queda hueco para añadir un objetivo')

// Las tres formas de seguir y un cumplido para /cumplidos.
assert.ok(SEED_GOALS.some((goal) => goal.seguimiento === 'percent'))
assert.ok(
  SEED_GOALS.some((goal) => goal.seguimiento === 'streak' && goal.metaDias > 0),
  'una racha con meta de días',
)
assert.ok(
  SEED_GOALS.some((goal) => goal.seguimiento === 'paginas' && goal.totalPaginas > 0),
  'una lectura por páginas',
)
const cumplido = SEED_GOALS.find((goal) => goal.finalizadoEn)
assert.ok(cumplido, 'un ejemplo archivado para /cumplidos')
assert.equal(cumplido.enMuro, false, 'lo archivado no ocupa el muro')
