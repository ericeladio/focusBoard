// Forma de la clave de imagen dentro de la URL de la API.
//
// Vercel solo enruta **un segmento** bajo `/api/images/`: una petición a
// `/api/images/img-goals/<uuid>` (dos barras) devuelve 404 de plataforma y la
// función ni se invoca, y en las de un solo segmento `req.query.key` llega
// vacío. Por eso la URL se manda siempre como UN segmento, separando la carpeta
// con `~`: carácter *unreserved* en URL (encodeURIComponent no lo toca) y que
// `isValidImageKey` no admite, así que no puede aparecer dentro de una clave.
//
// La clave real no cambia: R2 y la BD siguen con `img-goals/<uuid>`; solo se
// transforma al montar la URL y al recibirla. Cliente y servidor importan este
// módulo para que las dos formas no puedan divergir.

const IMAGE_NAME_RE = /^[A-Za-z0-9_-]{4,64}$/
const IMAGE_FOLDER_RE = /^[A-Za-z0-9_-]{1,40}$/
const SEPARATOR = '~'

// Clave de imagen: `nombre` o `carpeta/nombre` (una sola barra, el único
// separador que rutea la API). Los puntos no están permitidos: nada de `..`
// ni rutas relativas.
export function isValidImageKey(key) {
  if (typeof key !== 'string' || !key) return false
  const parts = key.split('/')
  if (parts.length === 1) return IMAGE_NAME_RE.test(key)
  if (parts.length === 2) {
    return IMAGE_FOLDER_RE.test(parts[0]) && IMAGE_NAME_RE.test(parts[1])
  }
  return false
}

// `img-goals/abc` → `img-goals~abc`. Las claves sin carpeta pasan intactas.
export function imageKeyToSegment(key) {
  const value = String(key ?? '')
  return value.includes('/') ? value.replace('/', SEPARATOR) : value
}

// `img-goals~abc` → `img-goals/abc`. Es el inverso y es idempotente: una clave
// sin carpeta no contiene `~` y se devuelve igual.
export function imageKeyFromSegment(segment) {
  const value = String(segment ?? '')
  return value.includes(SEPARATOR) ? value.replace(SEPARATOR, '/') : value
}
