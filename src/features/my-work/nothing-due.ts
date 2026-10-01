/**
 * What to say when "Needs action" is empty but the person is not idle.
 *
 * The tab's empty state read "Nothing needs you right now" whatever else
 * was going on, so somebody holding two tasks due tomorrow saw "2 open
 * items" in the header and "Nothing needs you right now" directly beneath
 * it. Worse, a task you have started moves to In progress whatever its
 * deadline, so even work due today could leave this tab empty and the
 * message untrue.
 *
 * This only changes the words, and only when there is something to point
 * at: work of yours on another tab. Waiting is left out because nothing in
 * it is yours to do, and Overdue already shows here.
 *
 * Pure, so the wording can be tested without rendering anything.
 */

export interface ElsewhereCounts {
  in_progress: number
  upcoming: number
}

export interface NothingDue {
  headline: string
  detail: string
  /** Tabs worth opening, in the order they are mentioned. */
  links: { view: 'in_progress' | 'upcoming'; label: string }[]
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** null when there is genuinely nothing of theirs anywhere else. */
export function nothingDueToday(counts: ElsewhereCounts): NothingDue | null {
  const total = counts.in_progress + counts.upcoming
  if (total === 0) return null

  const parts: string[] = []
  const links: NothingDue['links'] = []
  if (counts.in_progress > 0) {
    parts.push(`${plural(counts.in_progress, 'task', 'tasks')} you have started`)
    links.push({ view: 'in_progress', label: 'See what you started' })
  }
  if (counts.upcoming > 0) {
    parts.push(`${plural(counts.upcoming, 'task', 'tasks')} due later`)
    links.push({ view: 'upcoming', label: 'See what is coming up' })
  }

  return {
    headline: 'Nothing new is due today',
    detail: `You still have ${parts.join(' and ')}.`,
    links,
  }
}
