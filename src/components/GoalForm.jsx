import { useEffect, useMemo, useRef, useState } from 'react'
import {
  goalSchema,
  goalUpdateSchema,
  issuesToFieldErrors,
  MAX_FOCUS,
} from '../lib/schemas.js'
import { useStore } from '../lib/storeContext.js'
import { markedToday, streakOf } from '../lib/dates.js'
import { esTipoCompuesto, modoPorTipo, padreDe } from '../lib/composite.js'
import { PAGINAS_POR_DEFECTO, etiquetaDe } from '../lib/lectura.js'

const EMPTY = {
  nombre: '',
  tipoId: '',
  seguimiento: 'percent',
  totalPaginas: PAGINAS_POR_DEFECTO,
  metaDias: '',
  metaModo: 'libre',
  componentes: [],
}

function GoalForm({ open, onClose, onManageTypes, editing = null }) {
  const { types, goals, addGoal, updateGoal, focusCount, wallFull } = useStore()
  const dialogRef = useRef(null)
  const [values, setValues] = useState(() =>
    editing
      ? {
          nombre: editing.nombre,
          tipoId: editing.tipoId,
          seguimiento: modoPorTipo(editing.seguimiento, editing.tipoId, types),
          totalPaginas: editing.totalPaginas ?? PAGINAS_POR_DEFECTO,
          metaDias: editing.metaDias ? String(editing.metaDias) : '',
          metaModo: editing.metaDias ? 'dias' : 'libre',
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
    if (candidato.finalizadoEn) return 'terminado'
    if (candidato.seguimiento === 'percent') return `${candidato.valor}%`
    if (candidato.seguimiento === 'paginas') return etiquetaDe(candidato)
    return markedToday(candidato.marcas)
      ? 'avance hoy'
      : `${streakOf(candidato.marcas)} días`
  }

  // El tipo manda el modo: al cambiar de tipo se recalcula en el momento,
  // no en un efecto (evita renders en cascada y el modo queda consistente).
  function cambiarTipo(nextTipoId) {
    setValues((current) => ({
      ...current,
      tipoId: nextTipoId,
      seguimiento: modoPorTipo(current.seguimiento, nextTipoId, types),
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
    // `libre` = sin meta de días: el campo viaja como null para poder
    // vaciar una meta que ya tenía puesta.
    const metaDias = values.metaModo === 'libre' ? null : values.metaDias
    const result = schema.safeParse({ ...values, metaDias, imagen: file })
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

        {/* El tipo `Compuesto` no despliega seguimiento: ya es compuesta por
            definición y aquí solo se eligen sus partes. */}
        {!esTipoCompuesto(values.tipoId, types) && values.seguimiento !== 'paginas' && (
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

          {/* Meta de días de la racha: con tope o indefinida. */}
          {values.seguimiento === 'streak' && (
            <div className="field field--meta">
              <span className="field__label">Meta de días</span>
              <div className="option-cards">
                <label
                  className={values.metaModo === 'dias' ? 'opt is-active' : 'opt'}
                >
                  <input
                    type="radio"
                    name="metaModo"
                    value="dias"
                    checked={values.metaModo === 'dias'}
                    onChange={() => update('metaModo', 'dias')}
                  />
                  <span className="opt__title">Llegar a N días</span>
                  <span className="opt__hint">Terminado se enciende al llegar</span>
                </label>
                <label
                  className={values.metaModo === 'libre' ? 'opt is-active' : 'opt'}
                >
                  <input
                    type="radio"
                    name="metaModo"
                    value="libre"
                    checked={values.metaModo === 'libre'}
                    onChange={() => update('metaModo', 'libre')}
                  />
                  <span className="opt__title">Indefinido</span>
                  <span className="opt__hint">Sin tope: no termina sola</span>
                </label>
              </div>
              {values.metaModo === 'dias' && (
                <>
                  <label className="field__label" htmlFor="goal-meta-dias">
                    Días de la meta
                  </label>
                  <input
                    id="goal-meta-dias"
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="3650"
                    value={values.metaDias}
                    onChange={(event) => update('metaDias', event.target.value)}
                    aria-invalid={Boolean(errors.metaDias)}
                    aria-describedby={
                      errors.metaDias ? 'goal-meta-dias-error' : undefined
                    }
                  />
                  {errors.metaDias && (
                    <p className="field__error" id="goal-meta-dias-error">
                      {errors.metaDias}
                    </p>
                  )}
                </>
              )}
              <p className="field__hint">
                En las rachas Terminado siempre está: con meta se enciende al
                llegar a los días.
              </p>
            </div>
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
