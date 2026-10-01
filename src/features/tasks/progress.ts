/**
 * Where a run stands, as the trail across the top of a task page (spec §11).
 *
 * Pure, so the trail can be tested without a database.
 */

import { stageApplies } from '@/lib/engine'
import type { FieldValue } from '@/lib/types/instance'
import type { Task } from '@/lib/types/task'
import type { StageDefinition } from '@/lib/types/workflow'

export interface StageProgress {
  key: string
  name: string
  state: 'done' | 'current' | 'upcoming' | 'skipped'
  revisionRound?: number
}

/** A task still waiting on somebody, as opposed to finished or called off. */
function isOpen(task: Task): boolean {
  return !task.completedAt && task.status !== 'cancelled'
}

/**
 * The trail for the task being viewed.
 *
 * The viewed task's stage used to be "current" whatever had happened to it,
 * so the page for a stage just finished said "0 of 3 complete" — always one
 * behind — and showed the run sitting on a stage it had left. A finished
 * task's stage is now done, and the stage the run has moved on to is the one
 * marked current.
 */
export function buildProgress(
  stages: StageDefinition[],
  tasks: Task[],
  viewed: Task,
  fieldValues: Record<string, FieldValue>,
): StageProgress[] {
  return stages.map((stage) => {
    const ofStage = tasks.filter((task) => task.stageKey === stage.key)
    const latest = ofStage.at(-1)

    if (stage.key === viewed.stageKey && isOpen(viewed)) {
      return {
        key: stage.key,
        name: stage.name,
        state: 'current',
        revisionRound: viewed.revisionRound > 1 ? viewed.revisionRound : undefined,
      }
    }

    // Where the run is now, when that is not the task on screen.
    const open = ofStage.find(isOpen)
    if (open && open.taskId !== viewed.taskId) {
      return {
        key: stage.key,
        name: stage.name,
        state: 'current',
        revisionRound: open.revisionRound > 1 ? open.revisionRound : undefined,
      }
    }

    if (latest?.completedAt || (stage.key === viewed.stageKey && viewed.completedAt)) {
      return { key: stage.key, name: stage.name, state: 'done' }
    }
    // A conditional stage this run will not reach is shown as skipped rather
    // than pending, so the trail matches what will actually happen (spec §36).
    if (!latest && !stageApplies(stage, fieldValues)) {
      return { key: stage.key, name: stage.name, state: 'skipped' }
    }
    return { key: stage.key, name: stage.name, state: 'upcoming' }
  })
}

/** A stage the run is waiting on now, and who holds it. */
export interface NowWith {
  stageName: string
  assignees: Task['assignees']
}

/**
 * Where the work went after the task on screen.
 *
 * Finishing a stage used to end in silence: the form disappeared, and with
 * it the line saying who would get the work next. This is what the page
 * says instead, worked out from the run as it stands, so it is still true
 * when the page is opened again tomorrow.
 */
export function whereTheRunIs(tasks: Task[], viewed: Task): NowWith[] {
  return tasks
    .filter((task) => task.taskId !== viewed.taskId && isOpen(task))
    .map((task) => ({ stageName: task.stageName, assignees: task.assignees }))
}
