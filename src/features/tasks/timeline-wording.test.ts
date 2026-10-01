import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assignmentRecipients,
  eventsWorthALine,
  timelineSentence,
  type EventWords,
  type TimelineSentence,
} from './timeline-wording'
import { formatId } from '@/lib/ids/format'
import { TIMELINE_ACTIONS } from '@/lib/types/timeline'
import type { UserId } from '@/lib/types/ids'

const MEERA = formatId('user', 1) as UserId
const ASHA = formatId('user', 2) as UserId
const AT = new Date('2026-10-02T09:00:00Z')

/** The sentence as it reads, with the names marked like **this**. */
function read(sentence: TimelineSentence): string {
  return sentence.map((part) => (part.strong ? `**${part.text}**` : part.text)).join('')
}

const say = (words: Partial<EventWords> & Pick<EventWords, 'action'>) =>
  read(timelineSentence({ actorName: 'Rohan Das', stageName: 'Review', ...words }))

describe('a line of history', () => {
  it('names who was given the work, not who caused it', () => {
    // It read "Rohan Das task assigned · Review" for Meera's review.
    assert.equal(
      say({ action: 'task_assigned', recipientNames: ['Meera Nair'] }),
      '**Meera Nair** was given **Review**',
    )
  })

  it('says who moved work, and to whom', () => {
    assert.equal(
      say({ action: 'task_reassigned', actorName: 'Nitin Sharma', recipientNames: ['Asha Rao'] }),
      '**Nitin Sharma** moved **Review** to **Asha Rao**',
    )
  })

  it('names a shared stage’s people together', () => {
    assert.equal(
      say({ action: 'task_assigned', recipientNames: ['A', 'B', 'C'] }),
      '**A, B and C** were given **Review**',
    )
  })

  it('reads in words a person would use, not the names of database events', () => {
    assert.equal(say({ action: 'instance_created' }), '**Rohan Das** started the workflow')
    assert.equal(say({ action: 'progress_saved' }), '**Rohan Das** saved progress on **Review**')
    assert.equal(say({ action: 'changes_requested' }), '**Rohan Das** asked for changes at **Review**')
    assert.equal(say({ action: 'instance_completed' }), '**The workflow finished**')
  })

  it('has a sentence for every event the history can hold', () => {
    for (const action of TIMELINE_ACTIONS) {
      const words = say({ action })
      assert.ok(words.length > 0, action)
      assert.doesNotMatch(words, /_/, `${action} leaks its database name`)
    }
  })

  it('still reads when the stage is unknown', () => {
    assert.equal(
      read(timelineSentence({ action: 'stage_completed', actorName: 'Rohan Das' })),
      '**Rohan Das** completed a stage',
    )
  })

  it('names the file an upload added', () => {
    assert.equal(
      say({ action: 'file_uploaded', fileName: 'brief.pdf' }),
      '**Rohan Das** uploaded **brief.pdf** to **Review**',
    )
    assert.equal(say({ action: 'file_uploaded' }), '**Rohan Das** uploaded a file to **Review**')
  })

  it('says where an approval was given, not that a stage was approved', () => {
    // "Nitin Sharma approved Final Approval" said nothing.
    assert.equal(
      say({ action: 'approval_granted', stageName: 'Final Approval' }),
      '**Rohan Das** approved the work at **Final Approval**',
    )
  })

  it('agrees with the reader when the work went to them', () => {
    assert.equal(
      say({ action: 'task_assigned', recipientNames: ['You'], viewerIsRecipient: true }),
      '**You** were given **Review**',
    )
  })

  it('speaks to the reader on their own activity', () => {
    assert.equal(
      say({ action: 'assignee_completed', actorIsViewer: true }),
      '**You** finished your part of **Review**',
    )
  })
})

describe('which events get a line', () => {
  it('folds a stage opening into the assignment written with it', () => {
    // Every hand-over was two lines: "stage activated", then "task assigned".
    const events = [
      { action: 'stage_activated' as const, stageKey: 'review', at: AT },
      { action: 'task_assigned' as const, stageKey: 'review', at: AT },
    ]
    assert.deepEqual(
      eventsWorthALine(events).map((event) => event.action),
      ['task_assigned'],
    )
  })

  it('keeps a stage opening that has no assignment beside it', () => {
    const events = [
      { action: 'stage_activated' as const, stageKey: 'review', at: AT },
      { action: 'task_assigned' as const, stageKey: 'publish', at: AT },
    ]
    assert.equal(eventsWorthALine(events).length, 2)
  })
})

describe('who an assignment went to', () => {
  const review = { stageKey: 'review', activatedAt: AT, assignees: [MEERA] }

  it('uses what the event recorded', () => {
    const event = { action: 'task_assigned' as const, assigneeIds: [ASHA], stageKey: 'review', at: AT }
    assert.deepEqual(assignmentRecipients(event, [review]), [ASHA])
  })

  it('finds it for an older event from the task it opened', () => {
    const event = { action: 'task_assigned' as const, stageKey: 'review', at: AT }
    assert.deepEqual(assignmentRecipients(event, [review]), [MEERA])
  })

  it('does not match a task opened at another moment', () => {
    const event = { action: 'task_assigned' as const, stageKey: 'review', at: new Date(0) }
    assert.equal(assignmentRecipients(event, [review]), undefined)
  })

  it('does not guess for an older reassignment, whose people may have moved since', () => {
    const event = { action: 'task_reassigned' as const, stageKey: 'review', at: AT }
    assert.equal(assignmentRecipients(event, [review]), undefined)
  })
})
