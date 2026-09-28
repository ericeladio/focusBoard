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

test('las claves con carpeta se codifican por segmento, no la barra', () => {
  assert.equal(api.imageUrl('img-goals/abc-123'), '/api/images/img-goals/abc-123')
  assert.equal(api.imageUrl('img-goals/con espacio'), '/api/images/img-goals/con%20espacio')
  assert.equal(api.imageUrl('suelta'), '/api/images/suelta')
})

console.log('api.test: OK')
