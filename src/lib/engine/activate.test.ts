import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { carriedFieldValues } from './activate'
import { formatId } from '@/lib/ids/format'
import type { Task } from '@/lib/types/task'
import type { StageDefinition } from '@/lib/types/workflow'

const NOW = new Date('2026-10-02T09:00:00Z')

function stage(overrides: Partial<StageDefinition> = {}): StageDefinition {
  return {
    key: 'write',
    name: 'Write the draft',
    assignees: [{ mode: 'initiator' }],
    completionRule: 'any',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', required: true },
      { key: 'draft', label: 'Draft', type: 'textarea', required: true },
    ],
    files: [],
    checklist: [],
    priority: 'medium',
    requiresApproval: false,
    nextStageKey: null,
    ...overrides,
  }
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    taskId: formatId('task', 1),
    instanceId: formatId('workflowInstance', 1),
    workflowId: formatId('workflowTemplate', 1),
    stageKey: 'write',
    stageName: 'Write the draft',
    assignees: [formatId('user', 1)],
    completionRule: 'any',
    completedBy: [],
    status: 'completed',
    priority: 'medium',
    revisionRound: 1,
    fieldValues: {},
    checklist: [],
    files: [],
    activatedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('what a stage entered again opens with', () => {
  it('opens blank the first time', () => {
    assert.deepEqual(carriedFieldValues(stage(), []), {})
  })

  it('starts a revision from what was handed over last time', () => {
    const handedOver = task({ fieldValues: { headline: 'Launch day', draft: 'Long copy…' } })
    assert.deepEqual(carriedFieldValues(stage(), [handedOver]), {
      headline: 'Launch day',
      draft: 'Long copy…',
    })
  })

  it('takes the most recent round, whatever order the tasks arrive in', () => {
    const tasks = [
      task({ revisionRound: 2, fieldValues: { headline: 'Second try' } }),
      task({ revisionRound: 1, fieldValues: { headline: 'First try' } }),
    ]
    assert.deepEqual(carriedFieldValues(stage(), tasks), { headline: 'Second try' })
  })

  it('ignores other stages', () => {
    const review = task({ stageKey: 'review', fieldValues: { headline: 'Not mine' } })
    assert.deepEqual(carriedFieldValues(stage(), [review]), {})
  })

  it('copies only what the stage asks for', () => {
    const handedOver = task({ fieldValues: { headline: 'Kept', retired_field: 'Dropped' } })
    assert.deepEqual(carriedFieldValues(stage(), [handedOver]), { headline: 'Kept' })
  })

  it('leaves an approval blank, so last round’s note is not recorded against new work', () => {
    const review = stage({
      key: 'review',
      requiresApproval: true,
      fields: [{ key: 'review_note', label: 'Note', type: 'textarea', required: false }],
    })
    const lastRound = task({ stageKey: 'review', fieldValues: { review_note: 'Fix the headline' } })
    assert.deepEqual(carriedFieldValues(review, [lastRound]), {})
  })
})
