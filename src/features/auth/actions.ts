'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { findUserByEmail } from '@/lib/db/repositories/users'
import { verifyPassword } from '@/lib/auth/password'
import { createSession, deleteSession } from '@/lib/auth/session'
import { landingPath } from '@/lib/auth/permissions'
import {
  decideForAccount,
  decideForAddress,
  describeWait,
  THROTTLE,
} from '@/lib/auth/throttle'
import {
  clearLoginFailures,
  recentLoginFailures,
  recordLoginFailure,
} from '@/lib/db/repositories/login-failures'
import { PASSWORD, TEXT_LIMITS } from '@/lib/validation/bounds'

export interface LoginState {
  error?: string
}

/** Only allow post-login redirects to paths inside this app. */
function safeNextPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  return value
}

/**
 * Who is asking, as well as this can be known behind a proxy.
 *
 * `x-forwarded-for` is a list the proxies append to, and only the entry
 * the trusted edge added is worth anything — the rest is whatever the
 * client sent. Vercel puts the real one first, so that is the one taken.
 * Absent or unreadable, the attempt is simply not counted by address;
 * the per-account backoff is the part that has to work.
 */
async function callerAddress(): Promise<string> {
  const list = await headers()
  const forwarded = list.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  return first && first.length <= 64 ? first : ''
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const next = safeNextPath(formData.get('next'))

  if (!email || !password) {
    return { error: 'Enter your email and password.' }
  }

  // Refused before hashing. bcrypt reads the first 72 bytes and ignores
  // the rest, but it works through everything it is handed first, so an
  // unbounded field sells the server's CPU for the price of one request.
  if (email.length > TEXT_LIMITS.email || password.length > PASSWORD.max) {
    return { error: 'Those details do not match an account.' }
  }

  const now = new Date()
  const since = new Date(now.getTime() - THROTTLE.windowMs)
  const address = await callerAddress()

  const [accountFailures, addressFailures] = await Promise.all([
    recentLoginFailures(email, 'account', since),
    address ? recentLoginFailures(address, 'address', since) : Promise.resolve([]),
  ])

  const account = decideForAccount(accountFailures, now)
  const fromHere = decideForAddress(addressFailures, now)
  const blocked = !account.allowed ? account : !fromHere.allowed ? fromHere : null
  if (blocked) {
    // Said plainly. Hiding the wait would not hide it — the attempt fails
    // either way — and it would leave the real owner guessing at why.
    return {
      error: `Too many attempts. Try again in ${describeWait(blocked.retryAfterSeconds)}.`,
    }
  }

  const user = await findUserByEmail(email)

  // Hash the supplied password even when no user matched, so a missing account
  // and a wrong password take the same time to answer.
  const passwordMatches = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv')

  if (!user || !passwordMatches) {
    await Promise.all([
      recordLoginFailure(email, 'account', now),
      address ? recordLoginFailure(address, 'address', now) : Promise.resolve(),
    ])
    return { error: 'Those details do not match an account.' }
  }

  if (user.status !== 'active') {
    return { error: 'This account is deactivated. Contact an administrator.' }
  }

  // Proving who you are clears what you owed.
  await Promise.all([
    clearLoginFailures(email, 'account'),
    address ? clearLoginFailures(address, 'address') : Promise.resolve(),
  ])

  await createSession(user.userId)
  redirect(next ?? landingPath(user.accessLevel))
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
