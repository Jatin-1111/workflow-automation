import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { passwordProblem } from './password-policy'
import { PASSWORD } from '@/lib/validation/bounds'

const NITIN = { email: 'nitin@businessorbit.in', name: 'Nitin Sharma' }

describe('length', () => {
  it('refuses one that is too short', () => {
    assert.match(passwordProblem('short1') ?? '', /at least 8 characters/)
  })

  it('refuses one long enough to be an attack on the server', () => {
    // bcrypt only reads 72 bytes but hashes everything it is handed first.
    const huge = 'a1B!'.repeat(PASSWORD.max)
    assert.match(passwordProblem(huge) ?? '', /characters or fewer/)
  })

  it('accepts one at each boundary', () => {
    assert.equal(passwordProblem('Tr0ubad0'), null)
    assert.equal(passwordProblem('Tr0ub'.repeat(40).slice(0, PASSWORD.max)), null)
  })
})

describe('the passwords that get tried first', () => {
  it('refuses them', () => {
    for (const obvious of ['password', 'Password123', '12345678', 'letmein1', 'changeme']) {
      assert.match(passwordProblem(obvious) ?? '', /anybody would try/, obvious)
    }
  })

  it('sees through the decoration people add to them', () => {
    // A `1!` on the end is what a strength meter teaches, and it defeats
    // nobody, so the obvious word is looked for underneath it.
    assert.match(passwordProblem('P@ssw0rd') ?? '', /anybody would try|name or email/)
    assert.match(passwordProblem('password1!') ?? '', /anybody would try/)
  })
})

describe('a password made out of the account it protects', () => {
  it('refuses the email local part', () => {
    assert.match(passwordProblem('nitin2024!', NITIN) ?? '', /name or email/)
  })

  it('refuses a name', () => {
    assert.match(passwordProblem('Sharma!2024', NITIN) ?? '', /name or email/)
  })

  it('is not fooled by capitals or punctuation between the letters', () => {
    assert.match(passwordProblem('N-i-t-i-n-99', NITIN) ?? '', /name or email/)
  })

  it('ignores fragments too short to mean anything', () => {
    // A two-letter name would otherwise ban most of the dictionary.
    assert.equal(passwordProblem('Quibbling47!', { name: 'Jo Ng' }), null)
  })

  it('has nothing to compare against when nothing is known', () => {
    assert.equal(passwordProblem('Quibbling47!'), null)
  })
})

describe('variety', () => {
  it('refuses a single character repeated', () => {
    // It clears any length rule and nothing else.
    assert.match(passwordProblem('aaaaaaaaaa') ?? '', /variety/)
  })

  it('refuses whitespace pretending to be a password', () => {
    assert.match(passwordProblem('          ') ?? '', /more than spaces/)
  })
})

describe('a reasonable password', () => {
  it('is accepted', () => {
    for (const good of ['Quibbling47!', 'harbour-lamp-9', 'Th1stle&Fern']) {
      assert.equal(passwordProblem(good, NITIN), null, good)
    }
  })
})

describe('it says one thing at a time', () => {
  it('does not stack every complaint onto somebody still choosing', () => {
    const problem = passwordProblem('nitin', NITIN)
    assert.ok(problem)
    assert.equal(problem.split('.').filter(Boolean).length, 1)
  })
})
