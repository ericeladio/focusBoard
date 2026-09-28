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
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (response.status === 401) throw new AuthError()
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

export function putImage(key, blob) {
  return request(`/api/images/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  })
}

export function deleteImage(key) {
  return request(`/api/images/${encodeURIComponent(key)}`, { method: 'DELETE' })
}

export function imageUrl(key) {
  return `/api/images/${encodeURIComponent(key)}`
}
