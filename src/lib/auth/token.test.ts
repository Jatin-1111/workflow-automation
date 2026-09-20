import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { signSessionToken, verifySessionToken } from './token'
import type { UserId } from '@/lib/types/ids'

const SECRET = 'test-secret-value-that-is-long-enough-for-hs256'
const OTHER_SECRET = 'a-completely-different-secret-value-for-testing'
const USER = 'BO-USR-00001' as UserId

function inAnHour() {
  return new Date(Date.now() + 60 * 60 * 1000)
}

describe('session tokens', () => {
  it('round-trips a user id', async () => {
    const token = await signSessionToken(USER, inAnHour(), SECRET)
    assert.deepEqual(await verifySessionToken(token, SECRET), { userId: USER })
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await signSessionToken(USER, inAnHour(), OTHER_SECRET)
    assert.equal(await verifySessionToken(token, SECRET), null)
  })

  it('rejects an expired token', async () => {
    const expired = new Date(Date.now() - 1000)
    const token = await signSessionToken(USER, expired, SECRET)
    assert.equal(await verifySessionToken(token, SECRET), null)
  })

  it('rejects a tampered payload', async () => {
    const token = await signSessionToken(USER, inAnHour(), SECRET)
    const [header, payload, signature] = token.split('.')
    const forged = Buffer.from(
      JSON.stringify({ userId: 'BO-USR-00002' }),
    ).toString('base64url')
    assert.equal(
      await verifySessionToken(`${header}.${forged}.${signature}`, SECRET),
      null,
    )
    assert.ok(payload.length > 0)
  })

  it('rejects missing and malformed tokens', async () => {
    assert.equal(await verifySessionToken(undefined, SECRET), null)
    assert.equal(await verifySessionToken('', SECRET), null)
    assert.equal(await verifySessionToken('not-a-jwt', SECRET), null)
  })

  it('rejects a validly signed token whose claim is not a user id', async () => {
    // A correctly signed token is still untrusted if the payload is wrong.
    const token = await signSessionToken(
      'BO-PRJ-00001' as unknown as UserId,
      inAnHour(),
      SECRET,
    )
    assert.equal(await verifySessionToken(token, SECRET), null)
  })

  it('throws rather than signing with no secret configured', async () => {
    const saved = process.env.SESSION_SECRET
    delete process.env.SESSION_SECRET
    try {
      await assert.rejects(() => signSessionToken(USER, inAnHour()))
    } finally {
      if (saved !== undefined) process.env.SESSION_SECRET = saved
    }
  })
})
