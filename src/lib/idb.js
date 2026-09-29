const DB_NAME = 'focusboard'
const DB_VERSION = 1
const STORES = {
  blobs: 'blobs',
  outbox: 'outbox',
  meta: 'meta',
}

let dbPromise = null
let memoryOnly = false

const memory = {
  blobs: new Map(),
  outbox: new Map(),
  meta: new Map(),
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexeddb_no_disponible'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORES.blobs)) {
        db.createObjectStore(STORES.blobs, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORES.outbox)) {
        db.createObjectStore(STORES.outbox, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'name' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('indexeddb_bloqueado'))
  }).catch((error) => {
    memoryOnly = true
    console.warn('IndexedDB no disponible, usando memoria:', error?.message ?? error)
    return null
  })
  return dbPromise
}

async function openStore(name, mode) {
  const db = await openDb()
  if (!db) return null
  const transaction = db.transaction(name, mode)
  return { os: transaction.objectStore(name), done: transactionDone(transaction) }
}

// --- blobs de imágenes ---

export async function saveBlob(key, extra) {
  const record = {
    key,
    uploaded: false,
    createdAt: Date.now(),
    ...extra,
  }
  const store = await openStore(STORES.blobs, 'readwrite')
  if (!store) {
    memory.blobs.set(key, record)
    return record
  }
  await promisify(store.os.put(record))
  await store.done
  return record
}

export async function getBlob(key) {
  const store = await openStore(STORES.blobs, 'readonly')
  if (!store) return memory.blobs.get(key)
  const record = await promisify(store.os.get(key))
  await store.done
  return record
}

export async function allBlobs() {
  const store = await openStore(STORES.blobs, 'readonly')
  if (!store) return [...memory.blobs.values()]
  const records = await promisify(store.os.getAll())
  await store.done
  return records ?? []
}

export async function pendingUploads() {
  const [records, rejected] = await Promise.all([allBlobs(), readRejectedImages()])
  const banned = new Set(rejected)
  return records.filter((record) => record.uploaded === false && !banned.has(record.key))
}

export async function markUploaded(key) {
  const record = await getBlob(key)
  if (!record) return null
  return saveBlob(key, { ...record, uploaded: true })
}

export async function deleteBlob(key) {
  const store = await openStore(STORES.blobs, 'readwrite')
  if (!store) memory.blobs.delete(key)
  else {
    await promisify(store.os.delete(key))
    await store.done
  }
  await forgetRejectedImage(key)
  return true
}

// --- outbox de operaciones ---

function outboxKey(entity, id) {
  return `${entity}:${id}`
}

export async function readOutbox() {
  const store = await openStore(STORES.outbox, 'readonly')
  if (!store) return [...memory.outbox.values()]
  const records = await promisify(store.os.getAll())
  await store.done
  return records ?? []
}

export async function queueOps(ops) {
  if (!ops.length) return 0
  const existing = await readOutbox()
  const byKey = new Map(existing.map((op) => [op.key, op]))
  const changed = []
  for (const op of ops) {
    const key = outboxKey(op.entity, op.id)
    const current = byKey.get(key)
    if (!current || op.ts > current.ts) {
      byKey.set(key, { ...op, key })
      changed.push({ ...op, key })
    }
  }
  if (!changed.length) return 0

  const store = await openStore(STORES.outbox, 'readwrite')
  if (!store) {
    for (const op of changed) memory.outbox.set(op.key, op)
    return changed.length
  }
  for (const op of changed) await promisify(store.os.put(op))
  await store.done
  return changed.length
}

export async function removeOps(keys) {
  if (!keys.length) return
  const store = await openStore(STORES.outbox, 'readwrite')
  if (!store) {
    for (const key of keys) memory.outbox.delete(key)
    return
  }
  for (const key of keys) await promisify(store.os.delete(key))
  await store.done
}

export async function outboxCount() {
  return (await readOutbox()).length
}

// --- meta ---

export async function getMeta(name, fallback = null) {
  const store = await openStore(STORES.meta, 'readonly')
  if (!store) {
    const value = memory.meta.get(name)
    return value === undefined ? fallback : value
  }
  const record = await promisify(store.os.get(name))
  await store.done
  return record === undefined ? fallback : record.value
}

export async function setMeta(name, value) {
  const store = await openStore(STORES.meta, 'readwrite')
  if (!store) {
    memory.meta.set(name, value)
    return value
  }
  await promisify(store.os.put({ name, value }))
  await store.done
  return value
}

export function isMemoryOnly() {
  return memoryOnly
}

// --- cola de objetos de imágenes que hay que borrar en R2 ---
// Se guarda en `meta` (no abre una tienda nueva: evita subir la versión de la BD).

const KEY_IMAGE_DELETES = 'pendingImageDeletes'

export async function queueImageDelete(key) {
  if (!key) return 0
  const list = await readImageDeletes()
  if (list.includes(key)) return 0
  await setMeta(KEY_IMAGE_DELETES, [...list, key])
  return 1
}

export async function readImageDeletes() {
  const list = await getMeta(KEY_IMAGE_DELETES, [])
  return Array.isArray(list) ? list.filter((item) => typeof item === 'string') : []
}

export async function removeImageDelete(key) {
  const list = await readImageDeletes()
  const next = list.filter((item) => item !== key)
  if (next.length === list.length) return false
  await setMeta(KEY_IMAGE_DELETES, next)
  return true
}

// --- fotos que el servidor rechazó de forma definitiva ---
// Si una foto no se puede subir (peso, formato, ruta), su meta no puede
// quedarse eternamente bloqueada en el outbox: se aparta la foto y se
// avisa, en vez de romper la sincronización de todo lo demás.

const KEY_REJECTED_IMAGES = 'rejectedImages'

export async function readRejectedImages() {
  const list = await getMeta(KEY_REJECTED_IMAGES, [])
  return Array.isArray(list) ? list.filter((item) => typeof item === 'string') : []
}

export async function rejectImage(key) {
  if (!key) return false
  const list = await readRejectedImages()
  if (list.includes(key)) return false
  await setMeta(KEY_REJECTED_IMAGES, [...list, key])
  return true
}

export async function forgetRejectedImage(key) {
  if (!key) return false
  const list = await readRejectedImages()
  const next = list.filter((item) => item !== key)
  if (next.length === list.length) return false
  await setMeta(KEY_REJECTED_IMAGES, next)
  return true
}
