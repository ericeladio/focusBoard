import { jsonBody } from './_lib/body.js'
import {
  aplicarBloqueo,
  borrarIntentos,
  ensureUser,
  incrementarIntentos,
  leerIntentos,
} from './_lib/db.js'
import { passcodeMatches } from './_lib/config.js'
import {
  clavesDe,
  estadoDe,
  menosRestantes,
  peorBloqueo,
  peorFila,
  planDeBloqueo,
} from './_lib/limiter.js'
import { setSessionCookie, signSession } from './_lib/session.js'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function aviso(cuando, error) {
  console.error(`limiter.${cuando}:`, error?.message ?? error)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (!process.env.SESSION_SECRET || !process.env.PASSCODE || !process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'server_not_configured' })
  }
  try {
    const claves = clavesDe(req)
    const ids = claves.map((item) => item.clave)

    // El bloqueo se mira ANTES del passcode: mientras dure no se prueba
    // ninguna clave, ni siquiera la correcta. Así un atacante no puede seguir
    // probando dentro del bloqueo (y el dueño lo desbloquea con
    // `node scripts/unlock-login.mjs` o esperando).
    let estados = null
    try {
      const filas = await leerIntentos(ids)
      estados = claves.map((item) => estadoDe(filas.get(item.clave), Date.now()))
    } catch (error) {
      // Sin la tabla (migración pendiente) no bloqueamos: preferimos no
      // dejar al dueño fuera de su propia app.
      aviso('leer', error)
    }

    if (estados) {
      const bloqueo = peorBloqueo(estados)
      if (bloqueo) {
        const segundos = Math.max(1, Math.ceil(bloqueo.restanteMs / 1000))
        res.setHeader('Retry-After', String(segundos))
        return res.status(429).json({
          error: 'demasiados_intentos',
          retry_after: segundos,
          hasta: bloqueo.hasta,
        })
      }
    }

    const { passcode } = jsonBody(req)

    if (!passcodeMatches(passcode)) {
      // La pausa también sirve para que un fallo no sea instantáneo.
      await delay(300)
      let restantes = null
      if (estados) {
        try {
          const filas = await incrementarIntentos(ids)
          const plan = planDeBloqueo(peorFila(filas), Date.now())
          if (plan) {
            await aplicarBloqueo(ids, plan)
            const segundos = Math.max(1, Math.ceil(plan.ms / 1000))
            res.setHeader('Retry-After', String(segundos))
            return res.status(429).json({
              error: 'demasiados_intentos',
              retry_after: segundos,
              hasta: plan.bloqueado_hasta,
            })
          }
          restantes = menosRestantes(
            claves.map((item) => estadoDe(filas.get(item.clave), Date.now())),
          )
        } catch (error) {
          aviso('fallo', error)
        }
      }
      return res.status(401).json({
        error: 'invalid_passcode',
        ...(restantes === null ? {} : { restantes }),
      })
    }

    // Acierto: los contadores vuelven a cero.
    if (estados) {
      try {
        await borrarIntentos(ids)
      } catch (error) {
        aviso('reset', error)
      }
    }
    await ensureUser()
    setSessionCookie(res, signSession())
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('login failed:', error)
    return res.status(500).json({ error: 'server_error' })
  }
}
