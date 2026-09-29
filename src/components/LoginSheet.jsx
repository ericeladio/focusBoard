import { useEffect, useRef, useState } from 'react'
import { AuthError, OfflineError, RateLimitError } from '../lib/api.js'
import { useStore } from '../lib/storeContext.js'

// El bloqueo se recuerda en localStorage para que la cuenta atrás sobreviva a
// un cierre de la hoja o a un reload (el servidor manda, pero mientras tanto
// no tiene sentido dejar intentar).
const BLOQUEO_KEY = 'fb.bloqueadoHasta'

function guardarBloqueo(hasta) {
  try {
    window.localStorage.setItem(BLOQUEO_KEY, hasta)
  } catch {
    // Sin storage no hay recordatorio, pero el servidor sigue bloqueando.
  }
}

function bloqueoRestante() {
  try {
    const hasta = window.localStorage.getItem(BLOQUEO_KEY)
    const ms = hasta ? Date.parse(hasta) : NaN
    if (!Number.isFinite(ms)) return null
    if (ms <= Date.now()) {
      window.localStorage.removeItem(BLOQUEO_KEY)
      return null
    }
    return Math.ceil((ms - Date.now()) / 1000)
  } catch {
    return null
  }
}

function formatoTiempo(segundos) {
  const total = Math.max(0, Math.floor(segundos))
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const seg = total % 60
  const dos = (n) => String(n).padStart(2, '0')
  return horas > 0 ? `${horas}:${dos(minutos)}:${dos(seg)}` : `${minutos}:${dos(seg)}`
}

function mensajeDeError(err) {
  if (err instanceof AuthError) {
    const restantes = err.restantes
    if (Number.isFinite(restantes) && restantes > 0) {
      return `Passcode incorrecto: quedan ${restantes} intento${restantes === 1 ? '' : 's'}`
    }
    return 'Passcode incorrecto'
  }
  if (err instanceof OfflineError) return 'Sin conexión: inténtalo cuando vuelva la red'
  return err?.message ?? 'No se pudo entrar'
}

function LoginSheet() {
  const { sync, login, loginOpen, openLogin, closeLogin } = useStore()
  const dialogRef = useRef(null)
  const dismissed = useRef(false)
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [bloqueo, setBloqueo] = useState(() => bloqueoRestante())
  const bloqueado = bloqueo !== null

  const needsAuth = sync.online && !sync.authorized

  // Si el servidor rechaza la sesión, la hoja se abre sola; el usuario puede
  // cerrarla y no vuelve a molestar hasta el próximo rechazo.
  useEffect(() => {
    if (sync.authorized) {
      dismissed.current = false
      return
    }
    if (needsAuth && !loginOpen && !dismissed.current) openLogin()
  }, [needsAuth, loginOpen, openLogin, sync.authorized])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (loginOpen && !dialog.open) dialog.showModal()
    if (!loginOpen && dialog.open) dialog.close()
  }, [loginOpen])

  // Cuenta atrás: 1 s en 1 s y, al llegar a cero, se olvida el bloqueo.
  useEffect(() => {
    if (!bloqueado) return undefined
    const id = setInterval(() => {
      setBloqueo((prev) => {
        if (prev === null) return prev
        const siguiente = prev - 1
        if (siguiente > 0) return siguiente
        try {
          window.localStorage.removeItem(BLOQUEO_KEY)
        } catch {
          // Nada que limpiar.
        }
        return null
      })
    }, 1000)
    return () => clearInterval(id)
  }, [bloqueado])

  function limpiarBloqueo() {
    try {
      window.localStorage.removeItem(BLOQUEO_KEY)
    } catch {
      // Nada que limpiar.
    }
    setBloqueo(null)
  }

  function close() {
    dismissed.current = true
    setError(null)
    setPasscode('')
    closeLogin()
  }

  function handleDialogClose() {
    // Escape/×: no volver a abrirla sola hasta el próximo rechazo.
    dismissed.current = true
    setError(null)
    setPasscode('')
    closeLogin()
  }

  async function submit(event) {
    event.preventDefault()
    if (busy || bloqueado || !passcode) return
    setBusy(true)
    setError(null)
    try {
      await login(passcode)
      limpiarBloqueo()
      setPasscode('')
      closeLogin()
    } catch (err) {
      if (err instanceof RateLimitError) {
        guardarBloqueo(err.hasta)
        setBloqueo(Math.max(1, Math.ceil((Date.parse(err.hasta) - Date.now()) / 1000)))
        setError(null)
      } else {
        setError(mensajeDeError(err))
      }
    } finally {
      setBusy(false)
    }
  }

  if (!loginOpen) return null

  const aviso = bloqueado
    ? `Bloqueado por demasiados intentos: vuelve a probar en ${formatoTiempo(bloqueo)}`
    : error

  return (
    <dialog className="sheet" ref={dialogRef} onClose={handleDialogClose}>
      <form className="sheet__paper" onSubmit={submit} noValidate>
        <button type="button" className="sheet__close" onClick={close} aria-label="Cerrar">
          ×
        </button>
        <h2 className="sheet__title">Entrar al tablero</h2>

        <p className="field__hint">
          Este tablero está protegido con un passcode. Se pide una vez y se
          recuerda durante 30 días. Tras 5 fallos seguidos el login se bloquea
          30 minutos (después, 2 fallos lo bloquean 24 h).
        </p>

        <div className="field">
          <label className="field__label" htmlFor="login-passcode">
            Passcode
          </label>
          <input
            id="login-passcode"
            className="input"
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            aria-invalid={Boolean(aviso)}
            aria-describedby={aviso ? 'login-passcode-error' : undefined}
            autoFocus
          />
          {aviso && (
            <p className="field__error" id="login-passcode-error">
              {aviso}
            </p>
          )}
        </div>

        <div className="sheet__actions">
          <button type="button" className="btn btn--ghost" onClick={close}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn--ink"
            disabled={busy || bloqueado || !passcode.trim()}
          >
            {bloqueado
              ? `Espera ${formatoTiempo(bloqueo)}`
              : busy
                ? 'Entrando…'
                : 'Entrar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default LoginSheet
