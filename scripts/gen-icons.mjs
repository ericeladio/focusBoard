// Genera los iconos PWA dibujando en píxeles (sin dependencias):
// pared sage + polaroid inclinada con cinta salvia, según DESIGN.md.
// Uso: node scripts/gen-icons.mjs
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'icons')

const WALL = [0xe7, 0xe4, 0xd6]
const POLAROID = [0xfb, 0xf9, 0xf3]
const PHOTO = [0x23, 0x21, 0x1d]
const INK = [0x56, 0x50, 0x3f]
const TAPE = [0xb0, 0xb6, 0x9c]
const SHADOW = [0x4a, 0x44, 0x32]

const SS = 4 // supersampling
const ANGLE = (-4 * Math.PI) / 180

function crc32(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function writePNG(file, size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const rowLen = size * 4
  const raw = Buffer.alloc(size * (rowLen + 1))
  for (let y = 0; y < size; y += 1) {
    raw[y * (rowLen + 1)] = 0 // filtro none
    rgba.copy(raw, y * (rowLen + 1) + 1, y * rowLen, (y + 1) * rowLen)
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, png)
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

// Distancia con signo a un rect de media-lados (hw, hh) rotado en el marco local.
function sdRect(px, py, hw, hh) {
  const qx = Math.abs(px) - hw
  const qy = Math.abs(py) - hh
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0)
}

// Un punto (u,v normalizado) al marco local de una capa rotada.
function local(u, v, cx, cy, angle) {
  const dx = u - cx
  const dy = v - cy
  const cos = Math.cos(-angle)
  const sin = Math.sin(-angle)
  return [dx * cos - dy * sin, dx * sin + dy * cos]
}

function coverage(sd, pixel) {
  return Math.min(1, Math.max(0, 0.5 - sd / pixel))
}

// Compone las capas de la polaroid en un punto.
function sample(u, v, k, size) {
  let col = WALL
  const pixel = 1 / (size * SS)

  // sombra proyectada
  const [sx, sy] = local(u, v, 0.5 + 0.008 * k, 0.5 + 0.016 * k, ANGLE)
  const sdS = sdRect(sx, sy, 0.26 * k, 0.31 * k)
  if (sdS > 0) {
    const blur = 0.05 * k
    const a = Math.max(0, 1 - sdS / blur) * 0.45
    col = mix(col, SHADOW, a)
  }

  const [px, py] = local(u, v, 0.5, 0.5, ANGLE)
  const sdP = sdRect(px, py, 0.26 * k, 0.31 * k)
  const covP = coverage(sdP, pixel)
  if (covP > 0) col = mix(col, POLAROID, covP)

  if (sdP < 0) {
    const pad = 0.055 * k
    const sdPhoto = sdRect(px, py + 0.0575 * k, 0.26 * k - pad, 0.1975 * k)
    col = mix(col, PHOTO, coverage(sdPhoto, pixel))

    const sdL1 = sdRect(px - 0, py - 0.2 * k, 0.19 * k, 0.012 * k)
    col = mix(col, INK, coverage(sdL1, pixel) * 0.95)
    const sdL2 = sdRect(px - 0.08 * k, py - 0.26 * k, 0.1 * k, 0.012 * k)
    col = mix(col, INK, coverage(sdL2, pixel) * 0.95)
  }

  const [tx, ty] = local(u, v, 0.5, 0.5 - 0.31 * k, ANGLE)
  const sdT = sdRect(tx, ty, 0.18 * k, 0.045 * k)
  const covT = coverage(sdT, pixel)
  if (covT > 0) col = mix(col, TAPE, covT * 0.78)

  return col
}

function render(size, k) {
  const ss = size * SS
  const buf = Buffer.alloc(size * size * 4)
  const sampleArea = SS * SS
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const u = (x * SS + sx + 0.5) / ss
          const v = (y * SS + sy + 0.5) / ss
          const [pr, pg, pb] = sample(u, v, k, size)
          r += pr
          g += pg
          b += pb
        }
      }
      const i = (y * size + x) * 4
      buf[i] = Math.round(r / sampleArea)
      buf[i + 1] = Math.round(g / sampleArea)
      buf[i + 2] = Math.round(b / sampleArea)
      buf[i + 3] = 255
    }
  }
  return buf
}

const targets = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.78],
  ['apple-touch-icon.png', 180, 1],
]

for (const [name, size, k] of targets) {
  writePNG(path.join(OUT, name), size, render(size, k))
  console.log('✓', name)
}

// Foto placeholder 4:5 para el seed (el jpg original no está en el repo).
function renderSeed() {
  const w = 640
  const h = 800
  const buf = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const t = (x + y) / (w + h)
      const band = Math.abs(((x - y) / (w + h)) % 0.5 - 0.25)
      const l = band < 0.04 ? 0.16 : 0
      const vig = Math.hypot(x / w - 0.5, y / h - 0.5) * 0.35
      const i = (y * w + x) * 4
      buf[i] = Math.round(0x23 + 0x2f * t + l * 255 * 0.3 - vig * 40)
      buf[i + 1] = Math.round(0x21 + 0x2a * t + l * 255 * 0.3 - vig * 40)
      buf[i + 2] = Math.round(0x1d + 0x24 * t + l * 255 * 0.3 - vig * 40)
      buf[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const rowLen = w * 4
  const raw = Buffer.alloc(h * (rowLen + 1))
  for (let y = 0; y < h; y += 1) {
    raw[y * (rowLen + 1)] = 0
    buf.copy(raw, y * (rowLen + 1) + 1, y * rowLen, (y + 1) * rowLen)
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.writeFileSync(path.join(ROOT, 'public', 'seed-photo.png'), png)
  console.log('✓ seed-photo.png')
}

renderSeed()
