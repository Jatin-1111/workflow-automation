import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { settlementsFor } from './settled-notifications'
import { formatId } from '@/lib/ids/format'
import type { TaskId, UserId } from '@/lib/types/ids'

const TASK = formatId('task', 1) as TaskId
const MEERA = formatId('user', 1) as UserId
const ROHAN = formatId('user', 2) as UserId
const NOW = new Date('2026-10-02T09:00:00Z')

describe('which notifications stop asking anything', () => {
  it('settles everyone’s once a task is finished', () => {
    // "Approval required" stayed unread after the approval was given.
    assert.deepEqual(
      settlementsFor([{ taskId: TASK, changes: { status: 'completed', completedAt: NOW } }]),
      [{ taskId: TASK, stillHeldBy: [] }],
    )
  })

  it('settles everyone’s once a task is called off', () => {
    assert.deepEqual(settlementsFor([{ taskId: TASK, changes: { status: 'cancelled' } }]), [
      { taskId: TASK, stillHeldBy: [] },
    ])
  })

  it('keeps the new owner’s when a task is moved, and settles the rest', () => {
    assert.deepEqual(settlementsFor([{ taskId: TASK, changes: { assignees: [ROHAN] } }]), [
      { taskId: TASK, stillHeldBy: [ROHAN] },
    ])
  })

  it('leaves alone a task that is only being worked on', () => {
    // Saving progress or ticking a box asks nothing new and settles nothing.
    assert.deepEqual(
      settlementsFor([
        { taskId: TASK, changes: { status: 'in_progress', fieldValues: { draft: 'x' } } },
        { taskId: TASK, changes: { completedBy: [MEERA] } },
      ]),
      [],
    )
  })
})
