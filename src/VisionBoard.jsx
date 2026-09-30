import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './VisionBoard.css'
import './components/Goals.css'
import { useStore } from './lib/storeContext.js'
import { hasSynced } from './lib/sync.js'
import { esHijoDe } from './lib/composite.js'
import { ordenaIds, mueveA } from './lib/orden.js'
import { MAX_FOCUS } from './lib/schemas.js'
import GoalCard from './components/GoalCard.jsx'
import GoalForm from './components/GoalForm.jsx'
import GoalTypeForm from './components/GoalTypeForm.jsx'
import LocalChip from './components/LocalChip.jsx'
import SyncBadge from './components/SyncBadge.jsx'
import Tutorial from './components/Tutorial.jsx'

function VisionBoard() {
  const { goals, wallFull, note, setNote, noteLocal, subirNota } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  // Arrastre del muro: solo visual. Cambia el orden en pantalla y no se
  // guarda en ningún sitio (ni en datos ni en storage): al recargar o volver
  // al muro vuelve el orden por defecto. Con ratón se arrastra; en táctil
  // manteniendo pulsado, para no robarle el scroll ni el doble toque.
  const [ordenMuro, setOrdenMuro] = useState([])
  const [dragId, setDragId] = useState(null)
  const [sobreId, setSobreId] = useState(null)
  const gridRef = useRef(null)
  const arrastreRef = useRef(null)
  const vistaRef = useRef([])

  const enMuro = goals.filter(
    (goal) => goal.enMuro && !goal.finalizadoEn && !esHijoDe(goal.id, goals),
  )
  const enPool = goals.filter(
    (goal) => !goal.enMuro && !goal.finalizadoEn && !esHijoDe(goal.id, goals),
  )
  // La nota por defecto lista los pendientes: lo archivado ya no es pendiente.
  const titulos = goals.filter((goal) => !goal.finalizadoEn).map((goal) => goal.nombre)
  const nota = note ?? titulos.join('\n')

  // El orden visible: por defecto el de `goals`; si ya hubo un arrastre, el
  // que dejó (con lo nuevo por delante). El ref guarda lo que se ve para el
  // momento de soltar, sin leer estado desactualizado del cierre.
  const idsMuro = enMuro.map((goal) => goal.id)
  const orden = ordenaIds(idsMuro, ordenMuro)
  const porId = new Map(enMuro.map((goal) => [goal.id, goal]))
  const visibles = orden.map((id) => porId.get(id)).filter(Boolean)

  useEffect(() => {
    vistaRef.current = orden
  }, [orden])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    function limpiar(el) {
      for (const propiedad of ['position', 'left', 'top', 'width', 'z-index']) {
        el.style.removeProperty(propiedad)
      }
    }

    // La carta levantada sale del flujo y viaja fija bajo el cursor/finger
    // (position, left, top y width van en inline porque dependen de la
    // geometría del momento; el resto del aspecto es CSS).
    function empezar(arrastre) {
      if (arrastre.iniciado) return
      arrastre.iniciado = true
      const rect = arrastre.el.getBoundingClientRect()
      arrastre.offsetX = arrastre.x0 - rect.left
      arrastre.offsetY = arrastre.y0 - rect.top
      arrastre.el.style.setProperty('position', 'fixed')
      arrastre.el.style.setProperty('left', `${rect.left}px`)
      arrastre.el.style.setProperty('top', `${rect.top}px`)
      arrastre.el.style.setProperty('width', `${rect.width}px`)
      arrastre.el.style.setProperty('z-index', '5')
      setDragId(arrastre.id)
    }

    function posicionar(x, y) {
      const arrastre = arrastreRef.current
      if (!arrastre?.iniciado) return
      arrastre.el.style.setProperty('left', `${x - arrastre.offsetX}px`)
      arrastre.el.style.setProperty('top', `${y - arrastre.offsetY}px`)
      // `is-dragging` deja de recibir el puntero, así que lo que hay debajo
      // se puede medir: la carta sobre la que se suelta se señala en CSS.
      const bajo = document.elementFromPoint(x, y)?.closest?.('.frame--goal')
      const id = bajo && bajo !== arrastre.el ? (bajo.dataset.goal ?? null) : null
      if (id !== arrastre.sobre) {
        arrastre.sobre = id
        setSobreId(id)
      }
    }

    function soltar() {
      const arrastre = arrastreRef.current
      if (!arrastre) return
      clearTimeout(arrastre.timer)
      if (arrastre.iniciado) {
        limpiar(arrastre.el)
        const { id, sobre } = arrastre
        const lista = vistaRef.current
        if (sobre && id && sobre !== id && lista.includes(id) && lista.includes(sobre)) {
          setOrdenMuro(mueveA(lista, id, lista.indexOf(sobre)))
        }
        setDragId(null)
        setSobreId(null)
      }
      arrastreRef.current = null
    }

    function alPulsar(event) {
      if (event.button) return
      // Un segundo dedo (o botón) baja lo que esté en el aire y empieza de
      // cero: nunca quedan dos arrastres vivos a la vez.
      if (arrastreRef.current) {
        if (arrastreRef.current.iniciado) soltar()
        else clearTimeout(arrastreRef.current.timer)
      }
      const frame = event.target.closest?.('.frame--goal')
      if (!frame || !grid.contains(frame)) return
      if (event.target.closest('button, input, a, label, textarea')) return
      const toque = event.pointerType !== 'mouse'
      arrastreRef.current = {
        id: frame.dataset.goal ?? '',
        el: frame,
        x0: event.clientX,
        y0: event.clientY,
        offsetX: 0,
        offsetY: 0,
        iniciado: false,
        sobre: null,
        toque,
        timer: null,
      }
      if (toque) {
        arrastreRef.current.timer = setTimeout(() => {
          if (arrastreRef.current) empezar(arrastreRef.current)
        }, 350)
      }
    }

    function alMover(event) {
      const arrastre = arrastreRef.current
      if (!arrastre) return
      const distancia = Math.hypot(
        event.clientX - arrastre.x0,
        event.clientY - arrastre.y0,
      )
      if (!arrastre.iniciado) {
        if (arrastre.toque) {
          // Moverse antes del largo pulsado = estaba haciendo scroll.
          if (distancia > 10) {
            clearTimeout(arrastre.timer)
            arrastreRef.current = null
          }
          return
        }
        if (distancia < 5) return
        empezar(arrastre)
      }
      if (event.cancelable) event.preventDefault()
      posicionar(event.clientX, event.clientY)
    }

    // El scroll del táctil se corta mientras hay carta en el aire: con este
    // escuchador no pasivo `preventDefault` sigue mandando.
    function alDeslizar(event) {
      if (arrastreRef.current?.iniciado && event.cancelable) event.preventDefault()
    }

    grid.addEventListener('pointerdown', alPulsar)
    grid.addEventListener('touchmove', alDeslizar, { passive: false })
    document.addEventListener('pointermove', alMover)
    document.addEventListener('pointerup', soltar)
    document.addEventListener('pointercancel', soltar)
    return () => {
      grid.removeEventListener('pointerdown', alPulsar)
      grid.removeEventListener('touchmove', alDeslizar)
      document.removeEventListener('pointermove', alMover)
      document.removeEventListener('pointerup', soltar)
      document.removeEventListener('pointercancel', soltar)
      soltar()
    }
  }, [])


  function startNoteEdit() {
    setNoteDraft(nota)
    setNoteEditing(true)
  }

  function saveNote() {
    setNote(noteDraft)
    setNoteEditing(false)
  }

  // Editar desde el muro: sale el modal de opciones y entra el form ya cargado.
  function openEdit(goal) {
    setEditing(goal)
    setAddOpen(true)
  }

  function closeForm() {
    setAddOpen(false)
    setEditing(null)
  }

  function cancelNoteEdit() {
    setNoteEditing(false)
  }

  return (
    <main className="wall">
      <div className="wall__texture" aria-hidden="true" />
      <div className="wall__vignette" aria-hidden="true" />

      <header className="wall__head">
        <h1 className="wall__title">Focus board</h1>
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
          <Link to="/cumplidos" className="tape-link">
            Cumplidos
          </Link>
          <SyncBadge />
        </nav>
      </header>

      <div
        className={dragId ? 'wall__grid is-arrastre' : 'wall__grid'}
        ref={gridRef}
      >
        {visibles.map((goal, index) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            index={index}
            variant="wall"
            onEdit={openEdit}
            arrastrando={dragId === goal.id}
            sobre={sobreId === goal.id}
          />
        ))}

        <article
          className="note note--lined frame--clip"
          style={{ '--tilt': '-2.5deg' }}
          title="Doble clic para editar"
        >
          <h2>
            TODO{noteLocal && <LocalChip />}
          </h2>
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
          {noteLocal && (
            <button
              type="button"
              className="btn btn--ghost note__subir"
              onClick={subirNota}
              title="Pasa esta nota a la cuenta: pasa a sincronizarse con el passcode"
            >
              Subir la nota a la cuenta
            </button>
          )}
        </article>

        {/* Lleno no se enseña desactivado: el muro topa y el resto vive
            en el pool (decirlo aquí ya lo dice el contador de arriba). */}
        {!wallFull && (
          <button
            type="button"
            className="frame frame--add"
            style={{ '--tilt': '-1.5deg' }}
            onClick={() => setAddOpen(true)}
            aria-label="Añadir objetivo"
          >
            <span className="frame__photo frame__photo--add">
              <span className="plus" aria-hidden="true" />
            </span>
            <span className="frame__caption">Añadir objetivo</span>
          </button>
        )}
      </div>

      {/* Para el mismo visitante al que se le cargan los ejemplos: el
          tutorial guiado recorre las funcionalidades apuntando a cada
          elemento (se salta o se termina y ya no vuelve). En cuanto
          sincroniza con una cuenta, se va. */}
      {!hasSynced() && <Tutorial />}

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

export default VisionBoard
