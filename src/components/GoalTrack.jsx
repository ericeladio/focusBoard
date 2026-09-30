import { useState } from 'react'
import { useStore } from '../lib/storeContext.js'
import { inactiveDays, markedToday } from '../lib/dates.js'
import { etiquetaRacha, fechaCorta, metaAlcanzada } from '../lib/cumplidos.js'
import { etiquetaDe, pctDe, totalPaginasDe } from '../lib/lectura.js'

// El muro no guarda nada: ahí el avance solo se mira. La barra es fija y su
// valor se lee con la etiqueta de al lado, así que el relleno es decorativo.
function BarraFija({ pct, etiqueta, alerta }) {
  return (
    <div className="goal__track">
      <span className="goal__bar" aria-hidden="true">
        <span className="goal__bar-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="goal__value">{etiqueta}</span>
      {alerta && <span className="goal__value goal__value--alert">{alerta}</span>}
    </div>
  )
}

// `externo` = el avance lo mueve y lo guarda el `Guardar` de la modal: el
// slider mueve un borrador y solo avisa del pendiente con
// `onPendiente(valor | null)`. Sin `externo` (la tarjeta del muro) no hay
// slider sino una barra de lectura: el único `Guardar` vive en la modal.
function GoalTrack({ goal, externo = false, onPendiente }) {
  const { markToday, unmarkToday } = useStore()

  function cambiar(valor, previo) {
    setBorrador(valor)
    if (externo) onPendiente?.(valor === previo ? null : valor)
  }

  // El borrador solo se inicia con el valor guardado: si el objetivo cambia
  // por fuera (sync, cambio de modo) sigue mandando lo guardado y al cerrar
  // la modal lo que no se guardó no reaparece como si estuviera guardado.
  const guardado = Number(goal.valor) || 0
  const [borrador, setBorrador] = useState(guardado)

  const isMarked = markedToday(goal.marcas)
  const inactivo = inactiveDays(goal)
  const alerta = inactivo >= 3 ? `${inactivo} días sin avance` : null

  // Terminado: ya no admite avance, solo queda la fecha en la que se cerró.
  if (goal.finalizadoEn) {
    return (
      <div className="goal__track">
        <span className="goal__value goal__value--done">
          Terminado el {fechaCorta(goal.finalizadoEn)}
        </span>
      </div>
    )
  }

  if (goal.seguimiento === 'paginas') {
    // El tope es el total del libro, no un 100: el avance lo pinta el front.
    const total = totalPaginasDe(goal)
    const avance = Math.max(0, Math.min(borrador, total))
    const previo = Math.max(0, Math.min(guardado, total))
    if (!externo) {
      return <BarraFija pct={pctDe(goal)} etiqueta={etiquetaDe(goal)} alerta={alerta} />
    }
    return (
      <div className="goal__track">
        <input
          type="range"
          min="0"
          max={total}
          step="1"
          value={avance}
          onChange={(event) => cambiar(Number(event.target.value), previo)}
          aria-label={`Páginas leídas de ${goal.nombre}`}
        />
        <span className="goal__value">{etiquetaDe(goal, avance)}</span>
        {alerta && <span className="goal__value goal__value--alert">{alerta}</span>}
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
        <span className="goal__value">{etiquetaRacha(goal)}</span>
        {metaAlcanzada(goal) && (
          <span className="goal__value goal__value--meta goal__value--done">
            Meta de días cumplida
          </span>
        )}
      </div>
    )
  }

  const avance = Math.max(0, Math.min(100, borrador))
  const previo = Math.max(0, Math.min(100, guardado))
  if (!externo) {
    return <BarraFija pct={pctDe(goal)} etiqueta={etiquetaDe(goal)} alerta={alerta} />
  }
  return (
    <div className="goal__track">
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={avance}
        onChange={(event) => cambiar(Number(event.target.value), previo)}
        aria-label={`Avance de ${goal.nombre}`}
      />
      <span className="goal__value">{etiquetaDe(goal, avance)}</span>
      {alerta && <span className="goal__value goal__value--alert">{alerta}</span>}
    </div>
  )
}

export default GoalTrack
