import { paginasVisibles } from '../lib/pager.js'

// El rango y los controles de paginación, iguales en el pool y en cumplidos:
// "Mostrando 11–20 de 47" + ‹ Anterior, los números (pasadas 7 páginas los
// huecos se encogen con '…') y Siguiente ›, con los extremos deshabilitados.
// No pinta nada con una sola página.
function Pager({ desde, mostrados, total, totalPaginas, pagina, onIrA, etiqueta }) {
  if (totalPaginas <= 1) return null

  return (
    <nav className="pager" aria-label={etiqueta}>
      <p className="pager__count" aria-live="polite">
        Mostrando {desde + 1}–{desde + mostrados} de {total}
      </p>
      <div className="pager__nav">
        <button
          type="button"
          className="btn"
          disabled={pagina === 1}
          onClick={() => onIrA(pagina - 1)}
        >
          ‹ Anterior
        </button>

        <ul className="pager__pages">
          {paginasVisibles(pagina, totalPaginas).map((item, i) =>
            typeof item === 'number' ? (
              <li key={item}>
                <button
                  type="button"
                  className={item === pagina ? 'pager__page is-current' : 'pager__page'}
                  aria-current={item === pagina ? 'page' : undefined}
                  onClick={() => onIrA(item)}
                >
                  {item}
                </button>
              </li>
            ) : (
              <li key={`hueco-${i}`} className="pager__gap" aria-hidden="true">
                …
              </li>
            ),
          )}
        </ul>

        <button
          type="button"
          className="btn"
          disabled={pagina === totalPaginas}
          onClick={() => onIrA(pagina + 1)}
        >
          Siguiente ›
        </button>
      </div>
    </nav>
  )
}

export default Pager
