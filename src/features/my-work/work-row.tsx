/**
 * One row of assigned work.
 *
 * Shows the full trail the brief asks for - Major Project, Workflow, Instance,
 * Stage, Deadline, Status - so the row answers "what is this and what do I do
 * about it" without opening anything (spec §8).
 */

import Link from 'next/link'
import { StatusBadge } from './status-badge'
import { formatDeadline } from './format'
import type { WorkItem } from './queries'

export function WorkRow({ item, now }: { item: WorkItem; now: Date }) {
  const deadline = formatDeadline(item.dueAt, now)

  return (
    <li>
      <Link
        href={`/tasks/${item.taskId}`}
        className="flex flex-col gap-2 border-b border-border px-4 py-3 transition last:border-b-0 hover:bg-accent-soft/60 sm:flex-row sm:items-start sm:gap-4"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
            <span className="font-medium text-muted">{item.projectName}</span>
            <span aria-hidden>·</span>
            <span>{item.workflowName}</span>
            <span aria-hidden>·</span>
            <span>{item.instanceTitle}</span>
            {item.revisionRound > 1 ? (
              <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted">
                Revision {item.revisionRound}
              </span>
            ) : null}
          </span>

          <span className="mt-1 block text-sm font-medium text-foreground">
            {item.stageName}
          </span>

          {item.checklist ? (
            <span className="mt-1 block text-xs text-subtle">
              Checklist {item.checklist.done} / {item.checklist.total}
            </span>
          ) : null}
        </span>

        <span className="flex shrink-0 items-center gap-3 sm:justify-end">
          {item.slaBreached ? (
            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-status-overdue">
              SLA breached
            </span>
          ) : null}
          <span
            className={`text-xs sm:w-28 sm:text-right ${
              deadline.overdue ? 'font-medium text-status-overdue' : 'text-muted'
            }`}
          >
            {deadline.label}
          </span>
          <StatusBadge status={item.status} priority={item.priority} />
        </span>
      </Link>
    </li>
  )
}
