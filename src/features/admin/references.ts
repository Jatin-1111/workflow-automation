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

/* -------------------------------------------------------------------------
 * People
 *
 * A person is different from everything above, because two kinds of thing
 * point at them and they need opposite answers.
 *
 * History: what they did, and the work they were given. Every action
 * appends a timeline event carrying their id, and the timeline is
 * append-only — nothing may rewrite it. So someone with history cannot be
 * deleted without leaving that history pointing at nobody, and the right
 * answer is not "move those across", it is "deactivate instead".
 *
 * Structure: owning a project, heading a department, leading a team. These
 * are assignments, not history. They can be changed, and once they have
 * been the person can go.
 *
 * Somebody with neither — added with the wrong address, or never used — is
 * exactly the case delete is for.
 * ---------------------------------------------------------------------- */

export interface UserFootprint {
  /** Timeline events they performed: comments, uploads, completions, approvals. */
  actions: number
  /** Runs in which they hold or held a stage, whether or not they acted. */
  assignedRuns: number
  /** Workflow versions they authored. */
  workflowsAuthored: number
  projectsOwned: number
  projectMemberships: number
  departmentsHeaded: number
  teamsLed: number
}

export interface UserUses {
  /** Things that can never be removed, so the person cannot be either. */
  history: string[]
  /** Assignments that can be changed, after which delete will work. */
  structure: string[]
}

export function userUses(footprint: UserFootprint): UserUses {
  return {
    history: present(
      phrase(footprint.actions, 'recorded action'),
      phrase(footprint.assignedRuns, 'workflow run'),
      phrase(footprint.workflowsAuthored, 'workflow version'),
    ),
    structure: present(
      phrase(footprint.projectsOwned, 'project they own', 'projects they own'),
      phrase(footprint.projectMemberships, 'project team', 'project teams'),
      phrase(footprint.departmentsHeaded, 'department they head', 'departments they head'),
      phrase(footprint.teamsLed, 'team they lead', 'teams they lead'),
    ),
  }
}

/** Why a person cannot be deleted, phrased for whichever reason applies. */
export function personBlockedMessage(name: string, uses: UserUses): string | null {
  if (uses.history.length > 0) {
    // History wins: changing their projects first would not help.
    return (
      `${name} has history here — ${uses.history.join(', ')}. ` +
      'Deleting them would leave that history pointing at nobody. ' +
      'Deactivate them instead: they can no longer sign in or be given work, ' +
      'and their name stays on what they did.'
    )
  }
  if (uses.structure.length > 0) {
    return (
      `${name} is still named on ${uses.structure.join(', ')}. ` +
      'Change those first, then delete.'
    )
  }
  return null
}
