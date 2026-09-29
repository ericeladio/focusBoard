#!/usr/bin/env node
// Migra las metas del tipo `lectura` al modo por páginas.
//   node scripts/migrate-paginas.mjs          → solo crea la columna (idempotente)
//   node scripts/migrate-paginas.mjs --apply  → columna + convierte las metas vivas
import { readFileSync, existsSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const ROOT = new URL('..', import.meta.url).pathname
const APPLY = process.argv.includes('--apply')
const CASO_266 = { nombre: '266', valor: 468, total: 1181 }
const TOTAL_DEFECTO = 200

function loadEnvLocal() {
  const file = `${ROOT}.env.local`
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || line.trim().startsWith('#')) continue
    let value = m[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Falta DATABASE_URL: cópiala en .env.local (ver .env.example).')
    process.exit(1)
  }

  const sql = neon(url)

  await sql.query('alter table goals add column if not exists total_paginas integer')
  console.log('columna goals.total_paginas: ok (idempotente)')

  const vivos = await sql.query(
    `select g.id, g.nombre, g.valor, g.seguimiento, g.total_paginas
       from goals g
       join types t on t.id = g.tipo_id
      where lower(trim(t.nombre)) = 'lectura'
        and g.deleted_at is null
      order by g.nombre`,
  )

  const listos = vivos.filter((row) => row.seguimiento === 'paginas')
  const pendientes = vivos.filter((row) => row.seguimiento !== 'paginas')
  console.log(`metas vivas de tipo lectura: ${vivos.length} (ya en páginas: ${listos.length}, por convertir: ${pendientes.length})`)

  if (!APPLY) {
    for (const row of vivos) {
      const estado = row.seguimiento === 'paginas'
        ? `páginas ${row.valor}/${row.total_paginas ?? '?'}`
        : `${row.seguimiento} ${row.valor}%`
      console.log(`  - ${row.nombre}: ${estado}`)
    }
    console.log('Sin --apply: solo se creó la columna. Vuelve a ejecutar con --apply para convertir las metas.')
    return
  }

  if (pendientes.length === 0) {
    console.log('Nada que convertir.')
    return
  }

  const casos = pendientes.map((row) => row.nombre === CASO_266.nombre ? row : null).filter(Boolean)
  if (casos.length === 0) {
    console.warn(`Aviso: no encontré la meta "${CASO_266.nombre}"; esa quedará en 0/${TOTAL_DEFECTO}.`)
  }

  for (const row of pendientes) {
    const especial = row.nombre === CASO_266.nombre
    const valor = especial ? CASO_266.valor : 0
    const total = especial ? CASO_266.total : TOTAL_DEFECTO

    await sql.query(
      `update goals
          set seguimiento = 'paginas',
              valor = $1,
              total_paginas = $2,
              ultimo_movimiento = ${especial ? 'current_date::date::text' : 'null'},
              updated_at = now()
        where id = $3`,
      [valor, total, row.id],
    )
    console.log(`  → ${row.nombre}: paginas ${valor}/${total}${especial ? ' (hoy)' : ''}`)
  }

  const despues = await sql.query(
    `select g.nombre, g.valor, g.total_paginas, g.seguimiento, g.ultimo_movimiento
       from goals g
       join types t on t.id = g.tipo_id
      where lower(trim(t.nombre)) = 'lectura' and g.deleted_at is null
      order by g.nombre`,
  )
  const malas = despues.filter((row) => row.seguimiento !== 'paginas' || row.total_paginas == null)
  for (const row of despues) {
    console.log(`  = ${row.nombre}: ${row.seguimiento} ${row.valor}/${row.total_paginas} mov=${row.ultimo_movimiento ?? 'null'}`)
  }
  if (malas.length > 0) {
    console.error(`Quedaron ${malas.length} metas sin el modo páginas: revisar.`)
    process.exit(1)
  }
  console.log(`Migración aplicada: ${pendientes.length} meta(s) convertida(s).`)
}

main().catch((error) => {
  console.error(error?.message ?? error)
  process.exit(1)
})
