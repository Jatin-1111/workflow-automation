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
import { getMyWork } from '@/features/my-work/queries'
import { humanise } from '@/features/my-work/format'
import { listDepartments } from '@/lib/db/repositories/departments'
import { listRoles } from '@/lib/db/repositories/roles'
import { listTeams } from '@/lib/db/repositories/teams'
import { CAPABILITIES_BY_ACCESS_LEVEL } from '@/lib/auth/permissions'

export default async function ProfilePage() {
  const user = await requireUser()
  const now = new Date()

  const [work, roles, departments, teams] = await Promise.all([
    getMyWork(user.userId, now),
    listRoles(),
    listDepartments(),
    listTeams(),
  ])

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
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="font-mono">{user.userId}</span> · {user.email}
            {user.phone ? ` · ${user.phone}` : ''}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {humanise(user.accessLevel)}
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

          <Section
            title="What I can do"
            description="Granted by my access level, separately from my workflow roles."
          >
            <ul className="flex flex-wrap gap-2 px-4 py-3">
              {CAPABILITIES_BY_ACCESS_LEVEL[user.accessLevel].map((capability) => (
                <li
                  key={capability}
                  className="rounded border border-border px-2 py-1 font-mono text-[11px] text-muted"
                >
                  {capability}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Recently completed" count={completed.length}>
            {completed.length === 0 ? (
              <EmptyRow>Nothing completed yet.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {completed.slice(0, 10).map((item) => (
                  <li key={item.taskId}>
                    <Link
                      href={`/tasks/${item.taskId}`}
                      className="flex items-center gap-4 px-4 py-2.5 transition hover:bg-accent-soft/60"
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
        </div>
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
