/**
 * How one line of a run's history reads.
 *
 * Every event was written as "<actor> <action>", which is wrong for exactly
 * the events people check most: an assignment's actor is whoever caused it.
 * Rohan finishing his draft opened Meera's review, and the history said
 * "Rohan Das task assigned · Review" — as though the review were his.
 * Assignments now name who the work went to.
 *
 * Pure, so the wording is tested without rendering anything.
 */

import type { UserId } from '@/lib/types/ids'
import type { Task } from '@/lib/types/task'
import type { TimelineEvent } from '@/lib/types/timeline'

export interface TimelineSentence {
  /** Shown in bold: who the line is about. */
  subject: string
  verb: string
  /** Shown in bold after the verb, when there is somebody to name. */
  object?: string
}

/**
 * Who an assignment went to.
 *
 * Events written before they recorded it are matched to the task they
 * opened: an assignment is written in the same instant its task is
 * activated, at the same stage. That task's people now may differ from
 * then if it was moved later, so a match is only trusted on `task_assigned`.
 */
export function assignmentRecipients(
  event: Pick<TimelineEvent, 'action' | 'assigneeIds' | 'stageKey' | 'at'>,
  tasks: Pick<Task, 'stageKey' | 'activatedAt' | 'assignees'>[],
): UserId[] | undefined {
  if (event.assigneeIds && event.assigneeIds.length > 0) return event.assigneeIds
  if (event.action !== 'task_assigned') return undefined
  return tasks.find(
    (task) =>
      task.stageKey === event.stageKey && task.activatedAt.getTime() === event.at.getTime(),
  )?.assignees
}

function names(people: string[]): string {
  if (people.length <= 1) return people.join('')
  return `${people.slice(0, -1).join(', ')} and ${people.at(-1)}`
}

export function timelineSentence(
  action: TimelineEvent['action'],
  actorName: string,
  recipientNames: string[] | undefined,
  fallbackVerb: string,
): TimelineSentence {
  if (action === 'task_assigned' && recipientNames?.length) {
    return { subject: names(recipientNames), verb: 'was given this' }
  }
  if (action === 'task_reassigned' && recipientNames?.length) {
    return { subject: actorName, verb: 'moved it to', object: names(recipientNames) }
  }
  return { subject: actorName, verb: fallbackVerb }
}
