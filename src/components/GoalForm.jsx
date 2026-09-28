import { useEffect, useMemo, useRef, useState } from 'react'
import { goalSchema, issuesToFieldErrors, MAX_FOCUS } from '../lib/schemas.js'
import { useStore } from '../lib/storeContext.js'

const EMPTY = { nombre: '', tipoId: '', seguimiento: 'percent' }

function GoalForm({ open, onClose, onManageTypes }) {
  const { types, addGoal, focusCount, wallFull } = useStore()
  const dialogRef = useRef(null)
  const [values, setValues] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null)
  const [saving, setSaving] = useState(false)

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  )

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleDialogClose() {
    setValues(EMPTY)
    setFile(null)
    setErrors({})
    setBanner(null)
    setSaving(false)
    onClose()
  }

  function close() {
    dialogRef.current?.close()
  }

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function pickImage(event) {
    const next = event.target.files?.[0] ?? null
    setFile(next)
    setErrors((current) => ({ ...current, imagen: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const result = goalSchema.safeParse({ ...values, imagen: file })
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error))
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await addGoal(result.data, result.data.imagen)
      close()
    } catch {
      setBanner('No se pudo guardar la imagen. Prueba con una más ligera.')
      setSaving(false)
    }
  }

  return (
    <dialog className="sheet" ref={dialogRef} onClose={handleDialogClose}>
      <form className="sheet__paper" onSubmit={submit} noValidate>
        <button type="button" className="sheet__close" onClick={close} aria-label="Cerrar">
          ×
        </button>
        <h2 className="sheet__title">Nuevo objetivo</h2>

        {wallFull && (
          <p className="sheet__banner">
            El muro está lleno ({focusCount}/{MAX_FOCUS}): quedará en el pool.
          </p>
        )}
        {banner && <p className="sheet__banner">{banner}</p>}

        <div className="field">
          <label className="field__label" htmlFor="goal-nombre">
            Nombre
          </label>
          <input
            id="goal-nombre"
            className="input"
            value={values.nombre}
            onChange={(event) => update('nombre', event.target.value)}
            aria-invalid={Boolean(errors.nombre)}
            aria-describedby={errors.nombre ? 'goal-nombre-error' : undefined}
            autoFocus
          />
          {errors.nombre && (
            <p className="field__error" id="goal-nombre-error">
              {errors.nombre}
            </p>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="goal-tipo">
            Tipo de objetivo
          </label>
          <select
            id="goal-tipo"
            className="input"
            value={values.tipoId}
            onChange={(event) => update('tipoId', event.target.value)}
            aria-invalid={Boolean(errors.tipoId)}
          >
            <option value="">
              {types.length === 0 ? 'Sin tipos creados' : 'Elige un tipo'}
            </option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.nombre}
              </option>
            ))}
          </select>
          <button type="button" className="linkish" onClick={onManageTypes}>
            {types.length === 0 ? 'Crear el primer tipo' : 'Gestionar tipos'}
          </button>
          {errors.tipoId && <p className="field__error">{errors.tipoId}</p>}
        </div>

        <div className="field">
          <span className="field__label">Imagen</span>
          <div className="file-row">
            {preview ? (
              <img className="file-preview" src={preview} alt="" />
            ) : (
              <span className="file-preview file-preview--empty" aria-hidden="true">
                Foto
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={pickImage}
              aria-invalid={Boolean(errors.imagen)}
            />
          </div>
          {errors.imagen && <p className="field__error">{errors.imagen}</p>}
        </div>

        <fieldset className="field">
          <legend>Seguimiento</legend>
          <div className="option-cards">
            <label
              className={
                values.seguimiento === 'percent' ? 'opt is-active' : 'opt'
              }
            >
              <input
                type="radio"
                name="seguimiento"
                value="percent"
                checked={values.seguimiento === 'percent'}
                onChange={() => update('seguimiento', 'percent')}
              />
              <span className="opt__title">Porcentaje</span>
              <span className="opt__hint">Mueves el avance de 0 a 100%</span>
            </label>
            <label
              className={values.seguimiento === 'streak' ? 'opt is-active' : 'opt'}
            >
              <input
                type="radio"
                name="seguimiento"
                value="streak"
                checked={values.seguimiento === 'streak'}
                onChange={() => update('seguimiento', 'streak')}
              />
              <span className="opt__title">Racha de días</span>
              <span className="opt__hint">Sumas un día cuando lo cumples</span>
            </label>
          </div>
          {errors.seguimiento && (
            <p className="field__error">{errors.seguimiento}</p>
          )}
        </fieldset>

        <div className="sheet__actions">
          <button type="button" className="btn" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--ink" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar objetivo'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default GoalForm
