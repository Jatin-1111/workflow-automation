/**
 * Narrowing the management view (spec §49).
 *
 * Pure functions over already-loaded records. The organisation is small
 * enough that filtering in memory keeps every combination testable without a
 * database, which matters here because the combinations are the whole point.
 *
 * Person, role and department are properties of whoever holds a task, not of
 * the task, so they are resolved through a directory the caller supplies.
 */

import { deriveBucket } from '@/lib/workflow/buckets'
import { endOfBusinessDay } from '@/lib/workflow/business-day'
import { PRIORITIES, TASK_STATUSES } from '@/lib/types/status'
import type { Priority, TaskStatus } from '@/lib/types/status'
import type { Task } from '@/lib/types/task'
import type { WorkflowInstance } from '@/lib/types/instance'
import type { DepartmentId, RoleId, UserId } from '@/lib/types/ids'

/** When something falls due, as a manager would ask for it. */
export const DUE_WINDOWS = ['overdue', 'today', 'week', 'none'] as const
export type DueWindow = (typeof DUE_WINDOWS)[number]

export const DUE_WINDOW_LABELS: Record<DueWindow, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Due this week',
  none: 'No deadline',
}

export interface OverviewFilters {
  project?: string
  workflow?: string
  user?: string
  role?: string
  department?: string
  status?: TaskStatus
  priority?: Priority
  due?: DueWindow
}

/** What a task's assignees belong to, which the task itself does not record. */
export interface PersonIndex {
  departmentOf: Map<UserId, DepartmentId | undefined>
  rolesOf: Map<UserId, RoleId[]>
}

const WEEK_MS = 7 * 86_400_000

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

export function parseOverviewFilters(
  params: Record<string, string | string[] | undefined>,
): OverviewFilters {
  const status = first(params.status)
  const priority = first(params.priority)
  const due = first(params.due)

  return {
    project: first(params.project),
    workflow: first(params.workflow),
    user: first(params.user),
    role: first(params.role),
    department: first(params.department),
    status: TASK_STATUSES.includes(status as TaskStatus)
      ? (status as TaskStatus)
      : undefined,
    priority: PRIORITIES.includes(priority as Priority)
      ? (priority as Priority)
      : undefined,
    due: DUE_WINDOWS.includes(due as DueWindow) ? (due as DueWindow) : undefined,
  }
}

export function hasAnyFilter(filters: OverviewFilters): boolean {
  return Object.values(filters).some((value) => value !== undefined)
}

/** How many are set, for telling somebody what is currently hiding rows. */
export function activeFilterCount(filters: OverviewFilters): number {
  return Object.values(filters).filter((value) => value !== undefined).length
}

function matchesDue(task: Task, due: DueWindow, now: Date): boolean {
  if (due === 'none') return task.dueAt === undefined
  if (!task.dueAt) return false

  const overdue = deriveBucket(task, now) === 'overdue'
  if (due === 'overdue') return overdue
  if (overdue) return false

  const limit =
    due === 'today'
      ? endOfBusinessDay(now).getTime()
      : now.getTime() + WEEK_MS
  return task.dueAt.getTime() <= limit
}

/**
 * Whether any of a task's assignees satisfies the person-shaped filters.
 *
 * "Any", not "all": a shared stage held by one person in Design and one in
 * Content genuinely belongs in both departments' views.
 */
function matchesPeople(
  task: Task,
  filters: OverviewFilters,
  index: PersonIndex,
): boolean {
  if (filters.user && !task.assignees.includes(filters.user as UserId)) return false

  if (filters.department) {
    const inDepartment = task.assignees.some(
      (assignee) => index.departmentOf.get(assignee) === filters.department,
    )
    if (!inDepartment) return false
  }

  if (filters.role) {
    const holdsRole = task.assignees.some((assignee) =>
      (index.rolesOf.get(assignee) ?? []).includes(filters.role as RoleId),
    )
    if (!holdsRole) return false
  }

  return true
}

export function filterTasks(
  tasks: Task[],
  filters: OverviewFilters,
  index: PersonIndex,
  now: Date,
): Task[] {
  return tasks.filter((task) => {
    if (filters.project && task.projectId !== filters.project) return false
    if (filters.workflow && task.workflowId !== filters.workflow) return false
    if (filters.status && task.status !== filters.status) return false
    if (filters.priority && task.priority !== filters.priority) return false
    if (filters.due && !matchesDue(task, filters.due, now)) return false
    return matchesPeople(task, filters, index)
  })
}

/**
 * The instances a filtered view should still count.
 *
 * Worked out from every task, not only the open ones: a finished workflow has
 * no open task, and dropping it would make "completed this week" fall to zero
 * the moment anybody filtered by department.
 */
export function instancesMatching(
  instances: WorkflowInstance[],
  allTasks: Task[],
  filters: OverviewFilters,
  index: PersonIndex,
): WorkflowInstance[] {
  if (!hasAnyFilter(filters)) return instances

  // Deadline, status and priority describe a moment in a task's life, not the
  // workflow it belongs to, so they do not decide which runs are in view.
  const structural: OverviewFilters = {
    project: filters.project,
    workflow: filters.workflow,
    user: filters.user,
    role: filters.role,
    department: filters.department,
  }
  if (!hasAnyFilter(structural)) return instances

  const allowed = new Set(
    allTasks
      .filter((task) => {
        if (structural.project && task.projectId !== structural.project) return false
        if (structural.workflow && task.workflowId !== structural.workflow) return false
        return matchesPeople(task, structural, index)
      })
      .map((task) => task.instanceId as string),
  )

  return instances.filter((instance) => allowed.has(instance.instanceId))
}

/** People the workload table should list under the current filters. */
export function filterPeople<T extends { userId: UserId; roleIds: RoleId[]; departmentId?: DepartmentId }>(
  people: T[],
  filters: OverviewFilters,
): T[] {
  return people.filter((person) => {
    if (filters.user && person.userId !== filters.user) return false
    if (filters.department && person.departmentId !== filters.department) return false
    if (filters.role && !person.roleIds.includes(filters.role as RoleId)) return false
    return true
  })
}
