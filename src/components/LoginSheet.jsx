import { useEffect, useRef, useState } from 'react'
import { AuthError, OfflineError } from '../lib/api.js'
import { useStore } from '../lib/storeContext.js'

function LoginSheet() {
  const { sync, login, loginOpen, openLogin, closeLogin } = useStore()
  const dialogRef = useRef(null)
  const dismissed = useRef(false)
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

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
    if (busy || !passcode) return
    setBusy(true)
    setError(null)
    try {
      await login(passcode)
      setPasscode('')
      closeLogin()
    } catch (err) {
      setError(
        err instanceof AuthError
          ? 'Passcode incorrecto'
          : err instanceof OfflineError
            ? 'Sin conexión: inténtalo cuando vuelva la red'
            : err?.message ?? 'No se pudo entrar',
      )
    } finally {
      setBusy(false)
    }
  }

  if (!loginOpen) return null

  return (
    <dialog className="sheet" ref={dialogRef} onClose={handleDialogClose}>
      <form className="sheet__paper" onSubmit={submit} noValidate>
        <button type="button" className="sheet__close" onClick={close} aria-label="Cerrar">
          ×
        </button>
        <h2 className="sheet__title">Entrar al tablero</h2>

        <p className="field__hint">
          Este tablero está protegido con un passcode. Se pide una vez y se
          recuerda durante 30 días.
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
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-passcode-error' : undefined}
            autoFocus
          />
          {error && (
            <p className="field__error" id="login-passcode-error">
              {error}
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
            disabled={busy || !passcode.trim()}
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default LoginSheet
