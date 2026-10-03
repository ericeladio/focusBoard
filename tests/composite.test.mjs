import assert from 'node:assert/strict'
import { todayISO, yesterdayISO } from '../src/lib/dates.js'
import {
  avanzaHoy,
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
  partesVisibles,
  parteHecha,
  alTerminar,
  PARTES_VISIBLES,
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

// --- avanzaHoy (el muro: misma regla, pero la compuesta sí cuenta) ---
assert.equal(avanzaHoy(pct(40, HOY), HOY), true, 'muro: percent subido hoy')
assert.equal(avanzaHoy(pct(40, ANTES), HOY), false, 'muro: percent sin tocar hoy')
assert.equal(avanzaHoy(pct(100, ANTES), HOY), true, 'muro: 100% está hecho')
assert.equal(avanzaHoy(str([HOY]), HOY), true, 'muro: racha marcada hoy')
assert.equal(avanzaHoy(str([AYER]), HOY), false, 'muro: racha sin marcar hoy')
assert.equal(avanzaHoy(pag(1181, 1181, ANTES), HOY), true, 'muro: libro al tope')
// La compuesta se lee con `markedToday`, que mira el hoy real (no el HOY fijo
// del resto del archivo), así que sus marcas se montan con la fecha de verdad.
const HOY_REAL = todayISO()
assert.equal(
  avanzaHoy(comp(['p1'], [HOY_REAL])),
  true,
  'muro: compuesta auto-marcada hoy (todas sus partes avanzan)',
)
assert.equal(
  avanzaHoy(comp(['p1'], [HOY_REAL, yesterdayISO()])),
  false,
  'muro: compuesta sin cerrar hoy',
)
assert.equal(avanzaHoy(comp(['p1'])), false, 'muro: compuesta sin marca no está hecha')

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

// --- solo 3 partes en pantalla, las que faltan primero ---
{
  const p = (id, valor, extra = {}) => ({
    id, nombre: id, seguimiento: 'percent', valor,
    marcas: [], componentes: [], ...extra,
  })
  const ids = (partes) => partesVisibles(partes).map((parte) => parte.id)

  assert.equal(PARTES_VISIBLES, 3, 'la ventana mide 3')

  assert.deepEqual(ids([p('a', 0), p('b', 0), p('c', 0)]), ['a', 'b', 'c'],
    '3 o menos → se ven todas')
  assert.deepEqual(ids([p('a', 0), p('b', 0), p('c', 0), p('d', 0), p('e', 0)]),
    ['a', 'b', 'c'], '5 → solo las 3 primeras')
  assert.deepEqual(
    ids([p('a', 100), p('b', 0), p('c', 0), p('d', 0), p('e', 0)]),
    ['b', 'c', 'd'],
    'la hecha se aparta y entra la siguiente que faltaba',
  )
  assert.deepEqual(
    ids([p('a', 0, { finalizadoEn: HOY }), p('b', 0), p('c', 0), p('d', 0), p('e', 0)]),
    ['b', 'c', 'd'],
    'la archivada también se aparta',
  )
  assert.deepEqual(
    ids([p('a', 0), null, p('b', 0)]),
    ['a', 'b'],
    'parte borrada (null) fuera de la ventana',
  )
  assert.deepEqual(
    ids([p('a', 100), p('b', 100), p('c', 100), p('d', 100)]),
    ['a', 'b', 'c'],
    'sin pendientes se ven hechas: la lista nunca queda vacía',
  )

  assert.equal(parteHecha(pct(40, ANTES)), false, '40% no está hecha')
  assert.equal(parteHecha(pct(100, ANTES)), true, '100% hecha')
  assert.equal(parteHecha({ ...pct(40, ANTES), finalizadoEn: HOY }), true,
    'archivada hecha')
  assert.equal(parteHecha(pag(1181, 1181, ANTES)), true, 'al tope de páginas')
  assert.equal(parteHecha(pag(468, 1181, ANTES)), false, 'a medias en páginas')
  assert.equal(parteHecha(str([HOY])), false, 'una racha nunca se da por hecha')
}

// --- alTerminar: la parte terminada se sale sola de su compuesta ---
{
  const suelto = { ...pct(40, HOY), id: 'suelto', enMuro: true }
  const solo = alTerminar([suelto], 'suelto', HOY)
  assert.equal(solo[0].finalizadoEn, HOY, 'un objetivo simple se archiva hoy')
  assert.equal(solo[0].enMuro, false, '…y baja del muro')

  const lista = [{ ...pct(100, HOY), id: 'ya', finalizadoEn: HOY }]
  assert.equal(alTerminar(lista, 'ya', HOY), lista, 'ya terminado → mismo array')
  assert.equal(alTerminar(lista, 'nadie', HOY), lista, 'id que no existe → mismo array')
}
{
  const padre = { ...comp(['a', 'b', 'c']), finalizadoEn: null }
  const a = { ...pct(100, HOY), id: 'a', enMuro: false }
  const b = { ...pct(0, HOY), id: 'b', enMuro: false }
  const c = { ...pct(0, HOY), id: 'c', enMuro: false }
  const next = alTerminar([a, b, c, padre], 'a', HOY)

  assert.equal(next[0].finalizadoEn, HOY, 'la parte terminada queda archivada')
  assert.equal(next[0].enMuro, false, '…y fuera del muro')
  assert.deepEqual(next[3].componentes, ['b', 'c'], 'se sale de la compuesta')
  assert.equal(next[3].finalizadoEn, null, 'a la compuesta le quedan partes')
  assert.equal(
    estadoCompuesta(next[3], next, HOY).total,
    2,
    'el recuento baja solo (no vuelve a contar la archivada)',
  )
}
{
  // La última parte viva que queda: sin nada que rastrear, la compuesta se
  // termina también (una compuesta vacía no se puede terminar a mano).
  const padre = { ...comp(['a']), finalizadoEn: null, enMuro: true }
  const a = { ...pct(100, HOY), id: 'a', enMuro: false }
  const next = alTerminar([a, padre], 'a', HOY)

  assert.deepEqual(next[1].componentes, [], 'sin partes')
  assert.equal(next[1].finalizadoEn, HOY, 'la compuesta se termina sola')
  assert.equal(next[1].enMuro, false, '…y baja del muro')
}
{
  // Datos viejos: una parte archivada pero todavía enganchada cuenta como
  // parte, así la compuesta sigue pudiéndose terminar a mano.
  const padre = { ...comp(['vieja', 'b']), finalizadoEn: null }
  const vieja = { ...pct(100, HOY), id: 'vieja', finalizadoEn: HOY }
  const b = { ...pct(0, HOY), id: 'b' }
  const next = alTerminar([vieja, b, padre], 'b', HOY)

  assert.deepEqual(next[2].componentes, ['vieja'], 'la vieja sigue enganchada')
  assert.equal(next[2].finalizadoEn, null, 'la compuesta queda para terminar a mano')
}
{
  // El padre ya estaba archivado: la parte se sale, pero su fecha no se toca.
  const padre = { ...comp(['a']), finalizadoEn: HOY, enMuro: false }
  const a = { ...pct(0, HOY), id: 'a' }
  const next = alTerminar([a, padre], 'a', HOY)

  assert.equal(next[1].finalizadoEn, HOY, 'la fecha del padre no cambia')
  assert.deepEqual(next[1].componentes, [], 'pero la parte sale igual')
}
{
  // Un id fantasma (parte borrada) no cuenta como parte viva que quede.
  const padre = { ...comp(['borrado', 'b']), finalizadoEn: null }
  const b = { ...pct(0, HOY), id: 'b' }
  const next = alTerminar([b, padre], 'b', HOY)

  assert.deepEqual(next[1].componentes, [], 'el fantasma fuera')
  assert.equal(next[1].finalizadoEn, HOY, 'la última parte real se lleva a la compuesta')
}

console.log('composite.test: OK')
