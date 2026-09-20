/**
 * My Work sections (spec §9).
 *
 * Derived from a task's own state at read time rather than stored, so a task
 * can never drift out of sync with the section it appears in - an overdue task
 * becomes overdue by the clock passing, with nothing to update.
 */

import type { Task } from '@/lib/types/task'
import type { WorkBucket } from '@/lib/types/status'
import { businessTimeZone, endOfBusinessDay } from './business-day'

export function deriveBucket(
  task: Task,
  now: Date,
  timeZone = businessTimeZone(),
): WorkBucket {
  if (task.status === 'completed' || task.completedAt) return 'completed'
  if (task.status === 'cancelled') return 'completed'

  // Overdue wins over everything else: it is the one thing that must not hide
  // inside another section.
  if (task.dueAt && task.dueAt.getTime() < now.getTime()) return 'overdue'

  if (task.status === 'waiting' || task.status === 'blocked') return 'waiting'
  if (task.status === 'in_progress') return 'in_progress'

  // Not started or awaiting a decision: due today means it needs attention now,
  // anything later is still ahead.
  if (!task.dueAt || task.dueAt.getTime() <= endOfBusinessDay(now, timeZone).getTime()) {
    return 'needs_action'
  }
  return 'upcoming'
}

export function isOverdue(task: Task, now: Date): boolean {
  return deriveBucket(task, now) === 'overdue'
}

/** True once the SLA window has elapsed, used by the stuck-work view (spec §43). */
export function hasBreachedSla(task: Task, now: Date): boolean {
  if (task.completedAt || !task.slaBreachAt) return false
  return task.slaBreachAt.getTime() < now.getTime()
}

/** Whole hours a task has been sitting unfinished. */
export function hoursWaiting(task: Task, now: Date): number {
  const since = task.activatedAt.getTime()
  return Math.max(0, Math.floor((now.getTime() - since) / 3_600_000))
}

export const BUCKET_LABELS: Record<WorkBucket, string> = {
  needs_action: 'Needs action',
  in_progress: 'In progress',
  waiting: 'Waiting',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  completed: 'Completed',
}
