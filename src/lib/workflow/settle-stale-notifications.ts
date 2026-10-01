/**
 * Clear the notifications that went stale before work moving cleared them.
 *
 * Settling now happens as each task finishes or moves, but everything sent
 * before that still sits unread. This applies the same rule to what is
 * stored. Safe to run any number of times: it only ever marks read what no
 * longer asks anything of its reader.
 */

import {
  listTaskIdsWithUnread,
  markTaskNotificationsSettled,
} from '@/lib/db/repositories/notifications'
import { findTasksByIds } from '@/lib/db/repositories/tasks'
import { ACTIONABLE_KINDS, settlementForTask } from './settled-notifications'

export async function settleStaleNotifications(
  now: Date = new Date(),
): Promise<{ tasks: number; settled: number }> {
  const taskIds = await listTaskIdsWithUnread(ACTIONABLE_KINDS)
  const tasks = await findTasksByIds(taskIds)

  let settled = 0
  for (const task of tasks) {
    const { stillHeldBy } = settlementForTask(task)
    settled += await markTaskNotificationsSettled(task.taskId, ACTIONABLE_KINDS, stillHeldBy, now)
  }
  return { tasks: tasks.length, settled }
}
