'use server'

/**
 * Moving a card between columns.
 *
 * The gesture is Trello's; what happens underneath is not. A drag does not
 * write a new stage onto the run — it is translated into the engine operation
 * that would have produced that move, and the engine decides whether it is
 * allowed:
 *
 *   forward one stage   -> complete it (or approve, on an approval stage)
 *   back to an earlier  -> request changes, which needs a reason
 *   anywhere else       -> refused
 *
 * So required fields, required files, unticked checklists, approval rules and
 * who may act are all still enforced, and the card only moves when the engine
 * says the work moved. A refusal carries its reason back so the board can say
 * why rather than silently snapping the card home.
 */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/dal'
import { isEntityId } from '@/lib/ids/format'
import {
  approveTask,
  completeTask,
  loadTaskContext,
  requestTaskChanges,
} from '@/lib/workflow/service'
import { classifyMove } from './transitions'
import type { TaskId } from '@/lib/types/ids'

export type MoveOutcome =
  | { ok: true }
  | { ok: false; reason: string; needsComment?: boolean; openTaskId?: TaskId }

function refuse(reason: string, extra: Partial<MoveOutcome> = {}): MoveOutcome {
  return { ok: false, reason, ...extra } as MoveOutcome
}

export async function moveCardAction(input: {
  taskId: string
  toStageKey: string
  comment?: string
}): Promise<MoveOutcome> {
  const viewer = await requireUser()

  if (!isEntityId(input.taskId, 'task')) {
    return refuse('That card could not be identified.')
  }
  const taskId = input.taskId as TaskId

  const loaded = await loadTaskContext(taskId)
  if (!loaded) return refuse('That card no longer exists.')

  const { task, template } = loaded
  // Only an assignee may move it, the same rule the task page follows. A
  // manager seeing somebody else's card can reassign it, not push it along.
  if (!task.assignees.includes(viewer.userId)) {
    return refuse(
      `This stage belongs to ${task.assignees.length === 1 ? 'someone else' : 'other people'}. Reassign it first if it needs to move.`,
      { openTaskId: taskId },
    )
  }

  const move = classifyMove(template.stages, task.stageKey, input.toStageKey)
  if (move.kind === 'same') return { ok: true }
  if (move.kind === 'illegal') return refuse(move.reason)

  let outcome
  if (move.kind === 'forward') {
    outcome = move.approval
      ? await approveTask(taskId, viewer.userId, {})
      : await completeTask(taskId, viewer.userId, {})
  } else {
    const comment = input.comment?.trim()
    if (!comment) {
      return refuse('Say what needs changing. It goes on the record.', {
        needsComment: true,
      })
    }
    outcome = await requestTaskChanges(taskId, viewer.userId, { comment })
  }

  if (!outcome.ok) {
    return refuse(outcome.errors.map((error) => error.message).join(' '), {
      // Most refusals are a missing field, file or checklist item, which can
      // only be supplied on the task itself.
      openTaskId: taskId,
    })
  }

  revalidatePath('/board')
  revalidatePath('/my-work')
  revalidatePath('/dashboard')
  return { ok: true }
}
