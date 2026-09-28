import { useEffect, useRef } from 'react'
import { useStore } from '../lib/storeContext.js'
import GoalControls from './GoalControls.jsx'

function GoalOptions({ open, onClose, goal }) {
  const { types } = useStore()
  const dialogRef = useRef(null)

  const type = types.find((item) => item.id === goal.tipoId)

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

        <GoalControls goal={goal} variant="wall" />

        <div className="sheet__actions">
          <button type="button" className="btn" onClick={close}>
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default GoalOptions
