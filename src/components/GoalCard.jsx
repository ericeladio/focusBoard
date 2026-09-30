import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/storeContext.js'
import Foto from './Foto.jsx'
import GoalControls from './GoalControls.jsx'
import GoalOptions from './GoalOptions.jsx'
import LocalChip from './LocalChip.jsx'

const TILTS = ['-4deg', '3deg', '-2deg', '4.5deg', '-3.5deg', '2deg', '-5deg']

function ratioOf(img) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (!w || !h) return null
  return String(Math.min(1.6, Math.max(0.62, w / h)))
}

function GoalCard({
  goal,
  index = 0,
  variant = 'wall',
  arrastrando = false,
  sobre = false,
}) {
  const { types } = useStore()

  const [optionsOpen, setOptionsOpen] = useState(false)
  const [ratio, setRatio] = useState(null)
  const imgRef = useRef(null)
  const lastTapRef = useRef(0)
  const inicioTactoRef = useRef(null)

  const type = types.find((item) => item.id === goal.tipoId)
  const tilt = TILTS[index % TILTS.length]
  const pinClass = index % 2 === 0 ? 'frame--pin' : 'frame--tape'

  function applyRatio(img) {
    const next = ratioOf(img)
    if (next) setRatio(next)
  }

  useEffect(() => {
    const img = imgRef.current
    if (img?.complete) applyRatio(img)
  }, [goal.imagen])

  function isControl(target) {
    return Boolean(target.closest?.('button, input, a, label'))
  }

  function handleDoubleClick(event) {
    if (isControl(event.target)) return
    setOptionsOpen(true)
  }

  function handleTouchEnd(event) {
    if (isControl(event.target)) return
    const inicio = inicioTactoRef.current
    const fin = event.changedTouches?.[0]
    const movio =
      inicio && fin
        ? Math.hypot(fin.clientX - inicio.x, fin.clientY - inicio.y) > 12
        : false
    if (movio) {
      // Scroll o arrastre, no un toque: ni cuenta como primer toque ni abre
      // la modal (así arrastrar no deja la tarjeta "media tocada").
      lastTapRef.current = 0
      return
    }
    const now = Date.now()
    if (now - lastTapRef.current < 350) {
      lastTapRef.current = 0
      setOptionsOpen(true)
    } else {
      lastTapRef.current = now
    }
  }

  return (
    <>
      <figure
        className={`frame frame--goal ${pinClass}${
          arrastrando ? ' is-dragging' : ''
        }${sobre ? ' is-drag-over' : ''}`}
        style={{ '--tilt': tilt }}
        data-goal={goal.id}
        onDoubleClick={handleDoubleClick}
        onTouchStart={(event) => {
          const t = event.touches?.[0]
          inicioTactoRef.current = t ? { x: t.clientX, y: t.clientY } : null
        }}
        onTouchEnd={handleTouchEnd}
      >
        <div className="frame__photo">
          <Foto
            ref={imgRef}
            src={goal.imagen}
            alt={goal.nombre}
            draggable={false}
            style={ratio ? { aspectRatio: ratio } : undefined}
            onLoad={(event) => applyRatio(event.currentTarget)}
          />
        </div>

        <div className="goal__body">
          <span className="goal__type">
            {type ? type.nombre : 'Sin tipo'}
            {goal.local && <LocalChip />}
          </span>
          <figcaption className="goal__name">{goal.nombre}</figcaption>
          <GoalControls goal={goal} variant={variant} />
        </div>
      </figure>

      <GoalOptions
        open={optionsOpen}
        goal={goal}
        onClose={() => setOptionsOpen(false)}
      />
    </>
  )
}

export default GoalCard
