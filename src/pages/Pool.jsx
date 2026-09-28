import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/storeContext.js'
import GoalRow from '../components/GoalRow.jsx'
import GoalForm from '../components/GoalForm.jsx'
import GoalTypeForm from '../components/GoalTypeForm.jsx'
import SyncBadge from '../components/SyncBadge.jsx'
import { MAX_FOCUS } from '../lib/schemas.js'
import '../VisionBoard.css'
import '../components/Goals.css'

function Pool() {
  const { goals, types } = useStore()
  const [filter, setFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const shown = goals
    .filter((goal) => filter === 'all' || goal.tipoId === filter)
    .sort((a, b) => b.createdAt - a.createdAt)
  const enMuro = goals.filter((goal) => goal.enMuro).length

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
          <SyncBadge />
        </nav>
      </header>

      <div className="pool">
        <div className="pool__bar">
          <select
            className="pool__filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
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
            <ul className="pool__list">
              {shown.map((goal) => (
                <GoalRow key={goal.id} goal={goal} onEdit={openEdit} />
              ))}
            </ul>
            <p className="pool__hint">Doble clic en una fila para editarla.</p>
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
