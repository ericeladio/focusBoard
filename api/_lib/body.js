import { MAX_IMAGE_BYTES } from './config.js'

export function readBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body)
  if (typeof req.body === 'string') return Promise.resolve(Buffer.from(req.body, 'utf8'))
  if (req.body instanceof Uint8Array) return Promise.resolve(Buffer.from(req.body))
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return Promise.reject(new Error('send_image_binary'))
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_IMAGE_BYTES) {
        reject(new Error('image_too_large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export function jsonBody(req) {
  const body = req.body
  if (body && typeof body === 'object' && !Array.isArray(body)) return body
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}
