import assert from 'node:assert/strict'
import {
  etiquetaRacha,
  fechaCorta,
  groupCumplidos,
  metaAlcanzada,
  metaDiasDe,
  paginaCumplidos,
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

// --- paginaCumplidos: lo mismo que el pool, pero reagrupando por año/mes ---
{
  const vacio = paginaCumplidos(groupCumplidos([]))
  assert.equal(vacio.total, 0, 'sin cumplidos → 0')
  assert.equal(vacio.totalPaginas, 1, 'aunque esté vacío hay una página')
  assert.equal(vacio.pagina, 1)
  assert.equal(vacio.desde, 0)
  assert.deepEqual(vacio.bloques, [], 'sin bloques que pintar')
  assert.deepEqual(paginaCumplidos(null).bloques, [], 'sin lista no rompe')

  const septiembre = (n) =>
    Array.from({ length: n }, (_, i) => ({
      id: `m${i}`,
      nombre: `M${i}`,
      finalizadoEn: `2026-09-${String(30 - i).padStart(2, '0')}`,
      updatedAt: i,
    }))

  // Pocos → una sola página, con los recuentos del mes tal cual.
  const pocas = paginaCumplidos(groupCumplidos(septiembre(3)))
  assert.equal(pocas.totalPaginas, 1, '3 cumplidos → una página')
  assert.equal(pocas.visibles.length, 3, 'se ven los tres')
  assert.equal(pocas.bloques[0].meses[0].total, 3)
  assert.equal(pocas.bloques[0].meses[0].mostrados, 3, 'mes completo')

  // Doce → dos páginas; la cabecera del mes partido dice "4 de 12".
  const anios = groupCumplidos(septiembre(12))
  const primera = paginaCumplidos(anios, 1)
  assert.equal(primera.totalPaginas, 2)
  assert.equal(primera.desde, 0)
  assert.equal(primera.visibles.length, 10, 'de 10 en 10')
  assert.equal(primera.bloques[0].anio, 2026)
  assert.equal(primera.bloques[0].meses[0].label, 'Septiembre')
  assert.equal(primera.bloques[0].meses[0].total, 12, 'el recuento real del mes')
  assert.equal(primera.bloques[0].meses[0].mostrados, 10, 'las que caben aquí')

  const segunda = paginaCumplidos(anios, 2)
  assert.equal(segunda.desde, 10)
  assert.equal(segunda.visibles.length, 2, 'la última página no se queda corta')
  assert.deepEqual(
    segunda.visibles.map((goal) => goal.id),
    ['m10', 'm11'],
    'sigue el orden de más reciente a más antiguo',
  )
  assert.equal(segunda.bloques[0].meses[0].total, 12, 'el mes sigue contando 12')
  assert.equal(segunda.bloques[0].meses[0].mostrados, 2)

  // Fuera de rango no deja hueco: se recorta a la última (o a la primera).
  assert.equal(paginaCumplidos(anios, 99).pagina, 2, 'página 99 → la última')
  assert.equal(paginaCumplidos(anios, 99).desde, 10, '…y su offset')
  assert.equal(paginaCumplidos(anios, 0).pagina, 1, 'página 0 → la primera')
  assert.equal(paginaCumplidos(anios, 'x').pagina, 1, 'nada raro → la primera')
}

// --- la página parte los meses por el orden: lo más reciente cabe entero ---
{
  const goals = [
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      finalizadoEn: `2026-09-${30 - i}`,
      updatedAt: i,
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `a${i}`,
      finalizadoEn: `2026-08-${20 - i}`,
      updatedAt: i,
    })),
  ]
  const pagina = paginaCumplidos(groupCumplidos(goals), 1)
  assert.equal(pagina.visibles.length, 10)
  assert.equal(pagina.bloques.length, 1, 'todo en 2026')
  assert.deepEqual(
    pagina.bloques[0].meses.map((mes) => mes.label),
    ['Septiembre', 'Agosto'],
    'el mes más reciente primero',
  )
  assert.equal(pagina.bloques[0].meses[0].mostrados, 6, 'septiembre entero')
  assert.equal(pagina.bloques[0].meses[1].mostrados, 4, 'agosto partido')
  assert.equal(pagina.bloques[0].meses[1].total, 6, 'con su recuento real')
  assert.equal(pagina.bloques[0].meses[1].goals.length, 4, 'solo las filas de aquí')
}

console.log('cumplidos: todas las comprobaciones pasaron')
