export const MAX_EDGE = 2048
export const WEBP_QUALITY = 0.9
export const OUTPUT_MAX_BYTES = 2.5 * 1024 * 1024
// Carpeta del bucket R2 donde viven las fotos (marcador `img-goals/`).
export const IMAGE_PREFIX = 'img-goals/'

// Cada paso intenta WebP; si no cabe, baja calidad o tamaño. Si el navegador
// no sabe codificar WebP (Safari/iOS), se cae a JPEG y ahí termina.
const PLAN = [
  { maxEdge: MAX_EDGE, quality: WEBP_QUALITY },
  { maxEdge: MAX_EDGE, quality: 0.8 },
  { maxEdge: MAX_EDGE, quality: 0.7 },
  { maxEdge: 1600, quality: 0.7 },
  { maxEdge: 1280, quality: 0.7 },
]

export function scaledSize(width, height, maxEdge = MAX_EDGE) {
  if (!width || !height) return { width: 0, height: 0, scale: 0 }
  const longest = Math.max(width, height)
  const scale = longest > maxEdge ? maxEdge / longest : 1
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  }
}

export function newImageKey() {
  const name =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `img-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  return IMAGE_PREFIX + name
}

export async function dataUrlToBlob(dataUrl) {
  try {
    const response = await fetch(dataUrl)
    if (response.ok) return await response.blob()
  } catch {
    // fallback manual para data URLs enormes
  }
  const [head, base64] = dataUrl.split(',')
  const mime = head.match(/data:([^;,]+)/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64 ?? '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function makeCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    if (typeof canvas.convertToBlob === 'function') {
      return {
        canvas,
        context: canvas.getContext('2d'),
        resize(next) {
          canvas.width = next.width
          canvas.height = next.height
        },
        encode: (type, quality) => canvas.convertToBlob({ type, quality }),
      }
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return {
    canvas,
    context: canvas.getContext('2d'),
    resize(next) {
      canvas.width = next.width
      canvas.height = next.height
    },
    encode: (type, quality) =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('codificacion_fallida'))),
          type,
          quality,
        )
      }),
  }
}

async function loadDrawable(source) {
  const esBlob = typeof Blob !== 'undefined' && source instanceof Blob
  if (esBlob && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        close: () => bitmap.close(),
      }
    } catch {
      // Safari y algunos formatos: seguimos con <img>
    }
  }

  const url = typeof source === 'string' ? source : URL.createObjectURL(source)
  const image = await new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('imagen_no_legible'))
    element.src = url
  })
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
    close: () => {
      if (typeof source !== 'string') URL.revokeObjectURL(url)
    },
  }
}

function drawInto(drawable, width, height, background) {
  const surface = makeCanvas(width, height)
  const { context } = surface
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, width, height)
  }
  drawable.draw(context, width, height)
  return surface
}

/**
 * Convierte cualquier imagen a WebP (o JPEG si el navegador no codifica WebP),
 * reduciendo a un máximo de 2048 px y sin pasar de OUTPUT_MAX_BYTES.
 */
export async function encodeImage(source, options = {}) {
  const maxBytes = options.maxBytes ?? OUTPUT_MAX_BYTES
  const drawable = await loadDrawable(source)
  try {
    if (!drawable.width || !drawable.height) throw new Error('imagen_no_legible')

    let webpSupported = true
    let jpegError = null

    for (const step of PLAN) {
      const size = scaledSize(drawable.width, drawable.height, step.maxEdge)

      if (webpSupported) {
        const surface = drawInto(drawable, size.width, size.height)
        try {
          const blob = await surface.encode('image/webp', step.quality)
          if (blob.type === 'image/webp') {
            if (blob.size <= maxBytes) {
              return { blob, width: size.width, height: size.height }
            }
          } else {
            webpSupported = false
          }
        } catch (error) {
          webpSupported = false
          jpegError = error
        }
      }

      if (!webpSupported) {
        const surface = drawInto(drawable, size.width, size.height, '#ffffff')
        try {
          const blob = await surface.encode('image/jpeg', step.quality)
          if (blob.size <= maxBytes) {
            return { blob, width: size.width, height: size.height }
          }
        } catch (error) {
          jpegError = error
        }
        break
      }
    }

    throw jpegError ?? new Error('imagen_demasiado_grande')
  } finally {
    drawable.close()
  }
}
