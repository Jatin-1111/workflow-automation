/**
 * Global search (spec §48).
 *
 * Searches people, projects, workflows, instances, stages and files in one
 * pass — and scopes every result to what the person searching is allowed to
 * see. Search is the easiest place in an application to leak information,
 * because a result is a statement that something exists.
 */

import 'server-only'
import { can } from '@/lib/auth/permissions'
import { findFileById, searchFiles } from '@/lib/db/repositories/files'
import {
  findTaskById,
  listInstanceIdsAssignedTo,
  searchTasks,
} from '@/lib/db/repositories/tasks'
import { findUserById, searchUsers } from '@/lib/db/repositories/users'
import {
  findInstanceById,
  findInstancesByIds,
  listInstanceIdsStartedBy,
  searchInstances,
} from '@/lib/db/repositories/workflow-instances'
import { searchTemplates } from '@/lib/db/repositories/workflow-templates'
import {
  findProjectById,
  listProjects,
  searchProjects,
} from '@/lib/db/repositories/projects'
import { parseSearch, type ParsedSearch } from './query'
import type {
  FileId,
  ProjectId,
  TaskId,
  UserId,
  WorkflowInstanceId,
} from '@/lib/types/ids'
import type { PublicUser } from '@/lib/types/user'

export interface SearchHit {
  /** Where clicking the result goes, or null when there is nothing to open. */
  href: string | null
  title: string
  /** The trail that makes the hit make sense, e.g. project · workflow. */
  context?: string
  /** The permanent id, shown so it can be copied or searched again. */
  id: string
  meta?: string
}

export interface SearchGroup {
  label: string
  hits: SearchHit[]
}

export interface SearchResults {
  parsed: ParsedSearch
  groups: SearchGroup[]
  total: number
  /** Set when the term was a permanent id with a page of its own. */
  jumpTo?: string
}

/**
 * Which instances this person may know about.
 *
 * Oversight sees everything. Everybody else sees what they raised or have been
 * assigned work on — the same rule the task page enforces, so search cannot
 * become a way around it.
 */
async function visibleInstanceIds(
  viewer: PublicUser,
): Promise<Set<WorkflowInstanceId> | 'all'> {
  if (can(viewer.accessLevel, 'instance.view_all')) return 'all'

  const [started, assigned] = await Promise.all([
    listInstanceIdsStartedBy(viewer.userId),
    listInstanceIdsAssignedTo(viewer.userId),
  ])
  return new Set([...started, ...assigned])
}

function allowed(
  visible: Set<WorkflowInstanceId> | 'all',
  instanceId: WorkflowInstanceId,
): boolean {
  return visible === 'all' || visible.has(instanceId)
}

export async function runSearch(
  rawTerm: string | undefined,
  viewer: PublicUser,
): Promise<SearchResults> {
  const parsed = parseSearch(rawTerm)
  if (!parsed.usable) return { parsed, groups: [], total: 0 }

  const visible = await visibleInstanceIds(viewer)

  const [people, projects, templates, instances, tasks, files, allProjects] =
    await Promise.all([
      searchUsers(parsed.pattern),
      searchProjects(parsed.pattern),
      searchTemplates(parsed.pattern),
      searchInstances(parsed.pattern),
      searchTasks(parsed.pattern),
      searchFiles(parsed.pattern),
      listProjects(),
    ])

  const projectName = new Map(allProjects.map((project) => [project.projectId, project.name]))

  // Instance titles for the task and file hits that survive scoping.
  const referenced = [
    ...new Set([
      ...tasks.map((task) => task.instanceId),
      ...files.map((file) => file.instanceId),
    ]),
  ]
  const referencedInstances = await findInstancesByIds(referenced)
  const instanceTitle = new Map(
    [...instances, ...referencedInstances].map((instance) => [
      instance.instanceId,
      instance.title,
    ]),
  )

  const groups: SearchGroup[] = []

  const add = (label: string, hits: SearchHit[]) => {
    if (hits.length > 0) groups.push({ label, hits })
  }

  // People and the organisation chart are directory information: an employee
  // already sees colleagues' names on any shared workflow.
  add(
    'People',
    people.map((person) => ({
      href: can(viewer.accessLevel, 'team.view_workload') ? `/team/${person.userId}` : null,
      title: person.name,
      context: person.email,
      id: person.userId,
      meta: person.status === 'active' ? undefined : 'Deactivated',
    })),
  )

  add(
    'Projects',
    projects.map((project) => ({
      href: can(viewer.accessLevel, 'project.view_dashboard')
        ? `/projects/${project.projectId}`
        : null,
      title: project.name,
      context: project.description,
      id: project.projectId,
    })),
  )

  add(
    'Workflows',
    templates.map((template) => ({
      href: can(viewer.accessLevel, 'admin.manage_workflows')
        ? `/workflows/${template.workflowId}/${template.version}`
        : null,
      title: template.name,
      context: template.projectId ? projectName.get(template.projectId) : undefined,
      id: template.workflowId,
      meta: `v${template.version} · ${template.stages.length} stages`,
    })),
  )

  add(
    'Work',
    instances
      .filter((instance) => allowed(visible, instance.instanceId))
      .map((instance) => ({
        // An instance has no page of its own; its open task is the way in.
        href: null,
        title: instance.title,
        context: instance.projectId ? projectName.get(instance.projectId) : undefined,
        id: instance.instanceId,
        meta: instance.status.replace(/_/g, ' '),
      })),
  )

  add(
    'Stages',
    tasks
      .filter((task) => allowed(visible, task.instanceId))
      .map((task) => ({
        href: `/tasks/${task.taskId}`,
        title: task.stageName,
        context: instanceTitle.get(task.instanceId),
        id: task.taskId,
        meta: task.completedAt ? 'Completed' : task.status.replace(/_/g, ' '),
      })),
  )

  add(
    'Files',
    files
      .filter((file) => allowed(visible, file.instanceId))
      .map((file) => ({
        href: `/api/files/${file.fileId}`,
        title: file.name,
        context: instanceTitle.get(file.instanceId),
        id: file.fileId,
        meta: `v${file.version}${file.isFinalApproved ? ' · final approved' : ''}`,
      })),
  )

  const exact = parsed.exactId
    ? await lookupById(parsed.exactId, viewer, visible)
    : null
  if (exact) groups.unshift({ label: 'Exact match', hits: [exact] })

  const total = groups.reduce((count, group) => count + group.hits.length, 0)

  return { parsed, groups, total, jumpTo: exact?.href ?? undefined }
}

/**
 * Look a permanent id up directly (spec §48).
 *
 * Pasting an id is navigation, not searching. An id the viewer may not see
 * returns nothing at all rather than a refusal, because "you cannot see this"
 * still confirms that it exists.
 */
async function lookupById(
  exactId: { kind: string; id: string },
  viewer: PublicUser,
  visible: Set<WorkflowInstanceId> | 'all',
): Promise<SearchHit | null> {
  switch (exactId.kind) {
    case 'user': {
      const person = await findUserById(exactId.id as UserId)
      if (!person) return null
      return {
        href: can(viewer.accessLevel, 'team.view_workload') ? `/team/${person.userId}` : null,
        title: person.name,
        context: person.email,
        id: person.userId,
      }
    }

    case 'project': {
      const project = await findProjectById(exactId.id as ProjectId)
      if (!project) return null
      return {
        href: can(viewer.accessLevel, 'project.view_dashboard')
          ? `/projects/${project.projectId}`
          : null,
        title: project.name,
        context: project.description,
        id: project.projectId,
      }
    }

    case 'task': {
      const task = await findTaskById(exactId.id as TaskId)
      if (!task || !allowed(visible, task.instanceId)) return null
      const instance = await findInstanceById(task.instanceId)
      return {
        href: `/tasks/${task.taskId}`,
        title: task.stageName,
        context: instance?.title,
        id: task.taskId,
        meta: task.status.replace(/_/g, ' '),
      }
    }

    case 'workflowInstance': {
      const instance = await findInstanceById(exactId.id as WorkflowInstanceId)
      if (!instance || !allowed(visible, instance.instanceId)) return null
      return {
        href: null,
        title: instance.title,
        id: instance.instanceId,
        meta: instance.status.replace(/_/g, ' '),
      }
    }

    case 'file': {
      const file = await findFileById(exactId.id as FileId)
      if (!file || !allowed(visible, file.instanceId)) return null
      return {
        href: `/api/files/${file.fileId}`,
        title: file.name,
        id: file.fileId,
        meta: `v${file.version}`,
      }
    }

    default:
      return null
  }
}
