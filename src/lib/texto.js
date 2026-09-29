// Utilidades de texto para las búsquedas (buscador del form).
//
// Comparar sin ruido: sin acentos, sin mayúsculas y sin espacios sobrando,
// para que "TESIS" o "dias" encuentren "Tesis al 100" y "Correr cada día".

export function normaliza(texto) {
  if (typeof texto !== 'string') return ''
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

// Subcadena sobre `campo` (por defecto el nombre). Texto vacío → todo.
export function filtraPorNombre(items, texto, campo = 'nombre') {
  const consulta = normaliza(texto)
  if (!consulta) return [...items]
  return items.filter((item) => normaliza(item?.[campo]).includes(consulta))
}
