// Render check: compila las rutas con vite (SSR) y renderiza el muro, el pool,
// /cumplidos y el form de racha con datos de prueba. Cubre lo que `npm test`
// (lógica pura) y `npm run build` (sintaxis/imports) no ven.
//
//   npm run test:render
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const hoy = new Date()
const day = (n) => {
  const d = new Date(hoy)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const goals = [
  // 100% en el muro → debe enseñar "Terminado"
  {
    id: 'g1',
    nombre: 'Tesis al 100',
    tipoId: 'seed-personal',
    imagen: '/seed-photo.png',
    seguimiento: 'percent',
    valor: 100,
    marcas: [],
    ultimoMovimiento: day(0),
    createdAt: 10,
    enMuro: true,
    finalizadoEn: null,
    metaDias: null,
  },
  // racha con meta → "4 de 30 días" y Terminado fantasma
  {
    id: 'g2',
    nombre: 'Correr cada dia',
    tipoId: 'seed-personal',
    imagen: '/seed-photo.png',
    seguimiento: 'streak',
    valor: 0,
    metaDias: 30,
    marcas: [day(3), day(2), day(1), day(0)],
    createdAt: 11,
    enMuro: true,
    finalizadoEn: null,
  },
  // archivado → solo en /cumplidos, nunca en muro/pool/nota
  {
    id: 'g3',
    nombre: 'Archivo ocultoXYZ',
    tipoId: 'seed-personal',
    imagen: '/seed-photo.png',
    seguimiento: 'percent',
    valor: 100,
    marcas: [],
    ultimoMovimiento: day(9),
    createdAt: 12,
    enMuro: false,
    finalizadoEn: '2026-09-15',
  },
  // compuesta con 5 partes (la primera ya al 100): en pantalla solo caben 3
  {
    id: 'g4',
    nombre: 'Compuesta larga',
    tipoId: 'seed-personal',
    imagen: '/seed-photo.png',
    seguimiento: 'compuesta',
    valor: 0,
    marcas: [],
    componentes: ['w1', 'w2', 'w3', 'w4', 'w5'],
    ultimoMovimiento: day(0),
    createdAt: 13,
    enMuro: true,
    finalizadoEn: null,
    metaDias: null,
  },
  ...['uno', 'dos', 'tres', 'cuatro', 'cinco'].map((nombre, i) => ({
    id: `w${i + 1}`,
    nombre: `Parte ${nombre}`,
    tipoId: 'seed-personal',
    imagen: '/seed-photo.png',
    seguimiento: 'percent',
    valor: i === 0 ? 100 : 5,
    marcas: [],
    ultimoMovimiento: day(i),
    createdAt: 20 + i,
    enMuro: false,
    finalizadoEn: null,
    metaDias: null,
  })),
]

// Globals mínimos para que store/sync arranquen fuera del navegador.
const kv = new Map([
  ['fb.goals', JSON.stringify(goals)],
  ['fb.synced', '1'],
])
globalThis.localStorage = {
  getItem: (k) => (kv.has(k) ? kv.get(k) : null),
  setItem: (k, v) => kv.set(k, String(v)),
  removeItem: (k) => kv.delete(k),
  clear: () => kv.clear(),
}
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true, userAgent: 'node' },
    configurable: true,
  })
} catch {
  /* navigator ya existe y basta */
}
globalThis.window = globalThis
globalThis.window.confirm = () => true
globalThis.window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
})
globalThis.location = { href: 'http://localhost/', origin: 'http://localhost' }
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:stub'
}

// El outDir va dentro del repo: vite externaliza react/react-router en el
// bundle SSR y node debe poder resolverlos desde node_modules.
const out = await mkdtemp(join(process.cwd(), '.render-check-'))
let fallos = 0
try {
  execFileSync(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      'build',
      '--ssr',
      'scripts/render-check-entry.jsx',
      '--outDir',
      out,
      '--emptyOutDir',
      '--logLevel',
      'warn',
    ],
    { stdio: 'inherit' },
  )

  const { render, renderForm } = await import(
    pathToFileURL(join(out, 'render-check-entry.js')).href
  )

  const check = (donde, html, debe, noDebe = []) => {
    for (const t of debe) {
      const ok = html.includes(t)
      if (!ok) fallos++
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${donde}  contiene: ${t}`)
    }
    for (const t of noDebe) {
      const ok = !html.includes(t)
      if (!ok) fallos++
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${donde}  no contiene: ${t}`)
    }
  }

  check(
    '/',
    render('/'),
    [
      'Focus board',
      'tape-link',
      '/cumplidos',
      'Tesis al 100',
      'Correr cada dia',
      'Terminado',
      '4 de 30 días',
      // el modal de opciones (doble clic) lleva Editar en un clic
      'Editar',
      // el arrastre del muro se agarra por `data-goal`
      'data-goal="g1"',
    ],
    ['Archivo ocultoXYZ', 'solo aquí', 'Subir a la cuenta'],
  )
  // Con hueco el botón se enseña; lleno desaparece (sin estado "Muro lleno").
  check('/  (con hueco)', render('/'), ['Añadir objetivo'], ['Muro lleno'])

  // Ojo: el muro está a 3 con la compuesta, así que aquí entran 4 extras.
  const extras = Array.from({ length: 4 }, (_, i) => ({
    id: `x${i}`,
    nombre: `Extra ${i}`,
    tipoId: 'seed-personal',
    imagen: '/seed-photo.png',
    seguimiento: 'percent',
    valor: 10,
    marcas: [],
    ultimoMovimiento: day(0),
    createdAt: 100 + i,
    enMuro: true,
    finalizadoEn: null,
  }))
  kv.set('fb.goals', JSON.stringify([...goals, ...extras]))
  check(
    '/  (lleno)',
    render('/'),
    ['7 de 7 en el muro'],
    ['Añadir objetivo', 'Muro lleno'],
  )
  kv.set('fb.goals', JSON.stringify(goals))

  // Objetivo local (de antes de poner el passcode): se enseña con su marca
  // y con la única puerta de salida, subirlo a la cuenta.
  const localGoal = {
    ...goals[0],
    id: 'l1',
    nombre: 'Solo local XYZ',
    local: true,
    enMuro: true,
    finalizadoEn: null,
  }
  kv.set('fb.goals', JSON.stringify([...goals, localGoal]))
  check(
    '/  (local)',
    render('/'),
    ['Solo local XYZ', 'solo aquí', 'Subir a la cuenta'],
    [],
  )
  kv.set('fb.goals', JSON.stringify(goals))
  check('/  (sin local)', render('/'), [], ['solo aquí'])

  // Compuesta con 5 partes: solo caben 3, y al estar la primera hecha (100%)
  // la ventana avanza a las que faltan. Nota propia para que los nombres de
  // las partes solo aparezcan en la tarjeta y en el modal.
  kv.set('fb.note', JSON.stringify('nota fija para el render'))
  check(
    '/  (compuesta con 5)',
    render('/'),
    ['Compuesta larga', 'Parte dos', 'Parte tres', 'Parte cuatro'],
    ['Parte uno', 'Parte cinco'],
  )
  kv.delete('fb.note')

  check(
    '/pool',
    render('/pool'),
    ['Pool de objetivos', 'Tesis al 100', 'Correr cada dia', 'Terminado'],
    // Con menos de 10 objetivos no hay paginación (ni rango "Mostrando…").
    ['Archivo ocultoXYZ', 'Mostrando'],
  )

  // Más de 10 en juego → entra la paginación: la primera página no enseña
  // todo y el pager pinta el rango y el número actual.
  const paginados = Array.from({ length: 10 }, (_, i) => ({
    id: `p${i}`,
    nombre: `Pool ${i}`,
    tipoId: 'seed-personal',
    imagen: '/seed-photo.png',
    seguimiento: 'percent',
    valor: 10,
    marcas: [],
    ultimoMovimiento: day(0),
    createdAt: 500 + i,
    enMuro: false,
    finalizadoEn: null,
    metaDias: null,
  }))
  kv.set('fb.goals', JSON.stringify([...goals, ...paginados]))
  check(
    '/pool (paginado)',
    render('/pool'),
    ['Mostrando', 'pager__count', 'Pool 9', 'Siguiente ›', 'aria-current="page"'],
    ['Tesis al 100'],
  )
  kv.set('fb.goals', JSON.stringify(goals))
  check(
    '/cumplidos',
    render('/cumplidos'),
    [
      'Cumplidos',
      '1 cumplido · 1 este año',
      '2026',
      'Septiembre',
      'Archivo ocultoXYZ',
      'Terminado el',
      '15 sep 2026',
      'Reabrir',
      '100%',
    ],
    // Con un solo cumplido no hay pager (ni rango "Mostrando…").
    ['Tesis al 100', 'Correr cada dia', 'Mostrando'],
  )

  // Más de 10 terminados → entra la paginación, igual que en el pool: la
  // primera página no enseña todo y el mes partido se lee "10 de 12".
  const terminados = Array.from({ length: 12 }, (_, i) => ({
    id: `d${i}`,
    nombre: `Terminado ${i}`,
    tipoId: 'seed-personal',
    imagen: '/seed-photo.png',
    seguimiento: 'percent',
    valor: 100,
    marcas: [],
    ultimoMovimiento: day(i),
    createdAt: 700 + i,
    enMuro: false,
    finalizadoEn: day(i),
  }))
  kv.set('fb.goals', JSON.stringify(terminados))
  check(
    '/cumplidos (paginado)',
    render('/cumplidos'),
    [
      'Mostrando',
      'pager__count',
      'Siguiente ›',
      'aria-current="page"',
      'Terminado 0',
      // el mes que parte la página enseña "cuántas de cuántas"
      '10 de 12',
    ],
    ['Terminado 11', 'Terminado 10'],
  )
  kv.set('fb.goals', JSON.stringify(goals))
  check(
    'form(racha)',
    renderForm(goals[1]),
    ['Meta de días', 'Llegar a N días', 'Indefinido', 'value="30"'],
    // En Seguimiento ya no hay ficha "Compuesta": el compuesto se elige
    // con el tipo `Compuesto` (que sí está en el desplegable).
    ['Compuesta'],
  )

  // Con más de 10 candidatos el picker no se despliega entero: entra el
  // buscador por nombre y el pager del pool, y las partes elegidas quedan
  // como chips (aunque estén en otra página de la lista).
  const candidatosExtra = Array.from({ length: 8 }, (_, i) => ({
    id: `f${i}`,
    nombre: `Form ${i}`,
    tipoId: 'seed-personal',
    imagen: '/seed-photo.png',
    seguimiento: 'percent',
    valor: 10,
    marcas: [],
    ultimoMovimiento: day(0),
    createdAt: 900 + i,
    enMuro: false,
    finalizadoEn: null,
    metaDias: null,
  }))
  const compuesta = goals.map((goal) =>
    goal.id === 'g4' ? { ...goal, tipoId: 'tipo-compuesto' } : goal,
  )
  kv.set('fb.goals', JSON.stringify([...compuesta, ...candidatosExtra]))
  check(
    'form(compuesta con buscador)',
    renderForm(compuesta.find((goal) => goal.id === 'g4')),
    [
      'Partes de la compuesta',
      'Buscar por nombre',
      'Mostrando',
      'Siguiente ›',
      'aria-current="page"',
      // las 5 partes elegidas siguen a la vista como chips
      'aria-label="Quitar Parte uno"',
    ],
    // 15 candidatos: la primera página se queda en 10 y "Form 7" vive en la 2
    ['Form 7'],
  )
  kv.set('fb.goals', JSON.stringify(goals))

  console.log(fallos ? `\n${fallos} fallo(s)` : '\nrender-check OK')
} finally {
  await rm(out, { recursive: true, force: true })
}
process.exit(fallos ? 1 : 0)
