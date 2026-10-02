/**
 * One person's open work (spec §17).
 *
 * Reached from the workload table. Guarded by the workload capability, so an
 * employee cannot read a colleague's task list by guessing a URL.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCapability } from '@/lib/auth/dal'
import {
  getManagementOverview,
  getPersonWork,
} from '@/features/management/queries'
import { QuickReassign } from '@/features/management/quick-reassign'
import { EmptyRow, Section } from '@/features/management/section'
import { formatDeadline, humanise } from '@/features/my-work/format'
import { isEntityId } from '@/lib/ids/format'

export default async function PersonPage({ params }: PageProps<'/team/[userId]'>) {
  await requireCapability('team.view_workload')
  const { userId } = await params
  if (!isEntityId(userId, 'user')) notFound()

  const now = new Date()
  const person = await getPersonWork(userId, now)
  if (!person) notFound()

  // Everybody else active, with what they are already carrying, so a move is
  // an informed one rather than a guess.
  const overview = await getManagementOverview(now)
  const others = overview.workload
    .filter((candidate) => candidate.userId !== person.userId)
    .map((candidate) => ({
      userId: candidate.userId,
      name: candidate.name,
      openTasks: candidate.active,
    }))

  return (
    <>
      <nav className="mb-4 text-xs text-subtle">
        <Link href="/team" className="transition hover:text-foreground">
          Team
        </Link>
        <span aria-hidden> / </span>
        <span>{person.name}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {person.userId} · {person.email} · {humanise(person.accessLevel)}
          {person.departmentName ? ` · ${person.departmentName}` : ''}
        </p>
        {person.roleNames.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {person.roleNames.map((role) => (
              <li
                key={role}
                className="rounded border border-border bg-accent-soft px-2 py-0.5 text-xs text-accent"
              >
                {role}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <Section title="Open work" count={person.tasks.length}>
        {person.tasks.length === 0 ? (
          <EmptyRow>Nothing is currently assigned.</EmptyRow>
        ) : (
          <ul className="divide-y divide-border">
            {person.tasks.map((task) => {
              const deadline = formatDeadline(task.dueAt, now)
              return (
                <li
                  key={task.taskId}
                  className="px-4 py-3 transition-ui hover:bg-surface-sunken"
                >
                  <Link
                    href={`/tasks/${task.taskId}`}
                    className="flex items-center gap-4"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-subtle">
                        <span className="font-medium text-muted">{task.projectName}</span>
                        <span aria-hidden>·</span>
                        <span>{task.instanceTitle}</span>
                      </span>
                      <span className="mt-1 block text-sm font-medium">
                        {task.stageName}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-xs ${
                        deadline.overdue
                          ? 'font-medium text-status-overdue'
                          : 'text-muted'
                      }`}
                    >
                      {deadline.label}
                    </span>
                    <span className="w-32 shrink-0 text-right text-xs text-muted">
                      {humanise(task.status)}
                    </span>
                  </Link>

                  {/* Looking at somebody's load is usually the moment you
                      decide to move some of it. */}
                  <div className="mt-2">
                    <QuickReassign
                      taskId={task.taskId}
                      currentAssignees={[person.userId]}
                      people={others}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>
    </>
  )
}

export const dynamic = 'force-dynamic'
