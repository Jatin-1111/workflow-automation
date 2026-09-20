/** Display formatting for deadlines and labels. Pure. */

import { endOfBusinessDay } from '@/lib/workflow/business-day'

const DAY_MS = 86_400_000

/**
 * A deadline phrased the way someone would say it out loud: Today, Tomorrow,
 * a weekday this week, otherwise a date (spec §8).
 */
export function formatDeadline(
  dueAt: Date | undefined,
  now: Date,
): { label: string; overdue: boolean } {
  if (!dueAt) return { label: 'No deadline', overdue: false }

  if (dueAt.getTime() < now.getTime()) {
    const hours = Math.floor((now.getTime() - dueAt.getTime()) / 3_600_000)
    if (hours < 24) return { label: `Overdue ${hours}h`, overdue: true }
    return { label: `Overdue ${Math.floor(hours / 24)}d`, overdue: true }
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
