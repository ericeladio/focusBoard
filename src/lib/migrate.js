import { saveBlob } from './idb.js'
import { dataUrlToBlob, encodeImage, newImageKey } from './image.js'

export function needsMigration(goal) {
  return Boolean(
    goal &&
      !goal.imagenKey &&
      typeof goal.imagen === 'string' &&
      goal.imagen.length > 0,
  )
}

async function sourceFor(imagen) {
  if (imagen.startsWith('data:')) return dataUrlToBlob(imagen)
  const response = await fetch(imagen)
  if (!response.ok) throw new Error(`imagen_fuente_${response.status}`)
  return response.blob()
}

/**
 * Convierte las imágenes antiguas (dataURL en localStorage o ficheros del
 * bundle) a blobs WebP en IndexedDB. Devuelve los goals con `imagenKey`;
 * el que falle conserva `imagen` y se reintenta en el próximo arranque.
 */
export async function migrateLegacyImages(goals) {
  const next = []
  let changed = false
  for (const goal of goals) {
    if (!needsMigration(goal)) {
      next.push(goal)
      continue
    }
    try {
      const source = await sourceFor(goal.imagen)
      const { blob, width, height } = await encodeImage(source)
      const key = newImageKey()
      await saveBlob(key, { blob, width, height, contentType: blob.type })
      const copy = { ...goal }
      delete copy.imagen
      next.push({ ...copy, imagenKey: key })
      changed = true
    } catch (error) {
      console.warn('No se pudo convertir la imagen de', goal.id, error?.message ?? error)
      next.push(goal)
    }
  }
  return { goals: changed ? next : goals, changed }
}
