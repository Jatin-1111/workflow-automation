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
import { OrgManager } from '@/features/admin/org-editor'
import { UserCreator } from '@/features/admin/user-creator'
import { PasswordReset } from '@/features/admin/password-reset'
import { ProjectManager } from '@/features/admin/project-editor'
import {
  createDepartmentAction,
  createRoleAction,
  createTeamAction,
  deleteDepartmentAction,
  deleteRoleAction,
  deleteTeamAction,
  updateDepartmentAction,
  updateRoleAction,
  updateTeamAction,
} from '@/features/admin/org-actions'
import { humanise } from '@/features/my-work/format'
import { Hint, buttonClass } from '@/features/ui/primitives'
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
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
          <p className="mt-1 text-sm text-muted">
            People, workflow roles, and the organisation structure behind them.
          </p>
        </div>

        <div className="space-y-6">
          <Section title="People" count={users.length}>
            <div className="px-5 pt-4">
              <Hint>
                Workflow roles decide what work reaches somebody. Their access level,
                shown beside their name, decides what they can see and change. The two
                are independent: an employee can hold three roles, and an administrator
                can hold none.
              </Hint>
            </div>
            <div className="mt-4 border-t border-border">
              <UserCreator
                departments={departments.map((d) => ({ value: d.departmentId, label: d.name }))}
                teams={teams.map((t) => ({ value: t.teamId, label: t.name }))}
                roles={roles.map((r) => ({ value: r.roleId, label: r.name }))}
              />
            </div>

            {/* Cards side by side: one person per full-width row left most of
                a wide screen empty and made the section taller than everything
                below it put together. */}
            <ul className="grid gap-px border-t border-border bg-border lg:grid-cols-2">
              {users.map((user) => {
                const roleOptions: RoleOption[] = roles.map((role) => ({
                  roleId: role.roleId,
                  name: role.name,
                  otherHolders: holdersOf(role.roleId)
                    .filter((holder) => holder.userId !== user.userId)
                    .map((holder) => holder.name),
                }))

                return (
                  <li key={user.userId} className="bg-surface px-5 py-4">
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

                      <div className="flex flex-wrap items-center gap-2">
                      <PasswordReset userId={user.userId} userName={user.name} />

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
                          className={buttonClass('secondary', 'sm')}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </form>
                      </div>
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

          {/* Departments and teams are short lists and pair well. Everything
              longer stays full width: pairing a five-row section against a
              twelve-row one left a column's worth of empty space. */}
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Section
            title="Departments"
            count={departments.length}
            description="Delete is refused while anybody or any workflow still points at it. Set it inactive instead to retire it."
          >
            <OrgManager
              label="Department"
              idField="departmentId"
              entities={departments.map((department) => ({
                id: department.departmentId,
                name: department.name,
                detail: department.description,
                description: department.description,
                status: department.status,
              }))}
              createAction={createDepartmentAction}
              updateAction={updateDepartmentAction}
              deleteAction={deleteDepartmentAction}
              describable
            />
          </Section>

          <Section title="Teams" count={teams.length}>
            <OrgManager
              label="Team"
              idField="teamId"
              entities={teams.map((team) => ({
                id: team.teamId,
                name: team.name,
                detail: team.departmentId
                  ? departments.find((d) => d.departmentId === team.departmentId)?.name
                  : undefined,
                status: team.status,
              }))}
              createAction={createTeamAction}
              updateAction={updateTeamAction}
              deleteAction={deleteTeamAction}
              selectField={{
                name: 'departmentId',
                label: 'Department',
                options: departments.map((d) => ({ value: d.departmentId, label: d.name })),
              }}
            />
          </Section>

          </div>

          <Section
            title="Major Projects"
            count={projects.length}
            description="The initiatives workflows run inside. The owner and team show on the project dashboard."
          >
            <ProjectManager
              projects={projects.map((project) => ({
                projectId: project.projectId,
                name: project.name,
                description: project.description,
                status: project.status,
                ownerId: project.ownerId,
                memberIds: project.memberIds,
              }))}
              people={users
                .filter((person) => person.status === 'active')
                .map((person) => ({ value: person.userId, label: person.name }))}
            />
          </Section>



          <Section
            title="Workflow roles"
            count={roles.length}
            description="What a stage is assigned to, and who currently holds it. The key is derived from the name and never changes, because templates refer to it."
          >
            <OrgManager
              label="Role"
              idField="roleId"
              entities={roles.map((role) => {
                const active = activeHoldersOf(role.roleId)
                return {
                  id: role.roleId,
                  name: role.name,
                  detail: `${role.key} · ${active.map((user) => user.name).join(', ')}`,
                  description: role.description,
                  status: role.status,
                  // The one thing this section exists to surface.
                  alert: active.length === 0 ? 'Nobody assigned' : undefined,
                }
              })}
              createAction={createRoleAction}
              updateAction={updateRoleAction}
              deleteAction={deleteRoleAction}
              describable
              columns
              hint="A role with nobody active in it will stall any workflow routing to it."
            />
          </Section>

          <Section
            title="Workflows"
            count={templates.length}
            description="Edit these in the Workflow Builder. A published version is immutable; editing creates the next one."
          >
            <ul className="divide-y divide-border">
              {templates.map((template) => (
                <li
                  key={`${template.workflowId}-${template.version}`}
                  className="flex items-center gap-4 px-5 py-3 text-sm"
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
