// Dueño de cada registro.
//
// `local: true` = "solo este dispositivo": el registro no pertenece a la
// cuenta que protege el passcode. Lo local:
//   - no recibe sello de sincronización,
//   - nunca entra en el outbox (no se sube),
//   - sus fotos no se suben a R2,
//   - no cuenta como "pendiente de subir".
//
// Se decide al crear el registro: si este navegador todavía no ha
// sincronizado con una cuenta (`hasSynced()`), todo lo que hay aquí es
// local. Lo que llega de la cuenta ya viene sellado y no se marca nunca.
// La única forma de llevar algo local a la cuenta es `subirACuenta`.

export function esLocal(registro) {
  return Boolean(registro && registro.local)
}

export function marcarLocal(registro) {
  if (!registro || registro.local) return registro
  return { ...registro, local: true }
}

export function marcarLocales(registros) {
  return (registros ?? []).map(marcarLocal)
}

// Una nota vacía no protege nada: si la cuenta trae una, puede entrar.
export function marcarNotaLocal(note) {
  if (!note || !note.texto) return note
  return marcarLocal(note)
}

// Claves del outbox (`entity:id`) que pertenecen a lo local.
export function clavesOutbox({ goals, types, note } = {}) {
  const claves = new Set()
  for (const goal of goals ?? []) if (esLocal(goal)) claves.add(`goal:${goal.id}`)
  for (const type of types ?? []) if (esLocal(type)) claves.add(`type:${type.id}`)
  if (esLocal(note)) claves.add('note:note')
  return claves
}

export function imagenesLocales(goals) {
  const claves = new Set()
  for (const goal of goals ?? []) {
    if (esLocal(goal) && goal.imagenKey) claves.add(goal.imagenKey)
  }
  return claves
}

// Lo único que puede salir por el outbox: de la cuenta y sellado.
export function debeSubir(registro) {
  return !esLocal(registro) && Boolean(registro && registro.updatedAt)
}
