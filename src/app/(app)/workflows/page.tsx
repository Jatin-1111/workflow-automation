/**
 * WORKFLOWS — every process Business Orbit runs, and its versions (spec §35).
 *
 * This is the list the Workflow Builder hangs off: create a process, see which
 * version is live, and start the next version when one needs changing.
 *
 * One row per workflow, in columns that line up down the list: what it is,
 * which project it belongs to, its versions, how big it is, how much is
 * running on it, and the one thing you can do to it. Versions are chips in
 * their own column rather than a nested list under each name, which is what
 * left the old layout ragged and half empty.
 */

import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { EmptyRow, Section } from '@/features/management/section'
import { Pill, tdClass, tdNumClass, theadClass, thClass, thNumClass } from '@/features/ui/primitives'
import { CreateWorkflowForm } from '@/features/workflows/create-workflow-form'
import { NewVersionButton } from '@/features/workflows/new-version-button'
import { listProjects } from '@/lib/db/repositories/projects'
import { listAllTemplates } from '@/lib/db/repositories/workflow-templates'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import type { WorkflowTemplate } from '@/lib/types/workflow'

export default async function WorkflowsPage() {
  await requireCapability('admin.manage_workflows')

  const [templates, projects, instances] = await Promise.all([
    listAllTemplates(),
    listProjects(),
    listInstances(),
  ])

  const projectName = new Map(projects.map((project) => [project.projectId, project.name]))

  // Group every version under the workflow it belongs to.
  const byWorkflow = new Map<string, WorkflowTemplate[]>()
  for (const template of templates) {
    byWorkflow.set(template.workflowId, [
      ...(byWorkflow.get(template.workflowId) ?? []),
      template,
    ])
  }

  /** Runs still going on any version of this workflow. */
  const runningOn = (workflowId: string) =>
    instances.filter(
      (instance) =>
        instance.workflowId === workflowId &&
        instance.status !== 'completed' &&
        instance.status !== 'cancelled',
    ).length

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[1.625rem] font-bold leading-8 sm:text-[2rem] sm:leading-9 tracking-[-0.02em]">Workflows</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted">
          Build a process once and the platform runs it. Editing a published
          workflow creates a new version; work already running keeps the version
          it started on.
        </p>
      </div>

      <div className="space-y-6">
        <Section
          title="Create a workflow"
          description="It starts as a draft, so nothing runs on it until you publish."
        >
          <CreateWorkflowForm
            projects={projects.map((project) => ({
              projectId: project.projectId,
              name: project.name,
            }))}
          />
        </Section>

        <Section title="Workflows" count={byWorkflow.size}>
          {byWorkflow.size === 0 ? (
            <EmptyRow>No workflows yet. Create one above and it will appear here as a draft.</EmptyRow>
          ) : (
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className={theadClass}>
                  <th scope="col" className={thClass}>Workflow</th>
                  <th scope="col" className={thClass}>Project</th>
                  <th scope="col" className={thClass}>Versions</th>
                  <th scope="col" className={thNumClass}>Stages</th>
                  <th scope="col" className={thNumClass}>Running</th>
                  <th scope="col" className={`${thClass} w-44`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border [&>tr]:transition-ui [&>tr:hover]:bg-surface-sunken">
                {[...byWorkflow.values()].map((versions) => {
                  const latest = versions[0]
                  const running = runningOn(latest.workflowId)
                  return (
                    <tr key={latest.workflowId}>
                      <td className={`${tdClass} min-w-48`}>
                        <span className="block font-bold [overflow-wrap:anywhere]">{latest.name}</span>
                        <span className="mt-0.5 block font-mono text-xs text-subtle">
                          {latest.workflowId}
                        </span>
                      </td>
                      <td className={`${tdClass} min-w-32 text-muted`}>
                        {latest.projectId
                          ? (projectName.get(latest.projectId) ?? 'Unknown project')
                          : 'Not tied to a project'}
                      </td>
                      <td className={tdClass}>
                        <span className="flex flex-wrap items-center gap-1.5">
                          {versions.map((version) => (
                            <Link
                              key={version.version}
                              href={`/workflows/${version.workflowId}/${version.version}`}
                              className="transition-ui group inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface py-0.5 pl-2.5 pr-1 text-xs font-bold hover:border-foreground active:scale-[0.97]"
                            >
                              v{version.version}
                              <StatusPill status={version.status} />
                            </Link>
                          ))}
                        </span>
                      </td>
                      <td className={tdNumClass}>{latest.stages.length}</td>
                      <td
                        className={`${tdNumClass} ${
                          running > 0 ? 'font-semibold' : 'text-muted'
                        }`}
                      >
                        {running}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <NewVersionButton workflowId={latest.workflowId} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </>
  )
}

function StatusPill({ status }: { status: WorkflowTemplate['status'] }) {
  const tone = status === 'active' ? 'complete' : status === 'draft' ? 'action' : 'neutral'

  return (
    <Pill tone={tone}>
      {status === 'active' ? 'Live' : status === 'draft' ? 'Draft' : 'Retired'}
    </Pill>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Workflows' }
