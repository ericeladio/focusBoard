import { useStore } from '../lib/storeContext.js'
import { syncNow } from '../lib/sync.js'

function badgeLabel(sync) {
  if (sync.syncing) return 'Sincronizando'
  if (sync.online && !sync.authorized) return 'Entrar'
  if (!sync.online) return sync.pending ? `${sync.pending} por subir` : 'Sin conexión'
  if (sync.pending > 0) return `${sync.pending} por subir`
  if (sync.error) return 'Reintentar'
  return 'Sincronizado'
}

function SyncBadge() {
  const { sync, openLogin } = useStore()
  const label = badgeLabel(sync)
  const needsLogin = sync.online && !sync.authorized

  const classes = ['syncbadge']
  if (sync.syncing) classes.push('is-busy')
  if (needsLogin) classes.push('is-locked')
  if (!needsLogin && (!sync.online || sync.pending > 0)) classes.push('is-pending')

  function handleClick() {
    if (needsLogin) {
      openLogin()
      return
    }
    syncNow()
  }

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={handleClick}
      disabled={sync.syncing}
      aria-live="polite"
    >
      {label}
    </button>
  )
}

export default SyncBadge
