// Ejemplos de la cuenta de prueba (pass de negocios): lo que siembra
// `scripts/seed-demo.mjs` en Neon. No viven en la app porque solo existen en
// esa cuenta: el cliente los recibe por el pull como cualquier otro dato, con
// su `user_id`, y se marcan solos al sync (no les sale el chip «solo aquí»).
//
// Sin foto en R2: `imagen_key` nulo, así que el cliente pinta la genérica.

import { NOMBRE_COMPUESTO } from '../src/lib/composite.js'
import { pastISO } from '../src/lib/dates.js'

export const DEMO_USER_ID = 'demo-negocios'

// `types.id` es clave global en la BD: el `tipo-compuesto` de serie es de la
// cuenta principal y esta no podría quedárselo, así que tiene el suyo (con el
// mismo nombre, que es lo que reconoce la app como compuesto).
export const DEMO_COMPUESTO_ID = 'demo-compuesto'

export const DEMO_TYPES = [
  { id: 'demo-negocio', nombre: 'Negocio' },
  { id: 'demo-ventas', nombre: 'Ventas' },
  // El nombre del tipo es lo que enciende el modo páginas.
  { id: 'demo-lectura', nombre: 'Lectura' },
  { id: DEMO_COMPUESTO_ID, nombre: NOMBRE_COMPUESTO },
]

// El orden del array es el orden del muro.
export const DEMO_GOALS = [
  // Muro, porcentaje.
  {
    id: 'demo-facturacion',
    nombre: 'Facturación del mes',
    tipoId: 'demo-negocio',
    seguimiento: 'percent',
    valor: 68,
    marcas: [],
    ultimoMovimiento: pastISO(0),
    enMuro: true,
    createdAt: pastISO(40),
  },
  // Muro, porcentaje con días sin avance (se ve la alerta roja).
  {
    id: 'demo-clientes',
    nombre: 'Cerrar 5 clientes nuevos',
    tipoId: 'demo-ventas',
    seguimiento: 'percent',
    valor: 40,
    marcas: [],
    ultimoMovimiento: pastISO(4),
    enMuro: true,
    createdAt: pastISO(35),
  },
  // Muro, racha con meta: "4 de 30 días".
  {
    id: 'demo-prospectos',
    nombre: 'Llamar a 20 prospectos',
    tipoId: 'demo-ventas',
    seguimiento: 'streak',
    valor: 0,
    metaDias: 30,
    marcas: [pastISO(3), pastISO(2), pastISO(1), pastISO(0)],
    ultimoMovimiento: pastISO(0),
    enMuro: true,
    createdAt: pastISO(30),
  },
  // Muro, lectura por páginas (el tipo `Lectura` manda el modo).
  {
    id: 'demo-libro',
    nombre: 'El arte de negociar',
    tipoId: 'demo-lectura',
    seguimiento: 'paginas',
    valor: 120,
    totalPaginas: 300,
    marcas: [],
    ultimoMovimiento: pastISO(1),
    enMuro: true,
    createdAt: pastISO(25),
  },
  // Muro, compuesta: sus partes no ocupan cupo ni se ven fuera de su modal.
  {
    id: 'demo-lanzamiento',
    nombre: 'Lanzamiento de otoño',
    tipoId: DEMO_COMPUESTO_ID,
    seguimiento: 'compuesta',
    valor: 0,
    marcas: [],
    componentes: ['demo-parte-1', 'demo-parte-2', 'demo-parte-3'],
    enMuro: true,
    createdAt: pastISO(20),
  },
  // Pool, para que la lista no esté vacía.
  {
    id: 'demo-redes',
    nombre: 'Publicar 12 casos de éxito',
    tipoId: 'demo-negocio',
    seguimiento: 'percent',
    valor: 25,
    marcas: [],
    ultimoMovimiento: pastISO(2),
    enMuro: false,
    createdAt: pastISO(18),
  },
  // Partes de la compuesta: una hecha, una con avance hoy, una pendiente.
  {
    id: 'demo-parte-1',
    nombre: 'Definir precios',
    tipoId: 'demo-negocio',
    seguimiento: 'percent',
    valor: 100,
    marcas: [],
    ultimoMovimiento: pastISO(6),
    enMuro: false,
    createdAt: pastISO(15),
  },
  {
    id: 'demo-parte-2',
    nombre: 'Preparar la demo',
    tipoId: 'demo-negocio',
    seguimiento: 'percent',
    valor: 60,
    marcas: [],
    ultimoMovimiento: pastISO(0),
    enMuro: false,
    createdAt: pastISO(14),
  },
  {
    id: 'demo-parte-3',
    nombre: 'Enviar las propuestas',
    tipoId: 'demo-ventas',
    seguimiento: 'percent',
    valor: 0,
    marcas: [],
    ultimoMovimiento: pastISO(2),
    enMuro: false,
    createdAt: pastISO(13),
  },
  // Un cumplido para que `/cumplidos` también tenga algo.
  {
    id: 'demo-presupuesto',
    nombre: 'Presupuesto del trimestre',
    tipoId: 'demo-negocio',
    seguimiento: 'percent',
    valor: 100,
    marcas: [],
    ultimoMovimiento: pastISO(15),
    enMuro: false,
    finalizadoEn: pastISO(15),
    createdAt: pastISO(60),
  },
]

// La nota rayada: un TODO de negocio (máximo 8 líneas en la hoja).
export const DEMO_NOTE = [
  'Llamar a Marca Nova',
  'Mandar la propuesta de precios',
  'Cerrar la facturación del mes',
  'Preparar la demo del jueves',
  'Publicar el caso de éxito',
  'Revisar el presupuesto del trimestre',
].join('\n')
