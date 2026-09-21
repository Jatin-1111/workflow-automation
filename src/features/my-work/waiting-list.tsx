/**
 * Work this person raised that is now with someone else (spec §15).
 *
 * Without it, anything you hand on vanishes from your view - which is the
 * blindness that sends people back to WhatsApp to ask where something got to.
 */

import type { WaitingItem } from './queries'

export function WaitingList({ items }: { items: WaitingItem[] }) {
  if (items.length === 0) return null

  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">
        Waiting on others
        <span className="ml-2 font-normal text-subtle">{items.length}</span>
      </h2>

      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((item) => (
          <li
            key={item.instanceId}
            className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 text-xs text-subtle">
                <span className="font-medium text-muted">{item.projectName}</span>
                <span aria-hidden>·</span>
                <span>{item.workflowName}</span>
                <span aria-hidden>·</span>
                <span>{item.instanceTitle}</span>
              </span>
              <span className="mt-1 block text-sm text-foreground">
                Waiting for {item.waitingOn.join(', ')} — {item.stageName}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-3 sm:justify-end">
              {item.slaBreached ? (
                <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-status-overdue">
                  SLA breached
                </span>
              ) : null}
              <span className="text-xs text-muted sm:w-28 sm:text-right">
                {item.hoursWaiting}h waiting
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
