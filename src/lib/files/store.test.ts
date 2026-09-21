import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { localStore } from './local-store'
import { cloudinaryStore } from './cloudinary-store'
import { storageBackendName } from './blob-store'
import { FileMissing, InvalidStorageKey } from './store-contract'

const BYTES = Buffer.from('a proposal, more or less')

describe('the local store', () => {
  it('gives back exactly what it was given', async () => {
    const stored = await localStore.storeBytes({
      instanceId: 'BO-INS-00001',
      extension: 'pdf',
      bytes: BYTES,
    })

    assert.equal(stored.sizeBytes, BYTES.byteLength)
    assert.deepEqual(await localStore.readStoredFile(stored.storageKey), BYTES)
  })

  it('names the file itself rather than trusting an id', async () => {
    const stored = await localStore.storeBytes({
      instanceId: '../../etc',
      extension: 'pdf',
      bytes: BYTES,
    })

    // The separators are what make a traversal, not the dots: `..` has to stop
    // being a segment of its own. It may survive inside one harmlessly.
    assert.ok(
      stored.storageKey.split('/').every((segment) => segment !== '..'),
      stored.storageKey,
    )
    // And the proof it landed inside the root is that reading it back works.
    assert.deepEqual(await localStore.readStoredFile(stored.storageKey), BYTES)
  })

  it('refuses a key that climbs out of the upload root', async () => {
    await assert.rejects(
      () => localStore.readStoredFile('../../../etc/passwd'),
      InvalidStorageKey,
    )
  })

  it('says so when the bytes are not there', async () => {
    await assert.rejects(
      () => localStore.readStoredFile('BO-INS-00001/nothing.pdf'),
      FileMissing,
    )
  })
})

describe('choosing a backend', () => {
  const saved = { ...process.env }

  afterEach(() => {
    for (const key of ['CLOUDINARY_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      delete process.env[key]
      if (saved[key]) process.env[key] = saved[key]
    }
  })

  it('stays on disk when nothing is configured', () => {
    for (const key of ['CLOUDINARY_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      delete process.env[key]
    }
    assert.equal(storageBackendName(), 'local disk')
  })

  it('uses Cloudinary once credentials are present', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud'
    process.env.CLOUDINARY_API_KEY = '123'
    process.env.CLOUDINARY_API_SECRET = 'abc'
    assert.equal(storageBackendName(), 'cloudinary')
  })

  it('does not half-configure from an incomplete set', () => {
    for (const key of ['CLOUDINARY_URL', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      delete process.env[key]
    }
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud'
    assert.equal(storageBackendName(), 'local disk')
  })
})

describe('how Cloudinary is asked for a file', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  /** Capture the URL without going near the network. */
  async function urlFetchedFor(storageKey: string): Promise<string> {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud'
    process.env.CLOUDINARY_API_KEY = '123'
    process.env.CLOUDINARY_API_SECRET = 'abc'

    let seen = ''
    globalThis.fetch = (async (input: string) => {
      seen = String(input)
      return { ok: true, arrayBuffer: async () => BYTES.buffer }
    }) as unknown as typeof fetch

    await cloudinaryStore.readStoredFile(storageKey)
    return seen
  }

  it('asks for a signed, authenticated, raw asset', async () => {
    const url = await urlFetchedFor('business-orbit/BO-INS-00001/abc.pdf')

    // Each of these is load-bearing: `upload` in place of `authenticated`
    // would make the asset readable by anyone holding the id, and without the
    // signature the request is not ours at all.
    assert.match(url, /\/raw\/download\?/)
    assert.match(url, /[?&]type=authenticated(&|$)/)
    assert.match(url, /[?&]signature=[a-f0-9]+/)
    assert.match(url, /public_id=business-orbit%2FBO-INS-00001%2Fabc\.pdf/)
  })

  it('reports a file the store does not have', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud'
    process.env.CLOUDINARY_API_KEY = '123'
    process.env.CLOUDINARY_API_SECRET = 'abc'

    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch

    await assert.rejects(
      () => cloudinaryStore.readStoredFile('business-orbit/gone.pdf'),
      FileMissing,
    )
  })
})
