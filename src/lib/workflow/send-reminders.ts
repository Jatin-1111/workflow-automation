/**
 * The scheduled half of notifications (spec §41).
 *
 * Every other notification is a side effect of somebody acting. Nobody acts
 * when a deadline passes, so this is the one thing in the platform that has to
 * be woken up rather than triggered — run it on a timer and a slipping deadline
 * is spoken about instead of quietly waited on.
 *
 * Safe to run as often as you like: what has already been said is read back
 * before anything is written, so a run that repeats sends nothing twice.
 */

import { nextIds } from '@/lib/ids/generate'
import {
  insertNotifications,
  listSentReminderKeys,
} from '@/lib/db/repositories/notifications'
import { listAllOpenTasks } from '@/lib/db/repositories/tasks'
import { findInstancesByIds } from '@/lib/db/repositories/workflow-instances'
import { planReminders } from './reminders'
import type { Notification } from '@/lib/types/notification'

export interface ReminderRun {
  /** Open tasks considered. */
  examined: number
  approaching: number
  overdue: number
  ranAt: Date
}

export async function sendDueReminders(now: Date = new Date()): Promise<ReminderRun> {
  const tasks = await listAllOpenTasks()

  if (tasks.length === 0) {
    return { examined: 0, approaching: 0, overdue: 0, ranAt: now }
  }

  const instances = await findInstancesByIds([
    ...new Set(tasks.map((task) => task.instanceId)),
  ])
  const instanceTitles = new Map(
    instances.map((instance) => [instance.instanceId as string, instance.title]),
  )

  const alreadySent = await listSentReminderKeys(tasks.map((task) => task.taskId))

  const drafts = planReminders({ tasks, instanceTitles, alreadySent, now })

  if (drafts.length > 0) {
    const ids = await nextIds('notification', drafts.length)
    const notifications: Notification[] = drafts.map((draft, index) => ({
      notificationId: ids[index],
      recipientId: draft.recipientId,
      kind: draft.kind,
      title: draft.title,
      body: draft.body,
      instanceId: draft.instanceId,
      taskId: draft.taskId,
      createdAt: now,
    }))
    await insertNotifications(notifications)
  }

  return {
    examined: tasks.length,
    approaching: drafts.filter((draft) => draft.kind === 'deadline_approaching').length,
    overdue: drafts.filter((draft) => draft.kind === 'task_overdue').length,
    ranAt: now,
  }
}
