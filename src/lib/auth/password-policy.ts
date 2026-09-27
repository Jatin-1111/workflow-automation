/**
 * Whether a password is one worth setting.
 *
 * Length was the only rule, so `nitin123` passed and so did `password`.
 * This is not an attempt at a strength meter — those mostly teach people
 * to put a `1` on the end. It refuses the two things that actually get
 * guessed first: the password everybody tries, and the one made out of
 * the account it protects.
 *
 * Deliberately short. A policy long enough to be annoying is a policy
 * people work around by writing the result on a note, and this product
 * has no password reset by email to rescue them with.
 *
 * Pure: takes the password and what is known about the person.
 */

import { PASSWORD } from '@/lib/validation/bounds'

/**
 * The passwords that get tried first.
 *
 * A short list on purpose: the long ones belong in a breach-corpus check,
 * which needs a service this product does not have. These are the ones a
 * person actually types when told to think of something.
 */
const OBVIOUS = new Set([
  'password',
  'password1',
  'password123',
  'passw0rd',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyui',
  'qwerty123',
  'iloveyou',
  'welcome1',
  'letmein1',
  'admin123',
  'changeme',
  'business',
  'orbit123',
])

/** Words from a name or an address that must not become the password. */
function personalWords(about: { email?: string; name?: string }): string[] {
  const local = about.email?.split('@')[0] ?? ''
  return [local, ...(about.name ?? '').split(/\s+/)]
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length >= 3)
}

/** Letters only: `password1!` and `password` are the same guess. */
function letters(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * The substitutions people believe disguise a word.
 *
 * Read as letters rather than deleted. Deleting them turns `P@ssw0rd`
 * into `psswrd`, which matches nothing and lets the most-guessed password
 * on earth through wearing a hat. `@` means `a`.
 */
const LEET: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '0': 'o',
  '5': 's',
  $: 's',
  '7': 't',
}

function unleet(value: string): string {
  return letters(
    value
      .toLowerCase()
      .split('')
      .map((character) => LEET[character] ?? character)
      .join(''),
  )
}

/**
 * Both readings of the list, so a disguise has to beat both.
 *
 * Short entries are dropped: a four-letter needle searched for inside
 * every password would refuse most of the good ones.
 */
const OBVIOUS_SHAPES = new Set(
  [...OBVIOUS].flatMap((word) => [letters(word), unleet(word)]).filter(Boolean),
)
const OBVIOUS_WORDS = [...OBVIOUS_SHAPES].filter((word) => word.length >= 6)

/**
 * What is wrong with this password, or null when nothing is.
 *
 * One problem at a time: a list of everything wrong with a password
 * somebody is still choosing reads as an argument.
 */
export function passwordProblem(
  password: string,
  about: { email?: string; name?: string } = {},
): string | null {
  if (password.length < PASSWORD.min) {
    return `A password needs at least ${PASSWORD.min} characters.`
  }
  if (password.length > PASSWORD.max) {
    return `A password must be ${PASSWORD.max} characters or fewer.`
  }
  if (password.trim().length === 0) {
    return 'A password needs more than spaces in it.'
  }

  const readings = [letters(password), unleet(password)]
  const known =
    OBVIOUS.has(password.toLowerCase()) ||
    readings.some(
      (reading) =>
        OBVIOUS_SHAPES.has(reading) ||
        OBVIOUS_WORDS.some((word) => reading.includes(word)),
    )
  if (known) {
    return 'That is one of the first passwords anybody would try. Choose another.'
  }

  // `nitin2024` protects an account called nitin@ from nobody.
  for (const word of personalWords(about)) {
    const needle = letters(word)
    if (needle && readings.some((reading) => reading.includes(needle))) {
      return 'A password should not contain your name or email address.'
    }
  }

  // A single repeated character clears any length rule and nothing else.
  if (new Set(password).size < 4) {
    return 'A password needs more variety than that.'
  }

  return null
}
