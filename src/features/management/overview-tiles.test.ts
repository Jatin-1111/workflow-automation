import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  OVERVIEW_TILES,
  countTiles,
  instanceInTile,
  parseOverviewTile,
  taskInTile,
  tileHref,
  type TileClock,
} from './overview-tiles'
import { formatId } from '@/lib/ids/format'
import type { WorkflowInstance } from '@/lib/types/instance'
import type { Task } from '@/lib/types/task'
import type { WorkBucket } from '@/lib/types/status'

const NOW = new Date('2026-10-02T09:00:00Z')
const CLOCK: TileClock = { now: NOW, endToday: new Date('2026-10-02T12:30:00Z').getTime() }

function task(overrides: Partial<Task> = {}): Task {
  return {
    taskId: formatId('task', 1),
    instanceId: formatId('workflowInstance', 1),
    workflowId: formatId('workflowTemplate', 1),
    stageKey: 'review',
    stageName: 'Review',
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

function run(overrides: Partial<WorkflowInstance> = {}): WorkflowInstance {
  return {
    instanceId: formatId('workflowInstance', 1),
    workflowId: formatId('workflowTemplate', 1),
    templateVersion: 1,
    title: 'Run',
    currentStageKeys: [],
    status: 'active',
    priority: 'medium',
    initiatedBy: formatId('user', 1),
    fieldValues: {},
    startedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

const entry = (bucket: WorkBucket, overrides: Partial<Task> = {}) => ({
  task: task(overrides),
  bucket,
})

describe('what each Overview tile counts', () => {
  it('counts a late task as overdue and not also as due today', () => {
    const late = entry('overdue', { dueAt: new Date('2026-10-01T09:00:00Z') })
    assert.equal(taskInTile('overdue', late, CLOCK), true)
    assert.equal(taskInTile('due_today', late, CLOCK), false)
  })

  it('counts work due before the end of the business day as due today', () => {
    const soon = entry('needs_action', { dueAt: new Date('2026-10-02T11:00:00Z') })
    const tomorrow = entry('upcoming', { dueAt: new Date('2026-10-03T11:00:00Z') })
    assert.equal(taskInTile('due_today', soon, CLOCK), true)
    assert.equal(taskInTile('due_today', tomorrow, CLOCK), false)
  })

  it('does not count called-off work as due today', () => {
    // A cancelled task due yesterday was counted every day after, and listed
    // in red as overdue under "Due today".
    const cancelled = entry('completed', {
      status: 'cancelled',
      dueAt: new Date('2026-10-01T09:00:00Z'),
    })
    assert.equal(taskInTile('due_today', cancelled, CLOCK), false)
  })

  it('counts approvals and blocked work by status', () => {
    assert.equal(taskInTile('approvals', entry('needs_action', { status: 'pending_approval' }), CLOCK), true)
    assert.equal(taskInTile('blocked', entry('waiting', { status: 'blocked' }), CLOCK), true)
    assert.equal(taskInTile('blocked', entry('waiting', { status: 'waiting' }), CLOCK), false)
  })

  it('counts a run finished in the last seven days, and every finished run overall', () => {
    const recent = run({ status: 'completed', completedAt: new Date('2026-09-30T09:00:00Z') })
    const old = run({ status: 'completed', completedAt: new Date('2026-09-01T09:00:00Z') })
    assert.equal(instanceInTile('completed_week', recent, CLOCK), true)
    assert.equal(instanceInTile('completed_week', old, CLOCK), false)
    assert.equal(instanceInTile('completed', old, CLOCK), true)
  })

  it('counts a run awaiting a decision as active', () => {
    assert.equal(instanceInTile('active', run({ status: 'pending_approval' }), CLOCK), true)
    assert.equal(instanceInTile('active', run({ status: 'cancelled' }), CLOCK), false)
  })

  it('gives every tile a number from the same rule as its list', () => {
    const entries = [
      entry('overdue', { dueAt: new Date('2026-10-01T09:00:00Z') }),
      entry('needs_action', { status: 'pending_approval' }),
    ]
    const counts = countTiles(entries, [run(), run({ status: 'completed', completedAt: NOW })], CLOCK)
    assert.deepEqual(Object.keys(counts).sort(), [...OVERVIEW_TILES].sort())
    assert.equal(counts.overdue, 1)
    assert.equal(counts.approvals, 1)
    assert.equal(counts.due_today, 0)
    assert.equal(counts.active, 1)
    assert.equal(counts.completed_week, 1)
  })
})

describe('opening a tile', () => {
  it('reads the tile from the address, ignoring anything it does not name', () => {
    assert.equal(parseOverviewTile({ show: 'overdue' }), 'overdue')
    assert.equal(parseOverviewTile({ show: 'everything' }), undefined)
    assert.equal(parseOverviewTile({}), undefined)
  })

  it('keeps the filters already narrowing the view', () => {
    assert.equal(
      tileHref({ project: 'BO-PRJ-00001', due: 'week' }, 'overdue', undefined),
      '/dashboard?project=BO-PRJ-00001&due=week&show=overdue#tile-list',
    )
  })

  it('closes the open tile when it is clicked again', () => {
    assert.equal(tileHref({}, 'overdue', 'overdue'), '/dashboard')
    assert.equal(tileHref({}, 'blocked', 'overdue'), '/dashboard?show=blocked#tile-list')
  })
})
