import { imageKeyToSegment } from '../../shared/imageKey.js'

export class AuthError extends Error {
  constructor(restantes = null) {
    super('sin_sesion')
    this.name = 'AuthError'
    // Intentos que quedan antes del bloqueo (si el servidor no lo dice, null).
    this.restantes = Number.isFinite(restantes) ? restantes : null
  }
}

export class OfflineError extends Error {
  constructor() {
    super('sin_conexion')
    this.name = 'OfflineError'
  }
}

export class RateLimitError extends Error {
  constructor(retryAfter, hasta) {
    super('demasiados_intentos')
    this.name = 'RateLimitError'
    this.retryAfter = Math.max(1, Number(retryAfter) || 1)
    this.hasta = hasta || new Date(Date.now() + this.retryAfter * 1000).toISOString()
  }
}

// Identidad de dispositivo para el límite de intentos: un UUID en
// localStorage. No es una sesión ni sustituye al passcode; solo evita que
// borrar cookies / abrir otra ventana salte el bloqueo. Se lee aquí, no al
// importar el módulo, para no tocar localStorage en el render del servidor.
const DEVICE_KEY = 'fb.device'

export function deviceId() {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers ?? {}) }
  const device = deviceId()
  if (device) headers['x-focus-device'] = device

  let response
  try {
    response = await fetch(path, { credentials: 'same-origin', ...options, headers })
  } catch {
    throw new OfflineError()
  }

  let raw = ''
  try {
    raw = await response.text()
  } catch {
    raw = ''
  }

  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  // Se mira el cuerpo antes de decidir el tipo de error: el 401 de login
  // trae `restantes` y el 429 trae el tiempo de bloqueo.
  if (response.status === 401 && (data === null || typeof data !== 'object')) {
    throw new AuthError()
  }
  if (response.status === 429 && data !== null && typeof data === 'object') {
    throw new RateLimitError(data.retry_after, data.hasta)
  }

  // Un 200 con HTML no es un error de red: es que aquí no hay backend (por
  // ejemplo `npm run dev` sin el servidor de API). Sin esto el fallo se
  // traga más abajo y nunca se sube nada.
  if (data === null || typeof data !== 'object') {
    const error = new Error('api_no_disponible')
    error.status = response.status
    error.noJson = true
    throw error
  }
  if (response.status === 401) throw new AuthError(data.restantes)
  if (!response.ok) {
    const error = new Error(data?.error ?? `http_${response.status}`)
    error.status = response.status
    throw error
  }
  return data
}

export function login(passcode) {
  return request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  })
}

export function logout() {
  return request('/api/logout', { method: 'POST' })
}

export function fetchSync(since) {
  const query = since ? `?since=${encodeURIComponent(since)}` : ''
  return request(`/api/sync${query}`)
}

export function pushSync(ops) {
  return request('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ops }),
  })
}

// La clave viaja en UN solo segmento (`img-goals~<uuid>`): Vercel no enruta
// dos barras bajo /api/images/ (devuelve 404 y la función ni se invoca). El
// `~` la sustituye en la URL y la restaura el servidor; la clave real no cambia.
function imagePath(key) {
  return `/api/images/${encodeURIComponent(imageKeyToSegment(key))}`
}

export function putImage(key, blob) {
  return request(imagePath(key), {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  })
}

export function deleteImage(key) {
  return request(imagePath(key), { method: 'DELETE' })
}

export function imageUrl(key) {
  return imagePath(key)
}
