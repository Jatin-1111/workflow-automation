/**
 * The data behind the reports (spec §16, §47).
 *
 * Loads the records and hands them to the pure metrics module, so the page and
 * its export are guaranteed to show the same numbers.
 */

import 'server-only'
import { listProjects } from '@/lib/db/repositories/projects'
import { listAllTasks } from '@/lib/db/repositories/tasks'
import { listAllTimelineEvents } from '@/lib/db/repositories/timeline-events'
import { listUsers } from '@/lib/db/repositories/users'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { listAllTemplates } from '@/lib/db/repositories/workflow-templates'
import {
  computeMetrics,
  rangeWindow,
  type Metrics,
  type PersonMetric,
  type ReportRange,
  type StageMetric,
  type WorkflowMetric,
} from '@/lib/workflow/metrics'

// The metrics module works in plain ids so it stays free of the domain types;
// naming them is this layer's job.
export type NamedWorkflowMetric = WorkflowMetric & { name: string }
export type NamedStageMetric = StageMetric & { workflowName: string }
export type NamedPersonMetric = PersonMetric & { name: string }

export interface Report {
  range: ReportRange
  from: Date
  to: Date
  totals: Metrics['totals']
  workflows: NamedWorkflowMetric[]
  stages: NamedStageMetric[]
  people: NamedPersonMetric[]
  projects: { name: string; active: number; completed: number }[]
}

export async function getReport(
  range: ReportRange,
  now = new Date(),
): Promise<Report> {
  const [instances, tasks, events, templates, users, projects] = await Promise.all([
    listInstances(),
    listAllTasks(),
    listAllTimelineEvents(),
    listAllTemplates(),
    listUsers(),
    listProjects(),
  ])

  const { from, to } = rangeWindow(range, now)
  const metrics = computeMetrics({ instances, tasks, events, from, to })

  // A workflow has one name across its versions.
  const workflowName = new Map<string, string>(
    templates.map((template) => [template.workflowId, template.name]),
  )
  const userName = new Map<string, string>(
    users.map((user) => [user.userId, user.name]),
  )

  return {
    range,
    from,
    to,
    totals: metrics.totals,
    workflows: metrics.workflows
      .map((workflow) => ({
        ...workflow,
        name: workflowName.get(workflow.workflowId) ?? workflow.workflowId,
      }))
      .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name)),
    stages: metrics.stages.map((stage) => ({
      ...stage,
      workflowName: workflowName.get(stage.workflowId) ?? stage.workflowId,
    })),
    people: metrics.people.map((person) => ({
      ...person,
      name: userName.get(person.userId) ?? person.userId,
    })),
    projects: projects
      .map((project) => {
        const mine = instances.filter((instance) => instance.projectId === project.projectId)
        return {
          name: project.name,
          active: mine.filter(
            (instance) =>
              instance.status === 'active' || instance.status === 'pending_approval',
          ).length,
          completed: mine.filter(
            (instance) =>
              instance.status === 'completed' &&
              instance.completedAt !== undefined &&
              instance.completedAt >= from &&
              instance.completedAt <= to,
          ).length,
        }
      })
      .sort((a, b) => b.active + b.completed - (a.active + a.completed)),
  }
}
