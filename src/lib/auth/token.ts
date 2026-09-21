/**
 * Session token signing and verification.
 *
 * Kept free of `next/headers` and `server-only` so the security-critical part
 * can be unit tested directly; cookie handling lives in `session.ts`.
 */

import { SignJWT, jwtVerify } from 'jose'
import { isEntityId } from '@/lib/ids/format'
import type { UserId } from '@/lib/types/ids'

/** Name of the cookie carrying the session token. */
export const SESSION_COOKIE = 'business_orbit_session'

const ALGORITHM = 'HS256'

export interface SessionClaims {
  userId: UserId
  /** Unix seconds, as JWTs record it. Used to retire pre-change sessions. */
  issuedAt: number
}

function signingKey(secret = process.env.SESSION_SECRET): Uint8Array {
  if (!secret) {
    throw new Error(
      'SESSION_SECRET is not set. Copy .env.example to .env.local and set a 32-byte random value.',
    )
  }
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(
  userId: UserId,
  expiresAt: Date,
  secret?: string,
): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(signingKey(secret))
}

/**
 * Verify a token and return its claims, or null for anything untrusted —
 * a bad signature, an expired token, or a payload carrying something that is
 * not a real user id.
 */
export async function verifySessionToken(
  token: string | undefined,
  secret?: string,
): Promise<SessionClaims | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, signingKey(secret), {
      algorithms: [ALGORITHM],
    })
    const userId = payload.userId
    if (typeof userId !== 'string' || !isEntityId(userId, 'user')) return null
    // `iat` is always set when signing; treat a missing one as the epoch so a
    // hand-made token without it cannot outlive a password change.
    return { userId, issuedAt: typeof payload.iat === 'number' ? payload.iat : 0 }
  } catch {
    return null
  }
}

/**
 * Whether a session was issued before the password it was granted under.
 *
 * Such a session belongs to whoever held the old password. A JWT records its
 * issue time in whole seconds, so the comparison is made at that resolution:
 * finer precision would retire the very session issued moments after a
 * change, signing people out of their own password change.
 */
export function sessionPredatesPasswordChange(
  issuedAt: number,
  passwordChangedAt: Date | undefined,
): boolean {
  if (!passwordChangedAt) return false
  return issuedAt < Math.floor(passwordChangedAt.getTime() / 1000)
}
