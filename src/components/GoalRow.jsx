import { useStore } from '../lib/storeContext.js'
import { inactiveDays, streakOf } from '../lib/dates.js'

function GoalRow({ goal, onEdit }) {
  const { types, placeInWall, removeFromWall, removeGoal, wallFull } = useStore()

  const type = types.find((item) => item.id === goal.tipoId)
  const streak = streakOf(goal.marcas)

  function confirmRemove() {
    if (window.confirm(`¿Borrar "${goal.nombre}"?`)) removeGoal(goal.id)
  }

  return (
    <li className="row" onDoubleClick={() => onEdit(goal)}>
      <img className="row__thumb" src={goal.imagen} alt="" />

      <div className="row__info">
        <span className="goal__type row__type">
          {type ? type.nombre : 'Sin tipo'}
        </span>
        <span className="row__name">{goal.nombre}</span>
      </div>

      <div className="row__track">
        {goal.seguimiento === 'percent' ? (
          <>
            <span className="row__bar" aria-hidden="true">
              <span
                className="row__fill"
                style={{ width: `${goal.valor}%` }}
              />
            </span>
            <span className="goal__value">{goal.valor}%</span>
            {inactiveDays(goal) >= 3 && (
              <span className="goal__value goal__value--alert">
                {inactiveDays(goal)} días sin avance
              </span>
            )}
          </>
        ) : (
          <span className="goal__value">
            {streak} {streak === 1 ? 'día' : 'días'}
          </span>
        )}
      </div>

      <div className="row__actions">
        <button type="button" className="btn btn--ghost" onClick={() => onEdit(goal)}>
          Editar
        </button>
        {goal.enMuro ? (
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
      </div>
    </li>
  )
}

export default GoalRow
