/** PROJECTS — every Major Project and how it is running (spec §18). */

import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { getManagementOverview } from '@/features/management/queries'
import { Section } from '@/features/management/section'
import { parseSort, sortRows } from '@/features/ui/sort'
import { SortHeader } from '@/features/ui/sort-header'
import { rowLinkClass, tbodyClass, theadClass } from '@/features/ui/primitives'

const COLUMNS = ['name', 'active', 'approvals', 'overdue', 'completed'] as const
type Column = (typeof COLUMNS)[number]

export default async function ProjectsPage({ searchParams }: PageProps<'/projects'>) {
  await requireCapability('project.view_dashboard')
  const { projects } = await getManagementOverview()
  const sort = parseSort(await searchParams, COLUMNS, { key: 'overdue', direction: 'desc' })

  const pick = {
    name: (p: (typeof projects)[number]) => p.name.toLowerCase(),
    active: (p: (typeof projects)[number]) => p.activeInstances,
    approvals: (p: (typeof projects)[number]) => p.pendingApprovals,
    overdue: (p: (typeof projects)[number]) => p.overdueTasks,
    completed: (p: (typeof projects)[number]) => p.completedInstances,
  } satisfies Record<Column, unknown>

  const rows = sortRows(projects, pick[sort.key], sort.direction, (p) => p.name)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[1.625rem] font-bold leading-8 sm:text-[2rem] sm:leading-9 tracking-[-0.02em]">Projects</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
          Major Projects, and the workflows running inside them. Click a heading to sort.
        </p>
      </div>

      <Section title="Major Projects" count={rows.length}>
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className={theadClass}>
              <SortHeader label="Project" field="name" current={sort} path="/projects" />
              <SortHeader label="Active" field="active" current={sort} path="/projects" numeric firstDirection="desc" />
              <SortHeader label="Approvals" field="approvals" current={sort} path="/projects" numeric firstDirection="desc" />
              <SortHeader label="Overdue" field="overdue" current={sort} path="/projects" numeric firstDirection="desc" />
              <SortHeader label="Completed" field="completed" current={sort} path="/projects" numeric firstDirection="desc" />
              <th scope="col" className="w-40 px-5 py-2.5 text-left font-semibold">
                Share finished
              </th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {rows.map((project) => {
              const total = project.activeInstances + project.completedInstances
              const share = total === 0 ? 0 : Math.round((project.completedInstances / total) * 100)
              return (
                <tr key={project.projectId}>
                  <td className="min-w-40 px-5 py-3.5">
                    <Link
                      href={`/projects/${project.projectId}`}
                      className={`font-bold text-foreground underline-offset-4 hover:text-accent hover:underline [overflow-wrap:anywhere] ${rowLinkClass}`}
                    >
                      {project.name}
                    </Link>
                    <span className="mt-0.5 block font-mono text-xs text-subtle">
                      {project.projectId}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{project.activeInstances}</td>
                  <td
                    className={`px-5 py-3.5 text-right tabular-nums ${
                      project.pendingApprovals > 0 ? 'font-semibold text-status-action' : 'text-muted'
                    }`}
                  >
                    {project.pendingApprovals}
                  </td>
                  <td
                    className={`px-5 py-3.5 text-right tabular-nums ${
                      project.overdueTasks > 0 ? 'font-bold text-status-overdue' : 'text-muted'
                    }`}
                  >
                    {project.overdueTasks}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-muted">
                    {project.completedInstances}
                  </td>
                  <td className="px-5 py-3.5">
                    {total === 0 ? (
                      <span className="text-xs text-subtle">No runs yet</span>
                    ) : (
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="block h-1.5 flex-1 overflow-hidden rounded-full bg-sidebar"
                        >
                          <span
                            className="block h-full rounded-full bg-accent"
                            style={{ width: `${share}%` }}
                          />
                        </span>
                        <span className="w-9 text-right text-xs font-semibold tabular-nums text-muted">
                          {share}%
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Section>
    </>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Projects' }
