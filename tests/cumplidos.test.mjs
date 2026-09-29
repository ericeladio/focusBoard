import assert from 'node:assert/strict'
import {
  etiquetaRacha,
  fechaCorta,
  groupCumplidos,
  metaAlcanzada,
  metaDiasDe,
  puedeFinalizar,
} from '../src/lib/cumplidos.js'
import { pastISO, todayISO } from '../src/lib/dates.js'

const HOY = todayISO()

const pct = (valor) => ({
  id: 'p1',
  nombre: 'Pct',
  seguimiento: 'percent',
  valor,
  marcas: [],
  componentes: [],
  finalizadoEn: null,
})
const pag = (valor, totalPaginas = 1181) => ({
  id: 'l1',
  nombre: 'Libro',
  seguimiento: 'paginas',
  valor,
  totalPaginas,
  marcas: [],
  componentes: [],
  finalizadoEn: null,
})
const str = (marcas, metaDias = null) => ({
  id: 's1',
  nombre: 'Str',
  seguimiento: 'streak',
  valor: 0,
  marcas,
  metaDias,
  componentes: [],
  finalizadoEn: null,
})
const comp = (marcas) => ({
  id: 'c1',
  nombre: 'Comp',
  seguimiento: 'compuesta',
  valor: 0,
  marcas,
  componentes: ['p1'],
  finalizadoEn: null,
})

// --- metaDiasDe: la meta existe solo si es un entero > 0 ---
assert.equal(metaDiasDe(str([HOY], 30)), 30, 'meta numérica')
assert.equal(metaDiasDe(str([HOY], '30')), 30, 'meta que viaja como texto')
assert.equal(metaDiasDe(str([HOY], null)), null, 'indefinida (null)')
assert.equal(metaDiasDe(str([HOY], 0)), null, '0 no es meta')
assert.equal(metaDiasDe(str([HOY], -5)), null, 'negativo no es meta')
assert.equal(metaDiasDe({}), null, 'sin meta → indefinida')

// --- puedeFinalizar: cada modo con su regla ---
assert.equal(puedeFinalizar(pct(99)), false, 'percent sin llegar al 100')
assert.equal(puedeFinalizar(pct(100)), true, 'percent al 100')
assert.equal(puedeFinalizar(pag(468)), false, 'páginas a medio libro')
assert.equal(puedeFinalizar(pag(1181)), true, 'páginas al tope')
assert.equal(puedeFinalizar(pag(1500)), true, 'páginas pasadas del tope')
assert.equal(puedeFinalizar(str([HOY])), true, 'racha siempre (indefinida)')
assert.equal(puedeFinalizar(str([HOY], 30)), true, 'racha siempre (con meta)')
assert.equal(puedeFinalizar(str([])), true, 'racha recién creada')
assert.equal(puedeFinalizar(comp([HOY])), true, 'compuesta lista hoy')
assert.equal(puedeFinalizar(comp(['2026-09-25'])), false, 'compuesta sin marcar hoy')
assert.equal(
  puedeFinalizar({ ...pct(100), finalizadoEn: '2026-09-27' }),
  false,
  'ya finalizado no se finaliza otra vez',
)
assert.equal(puedeFinalizar(null), false, 'sin objetivo no se finaliza')

// --- metaAlcanzada: resalta, nunca archiva ---
assert.equal(metaAlcanzada(str(Array(30).fill(HOY), 30)), true, '30 de 30')
assert.equal(metaAlcanzada(str(Array(29).fill(HOY), 30)), false, '29 de 30')
assert.equal(metaAlcanzada(str(Array(99).fill(HOY))), false, 'sin meta no se alcanza')
assert.equal(metaAlcanzada(pct(100)), false, 'solo aplica a rachas')

// --- etiquetaRacha ---
assert.equal(etiquetaRacha(str([pastISO(1), HOY])), '2 días', 'sin meta')
assert.equal(etiquetaRacha(str([HOY])), '1 día', 'sin meta, singular')
assert.equal(etiquetaRacha(str(Array(30).fill(HOY), 30)), '30 de 30 días', 'con meta')
assert.equal(etiquetaRacha(str([HOY], 30)), '1 de 30 días', 'con meta, arranque')

// --- fechaCorta: se lee el ISO a mano (sin husos) ---
assert.equal(fechaCorta('2026-09-29'), '29 sep 2026')
assert.equal(fechaCorta('2026-01-05'), '5 ene 2026')
assert.equal(fechaCorta('ayer'), '', 'texto que no es fecha')
assert.equal(fechaCorta(null), '', 'sin fecha')

// --- groupCumplidos: años → meses, de lo nuevo a lo viejo ---
{
  const goals = [
    { id: 'a', nombre: 'A', finalizadoEn: '2026-09-28', updatedAt: 5 },
    { id: 'b', nombre: 'B', finalizadoEn: '2026-09-01', updatedAt: 4 },
    { id: 'c', nombre: 'C', finalizadoEn: '2026-08-15', updatedAt: 3 },
    { id: 'd', nombre: 'D', finalizadoEn: '2025-12-31', updatedAt: 2 },
    { id: 'e', nombre: 'E', finalizadoEn: null, updatedAt: 1 },
    { id: 'f', nombre: 'F', finalizadoEn: 'no-fecha', updatedAt: 1 },
  ]
  const anios = groupCumplidos(goals)

  assert.equal(anios.length, 2, 'dos años con cumplidos')
  assert.equal(anios[0].anio, 2026, 'el año más reciente primero')
  assert.equal(anios[0].total, 3, 'tres cumplidos en 2026')
  assert.equal(anios[1].anio, 2025, 'el año anterior después')
  assert.equal(anios[1].total, 1, 'un cumplido en 2025')

  const meses = anios[0].meses
  assert.equal(meses.length, 2, 'septiembre y agosto agrupados')
  assert.deepEqual(
    [meses[0].label, meses[1].label],
    ['Septiembre', 'Agosto'],
    'el mes más reciente primero, con nombre en español',
  )
  assert.equal(meses[0].total, 2, 'dos en septiembre')
  assert.equal(meses[0].key, '2026-09', 'clave del grupo')
  assert.deepEqual(
    meses[0].goals.map((goal) => goal.id),
    ['a', 'b'],
    'dentro del mes, lo más reciente primero',
  )
  assert.equal(anios[1].meses[0].label, 'Diciembre', 'diciembre de 2025')
  assert.equal(groupCumplidos([]).length, 0, 'sin cumplidos → lista vacía')
  assert.equal(groupCumplidos(null).length, 0, 'sin lista → lista vacía')
}

// --- empate en fecha: manda el sello más nuevo ---
{
  const anios = groupCumplidos([
    { id: 'viejo', finalizadoEn: '2026-09-28', updatedAt: 1 },
    { id: 'nuevo', finalizadoEn: '2026-09-28', updatedAt: 9 },
  ])
  assert.deepEqual(
    anios[0].meses[0].goals.map((goal) => goal.id),
    ['nuevo', 'viejo'],
    'a igual fecha, el último en terminar queda arriba',
  )
}

console.log('cumplidos: todas las comprobaciones pasaron')
