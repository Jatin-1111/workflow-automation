import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeMetrics,
  formatHours,
  median,
  rangeWindow,
  type MetricsInput,
} from './metrics'
import { formatId } from '@/lib/ids/format'
import type { WorkflowInstance } from '@/lib/types/instance'
import type { Task } from '@/lib/types/task'
import type { TimelineEvent } from '@/lib/types/timeline'

const NOW = new Date('2026-08-20T12:00:00Z')
const HOUR = 3_600_000
const ago = (hours: number) => new Date(NOW.getTime() - hours * HOUR)

const WORKFLOW = formatId('workflowTemplate', 1)
const ALICE = formatId('user', 1)
const BEN = formatId('user', 2)

let sequence = 0

function instance(overrides: Partial<WorkflowInstance> = {}): WorkflowInstance {
  sequence += 1
  return {
    instanceId: formatId('workflowInstance', sequence),
    workflowId: WORKFLOW,
    templateVersion: 1,
    title: `Instance ${sequence}`,
    currentStageKeys: [],
    status: 'completed',
    priority: 'medium',
    initiatedBy: ALICE,
    fieldValues: {},
    startedAt: ago(48),
    completedAt: ago(24),
    createdAt: ago(48),
    updatedAt: ago(24),
    ...overrides,
  }
}

function task(overrides: Partial<Task> = {}): Task {
  sequence += 1
  return {
    taskId: formatId('task', sequence),
    instanceId: formatId('workflowInstance', 1),
    workflowId: WORKFLOW,
    stageKey: 'stage',
    stageName: 'Stage',
    assignees: [ALICE],
    completionRule: 'any',
    completedBy: [ALICE],
    status: 'completed',
    priority: 'medium',
    revisionRound: 1,
    fieldValues: {},
    checklist: [],
    files: [],
    activatedAt: ago(10),
    completedAt: ago(8),
    createdAt: ago(10),
    updatedAt: ago(8),
    ...overrides,
  }
}

function run(partial: Partial<MetricsInput>) {
  return computeMetrics({
    instances: [],
    tasks: [],
    events: [],
    from: new Date(0),
    to: NOW,
    ...partial,
  })
}

describe('median', () => {
  it('takes the middle of an odd list', () => {
    assert.equal(median([3, 1, 2]), 2)
  })

  it('averages the middle two of an even list', () => {
    assert.equal(median([1, 2, 3, 4]), 2.5)
  })

  it('is null when there is nothing to measure', () => {
    assert.equal(median([]), null)
  })

  it('does not disturb the array it was given', () => {
    const values = [3, 1, 2]
    median(values)
    assert.deepEqual(values, [3, 1, 2])
  })
})

describe('totals', () => {
  it('counts what started, finished and is still running', () => {
    const metrics = run({
      instances: [
        instance(),
        instance(),
        instance({ status: 'active', completedAt: undefined }),
      ],
    })
    assert.equal(metrics.totals.started, 3)
    assert.equal(metrics.totals.completed, 2)
    assert.equal(metrics.totals.inFlight, 1)
  })

  it('measures cycle time from start to finish', () => {
    const metrics = run({
      instances: [
        instance({ startedAt: ago(30), completedAt: ago(20) }),
        instance({ startedAt: ago(30), completedAt: ago(10) }),
      ],
    })
    assert.equal(metrics.totals.medianCycleHours, 15)
  })

  it('counts an instance as on time only when no stage of it ran late', () => {
    const late = instance()
    const punctual = instance()

    const metrics = run({
      instances: [late, punctual],
      tasks: [
        // One stage of the first instance missed its deadline.
        task({ instanceId: late.instanceId, dueAt: ago(20), completedAt: ago(12) }),
        task({ instanceId: late.instanceId, dueAt: ago(5), completedAt: ago(8) }),
        task({ instanceId: punctual.instanceId, dueAt: ago(5), completedAt: ago(8) }),
      ],
    })

    assert.equal(metrics.totals.onTime, 1)
    assert.equal(metrics.totals.onTimeRate, 50)
  })

  it('reports no rate rather than zero when nothing finished', () => {
    const metrics = run({ instances: [instance({ status: 'active', completedAt: undefined })] })
    assert.equal(metrics.totals.onTimeRate, null)
    assert.equal(metrics.totals.medianCycleHours, null)
  })

  it('counts how often work was sent back', () => {
    const events: TimelineEvent[] = [
      {
        eventId: formatId('timelineEvent', 1),
        instanceId: formatId('workflowInstance', 1),
        actorId: BEN,
        action: 'changes_requested',
        at: ago(6),
      },
      {
        eventId: formatId('timelineEvent', 2),
        instanceId: formatId('workflowInstance', 1),
        actorId: BEN,
        action: 'stage_completed',
        at: ago(5),
      },
    ]
    assert.equal(run({ events }).totals.rejections, 1)
  })
})

describe('the window', () => {
  it('ignores work finished outside it', () => {
    const metrics = run({
      instances: [
        instance({ startedAt: ago(200), completedAt: ago(190) }),
        instance({ startedAt: ago(20), completedAt: ago(10) }),
      ],
      from: ago(48),
      to: NOW,
    })
    assert.equal(metrics.totals.completed, 1)
    assert.equal(metrics.totals.started, 1)
  })

  it('still counts work in flight, which has no date to fall outside', () => {
    const metrics = run({
      instances: [instance({ status: 'active', startedAt: ago(500), completedAt: undefined })],
      from: ago(48),
      to: NOW,
    })
    assert.equal(metrics.totals.started, 0)
    assert.equal(metrics.totals.inFlight, 1)
  })

  it('translates a range choice into a window', () => {
    const week = rangeWindow('7', NOW)
    assert.equal(week.to, NOW)
    assert.equal(Math.round((NOW.getTime() - week.from.getTime()) / (24 * HOUR)), 7)
    assert.equal(rangeWindow('all', NOW).from.getTime(), 0)
  })
})

describe('stage metrics', () => {
  it('measures how long each stage held the work, slowest first', () => {
    const metrics = run({
      tasks: [
        task({ stageKey: 'quick', stageName: 'Quick', activatedAt: ago(10), completedAt: ago(9) }),
        task({ stageKey: 'slow', stageName: 'Slow', activatedAt: ago(30), completedAt: ago(10) }),
      ],
    })

    assert.deepEqual(
      metrics.stages.map((stage) => stage.stageKey),
      ['slow', 'quick'],
    )
    assert.equal(metrics.stages[0].medianHours, 20)
    assert.equal(metrics.stages[1].medianHours, 1)
  })

  it('counts revisions as rework', () => {
    const metrics = run({
      tasks: [
        task({ stageKey: 'design', stageName: 'Design', revisionRound: 1 }),
        task({ stageKey: 'design', stageName: 'Design', revisionRound: 2 }),
        task({ stageKey: 'design', stageName: 'Design', revisionRound: 3 }),
      ],
    })
    const design = metrics.stages.find((stage) => stage.stageKey === 'design')!
    assert.equal(design.runs, 3)
    assert.equal(design.rework, 2)
  })

  it('counts an sla breach only when the stage finished past its threshold', () => {
    const metrics = run({
      tasks: [
        task({ stageKey: 'a', slaBreachAt: ago(12), completedAt: ago(8) }),
        task({ stageKey: 'a', slaBreachAt: ago(4), completedAt: ago(8) }),
        task({ stageKey: 'a', slaBreachAt: undefined }),
      ],
    })
    assert.equal(metrics.stages[0].slaBreaches, 1)
  })

  it('keeps stages of different workflows apart', () => {
    const other = formatId('workflowTemplate', 2)
    const metrics = run({
      tasks: [
        task({ stageKey: 'review', stageName: 'Review' }),
        task({ stageKey: 'review', stageName: 'Review', workflowId: other }),
      ],
    })
    assert.equal(metrics.stages.length, 2)
  })
})

describe('people metrics', () => {
  it('counts what each person finished and how much of it was late', () => {
    const metrics = run({
      tasks: [
        task({ completedBy: [ALICE], dueAt: ago(5), completedAt: ago(8) }),
        task({ completedBy: [ALICE], dueAt: ago(10), completedAt: ago(8) }),
        task({ completedBy: [BEN] }),
      ],
    })

    const alice = metrics.people.find((person) => person.userId === ALICE)!
    assert.equal(alice.completed, 2)
    assert.equal(alice.late, 1)
    assert.equal(metrics.people[0].userId, ALICE, 'busiest first')
  })

  it('credits both people on a stage they shared', () => {
    const metrics = run({ tasks: [task({ completedBy: [ALICE, BEN] })] })
    assert.equal(metrics.people.length, 2)
    assert.equal(metrics.people.every((person) => person.completed === 1), true)
  })
})

describe('formatHours', () => {
  it('says minutes, hours or days as a person would', () => {
    assert.equal(formatHours(0.5), '30m')
    assert.equal(formatHours(3.25), '3.3h')
    assert.equal(formatHours(72), '3.0d')
    assert.equal(formatHours(null), '—')
  })
})
