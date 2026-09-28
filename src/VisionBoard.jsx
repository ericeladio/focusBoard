import './VisionBoard.css'

const LOKI = '/Matantei%20Loki%20Ragnarok.jpg'

const GOALS = [
  'Terminar el portafolio',
  '30 días de enfoque',
  'Leer 12 libros',
]

function VisionBoard() {
  return (
    <main className="wall">
      <div className="wall__texture" aria-hidden="true" />
      <div className="wall__vignette" aria-hidden="true" />

      <header className="wall__head">
        <h1 className="wall__title">Mi tablero de visión</h1>
        <p className="wall__sub">Siete cosas. Nada más.</p>
      </header>

      <div className="wall__grid">
        <figure className="frame frame--pin" style={{ '--tilt': '-4deg' }}>
          <div className="frame__photo">
            <img
              src={LOKI}
              alt="Portada del tomo 5 de Matantei Loki Ragnarok"
              style={{ objectPosition: '58% 6%' }}
            />
          </div>
          <figcaption className="frame__caption">No. 5</figcaption>
        </figure>

        <article
          className="note note--lined frame--clip"
          style={{ '--tilt': '-2.5deg' }}
        >
          <h2>Este año</h2>
          <ul className="note__list">
            {GOALS.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </article>

        <figure className="frame frame--tape" style={{ '--tilt': '3deg' }}>
          <div className="frame__photo">
            <img
              src={LOKI}
              alt=""
              style={{ objectPosition: '88% 88%' }}
            />
          </div>
          <figcaption className="frame__caption">El dorado</figcaption>
        </figure>

        <div
          className="frame frame--pin"
          style={{ '--tilt': '2deg' }}
          aria-hidden="true"
        >
          <div className="frame__photo frame__photo--empty" />
        </div>

        <article className="note note--sticky" style={{ '--tilt': '5deg' }}>
          <p>Menos scroll, más creación</p>
        </article>

        <div
          className="frame frame--tape"
          style={{ '--tilt': '-3.5deg' }}
          aria-hidden="true"
        >
          <div className="frame__photo frame__photo--empty" />
        </div>

        <div
          className="frame frame--pin"
          style={{ '--tilt': '4.5deg' }}
          aria-hidden="true"
        >
          <div className="frame__photo frame__photo--empty" />
        </div>
      </div>
    </main>
  )
}

export default VisionBoard
