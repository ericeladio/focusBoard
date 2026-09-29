// Límite de intentos de passcode.
//
// Reglas (pura, sin BD ni HTTP, para poder testearla con el reloj en la mano):
//   - Nivel 0: 5 fallos seguidos → bloqueo de 30 minutos.
//   - Nivel 1: a partir de ahí, 2 fallos → bloqueo de 24 horas.
//   - Un acierto borra los contadores.
// Cada intento se cuenta en tres claves a la vez (IP, dispositivo y
// user-agent, hasheadas): si cualquiera está bloqueada, el login está
// bloqueado, así que rotar el navegador o el user-agent no sirve.
import { createHash } from 'node:crypto'

export const NIVEL_0_MAX = 5
export const NIVEL_1_MAX = 2
export const BLOQUEO_INICIAL_MS = 30 * 60 * 1000
export const BLOQUEO_DIARIO_MS = 24 * 60 * 60 * 1000

function primerTexto(valor) {
  const texto = Array.isArray(valor) ? valor[0] : valor
  if (typeof texto !== 'string') return null
  const limpio = texto.trim().slice(0, 256)
  return limpio || null
}

export function primeraIp(headers = {}) {
  const xff = primerTexto(headers['x-forwarded-for'])
  if (xff) {
    const primera = xff.split(',')[0].trim().slice(0, 64)
    if (primera) return primera
  }
  const real = primerTexto(headers['x-real-ip'])
  if (real) return real.slice(0, 64)
  return 'desconocido'
}

// La sal evita que un volcado de la tabla sirva para averiguar IPs o
// user-agents. Con `LOGIN_SALT` se puede cambiar sin tocar `SESSION_SECRET`.
export function hashClave(tipo, valor) {
  const sal = process.env.LOGIN_LOCK_SALT || process.env.SESSION_SECRET || 'focusboard'
  return `${tipo}:${createHash('sha256').update(`${sal}|${tipo}|${valor}`).digest('hex')}`
}

// Las tres identidades de una petición. `disp` solo si el cliente la manda.
export function clavesDe(req) {
  const headers = (req && req.headers) || {}
  const ip = primeraIp(headers)
  const disp = primerTexto(headers['x-focus-device'])
  const ua = primerTexto(headers['user-agent']) || 'desconocido'
  const identidades = [
    { tipo: 'ip', valor: ip },
    { tipo: 'ua', valor: ua },
  ]
  if (disp) identidades.push({ tipo: 'disp', valor: disp })
  return identidades.map((item) => ({ ...item, clave: hashClave(item.tipo, item.valor) }))
}

function msDe(valor) {
  if (!valor) return 0
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0
  const ms = valor instanceof Date ? valor.getTime() : Date.parse(valor)
  return Number.isFinite(ms) ? ms : 0
}

export function limiteDeNivel(nivel) {
  return Number(nivel) >= 1 ? NIVEL_1_MAX : NIVEL_0_MAX
}

export function estadoDe(fila, ahora = Date.now()) {
  const fallos = Number(fila && fila.fallos) || 0
  const nivel = Number(fila && fila.nivel) || 0
  const hasta = msDe(fila && fila.bloqueado_hasta)
  const bloqueado = hasta > ahora
  return {
    bloqueado,
    restanteMs: bloqueado ? hasta - ahora : 0,
    hasta: bloqueado ? new Date(hasta).toISOString() : null,
    restantes: bloqueado ? 0 : Math.max(0, limiteDeNivel(nivel) - fallos),
    fallos,
    nivel,
  }
}

// El estado que manda para responder: el bloqueo más largo que haya.
export function peorBloqueo(estados) {
  let peor = null
  for (const estado of estados ?? []) {
    if (!estado || !estado.bloqueado) continue
    if (!peor || estado.restanteMs > peor.restanteMs) peor = estado
  }
  return peor
}

export function menosRestantes(estados) {
  const lista = (estados ?? []).filter((estado) => estado && Number.isFinite(estado.restantes))
  if (!lista.length) return null
  return lista.reduce((min, estado) => Math.min(min, estado.restantes), Infinity)
}

// La fila que más ha fallado (el contador se sube en las tres a la vez, pero
// si una clave se creó antes que otra puede ir por delante).
export function peorFila(filas) {
  const lista = filas instanceof Map ? [...filas.values()] : filas ?? []
  return lista.reduce(
    (peor, fila) => ((Number(fila && fila.fallos) || 0) > (Number(peor && peor.fallos) || 0) ? fila : peor),
    lista[0],
  )
}

// ¿Hay que bloquear tras este fallo? `null` = sigue dentro de su cupo.
export function planDeBloqueo(fila, ahora = Date.now()) {
  const fallos = Number(fila && fila.fallos) || 0
  const nivel = Number(fila && fila.nivel) || 0
  if (fallos < limiteDeNivel(nivel)) return null
  const ms = Number(nivel) >= 1 ? BLOQUEO_DIARIO_MS : BLOQUEO_INICIAL_MS
  return {
    fallos: 0,
    nivel: Math.max(Number(nivel) || 0, 1),
    bloqueado_hasta: new Date(ahora + ms).toISOString(),
    ms,
  }
}
