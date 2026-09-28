import { z } from 'zod'

export const MAX_FOCUS = 7
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024

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

const tipoField = z.string().min(1, 'Elige un tipo')

const seguimientoField = z.enum(['percent', 'streak'], {
  message: 'Elige cómo darle seguimiento',
})

const imagenFile = z
  .instanceof(File, { message: 'Añade una imagen' })
  .refine((file) => file.type.startsWith('image/'), 'Debe ser un archivo de imagen')
  .refine(
    (file) => file.size <= MAX_IMAGE_BYTES,
    'Máximo 1.5 MB',
  )

export const goalSchema = z.object({
  nombre: nombreField,
  tipoId: tipoField,
  imagen: imagenFile,
  seguimiento: seguimientoField,
})

export const goalUpdateSchema = z.object({
  nombre: nombreField,
  tipoId: tipoField,
  imagen: imagenFile.optional(),
  seguimiento: seguimientoField,
})

export function issuesToFieldErrors(error) {
  const errors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}
