/** PROJECT DASHBOARD — one initiative and its live workflows (spec §18). */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { getProjectDashboard } from '@/features/management/queries'
import { EmptyRow, Section } from '@/features/management/section'
import { StatTile } from '@/features/management/stat-tile'
import { humanise } from '@/features/my-work/format'
import { isEntityId } from '@/lib/ids/format'

export default async function ProjectPage({ params }: PageProps<'/projects/[projectId]'>) {
  const user = await requireCapability('project.view_dashboard')
  const { projectId } = await params
  if (!isEntityId(projectId, 'project')) notFound()

  const now = new Date()
  const project = await getProjectDashboard(projectId, now)
  if (!project) notFound()

  const active = project.instances.filter((row) => row.status !== 'completed')
  const completed = project.instances.filter((row) => row.status === 'completed')

  return (
    <AppShell user={user} current="/projects">
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <nav className="mb-4 text-xs text-subtle">
          <Link href="/projects" className="transition hover:text-foreground">
            Projects
          </Link>
          <span aria-hidden> / </span>
          <span>{project.name}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {project.description}
            {project.ownerName ? ` · Owner: ${project.ownerName}` : ''}
          </p>
          <p className="mt-1 text-xs text-subtle">
            Team: {project.memberNames.join(', ')}
          </p>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatTile label="Active workflows" value={active.length} />
          <StatTile
            label="Overdue"
            value={active.filter((row) => row.overdue).length}
            tone={active.some((row) => row.overdue) ? 'alert' : 'neutral'}
          />
          <StatTile label="Completed" value={completed.length} tone="good" />
        </div>

        <div className="space-y-6">
          <Section title="Active workflows" count={active.length}>
            {active.length === 0 ? (
              <EmptyRow>Nothing is currently running in this project.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {active.map((row) => (
                  <li key={row.instanceId} className="flex items-start gap-4 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{row.title}</span>
                      <span className="text-xs text-subtle">
                        {row.currentStage ?? 'No open stage'}
                        {row.assignees.length > 0
                          ? ` · with ${row.assignees.join(', ')}`
                          : ''}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span
                        className={`block text-xs ${
                          row.overdue ? 'font-medium text-status-overdue' : 'text-muted'
                        }`}
                      >
                        {row.hoursWaiting}h at this stage
                      </span>
                      {row.slaBreached ? (
                        <span className="text-[11px] text-status-overdue">
                          SLA breached
                        </span>
                      ) : null}
                    </span>

                    {row.currentTaskId ? (
                      <Link
                        href={`/tasks/${row.currentTaskId}`}
                        className="shrink-0 text-xs text-accent underline-offset-4 hover:underline"
                      >
                        Open
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Completed" count={completed.length}>
            {completed.length === 0 ? (
              <EmptyRow>Nothing has completed yet.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {completed.map((row) => (
                  <li key={row.instanceId} className="flex items-center gap-4 px-5 py-3">
                    <span className="min-w-0 flex-1 text-sm">{row.title}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {humanise(row.status)}
                      {row.completedAt
                        ? ` · ${row.completedAt.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}`
                        : ''}
                    </span>
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
