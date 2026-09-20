/** Data access for users. The only module that queries the users collection. */

import { getCollection } from '../collection'
import { COLLECTIONS } from '../collections'
import type { RoleId, UserId } from '@/lib/types/ids'
import type { PublicUser, User } from '@/lib/types/user'

async function users() {
  return getCollection<User>(COLLECTIONS.users)
}

/** Strip the password hash. Everything leaving this module for a view uses it. */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...safe } = user
  return safe
}

export async function insertUsers(docs: User[]): Promise<void> {
  if (docs.length === 0) return
  await (await users()).insertMany(docs)
}

export async function findUserById(userId: UserId): Promise<User | null> {
  return (await users()).findOne({ userId })
}

/** Login lookup. Email is matched case-insensitively by storing it lowercased. */
export async function findUserByEmail(email: string): Promise<User | null> {
  return (await users()).findOne({ email: email.trim().toLowerCase() })
}

/** Resolve a workflow role to the people who currently hold it (spec §6). */
export async function findUsersByRole(roleId: RoleId): Promise<User[]> {
  return (await users()).find({ roleIds: roleId, status: 'active' }).toArray()
}

export async function listUsers(): Promise<User[]> {
  return (await users()).find().sort({ name: 1 }).toArray()
}

/** Remap which workflow roles a person holds (spec §6). */
export async function updateUserRoles(
  userId: UserId,
  roleIds: RoleId[],
): Promise<void> {
  await (await users()).updateOne(
    { userId },
    { $set: { roleIds, updatedAt: new Date() } },
  )
}

export async function updateUserStatus(
  userId: UserId,
  status: User['status'],
): Promise<void> {
  await (await users()).updateOne(
    { userId },
    { $set: { status, updatedAt: new Date() } },
  )
}

export async function countUsers(): Promise<number> {
  return (await users()).countDocuments()
}
