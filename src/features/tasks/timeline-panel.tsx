/** The instance's append-only history (spec §33). */

import { humanise } from '@/features/my-work/format'
import type { TimelineRow } from './queries'

export function TimelinePanel({ events }: { events: TimelineRow[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
        Activity history
      </h2>
      <ol className="divide-y divide-border">
        {[...events].reverse().map((event) => (
          <li key={event.eventId} className="px-5 py-3">
            <p className="text-sm">
              <span className="font-medium">{event.actorName}</span>{' '}
              <span className="text-muted">{humanise(event.action).toLowerCase()}</span>
            </p>
            <p className="text-xs text-subtle">
              {event.at.toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {event.stageKey ? ` · ${humanise(event.stageKey)}` : ''}
            </p>
            {event.comment ? (
              <p className="mt-1 border-l-2 border-border pl-2 text-sm text-muted">
                {event.comment}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
