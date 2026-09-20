import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deriveBucket, hasBreachedSla, hoursWaiting } from './buckets'
import { endOfBusinessDay } from './business-day'
import { formatId } from '@/lib/ids/format'
import type { Task } from '@/lib/types/task'
import type { TaskStatus } from '@/lib/types/status'

const NOW = new Date('2026-03-10T14:00:00Z')
// Pinned so the suite buckets identically on a UTC server and an IST laptop.
const ZONE = 'Asia/Kolkata'

function task(overrides: Partial<Task> = {}): Task {
  return {
    taskId: formatId('task', 1),
    instanceId: formatId('workflowInstance', 1),
    workflowId: formatId('workflowTemplate', 1),
    stageKey: 'stage',
    stageName: 'Stage',
    assignees: [formatId('user', 1)],
    completionRule: 'any',
    completedBy: [],
    status: 'not_started',
    priority: 'medium',
    revisionRound: 1,
    fieldValues: {},
    checklist: [],
    files: [],
    activatedAt: new Date('2026-03-10T08:00:00Z'),
    createdAt: new Date('2026-03-10T08:00:00Z'),
    updatedAt: new Date('2026-03-10T08:00:00Z'),
    ...overrides,
  }
}

describe('deriveBucket', () => {
  it('puts a past deadline in Overdue whatever the status says', () => {
    const statuses: TaskStatus[] = ['not_started', 'in_progress', 'pending_approval']
    for (const status of statuses) {
      assert.equal(
        deriveBucket(task({ status, dueAt: new Date('2026-03-09T09:00:00Z') }), NOW, ZONE),
        'overdue',
        `${status} past its deadline should be overdue`,
      )
    }
  })

  it('treats work due later today as needing action', () => {
    assert.equal(
      deriveBucket(task({ dueAt: new Date('2026-03-10T16:00:00Z') }), NOW, ZONE),
      'needs_action',
    )
  })

  it('treats work due tomorrow as upcoming', () => {
    assert.equal(
      deriveBucket(task({ dueAt: new Date('2026-03-11T09:00:00Z') }), NOW, ZONE),
      'upcoming',
    )
  })

  it('treats work with no deadline as needing action', () => {
    assert.equal(deriveBucket(task({ dueAt: undefined }), NOW, ZONE), 'needs_action')
  })

  it('separates work already started from work not yet touched', () => {
    assert.equal(
      deriveBucket(task({ status: 'in_progress', dueAt: new Date('2026-03-12T09:00:00Z') }), NOW, ZONE),
      'in_progress',
    )
    assert.equal(
      deriveBucket(task({ status: 'not_started', dueAt: new Date('2026-03-12T09:00:00Z') }), NOW, ZONE),
      'upcoming',
    )
  })

  it('keeps an approval waiting on someone else in Needs action for the approver', () => {
    assert.equal(deriveBucket(task({ status: 'pending_approval' }), NOW, ZONE), 'needs_action')
  })

  it('reports blocked and waiting work as Waiting', () => {
    assert.equal(deriveBucket(task({ status: 'waiting' }), NOW, ZONE), 'waiting')
    assert.equal(deriveBucket(task({ status: 'blocked' }), NOW, ZONE), 'waiting')
  })

  it('reports finished work as Completed even if its deadline passed', () => {
    assert.equal(
      deriveBucket(
        task({
          status: 'completed',
          completedAt: new Date('2026-03-09T10:00:00Z'),
          dueAt: new Date('2026-03-09T09:00:00Z'),
        }),
        NOW,
        ZONE,
      ),
      'completed',
    )
  })
})

describe('business day boundary', () => {
  it('resolves the day in Business Orbit time, not the host time zone', () => {
    // 18:29:59Z is 23:59:59 in Kolkata; one second later is the next day.
    const end = endOfBusinessDay(NOW, ZONE)
    assert.equal(end.toISOString(), '2026-03-10T18:29:59.999Z')
  })

  it('lets the zone, not the host, decide what counts as today', () => {
    // 20:00Z is still Tuesday in UTC but already Wednesday 01:30 in Kolkata,
    // so the same deadline lands in a different section depending on the zone.
    const due = new Date('2026-03-10T20:00:00Z')
    assert.equal(deriveBucket(task({ dueAt: due }), NOW, ZONE), 'upcoming')
    assert.equal(deriveBucket(task({ dueAt: due }), NOW, 'UTC'), 'needs_action')
  })
})

describe('sla and waiting time', () => {
  it('flags a breached sla only while the task is open', () => {
    const breached = { slaBreachAt: new Date('2026-03-10T02:00:00Z') }
    assert.equal(hasBreachedSla(task(breached), NOW), true)
    assert.equal(
      hasBreachedSla(task({ ...breached, completedAt: new Date('2026-03-10T01:00:00Z') }), NOW),
      false,
    )
  })

  it('does not flag a task with no sla configured', () => {
    assert.equal(hasBreachedSla(task(), NOW), false)
  })

  it('counts whole hours since the stage opened', () => {
    assert.equal(hoursWaiting(task(), NOW), 6)
  })
})
