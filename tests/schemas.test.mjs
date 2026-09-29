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

// update sin cambiar la imagen: el form manda imagen=null → sigue válida
// (si no, editar cualquier objetivo pediría subir la foto otra vez)
{
  const r = goalUpdateSchema.safeParse({
    nombre: 'Sin foto nueva', tipoId: 't', seguimiento: 'percent',
    imagen: null, componentes: [],
  })
  assert.equal(r.success, true, JSON.stringify(r.error?.issues))
  assert.equal(r.data.imagen, null, 'sin imagen el dato viaja como null')
}

// update con foto nueva → el File llega tal cual
{
  const r = goalUpdateSchema.safeParse({
    nombre: 'Foto nueva', tipoId: 't', seguimiento: 'percent',
    imagen: img, componentes: [],
  })
  assert.equal(r.success, true, JSON.stringify(r.error?.issues))
  assert.equal(r.data.imagen, img, 'el archivo nuevo se conserva')
}

// crear sin foto → sigue pidiendo la imagen (no se afloja el alta)
{
  const r = goalSchema.safeParse({
    nombre: 'Sin foto', tipoId: 't', seguimiento: 'percent',
    imagen: null, componentes: [],
  })
  assert.equal(r.success, false, 'alta sin imagen → error')
  assert.equal(issuesToFieldErrors(r.error).imagen, 'Añade una imagen')
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

// meta de días de la racha: opcional, indefinida por defecto y acotada
{
  const r = goalSchema.safeParse({
    nombre: 'Racha con meta', tipoId: 't', imagen: img, seguimiento: 'streak',
    componentes: [],
  })
  assert.equal(r.success, true, JSON.stringify(r.error?.issues))
  assert.equal(r.data.metaDias, null, 'sin meta → indefinida')
}
{
  const r = goalUpdateSchema.safeParse({
    nombre: 'Racha con meta', tipoId: 't', seguimiento: 'streak',
    metaDias: '30', componentes: [],
  })
  assert.equal(r.success, true, JSON.stringify(r.error?.issues))
  assert.equal(r.data.metaDias, 30, 'meta del input numérico → 30')
}
{
  const r = goalSchema.safeParse({
    nombre: 'Racha explícita', tipoId: 't', imagen: img, seguimiento: 'streak',
    metaDias: null, componentes: [],
  })
  assert.equal(r.success, true, JSON.stringify(r.error?.issues))
  assert.equal(r.data.metaDias, null, 'null explícito sigue siendo indefinida')
}
{
  const r = goalSchema.safeParse({
    nombre: 'Racha sin días', tipoId: 't', imagen: img, seguimiento: 'streak',
    metaDias: 0, componentes: [],
  })
  assert.equal(r.success, false, '0 no es meta de días')
  assert.equal(issuesToFieldErrors(r.error).metaDias, 'Mínimo 1 día')
}
{
  const r = goalUpdateSchema.safeParse({
    nombre: 'Racha vacía', tipoId: 't', seguimiento: 'streak',
    metaDias: '', componentes: [],
  })
  assert.equal(r.success, false, 'campo vacío con meta activa → error')
  assert.equal(issuesToFieldErrors(r.error).metaDias, 'Mínimo 1 día')
}
{
  const r = goalSchema.safeParse({
    nombre: 'Racha enorme', tipoId: 't', imagen: img, seguimiento: 'streak',
    metaDias: 4000, componentes: [],
  })
  assert.equal(r.success, false, '4000 días fuera de rango')
  assert.equal(issuesToFieldErrors(r.error).metaDias, 'Máximo 3650 días')
}

console.log('schemas.test: OK')
