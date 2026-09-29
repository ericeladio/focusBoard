// Los ejemplos que trae el tablero cuando este navegador todavía no ha
// entrado con passcode (`!hasSynced()`): los tipos y los objetivos de
// demostración que se cargan en lugar de la lista vacía. Cubren las tres
// formas de seguir (porcentaje, racha con meta y páginas), una compuesta con
// sus partes y un cumplido archivado, para que se vean todas las
// funcionalidades sin tener que crear nada.
//
// Si alguien ya sincronizó con una cuenta, nada de esto se carga: sus datos
// son los suyos.

import { ID_COMPUESTO } from './composite.js'
import { pastISO } from './dates.js'

export const SEED_TYPES = [
  { id: 'seed-personal', nombre: 'Personal' },
  // El nombre del tipo es lo que enciende el modo páginas (`esNombreLectura`).
  { id: 'seed-lectura', nombre: 'Lectura' },
]

// La misma foto de portada para todos: es la referencia del sketch.
const LOKI = '/seed-photo.png'

export const SEED_GOALS = [
  // Muro, porcentaje: la alerta roja de "4 días sin avance".
  {
    id: 'seed-portafolio',
    nombre: 'Portafolio al 100',
    tipoId: 'seed-personal',
    imagen: LOKI,
    seguimiento: 'percent',
    valor: 35,
    marcas: [],
    ultimoMovimiento: pastISO(4),
    createdAt: 1,
    enMuro: true,
  },
  // Muro, racha con meta: el contador "4 de 30 días".
  {
    id: 'seed-racha',
    nombre: 'Ejercicio 30 días',
    tipoId: 'seed-personal',
    imagen: LOKI,
    seguimiento: 'streak',
    valor: 0,
    metaDias: 30,
    marcas: [pastISO(4), pastISO(3), pastISO(2), pastISO(1)],
    ultimoMovimiento: pastISO(1),
    createdAt: 2,
    enMuro: true,
  },
  // Muro, lectura: el tipo `Lectura` convierte el seguimiento en páginas.
  {
    id: 'seed-libro',
    nombre: 'El nombre del viento',
    tipoId: 'seed-lectura',
    imagen: LOKI,
    seguimiento: 'paginas',
    valor: 240,
    totalPaginas: 662,
    marcas: [],
    ultimoMovimiento: pastISO(0),
    createdAt: 3,
    enMuro: true,
  },
  // Muro, compuesta: sus partes no ocupan cupo ni se ven en el muro; solo
  // dentro de su modal (y en el picker del form, marcadas como "dentro de").
  {
    id: 'seed-compuesta',
    nombre: 'Sprint de la tesis',
    tipoId: ID_COMPUESTO,
    imagen: LOKI,
    seguimiento: 'compuesta',
    valor: 0,
    marcas: [],
    componentes: ['seed-parte-1', 'seed-parte-2', 'seed-parte-3'],
    createdAt: 4,
    enMuro: true,
  },
  // Una parte ya hecha…
  {
    id: 'seed-parte-1',
    nombre: 'Reunir las fuentes',
    tipoId: 'seed-personal',
    imagen: LOKI,
    seguimiento: 'percent',
    valor: 100,
    marcas: [],
    ultimoMovimiento: pastISO(6),
    createdAt: 5,
    enMuro: false,
  },
  // …una con avance hoy (el chip se invierte a tinta)…
  {
    id: 'seed-parte-2',
    nombre: 'Escribir el marco teórico',
    tipoId: 'seed-personal',
    imagen: LOKI,
    seguimiento: 'percent',
    valor: 45,
    marcas: [],
    ultimoMovimiento: pastISO(0),
    createdAt: 6,
    enMuro: false,
  },
  // …y una pendiente.
  {
    id: 'seed-parte-3',
    nombre: 'Enviar el borrador al director',
    tipoId: 'seed-personal',
    imagen: LOKI,
    seguimiento: 'percent',
    valor: 0,
    marcas: [],
    ultimoMovimiento: pastISO(2),
    createdAt: 7,
    enMuro: false,
  },
  // Un cumplido archivado: `/cumplidos` también tiene algo que enseñar.
  {
    id: 'seed-cumplido',
    nombre: 'Renovar el seguro',
    tipoId: 'seed-personal',
    imagen: LOKI,
    seguimiento: 'percent',
    valor: 100,
    marcas: [],
    ultimoMovimiento: pastISO(12),
    createdAt: 8,
    enMuro: false,
    finalizadoEn: pastISO(12),
  },
]
