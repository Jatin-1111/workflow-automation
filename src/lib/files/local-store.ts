/**
 * Bytes on the local disk.
 *
 * The default when no object store is configured, which keeps `npm run dev`
 * and the seed working with nothing to sign up for. Not suitable for a
 * serverless deployment, where the filesystem does not survive the request.
 */

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import {
  FileMissing,
  InvalidStorageKey,
  type BlobStore,
  type StoreRequest,
  type StoredFile,
} from './store-contract'

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

function sanitiseSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_')
}

/**
 * Write bytes and return their locator.
 *
 * The stored name is generated rather than taken from any input, so a hostile
 * filename can never influence the path written to.
 */
async function storeBytes(request: StoreRequest): Promise<StoredFile> {
  const { instanceId, extension, bytes } = request

  // A plain relative key rather than a built path, so it stays portable: the
  // same string addresses an object without change.
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

async function readStoredFile(storageKey: string): Promise<Buffer> {
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

async function clearStoredFiles(): Promise<void> {
  await rm(uploadRoot(), { recursive: true, force: true })
}

export const localStore: BlobStore = { storeBytes, readStoredFile, clearStoredFiles }
