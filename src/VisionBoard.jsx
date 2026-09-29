import { useState } from 'react'
import { Link } from 'react-router-dom'
import './VisionBoard.css'
import './components/Goals.css'
import { useStore } from './lib/storeContext.js'
import { esHijoDe } from './lib/composite.js'
import { MAX_FOCUS } from './lib/schemas.js'
import GoalCard from './components/GoalCard.jsx'
import GoalForm from './components/GoalForm.jsx'
import GoalTypeForm from './components/GoalTypeForm.jsx'
import SyncBadge from './components/SyncBadge.jsx'

function VisionBoard() {
  const { goals, wallFull, note, setNote } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  const enMuro = goals.filter((goal) => goal.enMuro && !esHijoDe(goal.id, goals))
  const enPool = goals.filter((goal) => !goal.enMuro && !esHijoDe(goal.id, goals))
  const titulos = goals.map((goal) => goal.nombre)
  const nota = note ?? titulos.join('\n')

  function startNoteEdit() {
    setNoteDraft(nota)
    setNoteEditing(true)
  }

  function saveNote() {
    setNote(noteDraft)
    setNoteEditing(false)
  }

  function cancelNoteEdit() {
    setNoteEditing(false)
  }

  return (
    <main className="wall">
      <div className="wall__texture" aria-hidden="true" />
      <div className="wall__vignette" aria-hidden="true" />

      <header className="wall__head">
        <h1 className="wall__title">Mi tablero de visión</h1>
        <p className="wall__sub">
          {/* El muro topa en MAX_FOCUS: lo que queda vive en el pool, y
              decirlo aquí evita que parezcan metas perdidas. */}
          <Link to="/pool" className="wall__sub-link">
            {enMuro.length === 0
              ? 'Siete cosas. Nada más.'
              : `${enMuro.length} de ${MAX_FOCUS} en el muro`}
            {enPool.length > 0 ? ` · ${enPool.length} en el pool` : ''}
          </Link>
        </p>
        <nav className="wall__nav">
          <Link to="/pool" className="tape-link">
            Pool de objetivos
          </Link>
          <SyncBadge />
        </nav>
      </header>

      <div className="wall__grid">
        {enMuro.map((goal, index) => (
          <GoalCard key={goal.id} goal={goal} index={index} variant="wall" />
        ))}

        <article
          className="note note--lined frame--clip"
          style={{ '--tilt': '-2.5deg' }}
          title="Doble clic para editar"
        >
          <h2>TODO</h2>
          {noteEditing ? (
            <textarea
              className="note__edit"
              value={noteDraft}
              rows={Math.max(3, Math.min(8, noteDraft.split('\n').length))}
              autoFocus
              onChange={(event) => setNoteDraft(event.target.value)}
              onBlur={saveNote}
              onKeyDown={(event) => {
                if (event.key === 'Escape') cancelNoteEdit()
              }}
            />
          ) : (
            <ul
              className="note__list"
              onDoubleClick={startNoteEdit}
            >
              {nota.length === 0 ? (
                <li>Aún no hay objetivos</li>
              ) : (
                nota.split('\n').map((linea, index) => (
                  <li key={`${index}-${linea}`}>{linea}</li>
                ))
              )}
            </ul>
          )}
        </article>

        <button
          type="button"
          className="frame frame--add"
          style={{ '--tilt': '-1.5deg' }}
          onClick={() => setAddOpen(true)}
          disabled={wallFull}
          aria-label={wallFull ? 'Muro lleno' : 'Añadir objetivo'}
        >
          <span className="frame__photo frame__photo--add">
            <span className="plus" aria-hidden="true" />
          </span>
          <span className="frame__caption">
            {wallFull ? 'Muro lleno' : 'Añadir objetivo'}
          </span>
        </button>
      </div>

      <GoalForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onManageTypes={() => setTypesOpen(true)}
      />
      <GoalTypeForm open={typesOpen} onClose={() => setTypesOpen(false)} />
    </main>
  )
}

export default VisionBoard
