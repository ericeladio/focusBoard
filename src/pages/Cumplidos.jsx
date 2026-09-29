import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/storeContext.js'
import { todayISO } from '../lib/dates.js'
import Foto from '../components/Foto.jsx'
import SyncBadge from '../components/SyncBadge.jsx'
import LocalChip from '../components/LocalChip.jsx'
import SubirCuenta from '../components/SubirCuenta.jsx'
import Pager from '../components/Pager.jsx'
import {
  etiquetaRacha,
  fechaCorta,
  groupCumplidos,
  paginaCumplidos,
} from '../lib/cumplidos.js'
import { etiquetaDe } from '../lib/lectura.js'
import '../VisionBoard.css'
import '../components/Goals.css'

// El logro que se enseña junto a cada cumplido: lo que valía el objetivo
// cuando se cerró.
function logroDe(goal) {
  if (goal.seguimiento === 'streak') return etiquetaRacha(goal)
  if (goal.seguimiento === 'compuesta') return 'Compuesta'
  return etiquetaDe(goal)
}

// Cumplidos por año y por mes: los objetivos terminados, agrupados de lo más
// reciente a lo más antiguo, de 10 en 10 como el pool. "Reabrir" devuelve el
// objetivo al pool.
function Cumplidos() {
  const { goals, types, reabrirGoal, removeGoal } = useStore()
  const [pagina, setPagina] = useState(1)
  const listaRef = useRef(null)

  const anios = groupCumplidos(goals)
  const total = anios.reduce((suma, bloque) => suma + bloque.total, 0)
  const esteAnio = anios.find((bloque) => bloque.anio === Number(todayISO().slice(0, 4)))

  // La ventana recortada: los bloques de esta página y el rango del pager. Un
  // Reabrir/Borrar encorta la lista, así que la página pedida se recorta sola.
  const { bloques, totalPaginas, pagina: paginaActual, desde, visibles } =
    paginaCumplidos(anios, pagina)

  function irA(p) {
    setPagina(p)
    // La lista es más alta que la pantalla: sin este salto verías a medias la
    // página nueva desde donde estabas.
    requestAnimationFrame(() => {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      listaRef.current?.scrollIntoView({
        behavior: suave ? 'smooth' : 'auto',
        block: 'start',
      })
    })
  }

  function confirmRemove(goal) {
    if (window.confirm(`¿Borrar "${goal.nombre}"?`)) removeGoal(goal.id)
  }

  return (
    <main className="wall">
      <div className="wall__texture" aria-hidden="true" />
      <div className="wall__vignette" aria-hidden="true" />

      <header className="wall__head">
        <h1 className="wall__title">Cumplidos</h1>
        <p className="wall__sub">
          {total === 0
            ? 'Nada terminado todavía'
            : `${total} ${total === 1 ? 'cumplido' : 'cumplidos'} · ${
                esteAnio?.total ?? 0
              } este año`}
        </p>
        <nav className="wall__nav">
          <Link to="/" className="tape-link">
            Volver al muro
          </Link>
          <Link to="/pool" className="tape-link">
            Pool de objetivos
          </Link>
          <SyncBadge />
        </nav>
      </header>

      <div className="done" ref={listaRef}>
        {total === 0 ? (
          <p className="done__empty">
            Todavía no hay nada cumplido. Cuando termines un objetivo —al 100%
            o llegando a los días de su racha— aparecerá aquí.
          </p>
        ) : (
          bloques.map((bloque) => (
            <section className="done__anio" key={bloque.anio}>
              <h2 className="done__label">{bloque.anio}</h2>
              {bloque.meses.map((grupo) => (
                <div className="done__mes" key={grupo.key}>
                  <h3 className="done__mes-titulo">
                    {grupo.label}{' '}
                    {/* El mes partido por la página dice cuántas filas hay
                        aquí y cuántas en total: "Septiembre (4 de 12)". */}
                    <span className="done__cuenta">
                      ({grupo.total === grupo.mostrados
                        ? grupo.total
                        : `${grupo.mostrados} de ${grupo.total}`})
                    </span>
                  </h3>
                  <ul className="done__lista">
                    {grupo.goals.map((goal) => (
                      <li className="row" key={goal.id}>
                        <Foto className="row__thumb" src={goal.imagen} alt="" />
                        <div className="row__info">
                          <span className="goal__type row__type">
                            {types.find((item) => item.id === goal.tipoId)
                              ?.nombre ?? 'Sin tipo'}
                            {goal.local && <LocalChip />}
                          </span>
                          <span className="row__name">{goal.nombre}</span>
                          <span className="done__fecha">
                            Terminado el {fechaCorta(goal.finalizadoEn)}
                          </span>
                        </div>
                        <div className="row__track">
                          <span className="goal__value goal__value--done">
                            {logroDe(goal)}
                          </span>
                        </div>
                        <div className="row__actions">
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => reabrirGoal(goal.id)}
                            title="Vuelve al pool"
                          >
                            Reabrir
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => confirmRemove(goal)}
                          >
                            Borrar
                          </button>
                          <SubirCuenta goal={goal} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))
        )}

        <Pager
          desde={desde}
          mostrados={visibles.length}
          total={total}
          totalPaginas={totalPaginas}
          pagina={paginaActual}
          onIrA={irA}
          etiqueta="Páginas de cumplidos"
        />
      </div>
    </main>
  )
}

export default Cumplidos
