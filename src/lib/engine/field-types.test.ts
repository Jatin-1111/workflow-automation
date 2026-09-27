/**
 * The engine reading a stage's answers as the type the stage declared.
 *
 * field-value.test.ts proves the coercion itself. This proves the engine
 * actually applies it — that a bad answer is refused by the state machine
 * rather than only by the browser, and that a good one is stored as a
 * number or a Date rather than as the string that arrived.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { completeStage, saveProgress, startInstance } from './operations'
import { applyResult, applyStart, MemoryIds, openTaskAt } from './memory-runtime'
import { formatId } from '@/lib/ids/format'
import type { EngineContext, EngineOutcome } from './index'
import type { RoleId, UserId } from '@/lib/types/ids'
import type { FieldDefinition, StageDefinition, WorkflowTemplate } from '@/lib/types/workflow'

const ALICE = formatId('user', 1) as UserId
const OWNER_ROLE = formatId('role', 1) as RoleId
const NOW = new Date('2026-02-01T10:00:00Z')
const CONTEXT: EngineContext = { now: NOW, usersByRole: { [OWNER_ROLE]: [ALICE] } }

function templateWith(fields: FieldDefinition[]): WorkflowTemplate {
  const only: StageDefinition = {
    key: 'only',
    name: 'Only stage',
    assignees: [{ mode: 'role', roleId: OWNER_ROLE }],
    completionRule: 'any',
    fields,
    files: [],
    checklist: [],
    priority: 'medium',
    requiresApproval: false,
    nextStageKey: null,
  }
  return {
    workflowId: formatId('workflowTemplate', 1) as never,
    version: 1,
    name: 'Test workflow',
    stages: [only],
    initialStageKey: 'only',
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function expectOk<T>(outcome: EngineOutcome<T>): T {
  assert.ok(outcome.ok, `expected acceptance, got ${JSON.stringify(!outcome.ok ? outcome.errors : '')}`)
  return outcome.result
}

function errorsOf(outcome: EngineOutcome<unknown>) {
  assert.ok(!outcome.ok, 'expected the engine to refuse this')
  return outcome.errors
}

function open(template: WorkflowTemplate) {
  const ids = new MemoryIds()
  const start = expectOk(
    startInstance({ template, initiatedBy: ALICE, title: 'Test instance' }, CONTEXT),
  )
  return { ids, state: applyStart(start, ids, NOW) }
}

function submit(
  template: WorkflowTemplate,
  fieldValues: Record<string, unknown>,
  operation = completeStage,
) {
  const { state } = open(template)
  const task = openTaskAt(state, 'only')!
  return operation({
    template,
    instance: state.instance,
    tasks: state.tasks,
    taskId: task.taskId,
    actor: ALICE,
    context: CONTEXT,
    submission: { fieldValues: fieldValues as never, checkedItemKeys: [] },
  })
}

const dealValue: FieldDefinition = {
  key: 'deal_value',
  label: 'Deal value',
  type: 'currency',
  required: false,
}
const closesOn: FieldDefinition = {
  key: 'closes_on',
  label: 'Closes on',
  type: 'date',
  required: false,
}
const ndaRequired: FieldDefinition = {
  key: 'nda_required',
  label: 'NDA required',
  type: 'select',
  required: false,
  options: ['Yes', 'No'],
}

describe('the engine refuses an answer that is not its declared type', () => {
  it('refuses text in a currency field', () => {
    const errors = errorsOf(submit(templateWith([dealValue]), { deal_value: 'lots' }))
    assert.deepEqual(
      errors.map((error) => error.code),
      ['invalid_field_value'],
    )
    assert.equal(errors[0].key, 'deal_value')
    assert.match(errors[0].message, /Deal value must be a number/)
  })

  it('refuses a select value that is not one of its options', () => {
    // The case that changes behaviour rather than just data: conditions
    // branch on these, so an answer outside the vocabulary routes work
    // down a path nobody designed.
    const errors = errorsOf(submit(templateWith([ndaRequired]), { nda_required: 'Maybe' }))
    assert.equal(errors[0].code, 'invalid_field_value')
    assert.match(errors[0].message, /must be one of: Yes, No/)
  })

  it('refuses a date that is not a date', () => {
    const errors = errorsOf(submit(templateWith([closesOn]), { closes_on: 'tomorrow' }))
    assert.equal(errors[0].code, 'invalid_field_value')
  })

  it('reports every bad answer at once, not just the first', () => {
    // A form should be able to mark all of its offending inputs in one pass.
    const errors = errorsOf(
      submit(templateWith([dealValue, closesOn, ndaRequired]), {
        deal_value: 'lots',
        closes_on: 'tomorrow',
        nda_required: 'Maybe',
      }),
    )
    assert.deepEqual(
      errors.map((error) => error.key),
      ['deal_value', 'closes_on', 'nda_required'],
    )
  })

  it('refuses on save as well as on completion', () => {
    // Otherwise a bad value sits on the task until somebody tries to
    // finish, and reports and conditions can see it in the meantime.
    const errors = errorsOf(
      submit(templateWith([dealValue]), { deal_value: 'lots' }, saveProgress),
    )
    assert.equal(errors[0].code, 'invalid_field_value')
  })

  it('refuses a seeded value when a run is started', () => {
    const outcome = startInstance(
      {
        template: templateWith([dealValue]),
        initiatedBy: ALICE,
        title: 'Test instance',
        fieldValues: { deal_value: 'lots' } as never,
      },
      CONTEXT,
    )
    assert.equal(errorsOf(outcome)[0].code, 'invalid_field_value')
  })
})

describe('the engine stores the value, not the string that arrived', () => {
  it('stores a currency answer as a number', () => {
    const template = templateWith([dealValue])
    const { ids, state } = open(template)
    const task = openTaskAt(state, 'only')!

    const result = expectOk(
      completeStage({
        template,
        instance: state.instance,
        tasks: state.tasks,
        taskId: task.taskId,
        actor: ALICE,
        context: CONTEXT,
        submission: { fieldValues: { deal_value: '1250.75' }, checkedItemKeys: [] },
      }),
    )
    const after = applyResult(state, result, ids, NOW)
    assert.strictEqual(after.tasks[0].fieldValues.deal_value, 1250.75)
  })

  it('stores a date answer as a Date', () => {
    const template = templateWith([closesOn])
    const { ids, state } = open(template)
    const task = openTaskAt(state, 'only')!

    const result = expectOk(
      completeStage({
        template,
        instance: state.instance,
        tasks: state.tasks,
        taskId: task.taskId,
        actor: ALICE,
        context: CONTEXT,
        submission: { fieldValues: { closes_on: '2026-03-01' }, checkedItemKeys: [] },
      }),
    )
    const after = applyResult(state, result, ids, NOW)
    const stored = after.tasks[0].fieldValues.closes_on
    assert.ok(stored instanceof Date)
    assert.equal(stored.toISOString(), '2026-03-01T00:00:00.000Z')
  })
})

describe('a required field reports one problem, not two', () => {
  const required: FieldDefinition = { ...dealValue, required: true }

  it('asks for a missing answer without also calling it a type error', () => {
    const errors = errorsOf(submit(templateWith([required]), { deal_value: '' }))
    assert.deepEqual(
      errors.map((error) => error.code),
      ['missing_required_field'],
    )
  })

  it('does not also call a badly typed answer missing', () => {
    // A refused answer is never stored, so the completion check finds the
    // field empty and calls it missing too. Both are true; only the type
    // error tells anybody what to do about it.
    const errors = errorsOf(submit(templateWith([required]), { deal_value: 'lots' }))
    assert.deepEqual(
      errors.map((error) => error.code),
      ['invalid_field_value'],
    )
  })

  it('still reports a different field that really is missing', () => {
    // Suppression is per field, not blanket: one bad answer must not hide
    // an empty one somewhere else on the same form.
    const alsoRequired: FieldDefinition = { ...ndaRequired, required: true }
    const errors = errorsOf(
      submit(templateWith([required, alsoRequired]), { deal_value: 'lots' }),
    )
    assert.deepEqual(
      errors.map((error) => [error.code, error.key]),
      [
        ['invalid_field_value', 'deal_value'],
        ['missing_required_field', 'nda_required'],
      ],
    )
  })
})

describe('what is already recorded is left alone', () => {
  it('keeps a value stored before types were enforced', () => {
    // Read-side tolerance: instances predating this hold strings, and the
    // engine reads what is arriving rather than re-examining history.
    // Rewriting them would be the first time this codebase edits a record.
    const template = templateWith([dealValue, closesOn])
    const { ids, state } = open(template)
    const task = openTaskAt(state, 'only')!

    // Stand in for a legacy row: a currency value recorded as a string.
    const legacy = {
      ...state,
      tasks: state.tasks.map((candidate) => ({
        ...candidate,
        fieldValues: { deal_value: '900' as never },
      })),
    }

    const result = expectOk(
      completeStage({
        template,
        instance: legacy.instance,
        tasks: legacy.tasks,
        taskId: task.taskId,
        actor: ALICE,
        context: CONTEXT,
        submission: { fieldValues: { closes_on: '2026-03-01' }, checkedItemKeys: [] },
      }),
    )
    const after = applyResult(legacy, result, ids, NOW)

    // The untouched legacy value survives as it was, and the new one is typed.
    assert.strictEqual(after.tasks[0].fieldValues.deal_value, '900')
    assert.ok(after.tasks[0].fieldValues.closes_on instanceof Date)
  })
})
