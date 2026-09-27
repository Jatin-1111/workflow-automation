import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { coerceFieldValue } from './field-value'
import { DATE_LIMITS, NUMBER_LIMITS, PHONE_LIMITS, TEXT_LIMITS } from './bounds'
import { FIELD_TYPES } from '@/lib/types/workflow'
import type { FieldDefinition, FieldType } from '@/lib/types/workflow'

function field(type: FieldType, extra: Partial<FieldDefinition> = {}): FieldDefinition {
  return { key: 'answer', label: 'Answer', type, required: false, ...extra }
}

/** The stored value, or the test fails with the refusal it got instead. */
function value(definition: FieldDefinition, raw: unknown) {
  const result = coerceFieldValue(definition, raw)
  assert.ok(result.ok, `expected ${JSON.stringify(raw)} to be accepted: ${!result.ok ? result.message : ''}`)
  return result.value
}

/** The refusal message, or the test fails because it was accepted. */
function refusal(definition: FieldDefinition, raw: unknown): string {
  const result = coerceFieldValue(definition, raw)
  assert.ok(!result.ok, `expected ${JSON.stringify(raw)} to be refused`)
  return result.message
}

describe('every declared field type is handled', () => {
  it('coerces something for each of them', () => {
    // The switch is exhaustive by type, but a type added to FIELD_TYPES and
    // handled only by accident would still compile. Exercise the whole set.
    for (const type of FIELD_TYPES) {
      const definition = field(type, type === 'select' ? { options: ['Yes'] } : {})
      const result = coerceFieldValue(definition, '')
      assert.ok(result.ok, `${type} refused a blank value`)
    }
  })
})

describe('a blank answer is absence, not a type error', () => {
  it('is null whatever the field type is', () => {
    // Otherwise an optional number left empty reports a type complaint, and
    // a required one reports two.
    for (const type of FIELD_TYPES) {
      const definition = field(type, type === 'select' ? { options: ['Yes'] } : {})
      for (const blank of ['', '   ', undefined, null]) {
        assert.equal(value(definition, blank), null, `${type} with ${JSON.stringify(blank)}`)
      }
    }
  })
})

describe('number', () => {
  const number = field('number')

  it('stores a number, not the string that arrived', () => {
    // The whole point: reports add these up and conditions compare them.
    assert.strictEqual(value(number, '42'), 42)
    assert.strictEqual(value(number, ' 42 '), 42)
    assert.strictEqual(value(number, '-7.5'), -7.5)
    assert.strictEqual(value(number, 42), 42)
  })

  it('does not read an empty string as zero', () => {
    // Number('') is 0, and so is zod's coerce.number(). An optional figure
    // left blank must not become a recorded zero.
    assert.equal(value(number, ''), null)
    assert.equal(value(number, '   '), null)
  })

  it('does not read hex as a number', () => {
    // Number('0x10') is 16. A deal value of 0x10 is a typo, not sixteen.
    assert.match(refusal(number, '0x10'), /must be a number/)
  })

  it('refuses prose and half-numbers', () => {
    for (const bad of ['abc', '12abc', '1.2.3', 'Infinity', 'NaN', '--5', '1e5']) {
      assert.match(refusal(number, bad), /must be a number|too large/, bad)
    }
  })

  it('says something useful about thousands separators', () => {
    // The single most likely thing a person types into a money field.
    assert.match(refusal(number, '1,000'), /without commas/)
  })

  it('refuses a figure too large to store accurately', () => {
    assert.match(refusal(number, String(NUMBER_LIMITS.max + 1)), /outside the range/)
    assert.match(refusal(number, String(NUMBER_LIMITS.min - 1)), /outside the range/)
  })

  it('accepts the boundaries themselves', () => {
    assert.strictEqual(value(number, String(NUMBER_LIMITS.max)), NUMBER_LIMITS.max)
    assert.strictEqual(value(number, String(NUMBER_LIMITS.min)), NUMBER_LIMITS.min)
  })
})

describe('currency', () => {
  const currency = field('currency', { label: 'Deal value' })

  it('takes an amount to two decimal places', () => {
    assert.strictEqual(value(currency, '1250.75'), 1250.75)
    assert.strictEqual(value(currency, '1250'), 1250)
  })

  it('refuses a third decimal place, which is money nobody can pay', () => {
    assert.match(refusal(currency, '10.005'), /two decimal places/)
  })

  it('allows a negative amount', () => {
    // A credit or an adjustment is a real figure; this is not the place to
    // decide a business rule about it.
    assert.strictEqual(value(currency, '-40.50'), -40.5)
  })

  it('names the field in its refusal', () => {
    assert.match(refusal(currency, 'lots'), /^Deal value/)
  })
})

describe('date', () => {
  const date = field('date', { label: 'Deadline' })

  it('stores a Date at UTC midnight, so it cannot shift a day', () => {
    const stored = value(date, '2024-01-15') as Date
    assert.ok(stored instanceof Date)
    assert.equal(stored.toISOString(), '2024-01-15T00:00:00.000Z')
  })

  it('takes only the format the date input actually submits', () => {
    for (const bad of ['tomorrow', '15/01/2024', '2024-1-5', 'Jan 15 2024', '20240115']) {
      assert.match(refusal(date, bad), /must be a date/, bad)
    }
  })

  it('refuses a date that is not real', () => {
    assert.match(refusal(date, '2024-02-31'), /must be a date|not a real date/)
  })

  it('catches a mistyped year rather than storing it forever', () => {
    assert.match(refusal(date, '0202-01-15'), /between 1900 and 2100/)
    assert.match(refusal(date, '3024-01-15'), /between 1900 and 2100/)
  })

  it('accepts a Date it is handed directly', () => {
    const given = new Date('2020-06-01T00:00:00.000Z')
    assert.equal((value(date, given) as Date).getTime(), given.getTime())
    assert.match(refusal(date, new Date('nonsense')), /not a real date/)
  })

  it('accepts the boundaries themselves', () => {
    assert.ok(value(date, '1900-01-01') instanceof Date)
    assert.equal((value(date, '1900-01-01') as Date).getTime(), DATE_LIMITS.min.getTime())
  })
})

describe('checkbox', () => {
  const checkbox = field('checkbox', { label: 'Confirmed' })

  it('reads "false" as false', () => {
    // Boolean('false') is true. Coercing the obvious way records the
    // opposite of what was sent, silently and permanently.
    assert.strictEqual(value(checkbox, 'false'), false)
    assert.strictEqual(value(checkbox, 'no'), false)
    assert.strictEqual(value(checkbox, 'off'), false)
    assert.strictEqual(value(checkbox, '0'), false)
  })

  it('reads the affirmative spellings a form might send', () => {
    for (const yes of ['true', 'yes', 'on', '1', 'TRUE', ' Yes ']) {
      assert.strictEqual(value(checkbox, yes), true, yes)
    }
  })

  it('refuses a word it cannot read rather than guessing false', () => {
    assert.match(refusal(checkbox, 'maybe'), /ticked or left clear/)
    assert.match(refusal(checkbox, '2'), /ticked or left clear/)
  })

  it('takes a real boolean', () => {
    assert.strictEqual(value(checkbox, true), true)
    assert.strictEqual(value(checkbox, false), false)
  })
})

describe('select', () => {
  const select = field('select', { label: 'NDA required', options: ['Yes', 'No'] })

  it('accepts a declared option', () => {
    assert.equal(value(select, 'Yes'), 'Yes')
  })

  it('refuses a value that is not one of its options', () => {
    // This is the one that changes behaviour rather than just data:
    // conditions branch on these values, so an out-of-vocabulary answer
    // routes work down a path nobody designed.
    assert.match(refusal(select, 'Maybe'), /must be one of: Yes, No/)
  })

  it('is case and space sensitive, because conditions are written against it', () => {
    assert.match(refusal(select, 'yes'), /must be one of/)
    assert.equal(value(select, ' Yes '), 'Yes')
  })

  it('blames the workflow, not the person, when there are no options', () => {
    const broken = field('select', { label: 'Category', options: [] })
    assert.match(refusal(broken, 'anything'), /no options to choose from/)
    const missing = field('select', { label: 'Category' })
    assert.match(refusal(missing, 'anything'), /no options to choose from/)
  })
})

describe('email', () => {
  const email = field('email', { label: 'Client email' })

  it('stores it lower case and trimmed', () => {
    assert.equal(value(email, '  Priya@ABCTech.example  '), 'priya@abctech.example')
  })

  it('refuses something that is not an address', () => {
    for (const bad of ['nonsense', 'a@b', '@b.co', 'a b@c.co', 'a@@b.co']) {
      assert.match(refusal(email, bad), /must be an email address/, bad)
    }
  })

  it('refuses one longer than an address can be', () => {
    const long = `${'a'.repeat(TEXT_LIMITS.email)}@example.com`
    assert.match(refusal(email, long), /characters or fewer/)
  })
})

describe('phone', () => {
  const phone = field('phone', { label: 'Contact number' })

  it('accepts the formats people actually write', () => {
    for (const good of ['+91 98765 43210', '(020) 7946 0958', '020-7946-0958', '9876543210']) {
      assert.equal(value(phone, good), good.trim(), good)
    }
  })

  it('refuses prose', () => {
    assert.match(refusal(phone, 'call me'), /digits, spaces/)
  })

  it('refuses too few or too many digits', () => {
    assert.match(refusal(phone, '12345'), new RegExp(`${PHONE_LIMITS.minDigits}`))
    assert.match(refusal(phone, '1'.repeat(PHONE_LIMITS.maxDigits + 1)), /digits/)
  })
})

describe('text and textarea', () => {
  it('trims what it stores', () => {
    assert.equal(value(field('text'), '  hello  '), 'hello')
  })

  it('bounds a single-line answer', () => {
    const over = 'a'.repeat(TEXT_LIMITS.shortText + 1)
    assert.match(refusal(field('text'), over), /characters or fewer/)
    assert.equal(
      value(field('text'), 'a'.repeat(TEXT_LIMITS.shortText)),
      'a'.repeat(TEXT_LIMITS.shortText),
    )
  })

  it('gives a multi-line answer more room, but not unlimited room', () => {
    assert.ok(TEXT_LIMITS.longText > TEXT_LIMITS.shortText)
    const over = 'a'.repeat(TEXT_LIMITS.longText + 1)
    assert.match(refusal(field('textarea'), over), /characters or fewer/)
  })
})

describe('refusals are written for the person reading them', () => {
  it('lead with the field label, not the key', () => {
    const definition = field('number', { key: 'deal_value', label: 'Deal value' })
    assert.match(refusal(definition, 'abc'), /^Deal value/)
  })

  it('fall back to the key when a field has no label', () => {
    const definition = field('number', { key: 'deal_value', label: '' })
    assert.match(refusal(definition, 'abc'), /^deal_value/)
  })
})
