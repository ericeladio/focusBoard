// Tutorial guiado: se enseña una sola vez y solo a quien nunca ha
// sincronizado con una cuenta — los mismos visitantes a los que se les cargan
// los ejemplos. Cada paso apunta a un elemento real de la pantalla (`diana`,
// un selector CSS): el componente le pinta el resaltado y la tarjeta al lado.
//
// Sustituye a la lista estática de funcionalidades: el tutorial es la manera
// de aprenderlas, apuntando a lo que describe.

export const CLAVE_TUTORIAL = 'fb.tutorial'

export function tutorialHecho() {
  try {
    return localStorage.getItem(CLAVE_TUTORIAL) === '1'
  } catch {
    return false
  }
}

export function marcarTutorial() {
  try {
    localStorage.setItem(CLAVE_TUTORIAL, '1')
  } catch {
    /* sin storage no vuelve a insistir en esta sesión */
  }
}

export const PASOS = [
  {
    id: 'muro',
    titulo: 'El muro',
    diana: '.wall__head',
    texto:
      'Hasta 7 focos en polaroids: la barra de avance se mira en la carta y se ' +
      'escribe en su modal, Terminado archiva el objetivo, y las cartas se ' +
      'reordenan arrastrándolas.',
  },
  {
    id: 'anadir',
    titulo: 'Añadir objetivo',
    diana: '.frame--add',
    texto:
      'Un nombre, una foto y cómo seguirlo: porcentaje, racha con meta de días ' +
      '(o indefinida) o páginas si el tipo se llama Lectura. Con el tipo Compuesto ' +
      'la partes en hasta 7.',
  },
  {
    id: 'carta',
    titulo: 'Tus cartas',
    diana: '.wall__grid .frame--goal',
    texto:
      'Doble clic (o segundo toque) en una carta abre su modal: mueves el avance y ' +
      'Guardar lo escribe y cierra, con Terminado y Borrar a mano. En el pool, el ' +
      'doble clic en una fila abre su formulario.',
  },
  {
    id: 'pool',
    titulo: 'Pool y cumplidos',
    diana: 'a[href="/pool"]',
    texto:
      'El pool lista todos tus objetivos con filtro por tipo y paginación de 10 ' +
      'en 10; cumplidos guarda lo terminado por año y mes con Reabrir. Las ' +
      'compuestas se arman eligiendo las partes con buscador y paginación.',
  },
  {
    id: 'nota',
    titulo: 'La nota TODO',
    diana: '.note',
    texto: 'La lista rayada se edita con doble clic y se guarda sola.',
  },
  {
    id: 'final',
    titulo: 'Ya está',
    diana: null,
    texto:
      'Estos objetivos de ejemplo son tuyos: bórralos cuando quieras. Entras con ' +
      'tu passcode, todo se guarda en el dispositivo y se sincroniza solo — también ' +
      'sin red.',
  },
]
