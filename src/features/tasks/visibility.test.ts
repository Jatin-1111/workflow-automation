import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canViewTask, participatedIn, type TaskAudience } from './visibility'
import { formatId } from '@/lib/ids/format'
import type { AccessLevel } from '@/lib/types/status'

const WRITER = formatId('user', 1)
const REVIEWER = formatId('user', 2)
const RAISED_IT = formatId('user', 3)
const STRANGER = formatId('user', 4)

function viewer(userId: string, accessLevel: AccessLevel) {
  return { userId, accessLevel }
}

/** A run whose review stage is open, and whose draft stage is done. */
function run(overrides: Partial<TaskAudience> = {}): TaskAudience {
  return {
    assignees: [REVIEWER],
    initiatedBy: RAISED_IT,
    everyStageAssignees: [[WRITER], [REVIEWER]],
    ...overrides,
  }
}

describe('the person holding the stage', () => {
  it('can read it, at any access level', () => {
    for (const level of ['employee', 'manager', 'admin'] as AccessLevel[]) {
      assert.equal(canViewTask(viewer(REVIEWER, level), run()), true, level)
    }
  })
})

describe('somebody who was part of the run earlier', () => {
  it('can still read it after handing it on', () => {
    // Otherwise a handover looks like the work disappearing.
    assert.equal(canViewTask(viewer(WRITER, 'employee'), run()), true)
  })

  it('can read it if they raised it, even holding no stage', () => {
    assert.equal(canViewTask(viewer(RAISED_IT, 'employee'), run()), true)
  })

  it('is not counted as a participant when they are a stranger to it', () => {
    assert.equal(participatedIn(viewer(STRANGER, 'employee'), run()), false)
  })
})

describe('somebody with no connection to the run', () => {
  it('is refused as an employee', () => {
    // The whole confidentiality boundary: an employee sees their own work.
    assert.equal(canViewTask(viewer(STRANGER, 'employee'), run()), false)
  })

  it('is allowed as a manager', () => {
    // The Board, the Overview and the Team page all show a manager every
    // run and link to it. This used to be admin-only, so each of those
    // links led to "Not found", and task.reassign — which is driven from
    // the task page — was mostly unusable.
    assert.equal(canViewTask(viewer(STRANGER, 'manager'), run()), true)
  })

  it('is allowed as an administrator', () => {
    assert.equal(canViewTask(viewer(STRANGER, 'admin'), run()), true)
  })
})

describe('the rule reads the run, not just the open stage', () => {
  it('lets in somebody who held a stage that is now finished', () => {
    const earlier = run({ assignees: [REVIEWER], everyStageAssignees: [[WRITER], [REVIEWER]] })
    assert.equal(canViewTask(viewer(WRITER, 'employee'), earlier), true)
  })

  it('keeps out an employee who held a stage of a different run', () => {
    const other = run({ everyStageAssignees: [[REVIEWER]] })
    assert.equal(canViewTask(viewer(WRITER, 'employee'), other), false)
  })

  it('copes with a stage nobody holds', () => {
    const unassigned = run({ assignees: [], everyStageAssignees: [[]] })
    assert.equal(canViewTask(viewer(STRANGER, 'employee'), unassigned), false)
    assert.equal(canViewTask(viewer(RAISED_IT, 'employee'), unassigned), true)
  })
})
