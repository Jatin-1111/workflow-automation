import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { passwordProblem } from './password-policy'
import { PASSWORD } from '@/lib/validation/bounds'

describe('a password is checked for length and nothing else', () => {
  it('refuses one that is too short', () => {
    assert.match(passwordProblem('a'.repeat(PASSWORD.min - 1)) ?? '', /at least 8 characters/)
  })

  it('accepts one at the minimum', () => {
    assert.equal(passwordProblem('a'.repeat(PASSWORD.min)), null)
  })

  it('refuses one long enough to be an attack on the server', () => {
    // Not a strength rule: bcrypt hashes everything it is handed before
    // ignoring all but the first 72 bytes.
    assert.match(passwordProblem('a'.repeat(PASSWORD.max + 1)) ?? '', /characters or fewer/)
  })

  it('accepts one at the maximum', () => {
    assert.equal(passwordProblem('a'.repeat(PASSWORD.max)), null)
  })

  it('does not second-guess what people choose', () => {
    // These were all refused by an earlier, stricter version, which got in
    // the way of setting people up. Length is the only rule now.
    const about = { email: 'nitin@businessorbit.in', name: 'Nitin Sharma' }
    for (const chosen of ['password', '12345678', 'nitin2024', 'aaaaaaaa', 'P@ssw0rd']) {
      assert.equal(passwordProblem(chosen, about), null, chosen)
    }
  })
})
