import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MAX_FOCUS } from './schemas.js'
import { chainFrom, pastISO, todayISO, yesterdayISO } from './dates.js'
import {
  compuestoId,
  ensureCompuestoType,
  esHijoDe,
  reconcileComposites,
} from './composite.js'
import { StoreContext } from './storeContext.js'
import { imageUrl } from './api.js'
import { deleteBlob, getBlob, queueImageDelete, queueOps, saveBlob } from './idb.js'
import { encodeImage, newImageKey } from './image.js'
import { mergeCollection } from './lww.js'
import { migrateLegacyImages } from './migrate.js'
import { PAGINAS_POR_DEFECTO, esLectura } from './lectura.js'
import {
  getSyncStatus,
  hasSynced,
  login as requestLogin,
  logout as requestLogout,
  nextTs,
  refreshPending,
  startSyncEngine,
  subscribeSync,
} from './sync.js'

const KEY_TYPES = 'fb.types'
const KEY_NOTE = 'fb.note'
const KEY_GOALS = 'fb.goals'
const KEY_TOMBSTONES = 'fb.tombstones'
// Las lápidas viven lo justo para tapar borrados pendientes (el outbox los
// sube en la primera ronda con red): más allá solo sirven para esconder
// registros que el servidor todavía tiene vivos. 30 días es un equilibrio
// con el caso "equipo sin conexión un mes".
const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000
let migrationStarted = false

const LOKI = '/seed-photo.png'

const SEED_TYPES = [{ id: 'seed-personal', nombre: 'Personal' }]

const SEED_GOALS = [
  {
    id: 'seed-no5',
    nombre: 'No. 5',
    tipoId: 'seed-personal',
    imagen: LOKI,
    seguimiento: 'percent',
    valor: 35,
    marcas: [],
    ultimoMovimiento: pastISO(4),
    createdAt: 1,
    enMuro: true,
  },
  {
    id: 'seed-racha',
    nombre: 'Racha de enfoque',
    tipoId: 'seed-personal',
    imagen: LOKI,
    seguimiento: 'streak',
    valor: 0,
    marcas: [pastISO(4), pastISO(3), pastISO(2), pastISO(1)],
    createdAt: 2,
    enMuro: true,
  },
]

// Se decide una sola vez al cargar: si ya se sincronizó antes no volvemos a
// sembrar el tablero (un reinstalado debe recuperar lo del servidor).
const SYNCED_AT_START = hasSynced()

function normalizeGoal(goal, index = 0) {
  if (!goal || typeof goal !== 'object') return goal
  const rest = { ...goal }
  if (rest.seguimiento === 'paginas') {
    const total = Number(rest.totalPaginas)
    rest.totalPaginas =
      Number.isFinite(total) && total > 0 ? Math.round(total) : PAGINAS_POR_DEFECTO
  }
  if (!Array.isArray(rest.componentes)) rest.componentes = []
  rest.componentes = rest.componentes.filter((id) => typeof id === 'string')
  if (typeof rest.createdAt !== 'number') rest.createdAt = index
  const legacyRacha = rest.racha
  const legacyMarca = rest.ultimoMarca
  delete rest.racha
  delete rest.ultimoMarca
  if (
    rest.seguimiento === 'percent' &&
    (typeof rest.ultimoMovimiento !== 'string' || rest.ultimoMovimiento.length < 8)
  ) {
    rest.ultimoMovimiento = todayISO()
  }
  if (Array.isArray(goal.marcas)) {
    const last = goal.marcas[goal.marcas.length - 1]
    const live = last === todayISO() || last === yesterdayISO()
    return { ...rest, marcas: live ? goal.marcas : [] }
  }
  const marcas = goal.seguimiento === 'streak' ? chainFrom(legacyRacha, legacyMarca) : []
  return { ...rest, marcas }
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function readNote() {
  try {
    const raw = localStorage.getItem(KEY_NOTE)
    if (!raw) return { texto: null, updatedAt: null }
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') {
      return { texto: parsed.trim() ? parsed : null, updatedAt: null }
    }
    if (parsed && typeof parsed === 'object') {
      const texto =
        typeof parsed.texto === 'string' && parsed.texto.trim() ? parsed.texto : null
      const updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null
      return { texto, updatedAt }
    }
    return { texto: null, updatedAt: null }
  } catch {
    return { texto: null, updatedAt: null }
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // cuota superada: el estado en memoria sigue vivo
  }
}

function readTombstones() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY_TOMBSTONES) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const cutoff = Date.now() - TOMBSTONE_TTL
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.ts === 'string' &&
        Date.parse(item.ts) >= cutoff,
    )
  } catch {
    return []
  }
}

function writeTombstones(list) {
  const seen = new Map()
  for (const item of list) {
    if (!item || typeof item.id !== 'string' || typeof item.ts !== 'string') continue
    const current = seen.get(item.id)
    if (!current || item.ts > current.ts) seen.set(item.id, item)
  }
  write(KEY_TOMBSTONES, [...seen.values()])
}

function putTombstone(list, id, ts) {
  const index = list.findIndex((item) => item.id === id)
  if (index === -1) return [...list, { id, ts }]
  if (list[index].ts >= ts) return list
  const next = list.slice()
  next[index] = { id, ts }
  return next
}

function stampArray(prev, next) {
  if (next === prev) return next
  const prevById = new Map(prev.map((record) => [record.id, record]))
  let stamped = null
  return next.map((record) => {
    if (!record || typeof record !== 'object') return record
    const old = prevById.get(record.id)
    if (old === record) return record
    // Cambió: sello nuevo. Sin esto el servidor rechazaría la edición
    // (su guarda exige `updated_at` estrictamente mayor).
    if (!stamped) stamped = nextTs()
    return { ...record, updatedAt: stamped }
  })
}

function goalOp(record) {
  return {
    entity: 'goal',
    op: 'put',
    id: record.id,
    ts: record.updatedAt,
    data: {
      id: record.id,
      nombre: record.nombre,
      tipoId: record.tipoId ?? null,
      seguimiento: record.seguimiento,
      componentes: Array.isArray(record.componentes) ? record.componentes : [],
      valor: Number(record.valor) || 0,
      // null = "no sé": en el servidor se conserva el total que ya esté en
      // la fila, en vez de pisarlo con un 0.
      totalPaginas: Number.isFinite(Number(record.totalPaginas)) && Number(record.totalPaginas) > 0
        ? Math.round(Number(record.totalPaginas))
        : null,
      marcas: Array.isArray(record.marcas) ? record.marcas : [],
      ultimoMovimiento: record.ultimoMovimiento ?? null,
      imagenKey: record.imagenKey ?? null,
      createdAt: record.createdAt ?? Date.now(),
      enMuro: Boolean(record.enMuro),
      updatedAt: record.updatedAt,
    },
  }
}

function typeOp(record) {
  return {
    entity: 'type',
    op: 'put',
    id: record.id,
    ts: record.updatedAt,
    data: { id: record.id, nombre: record.nombre, updatedAt: record.updatedAt },
  }
}

function noteOp(note) {
  return {
    entity: 'note',
    op: 'put',
    id: 'note',
    ts: note.updatedAt,
    data: { texto: note.texto },
  }
}

function collectOps(prevList, list, entity, ops) {
  const prevById = new Map(prevList.map((record) => [record.id, record]))
  for (const record of list) {
    const old = prevById.get(record.id)
    if (old === record) continue
    if (!record.updatedAt) continue
    if (old && old.updatedAt === record.updatedAt) continue
    ops.push(entity === 'goal' ? goalOp(record) : typeOp(record))
  }
}

export function StoreProvider({ children }) {
  const [types, setTypesRaw] = useState(() => {
    const loaded = read(KEY_TYPES, SYNCED_AT_START ? [] : SEED_TYPES)
    const crudo = read(KEY_GOALS, SYNCED_AT_START ? [] : SEED_GOALS)
    const tieneCompuesta = crudo.some((goal) => goal?.seguimiento === 'compuesta')
    return tieneCompuesta ? ensureCompuestoType(loaded) : loaded
  })
  const [goals, setGoalsRaw] = useState(() => {
    const loaded = read(KEY_GOALS, SYNCED_AT_START ? [] : SEED_GOALS).map((goal, index) =>
      normalizeGoal(goal, index),
    )
    const ids = new Set(loaded.map((goal) => goal.id))
    const tipoCompuesto = compuestoId(read(KEY_TYPES, SYNCED_AT_START ? [] : SEED_TYPES))
    return loaded.map((goal) => {
      const limpio = goal.componentes.some((id) => !ids.has(id))
        ? { ...goal, componentes: goal.componentes.filter((id) => ids.has(id)) }
        : goal
      if (limpio.seguimiento !== 'compuesta' || limpio.tipoId === tipoCompuesto) {
        return limpio
      }
      return { ...limpio, tipoId: tipoCompuesto }
    })
  })
  const [note, setNoteRaw] = useState(() => readNote())
  const [hoy, setHoy] = useState(() => todayISO())
  const [imageUrls, setImageUrls] = useState({})
  const [sync, setSync] = useState(() => getSyncStatus())
  const [loginOpen, setLoginOpen] = useState(false)

  const openLogin = useCallback(() => setLoginOpen(true), [])
  const closeLogin = useCallback(() => setLoginOpen(false), [])

  // Día en curso: se re-evalúa cada minuto para re-marcar (o desmarcar)
  // las compuestas cuando cruza la medianoche con la app abierta.
  useEffect(() => {
    const timer = setInterval(() => setHoy(todayISO()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => subscribeSync(setSync), [])

  // Escrituras locales: sellan `updatedAt` solo a lo que cambió.
  const setGoals = useCallback(
    (updater) =>
      setGoalsRaw((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        return stampArray(current, next)
      }),
    [],
  )

  const setTypes = useCallback(
    (updater) =>
      setTypesRaw((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        return stampArray(current, next)
      }),
    [],
  )

  const setNote = useCallback(
    (value) =>
      setNoteRaw((current) => {
        const texto = typeof value === 'string' && value.trim() ? value : null
        if (texto === current.texto) return current
        return { texto, updatedAt: nextTs() }
      }),
    [],
  )

  const snapshot = useRef({ types, goals, note })
  const prevRef = useRef({ types, goals, note })
  const bootstrappedRef = useRef(false)

  useEffect(() => {
    snapshot.current = { types, goals, note }
  })

  // Vista reconciliada: el auto-marcado se deriva aquí, sin escribir estado
  // desde el efecto; el estado crudo sigue siendo la fuente de las acciones.
  const goalsView = useMemo(() => reconcileComposites(goals, hoy), [goals, hoy])

  const focusCount = goalsView.filter(
    (goal) => goal.enMuro && !esHijoDe(goal.id, goalsView),
  ).length
  const wallFull = focusCount >= MAX_FOCUS

  useEffect(() => write(KEY_TYPES, types), [types])
  useEffect(() => write(KEY_GOALS, goalsView), [goalsView])
  useEffect(() => write(KEY_NOTE, note), [note])

  // --- imágenes: blob en IndexedDB + URL de objeto para pintar ---

  const dropImage = useCallback(async (key) => {
    if (!key) return
    // Si la foto nunca llegó al servidor no hay nada que borrar allá.
    let uploaded = false
    try {
      uploaded = (await getBlob(key))?.uploaded === true
    } catch {
      uploaded = false
    }
    setImageUrls((current) => {
      if (!(key in current)) return current
      const url = current[key]
      if (typeof url === 'string') URL.revokeObjectURL(url)
      const next = { ...current }
      delete next[key]
      return next
    })
    await deleteBlob(key).catch(() => {})
    if (!uploaded) return
    try {
      await queueImageDelete(key)
    } catch {
      return
    }
    await refreshPending().catch(() => {})
  }, [])

  const storeImage = useCallback(async (file) => {
    const { blob, width, height } = await encodeImage(file)
    const key = newImageKey()
    await saveBlob(key, { blob, width, height, contentType: blob.type })
    const url = URL.createObjectURL(blob)
    setImageUrls((current) => ({ ...current, [key]: url }))
    return key
  }, [])

  useEffect(() => {
    let alive = true
    const missing = []
    for (const goal of goals) {
      if (!goal.imagenKey) continue
      if (goal.imagenKey in imageUrls) continue
      if (missing.includes(goal.imagenKey)) continue
      missing.push(goal.imagenKey)
    }
    if (!missing.length) return undefined

    ;(async () => {
      for (const key of missing) {
        if (!alive) return
        try {
          const record = await getBlob(key)
          if (!alive) return
          setImageUrls((current) => {
            if (key in current) return current
            return { ...current, [key]: record?.blob ? URL.createObjectURL(record.blob) : null }
          })
        } catch {
          if (!alive) return
          setImageUrls((current) => (key in current ? current : { ...current, [key]: null }))
        }
      }
    })()

    return () => {
      alive = false
    }
  }, [goals, imageUrls])

  const displayGoals = useMemo(
    () =>
      goalsView.map((goal) => {
        if (!goal.imagenKey) return goal
        const resolved = imageUrls[goal.imagenKey]
        if (resolved === undefined) return { ...goal, imagen: undefined }
        if (resolved === null) return { ...goal, imagen: imageUrl(goal.imagenKey) }
        return { ...goal, imagen: resolved }
      }),
    [goalsView, imageUrls],
  )

  // Migración de las imágenes antiguas (dataURL/fichero → WebP en IndexedDB).
  // Es una edición local: sella con `nextTs()` y se sube como cualquier otra.
  // El guard va a nivel de módulo: en StrictMode el efecto corre dos veces y
  // matar la corrida en el cleanup (p. ej. con `alive`) la dejaría sin aplicar.
  useEffect(() => {
    if (migrationStarted) return
    migrationStarted = true
    const snapshotList = snapshot.current.goals
    const snapshotById = new Map(snapshotList.map((goal) => [goal.id, goal]))
    ;(async () => {
      try {
        const { goals: migrated, changed } = await migrateLegacyImages(snapshotList)
        if (!changed) return
        const byId = new Map(migrated.map((goal) => [goal.id, goal]))
        setGoalsRaw((current) => {
          let stamp = null
          return current.map((goal) => {
            const replacement = byId.get(goal.id)
            // Si otro cambio (p. ej. el primer pull) tocó el registro mientras
            // migrábamos, lo dejamos como está: se migrará en el próximo arranque.
            if (!replacement || replacement === goal) return goal
            if (goal !== snapshotById.get(goal.id)) return goal
            if (!stamp) stamp = nextTs()
            return { ...replacement, updatedAt: stamp }
          })
        })
      } catch (error) {
        console.warn('Migración de imágenes:', error?.message ?? error)
      }
    })()
  }, [])

  // --- outbox: cada mutación local se encola para subirla ---

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = { types, goals, note }
    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true
      return
    }
    if (prev.types === types && prev.goals === goals && prev.note === note) return

    const ops = []
    collectOps(prev.goals, goals, 'goal', ops)
    collectOps(prev.types, types, 'type', ops)
    if (prev.note !== note && note.updatedAt) ops.push(noteOp(note))

    let tombstones = readTombstones()
    let tombstonesChanged = false
    for (const [prevList, list, entity] of [
      [prev.goals, goals, 'goal'],
      [prev.types, types, 'type'],
    ]) {
      const nextIds = new Set(list.map((record) => record.id))
      for (const old of prevList) {
        if (nextIds.has(old.id)) continue
        const ts = nextTs()
        ops.push({ entity, op: 'del', id: old.id, ts })
        tombstones = putTombstone(tombstones, `${entity}:${old.id}`, ts)
        tombstonesChanged = true
        if (entity === 'goal' && old.imagenKey) {
          const stillUsed = goals.some((goal) => goal.imagenKey === old.imagenKey)
          if (!stillUsed) dropImage(old.imagenKey)
        }
      }
    }
    if (tombstonesChanged) writeTombstones(tombstones)

    if (ops.length) {
      queueOps(ops)
        .then(() => refreshPending())
        .catch((error) => console.warn('Outbox:', error?.message ?? error))
    }
  })

  // --- sincronización con el servidor ---

  const applyRemote = useCallback(
    async ({ types: remoteTypes, goals: remoteGoals, note: remoteNote }) => {
      const current = snapshot.current
      const stored = readTombstones()
      const strip = (prefix) =>
        stored
          .filter((item) => item.id.startsWith(prefix))
          .map((item) => ({ id: item.id.slice(prefix.length), ts: item.ts }))
      const prefix = (list, entity) =>
        list.map((item) => ({ id: `${entity}:${item.id}`, ts: item.ts }))

      const mergedGoals = mergeCollection(current.goals, remoteGoals, strip('goal:'))
      const mergedTypes = mergeCollection(current.types, remoteTypes, strip('type:'))

      let mergedNote = current.note
      if (remoteNote && remoteNote.updatedAt) {
        const newer =
          !current.note.updatedAt ||
          Date.parse(remoteNote.updatedAt) > Date.parse(current.note.updatedAt)
        if (newer) {
          mergedNote = {
            texto: typeof remoteNote.texto === 'string' ? remoteNote.texto : null,
            updatedAt: remoteNote.updatedAt,
          }
        }
      }

      // Lo local que nunca se sincronizó se sella ahora (y por tanto se sube);
      // lo que traía el servidor ya venía sellado y manda.
      const ops = []
      const goalsOut = mergedGoals.records.map((record) => {
        if (record.updatedAt) return record
        const ts = nextTs()
        const stamped = { ...record, updatedAt: ts }
        ops.push(goalOp(stamped))
        return stamped
      })
      const typesOut = mergedTypes.records.map((record) => {
        if (record.updatedAt) return record
        const ts = nextTs()
        const stamped = { ...record, updatedAt: ts }
        ops.push(typeOp(stamped))
        return stamped
      })
      let noteOut = mergedNote
      if (noteOut.texto && !noteOut.updatedAt) {
        noteOut = { ...noteOut, updatedAt: nextTs() }
        ops.push(noteOp(noteOut))
      }

      writeTombstones([
        ...prefix(mergedGoals.tombstones, 'goal:'),
        ...prefix(mergedTypes.tombstones, 'type:'),
      ])

      // Lo que cambió aquí también se encola ya: `pull()` lo espera.
      collectOps(current.goals, goalsOut, 'goal', ops)
      collectOps(current.types, typesOut, 'type', ops)
      if (current.note !== noteOut && noteOut.updatedAt) ops.push(noteOp(noteOut))

      setGoalsRaw(goalsOut)
      setTypesRaw(typesOut)
      setNoteRaw(noteOut)
      snapshot.current = { types: typesOut, goals: goalsOut, note: noteOut }
      if (ops.length) await queueOps(ops)
      // Vivos en local tras el merge: con esto `pull()` puede comparar contra
      // los totales del servidor y detectar registros que no llegaron.
      return { goals: goalsOut.length, types: typesOut.length }
    },
    [],
  )

  useEffect(() => startSyncEngine({ onRemote: applyRemote }), [applyRemote])

  const login = useCallback(async (passcode) => {
    await requestLogin(passcode)
  }, [])

  const logout = useCallback(async () => {
    await requestLogout()
  }, [])

  const addType = useCallback(
    (nombre) => {
      const clean = nombre.trim()
      if (types.some((type) => type.nombre.toLowerCase() === clean.toLowerCase())) {
        return 'Ese tipo ya existe'
      }
      setTypes((current) => [...current, { id: crypto.randomUUID(), nombre: clean }])
      return null
    },
    [types, setTypes],
  )

  const removeType = useCallback(
    (id) => {
      if (goals.some((goal) => goal.tipoId === id)) {
        return 'Hay objetivos usando este tipo'
      }
      setTypes((current) => current.filter((type) => type.id !== id))
      return null
    },
    [goals, setTypes],
  )

  const addGoal = useCallback(
    async (values, file) => {
      const esCompuesta = values.seguimiento === 'compuesta'
      if (esCompuesta) setTypes((current) => ensureCompuestoType(current))
      const tipoId = esCompuesta ? compuestoId(types) : values.tipoId
      const imagenKey = await storeImage(file)
      // El tipo `lectura` manda el modo: por páginas, no por porcentaje.
      const tipo = types.find((item) => item.id === tipoId)
      const seguimiento = esLectura(tipo) && !esCompuesta ? 'paginas' : values.seguimiento
      setGoals((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          nombre: values.nombre,
          tipoId,
          imagenKey,
          seguimiento,
          totalPaginas: Number(values.totalPaginas) || PAGINAS_POR_DEFECTO,
          componentes:
            seguimiento === 'compuesta' ? values.componentes.slice(0, MAX_FOCUS) : [],
          valor: 0,
          marcas: [],
          ultimoMovimiento: todayISO(),
          createdAt: Date.now(),
          enMuro:
            current.filter((goal) => goal.enMuro && !esHijoDe(goal.id, current)).length <
            MAX_FOCUS,
        },
      ])
    },
    [types, setTypes, setGoals, storeImage],
  )

  const updateGoal = useCallback(
    async (id, values, file) => {
      const esCompuesta = values.seguimiento === 'compuesta'
      if (esCompuesta) setTypes((current) => ensureCompuestoType(current))
      const tipoId = esCompuesta ? compuestoId(types) : values.tipoId
      const anterior = goals.find((goal) => goal.id === id)
      const imagenKey = file ? await storeImage(file) : null

      setGoals((current) =>
        current.map((goal) => {
          if (goal.id !== id) return goal
          const tipo = types.find((item) => item.id === tipoId)
          const seguimiento =
            esLectura(tipo) && values.seguimiento !== 'compuesta'
              ? 'paginas'
              : values.seguimiento
          const cambioModo = goal.seguimiento !== seguimiento
          const componentes =
            seguimiento === 'compuesta'
              ? values.componentes.filter((item) => item !== id).slice(0, MAX_FOCUS)
              : []
          return {
            ...goal,
            nombre: values.nombre,
            tipoId,
            seguimiento,
            componentes,
            totalPaginas: Number(values.totalPaginas) || PAGINAS_POR_DEFECTO,
            ...(imagenKey ? { imagenKey } : {}),
            ...(cambioModo ? { marcas: [], valor: 0, ultimoMovimiento: todayISO() } : {}),
          }
        }),
      )

      if (imagenKey && anterior?.imagenKey && anterior.imagenKey !== imagenKey) {
        const stillUsed = goals.some(
          (goal) => goal.id !== id && goal.imagenKey === anterior.imagenKey,
        )
        if (!stillUsed) dropImage(anterior.imagenKey)
      }
    },
    [types, goals, setTypes, setGoals, storeImage, dropImage],
  )

  const placeInWall = useCallback(
    (id) => {
      setGoals((current) => {
        if (esHijoDe(id, current)) return current
        if (
          current.filter((goal) => goal.enMuro && !esHijoDe(goal.id, current)).length >=
          MAX_FOCUS
        ) {
          return current
        }
        return current.map((goal) => (goal.id === id ? { ...goal, enMuro: true } : goal))
      })
    },
    [setGoals],
  )

  const removeFromWall = useCallback(
    (id) => {
      setGoals((current) =>
        current.map((goal) => (goal.id === id ? { ...goal, enMuro: false } : goal)),
      )
    },
    [setGoals],
  )

  const removeGoal = useCallback(
    (id) => {
      setGoals((current) =>
        current
          .filter((goal) => goal.id !== id)
          .map((goal) =>
            goal.componentes.includes(id)
              ? { ...goal, componentes: goal.componentes.filter((item) => item !== id) }
              : goal,
          ),
      )
    },
    [setGoals],
  )

  const setPercent = useCallback(
    (id, valor) => {
      const clamped = Math.max(0, Math.min(100, Number(valor)))
      setGoals((current) =>
        current.map((goal) => {
          if (goal.id !== id || goal.seguimiento !== 'percent') return goal
          const increased = clamped > goal.valor
          return {
            ...goal,
            valor: clamped,
            ...(increased ? { ultimoMovimiento: todayISO() } : {}),
          }
        }),
      )
    },
    [setGoals],
  )

  // Páginas leídas: el tope es el total del propio objetivo, no un 100.
  const setPaginas = useCallback(
    (id, valor) => {
      const pedidas = Math.round(Number(valor))
      if (!Number.isFinite(pedidas)) return
      setGoals((current) =>
        current.map((goal) => {
          if (goal.id !== id || goal.seguimiento !== 'paginas') return goal
          const total = Number(goal.totalPaginas) || PAGINAS_POR_DEFECTO
          const clamped = Math.max(0, Math.min(total, pedidas))
          const increased = clamped > goal.valor
          return {
            ...goal,
            valor: clamped,
            ...(increased ? { ultimoMovimiento: todayISO() } : {}),
          }
        }),
      )
    },
    [setGoals],
  )

  const markToday = useCallback(
    (id) => {
      setGoals((current) =>
        current.map((goal) => {
          if (goal.id !== id || goal.seguimiento !== 'streak') return goal
          const last = goal.marcas[goal.marcas.length - 1]
          if (last === todayISO()) return goal
          if (last === yesterdayISO()) {
            return { ...goal, marcas: [...goal.marcas, todayISO()] }
          }
          return { ...goal, marcas: [todayISO()] }
        }),
      )
    },
    [setGoals],
  )

  const unmarkToday = useCallback(
    (id) => {
      setGoals((current) =>
        current.map((goal) => {
          if (goal.id !== id || goal.seguimiento !== 'streak') return goal
          const last = goal.marcas[goal.marcas.length - 1]
          if (last !== todayISO()) return goal
          return { ...goal, marcas: goal.marcas.slice(0, -1) }
        }),
      )
    },
    [setGoals],
  )

  const value = {
    types,
    goals: displayGoals,
    note: note.texto,
    setNote,
    focusCount,
    wallFull,
    addType,
    removeType,
    addGoal,
    updateGoal,
    placeInWall,
    removeFromWall,
    removeGoal,
    setPercent,
    setPaginas,
    markToday,
    unmarkToday,
    sync,
    login,
    logout,
    loginOpen,
    openLogin,
    closeLogin,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
