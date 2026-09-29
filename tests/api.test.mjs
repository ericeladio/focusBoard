import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import * as api from '../src/lib/api.js'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

function respondWith(response) {
  globalThis.fetch = async () => response
}

test('200 con HTML no es un "éxito" silencioso: api_no_disponible', async () => {
  respondWith(
    new Response('<!DOCTYPE html><html><body>spa</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }),
  )
  await assert.rejects(api.fetchSync(), (error) => {
    assert.equal(error.message, 'api_no_disponible')
    assert.equal(error.noJson, true)
    assert.equal(error.status, 200)
    return true
  })
})

test('404 con HTML (proxy/ruta inexistente) → api_no_disponible', async () => {
  respondWith(new Response('Not Found', { status: 404, headers: { 'content-type': 'text/html' } }))
  await assert.rejects(api.fetchSync(), (error) => {
    assert.equal(error.message, 'api_no_disponible')
    assert.equal(error.status, 404)
    return true
  })
})

test('401 con JSON → AuthError', async () => {
  respondWith(
    new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }),
  )
  await assert.rejects(api.fetchSync(), api.AuthError)
})

test('401 de login → AuthError con los intentos que quedan', async () => {
  respondWith(
    new Response(JSON.stringify({ error: 'invalid_passcode', restantes: 3 }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }),
  )
  await assert.rejects(api.login('malo'), (error) => {
    assert.ok(error instanceof api.AuthError)
    assert.equal(error.restantes, 3)
    return true
  })
})

test('401 con HTML (sesión caducada) → AuthError sin restantes', async () => {
  respondWith(new Response('<!DOCTYPE html>unauthorized', { status: 401 }))
  await assert.rejects(api.fetchSync(), (error) => {
    assert.ok(error instanceof api.AuthError)
    assert.equal(error.restantes, null)
    return true
  })
})

test('429 → RateLimitError con el tiempo que manda el servidor', async () => {
  const hasta = '2026-09-29T10:30:00.000Z'
  respondWith(
    new Response(JSON.stringify({ error: 'demasiados_intentos', retry_after: 1800, hasta }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    }),
  )
  await assert.rejects(api.login('1234'), (error) => {
    assert.ok(error instanceof api.RateLimitError)
    assert.equal(error.retryAfter, 1800)
    assert.equal(error.hasta, hasta)
    return true
  })
})

test('429 sin cuerpo → error genérico con status 429 (no pasa por AuthError)', async () => {
  respondWith(new Response('<!DOCTYPE html>Too Many Requests', { status: 429 }))
  await assert.rejects(api.fetchSync(), (error) => {
    assert.equal(error.message, 'api_no_disponible')
    assert.equal(error.status, 429)
    return true
  })
})

test('500 con JSON → error con status 500 (para distinguirlo de sin conexión)', async () => {
  respondWith(
    new Response(JSON.stringify({ error: 'server_not_configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    }),
  )
  await assert.rejects(api.fetchSync(), (error) => {
    assert.equal(error.message, 'server_not_configured')
    assert.equal(error.status, 500)
    assert.notEqual(error.noJson, true)
    return true
  })
})

test('fetch que revienta → OfflineError', async () => {
  globalThis.fetch = async () => {
    throw new Error('failed to fetch')
  }
  await assert.rejects(api.fetchSync(), api.OfflineError)
})

test('200 con JSON válido devuelve los datos', async () => {
  respondWith(
    new Response(JSON.stringify({ serverTime: '2026-09-28T00:00:00.000Z', goals: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
  const payload = await api.fetchSync()
  assert.equal(payload.serverTime, '2026-09-28T00:00:00.000Z')
  assert.deepEqual(payload.goals, [])
})

test('fetchSync con since construye la query codificada', async () => {
  let requested = ''
  globalThis.fetch = async (url) => {
    requested = String(url)
    return new Response(JSON.stringify({ serverTime: 'x' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  await api.fetchSync('2026-09-28T00:00:00.000Z')
  assert.equal(requested, '/api/sync?since=2026-09-28T00%3A00%3A00.000Z')
})

test('la clave viaja en un solo segmento: la carpeta se separa con ~', () => {
  assert.equal(api.imageUrl('img-goals/abc-123'), '/api/images/img-goals~abc-123')
  assert.equal(api.imageUrl('img-goals/con espacio'), '/api/images/img-goals~con%20espacio')
  assert.equal(api.imageUrl('suelta'), '/api/images/suelta')
})

test('sin `window` (node/SSR) no se manda identificador de dispositivo', async () => {
  let opciones = null
  globalThis.fetch = async (_url, options) => {
    opciones = options
    return new Response(JSON.stringify({ serverTime: 'x' }), { status: 200 })
  }
  await api.fetchSync()
  assert.equal(opciones.headers['x-focus-device'], undefined)
})

test('en el navegador se crea un id de dispositivo y viaja en cada petición', async () => {
  let opciones = null
  globalThis.fetch = async (_url, options) => {
    opciones = options
    return new Response(JSON.stringify({ serverTime: 'x' }), { status: 200 })
  }
  const originalWindow = globalThis.window
  const store = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
  }
  try {
    await api.fetchSync()
    const id = store.get('fb.device')
    assert.ok(id, 'el id se guarda al primer uso')
    assert.equal(opciones.headers['x-focus-device'], id)

    await api.fetchSync()
    assert.equal(store.get('fb.device'), id, 'el id no cambia entre peticiones')
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})

console.log('api.test: OK')
