/**
 * Data access layer for the current user.
 *
 * Authorization is enforced here, next to the data, rather than in the UI or
 * in the proxy. Components hide controls; this module decides access.
 * Each function is memoised per render pass, so a page that asks several times
 * still costs one database read.
 */

import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { findUserById, toPublicUser } from '@/lib/db/repositories/users'
import type { PublicUser } from '@/lib/types/user'
import { readSession } from './session'
import { can, landingPath, type Capability } from './permissions'

/**
 * The signed-in user, or null.
 *
 * Returns null for a deactivated account even when the cookie is still valid,
 * so revoking access does not wait for the token to expire.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await readSession()
  if (!session) return null

  const user = await findUserById(session.userId)
  if (!user || user.status !== 'active') return null

  return toPublicUser(user)
})

/** The signed-in user, or redirect to login. Use on every protected page. */
export const requireUser = cache(async (): Promise<PublicUser> => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
})

/** The signed-in user, or redirect if they lack the capability (spec §46). */
export async function requireCapability(
  capability: Capability,
): Promise<PublicUser> {
  const user = await requireUser()
  if (!can(user.accessLevel, capability)) redirect('/no-access')
  return user
}

/** Where this user's session should land them (spec §47). */
export async function currentLandingPath(): Promise<string> {
  const user = await getCurrentUser()
  return user ? landingPath(user.accessLevel) : '/login'
}
