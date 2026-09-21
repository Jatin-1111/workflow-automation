/**
 * Editing one version of a workflow (spec §34, §35).
 *
 * A draft opens in the builder. A published version opens read-only, because
 * work already running is pinned to it (spec §38).
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { WorkflowEditor } from '@/features/workflows/workflow-editor'
import { DiscardDraftButton } from '@/features/workflows/discard-draft-button'
import { listDepartments } from '@/lib/db/repositories/departments'
import { listProjects } from '@/lib/db/repositories/projects'
import { listRoles } from '@/lib/db/repositories/roles'
import { listUsers } from '@/lib/db/repositories/users'
import { findTemplateVersion } from '@/lib/db/repositories/workflow-templates'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { isEntityId } from '@/lib/ids/format'

export default async function WorkflowVersionPage({
  params,
}: PageProps<'/workflows/[workflowId]/[version]'>) {
  const user = await requireCapability('admin.manage_workflows')
  const { workflowId, version } = await params

  if (!isEntityId(workflowId, 'workflowTemplate')) notFound()
  const versionNumber = Number(version)
  if (!Number.isInteger(versionNumber) || versionNumber < 1) notFound()

  const template = await findTemplateVersion(workflowId, versionNumber)
  if (!template) notFound()

  const [roles, users, projects, departments, instances] = await Promise.all([
    listRoles(),
    listUsers(),
    listProjects(),
    listDepartments(),
    listInstances(),
  ])

  const running = instances.filter(
    (instance) =>
      instance.workflowId === workflowId &&
      instance.templateVersion === versionNumber &&
      instance.status !== 'completed' &&
      instance.status !== 'cancelled',
  ).length

  return (
    <AppShell user={user} current="/workflows">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <nav className="mb-4 text-xs text-subtle">
          <Link href="/workflows" className="transition hover:text-foreground">
            Workflows
          </Link>
          <span aria-hidden> / </span>
          <span>
            {template.name} · v{template.version}
          </span>
        </nav>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
            <p className="mt-1 text-sm text-muted">
              Version {template.version} ·{' '}
              {template.status === 'draft'
                ? 'Draft — nothing runs on it yet'
                : template.status === 'active'
                  ? 'Live — new work uses this version'
                  : 'Retired'}
              {running > 0 ? ` · ${running} running on it` : ''}
            </p>
          </div>

          {template.status === 'draft' && running === 0 ? (
            <DiscardDraftButton
              workflowId={template.workflowId}
              version={template.version}
            />
          ) : null}
        </header>

        <WorkflowEditor
          template={{
            workflowId: template.workflowId,
            version: template.version,
            name: template.name,
            description: template.description,
            projectId: template.projectId,
            departmentId: template.departmentId,
            stages: template.stages,
            initialStageKey: template.initialStageKey,
            status: template.status,
          }}
          editable={template.status === 'draft'}
          roles={roles.map((role) => ({
            roleId: role.roleId,
            name: role.name,
            holders: users
              .filter(
                (candidate) =>
                  candidate.status === 'active' && candidate.roleIds.includes(role.roleId),
              )
              .map((candidate) => candidate.name),
          }))}
          projects={projects.map((project) => ({
            projectId: project.projectId,
            name: project.name,
          }))}
          departments={departments.map((department) => ({
            departmentId: department.departmentId,
            name: department.name,
          }))}
        />
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
