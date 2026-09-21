/** Data access for workflow roles. */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'
import type { RoleId } from '@/lib/types/ids'
import type { Role } from '@/lib/types/organization'

async function roles() {
  return getCollection<Role>(COLLECTIONS.roles)
}

export async function insertRoles(docs: Role[]): Promise<void> {
  if (docs.length === 0) return
  await (await roles()).insertMany(docs)
}

export async function findRoleById(roleId: RoleId): Promise<Role | null> {
  return (await roles()).findOne({ roleId }, WITHOUT_ID)
}

/** Look up by the stable machine key templates and seeds refer to. */
export async function findRoleByKey(key: string): Promise<Role | null> {
  return (await roles()).findOne({ key }, WITHOUT_ID)
}

export async function listRoles(): Promise<Role[]> {
  return (await roles()).find({}, WITHOUT_ID).sort({ name: 1 }).toArray()
}

export async function insertRole(doc: Role): Promise<void> {
  await (await roles()).insertOne(doc)
}

export async function updateRole(
  roleId: RoleId,
  changes: Partial<Role>,
): Promise<void> {
  await (await roles()).updateOne(
    { roleId },
    { $set: { ...changes, updatedAt: new Date() } },
  )
}
