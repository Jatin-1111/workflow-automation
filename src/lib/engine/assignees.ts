/**
 * Resolving who a stage is assigned to.
 *
 * A stage names sources, not people. The union of those sources is the set of
 * assignees, so replacing a person is a role remapping rather than a workflow
 * edit (spec §6), and a stage with two owners needs no special case (spec §22).
 */

import type { UserId } from '@/lib/types/ids'
import type { Task } from '@/lib/types/task'
import type { WorkflowInstance } from '@/lib/types/instance'
import type { AssigneeSource, StageDefinition } from '@/lib/types/workflow'
import type { EngineContext } from './types'

/** Who actually did the work at an earlier stage, most recent pass first. */
function assigneesOfCompletedStage(tasks: Task[], stageKey: string): UserId[] {
  const completed = tasks
    .filter((task) => task.stageKey === stageKey && task.completedAt)
    .sort((a, b) => b.revisionRound - a.revisionRound)

  const latest = completed[0]
  if (!latest) return []
  return latest.completedBy.length > 0 ? latest.completedBy : latest.assignees
}

function resolveSource(
  source: AssigneeSource,
  instance: Pick<WorkflowInstance, 'initiatedBy'>,
  tasks: Task[],
  context: EngineContext,
): UserId[] {
  switch (source.mode) {
    case 'role':
      // A role may map to several people; all of them receive the work.
      return context.usersByRole[source.roleId] ?? []
    case 'users':
      return source.userIds
    case 'initiator':
      return [instance.initiatedBy]
    case 'stage_assignee':
      return assigneesOfCompletedStage(tasks, source.stageKey)
  }
}

/** The de-duplicated union of a stage's assignee sources, order preserved. */
export function resolveAssignees(
  stage: StageDefinition,
  instance: Pick<WorkflowInstance, 'initiatedBy'>,
  tasks: Task[],
  context: EngineContext,
): UserId[] {
  const resolved = stage.assignees.flatMap((source) =>
    resolveSource(source, instance, tasks, context),
  )
  return [...new Set(resolved)]
}
