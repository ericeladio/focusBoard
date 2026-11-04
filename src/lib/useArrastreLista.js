import { useCallback, useEffect, useRef, useState } from 'react'

// Arrastre para reordenar una lista corta (pasos de un objetivo, partes de
// una compuesta). El asa es la única zona que inicia el arrastre, así que el
// scroll y el resto de controles siguen funcionando. En táctil el asa lleva
// `touch-action: none`; el orden se aplica al soltar.
//
// También responde a las flechas del teclado sobre el asa, para que el orden
// se pueda cambiar sin ratón.
export function useArrastreLista(ids, onReorder) {
  const listaRef = useRef(null)
  const arrastreRef = useRef(null)
  const idsRef = useRef(ids)
  const onReorderRef = useRef(onReorder)
  const [arrastrando, setArrastrando] = useState(null)
  const [punto, setPunto] = useState(null)

  useEffect(() => {
    idsRef.current = ids
    onReorderRef.current = onReorder
  })

  const alMover = useCallback((event) => {
    const arrastre = arrastreRef.current
    if (!arrastre || event.pointerId !== arrastre.pointerId) return

    if (!arrastre.activo) {
      if (Math.abs(event.clientY - arrastre.y0) < 4) return
      arrastre.activo = true
      setArrastrando(arrastre.id)
    }
    if (event.cancelable) event.preventDefault()

    const lista = listaRef.current
    if (!lista) return
    const items = Array.from(lista.querySelectorAll('[data-drag-id]'))
    let destino = items.length
    for (let i = 0; i < items.length; i += 1) {
      const rect = items[i].getBoundingClientRect()
      if (event.clientY < rect.top + rect.height / 2) {
        destino = i
        break
      }
    }
    if (destino !== arrastre.punto) {
      arrastre.punto = destino
      setPunto(destino)
    }
  }, [])

  const alSoltar = useCallback((event) => {
    const arrastre = arrastreRef.current
    if (!arrastre || event.pointerId !== arrastre.pointerId) return
    arrastreRef.current = null
    setArrastrando(null)
    setPunto(null)
    if (!arrastre.activo || arrastre.punto == null) return

    const lista = idsRef.current
    const desde = lista.indexOf(arrastre.id)
    if (desde === -1) return
    let hasta = arrastre.punto
    if (desde < hasta) hasta -= 1
    if (hasta === desde) return
    const siguiente = lista.slice()
    siguiente.splice(desde, 1)
    siguiente.splice(hasta, 0, arrastre.id)
    onReorderRef.current(siguiente)
  }, [])

  useEffect(() => {
    document.addEventListener('pointermove', alMover)
    document.addEventListener('pointerup', alSoltar)
    document.addEventListener('pointercancel', alSoltar)
    return () => {
      document.removeEventListener('pointermove', alMover)
      document.removeEventListener('pointerup', alSoltar)
      document.removeEventListener('pointercancel', alSoltar)
    }
  }, [alMover, alSoltar])

  function empezar(id, event) {
    if (event.button) return
    event.preventDefault()
    arrastreRef.current = {
      id,
      pointerId: event.pointerId,
      y0: event.clientY,
      activo: false,
      punto: null,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function moverConTeclado(id, delta) {
    const lista = idsRef.current
    const desde = lista.indexOf(id)
    const hasta = desde + delta
    if (desde === -1 || hasta < 0 || hasta >= lista.length) return
    const siguiente = lista.slice()
    siguiente.splice(desde, 1)
    siguiente.splice(hasta, 0, id)
    onReorderRef.current(siguiente)
  }

  function propsAsa(id) {
    return {
      onPointerDown: (event) => empezar(id, event),
      onKeyDown: (event) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          moverConTeclado(id, -1)
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          moverConTeclado(id, 1)
        }
      },
    }
  }

  return { listaRef, arrastrando, punto, propsAsa }
}
