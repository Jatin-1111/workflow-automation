import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { entryTaskFor } from './run-entry'
import { formatId } from '@/lib/ids/format'
import type { Task } from '@/lib/types/task'

let sequence = 0
function task(overrides: Partial<Task> = {}): Task {
  sequence += 1
  const at = new Date(Date.UTC(2026, 9, sequence))
  return {
    taskId: formatId('task', sequence),
    instanceId: formatId('workflowInstance', 1),
    workflowId: formatId('workflowTemplate', 1),
    stageKey: `stage_${sequence}`,
    stageName: `Stage ${sequence}`,
    assignees: [formatId('user', 1)],
    completionRule: 'any',
    completedBy: [],
    status: 'completed',
    priority: 'medium',
    revisionRound: 1,
    fieldValues: {},
    checklist: [],
    files: [],
    activatedAt: at,
    completedAt: at,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  }
}

describe('the task that opens a run', () => {
  it('is the one being worked on, wherever it falls in the list', () => {
    const open = task({ status: 'in_progress', completedAt: undefined })
    assert.equal(entryTaskFor([task(), open, task()])?.taskId, open.taskId)
  })

  it('is the last one when the run is finished', () => {
    const first = task()
    const last = task()
    assert.equal(entryTaskFor([last, first])?.taskId, last.taskId)
  })

  it('passes over work that was called off', () => {
    const earlier = task()
    const cancelled = task({ status: 'cancelled', completedAt: undefined })
    // Nothing is open, so the most recent one carries the history.
    assert.equal(entryTaskFor([earlier, cancelled])?.taskId, cancelled.taskId)
  })

  it('is nothing for a run with no tasks', () => {
    assert.equal(entryTaskFor([]), undefined)
  })
})
