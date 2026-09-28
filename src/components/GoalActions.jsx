import { useStore } from '../lib/storeContext.js'
import { padreDe } from '../lib/composite.js'

function GoalActions({ goal, variant = 'wall' }) {
  const { goals, placeInWall, removeFromWall, removeGoal, wallFull } = useStore()

  const padre = padreDe(goal.id, goals)

  function confirmRemove() {
    if (window.confirm(`¿Borrar "${goal.nombre}"?`)) removeGoal(goal.id)
  }

  return (
    <div className="goal__actions">
      {padre ? (
        <button
          type="button"
          className="btn btn--ghost"
          disabled
          title={`Está dentro de ${padre.nombre}`}
        >
          Poner en el muro
        </button>
      ) : variant === 'wall' || goal.enMuro ? (
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
          disabled={wallFull || Boolean(padre)}
          title={
            padre
              ? `Está dentro de ${padre.nombre}`
              : wallFull
                ? 'El muro ya tiene 7 objetivos'
                : undefined
          }
        >
          Poner en el muro
        </button>
      )}
      <button type="button" className="btn btn--ghost" onClick={confirmRemove}>
        Borrar
      </button>
    </div>
  )
}

export default GoalActions
