import assert from 'node:assert/strict'
import { goalSchema, goalUpdateSchema, issuesToFieldErrors } from '../src/lib/schemas.js'

const img = new File(['x'], 'a.png', { type: 'image/png' })

// compuesta sin tipo → válida (el tipo se asigna solo)
{
  const r = goalSchema.safeParse({
    nombre: 'Compuesta A', tipoId: '', imagen: img, seguimiento: 'compuesta',
    componentes: ['a', 'b'],
  })
  assert.equal(r.success, true, JSON.stringify(r.error?.issues))
}

// simple sin tipo → error en tipoId
{
  const r = goalSchema.safeParse({
    nombre: 'Simple', tipoId: '', imagen: img, seguimiento: 'percent',
    componentes: [],
  })
  assert.equal(r.success, false)
  assert.equal(issuesToFieldErrors(r.error).tipoId, 'Elige un tipo')
}

// simple con tipo → válida
{
  const r = goalSchema.safeParse({
    nombre: 'Simple', tipoId: 'x', imagen: img, seguimiento: 'streak',
    componentes: [],
  })
  assert.equal(r.success, true)
}

// compuesta sin partes → error en componentes
{
  const r = goalSchema.safeParse({
    nombre: 'Compuesta B', tipoId: '', imagen: img, seguimiento: 'compuesta',
    componentes: [],
  })
  assert.equal(r.success, false)
  assert.equal(issuesToFieldErrors(r.error).componentes, 'Elige al menos un objetivo para componer')
}

// update: compuesta sin tipo → válida
{
  const r = goalUpdateSchema.safeParse({
    nombre: 'Compuesta C', tipoId: '', seguimiento: 'compuesta',
    componentes: ['a'],
  })
  assert.equal(r.success, true, JSON.stringify(r.error?.issues))
}

// por páginas: total opcional (200 por defecto) y dentro de rango
{
  const r = goalSchema.safeParse({
    nombre: 'Libro largo', tipoId: 't', imagen: img, seguimiento: 'paginas',
    componentes: [],
  })
  assert.equal(r.success, true, JSON.stringify(r.error?.issues))
  assert.equal(r.data.totalPaginas, 200, 'sin total se pone 200')
}
{
  const r = goalUpdateSchema.safeParse({
    nombre: 'Libro largo', tipoId: 't', seguimiento: 'paginas',
    totalPaginas: '1181', componentes: [],
  })
  assert.equal(r.success, true, JSON.stringify(r.error?.issues))
  assert.equal(r.data.totalPaginas, 1181, 'total del input numérico → 1181')
}
{
  const r = goalSchema.safeParse({
    nombre: 'Sin páginas', tipoId: 't', imagen: img, seguimiento: 'paginas',
    totalPaginas: 0, componentes: [],
  })
  assert.equal(r.success, false)
  assert.equal(issuesToFieldErrors(r.error).totalPaginas, 'Mínimo 1 página')
}
{
  const r = goalSchema.safeParse({
    nombre: 'Modo raro', tipoId: 't', imagen: img, seguimiento: 'lectura',
    componentes: [],
  })
  assert.equal(r.success, false, 'seguimiento fuera del enum → inválido')
}

console.log('schemas.test: OK')
