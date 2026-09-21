/**
 * What a byte store has to do, and what it may fail with.
 *
 * Callers only ever hold an opaque storage key: nothing above this line knows
 * whether the bytes are on a disk or in Cloudinary, which is what lets the
 * two be swapped without touching an upload handler or a download route.
 */

export interface StoredFile {
  /** Opaque locator, meaningful only to the store that issued it. */
  storageKey: string
  sizeBytes: number
  checksum: string
}

export interface StoreRequest {
  instanceId: string
  extension: string
  bytes: Buffer
}

export interface BlobStore {
  storeBytes(request: StoreRequest): Promise<StoredFile>
  readStoredFile(storageKey: string): Promise<Buffer>
  /** Only for reseeding: clearing records alone would orphan the bytes. */
  clearStoredFiles(): Promise<void>
}

/** Raised when a record points at bytes that are not there. */
export class FileMissing extends Error {}

/** Raised when a storage key tries to address something it should not. */
export class InvalidStorageKey extends Error {}
