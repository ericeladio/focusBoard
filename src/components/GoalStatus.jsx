import { useStore } from '../lib/storeContext.js'
import { markedToday, streakOf } from '../lib/dates.js'
import { esAvanceHoy, estadoCompuesta, partesVisibles } from '../lib/composite.js'

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
            : total === 0
              ? 'Sin partes'
              : `Falta ${total - cumplidas} de ${total} · ${streak} ${unit}`}
        </span>
      </div>

      <div className="goal__chips">
        {/* Solo las 3 primeras (las que faltan primero): el recuento de
            arriba sigue hablando de todas. */}
        {partesVisibles(partes).map((parte) => (
          <span
            key={parte.id}
            className={esAvanceHoy(parte) ? 'goal__chip is-done' : 'goal__chip'}
          >
            {parte.nombre}
          </span>
        ))}
      </div>
    </>
  )
}

export default GoalStatus
