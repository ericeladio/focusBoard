import { useStore } from '../lib/storeContext.js'

// La única salida de un objetivo local: lo pasa a la cuenta, se sella con una
// fecha nueva y el outbox lo sube en la siguiente ronda (con su foto, si la
// tiene). Si ahora mismo no hay sesión, queda en cola hasta entrar.
function SubirCuenta({ goal }) {
  const { subirACuenta } = useStore()

  if (!goal.local) return null

  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={() => subirACuenta(goal.id)}
      title="Lo pasa a la cuenta: a partir de ahí se sincroniza con el passcode"
    >
      Subir a la cuenta
    </button>
  )
}

export default SubirCuenta
