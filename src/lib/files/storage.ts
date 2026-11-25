/**
 * Upload handling.
 *
 * Validates what a request is trying to store, then hands the bytes to the
 * blob store. Kept request-facing and server-only; the store underneath is
 * plain enough for a seeding script to use as well.
 */

import 'server-only'
import { storeBytes, type StoredFile } from './blob-store'
import { ACCEPTED_EXTENSIONS, extensionOf } from './file-types'

export const MAX_FILE_BYTES = 25 * 1024 * 1024

export class FileRejected extends Error {}

export { extensionOf }

/** Validate an uploaded file and store it. */
export async function storeFile(params: {
  instanceId: string
  file: File
  allowedExtensions?: string[]
}): Promise<StoredFile> {
  const { instanceId, file } = params

  if (file.size === 0) throw new FileRejected('That file is empty.')
  if (file.size > MAX_FILE_BYTES) {
    throw new FileRejected(
      `Files must be ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB or smaller.`,
    )
  }

  const extension = extensionOf(file.name)
  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    throw new FileRejected(`${extension || 'That file type'} is not an accepted file type.`)
  }

  const allowed = params.allowedExtensions
  if (allowed && allowed.length > 0 && !allowed.includes(extension)) {
    throw new FileRejected(`This stage accepts ${allowed.join(', ')} files.`)
  }

  return storeBytes({
    instanceId,
    extension,
    bytes: Buffer.from(await file.arrayBuffer()),
  })
}

export {
  FileMissing,
  InvalidStorageKey,
  readStoredFile,
  storeBytes,
  type StoredFile,
} from './blob-store'
