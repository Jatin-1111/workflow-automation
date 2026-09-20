'use server'

import { redirect } from 'next/navigation'
import { findUserByEmail } from '@/lib/db/repositories/users'
import { verifyPassword } from '@/lib/auth/password'
import { createSession, deleteSession } from '@/lib/auth/session'
import { landingPath } from '@/lib/auth/permissions'

export interface LoginState {
  error?: string
}

/** Only allow post-login redirects to paths inside this app. */
function safeNextPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  return value
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = safeNextPath(formData.get('next'))

  if (!email || !password) {
    return { error: 'Enter your email and password.' }
  }

  const user = await findUserByEmail(email)

  // Hash the supplied password even when no user matched, so a missing account
  // and a wrong password take the same time to answer.
  const passwordMatches = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv')

  if (!user || !passwordMatches) {
    return { error: 'Those details do not match an account.' }
  }

  if (user.status !== 'active') {
    return { error: 'This account is deactivated. Contact an administrator.' }
  }

  await createSession(user.userId)
  redirect(next ?? landingPath(user.accessLevel))
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
