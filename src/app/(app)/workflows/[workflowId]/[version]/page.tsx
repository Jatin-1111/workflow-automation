/**
 * Editing one version of a workflow (spec §34, §35).
 *
 * A draft opens in the builder. A published version opens read-only, because
 * work already running is pinned to it (spec §38).
 */

import { Breadcrumbs } from '@/features/ui/primitives'
import { notFound } from 'next/navigation'
import { requireCapability } from '@/lib/auth/dal'
import { WorkflowEditor } from '@/features/workflows/workflow-editor'
import { DiscardDraftButton } from '@/features/workflows/discard-draft-button'
import { DeleteWorkflowButton } from '@/features/workflows/delete-workflow-button'
import { NewVersionButton } from '@/features/workflows/new-version-button'
import { RetireWorkflowButton } from '@/features/workflows/retire-workflow-button'
import { listDepartments } from '@/lib/db/repositories/departments'
import { listProjects } from '@/lib/db/repositories/projects'
import { listRoles } from '@/lib/db/repositories/roles'
import { listUsers } from '@/lib/db/repositories/users'
import { findTemplateVersion, listVersionsOf } from '@/lib/db/repositories/workflow-templates'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { isEntityId } from '@/lib/ids/format'

export default async function WorkflowVersionPage({
  params,
}: PageProps<'/workflows/[workflowId]/[version]'>) {
  await requireCapability('admin.manage_workflows')
  const { workflowId, version } = await params

  if (!isEntityId(workflowId, 'workflowTemplate')) notFound()
  const versionNumber = Number(version)
  if (!Number.isInteger(versionNumber) || versionNumber < 1) notFound()

  const template = await findTemplateVersion(workflowId, versionNumber)
  if (!template) notFound()

  const [roles, users, projects, departments, instances, versions] = await Promise.all([
    listRoles(),
    listUsers(),
    listProjects(),
    listDepartments(),
    listInstances(),
    listVersionsOf(workflowId),
  ])

  // A workflow has at most one draft. Editing a published version continues
  // it rather than starting a second.
  const openDraft = versions.find((candidate) => candidate.status === 'draft')

  // A workflow can only be deleted while nothing has ever run on it.
  const hasHistory = instances.some((instance) => instance.workflowId === workflowId)

  const running = instances.filter(
    (instance) =>
      instance.workflowId === workflowId &&
      instance.templateVersion === versionNumber &&
      instance.status !== 'completed' &&
      instance.status !== 'cancelled',
  ).length

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Workflows', href: '/workflows' },
          { label: `${template.name} · v${template.version}` },
        ]}
      />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.625rem] font-bold leading-8 sm:text-[2rem] sm:leading-9 tracking-[-0.02em]">{template.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Version {template.version} ·{' '}
            {template.status === 'draft'
              ? 'Draft: nothing runs on it yet'
              : template.status === 'active'
                ? 'Live: new work uses this version'
                : 'Retired'}
            {running > 0 ? ` · ${running} running on it` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {template.status === 'draft' && running === 0 ? (
            <DiscardDraftButton
              workflowId={template.workflowId}
              version={template.version}
            />
          ) : null}

          {template.status !== 'draft' ? (
            <NewVersionButton
              workflowId={template.workflowId}
              labeled
              label={
                openDraft
                  ? `Continue editing draft v${openDraft.version}`
                  : 'Edit as new version'
              }
            />
          ) : null}

          {versions.some((candidate) => candidate.status === 'active') ? (
            <RetireWorkflowButton workflowId={template.workflowId} name={template.name} />
          ) : null}

          {hasHistory ? null : (
            <DeleteWorkflowButton
              workflowId={template.workflowId}
              name={template.name}
              versionCount={versions.length}
            />
          )}
        </div>
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
    </>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Workflow' }
