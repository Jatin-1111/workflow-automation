/**
 * Session cookie handling.
 *
 * The cookie carries the user id and nothing else: every request re-reads the
 * user from MongoDB, so deactivating someone or changing their roles takes
 * effect on their next request rather than when their token expires.
 */

import 'server-only'
import { cookies } from 'next/headers'
import type { UserId } from '@/lib/types/ids'
import {
  SESSION_COOKIE,
  signSessionToken,
  verifySessionToken,
  type SessionClaims,
} from './token'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export async function createSession(userId: UserId): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const token = await signSessionToken(userId, expiresAt)
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/** Read and verify the session cookie without touching the database. */
export async function readSession(): Promise<SessionClaims | null> {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
}
