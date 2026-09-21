import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { evaluateCondition, resolveActivation, stageApplies } from './conditions'
import { formatId } from '@/lib/ids/format'
import type { RoleId, WorkflowTemplateId } from '@/lib/types/ids'
import type { StageCondition, StageDefinition, WorkflowTemplate } from '@/lib/types/workflow'

const ROLE = formatId('role', 1) as RoleId

function stage(overrides: Partial<StageDefinition> & { key: string }): StageDefinition {
  return {
    name: overrides.key,
    assignees: [{ mode: 'role', roleId: ROLE }],
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

function template(stages: StageDefinition[]): WorkflowTemplate {
  return {
    workflowId: formatId('workflowTemplate', 1) as WorkflowTemplateId,
    version: 1,
    name: 'Conditional workflow',
    stages,
    initialStageKey: stages[0].key,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function check(condition: StageCondition, values: Record<string, never> | object) {
  return evaluateCondition(condition, values as Record<string, never>)
}

describe('equality', () => {
  it('matches a plain value', () => {
    assert.equal(check({ fieldKey: 'a', operator: 'eq', value: 'Yes' }, { a: 'Yes' }), true)
    assert.equal(check({ fieldKey: 'a', operator: 'eq', value: 'Yes' }, { a: 'No' }), false)
  })

  it('ignores case and surrounding space, as a form would produce', () => {
    assert.equal(check({ fieldKey: 'a', operator: 'eq', value: 'Yes' }, { a: ' yes ' }), true)
  })

  it('treats yes, true and 1 as the same answer', () => {
    for (const value of [true, 'true', 'Yes', '1']) {
      assert.equal(
        check({ fieldKey: 'nda', operator: 'eq', value: true }, { nda: value }),
        true,
        `${String(value)} should read as true`,
      )
    }
    assert.equal(check({ fieldKey: 'nda', operator: 'eq', value: true }, { nda: 'no' }), false)
  })

  it('inverts for neq', () => {
    assert.equal(check({ fieldKey: 'a', operator: 'neq', value: 'Yes' }, { a: 'No' }), true)
    assert.equal(check({ fieldKey: 'a', operator: 'neq', value: 'Yes' }, { a: 'Yes' }), false)
  })
})

describe('ordering', () => {
  it('compares numbers, including numbers typed into a form', () => {
    const over: StageCondition = { fieldKey: 'value', operator: 'gt', value: 500000 }
    assert.equal(check(over, { value: 750000 }), true)
    assert.equal(check(over, { value: '750000' }), true)
    assert.equal(check(over, { value: 450000 }), false)
    assert.equal(check(over, { value: 500000 }), false)
  })

  it('handles the inclusive operators', () => {
    assert.equal(check({ fieldKey: 'v', operator: 'gte', value: 10 }, { v: 10 }), true)
    assert.equal(check({ fieldKey: 'v', operator: 'lte', value: 10 }, { v: 10 }), true)
    assert.equal(check({ fieldKey: 'v', operator: 'lt', value: 10 }, { v: 10 }), false)
  })

  it('compares dates', () => {
    assert.equal(
      check({ fieldKey: 'due', operator: 'gt', value: '2026-01-01' }, { due: '2026-06-01' }),
      true,
    )
  })

  it('refuses to order what it cannot compare', () => {
    // Better a stage that visibly does not run than one that runs on a guess.
    assert.equal(check({ fieldKey: 'v', operator: 'gt', value: 10 }, { v: 'abc' }), false)
    assert.equal(check({ fieldKey: 'v', operator: 'gt', value: 10 }, {}), false)
  })
})

describe('membership', () => {
  it('matches any of several options', () => {
    const condition: StageCondition = {
      fieldKey: 'type',
      operator: 'in',
      value: ['Sponsorship', 'Exhibitor'],
    }
    assert.equal(check(condition, { type: 'Exhibitor' }), true)
    assert.equal(check(condition, { type: 'Partnership' }), false)
  })

  it('inverts for not_in', () => {
    const condition: StageCondition = {
      fieldKey: 'type',
      operator: 'not_in',
      value: ['Services'],
    }
    assert.equal(check(condition, { type: 'Sponsorship' }), true)
    assert.equal(check(condition, { type: 'Services' }), false)
  })
})

describe('missing values', () => {
  it('does not match when nothing has been recorded', () => {
    assert.equal(check({ fieldKey: 'missing', operator: 'eq', value: 'Yes' }, {}), false)
  })

  it('matches an explicit null only against null', () => {
    assert.equal(check({ fieldKey: 'a', operator: 'eq', value: null as never }, { a: null }), true)
  })
})

describe('stageApplies', () => {
  it('runs a stage with no conditions', () => {
    assert.equal(stageApplies(stage({ key: 'plain' }), {}), true)
  })

  it('requires every condition to hold', () => {
    const conditional = stage({
      key: 'gated',
      conditions: [
        { fieldKey: 'nda', operator: 'eq', value: true },
        { fieldKey: 'value', operator: 'gt', value: 100000 },
      ],
    })
    assert.equal(stageApplies(conditional, { nda: 'Yes', value: 200000 }), true)
    assert.equal(stageApplies(conditional, { nda: 'Yes', value: 50000 }), false)
    assert.equal(stageApplies(conditional, { nda: 'No', value: 200000 }), false)
  })
})

describe('resolveActivation', () => {
  const flow = template([
    stage({ key: 'request', nextStageKey: 'nda' }),
    stage({
      key: 'nda',
      nextStageKey: 'review',
      conditions: [{ fieldKey: 'nda_required', operator: 'eq', value: true }],
    }),
    stage({ key: 'review', nextStageKey: 'dispatch' }),
    stage({ key: 'dispatch', nextStageKey: null }),
  ])

  it('activates a stage whose conditions hold', () => {
    const resolved = resolveActivation(flow, 'nda', { nda_required: 'Yes' })
    assert.equal(resolved.stage?.key, 'nda')
    assert.deepEqual(resolved.skipped, [])
  })

  it('skips past a stage whose conditions do not hold', () => {
    const resolved = resolveActivation(flow, 'nda', { nda_required: 'No' })
    assert.equal(resolved.stage?.key, 'review')
    assert.deepEqual(
      resolved.skipped.map((skipped) => skipped.key),
      ['nda'],
    )
  })

  it('skips several stages in a row', () => {
    const chain = template([
      stage({ key: 'start', nextStageKey: 'a' }),
      stage({ key: 'a', nextStageKey: 'b', conditions: [{ fieldKey: 'x', operator: 'eq', value: 1 }] }),
      stage({ key: 'b', nextStageKey: 'c', conditions: [{ fieldKey: 'x', operator: 'eq', value: 2 }] }),
      stage({ key: 'c', nextStageKey: null }),
    ])
    const resolved = resolveActivation(chain, 'a', { x: 3 })
    assert.equal(resolved.stage?.key, 'c')
    assert.deepEqual(
      resolved.skipped.map((skipped) => skipped.key),
      ['a', 'b'],
    )
  })

  it('reports nothing left to run when every remaining stage skips', () => {
    const resolved = resolveActivation(
      template([
        stage({ key: 'start', nextStageKey: 'only' }),
        stage({
          key: 'only',
          nextStageKey: null,
          conditions: [{ fieldKey: 'x', operator: 'eq', value: 1 }],
        }),
      ]),
      'only',
      { x: 2 },
    )
    assert.equal(resolved.stage, null)
    assert.deepEqual(
      resolved.skipped.map((skipped) => skipped.key),
      ['only'],
    )
  })

  it('stops rather than looping on a template that points back at itself', () => {
    const looped = template([
      stage({
        key: 'a',
        nextStageKey: 'b',
        conditions: [{ fieldKey: 'x', operator: 'eq', value: 1 }],
      }),
      stage({
        key: 'b',
        nextStageKey: 'a',
        conditions: [{ fieldKey: 'x', operator: 'eq', value: 1 }],
      }),
    ])
    const resolved = resolveActivation(looped, 'a', { x: 2 })
    assert.equal(resolved.stage, null)
    assert.equal(resolved.skipped.length, 2)
  })

  it('returns nothing for a stage key that does not exist', () => {
    assert.equal(resolveActivation(flow, 'ghost', {}).stage, null)
    assert.equal(resolveActivation(flow, null, {}).stage, null)
  })
})
