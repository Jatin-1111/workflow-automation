/**
 * Bytes in Cloudinary.
 *
 * Two deliberate choices, both about access rather than storage:
 *
 * Everything is uploaded as `raw`, including PDFs and images. We never
 * transform anything, so the image pipeline buys nothing — and raw avoids
 * both the format/public_id asymmetry images have and the account-level
 * restriction on delivering PDFs through the image pipeline.
 *
 * Everything is `authenticated`, so an asset cannot be fetched by its
 * public_id alone. This is defence in depth, not the access control itself:
 * a signed URL is a bearer token for one asset and says nothing about who is
 * asking, and per-viewer rules need a plan tier we are not on. The real check
 * stays where it can see the viewer — the download route, which reads bytes
 * through here and never hands a Cloudinary URL to a browser.
 */

import { createHash, randomUUID } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'
import {
  FileMissing,
  type BlobStore,
  type StoreRequest,
  type StoredFile,
} from './store-contract'

/**
 * Namespaces this deployment's assets.
 *
 * Worth setting per environment: `clearStoredFiles` deletes by this prefix,
 * so a staging reseed sharing a folder with production would take production
 * with it.
 */
const FOLDER = process.env.CLOUDINARY_FOLDER ?? 'business-orbit'

export function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_URL ??
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET),
  )
}

/**
 * Configured per call rather than once at import.
 *
 * The module is reached from a serverless function that may be cold, and from
 * the seed script, and reading the environment at call time means neither
 * depends on when this file was first imported.
 */
function configured() {
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })
  } else {
    cloudinary.config({ secure: true })
  }
  return cloudinary
}

function sanitiseSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_')
}

async function storeBytes(request: StoreRequest): Promise<StoredFile> {
  const { instanceId, extension, bytes } = request
  const api = configured()

  // The name is generated, never taken from the upload: a hostile filename
  // must not be able to steer where this is written.
  const publicId = `${FOLDER}/${sanitiseSegment(instanceId)}/${randomUUID()}.${extension}`

  const uploaded = await new Promise<{ public_id: string; bytes: number }>(
    (resolve, reject) => {
      const stream = api.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'raw',
          type: 'authenticated',
          // Ids are UUIDs, so this should never fire; it is here so a
          // collision fails loudly instead of destroying the earlier file.
          overwrite: false,
        },
        (error, result) => {
          if (error) return reject(new Error(error.message))
          if (!result) return reject(new Error('Cloudinary returned no result'))
          resolve({ public_id: result.public_id, bytes: result.bytes })
        },
      )
      stream.end(bytes)
    },
  )

  return {
    // Cloudinary's own id for the asset, which is all reading it back needs.
    storageKey: uploaded.public_id,
    sizeBytes: uploaded.bytes,
    checksum: createHash('sha256').update(bytes).digest('hex'),
  }
}

async function readStoredFile(storageKey: string): Promise<Buffer> {
  const api = configured()

  // The download API rather than a signed delivery URL. Signed delivery is
  // the tempting one - CDN-served, no api_key - but it answers 401 for an
  // authenticated asset on anything below the Advanced plan, where delivery
  // needs token or cookie auth. Measured, not assumed: every delivery variant
  // was tried against the account and only this one returns the bytes.
  //
  // The URL carries a signature and an expiry, and is built and spent inside
  // this request; it never reaches a browser.
  const url = api.utils.private_download_url(storageKey, '', {
    resource_type: 'raw',
    type: 'authenticated',
  })

  const response = await fetch(url)
  if (!response.ok) {
    throw new FileMissing(
      `Cloudinary returned ${response.status} for ${storageKey}`,
    )
  }

  return Buffer.from(await response.arrayBuffer())
}

/**
 * Remove everything under this deployment's folder.
 *
 * Paged, because Cloudinary deletes a bounded number per call and reports the
 * rest through a cursor — stopping at the first page would leave orphans that
 * look deleted.
 */
async function clearStoredFiles(): Promise<void> {
  const api = configured()
  let cursor: string | undefined

  do {
    const result = await api.api.delete_resources_by_prefix(`${FOLDER}/`, {
      resource_type: 'raw',
      type: 'authenticated',
      ...(cursor ? { next_cursor: cursor } : {}),
    })
    cursor = (result as { next_cursor?: string }).next_cursor
  } while (cursor)
}

export const cloudinaryStore: BlobStore = {
  storeBytes,
  readStoredFile,
  clearStoredFiles,
}
