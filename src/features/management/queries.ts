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
import {
  filterPeople,
  filterTasks,
  hasAnyFilter,
  instancesMatching,
  type OverviewFilters,
  type PersonIndex,
} from './filters'
import type { ProjectId, TaskId, UserId, WorkflowInstanceId } from '@/lib/types/ids'
import type { Priority } from '@/lib/types/status'

const WEEK_MS = 7 * 86_400_000

export interface OverviewCounts {
  activeWorkflows: number
  pendingApprovals: number
  overdueTasks: number
  dueToday: number
  blocked: number
  completedThisWeek: number
  completedTotal: number
}

/** A workflow sitting longer than its stage allows (spec §43). */
export interface StuckItem {
  taskId: TaskId
  instanceId: WorkflowInstanceId
  instanceTitle: string
  projectName: string
  stageName: string
  assignees: string[]
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
): Promise<ManagementOverview> {
  const [allOpenTasks, allInstances, users, projects, templates, allTasks] =
    await Promise.all([
      listAllOpenTasks(),
      listInstances(),
      listUsers(),
      listProjects(),
      listActiveTemplates(),
      hasAnyFilter(filters) ? listAllTasks() : Promise.resolve([]),
    ])

  // Department and role belong to a person, not a task, so they are resolved
  // through the directory rather than read off the work.
  const index: PersonIndex = {
    departmentOf: new Map(users.map((user) => [user.userId, user.departmentId])),
    rolesOf: new Map(users.map((user) => [user.userId, user.roleIds])),
  }

  const openTasks = filterTasks(allOpenTasks, filters, index, now)
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
  const weekAgo = now.getTime() - WEEK_MS

  const nameOf = (userId: UserId) => userName.get(userId) ?? userId
  const titleOf = (id: WorkflowInstanceId) => instanceById.get(id)?.title ?? id
  const projectOf = (id?: ProjectId) =>
    id ? (projectName.get(id) ?? 'Unassigned') : 'Unassigned'

  const buckets = openTasks.map((task) => ({
    task,
    bucket: deriveBucket(task, now),
    slaBreached: hasBreachedSla(task, now),
  }))

  const counts: OverviewCounts = {
    activeWorkflows: instances.filter(
      (instance) => instance.status === 'active' || instance.status === 'pending_approval',
    ).length,
    pendingApprovals: openTasks.filter((task) => task.status === 'pending_approval').length,
    overdueTasks: buckets.filter((entry) => entry.bucket === 'overdue').length,
    dueToday: buckets.filter(
      (entry) =>
        entry.bucket !== 'overdue' &&
        entry.task.dueAt !== undefined &&
        entry.task.dueAt.getTime() <= endToday,
    ).length,
    blocked: openTasks.filter((task) => task.status === 'blocked').length,
    completedThisWeek: instances.filter(
      (instance) =>
        instance.status === 'completed' &&
        instance.completedAt !== undefined &&
        instance.completedAt.getTime() >= weekAgo,
    ).length,
    completedTotal: instances.filter((instance) => instance.status === 'completed').length,
  }

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
        dueToday: mine.filter(
          (entry) =>
            entry.bucket !== 'overdue' &&
            entry.task.dueAt !== undefined &&
            entry.task.dueAt.getTime() <= endToday,
        ).length,
        overdue: mine.filter((entry) => entry.bucket === 'overdue').length,
        pendingApprovals: mine.filter((entry) => entry.task.status === 'pending_approval')
          .length,
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
      overdueTasks: projectTasks.filter((entry) => entry.bucket === 'overdue').length,
      pendingApprovals: projectTasks.filter(
        (entry) => entry.task.status === 'pending_approval',
      ).length,
    }
  })

  return { counts, stuck, workload, upcoming, projects: projectRows }
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
