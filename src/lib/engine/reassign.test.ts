/**
 * Moving an open task to somebody else (spec §46).
 *
 * Reassignment is a per-task override. The stage keeps the assignee sources it
 * was configured with, so nothing about the workflow itself changes.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { completeStage, reassignTask, startInstance } from './operations'
import {
  applyResult,
  applyStart,
  MemoryIds,
  openTaskAt,
  type WorkflowState,
} from './memory-runtime'
import { formatId } from '@/lib/ids/format'
import type { EngineContext, EngineOutcome } from './index'
import type { RoleId, UserId, WorkflowTemplateId } from '@/lib/types/ids'
import type { StageDefinition, WorkflowTemplate } from '@/lib/types/workflow'

const ALICE = formatId('user', 1) as UserId
const BEN = formatId('user', 2) as UserId
const CHARU = formatId('user', 3) as UserId
const MANAGER = formatId('user', 4) as UserId
const OWNER_ROLE = formatId('role', 1) as RoleId

const NOW = new Date('2026-07-01T09:00:00Z')
const context: EngineContext = { now: NOW, usersByRole: { [OWNER_ROLE]: [ALICE] } }

function stage(overrides: Partial<StageDefinition> & { key: string }): StageDefinition {
  return {
    name: overrides.key,
    assignees: [{ mode: 'role', roleId: OWNER_ROLE }],
    completionRule: 'any',
    fields: [],
    files: [],
    checklist: [],
    priority: 'medium',
    requiresApproval: false,
    nextStageKey: null,
    ...overrides,
  }
}

function templateOf(stages: StageDefinition[]): WorkflowTemplate {
  return {
    workflowId: formatId('workflowTemplate', 1) as WorkflowTemplateId,
    version: 1,
    name: 'Reassignment workflow',
    stages,
    initialStageKey: stages[0].key,
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function expectOk<T>(outcome: EngineOutcome<T>): T {
  assert.ok(outcome.ok, 'expected the engine to accept this')
  return outcome.result
}

function codesOf(outcome: EngineOutcome<unknown>): string[] {
  return outcome.ok ? [] : outcome.errors.map((error) => error.code)
}

function open(template: WorkflowTemplate, usersByRole = context.usersByRole) {
  const ids = new MemoryIds()
  const state = applyStart(
    expectOk(
      startInstance(
        { template, initiatedBy: ALICE, title: 'Reassignment run' },
        { now: NOW, usersByRole },
      ),
    ),
    ids,
    NOW,
  )
  return { ids, state }
}

describe('reassigning a task', () => {
  const template = templateOf([stage({ key: 'only' })])

  it('moves the work and tells the new owner', () => {
    const { ids, state } = open(template)
    const task = openTaskAt(state, 'only')!
    assert.deepEqual(task.assignees, [ALICE])

    const next = applyResult(
      state,
      expectOk(
        reassignTask({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId: task.taskId,
          actor: MANAGER,
          assignees: [BEN],
          reason: 'Alice is on leave.',
          context,
        }),
      ),
      ids,
      NOW,
    )

    assert.deepEqual(openTaskAt(next, 'only')!.assignees, [BEN])

    const notification = next.notifications.at(-1)
    assert.equal(notification?.recipientId, BEN)
    assert.equal(notification?.kind, 'task_reassigned')
    // The person taking it on needs a way to open it.
    assert.equal(notification?.taskId, task.taskId)
  })

  it('records who moved it and why', () => {
    const { ids, state } = open(template)
    const next = applyResult(
      state,
      expectOk(
        reassignTask({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'only')!.taskId,
          actor: MANAGER,
          assignees: [BEN],
          reason: 'Alice is on leave.',
          context,
        }),
      ),
      ids,
      NOW,
    )

    const event = next.events.find((candidate) => candidate.action === 'task_reassigned')
    assert.ok(event)
    assert.equal(event.actorId, MANAGER)
    assert.equal(event.comment, 'Alice is on leave.')
  })

  it('lets the new owner complete the stage', () => {
    const { ids, state } = open(template)
    const taskId = openTaskAt(state, 'only')!.taskId

    const moved = applyResult(
      state,
      expectOk(
        reassignTask({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId,
          actor: MANAGER,
          assignees: [BEN],
          context,
        }),
      ),
      ids,
      NOW,
    )

    // The old owner can no longer act on it.
    assert.deepEqual(
      codesOf(
        completeStage({
          template,
          instance: moved.instance,
          tasks: moved.tasks,
          taskId,
          actor: ALICE,
          context,
        }),
      ),
      ['not_assigned'],
    )

    const done = applyResult(
      moved,
      expectOk(
        completeStage({
          template,
          instance: moved.instance,
          tasks: moved.tasks,
          taskId,
          actor: BEN,
          context,
        }),
      ),
      ids,
      NOW,
    )
    assert.equal(done.instance.status, 'completed')
  })

  it('does not change the stage itself, so other runs are unaffected', () => {
    const { ids, state } = open(template)
    applyResult(
      state,
      expectOk(
        reassignTask({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'only')!.taskId,
          actor: MANAGER,
          assignees: [BEN],
          context,
        }),
      ),
      ids,
      NOW,
    )

    // A fresh instance still resolves from the role as configured.
    const second = open(template)
    assert.deepEqual(openTaskAt(second.state, 'only')!.assignees, [ALICE])
    assert.deepEqual(template.stages[0].assignees, [{ mode: 'role', roleId: OWNER_ROLE }])
  })
})

describe('shared stages', () => {
  const shared = templateOf([
    stage({
      key: 'shared',
      completionRule: 'all',
      assignees: [{ mode: 'users', userIds: [ALICE, BEN] }],
    }),
  ])

  it('forgets the part done by somebody who is no longer on it', () => {
    const { ids, state } = open(shared, {})
    const taskId = openTaskAt(state, 'shared')!.taskId

    // Alice finishes her half; the stage waits for Ben.
    const partly = applyResult(
      state,
      expectOk(
        completeStage({
          template: shared,
          instance: state.instance,
          tasks: state.tasks,
          taskId,
          actor: ALICE,
          context,
        }),
      ),
      ids,
      NOW,
    )
    assert.deepEqual(openTaskAt(partly, 'shared')!.completedBy, [ALICE])

    // Alice is taken off it. Her completion must not still count, or the stage
    // would finish the moment Charu submits without Ben.
    const moved = applyResult(
      partly,
      expectOk(
        reassignTask({
          template: shared,
          instance: partly.instance,
          tasks: partly.tasks,
          taskId,
          actor: MANAGER,
          assignees: [BEN, CHARU],
          context,
        }),
      ),
      ids,
      NOW,
    )

    const task = openTaskAt(moved, 'shared')!
    assert.deepEqual(task.assignees, [BEN, CHARU])
    assert.deepEqual(task.completedBy, [])
  })
})

describe('refusals', () => {
  const template = templateOf([stage({ key: 'only' })])

  it('refuses an empty assignment', () => {
    const { state } = open(template)
    assert.deepEqual(
      codesOf(
        reassignTask({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'only')!.taskId,
          actor: MANAGER,
          assignees: [],
          context,
        }),
      ),
      ['no_new_assignees'],
    )
  })

  it('refuses a change that changes nothing', () => {
    const { state } = open(template)
    assert.deepEqual(
      codesOf(
        reassignTask({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'only')!.taskId,
          actor: MANAGER,
          assignees: [ALICE],
          context,
        }),
      ),
      ['unchanged_assignment'],
    )
  })

  it('refuses to reassign finished work', () => {
    const { ids, state } = open(template)
    const taskId = openTaskAt(state, 'only')!.taskId
    const done = applyResult(
      state,
      expectOk(
        completeStage({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId,
          actor: ALICE,
          context,
        }),
      ),
      ids,
      NOW,
    )

    assert.ok(
      codesOf(
        reassignTask({
          template,
          instance: done.instance,
          tasks: done.tasks,
          taskId,
          actor: MANAGER,
          assignees: [BEN],
          context,
        }),
      ).includes('task_already_completed'),
    )
  })

  it('refuses a task that does not exist', () => {
    const { state } = open(template)
    assert.deepEqual(
      codesOf(
        reassignTask({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId: formatId('task', 999),
          actor: MANAGER,
          assignees: [BEN],
          context,
        }),
      ),
      ['task_not_found'],
    )
  })
})
