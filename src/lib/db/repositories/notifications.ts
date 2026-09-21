/** Data access for in-app notifications (spec §41). */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'
import type { TaskId, UserId } from '@/lib/types/ids'
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
    .find({ recipientId }, WITHOUT_ID)
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

/**
 * Which reminders have already gone out for a set of tasks.
 *
 * The scheduler runs repeatedly over the same open work, so this is what stops
 * it saying the same thing every time it wakes up. Scoped to the tasks in hand
 * rather than the whole collection, which keeps the read bounded as history
 * grows.
 */
export async function listSentReminderKeys(taskIds: TaskId[]): Promise<Set<string>> {
  if (taskIds.length === 0) return new Set()
  const rows = await (await notifications())
    .find(
      {
        taskId: { $in: taskIds },
        kind: { $in: ['deadline_approaching', 'task_overdue'] },
      },
      { projection: { taskId: 1, kind: 1, recipientId: 1, _id: 0 } },
    )
    .toArray()
  return new Set(rows.map((row) => `${row.taskId}:${row.kind}:${row.recipientId}`))
}
