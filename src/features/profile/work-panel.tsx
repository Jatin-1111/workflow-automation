/**
 * My work, in one panel with a tab for each question.
 *
 * Active, overdue, approvals and completed (spec §44) differ only in which
 * rows they hold, and they used to be four panels stacked down the page, three
 * of them usually a single "Nothing…" line in a tall box. Tabs keep all four
 * one click away and keep the page the height of what is actually there.
 *
 * The tab is in the address (`?tab=overdue`), so it survives a reload and can
 * be linked to, and the panel stays a server component.
 */

import Link from 'next/link'
import { Empty, Panel } from '@/features/ui/primitives'
import { formatDeadline } from '@/features/my-work/format'

export const WORK_TABS = ['active', 'overdue', 'approvals', 'completed'] as const
export type WorkTab = (typeof WORK_TABS)[number]

const LABELS: Record<WorkTab, string> = {
  active: 'Active',
  overdue: 'Overdue',
  approvals: 'Approvals',
  completed: 'Completed',
}

const EMPTY: Record<WorkTab, string> = {
  active: 'Nothing open. Work arrives here when somebody finishes the stage before yours.',
  overdue: 'Nothing is late.',
  approvals: 'Nothing is waiting on your decision.',
  completed: 'Nothing completed yet.',
}

/** Where "see all of these" leads, for the tabs My Work has a view for. */
const MY_WORK_VIEW: Partial<Record<WorkTab, string>> = {
  active: '/my-work?view=all',
  overdue: '/my-work?view=overdue',
  completed: '/my-work?view=completed',
}

const SHOWN = 10

export interface ProfileWorkItem {
  taskId: string
  stageName: string
  projectName: string
  instanceTitle: string
  dueAt?: Date
  overdue: boolean
  completed: boolean
}

export function parseWorkTab(value: string | string[] | undefined): WorkTab {
  const raw = Array.isArray(value) ? value[0] : value
  return (WORK_TABS as readonly string[]).includes(raw ?? '') ? (raw as WorkTab) : 'active'
}

export function WorkPanel({
  tab,
  groups,
  now,
}: {
  tab: WorkTab
  groups: Record<WorkTab, ProfileWorkItem[]>
  now: Date
}) {
  const items = groups[tab]
  const more = MY_WORK_VIEW[tab]

  return (
    <Panel
      fill
      title="My work"
      description="What I am carrying, and what I have finished."
      actions={
        more && items.length > SHOWN ? (
          <Link
            href={more}
            className="transition-ui text-xs font-semibold text-accent underline-offset-4 hover:underline"
          >
            Open all {items.length} in My Work
          </Link>
        ) : null
      }
    >
      <nav aria-label="My work" className="flex flex-wrap items-center gap-1.5 border-b border-border px-5 py-3">
        {WORK_TABS.map((candidate) => (
          <Link
            key={candidate}
            href={candidate === 'active' ? '/profile' : `/profile?tab=${candidate}`}
            scroll={false}
            aria-current={candidate === tab ? 'page' : undefined}
            className={`transition-ui flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold active:scale-[0.97] max-sm:min-h-11 ${
              candidate === tab
                ? 'bg-foreground text-white'
                : 'text-muted hover:bg-sidebar hover:text-foreground'
            }`}
          >
            {LABELS[candidate]}
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${
                candidate === tab ? 'bg-white/20' : 'bg-sidebar'
              } ${
                candidate === 'overdue' && groups.overdue.length > 0 && candidate !== tab
                  ? 'font-bold text-status-overdue'
                  : ''
              }`}
            >
              {groups[candidate].length}
            </span>
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <Empty>{EMPTY[tab]}</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, SHOWN).map((item) => {
            const deadline = item.completed
              ? null
              : item.dueAt
                ? formatDeadline(item.dueAt, now)
                : null
            return (
              <li key={item.taskId}>
                <Link
                  href={`/tasks/${item.taskId}`}
                  className="transition-ui flex items-center gap-4 px-5 py-3.5 hover:bg-surface-sunken"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold [overflow-wrap:anywhere]">
                      {item.stageName}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted [overflow-wrap:anywhere]">
                      {item.projectName} · {item.instanceTitle}
                    </span>
                  </span>
                  {deadline ? (
                    <span
                      className={`shrink-0 text-xs ${
                        deadline.overdue ? 'font-bold text-status-overdue' : 'font-medium text-muted'
                      }`}
                    >
                      {deadline.label}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
