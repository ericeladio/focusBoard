import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/storeContext.js'
import GoalRow from '../components/GoalRow.jsx'
import GoalForm from '../components/GoalForm.jsx'
import GoalTypeForm from '../components/GoalTypeForm.jsx'
import SyncBadge from '../components/SyncBadge.jsx'
import { MAX_FOCUS } from '../lib/schemas.js'
import { POR_PAGINA, paginasVisibles } from '../lib/pager.js'
import '../VisionBoard.css'
import '../components/Goals.css'

function Pool() {
  const { goals, types } = useStore()
  const [filter, setFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pagina, setPagina] = useState(1)
  const listaRef = useRef(null)

  const shown = goals
    .filter(
      (goal) => !goal.finalizadoEn && (filter === 'all' || goal.tipoId === filter),
    )
    .sort((a, b) => b.createdAt - a.createdAt)
  const enMuro = goals.filter((goal) => goal.enMuro).length

  // El filtro y los borrados encogen la lista: la página pedida se recorta al
  // rango real para no acabar en una página vacía.
  const totalPaginas = Math.max(1, Math.ceil(shown.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const desde = (paginaActual - 1) * POR_PAGINA
  const visibles = shown.slice(desde, desde + POR_PAGINA)

  function cambiarFiltro(event) {
    setFilter(event.target.value)
    setPagina(1)
  }

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

  function openNew() {
    setEditing(null)
    setAddOpen(true)
  }

  function openEdit(goal) {
    setEditing(goal)
    setAddOpen(true)
  }

  function closeForm() {
    setAddOpen(false)
    setEditing(null)
  }

  return (
    <main className="wall">
      <div className="wall__texture" aria-hidden="true" />
      <div className="wall__vignette" aria-hidden="true" />

      <header className="wall__head">
        <h1 className="wall__title">Pool de objetivos</h1>
        <p className="wall__sub">
          {goals.length} en total · {enMuro} de {MAX_FOCUS} en el muro
        </p>
        <nav className="wall__nav">
          <Link to="/" className="tape-link">
            Volver al muro
          </Link>
          <Link to="/cumplidos" className="tape-link">
            Cumplidos
          </Link>
          <SyncBadge />
        </nav>
      </header>

      <div className="pool">
        <div className="pool__bar">
          <select
            className="pool__filter"
            value={filter}
            onChange={cambiarFiltro}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos los tipos</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.nombre}
              </option>
            ))}
          </select>

          <div className="pool__actions">
            <button type="button" className="btn" onClick={() => setTypesOpen(true)}>
              Tipos
            </button>
            <button type="button" className="btn btn--ink" onClick={openNew}>
              Nuevo objetivo
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="pool__empty">
            {goals.length === 0
              ? 'El pool está vacío: crea tu primer objetivo.'
              : 'Nada con ese tipo todavía.'}
          </p>
        ) : (
          <>
            <ul className="pool__list" ref={listaRef}>
              {visibles.map((goal) => (
                <GoalRow key={goal.id} goal={goal} onEdit={openEdit} />
              ))}
            </ul>
            <p className="pool__hint">Doble clic en una fila para editarla.</p>

            {totalPaginas > 1 && (
              <nav className="pool__pager" aria-label="Páginas del pool">
                <p className="pool__pager__count" aria-live="polite">
                  Mostrando {desde + 1}–{desde + visibles.length} de {shown.length}
                </p>
                <div className="pool__pager__nav">
                  <button
                    type="button"
                    className="btn"
                    disabled={paginaActual === 1}
                    onClick={() => irA(paginaActual - 1)}
                  >
                    ‹ Anterior
                  </button>

                  <ul className="pool__pages">
                    {paginasVisibles(paginaActual, totalPaginas).map((item, i) =>
                      typeof item === 'number' ? (
                        <li key={item}>
                          <button
                            type="button"
                            className={
                              item === paginaActual ? 'pool__page is-current' : 'pool__page'
                            }
                            aria-current={item === paginaActual ? 'page' : undefined}
                            onClick={() => irA(item)}
                          >
                            {item}
                          </button>
                        </li>
                      ) : (
                        <li key={`hueco-${i}`} className="pool__gap" aria-hidden="true">
                          …
                        </li>
                      ),
                    )}
                  </ul>

                  <button
                    type="button"
                    className="btn"
                    disabled={paginaActual === totalPaginas}
                    onClick={() => irA(paginaActual + 1)}
                  >
                    Siguiente ›
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>

      <GoalForm
        key={editing?.id ?? 'new'}
        open={addOpen}
        editing={editing}
        onClose={closeForm}
        onManageTypes={() => setTypesOpen(true)}
      />
      <GoalTypeForm open={typesOpen} onClose={() => setTypesOpen(false)} />
    </main>
  )
}

export default Pool
