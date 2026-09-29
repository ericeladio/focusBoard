// Entrada SSR para scripts/render-check.mjs: renderiza las tres rutas y el
// form de racha en HTML, sin navegador, para pillar errores de runtime que el
// build y los tests puros no ven.
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '../src/lib/store.jsx'
import VisionBoard from '../src/VisionBoard.jsx'
import Pool from '../src/pages/Pool.jsx'
import Cumplidos from '../src/pages/Cumplidos.jsx'
import GoalForm from '../src/components/GoalForm.jsx'

export function render(ruta) {
  const Page =
    ruta === '/pool' ? Pool : ruta === '/cumplidos' ? Cumplidos : VisionBoard
  return renderToString(
    h(
      StoreProvider,
      null,
      h(MemoryRouter, { initialEntries: [ruta] }, h(Page)),
    ),
  )
}

export function renderForm(editing) {
  return renderToString(
    h(
      StoreProvider,
      null,
      h(
        MemoryRouter,
        { initialEntries: ['/pool'] },
        h(GoalForm, { open: true, editing, onClose: () => {} }),
      ),
    ),
  )
}
