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
// Cuánto se le permite adelantar la hora local al reloj del servidor.
const TS_LEAD_MS = 60 * 1000
// 400/404/413/415: el servidor no va a aceptar esa foto nunca más (peso,
// formato, clave). Se aparta para no bloquear la meta que la lleva.
const IMAGE_REJECTED_STATUS = new Set([400, 404, 413, 415])

let status = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  authorized: true,
  syncing: false,
  pending: 0,
  imageFailed: 0,
  lastSync: null,
  error: null,
}

const listeners = new Set()
let serverTimeMs = 0
let onRemote = null
let running = false
let timer = null
// La primera ronda de la sesión baja todo: es la única forma de reparar
// registros que nunca más se van a mover en el servidor.
let fullPull = true
let repairedThisSession = false
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

// El sello sale del reloj del servidor, no del local: un equipo con la hora
// desajustada no puede crear un registro "más viejo" que el que ya existe
// (eso deja copias que nadie vuelve a poder actualizar). `floor` no deja
// retroceder y `maxAhead` evita que un reloj adelantado se cuele por delante.
export function nextTs() {
  const anchor = serverTimeMs > 0 ? serverTimeMs : Date.now()
  const base = Math.min(Math.max(Date.now(), anchor + 1), anchor + TS_LEAD_MS)
  serverTimeMs = base
  return new Date(base).toISOString()
}

export function adoptServerTime(iso) {
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
  const [pending, rejected] = await Promise.all([
    countPending(),
    idb.readRejectedImages().catch(() => []),
  ])
  emit({ pending, imageFailed: rejected.length })
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
    try {
      await api.putImage(record.key, record.blob)
      await idb.markUploaded(record.key)
    } catch (error) {
      if (!IMAGE_REJECTED_STATUS.has(error?.status)) throw error
      // Sin esto, una foto imposible cortaba la ronda en seco y la meta
      // quedaba sin subir para siempre.
      await idb.rejectImage(record.key)
      console.warn('sync.foto_rechazada', JSON.stringify({ key: record.key, status: error?.status }))
    }
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
    const rejected = (result.rejected ?? []).filter((item) => item?.reason === 'stale')
    const staleSeqs = new Set(rejected.map((item) => Number(item.seq)))
    const done = sent
      .filter((_, index) => acked.has(index) || staleSeqs.has(index))
      .map((op) => op.key)
    if (done.length) await idb.removeOps(done)
    if (staleSeqs.size) {
      // El servidor ya guarda algo más nuevo que lo que mandamos: nuestra
      // copia local está por detrás y no nos dimos cuenta. Baja todo.
      console.warn('sync.stale', JSON.stringify([...staleSeqs]))
      requestFullPull()
      return
    }
    if (!acked.size || acked.size < sent.length) return
  }
}

async function pull({ full = false } = {}) {
  let sinceQuery
  if (!full) {
    const since = await idb.getMeta('lastPullAt')
    if (typeof since === 'string' && !Number.isNaN(Date.parse(since))) {
      sinceQuery = new Date(Date.parse(since) - PULL_OVERLAP_MS).toISOString()
    }
  }
  const payload = await api.fetchSync(sinceQuery)
  adoptServerTime(payload.serverTime)
  emit({ online: true, authorized: true })

  const local = onRemote
    ? await onRemote({
        types: payload.types ?? [],
        goals: payload.goals ?? [],
        note: payload.note ?? null,
        goalsTotal: payload.goalsTotal,
        typesTotal: payload.typesTotal,
      })
    : null

  await idb.setMeta('lastPullAt', payload.serverTime)
  await idb.setMeta('serverTime', payload.serverTime)
  try {
    localStorage.setItem(SYNCED_FLAG, '1')
  } catch {
    // sin localStorage seguimos igual
  }

  // Autorreparación: el servidor dice que hay más metas vivas de las que
  // tenemos. La ventana corta no las puede traer (solo devuelve lo que se
  // movió después del corte), así que pedimos todo. Sin este pase el hueco
  // dura lo que tarde el registro en volver a moverse: para siempre.
  if (!full && !repairedThisSession && faltanRegistros(local, payload)) {
    console.warn(
      'sync.repair',
      JSON.stringify({ local, gt: payload.goalsTotal, tt: payload.typesTotal }),
    )
    await pull({ full: true })
    // Se marca al terminar: si el pase completo falla, la próxima ronda lo
    // vuelve a intentar en lugar de dar la brecha por buena.
    repairedThisSession = true
  }
}

// `onRemote` devuelve cuántos registros vivos quedaron en local; si hay menos
// de lo que el servidor declara, algo local se está tragando metas.
export function faltanRegistros(local, payload) {
  if (!local) return false
  if (Number.isFinite(payload.goalsTotal) && local.goals < payload.goalsTotal) return true
  if (Number.isFinite(payload.typesTotal) && local.types < payload.typesTotal) return true
  return false
}

export function requestFullPull() {
  fullPull = true
}

// Un pase completo que no salió no se pierde: se repone para la próxima ronda.
async function pullGuarded(full) {
  try {
    await pull({ full })
  } catch (error) {
    if (full) fullPull = true
    throw error
  }
}

export async function syncNow(options = {}) {
  if (options.full === true) fullPull = true
  if (running || !status.authorized) return
  running = true
  emit({ syncing: true })
  try {
    // Primero bajamos: así lo que ya existe en el servidor manda sobre lo local
    // (registros antiguos sin sello no pueden pisar una copia más nueva).
    // Las imágenes se borran al final, con las metas ya aplicadas: así un 409
    // del servidor sí significa que la foto la sigue usando otra meta viva.
    //
    // El pase completo se consume antes de esperar a la red: así un toque del
    // badge que llegue mientras bajamos no se pierde y se atiende en esta misma
    // ronda. Si el pase falla, `pullGuarded` lo repone para la siguiente.
    const full = fullPull
    fullPull = false
    await pullGuarded(full)
    await uploadPending()
    await flush()
    // Una escritura que perdió por sello pidió bajar todo otra vez.
    if (fullPull) {
      fullPull = false
      await pullGuarded(true)
    }
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
  // Entrar es un arranque de sesión: bajamos todo para no heredar huecos.
  fullPull = true
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
