import { useStore } from '../lib/storeContext.js'
import { inactiveDays, markedToday, streakOf } from '../lib/dates.js'
import { etiquetaDe, totalPaginasDe } from '../lib/lectura.js'

function GoalTrack({ goal }) {
  const { setPercent, setPaginas, markToday, unmarkToday } = useStore()

  const isMarked = markedToday(goal.marcas)
  const streak = streakOf(goal.marcas)

  if (goal.seguimiento === 'paginas') {
    // El tope es el total del libro, no un 100: el avance lo pinta el front.
    const total = totalPaginasDe(goal)
    return (
      <div className="goal__track">
        <input
          type="range"
          min="0"
          max={total}
          step="1"
          value={Math.min(Number(goal.valor) || 0, total)}
          onChange={(event) => setPaginas(goal.id, event.target.value)}
          aria-label={`Páginas leídas de ${goal.nombre}`}
        />
        <span className="goal__value">{etiquetaDe(goal)}</span>
        {inactiveDays(goal) >= 3 && (
          <span className="goal__value goal__value--alert">
            {inactiveDays(goal)} días sin avance
          </span>
        )}
      </div>
    )
  }

  if (goal.seguimiento === 'streak') {
    return (
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
    )
  }

  return (
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
  )
}

export default GoalTrack
