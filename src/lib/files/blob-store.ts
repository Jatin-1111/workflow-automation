/**
 * Where bytes actually live.
 *
 * Chooses a backend and presents the one interface everything else uses.
 * Callers only ever hold an opaque storage key, so nothing above this file
 * knows or cares which store answered.
 *
 * Deliberately free of `server-only`: the seed writes files through this too,
 * and a seeding script is not a request. The request-facing guard sits on
 * `storage.ts`, which is what upload handling goes through.
 */

import { cloudinaryConfigured, cloudinaryStore } from './cloudinary-store'
import { localStore } from './local-store'
import type { BlobStore, StoreRequest, StoredFile } from './store-contract'

/**
 * Cloudinary when it is configured, the local disk otherwise.
 *
 * Presence of credentials rather than an explicit mode setting: there is no
 * combination where someone wants Cloudinary configured and not used, and a
 * separate switch is one more thing to get wrong between environments.
 */
function backend(): BlobStore {
  return cloudinaryConfigured() ? cloudinaryStore : localStore
}

/** Which store is in use, for the seed to report and for diagnostics. */
export function storageBackendName(): 'cloudinary' | 'local disk' {
  return cloudinaryConfigured() ? 'cloudinary' : 'local disk'
}

export async function storeBytes(request: StoreRequest): Promise<StoredFile> {
  return backend().storeBytes(request)
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  return backend().readStoredFile(storageKey)
}

/**
 * Delete every stored file.
 *
 * Only for reseeding: clearing the database without this leaves orphaned
 * blobs behind that no record points at.
 */
export async function clearStoredFiles(): Promise<void> {
  return backend().clearStoredFiles()
}

export {
  FileMissing,
  InvalidStorageKey,
  type BlobStore,
  type StoreRequest,
  type StoredFile,
} from './store-contract'
