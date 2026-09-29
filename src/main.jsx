import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Con `autoUpdate` el SW nuevo ya se activa solo; si no se recarga, la
// pestaña sigue corriendo el JS viejo y los arreglos no llegan.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
