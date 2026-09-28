import assert from 'node:assert/strict'

const { normalizeOp, normalizeOps, sanitizeGoal, sanitizeNote, toIso } = await import(
  '../api/_lib/validate.js'
)
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
  assert.equal(goalParams(record, 'local').length, 13)
  assert.equal(typeParams({ id: 't', nombre: 'X', updatedAt: TS }, 'local').length, 4)
  assert.equal(noteParams({ texto: 'hola', updatedAt: TS }, 'local').length, 3)
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
