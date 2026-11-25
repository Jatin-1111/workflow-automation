import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { UserId } from '@/lib/types/ids'
import { isInvolved } from './involvement'

const INITIATOR = 'BO-USR-00001' as UserId
const ASSIGNEE = 'BO-USR-00002' as UserId
const OTHER_ASSIGNEE = 'BO-USR-00003' as UserId
const STRANGER = 'BO-USR-00004' as UserId

const instance = { initiatedBy: INITIATOR }
const tasks = [{ assignees: [ASSIGNEE] }, { assignees: [OTHER_ASSIGNEE, ASSIGNEE] }]

describe('who has a part in a workflow run', () => {
  it('includes the person who started it', () => {
    assert.equal(isInvolved(INITIATOR, instance, tasks), true)
  })

  it('includes anybody assigned to any of its tasks', () => {
    assert.equal(isInvolved(ASSIGNEE, instance, tasks), true)
    assert.equal(isInvolved(OTHER_ASSIGNEE, instance, tasks), true)
  })

  it('leaves out everybody else', () => {
    assert.equal(isInvolved(STRANGER, instance, tasks), false)
  })

  it('still counts the starter when nothing has been assigned yet', () => {
    assert.equal(isInvolved(INITIATOR, instance, []), true)
    assert.equal(isInvolved(STRANGER, instance, []), false)
  })
})
