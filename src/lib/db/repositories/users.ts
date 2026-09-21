/** Data access for users. The only module that queries the users collection. */

import { getCollection, WITHOUT_ID } from '../collection'
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
  return (await users()).findOne({ userId }, WITHOUT_ID)
}

/** Login lookup. Email is matched case-insensitively by storing it lowercased. */
export async function findUserByEmail(email: string): Promise<User | null> {
  return (await users()).findOne({ email: email.trim().toLowerCase() }, WITHOUT_ID)
}

/** Resolve a workflow role to the people who currently hold it (spec §6). */
export async function findUsersByRole(roleId: RoleId): Promise<User[]> {
  return (await users()).find({ roleIds: roleId, status: 'active' }, WITHOUT_ID).toArray()
}

/** Name or email match, for global search (spec §48). */
export async function searchUsers(pattern: RegExp, limit = 10): Promise<User[]> {
  return (await users())
    .find({ $or: [{ name: pattern }, { email: pattern }] }, WITHOUT_ID)
    .limit(limit)
    .toArray()
}

export async function listUsers(): Promise<User[]> {
  return (await users()).find({}, WITHOUT_ID).sort({ name: 1 }).toArray()
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

/** Record that somebody has been shown the introduction (spec §47). */
export async function markTourSeen(userId: UserId): Promise<void> {
  await (await users()).updateOne(
    { userId },
    { $set: { 'onboarding.tourSeenAt': new Date(), updatedAt: new Date() } },
  )
}

export async function dismissSetupCard(userId: UserId): Promise<void> {
  await (await users()).updateOne(
    { userId },
    { $set: { 'onboarding.setupDismissedAt': new Date(), updatedAt: new Date() } },
  )
}

export async function countUsers(): Promise<number> {
  return (await users()).countDocuments()
}

export async function insertUser(doc: User): Promise<void> {
  await (await users()).insertOne(doc)
}

/** Everything about a person except their roles, status and password, each of
 * which has its own narrower path. */
export async function updateUserProfile(
  userId: UserId,
  changes: Partial<Pick<User, 'name' | 'email' | 'departmentId' | 'teamId' | 'accessLevel'>>,
): Promise<void> {
  await (await users()).updateOne(
    { userId },
    { $set: { ...changes, updatedAt: new Date() } },
  )
}

/**
 * Replace somebody's password.
 *
 * `passwordChangedAt` is stored truncated to the second because a JWT records
 * its issue time in whole seconds: keeping finer precision here would retire
 * the very session issued moments later.
 */
export async function updateUserPassword(
  userId: UserId,
  passwordHash: string,
  changedAt: Date = new Date(),
): Promise<void> {
  const toTheSecond = new Date(Math.floor(changedAt.getTime() / 1000) * 1000)
  await (await users()).updateOne(
    { userId },
    { $set: { passwordHash, passwordChangedAt: toTheSecond, updatedAt: changedAt } },
  )
}
