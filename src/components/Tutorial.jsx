import { useEffect, useState } from 'react'
import { PASOS, marcarTutorial, tutorialHecho } from '../lib/tutorial.js'

// Altura de la tarjeta al clavarla sobre el elemento (para poder ponerla
// encima si abajo no cabe).
const ALTO = 236

function mismaCaja(prev, caja) {
  if (!prev) return false
  return (
    prev.top === caja.top &&
    prev.left === caja.left &&
    prev.width === caja.width &&
    prev.height === caja.height
  )
}

function Tutorial() {
  const [paso, setPaso] = useState(0)
  const [rect, setRect] = useState(null)
  const [abierto, setAbierto] = useState(() => !tutorialHecho())

  const actual = PASOS[Math.min(paso, PASOS.length - 1)]
  const ultimo = paso >= PASOS.length - 1

  const salir = () => {
    marcarTutorial()
    setAbierto(false)
  }
  const siguiente = () => (ultimo ? salir() : setPaso((n) => n + 1))
  const anterior = () => setPaso((n) => Math.max(0, n - 1))

  // La diana se mide en cada paso (y al girar la pantalla o hacer scroll,
  // que el resaltado y la tarjeta no se queden colgados de una posición
  // vieja mientras se hace scroll suave hasta el elemento). En useEffect,
  // no en layout: en SSR no hace falta medir nada, y la medición va en el
  // siguiente cuadro para no arrastrar renders dentro del effect.
  useEffect(() => {
    if (!abierto) return undefined
    const { diana } = actual
    const medir = () => {
      if (!diana) {
        setRect(null)
        return
      }
      const el = document.querySelector(diana)
      if (!el) {
        setRect(null)
        return
      }
      // Ojo con esparcir un DOMRect: sus propiedades no son enumerables.
      const bruto = el.getBoundingClientRect()
      const caja = {
        top: bruto.top,
        left: bruto.left,
        width: bruto.width,
        height: bruto.height,
      }
      setRect((prev) => (mismaCaja(prev, caja) ? prev : caja))
    }
    const cuadro = requestAnimationFrame(medir)
    if (diana) {
      document.querySelector(diana)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      cancelAnimationFrame(cuadro)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [abierto, actual])

  // Esc = saltar; flechas para moverse sin ratón.
  useEffect(() => {
    if (!abierto) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') salir()
      else if (event.key === 'ArrowRight') siguiente()
      else if (event.key === 'ArrowLeft') anterior()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!abierto) return null

  // Sin diana medida (pantalla de cierre, o un elemento que no está) la
  // tarjeta sale centrada y sin resaltado; SSR también por aquí.
  const estilo = rect
    ? {
        top: `${Math.max(
          12,
          rect.top + rect.height + 16 + ALTO > window.innerHeight
            ? Math.max(12, rect.top - ALTO)
            : rect.top + rect.height + 16,
        )}px`,
        left: `${Math.max(12, Math.min(rect.left, window.innerWidth - 360))}px`,
        bottom: 'auto',
        transform: 'none',
      }
    : undefined

  return (
    <>
      <div className={rect ? 'tut__tapa' : 'tut__tapa tut__tapa--lleno'} />
      {rect && (
        <div
          className="tut__resalte"
          aria-hidden="true"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      <section
        className="tut__tarjeta"
        style={estilo}
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial de la app"
      >
        <p className="tut__paso">
          {paso + 1} / {PASOS.length}
        </p>
        <h2 className="tut__titulo">{actual.titulo}</h2>
        <p className="tut__texto">{actual.texto}</p>
        <div className="tut__acciones">
          <button type="button" className="btn btn--ghost" onClick={salir}>
            Saltar
          </button>
          <span className="tut__derecha">
            {paso > 0 && (
              <button type="button" className="btn btn--ghost" onClick={anterior}>
                Atrás
              </button>
            )}
            <button type="button" className="btn btn--ink" onClick={siguiente}>
              {ultimo ? 'Entendido' : 'Siguiente'}
            </button>
          </span>
        </div>
      </section>
    </>
  )
}

export default Tutorial
