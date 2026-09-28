import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

let client = null

export function r2() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    })
  }
  return client
}

const bucket = () => process.env.R2_BUCKET

export async function putObject(key, body, contentType) {
  await r2().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  )
}

export async function getObject(key) {
  try {
    const result = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }))
    const bytes = await result.Body.transformToByteArray()
    return { bytes, contentType: result.ContentType, etag: result.ETag }
  } catch (error) {
    if (error?.name === 'NoSuchKey') return null
    throw error
  }
}

export async function deleteObject(key) {
  try {
    await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
  } catch (error) {
    if (error?.name !== 'NoSuchKey') throw error
  }
}
