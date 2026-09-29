import { useEffect, useMemo, useRef, useState } from 'react'
import {
  goalSchema,
  goalUpdateSchema,
  issuesToFieldErrors,
  MAX_FOCUS,
} from '../lib/schemas.js'
import { useStore } from '../lib/storeContext.js'
import { markedToday, streakOf } from '../lib/dates.js'
import { padreDe } from '../lib/composite.js'
import { PAGINAS_POR_DEFECTO, esNombreLectura, etiquetaDe } from '../lib/lectura.js'

const EMPTY = {
  nombre: '',
  tipoId: '',
  seguimiento: 'percent',
  totalPaginas: PAGINAS_POR_DEFECTO,
  componentes: [],
}

// El tipo `lectura` decide el modo: si es de lectura se sigue por páginas y
// no se ofrecen las otras opciones; si sale de ahí, vuelve a porcentaje.
function forzarModo(seguimiento, tipoId, types) {
  if (seguimiento === 'compuesta') return seguimiento
  const tipo = types.find((type) => type.id === tipoId)
  if (esNombreLectura(tipo?.nombre)) return 'paginas'
  return seguimiento === 'paginas' ? 'percent' : seguimiento
}

function GoalForm({ open, onClose, onManageTypes, editing = null }) {
  const { types, goals, addGoal, updateGoal, focusCount, wallFull } = useStore()
  const dialogRef = useRef(null)
  const [values, setValues] = useState(() =>
    editing
      ? {
          nombre: editing.nombre,
          tipoId: editing.tipoId,
          seguimiento: forzarModo(editing.seguimiento, editing.tipoId, types),
          totalPaginas: editing.totalPaginas ?? PAGINAS_POR_DEFECTO,
          componentes: editing.componentes ?? [],
        }
      : EMPTY,
  )
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null)
  const [saving, setSaving] = useState(false)

  const fileUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  )

  useEffect(() => {
    if (!fileUrl) return
    return () => URL.revokeObjectURL(fileUrl)
  }, [fileUrl])

  const preview = fileUrl ?? editing?.imagen ?? null

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

  const padreActual = editing ? padreDe(editing.id, goals) : null

  const candidatos = goals.filter(
    (goal) => goal.id !== editing?.id && goal.seguimiento !== 'compuesta',
  )

  function usadoPor(candidato) {
    const padre = padreDe(candidato.id, goals)
    return padre && padre.id !== editing?.id ? padre : null
  }

  function estadoDe(candidato) {
    if (candidato.seguimiento === 'percent') return `${candidato.valor}%`
    if (candidato.seguimiento === 'paginas') return etiquetaDe(candidato)
    return markedToday(candidato.marcas)
      ? 'avance hoy'
      : `${streakOf(candidato.marcas)} días`
  }

  function setSeguimiento(next) {
    update('seguimiento', next)
    if (next === 'compuesta') return
    const actual = types.find((type) => type.id === values.tipoId)
    if (actual && actual.nombre.toLowerCase() === 'compuesto') {
      setValues((current) => ({ ...current, tipoId: '' }))
    }
  }

  // El tipo manda el modo: al cambiar de tipo se recalcula en el momento,
  // no en un efecto (evita renders en cascada y el modo queda consistente).
  function cambiarTipo(nextTipoId) {
    setValues((current) => ({
      ...current,
      tipoId: nextTipoId,
      seguimiento: forzarModo(current.seguimiento, nextTipoId, types),
    }))
    setErrors((current) => ({ ...current, tipoId: undefined }))
  }

  function toggleParte(id) {
    setValues((current) => {
      const dentro = current.componentes.includes(id)
      if (!dentro && current.componentes.length >= MAX_FOCUS) return current
      return {
        ...current,
        componentes: dentro
          ? current.componentes.filter((item) => item !== id)
          : [...current.componentes, id],
      }
    })
    setErrors((current) => ({ ...current, componentes: undefined }))
  }

  function pickImage(event) {
    const next = event.target.files?.[0] ?? null
    setFile(next)
    setErrors((current) => ({ ...current, imagen: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const schema = editing ? goalUpdateSchema : goalSchema
    const result = schema.safeParse({ ...values, imagen: file })
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error))
      return
    }
    setErrors({})
    setSaving(true)
    try {
      if (editing) {
        await updateGoal(editing.id, result.data, result.data.imagen)
      } else {
        await addGoal(result.data, result.data.imagen)
      }
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
        <h2 className="sheet__title">
          {editing ? 'Editar objetivo' : 'Nuevo objetivo'}
        </h2>

        {wallFull && !editing && (
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

        {values.seguimiento !== 'compuesta' && (
          <div className="field">
            <label className="field__label" htmlFor="goal-tipo">
              Tipo de objetivo
            </label>
            <select
              id="goal-tipo"
              className="input"
              value={values.tipoId}
              onChange={(event) => cambiarTipo(event.target.value)}
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
        )}

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
          {editing && !file && (
            <p className="field__hint">Se conserva la imagen actual.</p>
          )}
          {errors.imagen && <p className="field__error">{errors.imagen}</p>}
        </div>

        {values.seguimiento !== 'paginas' && (
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
                onChange={() => setSeguimiento('percent')}
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
                onChange={() => setSeguimiento('streak')}
              />
              <span className="opt__title">Racha de días</span>
              <span className="opt__hint">Sumas un día cuando lo cumples</span>
            </label>
            <label
              className={
                values.seguimiento === 'compuesta'
                  ? 'opt is-active'
                  : padreActual
                    ? 'opt is-blocked'
                    : 'opt'
              }
            >
              <input
                type="radio"
                name="seguimiento"
                value="compuesta"
                checked={values.seguimiento === 'compuesta'}
                disabled={Boolean(padreActual)}
                onChange={() => update('seguimiento', 'compuesta')}
              />
              <span className="opt__title">Compuesta</span>
              <span className="opt__hint">
                {padreActual
                  ? `Ya es parte de ${padreActual.nombre}`
                  : 'Se marca sola si todas sus partes avanzan hoy'}
              </span>
            </label>
          </div>
          {errors.seguimiento && (
            <p className="field__error">{errors.seguimiento}</p>
          )}
        </fieldset>
        )}

        {values.seguimiento === 'paginas' && (
          <fieldset className="field">
            <legend>Seguimiento</legend>
            <p className="field__hint">Por páginas: lo pide el tipo del objetivo.</p>
            <label className="field__label" htmlFor="goal-paginas">
              Páginas del libro
            </label>
            <input
              id="goal-paginas"
              className="input"
              type="number"
              inputMode="numeric"
              min="1"
              max="10000"
              value={values.totalPaginas}
              onChange={(event) => update('totalPaginas', event.target.value)}
              aria-invalid={Boolean(errors.totalPaginas)}
              aria-describedby={errors.totalPaginas ? 'goal-paginas-error' : undefined}
            />
            {errors.totalPaginas && (
              <p className="field__error" id="goal-paginas-error">
                {errors.totalPaginas}
              </p>
            )}
            <p className="field__hint">
              El avance se marca en el muro: páginas leídas de{' '}
              {values.totalPaginas || PAGINAS_POR_DEFECTO}.
            </p>
          </fieldset>
        )}

        {values.seguimiento === 'compuesta' && (
          <fieldset className="field">
            <legend>Partes de la compuesta</legend>
            {candidatos.length === 0 ? (
              <p className="field__hint">
                Crea primero objetivos simples (porcentaje o racha) para poder componer.
              </p>
            ) : (
              <div className="pick">
                {candidatos.map((candidato) => {
                  const ajeno = usadoPor(candidato)
                  const checked = values.componentes.includes(candidato.id)
                  const bloqueado =
                    Boolean(ajeno) ||
                    (!checked && values.componentes.length >= MAX_FOCUS)
                  return (
                    <label
                      key={candidato.id}
                      className={bloqueado ? 'pick__row is-blocked' : 'pick__row'}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={bloqueado}
                        onChange={() => toggleParte(candidato.id)}
                      />
                      <span className="pick__name">{candidato.nombre}</span>
                      <span className="pick__meta">{estadoDe(candidato)}</span>
                      {ajeno && <span className="pick__hint">dentro de {ajeno.nombre}</span>}
                    </label>
                  )
                })}
              </div>
            )}
            {errors.componentes && (
              <p className="field__error" id="goal-componentes-error">
                {errors.componentes}
              </p>
            )}
          </fieldset>
        )}

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
