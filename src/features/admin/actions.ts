'use server'

import { revalidatePath } from 'next/cache'
import { requireCapability } from '@/lib/auth/dal'
import { listRoles } from '@/lib/db/repositories/roles'
import { updateUserRoles, updateUserStatus } from '@/lib/db/repositories/users'
import { isEntityId } from '@/lib/ids/format'
import type { RoleId, UserId } from '@/lib/types/ids'

export type AdminActionState = { ok: boolean; message?: string } | { ok: null }

/**
 * Remap the workflow roles a person holds (spec §6).
 *
 * This is how a departure is handled: point the role at someone else and every
 * workflow follows, with no template edited and no running work rebuilt.
 */
export async function updateRolesAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_roles')

  const rawUserId = String(formData.get('userId') ?? '')
  if (!isEntityId(rawUserId, 'user')) {
    return { ok: false, message: 'That user could not be identified.' }
  }

  // Only accept roles that actually exist, whatever the form submitted.
  const known = new Set((await listRoles()).map((role) => role.roleId))
  const roleIds = formData
    .getAll('roleIds')
    .filter((value): value is string => typeof value === 'string')
    .filter((value): value is RoleId => known.has(value as RoleId))

  await updateUserRoles(rawUserId as UserId, roleIds)
  revalidatePath('/admin')
  revalidatePath('/my-work')

  return { ok: true, message: 'Roles updated. New work routes to this mapping.' }
}

export async function toggleUserStatusAction(formData: FormData): Promise<void> {
  const admin = await requireCapability('admin.manage_users')

  const rawUserId = String(formData.get('userId') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!isEntityId(rawUserId, 'user')) return
  if (status !== 'active' && status !== 'inactive') return
  // An administrator locking themselves out would leave nobody able to undo it.
  if (rawUserId === admin.userId) return

  await updateUserStatus(rawUserId as UserId, status)
  revalidatePath('/admin')
}
