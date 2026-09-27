/**
 * How big anything is allowed to be, in one place.
 *
 * These were scattered as literals or, more often, absent: of 93 inputs in
 * the app, 14 carried a maxLength and the server bounded two fields in
 * total. A comment could be a pasted document, and a stage's text field
 * could be any size a request could carry.
 *
 * One table so a bound is decided once and the same number reaches the
 * server check, the schema and the input's own `maxLength`. A form whose
 * browser limit disagrees with its server limit is a form that rejects
 * work after somebody has typed it.
 *
 * Pure data. No imports on purpose: the engine, the actions and the client
 * components all read this, and it must stay safe for every one of them.
 */

/** Characters, for anything a person types. */
export const TEXT_LIMITS = {
  /** A name on a person, role, team, department or project. */
  name: 80,
  /** What a run of a workflow is called. */
  title: 120,
  /** A stage, field, file slot or checklist label. */
  label: 120,
  /** One line explaining what something is for. */
  description: 500,
  /** What the assignee is told to do at a stage. */
  instructions: 2000,
  /** The hint under a single input. */
  helpText: 200,
  /** A comment on a task, or a note on the timeline. */
  comment: 5000,
  /** Why work was reassigned, held or cancelled. */
  reason: 500,
  /** A single-line answer collected by a stage. */
  shortText: 500,
  /** A multi-line answer collected by a stage. */
  longText: 5000,
  /** The practical maximum for an address; RFC 5321 says 254. */
  email: 254,
  /** One option in a select field. */
  option: 120,
  /** A telephone number with its spaces, dashes and country code. */
  phone: 40,
  /** A link to a photograph. */
  url: 2048,
} as const

export type TextLimit = keyof typeof TEXT_LIMITS

/**
 * Passwords.
 *
 * The maximum is not a strength rule. bcrypt reads the first 72 bytes and
 * ignores the rest, but it hashes whatever it is handed first, so an
 * unbounded field lets anybody spend the server's CPU for the price of one
 * request.
 */
export const PASSWORD = { min: 8, max: 200 } as const

/**
 * Numbers a stage can collect.
 *
 * Bounded well inside the range where a double still counts accurately
 * (2^53), so a stored figure means what it says. Currency is capped at two
 * decimal places because a third one is a number nobody can pay.
 */
export const NUMBER_LIMITS = {
  min: -1_000_000_000_000,
  max: 1_000_000_000_000,
  currencyDecimals: 2,
} as const

/**
 * Dates.
 *
 * Wide enough for a joining date decades back and a deadline years out,
 * narrow enough that a typo in the year is caught rather than stored. A
 * four-digit year outside this range is a slip, not a plan.
 */
export const DATE_LIMITS = {
  min: new Date('1900-01-01T00:00:00.000Z'),
  max: new Date('2100-01-01T00:00:00.000Z'),
} as const

/**
 * Telephone numbers.
 *
 * Deliberately not a format. Numbers arrive from several countries with
 * every convention for spaces, dashes and brackets, and a strict pattern
 * would reject real numbers — the expensive kind of validation error. What
 * is checked is that it is plausibly a phone number and not prose: only
 * dialling characters, and a sane count of actual digits.
 */
export const PHONE_LIMITS = { minDigits: 7, maxDigits: 15 } as const

/**
 * Durations on a stage.
 *
 * A year. `dueInHours` and `slaHours` are offsets from the moment a stage
 * activates, and a stage that is due in a century is a typo that would sit
 * in the data forever looking like a deliberate choice.
 */
export const HOURS_LIMITS = { min: 0, max: 8760 } as const
