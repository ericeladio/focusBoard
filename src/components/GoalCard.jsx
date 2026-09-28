import { useStore } from '../lib/storeContext.js'
import { inactiveDays, markedToday, streakOf } from '../lib/dates.js'

const TILTS = ['-4deg', '3deg', '-2deg', '4.5deg', '-3.5deg', '2deg', '-5deg']

function GoalCard({ goal, index = 0, variant = 'wall' }) {
  const {
    types,
    setPercent,
    markToday,
    unmarkToday,
    placeInWall,
    removeFromWall,
    removeGoal,
    wallFull,
  } = useStore()

  const type = types.find((item) => item.id === goal.tipoId)
  const tilt = TILTS[index % TILTS.length]
  const pinClass = index % 2 === 0 ? 'frame--pin' : 'frame--tape'
  const isMarked = markedToday(goal.marcas)
  const streak = streakOf(goal.marcas)

  function confirmRemove() {
    if (window.confirm(`¿Borrar "${goal.nombre}"?`)) removeGoal(goal.id)
  }

  return (
    <figure
      className={`frame frame--goal ${pinClass}`}
      style={{ '--tilt': tilt }}
    >
      <div className="frame__photo">
        <img src={goal.imagen} alt={goal.nombre} />
      </div>

      <div className="goal__body">
        <span className="goal__type">{type ? type.nombre : 'Sin tipo'}</span>
        <figcaption className="goal__name">{goal.nombre}</figcaption>

        {goal.seguimiento === 'percent' ? (
          <div className="goal__track">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={goal.valor}
              onChange={(event) => setPercent(goal.id, event.target.value)}
              aria-label={`Avance de ${goal.nombre}`}
            />
            <span className="goal__value">{goal.valor}%</span>
            {inactiveDays(goal) >= 3 && (
              <span className="goal__value goal__value--alert">
                {inactiveDays(goal)} días sin avance
              </span>
            )}
          </div>
        ) : (
          <div className="goal__track">
            <button
              type="button"
              className={isMarked ? 'btn btn--ink is-active' : 'btn btn--ink'}
              onClick={() => (isMarked ? unmarkToday(goal.id) : markToday(goal.id))}
            >
              {isMarked ? 'Deshacer hoy' : 'Hoy'}
            </button>
            <span className="goal__value">
              {streak} {streak === 1 ? 'día' : 'días'}
            </span>
          </div>
        )}

        <div className="goal__actions">
          {variant === 'wall' ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => removeFromWall(goal.id)}
            >
              Quitar del muro
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
        </div>
      </div>
    </figure>
  )
}

export default GoalCard
