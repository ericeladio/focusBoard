// Orden del muro: puramente visual.
//
// El arrastre del board solo reordena en pantalla: no se guarda en ningún
// sitio, no toca los datos y no significa nada más. El estado es la lista de
// ids en el orden en que se ven; al recargar (o al volver al muro) vuelve el
// orden por defecto, que es el de `goals`.

// `ids` llega en el orden por defecto y `orden` es la lista que dejó el
// arrastre (vacía = todavía no hubo ninguno). Los ids que todavía no están
// en `orden` (objetivos nuevos) salen primero, como manda el orden por
// defecto (los más recientes primero).
export function ordenaIds(ids, orden) {
  if (!Array.isArray(orden) || orden.length === 0) return ids
  const posicion = new Map(orden.map((id, i) => [id, i]))
  const puestos = ids
    .filter((id) => posicion.has(id))
    .sort((a, b) => posicion.get(a) - posicion.get(b))
  const nuevos = ids.filter((id) => !posicion.has(id))
  return [...nuevos, ...puestos]
}

// Saca `id` de la lista y lo deja en `indice` (el índice del objetivo sobre
// el que se suelta). Un índice fuera de rango se recorta al extremo: que la
// carta se caiga por debajo de todo no rompe nada.
export function mueveA(lista, id, indice) {
  const sinId = lista.filter((item) => item !== id)
  const en = Math.min(Math.max(indice, 0), sinId.length)
  return [...sinId.slice(0, en), id, ...sinId.slice(en)]
}
