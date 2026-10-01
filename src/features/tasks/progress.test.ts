import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildProgress } from './progress'
import { formatId } from '@/lib/ids/format'
import type { Task } from '@/lib/types/task'
import type { StageDefinition } from '@/lib/types/workflow'

const NOW = new Date('2026-10-02T09:00:00Z')

function stage(key: string): StageDefinition {
  return {
    key,
    name: key,
    assignees: [{ mode: 'initiator' }],
    completionRule: 'any',
    fields: [],
    files: [],
    checklist: [],
    priority: 'medium',
    requiresApproval: false,
    nextStageKey: null,
  }
}

const STAGES = [stage('write'), stage('review'), stage('publish')]

let sequence = 0
function task(stageKey: string, overrides: Partial<Task> = {}): Task {
  sequence += 1
  return {
    taskId: formatId('task', sequence),
    instanceId: formatId('workflowInstance', 1),
    workflowId: formatId('workflowTemplate', 1),
    stageKey,
    stageName: stageKey,
    assignees: [formatId('user', 1)],
    completionRule: 'any',
    completedBy: [],
    status: 'not_started',
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

const states = (progress: ReturnType<typeof buildProgress>) =>
  progress.map((entry) => entry.state)

describe('the trail across a task page', () => {
  it('marks the open task on screen as where the run is', () => {
    const write = task('write')
    assert.deepEqual(states(buildProgress(STAGES, [write], write, {})), [
      'current',
      'upcoming',
      'upcoming',
    ])
  })

  it('counts the stage just finished, instead of staying one behind', () => {
    // Finishing stage 1 used to leave its own page saying "0 of 3 complete".
    const write = task('write', { status: 'completed', completedAt: NOW })
    const review = task('review')
    assert.deepEqual(states(buildProgress(STAGES, [write, review], write, {})), [
      'done',
      'current',
      'upcoming',
    ])
  })

  it('shows a finished run as finished from any of its pages', () => {
    const done = { status: 'completed' as const, completedAt: NOW }
    const tasks = [task('write', done), task('review', done), task('publish', done)]
    assert.deepEqual(states(buildProgress(STAGES, tasks, tasks[0], {})), [
      'done',
      'done',
      'done',
    ])
  })

  it('shows a sent-back stage as where the run is, from the round it replaced', () => {
    const done = { status: 'completed' as const, completedAt: NOW }
    const firstDraft = task('write', done)
    const tasks = [firstDraft, task('review', done), task('write', { revisionRound: 2 })]
    const progress = buildProgress(STAGES, tasks, firstDraft, {})
    assert.deepEqual(states(progress), ['current', 'done', 'upcoming'])
    assert.equal(progress[0].revisionRound, 2)
  })

  it('does not treat a cancelled run as still sitting on a stage', () => {
    const write = task('write', { status: 'cancelled' })
    assert.equal(states(buildProgress(STAGES, [write], write, {}))[0], 'upcoming')
  })
})
