import { useState } from 'react'

// Imagen genérica del muro/pool/cumplidos: foto que todavía no está (el
// objetivo se creó sin foto, o la clave de la base aún no se ha resuelto) o
// que la base no devuelve (404, red caída). SVG para que salga nítida tanto
// en la miniatura de 3rem de las filas como en la polaroid grande.
export const FOTO_GENERICA = '/foto-generica.svg'

function Foto({ src, alt = '', className, onLoad, ...resto }) {
  // `falla` es la URL real que ya dio error: mientras siga siendo la
  // actual, se ve la genérica (y si la URL cambia, se vuelve a intentar).
  // Si la genérica tampoco carga, `onError` no cambia nada: no hay bucle.
  const [falla, setFalla] = useState(null)
  const url = !src || src === falla ? FOTO_GENERICA : src

  return (
    <img
      {...resto}
      className={className}
      src={url}
      alt={alt}
      onError={() => setFalla(src)}
      onLoad={(event) => {
        // La genérica no manda medidas: el hueco mantiene su 4:5.
        if (url === FOTO_GENERICA) return
        onLoad?.(event)
      }}
    />
  )
}

export default Foto
