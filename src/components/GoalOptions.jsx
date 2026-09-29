import { useEffect, useRef } from 'react'
import { useStore } from '../lib/storeContext.js'
import { estadoCompuesta } from '../lib/composite.js'
import GoalActions from './GoalActions.jsx'
import GoalStatus from './GoalStatus.jsx'
import GoalTrack from './GoalTrack.jsx'

function GoalOptions({ open, onClose, goal, onEdit }) {
  const { types, goals } = useStore()
  const dialogRef = useRef(null)

  const type = types.find((item) => item.id === goal.tipoId)
  const { partes } = estadoCompuesta(goal, goals)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleDialogClose() {
    onClose()
  }

  function close() {
    dialogRef.current?.close()
  }

  // Cierra este modal y abre el form con el objetivo cargado: un solo clic.
  function editar() {
    close()
    onEdit?.(goal)
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
            <ul className="parts">
              {partes.map((parte) =>
                parte ? (
                  <li className="parts__item" key={parte.id}>
                    <span className="parts__name">{parte.nombre}</span>
                    <GoalTrack goal={parte} />
                  </li>
                ) : null,
              )}
            </ul>
          </>
        ) : (
          <GoalTrack goal={goal} />
        )}

        <GoalActions goal={goal} variant="wall" />

        <div className="sheet__actions">
          {onEdit && (
            <button type="button" className="btn btn--ink" onClick={editar}>
              Editar
            </button>
          )}
          <button type="button" className="btn" onClick={close}>
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default GoalOptions
