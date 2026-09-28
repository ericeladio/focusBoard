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

export const goalSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, 'Mínimo 3 caracteres')
    .max(60, 'Máximo 60 caracteres'),
  tipoId: z.string().min(1, 'Elige un tipo'),
  imagen: z
    .instanceof(File, { message: 'Añade una imagen' })
    .refine((file) => file.type.startsWith('image/'), 'Debe ser un archivo de imagen')
    .refine(
      (file) => file.size <= MAX_IMAGE_BYTES,
      'Máximo 1.5 MB',
    ),
  seguimiento: z.enum(['percent', 'streak'], {
    message: 'Elige cómo darle seguimiento',
  }),
})

export function issuesToFieldErrors(error) {
  const errors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}
