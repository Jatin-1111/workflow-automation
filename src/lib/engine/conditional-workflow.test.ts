/**
 * Conditional routing driven through the whole engine (spec §36).
 *
 * The brief's two examples: an NDA stage that only runs when an NDA is
 * required, and a proposal that needs management sign-off only above a value
 * threshold. One template, two different routes, decided by what was recorded.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { completeStage, requestChanges, startInstance } from './operations'
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

const SALES = formatId('user', 1) as UserId
const LEGAL = formatId('user', 2) as UserId
const MANAGER = formatId('user', 3) as UserId

const SALES_ROLE = formatId('role', 1) as RoleId
const LEGAL_ROLE = formatId('role', 2) as RoleId
const MANAGER_ROLE = formatId('role', 3) as RoleId

const USERS_BY_ROLE: Record<string, UserId[]> = {
  [SALES_ROLE]: [SALES],
  [LEGAL_ROLE]: [LEGAL],
  [MANAGER_ROLE]: [MANAGER],
}

const NOW = new Date('2026-05-01T09:00:00Z')
const context: EngineContext = { now: NOW, usersByRole: USERS_BY_ROLE }

function stage(overrides: Partial<StageDefinition> & { key: string }): StageDefinition {
  return {
    name: overrides.key,
    assignees: [{ mode: 'role', roleId: SALES_ROLE }],
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

/** Request → (NDA if required) → (management approval if large) → dispatch. */
function template(): WorkflowTemplate {
  return {
    workflowId: formatId('workflowTemplate', 9) as WorkflowTemplateId,
    version: 1,
    name: 'Conditional proposal',
    initialStageKey: 'request',
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    stages: [
      stage({
        key: 'request',
        nextStageKey: 'nda',
        fields: [
          { key: 'nda_required', label: 'NDA required', type: 'select', required: true, options: ['Yes', 'No'] },
          { key: 'deal_value', label: 'Value', type: 'currency', required: true },
        ],
      }),
      stage({
        key: 'nda',
        assignees: [{ mode: 'role', roleId: LEGAL_ROLE }],
        nextStageKey: 'management_approval',
        conditions: [{ fieldKey: 'nda_required', operator: 'eq', value: 'Yes' }],
      }),
      stage({
        key: 'management_approval',
        assignees: [{ mode: 'role', roleId: MANAGER_ROLE }],
        requiresApproval: true,
        rejectTargetStageKey: 'request',
        nextStageKey: 'dispatch',
        // Spec §36: above ₹5,00,000 this needs management approval.
        conditions: [{ fieldKey: 'deal_value', operator: 'gt', value: 500000 }],
      }),
      stage({ key: 'dispatch', nextStageKey: null }),
    ],
  }
}

function expectOk<T>(outcome: EngineOutcome<T>): T {
  assert.ok(
    outcome.ok,
    `expected success, got ${outcome.ok ? '' : outcome.errors.map((e) => e.code).join(', ')}`,
  )
  return outcome.result
}

/** Start a run and complete the request stage with the given answers. */
function runRequest(values: Record<string, string | number>) {
  const workflow = template()
  const ids = new MemoryIds()

  let state: WorkflowState = applyStart(
    expectOk(
      startInstance(
        { template: workflow, initiatedBy: SALES, title: 'Conditional run' },
        context,
      ),
    ),
    ids,
    NOW,
  )

  state = applyResult(
    state,
    expectOk(
      completeStage({
        template: workflow,
        instance: state.instance,
        tasks: state.tasks,
        taskId: openTaskAt(state, 'request')!.taskId,
        actor: SALES,
        submission: { fieldValues: values },
        context,
      }),
    ),
    ids,
    NOW,
  )

  return { workflow, ids, state }
}

function skippedKeys(state: WorkflowState): string[] {
  return state.events
    .filter((event) => event.action === 'stage_skipped')
    .map((event) => event.stageKey!)
}

describe('conditional stages (spec §36)', () => {
  it('runs the NDA stage when an NDA is required', () => {
    const { state } = runRequest({ nda_required: 'Yes', deal_value: 100000 })

    const open = openTaskAt(state, 'nda')
    assert.ok(open, 'the NDA stage should be open')
    assert.deepEqual(open.assignees, [LEGAL])
    assert.deepEqual(skippedKeys(state), [])
  })

  it('skips the NDA stage when no NDA is needed', () => {
    const { state } = runRequest({ nda_required: 'No', deal_value: 100000 })

    assert.equal(openTaskAt(state, 'nda'), undefined, 'the NDA stage must not open')
    // Small deal, so management approval is skipped as well.
    assert.ok(openTaskAt(state, 'dispatch'), 'work should land on dispatch')
    assert.deepEqual(skippedKeys(state), ['nda', 'management_approval'])
  })

  it('requires management approval above the threshold', () => {
    const { state } = runRequest({ nda_required: 'No', deal_value: 750000 })

    const approval = openTaskAt(state, 'management_approval')
    assert.ok(approval, 'a large deal needs management approval')
    assert.deepEqual(approval.assignees, [MANAGER])
    assert.equal(approval.status, 'pending_approval')
    assert.deepEqual(skippedKeys(state), ['nda'])
  })

  it('records every stage it passed over, so the history is honest', () => {
    const { state } = runRequest({ nda_required: 'No', deal_value: 1000 })

    const skipped = state.events.filter((event) => event.action === 'stage_skipped')
    assert.equal(skipped.length, 2)
    for (const event of skipped) {
      assert.ok(event.actorId, 'a skip still records who caused it')
      assert.ok(event.at instanceof Date)
    }
  })

  it('never opens a task for a skipped stage', () => {
    const { state } = runRequest({ nda_required: 'No', deal_value: 1000 })

    const stageKeys = state.tasks.map((task) => task.stageKey)
    assert.equal(stageKeys.includes('nda'), false)
    assert.equal(stageKeys.includes('management_approval'), false)
    assert.deepEqual(stageKeys, ['request', 'dispatch'])
  })

  it('takes conditions into account when sending work back', () => {
    // Rejecting from management approval returns to the request stage, which
    // has no conditions, so the route back is unaffected.
    const { workflow, ids, state } = runRequest({
      nda_required: 'No',
      deal_value: 750000,
    })

    const rejected = applyResult(
      state,
      expectOk(
        requestChanges({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'management_approval')!.taskId,
          actor: MANAGER,
          submission: { comment: 'The value looks wrong.' },
          context,
        }),
      ),
      ids,
      NOW,
    )

    const back = openTaskAt(rejected, 'request')
    assert.ok(back)
    assert.equal(back.revisionRound, 2)
  })

  it('completes the workflow when everything after a stage is skipped', () => {
    const shortened: WorkflowTemplate = {
      ...template(),
      stages: template().stages.map((candidate) =>
        candidate.key === 'dispatch'
          ? {
              ...candidate,
              conditions: [{ fieldKey: 'deal_value', operator: 'gt', value: 999999 }],
            }
          : candidate,
      ),
    }

    const ids = new MemoryIds()
    let state = applyStart(
      expectOk(
        startInstance(
          { template: shortened, initiatedBy: SALES, title: 'Everything skips' },
          context,
        ),
      ),
      ids,
      NOW,
    )

    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: shortened,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'request')!.taskId,
          actor: SALES,
          submission: { fieldValues: { nda_required: 'No', deal_value: 1000 } },
          context,
        }),
      ),
      ids,
      NOW,
    )

    assert.equal(state.instance.status, 'completed')
    assert.deepEqual(state.instance.currentStageKeys, [])
    assert.deepEqual(skippedKeys(state), ['nda', 'management_approval', 'dispatch'])
  })
})
