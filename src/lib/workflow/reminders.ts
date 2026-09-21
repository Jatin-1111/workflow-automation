/**
 * Deciding who needs telling about a deadline (spec §41, §42).
 *
 * Everything else in the platform reacts to somebody doing something. These
 * two notifications react to time passing, which is exactly why they need a
 * job: without them a deadline slips past in silence, and silence is the thing
 * the product exists to remove.
 *
 * Pure, so the awkward parts — not telling somebody twice, not shouting about
 * a deadline that is still days away — are settled without a database.
 */

import type { Task } from '@/lib/types/task'
import type { NotificationKind } from '@/lib/types/notification'
import type { TaskId, UserId, WorkflowInstanceId } from '@/lib/types/ids'

const HOUR = 3_600_000

/** The furthest ahead a reminder is ever sent. */
export const MAX_LOOKAHEAD_HOURS = 24

export interface ReminderDraft {
  recipientId: UserId
  kind: Extract<NotificationKind, 'deadline_approaching' | 'task_overdue'>
  title: string
  body?: string
  instanceId: WorkflowInstanceId
  taskId: TaskId
}

export interface ReminderInput {
  /** Open tasks only; a finished task has no deadline left to miss. */
  tasks: Task[]
  /** Titles for the instances those tasks belong to. */
  instanceTitles: Map<string, string>
  /** `taskId:kind:recipient` for reminders sent, so nobody is told twice. */
  alreadySent: Set<string>
  now: Date
}

/**
 * Keyed by person as well as task, because being told is something that
 * happens to somebody. A task reassigned after its overdue notice has a new
 * owner who has heard nothing, and they need telling.
 */
export function reminderKey(taskId: string, kind: string, recipientId: string): string {
  return `${taskId}:${kind}:${recipientId}`
}

/**
 * How close to its deadline a task must be before it is worth mentioning.
 *
 * Half the time the stage was given, capped at a day. A stage with a twelve
 * hour window would otherwise be "approaching" from the moment it opened,
 * which trains people to ignore the warning.
 */
export function approachWindowHours(task: Task): number {
  if (!task.dueAt) return 0
  const totalHours = (task.dueAt.getTime() - task.activatedAt.getTime()) / HOUR
  if (totalHours <= 0) return 0
  return Math.min(MAX_LOOKAHEAD_HOURS, totalHours / 2)
}

function hoursUntil(due: Date, now: Date): number {
  return (due.getTime() - now.getTime()) / HOUR
}

/** A deadline read the way somebody would say it. */
function describeRemaining(hours: number): string {
  if (hours < 1) return 'in under an hour'
  if (hours < 2) return 'in an hour'
  return `in ${Math.round(hours)} hours`
}

function describeOverdue(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.round(hours)} hours ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Everyone who should hear about a deadline right now.
 *
 * One reminder of each kind per task, to every assignee. A task that is
 * already overdue gets only the overdue notice: warning somebody that
 * something is approaching when it has already passed is worse than silence.
 */
export function planReminders(input: ReminderInput): ReminderDraft[] {
  const { tasks, instanceTitles, alreadySent, now } = input
  const drafts: ReminderDraft[] = []

  for (const task of tasks) {
    if (task.completedAt || task.status === 'completed' || task.status === 'cancelled') {
      continue
    }
    if (!task.dueAt) continue

    const remaining = hoursUntil(task.dueAt, now)
    const overdue = remaining < 0
    const kind: ReminderDraft['kind'] = overdue ? 'task_overdue' : 'deadline_approaching'

    if (!overdue && remaining > approachWindowHours(task)) continue

    const instanceTitle = instanceTitles.get(task.instanceId) ?? task.instanceId

    for (const recipientId of task.assignees) {
      if (alreadySent.has(reminderKey(task.taskId, kind, recipientId))) continue

      drafts.push({
        recipientId,
        kind,
        title: overdue
          ? `Overdue: ${task.stageName}`
          : `Due soon: ${task.stageName}`,
        body: overdue
          ? `${instanceTitle} — was due ${describeOverdue(-remaining)}.`
          : `${instanceTitle} — due ${describeRemaining(remaining)}.`,
        instanceId: task.instanceId,
        taskId: task.taskId,
      })
    }
  }

  return drafts
}
