/**
 * Management's view of the organisation (spec §16, §17, §43).
 *
 * Answers the questions the brief poses: what is happening, what is stuck,
 * who is responsible, what is overdue, what is waiting for approval, and what
 * has been completed.
 */

import 'server-only'
import { listDepartments } from '@/lib/db/repositories/departments'
import { listProjects } from '@/lib/db/repositories/projects'
import { listRoles } from '@/lib/db/repositories/roles'
import {
  listAllOpenTasks,
  listAllTasks,
  listTasksForInstance,
} from '@/lib/db/repositories/tasks'
import { listUsers } from '@/lib/db/repositories/users'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { listActiveTemplates } from '@/lib/db/repositories/workflow-templates'
import { deriveBucket, hasBreachedSla, hoursWaiting } from '@/lib/workflow/buckets'
import { endOfBusinessDay } from '@/lib/workflow/business-day'
import { entryTaskFor } from '@/lib/workflow/run-entry'
import {
  filterPeople,
  filterTasks,
  hasAnyFilter,
  instancesMatching,
  type OverviewFilters,
  type PersonIndex,
} from './filters'
import {
  TILE_COUNTS,
  countTiles,
  instanceInTile,
  taskInTile,
  type OverviewTile,
  type TileClock,
} from './overview-tiles'
import type { ProjectId, TaskId, UserId, WorkflowInstanceId } from '@/lib/types/ids'
import type { Priority } from '@/lib/types/status'
import type { Task } from '@/lib/types/task'

/** The most a tile's list shows; the rest are counted, not dropped silently. */
const TILE_LIST_LIMIT = 50

export type OverviewCounts = Record<OverviewTile, number>

/** One line of a tile's list: an open task, or a whole run of a workflow. */
export interface TileRow {
  key: string
  /** Where it opens. A run has no page of its own, so its task is the way in. */
  href: string | null
  title: string
  context: string
  people: string[]
  dueAt?: Date
  /** A short fact about the row, e.g. which stage a run is at. */
  note?: string
}

/** The list opened under the tiles. */
export interface TileList {
  tile: OverviewTile
  rows: TileRow[]
  /** How many matched; more than `rows.length` when the list was cut short. */
  total: number
}

/** A workflow sitting longer than its stage allows (spec §43). */
export interface StuckItem {
  taskId: TaskId
  instanceId: WorkflowInstanceId
  instanceTitle: string
  projectName: string
  stageName: string
  assignees: string[]
  /** Ids as well as names: a control that moves the task needs both. */
  assigneeIds: UserId[]
  hoursWaiting: number
  slaHours?: number
  slaBreached: boolean
  overdue: boolean
}

/** One person's load, for the workload table (spec §17). */
export interface WorkloadRow {
  userId: UserId
  name: string
  roleCount: number
  active: number
  dueToday: number
  overdue: number
  pendingApprovals: number
}

export interface UpcomingItem {
  taskId: TaskId
  instanceTitle: string
  projectName: string
  stageName: string
  assignees: string[]
  dueAt: Date
  priority: Priority
}

export interface ProjectStatusRow {
  projectId: ProjectId
  name: string
  activeInstances: number
  completedInstances: number
  overdueTasks: number
  pendingApprovals: number
}

export interface ManagementOverview {
  counts: OverviewCounts
  stuck: StuckItem[]
  workload: WorkloadRow[]
  upcoming: UpcomingItem[]
  projects: ProjectStatusRow[]
  tileList?: TileList
}

/**
 * Everything the management dashboard shows, in one pass over the open work.
 *
 * Read from the same task records the engine writes, so a manager and the
 * person doing the work never see different truths.
 */
export async function getManagementOverview(
  now = new Date(),
  filters: OverviewFilters = {},
  tile?: OverviewTile,
): Promise<ManagementOverview> {
  // Every task, not only open ones, when the filters need it or when a list
  // of runs needs a way into finished ones.
  const needsAllTasks = hasAnyFilter(filters) || (tile && TILE_COUNTS[tile] === 'runs')
  const [allOpenTasks, allInstances, users, projects, templates, allTasks] =
    await Promise.all([
      listAllOpenTasks(),
      listInstances(),
      listUsers(),
      listProjects(),
      listActiveTemplates(),
      needsAllTasks ? listAllTasks() : Promise.resolve([]),
    ])

  // Department and role belong to a person, not a task, so they are resolved
  // through the directory rather than read off the work.
  const index: PersonIndex = {
    departmentOf: new Map(users.map((user) => [user.userId, user.departmentId])),
    rolesOf: new Map(users.map((user) => [user.userId, user.roleIds])),
  }

  // "Open" in the repository means not completed, which includes work on a
  // run that was called off. None of it is waiting on anybody, so none of it
  // belongs in a count of what is — a cancelled task due yesterday was
  // counted as "due today" every day after.
  const liveTasks = allOpenTasks.filter((task) => task.status !== 'cancelled')
  const openTasks = filterTasks(liveTasks, filters, index, now)
  const instances = instancesMatching(allInstances, allTasks, filters, index)

  const userName = new Map(users.map((user) => [user.userId, user.name]))
  const projectName = new Map(projects.map((project) => [project.projectId, project.name]))
  const instanceById = new Map(instances.map((instance) => [instance.instanceId, instance]))
  const stageByKey = new Map(
    templates.flatMap((template) =>
      template.stages.map((stage) => [`${template.workflowId}:${stage.key}`, stage]),
    ),
  )

  const endToday = endOfBusinessDay(now).getTime()

  const nameOf = (userId: UserId) => userName.get(userId) ?? userId
  const titleOf = (id: WorkflowInstanceId) => instanceById.get(id)?.title ?? id
  const projectOf = (id?: ProjectId) =>
    id ? (projectName.get(id) ?? 'Unassigned') : 'Unassigned'

  const buckets = openTasks.map((task) => ({
    task,
    bucket: deriveBucket(task, now),
    slaBreached: hasBreachedSla(task, now),
  }))

  const clock: TileClock = { now, endToday }
  const counts: OverviewCounts = countTiles(buckets, instances, clock)

  // Anything overdue or past its SLA, worst first: this is the list a manager
  // should act on before anything else.
  const stuck: StuckItem[] = buckets
    .filter((entry) => entry.slaBreached || entry.bucket === 'overdue')
    .map((entry) => ({
      taskId: entry.task.taskId,
      instanceId: entry.task.instanceId,
      instanceTitle: titleOf(entry.task.instanceId),
      projectName: projectOf(entry.task.projectId),
      stageName: entry.task.stageName,
      assignees: entry.task.assignees.map(nameOf),
      assigneeIds: entry.task.assignees,
      hoursWaiting: hoursWaiting(entry.task, now),
      slaHours: stageByKey.get(`${entry.task.workflowId}:${entry.task.stageKey}`)?.slaHours,
      slaBreached: entry.slaBreached,
      overdue: entry.bucket === 'overdue',
    }))
    .sort((a, b) => b.hoursWaiting - a.hoursWaiting)

  const workload: WorkloadRow[] = filterPeople(users, filters)
    .filter((user) => user.status === 'active')
    .map((user) => {
      const mine = buckets.filter((entry) => entry.task.assignees.includes(user.userId))
      return {
        userId: user.userId,
        name: user.name,
        roleCount: user.roleIds.length,
        active: mine.length,
        // The same rules as the tiles, so a person's row adds up to them.
        dueToday: mine.filter((entry) => taskInTile('due_today', entry, clock)).length,
        overdue: mine.filter((entry) => taskInTile('overdue', entry, clock)).length,
        pendingApprovals: mine.filter((entry) => taskInTile('approvals', entry, clock)).length,
      }
    })
    .sort((a, b) => b.overdue - a.overdue || b.active - a.active)

  const upcoming: UpcomingItem[] = buckets
    .filter((entry) => entry.bucket !== 'overdue' && entry.task.dueAt !== undefined)
    .sort((a, b) => a.task.dueAt!.getTime() - b.task.dueAt!.getTime())
    .slice(0, 8)
    .map((entry) => ({
      taskId: entry.task.taskId,
      instanceTitle: titleOf(entry.task.instanceId),
      projectName: projectOf(entry.task.projectId),
      stageName: entry.task.stageName,
      assignees: entry.task.assignees.map(nameOf),
      dueAt: entry.task.dueAt!,
      priority: entry.task.priority,
    }))

  const visibleProjects = filters.project
    ? projects.filter((project) => project.projectId === filters.project)
    : projects

  const projectRows: ProjectStatusRow[] = visibleProjects.map((project) => {
    const projectInstances = instances.filter(
      (instance) => instance.projectId === project.projectId,
    )
    const projectTasks = buckets.filter(
      (entry) => entry.task.projectId === project.projectId,
    )

    return {
      projectId: project.projectId,
      name: project.name,
      activeInstances: projectInstances.filter(
        (instance) => instance.status === 'active' || instance.status === 'pending_approval',
      ).length,
      completedInstances: projectInstances.filter(
        (instance) => instance.status === 'completed',
      ).length,
      overdueTasks: projectTasks.filter((entry) => taskInTile('overdue', entry, clock)).length,
      pendingApprovals: projectTasks.filter((entry) => taskInTile('approvals', entry, clock))
        .length,
    }
  })

  const workflowName = new Map(templates.map((template) => [template.workflowId, template.name]))

  function taskRow(task: Task): TileRow {
    return {
      key: task.taskId,
      href: `/tasks/${task.taskId}`,
      title: task.stageName,
      context: `${projectOf(task.projectId)} · ${titleOf(task.instanceId)}`,
      people: task.assignees.map(nameOf),
      dueAt: task.dueAt,
      note:
        tile === 'approvals' || tile === 'blocked'
          ? `${hoursWaiting(task, now)}h waiting`
          : undefined,
    }
  }

  function runRow(instance: (typeof instances)[number]): TileRow {
    // Through every open task, not the filtered ones: a filter decides which
    // runs are listed, not which door opens them.
    const open = liveTasks.find((task) => task.instanceId === instance.instanceId)
    const way = entryTaskFor(allTasks.filter((task) => task.instanceId === instance.instanceId))
    const workflow = workflowName.get(instance.workflowId)
    return {
      key: instance.instanceId,
      href: way ? `/tasks/${way.taskId}` : null,
      title: instance.title,
      context: [projectOf(instance.projectId), workflow].filter(Boolean).join(' · '),
      people: open ? open.assignees.map(nameOf) : [],
      note: open
        ? `At ${open.stageName}`
        : instance.completedAt
          ? `Finished ${instance.completedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
          : undefined,
    }
  }

  let tileList: TileList | undefined
  if (tile && TILE_COUNTS[tile] === 'tasks') {
    const matching = buckets
      .filter((entry) => taskInTile(tile, entry, clock))
      .map((entry) => entry.task)
      // Deadlines soonest (or most overdue) first; work with none, longest
      // waiting first.
      .sort((a, b) =>
        a.dueAt && b.dueAt
          ? a.dueAt.getTime() - b.dueAt.getTime()
          : a.dueAt
            ? -1
            : b.dueAt
              ? 1
              : a.activatedAt.getTime() - b.activatedAt.getTime(),
      )
    tileList = {
      tile,
      total: matching.length,
      rows: matching.slice(0, TILE_LIST_LIMIT).map(taskRow),
    }
  } else if (tile) {
    const matching = instances
      .filter((instance) => instanceInTile(tile, instance, clock))
      // Finished runs most recent first; running ones longest running first.
      .sort((a, b) =>
        a.completedAt && b.completedAt
          ? b.completedAt.getTime() - a.completedAt.getTime()
          : a.startedAt.getTime() - b.startedAt.getTime(),
      )
    tileList = {
      tile,
      total: matching.length,
      rows: matching.slice(0, TILE_LIST_LIMIT).map(runRow),
    }
  }

  return { counts, stuck, workload, upcoming, projects: projectRows, tileList }
}

export interface PersonWork {
  userId: UserId
  name: string
  email: string
  accessLevel: string
  roleNames: string[]
  departmentName?: string
  tasks: {
    taskId: TaskId
    instanceTitle: string
    projectName: string
    stageName: string
    status: string
    dueAt?: Date
    overdue: boolean
  }[]
}

/**
 * One person's open work, for the drill-down from the workload table.
 *
 * Reachable only by someone with permission to view team workload; the caller
 * enforces that before asking.
 */
export async function getPersonWork(
  userId: UserId,
  now = new Date(),
): Promise<PersonWork | null> {
  const [users, projects, instances, roles, departments] = await Promise.all([
    listUsers(),
    listProjects(),
    listInstances(),
    listRoles(),
    listDepartments(),
  ])

  const user = users.find((candidate) => candidate.userId === userId)
  if (!user) return null

  const projectName = new Map(projects.map((project) => [project.projectId, project.name]))
  const instanceById = new Map(instances.map((instance) => [instance.instanceId, instance]))
  const roleName = new Map(roles.map((role) => [role.roleId, role.name]))

  const openTasks = (await listAllOpenTasks()).filter((task) =>
    task.assignees.includes(userId),
  )

  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    accessLevel: user.accessLevel,
    roleNames: user.roleIds.map((roleId) => roleName.get(roleId) ?? roleId),
    departmentName: departments.find(
      (department) => department.departmentId === user.departmentId,
    )?.name,
    tasks: openTasks.map((task) => ({
      taskId: task.taskId,
      instanceTitle: instanceById.get(task.instanceId)?.title ?? task.instanceId,
      projectName: task.projectId
        ? (projectName.get(task.projectId) ?? 'Unassigned')
        : 'Unassigned',
      stageName: task.stageName,
      status: task.status,
      dueAt: task.dueAt,
      overdue: deriveBucket(task, now) === 'overdue',
    })),
  }
}

/** Live instances of one project, for its dashboard (spec §18). */
export async function getProjectDashboard(projectId: ProjectId, now = new Date()) {
  const [projects, instances, users] = await Promise.all([
    listProjects(),
    listInstances({ projectId }),
    listUsers(),
  ])

  const project = projects.find((candidate) => candidate.projectId === projectId)
  if (!project) return null

  const userName = new Map(users.map((user) => [user.userId, user.name]))

  const rows = await Promise.all(
    instances.map(async (instance) => {
      const tasks = await listTasksForInstance(instance.instanceId)
      const open = tasks.find((task) => !task.completedAt)

      return {
        instanceId: instance.instanceId,
        title: instance.title,
        status: instance.status,
        startedAt: instance.startedAt,
        completedAt: instance.completedAt,
        currentStage: open?.stageName,
        currentTaskId: open?.taskId,
        assignees: open?.assignees.map((id) => userName.get(id) ?? id) ?? [],
        overdue: open ? deriveBucket(open, now) === 'overdue' : false,
        slaBreached: open ? hasBreachedSla(open, now) : false,
        hoursWaiting: open ? hoursWaiting(open, now) : 0,
      }
    }),
  )

  return {
    projectId: project.projectId,
    name: project.name,
    description: project.description,
    ownerName: project.ownerId ? userName.get(project.ownerId) : undefined,
    memberNames: project.memberIds.map((id) => userName.get(id) ?? id),
    instances: rows.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()),
  }
}
