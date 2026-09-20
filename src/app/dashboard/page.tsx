/**
 * MANAGEMENT OVERVIEW (spec §16).
 *
 * The operational screen for managers and administrators: what is running,
 * what is stuck, who is carrying what, and what falls due next.
 */

import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { getManagementOverview } from '@/features/management/queries'
import { StatTile } from '@/features/management/stat-tile'
import { EmptyRow, Section } from '@/features/management/section'
import { formatDeadline } from '@/features/my-work/format'

export default async function ManagementDashboardPage() {
  const user = await requireCapability('management.view_dashboard')
  const now = new Date()
  const overview = await getManagementOverview(now)
  const { counts } = overview

  return (
    <AppShell user={user} current="/dashboard">
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Management Overview</h1>
          <p className="mt-1 text-sm text-muted">
            Business Orbit operations at {now.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Active workflows" value={counts.activeWorkflows} />
          <StatTile
            label="Pending approvals"
            value={counts.pendingApprovals}
            tone={counts.pendingApprovals > 0 ? 'action' : 'neutral'}
          />
          <StatTile
            label="Overdue tasks"
            value={counts.overdueTasks}
            tone={counts.overdueTasks > 0 ? 'alert' : 'neutral'}
          />
          <StatTile label="Due today" value={counts.dueToday} />
          <StatTile label="Blocked" value={counts.blocked} tone={counts.blocked > 0 ? 'alert' : 'neutral'} />
          <StatTile label="Completed this week" value={counts.completedThisWeek} tone="good" />
          <StatTile label="Completed overall" value={counts.completedTotal} tone="good" />
          <StatTile label="Projects" value={overview.projects.length} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-6">
            <Section
              title="Stuck work"
              count={overview.stuck.length}
              description="Past its deadline or past the time its stage allows."
            >
              {overview.stuck.length === 0 ? (
                <EmptyRow>Nothing is stuck. Every stage is inside its window.</EmptyRow>
              ) : (
                <ul className="divide-y divide-border">
                  {overview.stuck.map((item) => (
                    <li key={item.taskId}>
                      <Link
                        href={`/tasks/${item.taskId}`}
                        className="flex items-start gap-4 px-4 py-3 transition hover:bg-accent-soft/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 text-xs text-subtle">
                            <span className="font-medium text-muted">{item.projectName}</span>
                            <span aria-hidden>·</span>
                            <span>{item.instanceTitle}</span>
                          </span>
                          <span className="mt-1 block text-sm font-medium">
                            {item.stageName}
                          </span>
                          <span className="text-xs text-muted">
                            With {item.assignees.join(', ')}
                          </span>
                        </span>

                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-medium text-status-overdue">
                            {item.hoursWaiting}h waiting
                          </span>
                          <span className="block text-xs text-subtle">
                            {item.slaHours ? `SLA ${item.slaHours}h` : 'No SLA set'}
                            {item.overdue ? ' · overdue' : ''}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Project status" count={overview.projects.length}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-subtle">
                    <th className="px-4 py-2 font-medium">Project</th>
                    <th className="px-4 py-2 text-right font-medium">Active</th>
                    <th className="px-4 py-2 text-right font-medium">Approvals</th>
                    <th className="px-4 py-2 text-right font-medium">Overdue</th>
                    <th className="px-4 py-2 text-right font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {overview.projects.map((project) => (
                    <tr key={project.projectId}>
                      <td className="px-4 py-2">
                        <Link
                          href={`/projects/${project.projectId}`}
                          className="text-accent underline-offset-4 hover:underline"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {project.activeInstances}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {project.pendingApprovals}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${
                          project.overdueTasks > 0 ? 'font-medium text-status-overdue' : ''
                        }`}
                      >
                        {project.overdueTasks}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted">
                        {project.completedInstances}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>

          <div className="space-y-6">
            <Section
              title="Team workload"
              description="Click a person to see the work they are carrying."
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-subtle">
                    <th className="px-4 py-2 font-medium">Person</th>
                    <th className="px-4 py-2 text-right font-medium">Active</th>
                    <th className="px-4 py-2 text-right font-medium">Today</th>
                    <th className="px-4 py-2 text-right font-medium">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {overview.workload.map((person) => (
                    <tr key={person.userId}>
                      <td className="px-4 py-2">
                        <Link
                          href={`/team/${person.userId}`}
                          className="text-accent underline-offset-4 hover:underline"
                        >
                          {person.name}
                        </Link>
                        {person.pendingApprovals > 0 ? (
                          <span className="ml-2 text-xs text-status-action">
                            {person.pendingApprovals} to approve
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{person.active}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {person.dueToday}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${
                          person.overdue > 0 ? 'font-medium text-status-overdue' : 'text-muted'
                        }`}
                      >
                        {person.overdue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="Upcoming deadlines" count={overview.upcoming.length}>
              {overview.upcoming.length === 0 ? (
                <EmptyRow>Nothing is scheduled.</EmptyRow>
              ) : (
                <ul className="divide-y divide-border">
                  {overview.upcoming.map((item) => {
                    const deadline = formatDeadline(item.dueAt, now)
                    return (
                      <li key={item.taskId}>
                        <Link
                          href={`/tasks/${item.taskId}`}
                          className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-accent-soft/60"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{item.stageName}</span>
                            <span className="block truncate text-xs text-subtle">
                              {item.instanceTitle} · {item.assignees.join(', ')}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">
                            {deadline.label}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
