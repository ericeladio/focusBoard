import assert from 'node:assert/strict'
import {
  esAvanceHoy,
  estadoCompuesta,
  reconcileComposites,
  esHijoDe,
  padreDe,
  esTipoCompuesto,
  modoPorTipo,
  compuestoId,
  ensureCompuestoType,
  esCompuestoType,
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

// --- esAvanceHoy con partes archivadas (terminadas) ---
assert.equal(
  esAvanceHoy({ ...pct(40, ANTES), finalizadoEn: HOY }, HOY),
  true,
  'parte archivada cuenta como avance sin tocar nada',
)
assert.equal(
  esAvanceHoy({ ...str([AYER]), finalizadoEn: HOY }, HOY),
  true,
  'racha archivada cuenta (aunque no esté marcada hoy)',
)
assert.equal(
  esAvanceHoy({ ...pag(0, 200, ANTES), finalizadoEn: HOY }, HOY),
  true,
  'páginas archivadas cuentan',
)
{
  const goals = [
    { ...pct(40, ANTES), finalizadoEn: HOY },
    { ...str([AYER]), finalizadoEn: HOY },
    comp(['p1', 's1']),
  ]
  assert.equal(
    estadoCompuesta(goals[2], goals, HOY).completa,
    true,
    'compuesta completa cuando sus partes están terminadas',
  )
}

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

// --- el tipo manda el modo de seguimiento ---
const TIPOS = [
  { id: 'tipo-compuesto', nombre: 'Compuesto' },
  { id: 't-lectura', nombre: 'Lectura' },
  { id: 't-personal', nombre: 'Personal' },
]

assert.equal(esTipoCompuesto('tipo-compuesto', TIPOS), true, 'Compuesto por id')
assert.equal(esTipoCompuesto('t-personal', TIPOS), false, 'otro tipo no es compuesto')
assert.equal(esTipoCompuesto('nadie-lo-usa', TIPOS), false, 'tipo ausente → no compuesto')
assert.equal(esTipoCompuesto('', TIPOS), false)

assert.equal(modoPorTipo('percent', 'tipo-compuesto', TIPOS), 'compuesta', 'Compuesto → compuesta')
assert.equal(modoPorTipo('percent', 't-personal', TIPOS), 'percent')
assert.equal(modoPorTipo('streak', 't-personal', TIPOS), 'streak')
assert.equal(
  modoPorTipo('compuesta', 't-personal', TIPOS),
  'percent',
  'una compuesta con otro tipo vuelve a porcentaje',
)
assert.equal(
  modoPorTipo('paginas', 't-personal', TIPOS),
  'percent',
  'páginas con un tipo normal vuelve a porcentaje',
)
assert.equal(modoPorTipo('percent', 't-lectura', TIPOS), 'paginas', 'tipo lectura → páginas')
assert.equal(
  modoPorTipo('compuesta', '', TIPOS),
  'compuesta',
  'sin tipo todavía manda lo elegido en el formulario',
)
assert.equal(modoPorTipo('percent', '', TIPOS), 'percent')

// --- el tipo Compuesto está en la lista o se crea igual ---
assert.equal(compuestoId(TIPOS), 'tipo-compuesto', 'encuentra el tipo existente')
assert.equal(compuestoId([]), 'tipo-compuesto', 'si falta, devuelve el id conocido')
assert.equal(ensureCompuestoType(TIPOS), TIPOS, 'ya existe → mismo array')
assert.deepEqual(ensureCompuestoType([{ id: 'x', nombre: 'Personal' }])[1], {
  id: 'tipo-compuesto',
  nombre: 'Compuesto',
})
assert.equal(esCompuestoType({ id: 'x', nombre: 'Compuesto' }), true)
assert.equal(esCompuestoType({ id: 'x', nombre: 'compuesto' }), true, 'sin importar mayúsculas')
assert.equal(esCompuestoType({ id: 'x', nombre: 'Personal' }), false)

console.log('composite.test: OK')
