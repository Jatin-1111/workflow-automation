/**
 * Failed sign-ins, kept only long enough to slow guessing down.
 *
 * One document per failure rather than a running count on the user, for
 * two reasons: a count would have to be reset by something, and a failure
 * against an address that is not an account has no user to hang off.
 *
 * Everything here expires. A TTL index removes a row once it is older than
 * the window the policy consults, so the collection stays small on its own
 * and nothing accumulates a record of who mistyped what.
 */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'

export interface LoginFailure {
  /** The account attempted, lower-cased, or the address it came from. */
  subject: string
  kind: 'account' | 'address'
  at: Date
}

async function failures() {
  return getCollection<LoginFailure>(COLLECTIONS.loginFailures)
}

export async function recordLoginFailure(
  subject: string,
  kind: LoginFailure['kind'],
  at: Date,
): Promise<void> {
  if (!subject) return
  await (await failures()).insertOne({ subject, kind, at })
}

/** When this subject last failed, newest first, within `since`. */
export async function recentLoginFailures(
  subject: string,
  kind: LoginFailure['kind'],
  since: Date,
): Promise<Date[]> {
  if (!subject) return []
  const rows = await (await failures())
    .find({ subject, kind, at: { $gt: since } }, WITHOUT_ID)
    .sort({ at: -1 })
    .limit(200)
    .toArray()
  return rows.map((row) => row.at)
}

/**
 * Forget a subject's failures.
 *
 * Called on a successful sign-in: somebody who has just proved who they
 * are should not be carrying a delay into their next session.
 */
export async function clearLoginFailures(
  subject: string,
  kind: LoginFailure['kind'],
): Promise<void> {
  if (!subject) return
  await (await failures()).deleteMany({ subject, kind })
}
