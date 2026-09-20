/** Data access for in-app notifications (spec §41). */

import { getCollection } from '../collection'
import { COLLECTIONS } from '../collections'
import type { UserId } from '@/lib/types/ids'
import type { Notification } from '@/lib/types/notification'

async function notifications() {
  return getCollection<Notification>(COLLECTIONS.notifications)
}

export async function insertNotifications(docs: Notification[]): Promise<void> {
  if (docs.length === 0) return
  await (await notifications()).insertMany(docs)
}

export async function listNotificationsForUser(
  recipientId: UserId,
  limit = 30,
): Promise<Notification[]> {
  return (await notifications())
    .find({ recipientId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
}

export async function countUnreadNotifications(recipientId: UserId): Promise<number> {
  return (await notifications()).countDocuments({ recipientId, readAt: { $exists: false } })
}

/** Scoped to one recipient so nobody can clear someone else's inbox. */
export async function markAllNotificationsRead(recipientId: UserId): Promise<void> {
  await (await notifications()).updateMany(
    { recipientId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
  )
}
