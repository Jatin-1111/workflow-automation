/**
 * How one line of a run's history reads.
 *
 * Every event was written as "<actor> <action>": "Rohan Das task assigned",
 * "Meera Nair stage activated", "Rohan Das instance created". That is the
 * database talking, and it was wrong for exactly the events people check
 * most — an assignment's actor is whoever caused it, so a review that went
 * to Meera read as Rohan's. Each event now reads as a sentence about who did
 * what to which stage, using the stage's own name.
 *
 * Pure, so the wording is tested without rendering anything.
 */

import type { UserId } from '@/lib/types/ids'
import type { Task } from '@/lib/types/task'
import type { TimelineAction, TimelineEvent } from '@/lib/types/timeline'

/** A run of text, with the names in it marked so they can stand out. */
export interface SentencePart {
  text: string
  strong?: boolean
}
export type TimelineSentence = SentencePart[]

/** What a sentence needs, already turned from ids into names. */
export interface EventWords {
  action: TimelineAction
  actorName: string
  stageName?: string
  /** Who an assignment went to, when that is known. */
  recipientNames?: string[]
  /** The file an upload added, when it can still be found. */
  fileName?: string
  /**
   * The person reading is the person who acted, as on their own profile:
   * the line then reads "You approved…" and "your part".
   */
  actorIsViewer?: boolean
  /**
   * The reader is among `recipientNames`, already written there as "You",
   * so the verb agrees: "You were given", not "You was given".
   */
  viewerIsRecipient?: boolean
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

/**
 * The events worth a line.
 *
 * Opening a stage and giving it to somebody are written as two events in the
 * same instant, which made every hand-over two lines — "stage activated",
 * then "task assigned". The assignment says both, so its twin is left out.
 * A stage opened with no assignment beside it still shows.
 */
export function eventsWorthALine<T extends Pick<TimelineEvent, 'action' | 'stageKey' | 'at'>>(
  events: T[],
): T[] {
  const assigned = new Set(
    events
      .filter((event) => event.action === 'task_assigned')
      .map((event) => `${event.stageKey}@${event.at.getTime()}`),
  )
  return events.filter(
    (event) =>
      event.action !== 'stage_activated' ||
      !assigned.has(`${event.stageKey}@${event.at.getTime()}`),
  )
}

function names(people: string[]): string {
  if (people.length <= 1) return people.join('')
  return `${people.slice(0, -1).join(', ')} and ${people.at(-1)}`
}

const strong = (text: string): SentencePart => ({ text, strong: true })
const plain = (text: string): SentencePart => ({ text })

/** One line of history, in words somebody would use. */
export function timelineSentence(words: EventWords): TimelineSentence {
  const actor = strong(words.actorIsViewer ? 'You' : words.actorName)
  const their = words.actorIsViewer ? 'your' : 'their'
  const stage = words.stageName ? strong(words.stageName) : plain('a stage')
  const recipients = words.recipientNames?.length ? strong(names(words.recipientNames)) : null

  switch (words.action) {
    case 'instance_created':
      return [actor, plain(' started the workflow')]
    case 'stage_activated':
      return [stage, plain(' opened')]
    case 'stage_skipped':
      return [stage, plain(' was skipped: this run does not need it')]
    case 'stage_completed':
      return [actor, plain(' completed '), stage]
    case 'assignee_completed':
      return [actor, plain(` finished ${their} part of `), stage]
    case 'task_assigned':
      return recipients
        ? [
            recipients,
            plain(
              words.recipientNames!.length > 1 || words.viewerIsRecipient
                ? ' were given '
                : ' was given ',
            ),
            stage,
          ]
        : [stage, plain(' was handed on')]
    case 'task_reassigned':
      return recipients
        ? [actor, plain(' moved '), stage, plain(' to '), recipients]
        : [actor, plain(' moved '), stage, plain(' to somebody else')]
    case 'progress_saved':
      return [actor, plain(' saved progress on '), stage]
    case 'file_uploaded':
      // Named rather than numbered: a version count is per upload slot, so
      // a second, different file in the same slot is not "version 2" of
      // anything a person would recognise.
      return words.fileName
        ? [actor, plain(' uploaded '), strong(words.fileName), plain(' to '), stage]
        : [actor, plain(' uploaded a file to '), stage]
    case 'checklist_updated':
      return [actor, plain(' updated the checklist on '), stage]
    case 'comment_added':
      return [actor, plain(' commented on '), stage]
    case 'approval_granted':
      // The stage is where the approval was given, not what was approved:
      // "approved Final Approval" said nothing.
      return [actor, plain(' approved the work at '), stage]
    case 'changes_requested':
      return [actor, plain(' asked for changes at '), stage]
    case 'task_held':
      return [actor, plain(' put '), stage, plain(' on hold')]
    case 'task_resumed':
      return [actor, plain(' picked '), stage, plain(' back up')]
    case 'instance_completed':
      return [strong('The workflow finished')]
    case 'instance_cancelled':
      return [actor, plain(' called off the workflow')]
  }
}
