import assert from 'node:assert/strict'
import {
  esAvanceHoy,
  estadoCompuesta,
  reconcileComposites,
  esHijoDe,
  padreDe,
} from '../src/lib/composite.js'

const HOY = '2026-09-28'
const AYER = '2026-09-27'
const ANTES = '2026-09-25'

const pct = (valor, ultimoMovimiento = HOY) => ({
  id: 'p1', nombre: 'Pct', seguimiento: 'percent', valor, ultimoMovimiento,
  marcas: [], componentes: [],
})
const str = (marcas) => ({
  id: 's1', nombre: 'Str', seguimiento: 'streak', valor: 0,
  marcas, componentes: [],
})
const comp = (componentes, marcas = []) => ({
  id: 'c1', nombre: 'Comp', seguimiento: 'compuesta', valor: 0,
  marcas, componentes, enMuro: false,
})
const pag = (valor, totalPaginas = 1181, ultimoMovimiento = HOY) => ({
  id: 'g1', nombre: 'Libro', seguimiento: 'paginas', valor, totalPaginas,
  ultimoMovimiento, marcas: [], componentes: [],
})

// --- esAvanceHoy ---
assert.equal(esAvanceHoy(pct(40, HOY), HOY), true, 'percent subido hoy')
assert.equal(esAvanceHoy(pct(40, ANTES), HOY), false, 'percent sin tocar hoy')
assert.equal(esAvanceHoy(pct(100, ANTES), HOY), true, '100% cuenta siempre')
assert.equal(esAvanceHoy(str([HOY]), HOY), true, 'streak marcado hoy')
assert.equal(esAvanceHoy(str([AYER]), HOY), false, 'streak no marcado hoy')
assert.equal(esAvanceHoy(comp(['p1']), HOY), false, 'compuesta no aplica')

// --- esAvanceHoy en modo páginas ---
assert.equal(esAvanceHoy(pag(468, 1181, HOY), HOY), true, 'páginas leídas hoy')
assert.equal(esAvanceHoy(pag(468, 1181, ANTES), HOY), false, 'páginas sin tocar hoy')
assert.equal(esAvanceHoy(pag(1181, 1181, ANTES), HOY), true, 'libro terminado cuenta siempre')
assert.equal(esAvanceHoy(pag(0, 200, null), HOY), false, 'sin páginas no hay avance')
assert.equal(
  esAvanceHoy({ seguimiento: 'paginas', valor: 200, totalPaginas: null, ultimoMovimiento: ANTES }, HOY),
  true,
  'sin total declarado se usa el default (200)',
)

// --- estadoCompuesta ---
{
  const goals = [pct(40, HOY), str([AYER]), comp(['p1', 's1'])]
  const estado = estadoCompuesta(goals[2], goals, HOY)
  assert.equal(estado.total, 2)
  assert.equal(estado.cumplidas, 1)
  assert.equal(estado.completa, false)
}
{
  const goals = [pct(40, HOY), str([HOY]), comp(['p1', 's1'])]
  assert.equal(estadoCompuesta(goals[2], goals, HOY).completa, true)
}
{
  const goals = [comp(['borrado']), pct(40, HOY)]
  const estado = estadoCompuesta(goals[0], goals, HOY)
  assert.equal(estado.total, 0, 'la única parte borrada deja total 0 ("Sin partes")')
  assert.equal(estado.completa, false, 'sin partes no está completa')
}
{
  const goals = [pct(40, HOY), str([HOY]), comp(['p1', 's1', 'borrado'])]
  const estado = estadoCompuesta(goals[2], goals, HOY)
  assert.equal(estado.total, 2, 'id huérfano fuera del conteo')
  assert.equal(estado.cumplidas, 2)
  assert.equal(estado.completa, true, '"Falta 1 de 3" ya no aparece')
}

// --- reconcile: marca con cadena desde ayer ---
{
  const goals = [pct(40, HOY), str([HOY]), comp(['p1', 's1'], [AYER])]
  const next = reconcileComposites(goals, HOY)
  assert.deepEqual(next[2].marcas, [AYER, HOY], 'cadena consecutiva se conserva')
  assert.notEqual(next, goals)
}

// --- reconcile: hueco reinicia la racha ---
{
  const goals = [pct(40, HOY), str([HOY]), comp(['p1', 's1'], [ANTES])]
  const next = reconcileComposites(goals, HOY)
  assert.deepEqual(next[2].marcas, [HOY], 'hueco reinicia en [hoy]')
}

// --- reconcile: idempotente, mismo array ---
{
  const goals = [pct(40, HOY), str([HOY]), comp(['p1', 's1'], [AYER, HOY])]
  assert.equal(reconcileComposites(goals, HOY), goals, 'ya marcada → mismo array')
}
{
  const goals = [pct(40, ANTES), str([AYER]), comp(['p1', 's1'], [])]
  assert.equal(reconcileComposites(goals, HOY), goals, 'incompleta sin marca → mismo array')
}

// --- reconcile: desmarca si un hijo deja de avanzar ---
{
  const goals = [pct(40, HOY), str([AYER]), comp(['p1', 's1'], [HOY])]
  const next = reconcileComposites(goals, HOY)
  assert.deepEqual(next[2].marcas, [], 'pierde la marca de hoy')
}

// --- reconcile: parte borrada no impide completar ---
{
  const goals = [pct(40, HOY), comp(['p1', 'faltante'], [])]
  const next = reconcileComposites(goals, HOY)
  assert.deepEqual(next[1].marcas, [HOY], 'se marca igual')
}

// --- no toca a los hijos ni a los simples ---
{
  const hijo = pct(40, HOY)
  const goals = [hijo, comp(['p1'], [])]
  const next = reconcileComposites(goals, HOY)
  assert.equal(next[0], hijo, 'hijo intacto')
}

// --- parentesco ---
{
  const goals = [pct(40, HOY), comp(['p1'])]
  assert.equal(esHijoDe('p1', goals), true)
  assert.equal(esHijoDe('c1', goals), false)
  assert.equal(padreDe('p1', goals).id, 'c1')
  assert.equal(padreDe('c1', goals), undefined)
}

console.log('composite.test: OK')
