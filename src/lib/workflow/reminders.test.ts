import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { approachWindowHours, planReminders, reminderKey } from './reminders'
import { formatId } from '@/lib/ids/format'
import type { Task } from '@/lib/types/task'

const NOW = new Date('2026-03-10T14:00:00Z')
const HOUR = 3_600_000

const INSTANCE = formatId('workflowInstance', 1)
const ALICE = formatId('user', 1)
const BOB = formatId('user', 2)

const TITLES = new Map([[INSTANCE as string, 'Proposal — ABC Technologies']])

/** A task opened `openedHoursAgo` ago and due `dueInHours` from now. */
function task(
  openedHoursAgo: number,
  dueInHours: number,
  overrides: Partial<Task> = {},
): Task {
  const activatedAt = new Date(NOW.getTime() - openedHoursAgo * HOUR)
  return {
    taskId: formatId('task', 1),
    instanceId: INSTANCE,
    workflowId: formatId('workflowTemplate', 1),
    stageKey: 'design',
    stageName: 'Design & Formatting',
    assignees: [ALICE],
    completionRule: 'any',
    completedBy: [],
    status: 'not_started',
    priority: 'medium',
    revisionRound: 1,
    fieldValues: {},
    checklist: [],
    files: [],
    activatedAt,
    dueAt: new Date(NOW.getTime() + dueInHours * HOUR),
    createdAt: activatedAt,
    updatedAt: activatedAt,
    ...overrides,
  }
}

function plan(tasks: Task[], alreadySent: string[] = []) {
  return planReminders({
    tasks,
    instanceTitles: TITLES,
    alreadySent: new Set(alreadySent),
    now: NOW,
  })
}

describe('approachWindowHours', () => {
  it('warns halfway through a short stage, not the moment it opens', () => {
    // A twelve hour stage, six hours in: half of twelve is six.
    assert.equal(approachWindowHours(task(6, 6)), 6)
  })

  it('never looks more than a day ahead, however long the stage is', () => {
    // Ten days of window would otherwise warn five days out, which is noise.
    assert.equal(approachWindowHours(task(0, 240)), 24)
  })

  it('is zero for a task with no deadline to approach', () => {
    assert.equal(approachWindowHours(task(1, 1, { dueAt: undefined })), 0)
  })
})

describe('planReminders', () => {
  it('says nothing about a deadline that is still far off', () => {
    // 48h left on a 72h stage: past the 24h cap, so not yet worth a word.
    assert.deepEqual(plan([task(24, 48)]), [])
  })

  it('warns once the deadline is inside the window', () => {
    const drafts = plan([task(66, 6)])
    assert.equal(drafts.length, 1)
    assert.equal(drafts[0].kind, 'deadline_approaching')
    assert.equal(drafts[0].recipientId, ALICE)
    assert.equal(drafts[0].taskId, task(66, 6).taskId)
  })

  it('does not warn a short stage the moment it opens', () => {
    // A twelve hour stage with ten hours left: opened two hours ago.
    assert.deepEqual(plan([task(2, 10)]), [])
    // The same stage with five hours left has crossed halfway.
    assert.equal(plan([task(7, 5)]).length, 1)
  })

  it('tells everybody holding a shared stage', () => {
    const drafts = plan([task(66, 6, { assignees: [ALICE, BOB] })])
    assert.deepEqual(
      drafts.map((draft) => draft.recipientId),
      [ALICE, BOB],
    )
  })

  it('reports a passed deadline as overdue, not as approaching', () => {
    const drafts = plan([task(72, -6)])
    assert.equal(drafts.length, 1)
    assert.equal(drafts[0].kind, 'task_overdue')
    assert.match(drafts[0].body ?? '', /was due 6 hours ago/)
  })

  it('names the instance so the notice says which piece of work', () => {
    assert.match(plan([task(66, 6)])[0].body ?? '', /Proposal — ABC Technologies/)
  })

  it('falls back to the instance id when the title is not to hand', () => {
    const orphan = formatId('workflowInstance', 99)
    const drafts = plan([task(66, 6, { instanceId: orphan })])
    assert.match(drafts[0].body ?? '', new RegExp(orphan))
  })

  it('does not tell somebody the same thing twice', () => {
    const open = task(66, 6)
    assert.deepEqual(
      plan([open], [reminderKey(open.taskId, 'deadline_approaching', ALICE)]),
      [],
    )
  })

  it('still tells somebody the work was moved to after the notice went out', () => {
    // Reassignment keeps the task id, so a key without the person in it would
    // leave the new owner never hearing that their work is late.
    const late = task(72, -6, { assignees: [BOB] })
    const drafts = plan([late], [reminderKey(late.taskId, 'task_overdue', ALICE)])

    assert.equal(drafts.length, 1)
    assert.equal(drafts[0].recipientId, BOB)
  })

  it('tells only the holder who has not already heard', () => {
    const shared = task(66, 6, { assignees: [ALICE, BOB] })
    const drafts = plan(
      [shared],
      [reminderKey(shared.taskId, 'deadline_approaching', ALICE)],
    )

    assert.equal(drafts.length, 1)
    assert.equal(drafts[0].recipientId, BOB)
  })

  it('still reports overdue to somebody already warned it was approaching', () => {
    const late = task(72, -2)
    const drafts = plan([late], [reminderKey(late.taskId, 'deadline_approaching', ALICE)])
    assert.equal(drafts.length, 1)
    assert.equal(drafts[0].kind, 'task_overdue')
  })

  it('ignores work that is already finished or called off', () => {
    assert.deepEqual(plan([task(72, -6, { status: 'completed' })]), [])
    assert.deepEqual(plan([task(72, -6, { completedAt: NOW })]), [])
    assert.deepEqual(plan([task(72, -6, { status: 'cancelled' })]), [])
  })

  it('ignores a stage that was never given a deadline', () => {
    assert.deepEqual(plan([task(72, -6, { dueAt: undefined })]), [])
  })
})
