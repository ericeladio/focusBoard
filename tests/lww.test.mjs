import assert from 'node:assert/strict'

const { toIso, newerThan, mergeCollection } = await import('../src/lib/lww.js')

// toIso
{
  assert.equal(toIso('2026-09-28T10:00:00.000Z'), '2026-09-28T10:00:00.000Z')
  assert.equal(toIso(new Date(0)), '1970-01-01T00:00:00.000Z')
  assert.equal(toIso(null), null)
  assert.equal(toIso(''), null)
  assert.equal(toIso('no-es-fecha'), null)
}

// newerThan
{
  assert.equal(newerThan('2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z'), true)
  assert.equal(newerThan('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'), false)
  assert.equal(newerThan('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'), false)
  assert.equal(newerThan('2026-01-01T00:00:00.000Z', null), true, 'sin local gana lo remoto')
  assert.equal(newerThan(null, '2026-01-01T00:00:00.000Z'), false)
}

// gana el sello más nuevo
{
  const local = [{ id: 'a', nombre: 'local', updatedAt: '2026-01-05T00:00:00.000Z' }]
  const remote = [
    { id: 'a', nombre: 'remoto viejo', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', nombre: 'solo remoto', updatedAt: '2026-01-02T00:00:00.000Z' },
  ]
  const merged = mergeCollection(local, remote)
  const porId = new Map(merged.records.map((r) => [r.id, r]))
  assert.equal(porId.get('a').nombre, 'local', 'lo local más nuevo se conserva')
  assert.equal(porId.has('b'), true, 'lo que solo está en el servidor entra')
  assert.equal(merged.tombstones.length, 0)
}

{
  const local = [{ id: 'a', nombre: 'local viejo', updatedAt: '2026-01-01T00:00:00.000Z' }]
  const remote = [{ id: 'a', nombre: 'remoto', updatedAt: '2026-01-05T00:00:00.000Z' }]
  const merged = mergeCollection(local, remote)
  assert.equal(merged.records[0].nombre, 'remoto', 'lo remoto más nuevo pisa lo local')
  assert.equal(merged.changed, true)
}

// borrado remoto mata lo local cuando es más nuevo
{
  const local = [{ id: 'a', nombre: 'vivo', updatedAt: '2026-01-01T00:00:00.000Z' }]
  const remote = [
    {
      id: 'a',
      nombre: 'vivo',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: '2026-01-06T00:00:00.000Z',
    },
  ]
  const merged = mergeCollection(local, remote)
  assert.equal(merged.records.length, 0, 'la lápida remota gana')
  assert.deepEqual(merged.tombstones, [
    { id: 'a', ts: '2026-01-06T00:00:00.000Z' },
  ])
  assert.equal(merged.changed, true)
}

// el borrado remoto más viejo NO mata lo editado después
{
  const local = [{ id: 'a', nombre: 'editado', updatedAt: '2026-02-01T00:00:00.000Z' }]
  const remote = [
    {
      id: 'a',
      nombre: 'editado',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: '2026-01-05T00:00:00.000Z',
    },
  ]
  const merged = mergeCollection(local, remote)
  assert.equal(merged.records.length, 1, 'una edición posterior resucita')
  assert.equal(merged.tombstones.length, 0)
}

// lápida local más nueva que lo remoto vivo
{
  const local = [{ id: 'a', nombre: 'borrado aquí', updatedAt: '2026-01-01T00:00:00.000Z' }]
  const remote = [{ id: 'a', nombre: 'remoto', updatedAt: '2026-01-02T00:00:00.000Z' }]
  const merged = mergeCollection(local, remote, [{ id: 'a', ts: '2026-01-09T00:00:00.000Z' }])
  assert.equal(merged.records.length, 0, 'la lápida local más nueva gana')
  assert.deepEqual(merged.tombstones, [{ id: 'a', ts: '2026-01-09T00:00:00.000Z' }])
}

// a sello igual gana el borrado (nada resucita solo)
{
  const ts = '2026-01-03T00:00:00.000Z'
  const local = [{ id: 'a', nombre: 'vivo', updatedAt: ts }]
  const remote = [{ id: 'a', nombre: 'vivo', updatedAt: ts, deletedAt: ts }]
  const merged = mergeCollection(local, remote)
  assert.equal(merged.records.length, 0, 'empate: gana la lápida')
  assert.deepEqual(merged.tombstones, [{ id: 'a', ts }])
}

// a sello igual entre dos vivos gana lo local (referencia intacta)
{
  const ts = '2026-01-03T00:00:00.000Z'
  const registro = { id: 'a', nombre: 'vivo', updatedAt: ts }
  const merged = mergeCollection([registro], [{ id: 'a', nombre: 'remoto', updatedAt: ts }])
  assert.equal(merged.records[0], registro, 'el objeto local se conserva tal cual')
  assert.equal(merged.changed, false)
}

// las lápidas que no aparecen en ninguna lista se conservan
{
  const merged = mergeCollection([], [], [{ id: 'x', ts: '2026-01-01T00:00:00.000Z' }])
  assert.equal(merged.records.length, 0)
  assert.deepEqual(merged.tombstones, [{ id: 'x', ts: '2026-01-01T00:00:00.000Z' }])
}

console.log('lww.test: OK')
