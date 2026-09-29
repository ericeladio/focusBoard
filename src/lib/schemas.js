import { z } from 'zod'

export const MAX_FOCUS = 7
// Límite del archivo que el usuario elige (se convierte/comprime después).
export const MAX_INPUT_BYTES = 10 * 1024 * 1024

export const goalTypeSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(24, 'Máximo 24 caracteres'),
})

const nombreField = z
  .string()
  .trim()
  .min(3, 'Mínimo 3 caracteres')
  .max(60, 'Máximo 60 caracteres')

const tipoField = z.string()

const seguimientoField = z.enum(['percent', 'streak', 'compuesta', 'paginas'], {
  message: 'Elige cómo darle seguimiento',
})

// Solo lo usa el modo `paginas`; para el resto de los modos el número se
// ignora, así que el default (200) no molesta a nadie.
const totalPaginasField = z.coerce
  .number({ message: 'Pon las páginas totales' })
  .int('Pon un número entero de páginas')
  .min(1, 'Mínimo 1 página')
  .max(10000, 'Máximo 10000 páginas')
  .default(200)

const componentesField = z
  .array(z.string().min(1))
  .max(MAX_FOCUS, `Máximo ${MAX_FOCUS} partes`)
  .default([])

// Meta de días de una racha. `null` = indefinida (sin tope): el campo viaja
// siempre para que un cliente nuevo pueda vaciar la meta que había.
const metaDiasField = z.coerce
  .number({ message: 'Pon los días de la meta' })
  .int('Pon un número entero de días')
  .min(1, 'Mínimo 1 día')
  .max(3650, 'Máximo 3650 días')
  .nullable()
  .default(null)

function checkTipo(data, ctx) {
  if (data.seguimiento === 'compuesta' || data.tipoId) return
  ctx.addIssue({
    code: 'custom',
    path: ['tipoId'],
    message: 'Elige un tipo',
  })
}

function checkComponentes(data, ctx) {
  if (data.seguimiento !== 'compuesta') return
  if (data.componentes.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['componentes'],
      message: 'Elige al menos un objetivo para componer',
    })
    return
  }
  if (new Set(data.componentes).size !== data.componentes.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['componentes'],
      message: 'No repitas el mismo objetivo',
    })
  }
}

const imagenFile = z
  .instanceof(File, { message: 'Añade una imagen' })
  .refine((file) => file.type.startsWith('image/'), 'Debe ser un archivo de imagen')
  .refine(
    (file) => file.size <= MAX_INPUT_BYTES,
    'Máximo 10 MB',
  )

export const goalSchema = z
  .object({
    nombre: nombreField,
    tipoId: tipoField,
    imagen: imagenFile,
    seguimiento: seguimientoField,
    totalPaginas: totalPaginasField,
    metaDias: metaDiasField,
    componentes: componentesField,
  })
  .superRefine(checkComponentes)
  .superRefine(checkTipo)

export const goalUpdateSchema = z
  .object({
    nombre: nombreField,
    tipoId: tipoField,
    // `nullish`: el form manda `null` cuando no se elige archivo nuevo, y eso
    // significa "conservar la imagen actual" (el store no pisa `imagenKey`).
    imagen: imagenFile.nullish(),
    seguimiento: seguimientoField,
    totalPaginas: totalPaginasField,
    metaDias: metaDiasField,
    componentes: componentesField,
  })
  .superRefine(checkComponentes)
  .superRefine(checkTipo)

export function issuesToFieldErrors(error) {
  const errors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}
