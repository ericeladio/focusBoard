# focusBoard · Vision Board

Muro de visión local-first: polaroids con objetivos, rachas, compuestas y una
nota rayada sobre pared crema. PWA (funciona sin red) con sync opcional a
Postgres (Neon) + R2 (Cloudflare) a través de la API de Vercel.

## Comandos

| Comando             | Qué hace                                        |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | desarrollo con HMR + API local en `/api/*`       |
| `npm run build`     | build de producción + service worker            |
| `npm run preview`   | sirve `dist/` en local                          |
| `npm test`          | suites de Node (`tests/*.test.mjs`)             |
| `npm run lint`      | oxlint                                          |
| `npm run db:migrate`| aplica `db/schema.sql` con `DATABASE_URL`       |
| `node scripts/smoke.mjs` | prueba login, sync e imágenes contra BD y R2 |
| `npm run icons`     | regenera los iconos PWA                         |

## Entorno

Copia `.env.example` a `.env.local` (gitignored) y pega tus valores. En Vercel
van los mismos nombres en **Project → Settings → Environment Variables**.

| Variable            | Para qué                                              |
| ------------------- | ----------------------------------------------------- |
| `DATABASE_URL`      | Neon Postgres (usa la cadena del **pooler**)          |
| `R2_ACCOUNT_ID`     | Cloudflare R2 (dashboard R2 → overview)               |
| `R2_ACCESS_KEY_ID`  | token R2 (API Tokens)                                 |
| `R2_SECRET_ACCESS_KEY` | idem                                                 |
| `R2_BUCKET`         | bucket de fotos (`focusboard`)                        |
| `PASSCODE`          | PIN de entrada (mínimo 4 caracteres)                  |
| `SESSION_SECRET`    | firma de la cookie de sesión (32+ bytes hex)          |

## Desarrollo local

`npm run dev` levanta la API con la app: `scripts/dev-api.mjs` es un plugin de
Vite que enruta `/api/login`, `/api/logout`, `/api/sync` y `/api/images/*` a
las mismas funciones de `api/` que corren en Vercel, con `.env.local` cargado
en el proceso. Funciona igual que producción, sin Vercel CLI.

- **Escribe en los datos reales**: local y despliegue comparten `USER_ID` y
  `PASSCODE`, así que lo que pruebes en local aparece en la app en línea.
- Único ajuste: en `http://localhost` la cookie de sesión sale sin `Secure`
  (el navegador la descartaría); en producción la emite `api/_lib/session.js`
  con `Secure` intacto.
- Si falta alguna variable, el servidor la lista al arrancar. `npm run build`
  no toca el plugin (va con `apply: 'serve'`).
- Si `/api/*` no está disponible (por ejemplo `vite` solo, sin el plugin), el
  cliente ya no falla en silencio: el badge del sync dice **Sin servidor** y en
  el `title` explica el motivo; los cambios siguen guardados en IndexedDB.

## Deploy en Vercel

1. Importa el repo: `vercel.json` ya fija `npm run build` → `dist/` y el rewrite
   SPA (`/api/*` queda fuera).
2. Pega las variables de entorno (incluida la nueva `DATABASE_URL`).
3. `npm run db:migrate` desde tu máquina (o un job temporal) para crear tablas.
4. Deploy. Sin sesión la app funciona en local; con passcode sincroniza.

## Cómo guarda datos

- **Local**: `localStorage` (metas, tipos, nota, lápidas) + IndexedDB (blobs de
  imágenes y outbox de operaciones pendientes).
- **Sync**: LWW por registro (`updatedAt` sellado con
  `max(Date.now(), serverTime+1)`); cada sync hace *pull → subir imágenes →
  subir outbox → borrar objetos ya no usados*; borrados dejan lápidas de 90 días.
  Conflictos: gana el sello más nuevo, a empate gana el borrado.
- **Imágenes**: WebP máx. 2048px calidad .9 (JPEG en Safari), blob local +
  `PUT /api/images/<clave>` a R2 privado dentro de la carpeta `img-goals/` (la
  clave es `img-goals/<uuid>`: una sola barra, sin puntos ni espacios). Se sirven
  por el proxy con caché `CacheFirst` y, sin red, el SW reencola la subida
  (Background Sync). Al reemplazar o borrar una foto se envía `DELETE` al volver
  la red; si otra meta la sigue usando, el servidor responde 409 y se conserva.

## Estructura

```
api/            funciones de Vercel (sync, login, proxy de imágenes)
db/schema.sql   esquema idempotente (Neon/Postgres)
scripts/        migrate.mjs (esquema), smoke.mjs (prueba de punta a punta), dev-api.mjs (API en dev)
src/lib/        store React + lww, sync, idb, image, api
src/components/ tarjetas, formularios, SyncBadge, LoginSheet
tests/          node --test
```
