/**
 * WORKFLOWS — every process Business Orbit runs, and its versions (spec §35).
 *
 * This is the list the Workflow Builder hangs off: create a process, see which
 * version is live, and start the next version when one needs changing.
 */

import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { EmptyRow, Section } from '@/features/management/section'
import { CreateWorkflowForm } from '@/features/workflows/create-workflow-form'
import { NewVersionButton } from '@/features/workflows/new-version-button'
import { listProjects } from '@/lib/db/repositories/projects'
import { listAllTemplates } from '@/lib/db/repositories/workflow-templates'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import type { WorkflowTemplate } from '@/lib/types/workflow'

export default async function WorkflowsPage() {
  const user = await requireCapability('admin.manage_workflows')

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

  const runningOn = (workflowId: string, version: number) =>
    instances.filter(
      (instance) =>
        instance.workflowId === workflowId &&
        instance.templateVersion === version &&
        instance.status !== 'completed' &&
        instance.status !== 'cancelled',
    ).length

  return (
    <AppShell user={user} current="/workflows">
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-muted">
            Build a process once and the platform runs it. Editing a published
            workflow creates a new version; work already running keeps the version
            it started on.
          </p>
        </div>

        <div className="space-y-6">
          <Section title="Create a workflow" description="It starts as a draft, so nothing runs on it until you publish.">
            <CreateWorkflowForm
              projects={projects.map((project) => ({
                projectId: project.projectId,
                name: project.name,
              }))}
            />
          </Section>

          <Section title="Workflows" count={byWorkflow.size}>
            {byWorkflow.size === 0 ? (
              <EmptyRow>No workflows yet.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {[...byWorkflow.values()].map((versions) => {
                  const latest = versions[0]
                  return (
                    <li key={latest.workflowId} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{latest.name}</p>
                          <p className="text-xs text-muted">
                            <span className="font-mono">{latest.workflowId}</span>
                            {latest.projectId
                              ? ` · ${projectName.get(latest.projectId) ?? ''}`
                              : ' · not tied to a project'}
                          </p>
                        </div>
                        <NewVersionButton workflowId={latest.workflowId} />
                      </div>

                      <ul className="mt-3 space-y-1">
                        {versions.map((version) => {
                          const running = runningOn(version.workflowId, version.version)
                          return (
                            <li
                              key={version.version}
                              className="flex flex-wrap items-center gap-3 rounded border border-border px-3 py-2 text-sm"
                            >
                              <Link
                                href={`/workflows/${version.workflowId}/${version.version}`}
                                className="font-medium text-accent underline-offset-4 hover:underline"
                              >
                                Version {version.version}
                              </Link>
                              <StatusPill status={version.status} />
                              <span className="text-xs text-muted">
                                {version.stages.length} stages
                              </span>
                              {running > 0 ? (
                                <span className="text-xs text-muted">
                                  {running} running on it
                                </span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>
        </div>
      </main>
    </AppShell>
  )
}

function StatusPill({ status }: { status: WorkflowTemplate['status'] }) {
  const tone =
    status === 'active'
      ? 'text-status-complete'
      : status === 'draft'
        ? 'text-status-action'
        : 'text-subtle'

  return (
    <span className={`rounded border border-border px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
      {status === 'active' ? 'Live' : status === 'draft' ? 'Draft' : 'Retired'}
    </span>
  )
}

export const dynamic = 'force-dynamic'
