import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/storeContext.js'
import GoalRow from '../components/GoalRow.jsx'
import GoalForm from '../components/GoalForm.jsx'
import GoalTypeForm from '../components/GoalTypeForm.jsx'
import SyncBadge from '../components/SyncBadge.jsx'
import Pager from '../components/Pager.jsx'
import { MAX_FOCUS } from '../lib/schemas.js'
import { POR_PAGINA } from '../lib/pager.js'
import { filtraPorNombre } from '../lib/texto.js'
import '../VisionBoard.css'
import '../components/Goals.css'

function Pool() {
  const { goals, types } = useStore()
  const [filter, setFilter] = useState('all')
  const [busqueda, setBusqueda] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pagina, setPagina] = useState(1)
  const listaRef = useRef(null)

  const delTipo = goals.filter(
    (goal) => !goal.finalizadoEn && (filter === 'all' || goal.tipoId === filter),
  )
  // Mismo buscador que el picker de partes: sin acentos ni mayúsculas, para que
  // "TESIS" o "dia" encuentren "Tesis al 100" y "Correr cada día".
  const shown = filtraPorNombre(delTipo, busqueda).sort((a, b) => b.createdAt - a.createdAt)
  const enMuro = goals.filter((goal) => goal.enMuro).length

  // El filtro, la búsqueda y los borrados encogen la lista: la página pedida se
  // recorta al rango real para no acabar en una página vacía.
  const totalPaginas = Math.max(1, Math.ceil(shown.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const desde = (paginaActual - 1) * POR_PAGINA
  const visibles = shown.slice(desde, desde + POR_PAGINA)

  function cambiarFiltro(event) {
    setFilter(event.target.value)
    setPagina(1)
  }

  function cambiarBusqueda(event) {
    setBusqueda(event.target.value)
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
          <div className="pool__filtros">
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

            <input
              className="input pool__search"
              type="search"
              placeholder="Buscar por nombre…"
              aria-label="Buscar objetivo por nombre"
              value={busqueda}
              onChange={cambiarBusqueda}
            />
          </div>

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
              : busqueda.trim()
                ? `Nada con "${busqueda.trim()}".`
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

            <Pager
              desde={desde}
              mostrados={visibles.length}
              total={shown.length}
              totalPaginas={totalPaginas}
              pagina={paginaActual}
              onIrA={irA}
              etiqueta="Páginas del pool"
            />
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
