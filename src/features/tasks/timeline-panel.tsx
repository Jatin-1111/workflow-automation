/** The instance's append-only history (spec §33). */

import type { TimelineRow } from './queries'
import { SentenceText } from './timeline-sentence'

export function TimelinePanel({
  events,
  reference,
}: {
  events: TimelineRow[]
  /**
   * The run's permanent id. It sat in the middle of "Assigned to you", where
   * it read as part of the sentence; here it is labelled for what it is —
   * something to quote when asking about this run.
   */
  reference?: string
}) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Activity history</h2>
        {reference ? (
          <p className="mt-0.5 text-xs text-subtle">
            Reference <span className="font-mono">{reference}</span>
          </p>
        ) : null}
      </div>
      <ol className="divide-y divide-border">
        {[...events].reverse().map((event) => (
          <li key={event.eventId} className="px-5 py-3">
            <p className="text-sm text-muted">
              <SentenceText sentence={event.sentence} />
            </p>
            <p className="text-xs text-subtle">
              {event.at.toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
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
