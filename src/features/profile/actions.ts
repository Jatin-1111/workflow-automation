'use server'

/**
 * Changing your own password.
 *
 * The form the platform previously promised and did not have: people were
 * told to change the password an administrator gave them, and there was no
 * way to do it.
 */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/dal'
import { createSession } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { findUserById, updateUserPassword } from '@/lib/db/repositories/users'

// Not exported: a 'use server' module may only export async functions, and
// exporting a constant here rejects the whole file at build time.
const MIN_PASSWORD = 8

export type PasswordActionState = { ok: boolean; message: string } | { ok: null }

function refuse(message: string): PasswordActionState {
  return { ok: false, message }
}

export async function changePasswordAction(
  _previous: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const viewer = await requireUser()

  const current = String(formData.get('currentPassword') ?? '')
  const next = String(formData.get('newPassword') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  if (next.length < MIN_PASSWORD) {
    return refuse(`A password needs at least ${MIN_PASSWORD} characters.`)
  }
  if (next !== confirm) {
    return refuse('The two new passwords do not match.')
  }
  if (next === current) {
    return refuse('That is the password you already have.')
  }

  // Re-read for the hash: the public record deliberately does not carry it.
  const user = await findUserById(viewer.userId)
  if (!user) return refuse('Your account could not be found.')

  // The current password is required so a borrowed session cannot be turned
  // into permanent ownership of the account.
  if (!(await verifyPassword(current, user.passwordHash))) {
    return refuse('That is not your current password.')
  }

  const changedAt = new Date()
  await updateUserPassword(viewer.userId, await hashPassword(next), changedAt)

  // Every session issued before now is now refused, including this one, so
  // issue a fresh cookie rather than signing the person out of their own
  // password change.
  await createSession(viewer.userId)

  revalidatePath('/profile')
  return {
    ok: true,
    message: 'Password changed. Anywhere else you were signed in has been signed out.',
  }
}
