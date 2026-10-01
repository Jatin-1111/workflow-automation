import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { assignmentRecipients, timelineSentence } from './timeline-wording'
import { formatId } from '@/lib/ids/format'
import type { UserId } from '@/lib/types/ids'

const MEERA = formatId('user', 1) as UserId
const ASHA = formatId('user', 2) as UserId
const AT = new Date('2026-10-02T09:00:00Z')

describe('an assignment in the history', () => {
  it('names who was given the work, not who caused it', () => {
    // It read "Rohan Das task assigned · Review" for Meera's review.
    assert.deepEqual(
      timelineSentence('task_assigned', 'Rohan Das', ['Meera Nair'], 'task assigned'),
      { subject: 'Meera Nair', verb: 'was given this' },
    )
  })

  it('says who moved work, and to whom', () => {
    assert.deepEqual(
      timelineSentence('task_reassigned', 'Nitin Sharma', ['Asha Rao'], 'task reassigned'),
      { subject: 'Nitin Sharma', verb: 'moved it to', object: 'Asha Rao' },
    )
  })

  it('names a shared stage’s people together', () => {
    assert.equal(
      timelineSentence('task_assigned', 'X', ['A', 'B', 'C'], 'task assigned').subject,
      'A, B and C',
    )
  })

  it('reads every other event as before', () => {
    assert.deepEqual(timelineSentence('stage_completed', 'Rohan Das', undefined, 'stage completed'), {
      subject: 'Rohan Das',
      verb: 'stage completed',
    })
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
