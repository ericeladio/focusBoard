// Monta las funciones reales de `api/` dentro de `npm run dev`: mismo código
// que corre en Vercel, mismo Neon y mismo R2, sin necesidad de Vercel CLI.
// Solo se activa en `serve` (`apply: 'serve'`), así `npm run build` no lo toca.
//
// El único ajuste de desarrollo es quitar `Secure` del `Set-Cookie`: el
// navegador descarta esa cookie en http://localhost y el login no se
// sostendría. `api/_lib/session.js` sigue emitiéndola, producción la mantiene.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { MAX_IMAGE_BYTES, missingEnv } from '../api/_lib/config.js'

const EXACT = new Map([
  ['/api/login', 'api/login.js'],
  ['/api/logout', 'api/logout.js'],
  ['/api/sync', 'api/sync.js'],
])
const IMAGES_PREFIX = '/api/images/'
const IMAGES_HANDLER = 'api/images/[...key].js'
const HAS_BODY = new Set(['POST', 'PUT', 'PATCH'])

// Mismo lector que `scripts/migrate.mjs`: respeta comillas y no pisa el entorno
// que ya exista (para poder sobrescribir una variable desde la terminal).
function loadEnvFile(root) {
  const file = path.join(root, '.env.local')
  if (!existsSync(file)) return false
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim().startsWith('#')) continue
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    let value = match[2]
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(match[1] in process.env)) process.env[match[1]] = value
  }
  return true
}

function resolveRoute(pathname) {
  if (EXACT.has(pathname)) return { handler: EXACT.get(pathname), query: {} }
  if (pathname.startsWith(IMAGES_PREFIX)) {
    // Vercel enruta un **un** segmento bajo /api/images/: con dos barras la
    // plataforma devuelve 404 y la función ni se invoca, y `req.query.key`
    // llega vacío. Reproducimos esas dos condiciones aquí; antes el puente
    // fabricaba ese query a mano y el fallo (todo el rato en producción) no
    // aparecía ni en `npm run dev` ni en el smoke.
    const rest = pathname.slice(IMAGES_PREFIX.length)
    if (!rest || rest.includes('/')) return { handler: null, query: {} }
    return { handler: IMAGES_HANDLER, query: {} }
  }
  if (pathname.startsWith('/api/')) return { handler: null, query: {} }
  return null
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_IMAGE_BYTES) {
        req.destroy()
        reject(Object.assign(new Error('image_too_large'), { status: 413 }))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Sin `Secure` solo en desarrollo: en http://localhost la cookie no se guarda.
function withoutSecure(value) {
  const strip = (item) => String(item).replace(/;\s*Secure(?=\s*(?:;|$))/gi, '')
  return Array.isArray(value) ? value.map(strip) : strip(value)
}

function createRes(nodeRes) {
  const headers = {}
  let code = 200
  let sent = false

  function send(body, extra = {}) {
    if (sent) return
    sent = true
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ''))
    const head = { ...headers, ...extra }
    if (code === 204 || code === 304) delete head['Content-Length']
    else head['Content-Length'] = String(buf.length)
    nodeRes.writeHead(code, head)
    nodeRes.end(buf)
  }

  return {
    setHeader(name, value) {
      headers[name] = String(name).toLowerCase() === 'set-cookie' ? withoutSecure(value) : value
      return this
    },
    status(value) {
      code = value
      return this
    },
    json(value) {
      send(JSON.stringify(value ?? null), { 'Content-Type': 'application/json' })
      return this
    },
    end(body) {
      send(body ?? Buffer.alloc(0))
      return this
    },
    sent: () => sent,
  }
}

async function dispatch(req, res, loadHandler) {
  const url = new URL(String(req.url ?? '/'), 'http://localhost')
  const route = resolveRoute(url.pathname)
  const shim = createRes(res)
  const method = req.method ?? 'GET'

  if (!route) return
  if (!route.handler) {
    shim.status(404).json({ error: 'not_found' })
    return
  }

  let body = Buffer.alloc(0)
  if (HAS_BODY.has(method)) {
    const declared = Number(req.headers['content-length'] ?? 0)
    if (declared > MAX_IMAGE_BYTES) {
      shim.status(413).json({ error: 'image_too_large' })
      return
    }
    try {
      body = await readRawBody(req)
    } catch (error) {
      if (error?.status === 413) {
        shim.status(413).json({ error: 'image_too_large' })
        return
      }
      throw error
    }
    const contentType = String(req.headers['content-type'] ?? '')
    if (contentType.includes('application/json')) {
      // `jsonBody` acepta objeto o string: si el JSON no parsea, le pasamos el
      // texto crudo y devuelve `{}` igual que en producción.
      try {
        body = JSON.parse(body.toString('utf8'))
      } catch {
        body = body.toString('utf8')
      }
    }
  }

  const { default: handler } = await loadHandler(route.handler)
  await handler({ method, url: req.url, headers: req.headers, query: route.query, body }, shim)
  if (!shim.sent()) shim.status(204).end()
}

export function apiDev() {
  const cache = new Map()
  let root = null

  async function loadHandler(rel) {
    if (!cache.has(rel)) {
      cache.set(rel, await import(pathToFileURL(path.join(root, rel)).href))
    }
    return cache.get(rel)
  }

  return {
    name: 'focusboard-api-dev',
    apply: 'serve',

    configResolved(config) {
      root = config.root
      loadEnvFile(root)
    },

    configureServer(server) {
      const logger = server.config.logger
      const missing = missingEnv()
      if (missing.length) {
        logger.warn(
          `[dev-api] faltan variables en .env.local: ${missing.join(', ')}` +
            ' (copia .env.example y rellénalas)',
        )
      } else {
        logger.info('[dev-api] /api/* servido en local contra Neon y R2')
        logger.info('[dev-api] atención: escribe en los datos reales, igual que producción')
      }

      server.middlewares.use((req, res, next) => {
        if (!String(req.url ?? '').startsWith('/api/')) {
          next()
          return
        }
        dispatch(req, res, loadHandler).catch((error) => {
          console.error('[dev-api]', error)
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'server_error' }))
          }
        })
      })
    },
  }
}
