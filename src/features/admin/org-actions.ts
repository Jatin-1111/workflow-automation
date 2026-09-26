'use server'

/**
 * Editing the organisation itself (spec §45).
 *
 * Departments, teams, projects, roles and people were fixed at seed time,
 * which meant hiring somebody or starting a project needed a developer. These
 * are the paths that let an administrator do it.
 *
 * Nothing here deletes. Every entity has a status, and the way to retire one
 * is to deactivate it: users, tasks and timeline events still point at it, and
 * a delete would turn that history into dangling ids.
 */

import { revalidatePath } from 'next/cache'
import { requireCapability } from '@/lib/auth/dal'
import { hashPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { nextId } from '@/lib/ids/generate'
import { isEntityId } from '@/lib/ids/format'
import {
  deleteDepartment,
  insertDepartment,
  listDepartments,
  updateDepartment,
} from '@/lib/db/repositories/departments'
import {
  deleteTeam,
  insertTeam,
  listTeams,
  updateTeam,
} from '@/lib/db/repositories/teams'
import {
  deleteProject,
  insertProject,
  listProjects,
  updateProject,
} from '@/lib/db/repositories/projects'
import {
  deleteRole,
  findRoleByKey,
  insertRole,
  listRoles,
  updateRole,
} from '@/lib/db/repositories/roles'
import {
  findUserByEmail,
  findUserById,
  insertUser,
  listUsers,
  updateUserPassword,
  updateUserProfile,
} from '@/lib/db/repositories/users'
import { listAllTemplates } from '@/lib/db/repositories/workflow-templates'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { ACCESS_LEVELS } from '@/lib/types/status'
import type { AccessLevel, EntityStatus } from '@/lib/types/status'
import type { DepartmentId, ProjectId, RoleId, TeamId, UserId } from '@/lib/types/ids'
import {
  blockedMessage,
  departmentUses,
  projectUses,
  roleUses,
  teamUses,
} from './references'
import { safePhotoUrl } from './validation'
import type { AdminActionState } from './actions'

const MAX_NAME = 80
const MIN_PASSWORD = 8

function refuse(message: string): AdminActionState {
  return { ok: false, message }
}

/** A required free-text name, trimmed and bounded. */
function readName(formData: FormData, field = 'name'): string | null {
  const value = String(formData.get(field) ?? '').trim()
  if (value.length === 0 || value.length > MAX_NAME) return null
  return value
}

function readOptional(formData: FormData, field: string): string | undefined {
  const value = String(formData.get(field) ?? '').trim()
  return value.length > 0 ? value : undefined
}

/**
 * An id from a select, accepted only if it is one the caller may actually
 * point at. A form can submit anything; an unchecked id would let an
 * administrator attach a team to a department that does not exist.
 */
function readId<K extends 'department' | 'team' | 'user' | 'project' | 'role'>(
  formData: FormData,
  field: string,
  kind: K,
  known: Set<string>,
): string | undefined {
  const value = String(formData.get(field) ?? '').trim()
  if (!value) return undefined
  if (!isEntityId(value, kind) || !known.has(value)) return undefined
  return value
}

function readStatus(formData: FormData): EntityStatus | null {
  const value = String(formData.get('status') ?? '')
  return value === 'active' || value === 'inactive' ? value : null
}

/** Only the fields a form actually carried, so a narrow form cannot blank one. */
function describedChanges(formData: FormData) {
  return formData.has('description')
    ? { description: readOptional(formData, 'description') }
    : {}
}

function refreshed() {
  revalidatePath('/admin')
  revalidatePath('/projects')
  revalidatePath('/team')
}

/* -------------------------------------------------------------------------
 * Departments
 * ---------------------------------------------------------------------- */

export async function createDepartmentAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_users')

  const name = readName(formData)
  if (!name) return refuse('A department needs a name of 80 characters or fewer.')

  const existing = await listDepartments()
  if (existing.some((department) => department.name.toLowerCase() === name.toLowerCase())) {
    return refuse(`There is already a department called ${name}.`)
  }

  const now = new Date()
  await insertDepartment({
    departmentId: await nextId('department'),
    name,
    description: readOptional(formData, 'description'),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  refreshed()
  return { ok: true, message: `${name} added.` }
}

export async function updateDepartmentAction(formData: FormData): Promise<void> {
  await requireCapability('admin.manage_users')

  const departmentId = String(formData.get('departmentId') ?? '')
  if (!isEntityId(departmentId, 'department')) return

  const status = readStatus(formData)
  const name = readName(formData)

  await updateDepartment(departmentId as DepartmentId, {
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
    ...describedChanges(formData),
  })
  refreshed()
}

/* -------------------------------------------------------------------------
 * Teams
 * ---------------------------------------------------------------------- */

export async function createTeamAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_users')

  const name = readName(formData)
  if (!name) return refuse('A team needs a name of 80 characters or fewer.')

  const departments = new Set((await listDepartments()).map((d) => d.departmentId as string))
  const departmentId = readId(formData, 'departmentId', 'department', departments)

  const now = new Date()
  await insertTeam({
    teamId: await nextId('team'),
    name,
    departmentId: departmentId as DepartmentId | undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  refreshed()
  return { ok: true, message: `${name} added.` }
}

export async function updateTeamAction(formData: FormData): Promise<void> {
  await requireCapability('admin.manage_users')

  const teamId = String(formData.get('teamId') ?? '')
  if (!isEntityId(teamId, 'team')) return

  const status = readStatus(formData)
  const name = readName(formData)

  await updateTeam(teamId as TeamId, {
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
  })
  refreshed()
}

/* -------------------------------------------------------------------------
 * Major Projects
 * ---------------------------------------------------------------------- */

export async function createProjectAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_users')

  const name = readName(formData)
  if (!name) return refuse('A project needs a name of 80 characters or fewer.')

  const existing = await listProjects()
  if (existing.some((project) => project.name.toLowerCase() === name.toLowerCase())) {
    return refuse(`There is already a project called ${name}.`)
  }

  const people = new Set((await listUsers()).map((user) => user.userId as string))
  const now = new Date()

  await insertProject({
    projectId: await nextId('project'),
    name,
    description: readOptional(formData, 'description'),
    ownerId: readId(formData, 'ownerId', 'user', people) as UserId | undefined,
    memberIds: readMembers(formData, people),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  refreshed()
  return { ok: true, message: `${name} added. Workflows can now be run inside it.` }
}

export async function updateProjectAction(formData: FormData): Promise<void> {
  await requireCapability('admin.manage_users')

  const projectId = String(formData.get('projectId') ?? '')
  if (!isEntityId(projectId, 'project')) return

  const status = readStatus(formData)
  const name = readName(formData)

  // A status toggle submits neither, and must not be read as "clear the team".
  const changingPeople = formData.has('ownerId') || formData.has('memberIds')
  const people = changingPeople
    ? new Set((await listUsers()).map((user) => user.userId as string))
    : new Set<string>()

  await updateProject(projectId as ProjectId, {
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
    ...describedChanges(formData),
    ...(changingPeople
      ? {
          ownerId: readId(formData, 'ownerId', 'user', people) as UserId | undefined,
          memberIds: readMembers(formData, people),
        }
      : {}),
  })
  refreshed()
}

/** Only people who exist, so a stale form cannot add a phantom member. */
function readMembers(formData: FormData, known: Set<string>): UserId[] {
  return formData
    .getAll('memberIds')
    .filter((value): value is string => typeof value === 'string')
    .filter((value) => known.has(value)) as UserId[]
}

/* -------------------------------------------------------------------------
 * Workflow roles
 * ---------------------------------------------------------------------- */

/** `Proposal Designer` becomes `proposal_designer`, which is what a template
 * stage refers to. Derived rather than typed, because a mistyped key silently
 * fails to match a stage. */
function keyFrom(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function createRoleAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_roles')

  const name = readName(formData)
  if (!name) return refuse('A role needs a name of 80 characters or fewer.')

  const key = keyFrom(name)
  if (!key) return refuse('That name has no letters or digits to build a key from.')
  if (await findRoleByKey(key)) {
    return refuse(`There is already a role with the key ${key}.`)
  }

  const now = new Date()
  await insertRole({
    roleId: await nextId('role'),
    key,
    name,
    description: readOptional(formData, 'description'),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  refreshed()
  return { ok: true, message: `${name} added. Stages can now be assigned to it.` }
}

export async function updateRoleAction(formData: FormData): Promise<void> {
  await requireCapability('admin.manage_roles')

  const roleId = String(formData.get('roleId') ?? '')
  if (!isEntityId(roleId, 'role')) return

  const status = readStatus(formData)
  const name = readName(formData)

  // The key is deliberately not editable: templates refer to it, and changing
  // it would quietly stop routing work that is already configured.
  await updateRole(roleId as RoleId, {
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
    ...describedChanges(formData),
  })
  refreshed()
}

/* -------------------------------------------------------------------------
 * People
 * ---------------------------------------------------------------------- */

export async function createUserAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_users')

  const name = readName(formData)
  if (!name) return refuse('A person needs a name of 80 characters or fewer.')

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return refuse('That does not look like an email address.')
  }
  if (await findUserByEmail(email)) {
    return refuse('Somebody already signs in with that address.')
  }

  const password = String(formData.get('password') ?? '')
  if (password.length < MIN_PASSWORD) {
    return refuse(`A starting password needs at least ${MIN_PASSWORD} characters.`)
  }

  const accessLevel = String(formData.get('accessLevel') ?? '')
  if (!ACCESS_LEVELS.includes(accessLevel as AccessLevel)) {
    return refuse('Choose an access level.')
  }

  const departments = new Set((await listDepartments()).map((d) => d.departmentId as string))
  const teams = new Set((await listTeams()).map((t) => t.teamId as string))
  const knownRoles = new Set((await listRoles()).map((role) => role.roleId as string))
  const roleIds = formData
    .getAll('roleIds')
    .filter((value): value is string => typeof value === 'string')
    .filter((value) => knownRoles.has(value)) as RoleId[]

  // Optional on purpose: somebody can be added and start receiving work
  // before anyone has chased them for a photograph.
  const joining = String(formData.get('joiningDate') ?? '').trim()
  const joiningDate = joining ? new Date(joining) : undefined

  const now = new Date()
  await insertUser({
    userId: await nextId('user'),
    name,
    email,
    phone: readOptional(formData, 'phone'),
    photoUrl: safePhotoUrl(readOptional(formData, 'photoUrl')),
    joiningDate:
      joiningDate && !Number.isNaN(joiningDate.getTime()) ? joiningDate : undefined,
    departmentId: readId(formData, 'departmentId', 'department', departments) as
      | DepartmentId
      | undefined,
    teamId: readId(formData, 'teamId', 'team', teams) as TeamId | undefined,
    roleIds,
    accessLevel: accessLevel as AccessLevel,
    status: 'active',
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  })

  refreshed()
  return {
    ok: true,
    message: `${name} added. They can sign in with ${email} and the password you set.`,
  }
}

export async function updateUserProfileAction(formData: FormData): Promise<void> {
  const admin = await requireCapability('admin.manage_users')

  const userId = String(formData.get('userId') ?? '')
  if (!isEntityId(userId, 'user')) return

  const departments = new Set((await listDepartments()).map((d) => d.departmentId as string))
  const teams = new Set((await listTeams()).map((t) => t.teamId as string))

  const accessLevel = String(formData.get('accessLevel') ?? '')
  const validLevel = ACCESS_LEVELS.includes(accessLevel as AccessLevel)
  // An administrator demoting themselves would leave nobody able to undo it.
  const mayChangeLevel = validLevel && userId !== admin.userId

  await updateUserProfile(userId as UserId, {
    ...(mayChangeLevel ? { accessLevel: accessLevel as AccessLevel } : {}),
    departmentId: readId(formData, 'departmentId', 'department', departments) as
      | DepartmentId
      | undefined,
    teamId: readId(formData, 'teamId', 'team', teams) as TeamId | undefined,
  })
  refreshed()
}

/**
 * Set somebody else's password (spec §45).
 *
 * There is no email channel, so there is no reset link: a forgotten password
 * is recovered by an administrator setting a new one and passing it on out of
 * band. Without this, a forgotten password means editing the database.
 *
 * Deliberately does not ask for the person's current password — nobody has
 * it, which is the situation this exists for — so it is gated on the
 * administrator capability and on nothing else.
 */
export async function resetUserPasswordAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireCapability('admin.manage_users')

  const userId = String(formData.get('userId') ?? '')
  if (!isEntityId(userId, 'user')) {
    return refuse('That person could not be identified.')
  }

  const password = String(formData.get('password') ?? '')
  if (password.length < MIN_PASSWORD) {
    return refuse(`A password needs at least ${MIN_PASSWORD} characters.`)
  }

  const target = await findUserById(userId as UserId)
  if (!target) return refuse('That person could not be found.')

  await updateUserPassword(userId as UserId, await hashPassword(password))

  // Resetting your own password here would retire the session you are using,
  // so re-issue it rather than signing yourself out mid-action.
  if (userId === admin.userId) await createSession(admin.userId)

  refreshed()
  return {
    ok: true,
    message: `${target.name} can now sign in with the password you set. Anywhere they were signed in has been signed out.`,
  }
}

/* -------------------------------------------------------------------------
 * Deleting
 *
 * A real delete, not a hidden deactivation — but only when nothing still
 * points at the record. Users carry a department and a team, templates name
 * roles and projects, instances belong to a project: removing one of those
 * out from under them would turn recorded history into ids that resolve to
 * nothing. So each of these counts the references first and refuses with the
 * count, which is a more useful answer than a silent failure.
 *
 * To retire something that is in use, set it inactive from its edit panel.
 * ---------------------------------------------------------------------- */

function blocked(what: string, uses: string[]): AdminActionState {
  return refuse(blockedMessage(what, uses))
}

export async function deleteDepartmentAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_users')

  const departmentId = String(formData.get('departmentId') ?? '')
  if (!isEntityId(departmentId, 'department')) {
    return refuse('That department could not be identified.')
  }

  const [users, teams, templates, departments] = await Promise.all([
    listUsers(), listTeams(), listAllTemplates(), listDepartments(),
  ])
  const name = departments.find((d) => d.departmentId === departmentId)?.name ?? 'It'

  const uses = departmentUses(departmentId, { users, teams, templates })

  if (uses.length > 0) return blocked(name, uses)

  await deleteDepartment(departmentId as DepartmentId)
  refreshed()
  return { ok: true, message: `${name} deleted.` }
}

export async function deleteTeamAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_users')

  const teamId = String(formData.get('teamId') ?? '')
  if (!isEntityId(teamId, 'team')) return refuse('That team could not be identified.')

  const [users, teams] = await Promise.all([listUsers(), listTeams()])
  const name = teams.find((t) => t.teamId === teamId)?.name ?? 'It'

  const uses = teamUses(teamId, { users })

  if (uses.length > 0) return blocked(name, uses)

  await deleteTeam(teamId as TeamId)
  refreshed()
  return { ok: true, message: `${name} deleted.` }
}

export async function deleteProjectAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_users')

  const projectId = String(formData.get('projectId') ?? '')
  if (!isEntityId(projectId, 'project')) {
    return refuse('That project could not be identified.')
  }

  const [instances, templates, projects] = await Promise.all([
    listInstances(), listAllTemplates(), listProjects(),
  ])
  const name = projects.find((p) => p.projectId === projectId)?.name ?? 'It'

  const uses = projectUses(projectId, { instances, templates })

  if (uses.length > 0) return blocked(name, uses)

  await deleteProject(projectId as ProjectId)
  refreshed()
  return { ok: true, message: `${name} deleted.` }
}

export async function deleteRoleAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireCapability('admin.manage_roles')

  const roleId = String(formData.get('roleId') ?? '')
  if (!isEntityId(roleId, 'role')) return refuse('That role could not be identified.')

  const [users, templates, roles] = await Promise.all([
    listUsers(), listAllTemplates(), listRoles(),
  ])
  const name = roles.find((r) => r.roleId === roleId)?.name ?? 'It'

  const uses = roleUses(roleId, { users, templates })

  if (uses.length > 0) return blocked(name, uses)

  await deleteRole(roleId as RoleId)
  refreshed()
  return { ok: true, message: `${name} deleted.` }
}
