import { useStore } from '../lib/storeContext.js'
import { markedToday, streakOf } from '../lib/dates.js'
import { esAvanceHoy, estadoCompuesta } from '../lib/composite.js'

function GoalStatus({ goal }) {
  const { goals } = useStore()

  const streak = streakOf(goal.marcas)
  const marcado = markedToday(goal.marcas)
  const { partes, total, cumplidas } = estadoCompuesta(goal, goals)
  const unit = streak === 1 ? 'día' : 'días'

  return (
    <>
      <div className="goal__track">
        <span
          className={
            marcado ? 'goal__value goal__value--done' : 'goal__value goal__value--pending'
          }
        >
          {marcado
            ? `Listo · ${streak} ${unit}`
            : `Falta ${total - cumplidas} de ${total} · ${streak} ${unit}`}
        </span>
      </div>

      <div className="goal__chips">
        {partes.map((parte) =>
          parte ? (
            <span
              key={parte.id}
              className={esAvanceHoy(parte) ? 'goal__chip is-done' : 'goal__chip'}
            >
              {parte.nombre}
            </span>
          ) : null,
        )}
      </div>
    </>
  )
}

export default GoalStatus
