/**
 * Turning what a form sent into the value a stage's field declares.
 *
 * A workflow says a field is a number, a date or one of five options, and
 * until now nothing on the server read that: every answer was stored as
 * whatever string arrived. A number field held "abc", a date field held
 * "tomorrow", and a select held values that were not among its own options
 * — which matters more than it sounds, because conditions branch on those
 * values and reports add them up.
 *
 * Two rules shape this module.
 *
 * Absence is not a type error. A blank answer coerces to null and says so;
 * whether blank is *allowed* is a question about `required`, which the
 * engine already answers in validateCompletion. Keeping the two apart means
 * an optional number left empty does not produce a spurious complaint, and
 * a required one produces exactly one.
 *
 * A refusal has to be worth reading. These messages are shown to somebody
 * who has just filled a form in, so they say what was wanted rather than
 * quoting a schema.
 *
 * Pure: no database, no request, no React. The engine can call it.
 */

import * as z from 'zod'
import { DATE_LIMITS, NUMBER_LIMITS, PHONE_LIMITS, TEXT_LIMITS } from './bounds'
import type { FieldDefinition } from '@/lib/types/workflow'
import type { FieldValue } from '@/lib/types/instance'

export type CoercionResult =
  | { ok: true; value: FieldValue }
  | { ok: false; message: string }

function accept(value: FieldValue): CoercionResult {
  return { ok: true, value }
}

function reject(message: string): CoercionResult {
  return { ok: false, message }
}

/**
 * Whether the browser sent nothing.
 *
 * An unticked checkbox and an untouched text input both arrive as an empty
 * string, so this is the normal case rather than an edge one.
 */
function isBlank(raw: unknown): boolean {
  if (raw === undefined || raw === null) return true
  return typeof raw === 'string' && raw.trim() === ''
}

/**
 * A number, without the coercions JavaScript would do for free.
 *
 * Number('') is 0 and Number('0x10') is 16, and both would be stored as
 * though somebody had meant them. Blank is handled before this is reached;
 * hex is refused here, because a field labelled "Deal value" that quietly
 * reads 0x10 as sixteen is worse than one that asks again.
 */
const NUMERIC_TEXT = /^[+-]?(\d+(\.\d+)?|\.\d+)$/

function toNumber(raw: unknown, label: string): CoercionResult {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? accept(raw) : reject(`${label} must be a number.`)
  }
  if (typeof raw !== 'string') return reject(`${label} must be a number.`)

  const text = raw.trim()
  if (!NUMERIC_TEXT.test(text)) {
    // Thousands separators are the common slip and deserve their own answer.
    return text.includes(',')
      ? reject(`${label} must be a number, written without commas.`)
      : reject(`${label} must be a number.`)
  }

  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return reject(`${label} is too large.`)
  return accept(parsed)
}

function withinRange(value: number, label: string): CoercionResult {
  if (value < NUMBER_LIMITS.min || value > NUMBER_LIMITS.max) {
    return reject(`${label} is outside the range this platform stores.`)
  }
  return accept(value)
}

function decimalPlaces(value: number): number {
  const text = String(value)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

/**
 * A date, in the format an `input type="date"` actually submits.
 *
 * Strict YYYY-MM-DD rather than new Date(string), whose behaviour on
 * anything else is implementation-defined and which reads "01/02/2024" as
 * January in one place and February in another.
 */
const ISO_DATE = z.iso.date()

function inRange(value: Date, label: string): CoercionResult {
  if (value < DATE_LIMITS.min || value > DATE_LIMITS.max) {
    return reject(`${label} must be a year between 1900 and 2100.`)
  }
  return accept(value)
}

function toDate(raw: unknown, label: string): CoercionResult {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime())
      ? reject(`${label} is not a real date.`)
      : inRange(raw, label)
  }
  if (typeof raw !== 'string') return reject(`${label} must be a date.`)

  const text = raw.trim()
  if (!ISO_DATE.safeParse(text).success) {
    return reject(`${label} must be a date, as day, month and year.`)
  }
  // Read as UTC midnight so a stored date does not shift by a day for
  // somebody in a different timezone.
  const parsed = new Date(`${text}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return reject(`${label} is not a real date.`)
  return inRange(parsed, label)
}

const EMAIL = z.email()

/**
 * A tick, read strictly.
 *
 * Boolean('false') is true, so coercing this the obvious way records the
 * opposite of what was sent. Every spelling a form or an API might use is
 * listed, and anything not on the list is refused rather than guessed.
 */
const TRUE_WORDS = new Set(['true', 'yes', 'on', '1'])
const FALSE_WORDS = new Set(['false', 'no', 'off', '0'])

function toBoolean(raw: unknown, label: string): CoercionResult {
  if (typeof raw === 'boolean') return accept(raw)
  if (typeof raw !== 'string') return reject(`${label} must be ticked or left clear.`)

  const text = raw.trim().toLowerCase()
  if (TRUE_WORDS.has(text)) return accept(true)
  if (FALSE_WORDS.has(text)) return accept(false)
  return reject(`${label} must be ticked or left clear.`)
}

/** Only dialling characters, and a plausible number of actual digits. */
const PHONE_SHAPE = /^[+()\-.\s\d]+$/

function toPhone(raw: unknown, label: string): CoercionResult {
  if (typeof raw !== 'string') return reject(`${label} must be a phone number.`)

  const text = raw.trim()
  if (!PHONE_SHAPE.test(text)) {
    return reject(`${label} must be a phone number — digits, spaces and + ( ) - only.`)
  }
  const digits = text.replace(/\D/g, '').length
  if (digits < PHONE_LIMITS.minDigits || digits > PHONE_LIMITS.maxDigits) {
    return reject(
      `${label} must have between ${PHONE_LIMITS.minDigits} and ${PHONE_LIMITS.maxDigits} digits.`,
    )
  }
  return accept(text)
}

function bounded(raw: unknown, label: string, limit: number): CoercionResult {
  if (typeof raw !== 'string') return reject(`${label} must be text.`)

  const text = raw.trim()
  if (text.length > limit) return reject(`${label} must be ${limit} characters or fewer.`)
  return accept(text)
}

/**
 * A field type the switch does not handle.
 *
 * Typed as `never`, so adding a type to FIELD_TYPES without handling it
 * here fails the build rather than quietly falling through to text.
 */
function exhausted(type: never, label: string): CoercionResult {
  return reject(`${label} has a type this platform does not recognise (${String(type)}).`)
}

/**
 * Coerce one answer to the type its field declares.
 *
 * Returns the value to store, not the string that arrived: a number field
 * yields a number and a date field a Date, so reports add up and conditions
 * compare without having to guess at a string first.
 */
export function coerceFieldValue(field: FieldDefinition, raw: unknown): CoercionResult {
  const label = field.label || field.key

  // Nothing was entered. Whether that is allowed is validateCompletion's
  // question, and answering it here too would report the same gap twice.
  if (isBlank(raw)) return accept(null)

  switch (field.type) {
    case 'text':
      return bounded(raw, label, TEXT_LIMITS.shortText)

    case 'textarea':
      return bounded(raw, label, TEXT_LIMITS.longText)

    case 'number': {
      const parsed = toNumber(raw, label)
      return parsed.ok ? withinRange(parsed.value as number, label) : parsed
    }

    case 'currency': {
      const parsed = toNumber(raw, label)
      if (!parsed.ok) return parsed
      const amount = parsed.value as number
      if (decimalPlaces(amount) > NUMBER_LIMITS.currencyDecimals) {
        return reject(`${label} must be an amount, to at most two decimal places.`)
      }
      return withinRange(amount, label)
    }

    case 'date':
      return toDate(raw, label)

    case 'email': {
      const text = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
      if (text.length > TEXT_LIMITS.email) {
        return reject(`${label} must be ${TEXT_LIMITS.email} characters or fewer.`)
      }
      return EMAIL.safeParse(text).success
        ? accept(text)
        : reject(`${label} must be an email address.`)
    }

    case 'phone':
      return toPhone(raw, label)

    case 'select': {
      const options = field.options ?? []
      // A select with no options cannot accept anything, and saying so names
      // the real fault: the workflow, not the person filling the form in.
      if (options.length === 0) {
        return reject(`${label} has no options to choose from. Ask an administrator.`)
      }
      const text = typeof raw === 'string' ? raw.trim() : ''
      return options.includes(text)
        ? accept(text)
        : reject(`${label} must be one of: ${options.join(', ')}.`)
    }

    case 'checkbox':
      return toBoolean(raw, label)

    default:
      return exhausted(field.type, label)
  }
}
