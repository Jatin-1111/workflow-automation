/** PROJECTS — every Major Project and how it is running (spec §18). */

import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { getManagementOverview } from '@/features/management/queries'
import { Section } from '@/features/management/section'

export default async function ProjectsPage() {
  const user = await requireCapability('project.view_dashboard')
  const { projects } = await getManagementOverview()

  return (
    <AppShell user={user} current="/projects">
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            Major Projects, and the workflows running inside them.
          </p>
        </div>

        <Section title="Major Projects" count={projects.length}>
          <ul className="divide-y divide-border">
            {projects.map((project) => (
              <li key={project.projectId}>
                <Link
                  href={`/projects/${project.projectId}`}
                  className="flex items-center gap-4 px-4 py-3 transition hover:bg-accent-soft/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{project.name}</span>
                    <span className="font-mono text-xs text-subtle">
                      {project.projectId}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {project.activeInstances} active · {project.completedInstances} completed
                  </span>
                  {project.overdueTasks > 0 ? (
                    <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-status-overdue">
                      {project.overdueTasks} overdue
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
