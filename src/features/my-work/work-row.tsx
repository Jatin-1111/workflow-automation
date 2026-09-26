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
import {
  Pill,
  ProjectBar,
  ProjectTag,
} from '@/features/ui/primitives'
import type { WorkItem } from './queries'

export function WorkRow({ item, now }: { item: WorkItem; now: Date }) {
  const deadline = formatDeadline(item.dueAt, now)

  return (
    <li>
      <Link
        href={`/tasks/${item.taskId}`}
        className="flex flex-col gap-2 border-b border-border py-3.5 pl-4 pr-5 transition-ui last:border-b-0 hover:bg-surface-sunken sm:flex-row sm:items-center sm:gap-4"
      >
        {/* My Work mixes every project the person has work in, so the project
            is a colour before it is a word. */}
        <ProjectBar
          color={item.projectColor}
          seed={item.projectName}
          className="hidden w-1 self-stretch rounded-full sm:block"
        />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-subtle">
            <ProjectTag
              name={item.projectName}
              color={item.projectColor}
              seed={item.projectName}
            />
            <span>{item.workflowName}</span>
            <span aria-hidden>/</span>
            <span className="truncate">{item.instanceTitle}</span>
          </span>

          <span className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{item.stageName}</span>
            {item.revisionRound > 1 ? (
              <Pill tone="action">Revision {item.revisionRound}</Pill>
            ) : null}
            {item.checklist ? (
              <span className="text-xs tabular-nums text-subtle">
                Checklist {item.checklist.done}/{item.checklist.total}
              </span>
            ) : null}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-3">
          {item.slaBreached ? <Pill tone="overdue">SLA breached</Pill> : null}
          <span
            className={`text-xs sm:w-24 sm:text-right ${
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
