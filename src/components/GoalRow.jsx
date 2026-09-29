import { useStore } from '../lib/storeContext.js'
import { inactiveDays, markedToday, streakOf } from '../lib/dates.js'
import GoalDone from './GoalDone.jsx'
import LocalChip from './LocalChip.jsx'
import SubirCuenta from './SubirCuenta.jsx'
import { padreDe } from '../lib/composite.js'
import { etiquetaDe, pctDe } from '../lib/lectura.js'

function GoalRow({ goal, onEdit }) {
  const { goals, types, placeInWall, removeFromWall, removeGoal, wallFull } = useStore()

  const type = types.find((item) => item.id === goal.tipoId)
  const streak = streakOf(goal.marcas)
  const padre = padreDe(goal.id, goals)
  const marcado = markedToday(goal.marcas)

  function confirmRemove() {
    if (window.confirm(`¿Borrar "${goal.nombre}"?`)) removeGoal(goal.id)
  }

  return (
    <li className="row" onDoubleClick={() => onEdit(goal)}>
      <img className="row__thumb" src={goal.imagen} alt="" />

      <div className="row__info">
        <span className="goal__type row__type">
          {type ? type.nombre : 'Sin tipo'}
          {goal.local && <LocalChip />}
        </span>
        <span className="row__name">{goal.nombre}</span>
        {padre && <span className="row__parent">dentro de {padre.nombre}</span>}
      </div>

      <div className="row__track">
        {goal.seguimiento === 'percent' || goal.seguimiento === 'paginas' ? (
          <>
            <span className="row__bar" aria-hidden="true">
              <span className="row__fill" style={{ width: `${pctDe(goal)}%` }} />
            </span>
            <span className="goal__value">{etiquetaDe(goal)}</span>
            {inactiveDays(goal) >= 3 && (
              <span className="goal__value goal__value--alert">
                {inactiveDays(goal)} días sin avance
              </span>
            )}
          </>
        ) : (
          <span
            className={
              goal.seguimiento === 'compuesta' && marcado
                ? 'goal__value goal__value--done'
                : 'goal__value'
            }
          >
            {goal.seguimiento === 'compuesta' && marcado
              ? `Listo hoy · ${streak} ${streak === 1 ? 'día' : 'días'}`
              : `${streak} ${streak === 1 ? 'día' : 'días'}`}
          </span>
        )}
      </div>

      <div className="row__actions">
        <button type="button" className="btn btn--ghost" onClick={() => onEdit(goal)}>
          Editar
        </button>
        <GoalDone goal={goal} />
        {padre ? (
          <button
            type="button"
            className="btn btn--ghost"
            disabled
            title={`Está dentro de ${padre.nombre}`}
          >
            Poner en el muro
          </button>
        ) : goal.enMuro ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => removeFromWall(goal.id)}
          >
            Quitar del muro
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => placeInWall(goal.id)}
            disabled={wallFull}
            title={wallFull ? 'El muro ya tiene 7 objetivos' : undefined}
          >
            Poner en el muro
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={confirmRemove}>
          Borrar
        </button>
        <SubirCuenta goal={goal} />
      </div>
    </li>
  )
}

export default GoalRow
