import { useEffect, useRef, useState } from 'react'
import { goalTypeSchema, issuesToFieldErrors } from '../lib/schemas.js'
import { useStore } from '../lib/storeContext.js'

function GoalTypeForm({ open, onClose }) {
  const { types, goals, addType, removeType } = useStore()
  const dialogRef = useRef(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)
  const [listError, setListError] = useState(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleDialogClose() {
    setDraft('')
    setError(null)
    setListError(null)
    onClose()
  }

  function close() {
    dialogRef.current?.close()
  }

  function submit(event) {
    event.preventDefault()
    const parsed = goalTypeSchema.safeParse({ nombre: draft })
    if (!parsed.success) {
      setError(issuesToFieldErrors(parsed.error).nombre ?? 'Revisa el nombre')
      return
    }
    const duplicate = addType(parsed.data.nombre)
    if (duplicate) {
      setError(duplicate)
      return
    }
    setError(null)
    setDraft('')
  }

  function tryRemove(id) {
    const failure = removeType(id)
    setListError(failure)
  }

  return (
    <dialog className="sheet" ref={dialogRef} onClose={handleDialogClose}>
      <form className="sheet__paper" onSubmit={submit} noValidate>
        <button type="button" className="sheet__close" onClick={close} aria-label="Cerrar">
          ×
        </button>
        <h2 className="sheet__title">Tipos de objetivo</h2>

        {listError && <p className="sheet__banner">{listError}</p>}

        {types.length === 0 ? (
          <p className="field__hint">Aún no hay tipos. Crea el primero abajo.</p>
        ) : (
          <ul className="type-list">
            {types.map((type) => {
              const uses = goals.filter((goal) => goal.tipoId === type.id).length
              return (
                <li key={type.id}>
                  <span>
                    {type.nombre}
                    <span className="field__hint"> · {uses} en uso</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => tryRemove(type.id)}
                  >
                    Borrar
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="field">
          <label className="field__label" htmlFor="tipo-nombre">
            Nuevo tipo
          </label>
          <div className="type-row">
            <input
              id="tipo-nombre"
              className="input"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                setError(null)
                setListError(null)
              }}
              aria-invalid={Boolean(error)}
              autoFocus
            />
            <button type="submit" className="btn btn--ink">
              Añadir
            </button>
          </div>
          {error && <p className="field__error">{error}</p>}
        </div>

        <div className="sheet__actions">
          <button type="button" className="btn" onClick={close}>
            Listo
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default GoalTypeForm
