/**
 * Group a list of notifications under the day they arrived.
 *
 * "Today", "Yesterday", then the date: the way somebody would say it. A row can
 * then show only the time, and a long list reads as a few short ones. Days are
 * the reader's own calendar days (the machine's), not 24-hour windows, so
 * something from 23:50 last night is yesterday's however early it is now.
 *
 * Pure. Newest first in, newest first out; the order inside a group is kept.
 */

export interface DayGroup<T> {
  /** Stable key for the day, such as `2026-11-24`. */
  key: string
  label: string
  items: T[]
}

function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function groupByDay<T extends { createdAt: Date }>(
  items: readonly T[],
  now: Date,
): DayGroup<T>[] {
  const today = startOfDay(now)
  const groups: DayGroup<T>[] = []

  for (const item of items) {
    const key = dayKey(item.createdAt)
    let group = groups.find((candidate) => candidate.key === key)
    if (!group) {
      const daysAgo = Math.round((today - startOfDay(item.createdAt)) / 86_400_000)
      const label =
        daysAgo === 0
          ? 'Today'
          : daysAgo === 1
            ? 'Yesterday'
            : item.createdAt.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
      group = { key, label, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }

  return groups
}
