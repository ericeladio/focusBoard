import * as api from './api.js'
import * as idb from './idb.js'
import { toIso } from './lww.js'

const SYNCED_FLAG = 'fb.synced'
const BATCH_SIZE = 50
const TICK_MS = 60_000
const MAX_BATCHES = 10
// Releemos un poco antes del último punto de corte: si el reloj de otro
// dispositivo va atraso, su sello puede ser menor que nuestro `serverTime`.
const PULL_OVERLAP_MS = 5 * 60 * 1000

let status = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  authorized: true,
  syncing: false,
  pending: 0,
  lastSync: null,
  error: null,
}

const listeners = new Set()
let serverTimeMs = 0
let onRemote = null
let running = false
let timer = null
const cleanups = []

function emit(patch) {
  status = { ...status, ...patch }
  for (const listener of listeners) listener(status)
}

export function subscribeSync(listener) {
  listeners.add(listener)
  listener(status)
  return () => listeners.delete(listener)
}

export function getSyncStatus() {
  return status
}

export function nextTs() {
  const base = Math.max(Date.now(), serverTimeMs + 1)
  serverTimeMs = base
  return new Date(base).toISOString()
}

function adoptServerTime(iso) {
  const parsed = Date.parse(iso ?? '')
  if (!Number.isNaN(parsed)) serverTimeMs = parsed
}

export async function countPending() {
  try {
    const [ops, uploads, deletes] = await Promise.all([
      idb.outboxCount(),
      idb.pendingUploads(),
      idb.readImageDeletes(),
    ])
    return ops.length + uploads.length + deletes.length
  } catch {
    return 0
  }
}

export async function refreshPending() {
  emit({ pending: await countPending() })
}

async function handleError(error) {
  if (error instanceof api.AuthError) {
    emit({ authorized: false, error: 'unauthorized' })
    return
  }
  if (error instanceof api.OfflineError) {
    emit({ online: false, error: 'offline' })
    return
  }
  // API ausente o rota: seguimos "en línea" y lo decimos, para que no se
  // confunda con "sin conexión" ni con un error de cuenta.
  if (error?.noJson || (error?.status && error.status >= 500)) {
    emit({ online: true, error: 'server_error' })
    return
  }
  emit({ error: error?.message ?? 'error' })
}

async function uploadPending() {
  const pending = await idb.pendingUploads()
  for (const record of pending) {
    await api.putImage(record.key, record.blob)
    await idb.markUploaded(record.key)
  }
}

// Objetos de R2 que quedaron sin uso (meta borrada o foto reemplazada).
async function deletePendingImages() {
  const pending = await idb.readImageDeletes()
  for (const key of pending) {
    try {
      await api.deleteImage(key)
    } catch (error) {
      // Sin red o sin sesión: se corta la ronda y se reintenta.
      if (
        error instanceof api.AuthError ||
        error instanceof api.OfflineError ||
        !error.status ||
        error.status >= 500
      ) {
        throw error
      }
      // 409 (sigue referenciada) o 404 (ya no existe): fuera de la cola.
      await idb.removeImageDelete(key)
      continue
    }
    await idb.removeImageDelete(key)
  }
}

async function flush() {
  for (let round = 0; round < MAX_BATCHES; round += 1) {
    const outbox = await idb.readOutbox()
    if (!outbox.length) return

    const uploads = await idb.pendingUploads()
    const blocked = new Set(uploads.map((record) => record.key))
    const ready = outbox.filter(
      (op) => !(op.entity === 'goal' && op.data?.imagenKey && blocked.has(op.data.imagenKey)),
    )
    if (!ready.length) return

    const sent = ready.slice(0, BATCH_SIZE)
    const payload = sent.map((op, index) => ({
      seq: index,
      entity: op.entity,
      op: op.op,
      id: op.id,
      ts: op.ts,
      data: op.data,
    }))
    const result = await api.pushSync(payload)

    adoptServerTime(result.serverTime)
    const acked = new Set(result.acked ?? [])
    const keys = sent.filter((_, index) => acked.has(index)).map((op) => op.key)
    if (keys.length) await idb.removeOps(keys)
    if (!acked.size || acked.size < sent.length) return
  }
}

async function pull() {
  const since = await idb.getMeta('lastPullAt')
  let sinceQuery
  if (typeof since === 'string' && !Number.isNaN(Date.parse(since))) {
    sinceQuery = new Date(Date.parse(since) - PULL_OVERLAP_MS).toISOString()
  }
  const payload = await api.fetchSync(sinceQuery)
  adoptServerTime(payload.serverTime)
  emit({ online: true, authorized: true })

  if (onRemote) {
    await onRemote({
      types: payload.types ?? [],
      goals: payload.goals ?? [],
      note: payload.note ?? null,
    })
  }

  await idb.setMeta('lastPullAt', payload.serverTime)
  await idb.setMeta('serverTime', payload.serverTime)
  try {
    localStorage.setItem(SYNCED_FLAG, '1')
  } catch {
    // sin localStorage seguimos igual
  }
}

export async function syncNow() {
  if (running || !status.authorized) return
  running = true
  emit({ syncing: true })
  try {
    // Primero bajamos: así lo que ya existe en el servidor manda sobre lo local
    // (registros antiguos sin sello no pueden pisar una copia más nueva).
    // Las imágenes se borran al final, con las metas ya aplicadas: así un 409
    // del servidor sí significa que la foto la sigue usando otra meta viva.
    await pull()
    await uploadPending()
    await flush()
    await deletePendingImages()
    emit({
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
      authorized: true,
      error: null,
      lastSync: Date.now(),
    })
  } catch (error) {
    await handleError(error)
  } finally {
    running = false
    emit({ syncing: false })
    await refreshPending()
  }
}

export async function login(passcode) {
  await api.login(passcode)
  emit({ authorized: true, error: null })
  await syncNow()
}

export async function logout() {
  try {
    await api.logout()
  } catch {
    // aun sin red, cerramos la sesión local
  }
  emit({ authorized: false, error: 'unauthorized' })
}

export function startSyncEngine(handlers = {}) {
  if (timer) return stopSyncEngine
  onRemote = handlers.onRemote ?? null

  idb.getMeta('serverTime').then((value) => adoptServerTime(value)).catch(() => {})
  idb.getMeta('lastPullAt').catch(() => {})
  refreshPending()

  const onOnline = () => {
    emit({ online: true })
    syncNow()
  }
  const onOffline = () => emit({ online: false })
  const onVisible = () => {
    if (document.visibilityState === 'visible') syncNow()
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)
  cleanups.push(() => window.removeEventListener('online', onOnline))
  cleanups.push(() => window.removeEventListener('offline', onOffline))
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisible))

  timer = setInterval(syncNow, TICK_MS)
  syncNow()

  return stopSyncEngine
}

export function stopSyncEngine() {
  if (timer) clearInterval(timer)
  timer = null
  while (cleanups.length) cleanups.pop()()
}

export function hasSynced() {
  try {
    return localStorage.getItem(SYNCED_FLAG) === '1'
  } catch {
    return false
  }
}

export { toIso }
