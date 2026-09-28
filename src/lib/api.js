export class AuthError extends Error {
  constructor() {
    super('sin_sesion')
    this.name = 'AuthError'
  }
}

export class OfflineError extends Error {
  constructor() {
    super('sin_conexion')
    this.name = 'OfflineError'
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, { credentials: 'same-origin', ...options })
  } catch {
    throw new OfflineError()
  }

  let raw = ''
  try {
    raw = await response.text()
  } catch {
    raw = ''
  }
  if (response.status === 401) throw new AuthError()

  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
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

// La clave puede traer una carpeta (`img-goals/<uuid>`): se codifica por
// segmento para que la barra siga separando el ruteo. Si se usara
// encodeURIComponent de todo, la `/` pasaría a `%2F` y no llegaría a la función.
function imagePath(key) {
  return `/api/images/${String(key).split('/').map(encodeURIComponent).join('/')}`
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
