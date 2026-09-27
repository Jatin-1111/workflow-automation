/**
 * How hard somebody is allowed to guess.
 *
 * Sign-in accepted unlimited attempts at unlimited speed. For an internal
 * tool that is the cheapest way in: the address format is predictable,
 * everybody is on the same domain, and nothing anywhere counted a failure.
 *
 * Backoff rather than lockout, deliberately. A hard lock on an address is
 * a denial-of-service anybody can aim at a named administrator — they only
 * need to know the email, and on this product they do. A delay that grows
 * makes guessing hopeless while leaving the real owner a way in: wait, and
 * the door opens again on its own.
 *
 * Pure. Takes the failures already recorded and the time, returns whether
 * to allow the attempt. Where the failures are kept is somebody else's
 * problem, which is what makes this testable without a database.
 */

/** Failures older than this stop counting. */
const WINDOW_MS = 15 * 60 * 1000

/**
 * Attempts allowed before any delay.
 *
 * Five, because people mistype and people have old passwords in a manager.
 * Somebody with the right password should never meet this.
 */
const FREE_ATTEMPTS = 5

/** The wait after the first delayed attempt, doubling from there. */
const BASE_DELAY_MS = 30 * 1000

/** However many failures pile up, the wait stops growing here. */
const MAX_DELAY_MS = 15 * 60 * 1000

/**
 * Failures from one address before it is treated as spraying.
 *
 * Generous on purpose: this company shares an office, and an office shares
 * an IP. Twenty people fumbling their passwords in a quarter of an hour
 * must not lock the building out, while someone working through a list of
 * addresses passes it quickly.
 */
const ADDRESS_ATTEMPTS = 50

export interface ThrottleDecision {
  allowed: boolean
  /** Whole seconds until the next attempt is permitted. */
  retryAfterSeconds: number
}

const ALLOWED: ThrottleDecision = { allowed: true, retryAfterSeconds: 0 }

/** Failures inside the window, newest last. */
function recent(failures: readonly Date[], now: Date): Date[] {
  const cutoff = now.getTime() - WINDOW_MS
  return failures
    .filter((at) => at.getTime() > cutoff)
    .sort((a, b) => a.getTime() - b.getTime())
}

/**
 * The wait earned by `count` failures.
 *
 * 30s, then a minute, two, four — doubling until it is capped. Slow enough
 * that a list of candidate passwords becomes years of work, short enough
 * that somebody who has simply forgotten theirs is not locked out of their
 * own afternoon.
 */
function delayFor(count: number): number {
  // The fifth failure is the one that earns the first wait, so counting
  // from FREE_ATTEMPTS itself rather than from the one after it.
  const over = count - FREE_ATTEMPTS + 1
  if (over <= 0) return 0
  return Math.min(BASE_DELAY_MS * 2 ** (over - 1), MAX_DELAY_MS)
}

/**
 * Whether this attempt on this account may proceed.
 *
 * The wait runs from the most recent failure, so each further guess
 * restarts a longer clock and guessing gets worse the more it is tried.
 */
export function decideForAccount(
  failures: readonly Date[],
  now: Date = new Date(),
): ThrottleDecision {
  const inWindow = recent(failures, now)
  if (inWindow.length < FREE_ATTEMPTS) return ALLOWED

  const last = inWindow[inWindow.length - 1]
  const readyAt = last.getTime() + delayFor(inWindow.length)
  const waitMs = readyAt - now.getTime()
  if (waitMs <= 0) return ALLOWED

  return { allowed: false, retryAfterSeconds: Math.ceil(waitMs / 1000) }
}

/** Whether this address has been working through a list of accounts. */
export function decideForAddress(
  failures: readonly Date[],
  now: Date = new Date(),
): ThrottleDecision {
  const inWindow = recent(failures, now)
  if (inWindow.length < ADDRESS_ATTEMPTS) return ALLOWED

  const last = inWindow[inWindow.length - 1]
  const waitMs = last.getTime() + WINDOW_MS - now.getTime()
  if (waitMs <= 0) return ALLOWED

  return { allowed: false, retryAfterSeconds: Math.ceil(waitMs / 1000) }
}

/** "in 2 minutes", "in 45 seconds" — for a message somebody reads. */
export function describeWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

export const THROTTLE = {
  windowMs: WINDOW_MS,
  freeAttempts: FREE_ATTEMPTS,
  addressAttempts: ADDRESS_ATTEMPTS,
  maxDelayMs: MAX_DELAY_MS,
} as const
