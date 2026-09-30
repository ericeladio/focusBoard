import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/storeContext.js'
import { estadoCompuesta, partesVisibles } from '../lib/composite.js'
import GoalActions from './GoalActions.jsx'
import GoalStatus from './GoalStatus.jsx'
import GoalTrack from './GoalTrack.jsx'

// La modal es el único sitio donde se mueve y se guarda el avance: su
// `Guardar` escribe el borrador y cierra. Para cambiar nombre, foto o tipo
// está el form desde el pool.
function GoalOptions({ open, onClose, goal }) {
  const { types, goals, setPercent, setPaginas } = useStore()
  const dialogRef = useRef(null)
  // Borradores por objetivo: una compuesta puede tener varias partes y todas
  // comparten el mismo botón.
  const [pendientes, setPendientes] = useState({})

  const type = types.find((item) => item.id === goal.tipoId)
  const { partes } = estadoCompuesta(goal, goals)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleDialogClose() {
    // El borrador muere con la modal: lo que no se guardó no se guarda.
    // `setPendientes({})` tira los pendientes; el borrador del slider se tira
    // remontando el GoalTrack con el `key` de abajo (el <dialog> sigue
    // montado aunque esté cerrado, así que sin el key viviría para siempre).
    setPendientes({})
    onClose()
  }

  function close() {
    dialogRef.current?.close()
  }

  // `null` = el slider volvió a lo guardado: ese objetivo ya no tiene nada
  // pendiente y sale del mapa.
  function pendienteDe(id, valor) {
    setPendientes((current) => {
      if (valor == null) {
        if (!(id in current)) return current
        const next = { ...current }
        delete next[id]
        return next
      }
      if (current[id] === valor) return current
      return { ...current, [id]: valor }
    })
  }

  // Escribe el avance que se movió en el slider y cierra: guardar y salir es
  // un solo gesto, y lo que se guardó ya se ve en el muro.
  function guardar() {
    const ids = Object.keys(pendientes)
    if (ids.length === 0) return
    for (const id of ids) {
      const objetivo = goals.find((item) => item.id === id) ?? goal
      if (objetivo.seguimiento === 'paginas') setPaginas(id, pendientes[id])
      else setPercent(id, pendientes[id])
    }
    close()
  }

  const hayPendiente = Object.keys(pendientes).length > 0

  return (
    <dialog className="sheet" ref={dialogRef} onClose={handleDialogClose}>
      <div className="sheet__paper">
        <button type="button" className="sheet__close" onClick={close} aria-label="Cerrar">
          ×
        </button>
        <h2 className="sheet__title">{goal.nombre}</h2>
        <p className="goal__type goal__type--sheet">
          {type ? type.nombre : 'Sin tipo'}
        </p>

        {goal.seguimiento === 'compuesta' ? (
          <>
            <GoalStatus goal={goal} />
            {/* Igual que los chips: 3 de golpe, las que faltan primero. */}
            <ul className="parts">
              {partesVisibles(partes).map((parte) => (
                <li className="parts__item" key={parte.id}>
                  <span className="parts__name">{parte.nombre}</span>
                  {/* key: al cerrar, el borrador del slider se va con la modal */}
                  <GoalTrack
                    key={open ? `abierto-${parte.id}` : `cerrado-${parte.id}`}
                    goal={parte}
                    externo
                    onPendiente={(valor) => pendienteDe(parte.id, valor)}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          // key: el slider vuelve a nacer en cada apertura; lo que no se
          // guardó al cerrar no reaparece como si estuviera guardado
          <GoalTrack
            key={open ? `abierto-${goal.id}` : `cerrado-${goal.id}`}
            goal={goal}
            externo
            onPendiente={(valor) => pendienteDe(goal.id, valor)}
          />
        )}

        <GoalActions goal={goal} variant="wall" />

        <div className="sheet__actions">
          <button
            type="button"
            className="btn btn--ink"
            onClick={guardar}
            disabled={!hayPendiente}
            title={
              hayPendiente
                ? 'Escribe el avance en el objetivo y cierra'
                : 'Mueve el avance para poder guardarlo'
            }
          >
            Guardar
          </button>
          <button type="button" className="btn" onClick={close}>
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default GoalOptions
