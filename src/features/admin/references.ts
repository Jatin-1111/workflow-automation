/**
 * What still points at an organisational record.
 *
 * Deleting a department, team, project or role that something references
 * would turn stored ids into references that resolve to nothing — a user
 * belonging to a department that is gone, a workflow stage routed to a role
 * that no longer exists. These answer "what would break", so the caller can
 * refuse and say why rather than corrupting the data or failing silently.
 *
 * Pure and outside the server-action module so the guard can be tested.
 */

/** Minimal shapes: only the fields that can hold a reference. */
export interface RefUser {
  departmentId?: string
  teamId?: string
  roleIds: string[]
}

export interface RefTeam {
  departmentId?: string
}

export interface RefTemplate {
  departmentId?: string
  projectId?: string
  stages: { assignees: { mode: string; roleId?: string }[] }[]
}

export interface RefInstance {
  projectId?: string
}

function phrase(count: number, singular: string, plural = `${singular}s`): string | null {
  if (count === 0) return null
  return `${count} ${count === 1 ? singular : plural}`
}

function present(...parts: (string | null)[]): string[] {
  return parts.filter((part): part is string => part !== null)
}

export function departmentUses(
  departmentId: string,
  data: { users: RefUser[]; teams: RefTeam[]; templates: RefTemplate[] },
): string[] {
  return present(
    phrase(data.users.filter((u) => u.departmentId === departmentId).length, 'person', 'people'),
    phrase(data.teams.filter((t) => t.departmentId === departmentId).length, 'team'),
    phrase(data.templates.filter((t) => t.departmentId === departmentId).length, 'workflow'),
  )
}

export function teamUses(teamId: string, data: { users: RefUser[] }): string[] {
  return present(
    phrase(data.users.filter((u) => u.teamId === teamId).length, 'person', 'people'),
  )
}

export function projectUses(
  projectId: string,
  data: { instances: RefInstance[]; templates: RefTemplate[] },
): string[] {
  return present(
    phrase(
      data.instances.filter((i) => i.projectId === projectId).length,
      'running workflow',
    ),
    phrase(data.templates.filter((t) => t.projectId === projectId).length, 'workflow'),
  )
}

export function roleUses(
  roleId: string,
  data: { users: RefUser[]; templates: RefTemplate[] },
): string[] {
  // Every version, not only the published one: a draft naming this role would
  // fail to route the moment somebody published it.
  const namedByStages = data.templates.filter((template) =>
    template.stages.some((stage) =>
      stage.assignees.some(
        (source) => source.mode === 'role' && source.roleId === roleId,
      ),
    ),
  ).length

  return present(
    phrase(data.users.filter((u) => u.roleIds.includes(roleId)).length, 'holder'),
    phrase(namedByStages, 'workflow'),
  )
}

/** The sentence shown when a delete is refused. */
export function blockedMessage(name: string, uses: string[]): string {
  return (
    `${name} is still in use by ${uses.join(', ')}. ` +
    'Move those across first, or set it inactive instead.'
  )
}
