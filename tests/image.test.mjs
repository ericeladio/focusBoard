import assert from 'node:assert/strict'

const { scaledSize, newImageKey, dataUrlToBlob, MAX_EDGE, WEBP_QUALITY, IMAGE_PREFIX } =
  await import('../src/lib/image.js')
const { isValidImageKey } = await import('../api/_lib/validate.js')
const { imageUrl } = await import('../src/lib/api.js')

// scaledSize: nunca amplía y recorta el lado más largo a MAX_EDGE
{
  const grande = scaledSize(4032, 3024)
  assert.deepEqual(
    { width: grande.width, height: grande.height },
    { width: 2048, height: 1536 },
    '2048 sobre el lado largo, proporción intacta',
  )
  assert.equal(grande.scale, MAX_EDGE / 4032)

  const cuadrada = scaledSize(5000, 5000)
  assert.deepEqual({ width: cuadrada.width, height: cuadrada.height }, { width: 2048, height: 2048 })

  const pequena = scaledSize(800, 600)
  assert.deepEqual(
    { width: pequena.width, height: pequena.height, scale: pequena.scale },
    { width: 800, height: 600, scale: 1 },
    'las imágenes chicas no se tocan',
  )

  const rotada = scaledSize(3024, 4032)
  assert.deepEqual({ width: rotada.width, height: rotada.height }, { width: 1536, height: 2048 })

  const custom = scaledSize(4096, 1024, 1024)
  assert.deepEqual({ width: custom.width, height: custom.height }, { width: 1024, height: 256 })

  assert.deepEqual(scaledSize(0, 0), { width: 0, height: 0, scale: 0 })
}

// la calidad inicial es la pedida (sin pérdida)
{
  assert.equal(WEBP_QUALITY, 0.9)
}

// newImageKey: vive en la carpeta del bucket y pasa el validador del proxy
{
  const keys = new Set()
  for (let i = 0; i < 200; i += 1) {
    const key = newImageKey()
    assert.ok(key.startsWith(IMAGE_PREFIX), `clave ${key} va dentro de ${IMAGE_PREFIX}`)
    assert.equal(isValidImageKey(key), true, `clave ${key} pasa el validador del proxy`)
    keys.add(key)
  }
  assert.equal(keys.size, 200, 'las claves no se repiten')
}

// la URL se arma por segmento: la barra de la carpeta no se escapa a %2F
{
  assert.equal(imageUrl('img-goals/abc-123'), '/api/images/img-goals/abc-123')
  assert.equal(imageUrl('abc-123'), '/api/images/abc-123')
  assert.equal(
    imageUrl('img goals/abc 123'),
    '/api/images/img%20goals/abc%20123',
    'espacios escapados, barra intacta',
  )
}

// dataUrlToBlob: base64 → bytes correctos
{
  const base64 = Buffer.from('hola webp', 'utf8').toString('base64')
  const blob = await dataUrlToBlob(`data:image/webp;base64,${base64}`)
  assert.equal(blob.type, 'image/webp')
  assert.equal(blob.size, 9)
  assert.equal(Buffer.from(await blob.arrayBuffer()).toString('utf8'), 'hola webp')
}

console.log('image.test: OK')
