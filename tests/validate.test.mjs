import assert from 'node:assert/strict'

const { normalizeOp, normalizeOps, sanitizeGoal, sanitizeNote, toIso, isValidImageKey } =
  await import('../api/_lib/validate.js')
const { rowToGoal, goalParams, typeParams, noteParams } = await import('../api/_lib/shape.js')

const TS = '2026-09-28T12:00:00.000Z'
const baseGoal = {
  id: 'g_1',
  nombre: '  Correr  ',
  tipoId: 'seed-personal',
  seguimiento: 'percent',
  componentes: [],
  valor: 42,
  marcas: ['2026-09-27', '2026-09-28'],
  ultimoMovimiento: '2026-09-28',
  imagenKey: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  createdAt: 1759040000000,
  enMuro: true,
}

// put válido: normaliza, recorta y fija el sello de tiempo
{
  const result = normalizeOp({ seq: 1, entity: 'goal', op: 'put', id: 'g_1', ts: TS, data: baseGoal })
  assert.equal(result.ok, true, result.error)
  assert.equal(result.entity, 'goal')
  assert.equal(result.record.nombre, 'Correr', 'se recortan los espacios')
  assert.equal(result.record.updatedAt, TS, 'updatedAt = ts de la op')
  assert.equal(result.record.deletedAt, null, 'un put reviva el registro')
  assert.equal(result.record.createdAt, toIso(1759040000000), 'createdAt numérico → ISO')
  assert.deepEqual(result.record.marcas, baseGoal.marcas)
}

// delete válido
{
  const result = normalizeOp({ entity: 'goal', op: 'del', id: 'g_1', ts: TS })
  assert.equal(result.ok, true)
  assert.equal(result.action, 'del')
  assert.equal(result.record, null)
}

// ops inválidas
{
  const cases = [
    [{ entity: 'nope', op: 'put', id: 'x', ts: TS }, 'bad_entity'],
    [{ entity: 'goal', op: 'merge', id: 'x', ts: TS }, 'bad_action'],
    [{ entity: 'goal', op: 'put', id: 'g_1' }, 'bad_ts'],
    [{ entity: 'goal', op: 'put', id: 'g_1', ts: 'ayer' }, 'bad_ts'],
    [{ entity: 'goal', op: 'put', id: 'mal id!', ts: TS }, 'bad_id'],
    [{ entity: 'goal', op: 'del', id: 'g_1', ts: TS, data: null }, 'ok'],
    [{ entity: 'goal', op: 'del', id: '', ts: TS }, 'bad_id'],
  ]
  for (const [op, expected] of cases) {
    const result = normalizeOp(op)
    assert.equal(result.ok, expected === 'ok', `${JSON.stringify(op)} → ${result.error}`)
    if (expected !== 'ok') assert.equal(result.error, expected)
  }
  assert.equal(normalizeOp(null).error, 'bad_shape')
  assert.equal(normalizeOp('hola').error, 'bad_shape')
}

// un del sobre note no existe
{
  assert.equal(normalizeOp({ entity: 'note', op: 'del', ts: TS }).error, 'bad_action')
}

// campos peligrosos del goal
{
  assert.equal(sanitizeGoal({ ...baseGoal, id: 'g_1', seguimiento: 'diario' }, TS).error, 'bad_seguimiento')
  assert.equal(sanitizeGoal({ ...baseGoal, id: 'g_1', nombre: '   ' }, TS).error, 'bad_nombre')
  assert.equal(sanitizeGoal({ ...baseGoal, id: 'g_1', nombre: 'x'.repeat(200) }, TS).error, 'bad_nombre')
  assert.equal(
    sanitizeGoal({ ...baseGoal, id: 'g_1', imagenKey: '../../etc/passwd' }, TS).error,
    'bad_image_key',
  )
  assert.equal(
    sanitizeGoal({ ...baseGoal, id: 'g_1', componentes: ['a', 3] }, TS).error,
    'bad_componentes',
  )
  assert.equal(sanitizeGoal({ ...baseGoal, id: 'g_1', marcas: 'nope' }, TS).error, 'bad_marcas')
}

// claves de imagen: carpeta única y sin rutas raras
{
  const uuid = 'b9c3d6bf-474a-4844-9af8-a973f0c78cd1'
  const buenas = [uuid, `img-goals/${uuid}`, 'fotos', 'img-goals/a1b2c3d4-e5f6-7890']
  for (const key of buenas) {
    assert.equal(isValidImageKey(key), true, `${key} es válida`)
  }
  const malas = [
    null,
    undefined,
    '',
    '.',
    '..',
    '../../etc/passwd',
    'img-goals/../../etc',
    'a/b/c',
    'img goals/x',
    'img-goals/',
    'x '.repeat(5),
    'x'.repeat(70),
    'img-goals/' + 'x'.repeat(70),
    'carpeta con espacio/' + uuid,
  ]
  for (const key of malas) {
    assert.equal(isValidImageKey(key), false, `${JSON.stringify(key)} se rechaza`)
  }

  // y el sanitizador de metas usa el mismo criterio
  assert.equal(
    sanitizeGoal({ ...baseGoal, id: 'g_1', imagenKey: `img-goals/${uuid}` }, TS).ok,
    true,
    'una meta con clave en carpeta pasa el sanitizador',
  )
  assert.equal(
    sanitizeGoal({ ...baseGoal, id: 'g_1', imagenKey: 'a/b/c' }, TS).error,
    'bad_image_key',
    'más de una barra se rechaza',
  )
}

// valores numéricos acotados
{
  const clamp = (valor) => sanitizeGoal({ ...baseGoal, id: 'g_1', valor }, TS).record.valor
  assert.equal(clamp(-10), 0, 'negativos → 0')
  assert.equal(clamp(99999999), 100000, 'exceso → tope')
  assert.equal(clamp('55'), 55, 'cadena numérica aceptada')
  assert.equal(clamp('abc'), 0, 'no numérico → 0')
}

// lista de marcas acotada
{
  const muchas = Array.from({ length: 1200 }, (_, i) => `2026-01-${String((i % 28) + 1).padStart(2, '0')}`)
  assert.equal(sanitizeGoal({ ...baseGoal, id: 'g_1', marcas: muchas }, TS).error, 'bad_marcas')
}

// note
{
  assert.equal(sanitizeNote({ texto: null }, TS).record.texto, null)
  assert.equal(sanitizeNote({ texto: '  hola  ' }, TS).record.texto, '  hola  ')
  assert.equal(sanitizeNote({ texto: 'x'.repeat(5000) }, TS).error, 'bad_texto')
  assert.equal(sanitizeNote({ texto: 42 }, TS).error, 'bad_texto')
}

// lote de ops
{
  assert.deepEqual(normalizeOps({ ops: [] }), { ok: true, ops: [] })
  assert.equal(normalizeOps({}).error, 'bad_ops')
  assert.equal(normalizeOps('x').error, 'bad_ops')
  assert.equal(normalizeOps(Array.from({ length: 201 }, () => ({}))).error, 'too_many_ops')
}

// mapeo de filas → cliente y parámetros de SQL
{
  const row = {
    id: 'g_1',
    nombre: 'Correr',
    tipo_id: 'seed-personal',
    seguimiento: 'percent',
    componentes: ['a'],
    valor: 10,
    marcas: ['2026-09-28'],
    ultimo_movimiento: '2026-09-28',
    imagen_key: 'k1',
    created_at: '2026-01-02T03:04:05.000Z',
    en_muro: true,
    updated_at: TS,
    deleted_at: null,
  }
  const record = rowToGoal(row)
  assert.equal(record.tipoId, 'seed-personal')
  assert.equal(record.enMuro, true)
  assert.equal(record.createdAt, Date.parse('2026-01-02T03:04:05.000Z'), 'createdAt → ms')
  assert.equal(record.deletedAt, null)
  assert.equal(record.totalPaginas, null, 'sin columna → null')
  assert.equal(record.metaDias, null, 'sin columna → meta indefinida')
  assert.equal(record.finalizadoEn, null, 'sin columna → vivo')
  const params = goalParams(record, 'local')
  assert.equal(params.length, 18)
  assert.equal(params[13], null, 'el total viaja como null si no aplica')
  assert.equal(params[14], null, 'sin archivar → fecha null')
  assert.equal(params[15], false, 'sin columna no se limpia nada (bandera ausente)')
  assert.equal(params[16], null, 'meta viaja como null si no aplica')
  assert.equal(params[17], false, 'la meta no se pisa sin bandera')

  const conPaginas = rowToGoal({ ...row, seguimiento: 'paginas', total_paginas: 1181, valor: 468 })
  assert.equal(conPaginas.totalPaginas, 1181, 'la columna total_paginas → totalPaginas')
  assert.equal(goalParams(conPaginas, 'local')[13], 1181)

  const archivada = rowToGoal({
    ...row,
    meta_dias: 30,
    finalizado_en: '2026-09-28',
  })
  assert.equal(archivada.metaDias, 30, 'la columna meta_dias → metaDias')
  assert.equal(archivada.finalizadoEn, '2026-09-28', 'la columna finalizado_en → finalizadoEn')
  assert.equal(goalParams(archivada, 'local')[14], '2026-09-28')
  assert.equal(goalParams(archivada, 'local')[16], 30)

  assert.equal(typeParams({ id: 't', nombre: 'X', updatedAt: TS }, 'local').length, 4)
  assert.equal(noteParams({ texto: 'hola', updatedAt: TS }, 'local').length, 3)
}

// meta de días y archivado: la clave ausente no toca la fila, la vacía sí
{
  const ausente = sanitizeGoal({ ...baseGoal, seguimiento: 'streak' }, TS)
  assert.equal(ausente.ok, true, ausente.error)
  assert.equal(ausente.record.metaDias, null, 'sin meta → null')
  assert.equal(ausente.record.metaDiasSet, false, 'clave ausente → no se escribe')
  assert.equal(ausente.record.finalizadoEn, null, 'sin fecha → vivo')
  assert.equal(ausente.record.finalizadoSet, false, 'clave ausente → se conserva el archivado')

  const conMeta = sanitizeGoal({ ...baseGoal, seguimiento: 'streak', metaDias: 30 }, TS)
  assert.equal(conMeta.record.metaDias, 30, 'meta numérica')
  assert.equal(conMeta.record.metaDiasSet, true, 'clave presente → se escribe')

  const texto = sanitizeGoal({ ...baseGoal, seguimiento: 'streak', metaDias: '45' }, TS)
  assert.equal(texto.record.metaDias, 45, 'meta en texto → 45')

  const tope = sanitizeGoal({ ...baseGoal, seguimiento: 'streak', metaDias: 999999 }, TS)
  assert.equal(tope.record.metaDias, 3650, 'meta enorme → tope 3650')

  const vacia = sanitizeGoal({ ...baseGoal, seguimiento: 'streak', metaDias: null }, TS)
  assert.equal(vacia.record.metaDias, null, 'null explícito → indefinida')
  assert.equal(vacia.record.metaDiasSet, true, 'null explícito sí limpia la fila')

  const cero = sanitizeGoal({ ...baseGoal, seguimiento: 'streak', metaDias: 0 }, TS)
  assert.equal(cero.record.metaDias, null, '0 → indefinida')

  const fecha = sanitizeGoal({ ...baseGoal, finalizadoEn: '2026-09-28' }, TS)
  assert.equal(fecha.ok, true, fecha.error)
  assert.equal(fecha.record.finalizadoEn, '2026-09-28', 'fecha válida')
  assert.equal(fecha.record.finalizadoSet, true, 'fecha presente → se escribe')

  const reabrir = sanitizeGoal({ ...baseGoal, finalizadoEn: null }, TS)
  assert.equal(reabrir.ok, true, reabrir.error)
  assert.equal(reabrir.record.finalizadoEn, null, 'null explícito → reabrir')
  assert.equal(reabrir.record.finalizadoSet, true, 'null explícito sí limpia el archivado')

  const enBlanco = sanitizeGoal({ ...baseGoal, finalizadoEn: '' }, TS)
  assert.equal(enBlanco.record.finalizadoEn, null, 'vacío → reabrir')
  assert.equal(enBlanco.record.finalizadoSet, true)

  const fechaMala = sanitizeGoal({ ...baseGoal, finalizadoEn: 'ayer' }, TS)
  assert.equal(fechaMala.ok, false, 'fecha ilegible → la op falla')
  assert.equal(fechaMala.error, 'bad_finalizado')

  const opMala = normalizeOp({
    entity: 'goal',
    op: 'put',
    id: 'g_1',
    ts: TS,
    data: { ...baseGoal, finalizadoEn: '28/09/2026' },
  })
  assert.equal(opMala.ok, false, 'normalizeOp propaga bad_finalizado')
  assert.equal(opMala.error, 'bad_finalizado')
}

// modo páginas: el total por objetivo, con la ausencia en null
{
  const paginas = sanitizeGoal({ ...baseGoal, seguimiento: 'paginas', totalPaginas: 1181 }, TS)
  assert.equal(paginas.ok, true, paginas.error)
  assert.equal(paginas.record.seguimiento, 'paginas')
  assert.equal(paginas.record.totalPaginas, 1181)
  assert.equal(paginas.record.valor, 42)

  const sinTotal = sanitizeGoal({ ...baseGoal, seguimiento: 'paginas' }, TS)
  assert.equal(sinTotal.ok, true, sinTotal.error)
  assert.equal(sinTotal.record.totalPaginas, null, 'sin total → null (se conserva el de la fila)')

  const basura = sanitizeGoal({ ...baseGoal, seguimiento: 'paginas', totalPaginas: 'x' }, TS)
  assert.equal(basura.record.totalPaginas, null, 'total ilegible → null')

  const cero = sanitizeGoal({ ...baseGoal, seguimiento: 'paginas', totalPaginas: 0 }, TS)
  assert.equal(cero.record.totalPaginas, null, 'total 0 → null (evita divisiones raras)')

  const enorme = sanitizeGoal({ ...baseGoal, seguimiento: 'paginas', totalPaginas: 999999 }, TS)
  assert.equal(enorme.record.totalPaginas, 10000, 'tope de 10000 páginas')

  const put = normalizeOp({
    seq: 9,
    entity: 'goal',
    op: 'put',
    id: 'g_1',
    ts: TS,
    data: { ...baseGoal, seguimiento: 'paginas', totalPaginas: 200 },
  })
  assert.equal(put.ok, true, put.error)
  assert.equal(put.record.seguimiento, 'paginas', 'paginas es un modo válido de sync')
}

// filas sin columnas opcionales
{
  const record = rowToGoal({
    id: 'g_2',
    nombre: 'Sin más',
    tipo_id: null,
    seguimiento: 'streak',
    valor: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    en_muro: false,
    updated_at: TS,
  })
  assert.deepEqual(record.componentes, [])
  assert.deepEqual(record.marcas, [])
  assert.equal(record.imagenKey, null)
}

console.log('validate.test: OK')
