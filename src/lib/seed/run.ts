/**
 * Seeds Business Orbit's baseline organisation.
 *
 * Seed definitions reference each other by machine key; this routine allocates
 * permanent ids and resolves those keys into id references, so nothing
 * downstream depends on a name.
 */

import { hash } from 'bcryptjs'
import { getDb } from '@/lib/db/client'
import { COLLECTIONS } from '@/lib/db/collections'
import { ensureIndexes } from '@/lib/db/indexes'
import { nextIds } from '@/lib/ids/generate'
import { insertDepartments } from '@/lib/db/repositories/departments'
import { insertProjects } from '@/lib/db/repositories/projects'
import { insertRoles } from '@/lib/db/repositories/roles'
import { insertTeams } from '@/lib/db/repositories/teams'
import { countUsers, insertUsers } from '@/lib/db/repositories/users'
import { insertWorkflowTemplates } from '@/lib/db/repositories/workflow-templates'
import type { EntityId, EntityKind } from '@/lib/types/ids'
import type { Department, Role, Team } from '@/lib/types/organization'
import type { Project } from '@/lib/types/project'
import type { User } from '@/lib/types/user'
import type { WorkflowTemplate } from '@/lib/types/workflow'
import { buildWorkflowTemplate } from './workflows/build'
import { WORKFLOW_SEEDS } from './workflows'
import { DEPARTMENT_SEEDS, ROLE_SEEDS, TEAM_SEEDS } from './organization'
import { PROJECT_SEEDS } from './projects'
import { USER_SEEDS } from './users'

const BCRYPT_ROUNDS = 10

export interface SeedOptions {
  /** Drop every seeded collection, including id counters, before writing. */
  reset?: boolean
  /** Password applied to every demo user. */
  password: string
}

export interface SeedSummary {
  departments: number
  teams: number
  roles: number
  users: number
  projects: number
  workflows: number
}

/** Remove seeded data so ids restart from `00001`. */
async function resetCollections(): Promise<void> {
  const db = await getDb()
  const names = [
    COLLECTIONS.counters,
    COLLECTIONS.users,
    COLLECTIONS.departments,
    COLLECTIONS.teams,
    COLLECTIONS.roles,
    COLLECTIONS.projects,
    COLLECTIONS.workflowTemplates,
    COLLECTIONS.workflowInstances,
    COLLECTIONS.tasks,
    COLLECTIONS.files,
    COLLECTIONS.comments,
    COLLECTIONS.notifications,
    COLLECTIONS.timelineEvents,
  ]
  await Promise.all(names.map((name) => db.collection(name).deleteMany({})))
}

/** Pair each seed definition with a freshly allocated id, keyed by machine key. */
async function allocate<K extends EntityKind>(
  kind: K,
  seeds: ReadonlyArray<{ key: string }>,
): Promise<Map<string, EntityId<K>>> {
  const ids = await nextIds(kind, seeds.length)
  return new Map(seeds.map((seed, index) => [seed.key, ids[index]]))
}

export async function seed(options: SeedOptions): Promise<SeedSummary> {
  if (options.reset) {
    await resetCollections()
  } else if ((await countUsers()) > 0) {
    throw new Error(
      'Database already contains users. Re-run with --reset to wipe and reseed.',
    )
  }

  await ensureIndexes()

  const now = new Date()
  const departmentIds = await allocate('department', DEPARTMENT_SEEDS)
  const teamIds = await allocate('team', TEAM_SEEDS)
  const roleIds = await allocate('role', ROLE_SEEDS)
  const userIds = await allocate('user', USER_SEEDS)
  const projectIds = await allocate('project', PROJECT_SEEDS)

  const requireId = <T>(map: Map<string, T>, key: string, kind: string): T => {
    const id = map.get(key)
    if (!id) throw new Error(`Seed references unknown ${kind} "${key}"`)
    return id
  }

  const departments: Department[] = DEPARTMENT_SEEDS.map((seed) => ({
    departmentId: requireId(departmentIds, seed.key, 'department'),
    name: seed.name,
    description: seed.description,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }))

  const teams: Team[] = TEAM_SEEDS.map((seed) => ({
    teamId: requireId(teamIds, seed.key, 'team'),
    name: seed.name,
    departmentId: requireId(departmentIds, seed.departmentKey, 'department'),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }))

  const roles: Role[] = ROLE_SEEDS.map((seed) => ({
    roleId: requireId(roleIds, seed.key, 'role'),
    key: seed.key,
    name: seed.name,
    description: seed.description,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }))

  const passwordHash = await hash(options.password, BCRYPT_ROUNDS)
  const users: User[] = USER_SEEDS.map((seed) => ({
    userId: requireId(userIds, seed.key, 'user'),
    name: seed.name,
    email: seed.email.toLowerCase(),
    phone: seed.phone,
    departmentId: requireId(departmentIds, seed.departmentKey, 'department'),
    teamId: seed.teamKey ? requireId(teamIds, seed.teamKey, 'team') : undefined,
    roleIds: seed.roleKeys.map((key) => requireId(roleIds, key, 'role')),
    accessLevel: seed.accessLevel,
    status: 'active',
    joiningDate: new Date(seed.joiningDate),
    passwordHash,
    createdAt: now,
    updatedAt: now,
  }))

  const projects: Project[] = PROJECT_SEEDS.map((seed) => ({
    projectId: requireId(projectIds, seed.key, 'project'),
    name: seed.name,
    description: seed.description,
    ownerId: requireId(userIds, seed.ownerKey, 'user'),
    memberIds: seed.memberKeys.map((key) => requireId(userIds, key, 'user')),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }))

  // Workflow templates are ordinary data: the same shape the Workflow Builder
  // will produce, resolved from machine keys to permanent ids (spec §34).
  const workflowIds = await nextIds('workflowTemplate', WORKFLOW_SEEDS.length)
  const workflows: WorkflowTemplate[] = WORKFLOW_SEEDS.map((seed, index) =>
    buildWorkflowTemplate(seed, {
      workflowId: workflowIds[index],
      version: 1,
      now,
      roleIdByKey: roleIds,
      projectIdByKey: projectIds,
      departmentIdByKey: departmentIds,
    }),
  )

  await insertDepartments(departments)
  await insertTeams(teams)
  await insertRoles(roles)
  await insertUsers(users)
  await insertProjects(projects)
  await insertWorkflowTemplates(workflows)

  return {
    departments: departments.length,
    teams: teams.length,
    roles: roles.length,
    users: users.length,
    projects: projects.length,
    workflows: workflows.length,
  }
}
