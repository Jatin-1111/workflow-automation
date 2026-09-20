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
    return { userId }
  } catch {
    return null
  }
}
