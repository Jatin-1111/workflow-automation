/**
 * Who is carrying what, as a ranked list with a bar for the load.
 *
 * The bar is the point: four columns of numbers had to be read one at a time
 * to learn that one person had five times another's work. Bars are scaled to
 * the busiest person, so the picture is relative: it answers "who has more",
 * not "is this too much", which no number here could.
 *
 * The name never truncates — it is what you click to identify somebody — so
 * the figures wrap beneath it in a narrow tile instead. A bar is a width, not
 * an animation: this page is opened many times a day.
 */

import Link from 'next/link'
import type { WorkloadRow } from './queries'

export function WorkloadList({ rows }: { rows: WorkloadRow[] }) {
  const busiest = Math.max(1, ...rows.map((person) => person.active))

  return (
    <ul className="divide-y divide-border">
      {rows.map((person) => (
        <li key={person.userId}>
          <Link
            href={`/team/${person.userId}`}
            className="transition-ui block px-5 py-3.5 hover:bg-surface-sunken"
          >
            <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="min-w-0 text-sm font-bold [overflow-wrap:anywhere]">
                {person.name}
              </span>
              <span className="flex flex-wrap items-baseline gap-x-3 text-xs font-semibold tabular-nums">
                {person.overdue > 0 ? (
                  <span className="text-status-overdue">{person.overdue} overdue</span>
                ) : null}
                {person.pendingApprovals > 0 ? (
                  <span className="text-status-action">{person.pendingApprovals} to approve</span>
                ) : null}
                <span className="font-medium text-muted">{person.active} open</span>
              </span>
            </span>
            <span
              aria-hidden
              className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-sidebar"
            >
              <span
                className={`block h-full rounded-full ${
                  person.overdue > 0 ? 'bg-status-overdue' : 'bg-accent'
                }`}
                style={{ width: `${(person.active / busiest) * 100}%` }}
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
