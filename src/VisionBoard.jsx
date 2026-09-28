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

function VisionBoard() {
  const { goals, wallFull } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)

  const enMuro = goals.filter((goal) => goal.enMuro && !esHijoDe(goal.id, goals))
  const titulos = goals.map((goal) => goal.nombre)

  return (
    <main className="wall">
      <div className="wall__texture" aria-hidden="true" />
      <div className="wall__vignette" aria-hidden="true" />

      <header className="wall__head">
        <h1 className="wall__title">Mi tablero de visión</h1>
        <p className="wall__sub">
          {enMuro.length === 0
            ? 'Siete cosas. Nada más.'
            : `${enMuro.length} de ${MAX_FOCUS} en el muro`}
        </p>
        <nav className="wall__nav">
          <Link to="/pool" className="tape-link">
            Pool de objetivos
          </Link>
        </nav>
      </header>

      <div className="wall__grid">
        {enMuro.map((goal, index) => (
          <GoalCard key={goal.id} goal={goal} index={index} variant="wall" />
        ))}

        <article className="note note--lined frame--clip" style={{ '--tilt': '-2.5deg' }}>
          <h2>Este año</h2>
          <ul className="note__list">
            {titulos.length === 0 ? (
              <li>Aún no hay objetivos</li>
            ) : (
              titulos.map((nombre) => <li key={nombre}>{nombre}</li>)
            )}
          </ul>
        </article>

        <article className="note note--sticky" style={{ '--tilt': '5deg' }}>
          <p>Menos scroll, más creación</p>
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
