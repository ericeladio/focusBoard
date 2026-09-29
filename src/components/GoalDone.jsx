import { useStore } from '../lib/storeContext.js'
import {
  etiquetaRacha,
  metaAlcanzada,
  metaDiasDe,
  puedeFinalizar,
} from '../lib/cumplidos.js'

// La única salida de un objetivo: "Terminado" lo archiva (hoy) y lo pasa a
// /cumplidos. En rachas siempre está; con meta de días se enciende al llegar,
// pero nunca archiva solo: el gesto es siempre del usuario.
function GoalDone({ goal }) {
  const { finalizarGoal } = useStore()

  if (!puedeFinalizar(goal)) return null

  const meta = metaDiasDe(goal)
  const conMeta = goal.seguimiento === 'streak' && meta !== null
  const listo = !conMeta || metaAlcanzada(goal)

  return (
    <button
      type="button"
      className={listo ? 'btn btn--ink' : 'btn btn--ghost'}
      onClick={() => finalizarGoal(goal.id)}
      title={
        listo
          ? 'Pasa este objetivo a Cumplidos'
          : `Aún no llegas a la meta: ${etiquetaRacha(goal)}`
      }
    >
      Terminado
    </button>
  )
}

export default GoalDone
