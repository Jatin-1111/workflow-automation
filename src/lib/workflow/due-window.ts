/**
 * "When does it fall due", as somebody would ask for it (spec §10, §49).
 *
 * Shared because both dashboards need the same four answers and they must
 * agree: a manager filtering to "due today" and the person holding the work
 * filtering the same way should see the same rows.
 *
 * Deliberately not the same thing as a My Work section. The sections are where
 * a task lives; this is a question asked of a list.
 */

import { endOfBusinessDay } from './business-day'

export const DUE_WINDOWS = ['overdue', 'today', 'week', 'none'] as const
export type DueWindow = (typeof DUE_WINDOWS)[number]

export const DUE_WINDOW_LABELS: Record<DueWindow, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Due this week',
  none: 'No deadline',
}

const WEEK_MS = 7 * 86_400_000

/**
 * Whether a dated thing falls in the window.
 *
 * Takes `overdue` rather than working it out, because the caller has already
 * decided it — from a bucket on one side and the clock on the other — and two
 * answers to the same question is how the two dashboards would drift apart.
 */
export function matchesDueWindow(
  item: { dueAt?: Date; overdue: boolean },
  window: DueWindow,
  now: Date,
): boolean {
  if (window === 'none') return item.dueAt === undefined
  if (!item.dueAt) return false

  if (window === 'overdue') return item.overdue
  // Something already past its deadline is not "due today": overdue is its
  // own answer, and showing it under both makes the counts overlap.
  if (item.overdue) return false

  const limit =
    window === 'today' ? endOfBusinessDay(now).getTime() : now.getTime() + WEEK_MS
  return item.dueAt.getTime() <= limit
}

export function isDueWindow(value: string | undefined): value is DueWindow {
  return DUE_WINDOWS.includes(value as DueWindow)
}
