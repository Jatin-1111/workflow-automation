/**
 * Work this person raised that is now with someone else (spec §15).
 *
 * Without it, anything you hand on vanishes from your view - which is the
 * blindness that sends people back to WhatsApp to ask where something got to.
 */

import { Count, Pill } from '@/features/ui/primitives'
import type { WaitingItem } from './queries'

export function WaitingList({ items }: { items: WaitingItem[] }) {
  if (items.length === 0) return null

  return (
    <div>
      <h2 className="mb-2 px-1 text-sm font-semibold text-foreground">
        Waiting on others
        <Count value={items.length} />
      </h2>

      <ul className="overflow-hidden rounded-xl border border-border bg-surface">
        {items.map((item) => (
          <li
            key={item.instanceId}
            className="flex flex-col gap-2 border-b border-border px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-subtle">
                <span className="font-medium text-muted">{item.projectName}</span>
                <span aria-hidden>/</span>
                <span>{item.workflowName}</span>
                <span aria-hidden>/</span>
                <span className="truncate">{item.instanceTitle}</span>
              </span>
              <span className="mt-1 block text-sm text-foreground">
                Waiting for {item.waitingOn.join(', ')} — {item.stageName}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-3 sm:justify-end">
              {item.slaBreached ? <Pill tone="overdue">SLA breached</Pill> : null}
              <span className="text-xs text-muted sm:w-24 sm:text-right">
                {item.hoursWaiting}h waiting
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
