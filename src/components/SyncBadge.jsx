import { useStore } from '../lib/storeContext.js'
import { syncNow } from '../lib/sync.js'

const HINTS = {
  server_error:
    'El servidor no responde. Tus cambios siguen guardados en este dispositivo; vuelve a intentarlo.',
  offline: 'Sin conexión: los cambios se subirán cuando vuelva la red.',
  unauthorized: 'Sin sesión: entra con el passcode para sincronizar.',
  error: 'No se pudo sincronizar: toca para reintentar.',
}

function badgeLabel(sync) {
  if (sync.syncing) return 'Sincronizando'
  if (sync.online && !sync.authorized) return 'Entrar'
  if (!sync.online) return sync.pending ? `${sync.pending} por subir` : 'Sin conexión'
  if (sync.error === 'server_error') return 'Sin servidor'
  if (sync.pending > 0) return `${sync.pending} por subir`
  if (sync.error) return 'Reintentar'
  if (sync.imageFailed > 0) {
    return sync.imageFailed === 1 ? 'Foto sin subir' : `${sync.imageFailed} fotos sin subir`
  }
  return 'Sincronizado'
}

function badgeHint(sync) {
  if (sync.syncing) return 'Sincronizando con el servidor…'
  if (sync.online && !sync.authorized) return HINTS.unauthorized
  if (!sync.online) {
    return sync.pending ? `${sync.pending} cambios pendientes. ${HINTS.offline}` : HINTS.offline
  }
  if (sync.error) return HINTS[sync.error] ?? HINTS.error
  if (sync.pending > 0) return `${sync.pending} cambios pendientes de subir`
  if (sync.imageFailed > 0) {
    return sync.imageFailed === 1
      ? 'Una foto no pudo subirse al servidor. Vuelve a elegirla en su meta.'
      : `${sync.imageFailed} fotos no pudieron subirse al servidor. Vuelve a elegirlas en sus metas.`
  }
  return 'Todo sincronizado con el servidor'
}

function SyncBadge() {
  const { sync, openLogin } = useStore()
  const label = badgeLabel(sync)
  const needsLogin = sync.online && !sync.authorized

  const classes = ['syncbadge']
  if (sync.syncing) classes.push('is-busy')
  if (needsLogin) classes.push('is-locked')
  if (!needsLogin && (!sync.online || sync.pending > 0 || sync.imageFailed > 0)) {
    classes.push('is-pending')
  }
  if (sync.error === 'server_error') classes.push('is-error')

  function handleClick() {
    if (needsLogin) {
      openLogin()
      return
    }
    // Tocar el badge es la vía manual de reparación: baja todo de nuevo.
    syncNow({ full: true })
  }

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={handleClick}
      disabled={sync.syncing}
      title={badgeHint(sync)}
      aria-live="polite"
    >
      {label}
    </button>
  )
}

export default SyncBadge
