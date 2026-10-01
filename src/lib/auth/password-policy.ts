/**
 * Whether a password is one worth setting.
 *
 * Kept to length on purpose. An earlier version also refused common
 * passwords, passwords containing the person's name, and passwords with
 * too little variety; in use it got in the way of setting people up more
 * than it protected anybody, and the rules it applied were invisible until
 * they refused something. Sign-in is throttled, so guessing is slow
 * whatever the password is.
 *
 * The maximum is not a strength rule and nobody typing a password will
 * meet it. bcrypt reads the first 72 bytes and ignores the rest, but it
 * hashes whatever it is handed first, so an unbounded field lets anybody
 * spend the server's CPU for the price of one request.
 *
 * Pure: takes the password and returns what is wrong with it, if anything.
 * The second argument is accepted and ignored so callers did not have to
 * change when the rules got simpler.
 */

import { PASSWORD } from '@/lib/validation/bounds'

export function passwordProblem(
  password: string,
  _about: { email?: string; name?: string } = {},
): string | null {
  if (password.length < PASSWORD.min) {
    return `A password needs at least ${PASSWORD.min} characters.`
  }
  if (password.length > PASSWORD.max) {
    return `A password must be ${PASSWORD.max} characters or fewer.`
  }
  return null
}
