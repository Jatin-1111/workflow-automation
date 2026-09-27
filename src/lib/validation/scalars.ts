/**
 * The handful of things that are the same wherever they are collected.
 *
 * An email address on a person's record and an email address a stage asks
 * for are the same kind of value, and were validated by two different
 * rules: one a loose regex written inline, the other a real parser. A date
 * on a joining record was checked only for being a date at all, so the
 * year 0202 was accepted and stored.
 *
 * Lifted out of field-value.ts rather than copied from it, so there is one
 * answer to "is this an email" and both callers get it.
 *
 * Pure. Each returns the value to store or a sentence explaining why not,
 * and each takes the label to put at the front of that sentence, because
 * "Contact email must be an address" and "Email must be an address" are
 * the same rule read in two places.
 */

import * as z from 'zod'
import { DATE_LIMITS, PHONE_LIMITS, TEXT_LIMITS } from './bounds'

export type ScalarResult<T> = { ok: true; value: T } | { ok: false; message: string }

function accept<T>(value: T): ScalarResult<T> {
  return { ok: true, value }
}

function reject<T>(message: string): ScalarResult<T> {
  return { ok: false, message }
}

/* -------------------------------------------------------------------------
 * Email
 * ---------------------------------------------------------------------- */

const EMAIL = z.email()

/**
 * An address, lower-cased.
 *
 * Stored folded because it is the sign-in identity and a unique index sits
 * on it: without folding, `Nitin@` and `nitin@` are two accounts, and only
 * one of them can ever sign in.
 */
export function emailValue(raw: unknown, label = 'Email'): ScalarResult<string> {
  if (typeof raw !== 'string') return reject(`${label} must be an email address.`)

  const text = raw.trim().toLowerCase()
  if (text.length > TEXT_LIMITS.email) {
    return reject(`${label} must be ${TEXT_LIMITS.email} characters or fewer.`)
  }
  return EMAIL.safeParse(text).success
    ? accept(text)
    : reject(`${label} must be an email address.`)
}

/* -------------------------------------------------------------------------
 * Phone
 * ---------------------------------------------------------------------- */

/** Only dialling characters, and a plausible number of actual digits. */
const PHONE_SHAPE = /^[+()\-.\s\d]+$/

/**
 * A telephone number.
 *
 * Deliberately not a format. Numbers arrive from several countries with
 * every convention for spaces, dashes and brackets, and a strict pattern
 * rejects real numbers — the expensive kind of mistake. What is checked is
 * that it is plausibly a number and not prose.
 */
export function phoneValue(raw: unknown, label = 'Phone'): ScalarResult<string> {
  if (typeof raw !== 'string') return reject(`${label} must be a phone number.`)

  const text = raw.trim()
  if (text.length > TEXT_LIMITS.phone) {
    return reject(`${label} must be ${TEXT_LIMITS.phone} characters or fewer.`)
  }
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

/* -------------------------------------------------------------------------
 * Date
 * ---------------------------------------------------------------------- */

const ISO_DATE = z.iso.date()

/**
 * A date, in the format a date input actually submits.
 *
 * Strict YYYY-MM-DD rather than `new Date(string)`, whose behaviour on
 * anything else is implementation-defined and which reads "01/02/2024" as
 * January in one runtime and February in another.
 *
 * Read as UTC midnight so a stored date does not shift by a day for
 * somebody in a different timezone, and bounded, because a four-digit year
 * outside living memory is a typo and typos stored as dates look
 * deliberate forever.
 */
export function dateValue(raw: unknown, label = 'Date'): ScalarResult<Date> {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime())
      ? reject(`${label} is not a real date.`)
      : withinRange(raw, label)
  }
  if (typeof raw !== 'string') return reject(`${label} must be a date.`)

  const text = raw.trim()
  if (!ISO_DATE.safeParse(text).success) {
    return reject(`${label} must be a date, as day, month and year.`)
  }

  const parsed = new Date(`${text}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return reject(`${label} is not a real date.`)
  return withinRange(parsed, label)
}

function withinRange(value: Date, label: string): ScalarResult<Date> {
  if (value < DATE_LIMITS.min || value > DATE_LIMITS.max) {
    return reject(`${label} must be a year between 1900 and 2100.`)
  }
  return accept(value)
}
