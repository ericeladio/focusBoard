import { useCallback, useEffect, useState } from 'react'
import { MAX_FOCUS } from './schemas.js'
import { chainFrom, pastISO, todayISO, yesterdayISO } from './dates.js'
import { StoreContext } from './storeContext.js'

const KEY_TYPES = 'fb.types'
const KEY_GOALS = 'fb.goals'

const LOKI = '/Matantei%20Loki%20Ragnarok.jpg'

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

function normalizeGoal(goal, index = 0) {
  if (!goal || typeof goal !== 'object') return goal
  const rest = { ...goal }
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
  const marcas =
    goal.seguimiento === 'streak' ? chainFrom(legacyRacha, legacyMarca) : []
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

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // cuota superada: el estado en memoria sigue vivo
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

export function StoreProvider({ children }) {
  const [types, setTypes] = useState(() => read(KEY_TYPES, SEED_TYPES))
  const [goals, setGoals] = useState(() =>
    read(KEY_GOALS, SEED_GOALS).map((goal, index) => normalizeGoal(goal, index)),
  )

  useEffect(() => write(KEY_TYPES, types), [types])
  useEffect(() => write(KEY_GOALS, goals), [goals])

  const focusCount = goals.filter((goal) => goal.enMuro).length
  const wallFull = focusCount >= MAX_FOCUS

  const addType = useCallback(
    (nombre) => {
      const clean = nombre.trim()
      if (types.some((type) => type.nombre.toLowerCase() === clean.toLowerCase())) {
        return 'Ese tipo ya existe'
      }
      setTypes((current) => [...current, { id: crypto.randomUUID(), nombre: clean }])
      return null
    },
    [types],
  )

  const removeType = useCallback(
    (id) => {
      if (goals.some((goal) => goal.tipoId === id)) {
        return 'Hay objetivos usando este tipo'
      }
      setTypes((current) => current.filter((type) => type.id !== id))
      return null
    },
    [goals],
  )

  const addGoal = useCallback(
    async (values, file) => {
      const imagen = await fileToDataURL(file)
      setGoals((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          nombre: values.nombre,
          tipoId: values.tipoId,
          imagen,
          seguimiento: values.seguimiento,
          valor: 0,
          marcas: [],
          ultimoMovimiento: todayISO(),
          createdAt: Date.now(),
          enMuro: current.filter((goal) => goal.enMuro).length < MAX_FOCUS,
        },
      ])
    },
    [],
  )

  const updateGoal = useCallback(async (id, values, file) => {
    const imagen = file ? await fileToDataURL(file) : null
    setGoals((current) =>
      current.map((goal) => {
        if (goal.id !== id) return goal
        return {
          ...goal,
          nombre: values.nombre,
          tipoId: values.tipoId,
          seguimiento: values.seguimiento,
          ...(imagen ? { imagen } : {}),
        }
      }),
    )
  }, [])

  const placeInWall = useCallback((id) => {
    setGoals((current) => {
      if (current.filter((goal) => goal.enMuro).length >= MAX_FOCUS) return current
      return current.map((goal) => (goal.id === id ? { ...goal, enMuro: true } : goal))
    })
  }, [])

  const removeFromWall = useCallback((id) => {
    setGoals((current) =>
      current.map((goal) => (goal.id === id ? { ...goal, enMuro: false } : goal)),
    )
  }, [])

  const removeGoal = useCallback((id) => {
    setGoals((current) => current.filter((goal) => goal.id !== id))
  }, [])

  const setPercent = useCallback((id, valor) => {
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
  }, [])

  const markToday = useCallback((id) => {
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
  }, [])

  const unmarkToday = useCallback((id) => {
    setGoals((current) =>
      current.map((goal) => {
        if (goal.id !== id || goal.seguimiento !== 'streak') return goal
        const last = goal.marcas[goal.marcas.length - 1]
        if (last !== todayISO()) return goal
        return { ...goal, marcas: goal.marcas.slice(0, -1) }
      }),
    )
  }, [])

  const value = {
    types,
    goals,
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
    markToday,
    unmarkToday,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
