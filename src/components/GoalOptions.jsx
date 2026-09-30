import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/storeContext.js'
import { estadoCompuesta, partesVisibles } from '../lib/composite.js'
import GoalActions from './GoalActions.jsx'
import GoalStatus from './GoalStatus.jsx'
import GoalTrack from './GoalTrack.jsx'

// La modal no abre el form: el avance se mueve aquí y lo escribe su botón
// `Guardar` (sin el par Guardar/Deshacer de la tarjeta, que solo ensucia la
// pantalla). Para cambiar nombre, foto o tipo está el form desde el pool.
function GoalOptions({ open, onClose, goal }) {
  const { types, goals, setPercent, setPaginas } = useStore()
  const dialogRef = useRef(null)
  const [pendiente, setPendiente] = useState(null)

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
    // `setPendiente(null)` tira el pendiente; el borrador del slider se tira
    // remontando el GoalTrack con el `key` de abajo (el <dialog> sigue
    // montado aunque esté cerrado, así que sin el key viviría para siempre).
    setPendiente(null)
    onClose()
  }

  function close() {
    dialogRef.current?.close()
  }

  // Escribe el avance que se movió en el slider y deja el botón en reposo.
  function guardar() {
    if (pendiente == null) return
    if (goal.seguimiento === 'paginas') setPaginas(goal.id, pendiente)
    else setPercent(goal.id, pendiente)
    setPendiente(null)
  }

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
            onPendiente={setPendiente}
          />
        )}

        <GoalActions goal={goal} variant="wall" />

        <div className="sheet__actions">
          <button
            type="button"
            className="btn btn--ink"
            onClick={guardar}
            disabled={pendiente == null}
            title={
              pendiente == null
                ? 'Mueve el avance para poder guardarlo'
                : 'Escribe el avance en el objetivo'
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
