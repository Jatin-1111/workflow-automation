/**
 * MY PROFILE — who I am and what I am carrying (spec §44).
 *
 * Reads only the signed-in person's own record; seeing anyone else's work
 * goes through the team views, which require the workload capability.
 */

import Link from 'next/link'
import { requireUser } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { EmptyRow, Section } from '@/features/management/section'
import { StatTile } from '@/features/management/stat-tile'
import { PasswordPanel } from '@/features/profile/password-panel'
import { getMyWork } from '@/features/my-work/queries'
import { humanise } from '@/features/my-work/format'
import { listDepartments } from '@/lib/db/repositories/departments'
import { listRoles } from '@/lib/db/repositories/roles'
import { listTeams } from '@/lib/db/repositories/teams'
import { listTimelineForActor } from '@/lib/db/repositories/timeline-events'
import { findInstancesByIds } from '@/lib/db/repositories/workflow-instances'
import { CAPABILITIES_BY_ACCESS_LEVEL } from '@/lib/auth/permissions'

export default async function ProfilePage() {
  const user = await requireUser()
  const now = new Date()

  const [work, roles, departments, teams, activity] = await Promise.all([
    getMyWork(user.userId, now),
    listRoles(),
    listDepartments(),
    listTeams(),
    listTimelineForActor(user.userId, 20),
  ])

  // Events name an instance by id; the feed needs its title to read as English.
  const activityInstances = await findInstancesByIds([
    ...new Set(activity.map((event) => event.instanceId)),
  ])
  const instanceTitle = new Map(
    activityInstances.map((instance) => [instance.instanceId as string, instance.title]),
  )

  const roleNames = user.roleIds.map(
    (roleId) => roles.find((role) => role.roleId === roleId)?.name ?? roleId,
  )
  const department = departments.find(
    (candidate) => candidate.departmentId === user.departmentId,
  )
  const team = teams.find((candidate) => candidate.teamId === user.teamId)

  const completed = work.items.filter((item) => item.bucket === 'completed')
  const overdue = work.items.filter((item) => item.bucket === 'overdue')
  const active = work.items.filter((item) => item.bucket !== 'completed')
  const approvals = work.items.filter((item) => item.status === 'pending_approval')

  return (
    <AppShell user={user} current="/profile">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="font-mono">{user.userId}</span> · {user.email}
            {user.phone ? ` · ${user.phone}` : ''}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {humanise(user.accessLevel)}
            {` · ${humanise(user.status)}`}
            {department ? ` · ${department.name}` : ''}
            {team ? ` · ${team.name}` : ''}
            {user.joiningDate
              ? ` · joined ${user.joiningDate.toLocaleDateString('en-GB', {
                  month: 'short',
                  year: 'numeric',
                })}`
              : ''}
          </p>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <StatTile label="Active work" value={active.length} href="/my-work?view=all" />
          <StatTile
            label="Overdue"
            value={overdue.length}
            tone={overdue.length > 0 ? 'alert' : 'neutral'}
            href="/my-work?view=overdue"
          />
          <StatTile
            label="Awaiting my approval"
            value={approvals.length}
            tone={approvals.length > 0 ? 'action' : 'neutral'}
          />
          <StatTile
            label="Completed"
            value={completed.length}
            tone="good"
            href="/my-work?view=completed"
          />
        </div>

        <div className="space-y-6">
          {/* Who I am on the left, what I am carrying on the right: the
              page stacked nine blocks in one column and scrolled for
              screens on a wide display. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
            <div className="space-y-6">
          <Section
            title="My workflow roles"
            count={roleNames.length}
            description="What stages the platform routes to me. An administrator can change these."
          >
            {roleNames.length === 0 ? (
              <EmptyRow>No workflow roles assigned yet.</EmptyRow>
            ) : (
              <ul className="flex flex-wrap gap-2 px-4 py-3">
                {roleNames.map((role) => (
                  <li
                    key={role}
                    className="rounded border border-border bg-accent-soft px-2 py-1 text-xs text-accent"
                  >
                    {role}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <PasswordPanel />

          <Section
            title="What I can do"
            description="Granted by my access level, separately from my workflow roles."
          >
            <ul className="flex flex-wrap gap-2 px-4 py-3">
              {CAPABILITIES_BY_ACCESS_LEVEL[user.accessLevel].map((capability) => (
                <li
                  key={capability}
                  className="rounded border border-border px-2 py-1 font-mono text-xs text-muted"
                >
                  {capability}
                </li>
              ))}
            </ul>
          </Section>
            </div>

            <div className="space-y-6">
          <WorkSection
            title="My active work"
            items={active}
            empty="Nothing open. Work arrives here when somebody finishes the stage before yours."
          />

          <WorkSection
            title="My overdue work"
            items={overdue}
            empty="Nothing is late."
          />

          <WorkSection
            title="My approvals"
            items={approvals}
            empty="Nothing is waiting on your decision."
          />

          <WorkSection
            title="My completed work"
            items={completed}
            empty="Nothing completed yet."
          />

          <Section
            title="My activity"
            count={activity.length}
            description="Everything I have done, newest first. The record is append-only."
          >
            {activity.length === 0 ? (
              <EmptyRow>Nothing recorded yet.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {activity.map((event) => (
                  <li key={event.eventId} className="px-5 py-3">
                    <p className="text-sm">
                      <span className="text-muted">
                        {humanise(event.action).toLowerCase()}
                      </span>
                      {event.stageKey ? (
                        <span className="font-medium"> · {humanise(event.stageKey)}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-subtle">
                      {instanceTitle.get(event.instanceId) ?? event.instanceId} ·{' '}
                      {event.at.toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {event.comment ? (
                      <p className="mt-1 text-xs text-muted">{event.comment}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}

/**
 * One person's work, listed the same way four times over.
 *
 * §44 asks for active, overdue, approvals and completed as separate sections;
 * they differ only in which rows they hold, so they share a renderer.
 */
function WorkSection({
  title,
  items,
  empty,
}: {
  title: string
  items: { taskId: string; stageName: string; projectName: string; instanceTitle: string }[]
  empty: string
}) {
  return (
    <Section title={title} count={items.length}>
      {items.length === 0 ? (
        <EmptyRow>{empty}</EmptyRow>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 10).map((item) => (
            <li key={item.taskId}>
              <Link
                href={`/tasks/${item.taskId}`}
                className="flex items-center gap-4 px-5 py-3 transition hover:bg-accent-soft/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{item.stageName}</span>
                  <span className="block truncate text-xs text-subtle">
                    {item.projectName} · {item.instanceTitle}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export const dynamic = 'force-dynamic'