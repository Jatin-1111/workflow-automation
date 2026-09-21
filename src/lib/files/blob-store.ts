/**
 * Where bytes actually live.
 *
 * Local disk today, behind an interface shaped like object storage so moving
 * to S3 is a change to this file alone. Callers only ever hold an opaque
 * storage key.
 *
 * Deliberately free of `server-only`: the seed writes files through this too,
 * and a seeding script is not a request. The request-facing guard sits on
 * `storage.ts`, which is what upload handling goes through.
 */

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'

/**
 * Statically scoped to one folder under the project root.
 *
 * Building the root from a literal rather than an environment variable keeps
 * the bundler's file tracing narrow; otherwise the whole project is traced
 * into the deployment output.
 */
const UPLOAD_DIR_NAME = 'uploads'

function uploadRoot(): string {
  return join(process.cwd(), UPLOAD_DIR_NAME)
}

export interface StoredFile {
  storageKey: string
  sizeBytes: number
  checksum: string
}

/** Raised when a record points at bytes that are not there. */
export class FileMissing extends Error {}

/** Raised when a storage key tries to address something outside the root. */
export class InvalidStorageKey extends Error {}

function sanitiseSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_')
}

/**
 * Write bytes and return their locator.
 *
 * The stored name is generated rather than taken from any input, so a hostile
 * filename can never influence the path written to.
 */
export async function storeBytes(params: {
  instanceId: string
  extension: string
  bytes: Buffer
}): Promise<StoredFile> {
  const { instanceId, extension, bytes } = params

  // Built as a plain relative key rather than with `join`, so it stays a
  // portable locator: the same string will address an object store later.
  const storageKey = `${sanitiseSegment(instanceId)}/${randomUUID()}.${extension}`
  const destination = join(uploadRoot(), storageKey)

  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, bytes)

  return {
    storageKey,
    sizeBytes: bytes.byteLength,
    checksum: createHash('sha256').update(bytes).digest('hex'),
  }
}

/**
 * Delete every stored file.
 *
 * Only for reseeding: clearing the database without this leaves orphaned
 * blobs behind that no record points at.
 */
export async function clearStoredFiles(): Promise<void> {
  await rm(uploadRoot(), { recursive: true, force: true })
}

/** Read stored bytes back. Rejects any key that tries to escape the root. */
export async function readStoredFile(storageKey: string): Promise<Buffer> {
  const root = uploadRoot()
  const target = resolve(root, storageKey)

  // Keys are generated here, but they round-trip through the database, so
  // they are treated as untrusted on the way back in.
  if (target !== root && !target.startsWith(root + sep)) {
    throw new InvalidStorageKey('Storage key resolves outside the upload root')
  }

  try {
    return await readFile(target)
  } catch {
    throw new FileMissing(`No stored bytes for ${storageKey}`)
  }
}
