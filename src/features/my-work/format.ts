/** Display formatting for deadlines and labels. Pure. */

import { endOfBusinessDay } from '@/lib/workflow/business-day'

const DAY_MS = 86_400_000

/** How far past a deadline, in the units the rest of the product uses. */
function lateness(dueAt: Date, at: Date): string {
  const hours = Math.floor((at.getTime() - dueAt.getTime()) / 3_600_000)
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`
}

/**
 * A deadline phrased the way someone would say it out loud: Today, Tomorrow,
 * a weekday this week, otherwise a date (spec §8).
 *
 * Finished work is measured against when it finished, not against now. It
 * used to go on counting, so a task done a day late showed "Completed" in
 * green beside "Overdue 2d" in red, and the red number grew every day after
 * the work was handed on.
 */
export function formatDeadline(
  dueAt: Date | undefined,
  now: Date,
  finishedAt?: Date,
): { label: string; overdue: boolean } {
  if (finishedAt) {
    if (!dueAt) return { label: 'Finished', overdue: false }
    return finishedAt.getTime() > dueAt.getTime()
      ? { label: `Finished ${lateness(dueAt, finishedAt)} late`, overdue: false }
      : { label: 'Finished on time', overdue: false }
  }

  if (!dueAt) return { label: 'No deadline', overdue: false }

  if (dueAt.getTime() < now.getTime()) {
    return { label: `Overdue ${lateness(dueAt, now)}`, overdue: true }
  }

  const endToday = endOfBusinessDay(now).getTime()
  if (dueAt.getTime() <= endToday) return { label: 'Today', overdue: false }
  if (dueAt.getTime() <= endToday + DAY_MS) return { label: 'Tomorrow', overdue: false }

  return {
    label: dueAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    overdue: false,
  }
}

export function humanise(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase())
}
