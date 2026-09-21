/**
 * ADMIN — people, roles and the mapping between them (spec §45).
 *
 * Role assignment is the important part: it is what makes a workflow survive
 * somebody leaving, which is the promise §6 makes.
 */

import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { Section } from '@/features/management/section'
import { RoleEditor, type RoleOption } from '@/features/admin/role-editor'
import { toggleUserStatusAction } from '@/features/admin/actions'
import { humanise } from '@/features/my-work/format'
import { listDepartments } from '@/lib/db/repositories/departments'
import { listProjects } from '@/lib/db/repositories/projects'
import { listRoles } from '@/lib/db/repositories/roles'
import { listTeams } from '@/lib/db/repositories/teams'
import { listUsers } from '@/lib/db/repositories/users'
import { listActiveTemplates } from '@/lib/db/repositories/workflow-templates'

export default async function AdminPage() {
  const admin = await requireCapability('admin.manage_users')

  const [users, roles, departments, teams, projects, templates] = await Promise.all([
    listUsers(),
    listRoles(),
    listDepartments(),
    listTeams(),
    listProjects(),
    listActiveTemplates(),
  ])

  const holdersOf = (roleId: string) =>
    users.filter((user) => user.roleIds.includes(roleId as never))

  /**
   * Only active people count as cover.
   *
   * The engine resolves a role to its *active* holders, so counting a
   * deactivated account here would report a role as covered while any workflow
   * routing to it refuses to activate.
   */
  const activeHoldersOf = (roleId: string) =>
    holdersOf(roleId).filter((user) => user.status === 'active')

  return (
    <AppShell user={admin} current="/admin">
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Administration</h1>
          <p className="mt-1 text-sm text-muted">
            People, workflow roles, and the organisation structure behind them.
          </p>
        </div>

        <div className="space-y-6">
          <Section
            title="Role coverage"
            count={roles.length}
            description="A role with nobody holding it will stop any workflow that routes to it."
          >
            <ul className="divide-y divide-border">
              {roles.map((role) => {
                const active = activeHoldersOf(role.roleId)
                const inactive = holdersOf(role.roleId).filter(
                  (user) => user.status !== 'active',
                )

                return (
                  <li
                    key={role.roleId}
                    className="flex items-center gap-4 px-4 py-2.5 text-sm"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{role.name}</span>
                      <span className="font-mono text-xs text-subtle">{role.key}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs">
                      <span
                        className={
                          active.length === 0
                            ? 'font-medium text-status-overdue'
                            : 'text-muted'
                        }
                      >
                        {active.length === 0
                          ? 'Nobody assigned'
                          : active.map((user) => user.name).join(', ')}
                      </span>
                      {inactive.length > 0 ? (
                        <span className="block text-subtle">
                          {inactive.map((user) => user.name).join(', ')} (deactivated)
                        </span>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Section>

          <Section title="People" count={users.length}>
            <ul className="divide-y divide-border">
              {users.map((user) => {
                const roleOptions: RoleOption[] = roles.map((role) => ({
                  roleId: role.roleId,
                  name: role.name,
                  otherHolders: holdersOf(role.roleId)
                    .filter((holder) => holder.userId !== user.userId)
                    .map((holder) => holder.name),
                }))

                return (
                  <li key={user.userId} className="px-4 py-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {user.name}
                          <span className="ml-2 font-mono text-xs text-subtle">
                            {user.userId}
                          </span>
                        </p>
                        <p className="text-xs text-muted">
                          {user.email} · {humanise(user.accessLevel)}
                          {user.departmentId
                            ? ` · ${
                                departments.find(
                                  (department) =>
                                    department.departmentId === user.departmentId,
                                )?.name ?? ''
                              }`
                            : ''}
                        </p>
                      </div>

                      <form action={toggleUserStatusAction}>
                        <input type="hidden" name="userId" value={user.userId} />
                        <input
                          type="hidden"
                          name="status"
                          value={user.status === 'active' ? 'inactive' : 'active'}
                        />
                        <button
                          type="submit"
                          disabled={user.userId === admin.userId}
                          title={
                            user.userId === admin.userId
                              ? 'You cannot deactivate your own account'
                              : undefined
                          }
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium transition hover:bg-accent-soft disabled:opacity-50"
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </form>
                    </div>

                    <RoleEditor
                      userId={user.userId}
                      userName={user.name}
                      roles={roleOptions}
                      assigned={user.roleIds}
                    />
                  </li>
                )
              })}
            </ul>
          </Section>

          <Section title="Structure">
            <dl className="grid gap-4 px-4 py-4 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                  Departments
                </dt>
                <dd className="mt-1 text-sm text-muted">
                  {departments.map((department) => department.name).join(', ')}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                  Teams
                </dt>
                <dd className="mt-1 text-sm text-muted">
                  {teams.map((team) => team.name).join(', ')}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                  Major Projects
                </dt>
                <dd className="mt-1 text-sm text-muted">
                  {projects.map((project) => project.name).join(', ')}
                </dd>
              </div>
            </dl>
          </Section>

          <Section
            title="Workflows"
            count={templates.length}
            description="Editing these needs the Workflow Builder, which is not in this release."
          >
            <ul className="divide-y divide-border">
              {templates.map((template) => (
                <li
                  key={`${template.workflowId}-${template.version}`}
                  className="flex items-center gap-4 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{template.name}</span>
                    <span className="font-mono text-xs text-subtle">
                      {template.workflowId} · v{template.version}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {template.stages.length} stages
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
