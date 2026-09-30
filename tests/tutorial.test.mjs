import assert from 'node:assert/strict'
import { CLAVE_TUTORIAL, PASOS, marcarTutorial, tutorialHecho } from '../src/lib/tutorial.js'

// Un tutorial breve: ni una pantalla interminable ni un solo paso suelto.
assert.ok(PASOS.length >= 4 && PASOS.length <= 7, `${PASOS.length} pasos`)

const ids = new Set()
for (const paso of PASOS) {
  assert.ok(!ids.has(paso.id), `paso repetido: ${paso.id}`)
  ids.add(paso.id)
  assert.ok(paso.titulo && typeof paso.titulo === 'string', `${paso.id}: sin título`)
  assert.ok(paso.texto && typeof paso.texto === 'string', `${paso.id}: sin texto`)
}

// Cada paso (menos el de cierre) apunta a un selector real de la pantalla;
// el cierre es el único sin diana y siempre va el último.
for (const [i, paso] of PASOS.entries()) {
  if (paso.diana === null) {
    assert.equal(i, PASOS.length - 1, `${paso.id}: solo el último paso va sin diana`)
    continue
  }
  assert.equal(typeof paso.diana, 'string', `${paso.id}: diana rara`)
  assert.ok(paso.diana.trim().length > 0, `${paso.id}: diana vacía`)
}
assert.ok(PASOS[0].diana, 'el primer paso tiene elemento que señalar')

// Las frases que el render-check busca en `/ (sin cuenta)` salen de aquí:
// si se reescribe un paso, el check se entera.
const todos = PASOS.map((paso) => paso.texto).join(' ')
for (const frase of [
  'reordenan arrastrándolas',
  'paginación de 10 en 10',
  'bórralos cuando',
  'passcode',
]) {
  assert.ok(todos.includes(frase), `falta la frase "${frase}" en los pasos`)
}

// Solo se enseña una vez: con la clave marcada ya no vuelve a salir.
const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key),
}
assert.equal(tutorialHecho(), false, 'recién llegado: el tutorial está pendiente')
assert.equal(store.has(CLAVE_TUTORIAL), false)
marcarTutorial()
assert.equal(store.get(CLAVE_TUTORIAL), '1')
assert.equal(tutorialHecho(), true, 'ya no vuelve a salir')
delete globalThis.localStorage

// Sin storage (SSR, modo privado) no se lanza: enseña el tutorial sin
// insistir con la clave.
assert.equal(tutorialHecho(), false)
assert.equal(marcarTutorial(), undefined)
