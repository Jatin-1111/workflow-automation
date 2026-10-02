/**
 * MANAGEMENT OVERVIEW (spec §16).
 *
 * The operational screen for managers and administrators: what is running,
 * what is stuck, who is carrying what, and what falls due next.
 */

import { OverviewPage } from '@/features/management/overview-page'
import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { getManagementOverview } from '@/features/management/queries'
import { OverviewFilterBar } from '@/features/management/overview-filters'
import { parseOverviewFilters } from '@/features/management/filters'
import { listDepartments } from '@/lib/db/repositories/departments'
import { listProjects } from '@/lib/db/repositories/projects'
import { listRoles } from '@/lib/db/repositories/roles'
import { listUsers } from '@/lib/db/repositories/users'
import { listActiveTemplates } from '@/lib/db/repositories/workflow-templates'
import {
  Activity,
  CalendarClock,
  CheckCheck,
  CircleCheckBig,
  CircleSlash,
  FolderKanban,
  Stamp,
  TriangleAlert,
} from 'lucide-react'
import { StatTile } from '@/features/management/stat-tile'
import { QuickReassign } from '@/features/management/quick-reassign'
import { EmptyRow, Section } from '@/features/management/section'
import { formatDeadline } from '@/features/my-work/format'
import { TileListPanel } from '@/features/management/tile-list'
import {
  TILE_LABELS,
  parseOverviewTile,
  tileHref,
  type OverviewTile,
} from '@/features/management/overview-tiles'
import type { StatTone } from '@/features/management/stat-tile'
import type { LucideIcon } from 'lucide-react'

/** How each headline number looks; what it counts lives with the rule. */
const TILE_LOOK: Record<OverviewTile, { tone: StatTone; icon: LucideIcon }> = {
  active: { tone: 'progress', icon: Activity },
  approvals: { tone: 'action', icon: Stamp },
  overdue: { tone: 'alert', icon: TriangleAlert },
  due_today: { tone: 'action', icon: CalendarClock },
  blocked: { tone: 'alert', icon: CircleSlash },
  completed_week: { tone: 'good', icon: CircleCheckBig },
  completed: { tone: 'good', icon: CheckCheck },
}

export default async function ManagementDashboardPage({
  searchParams,
}: PageProps<'/dashboard'>) {
  const user = await requireCapability('management.view_dashboard')
  const now = new Date()
  const params = await searchParams
  const filters = parseOverviewFilters(params)
  const open = parseOverviewTile(params)

  const [overview, projects, templates, people, roles, departments] = await Promise.all([
    getManagementOverview(now, filters, open),
    listProjects(),
    listActiveTemplates(),
    listUsers(),
    listRoles(),
    listDepartments(),
  ])
  const { counts } = overview

  return (
    <AppShell user={user} current="/dashboard">
      <OverviewPage current="/dashboard">

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Management Overview</h1>
          <p className="mt-1 text-sm text-muted">
            Business Orbit operations at {now.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </p>
        </div>

        <OverviewFilterBar
          filters={filters}
          open={open}
          projects={projects.map((p) => ({ value: p.projectId, label: p.name }))}
          workflows={templates.map((t) => ({ value: t.workflowId, label: t.name }))}
          people={people
            .filter((person) => person.status === 'active')
            .map((person) => ({ value: person.userId, label: person.name }))}
          roles={roles.map((r) => ({ value: r.roleId, label: r.name }))}
          departments={departments.map((d) => ({ value: d.departmentId, label: d.name }))}
        />

        {/* Each number opens the list it counts, right here. They were plain
            boxes: "Overdue tasks 1" looked like a way in and was not one. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(TILE_LOOK) as OverviewTile[]).map((tile) => (
            <StatTile
              key={tile}
              label={TILE_LABELS[tile]}
              value={counts[tile]}
              tone={TILE_LOOK[tile].tone}
              icon={TILE_LOOK[tile].icon}
              href={tileHref(filters, tile, open)}
              selected={tile === open}
            />
          ))}
          <StatTile
            label="Projects"
            value={overview.projects.length}
            icon={FolderKanban}
            href="/projects"
          />
        </div>

        {overview.tileList ? (
          <TileListPanel list={overview.tileList} filters={filters} now={now} />
        ) : null}

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
                    /* The row reads as a link and acts as a row: the reassign
                       control sits beside the link rather than inside it,
                       because a button nested in a link is neither. */
                    <li key={item.taskId} className="px-4 py-3 transition-ui hover:bg-surface-sunken">
                      <Link
                        href={`/tasks/${item.taskId}`}
                        className="flex items-start gap-4"
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

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <QuickReassign
                          taskId={item.taskId}
                          currentAssignees={item.assigneeIds}
                          people={overview.workload.map((person) => ({
                            userId: person.userId,
                            name: person.name,
                            openTasks: person.active,
                          }))}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Project status" count={overview.projects.length}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-left text-xs font-medium text-muted">
                    <th className="px-5 py-2.5 font-medium">Project</th>
                    <th className="px-5 py-2.5 text-right font-medium">Active</th>
                    <th className="px-5 py-2.5 text-right font-medium">Approvals</th>
                    <th className="px-5 py-2.5 text-right font-medium">Overdue</th>
                    <th className="px-5 py-2.5 text-right font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border [&>tr]:transition-ui [&>tr:hover]:bg-surface-sunken">
                  {overview.projects.map((project) => (
                    <tr key={project.projectId}>
                      <td className="px-5 py-3">
                        <Link
                          href={`/projects/${project.projectId}`}
                          className="font-medium text-foreground transition hover:text-accent"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {project.activeInstances}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {project.pendingApprovals}
                      </td>
                      <td
                        className={`px-5 py-3 text-right tabular-nums ${
                          project.overdueTasks > 0 ? 'font-medium text-status-overdue' : ''
                        }`}
                      >
                        {project.overdueTasks}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted">
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
                  <tr className="border-b border-border bg-surface-sunken text-left text-xs font-medium text-muted">
                    <th className="px-5 py-2.5 font-medium">Person</th>
                    <th className="px-5 py-2.5 text-right font-medium">Active</th>
                    <th className="px-5 py-2.5 text-right font-medium">Today</th>
                    <th className="px-5 py-2.5 text-right font-medium">Overdue</th>
                    <th className="px-5 py-2.5 text-right font-medium">Approve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border [&>tr]:transition-ui [&>tr:hover]:bg-surface-sunken">
                  {overview.workload.map((person) => (
                    <tr key={person.userId}>
                      <td className="px-5 py-3">
                        <Link
                          href={`/team/${person.userId}`}
                          className="font-medium text-foreground transition hover:text-accent"
                        >
                          {person.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{person.active}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {person.dueToday}
                      </td>
                      <td
                        className={`px-5 py-3 text-right tabular-nums ${
                          person.overdue > 0 ? 'font-medium text-status-overdue' : 'text-muted'
                        }`}
                      >
                        {person.overdue}
                      </td>
                      <td
                        className={`px-5 py-3 text-right tabular-nums ${
                          person.pendingApprovals > 0 ? 'text-status-action' : 'text-muted'
                        }`}
                      >
                        {person.pendingApprovals}
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
                          className="flex items-center gap-3 px-5 py-3 transition hover:bg-accent-soft/60"
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
      </OverviewPage>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
