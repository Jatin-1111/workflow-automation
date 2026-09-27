import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dateValue, emailValue, phoneValue } from './scalars'
import { DATE_LIMITS, PHONE_LIMITS, TEXT_LIMITS } from './bounds'

function value<T>(result: { ok: boolean; value?: T; message?: string }): T {
  assert.ok(result.ok, `expected acceptance, got: ${result.message}`)
  return result.value as T
}

function message(result: { ok: boolean; message?: string }): string {
  assert.ok(!result.ok, 'expected a refusal')
  return result.message as string
}

describe('email', () => {
  it('folds case, because it is the sign-in identity', () => {
    // A unique index sits on this. Without folding, Nitin@ and nitin@ are
    // two accounts and only one of them can ever sign in.
    assert.equal(value(emailValue('  Nitin@BusinessOrbit.IN  ')), 'nitin@businessorbit.in')
  })

  it('refuses what the old inline regex let through', () => {
    // The person form used /^[^\s@]+@[^\s@]+\.[^\s@]+$/, which accepted
    // anything with an @ and a dot after it.
    for (const bad of ['a@b', 'a@@b.co', 'a b@c.co', '@b.co', 'a@.co', 'a@b.']) {
      assert.match(message(emailValue(bad)), /email address/, bad)
    }
  })

  it('refuses one longer than an address can be', () => {
    const long = `${'a'.repeat(TEXT_LIMITS.email)}@example.com`
    assert.match(message(emailValue(long)), /characters or fewer/)
  })

  it('puts the caller’s label at the front', () => {
    assert.match(message(emailValue('nope', 'Contact email')), /^Contact email/)
  })

  it('refuses something that is not text', () => {
    assert.match(message(emailValue(undefined)), /email address/)
  })
})

describe('phone', () => {
  it('accepts the formats people actually write', () => {
    for (const good of ['+91 98765 43210', '(020) 7946 0958', '020-7946-0958']) {
      assert.equal(value(phoneValue(good)), good)
    }
  })

  it('refuses prose', () => {
    assert.match(message(phoneValue('call me on my mobile')), /digits, spaces/)
  })

  it('refuses too few or too many digits', () => {
    assert.match(message(phoneValue('12345')), /between/)
    assert.match(message(phoneValue('9'.repeat(PHONE_LIMITS.maxDigits + 1))), /between/)
  })
})

describe('a joining date', () => {
  it('is read as UTC midnight, so it cannot shift a day', () => {
    assert.equal(value(dateValue('2024-01-15')).toISOString(), '2024-01-15T00:00:00.000Z')
  })

  it('catches a mistyped year instead of storing it forever', () => {
    // `new Date('0202-01-15')` is a perfectly valid Date, which is why
    // checking only for NaN let this through.
    assert.match(message(dateValue('0202-01-15', 'Joining date')), /between 1900 and 2100/)
    assert.match(message(dateValue('3024-01-15', 'Joining date')), /between 1900 and 2100/)
  })

  it('refuses a format that means different things in different places', () => {
    // new Date('01/02/2024') is January in one runtime and February in
    // another, and neither is a thing to store in somebody's record.
    for (const bad of ['01/02/2024', '15-01-2024', 'Jan 15 2024', 'yesterday']) {
      assert.match(message(dateValue(bad)), /must be a date/, bad)
    }
  })

  it('refuses a day that does not exist', () => {
    assert.match(message(dateValue('2024-02-31')), /date|real/)
  })

  it('accepts the boundaries themselves', () => {
    assert.equal(value(dateValue('1900-01-01')).getTime(), DATE_LIMITS.min.getTime())
  })

  it('accepts a Date it is handed, and still bounds it', () => {
    const given = new Date('2020-06-01T00:00:00.000Z')
    assert.equal(value(dateValue(given)).getTime(), given.getTime())
    assert.match(message(dateValue(new Date('1200-01-01'))), /between 1900 and 2100/)
    assert.match(message(dateValue(new Date('nonsense'))), /not a real date/)
  })
})

describe('one answer, two callers', () => {
  it('a stage field and a person record read email the same way', async () => {
    // These were two different rules before: a real parser on one side
    // and a regex written inline on the other.
    const { coerceFieldValue } = await import('./field-value')
    const field = {
      key: 'contact_email',
      label: 'Contact email',
      type: 'email' as const,
      required: false,
    }

    for (const candidate of ['a@b', 'priya@abctech.example', 'A@B.CO']) {
      const viaField = coerceFieldValue(field, candidate)
      const viaScalar = emailValue(candidate, 'Contact email')
      assert.equal(viaField.ok, viaScalar.ok, candidate)
      if (viaField.ok && viaScalar.ok) {
        assert.equal(viaField.value, viaScalar.value, candidate)
      }
    }
  })
})
