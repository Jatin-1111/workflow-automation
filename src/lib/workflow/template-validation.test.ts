import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isPublishable, validateTemplate, type TemplateDraft } from './template-validation'
import { formatId } from '@/lib/ids/format'
import type { RoleId } from '@/lib/types/ids'
import type { StageDefinition } from '@/lib/types/workflow'

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

function draft(stages: StageDefinition[], name = 'Test workflow'): TemplateDraft {
  return { name, stages, initialStageKey: stages[0]?.key ?? '' }
}

function messages(d: TemplateDraft): string[] {
  return validateTemplate(d).map((problem) => problem.message)
}

describe('a sound template', () => {
  it('passes with a single stage', () => {
    assert.equal(isPublishable(draft([stage({ key: 'only' })])), true)
  })

  it('passes with an approval that routes rejections backwards', () => {
    const d = draft([
      stage({ key: 'draft_work', nextStageKey: 'review' }),
      stage({
        key: 'review',
        requiresApproval: true,
        rejectTargetStageKey: 'draft_work',
        nextStageKey: null,
      }),
    ])
    assert.deepEqual(validateTemplate(d), [])
  })
})

describe('structural problems', () => {
  it('reports an empty workflow', () => {
    assert.deepEqual(messages(draft([])), ['A workflow needs at least one stage.'])
  })

  it('reports a missing name', () => {
    assert.ok(messages(draft([stage({ key: 'only' })], '  ')).includes('Give the workflow a name.'))
  })

  it('reports duplicate stage keys', () => {
    const d = draft([stage({ key: 'same' }), stage({ key: 'same' })])
    assert.ok(messages(d).some((m) => m.includes('Two stages share the key')))
  })

  it('rejects a stage key that is not a machine key', () => {
    const d = draft([stage({ key: 'Not A Key' })])
    assert.ok(messages(d).some((m) => m.includes('must be lower case letters')))
  })

  it('reports a first stage that is not in the workflow', () => {
    const d = { ...draft([stage({ key: 'only' })]), initialStageKey: 'ghost' }
    assert.ok(messages(d).some((m) => m.includes('first stage is not one of the stages')))
  })
})

describe('routing problems', () => {
  it('reports a next stage that does not exist', () => {
    const d = draft([stage({ key: 'first', nextStageKey: 'nowhere' })])
    assert.ok(messages(d).some((m) => m.includes('continues to "nowhere"')))
  })

  it('reports a stage that continues to itself', () => {
    const d = draft([stage({ key: 'loop', nextStageKey: 'loop' })])
    assert.ok(messages(d).some((m) => m.includes('continues to itself')))
  })

  it('reports an approval with no rejection target', () => {
    const d = draft([stage({ key: 'sign_off', requiresApproval: true })])
    assert.ok(messages(d).some((m) => m.includes('does not say where rejected work goes')))
  })

  it('reports a rejection target that does not exist', () => {
    const d = draft([
      stage({ key: 'sign_off', requiresApproval: true, rejectTargetStageKey: 'ghost' }),
    ])
    assert.ok(messages(d).some((m) => m.includes('sends rejected work to "ghost"')))
  })

  it('reports a stage nothing leads to', () => {
    const d = draft([stage({ key: 'first' }), stage({ key: 'orphan' })])
    assert.ok(messages(d).some((m) => m.includes('Nothing leads to "orphan"')))
  })

  it('counts a stage reachable only by rejection as reachable', () => {
    // Rework stages are never a `nextStageKey`; they are only ever arrived at
    // by sending work back, and must not be reported as orphans.
    const d = draft([
      stage({ key: 'build', nextStageKey: 'review' }),
      stage({
        key: 'review',
        requiresApproval: true,
        rejectTargetStageKey: 'rework',
        nextStageKey: null,
      }),
      stage({ key: 'rework', nextStageKey: 'review' }),
    ])
    assert.deepEqual(validateTemplate(d), [])
  })
})

describe('assignee problems', () => {
  it('reports a stage with no assignee source', () => {
    const d = draft([stage({ key: 'only', assignees: [] })])
    assert.ok(messages(d).some((m) => m.includes('has nobody to assign it to')))
  })

  it('reports a role source with no role chosen', () => {
    const d = draft([
      stage({ key: 'only', assignees: [{ mode: 'role', roleId: '' as RoleId }] }),
    ])
    assert.ok(messages(d).some((m) => m.includes('a role that has not been chosen')))
  })

  it('reports an empty explicit user list', () => {
    const d = draft([stage({ key: 'only', assignees: [{ mode: 'users', userIds: [] }] })])
    assert.ok(messages(d).some((m) => m.includes('none are selected')))
  })

  it('reports inheriting an assignee from a stage that does not exist', () => {
    const d = draft([
      stage({ key: 'only', assignees: [{ mode: 'stage_assignee', stageKey: 'ghost' }] }),
    ])
    assert.ok(messages(d).some((m) => m.includes('takes its assignee from "ghost"')))
  })

  it('accepts the initiator with no further configuration', () => {
    const d = draft([stage({ key: 'only', assignees: [{ mode: 'initiator' }] })])
    assert.deepEqual(validateTemplate(d), [])
  })
})

describe('stage contents', () => {
  it('reports duplicate field, file and checklist keys', () => {
    const d = draft([
      stage({
        key: 'only',
        fields: [
          { key: 'same', label: 'One', type: 'text', required: false },
          { key: 'same', label: 'Two', type: 'text', required: false },
        ],
        files: [
          { key: 'doc', label: 'A', required: false },
          { key: 'doc', label: 'B', required: false },
        ],
        checklist: [
          { key: 'check', label: 'A', required: false },
          { key: 'check', label: 'B', required: false },
        ],
      }),
    ])
    const found = messages(d)
    assert.ok(found.some((m) => m.includes('two fields keyed "same"')))
    assert.ok(found.some((m) => m.includes('two files keyed "doc"')))
    assert.ok(found.some((m) => m.includes('two checklist keyed "check"')))
  })

  it('reports an item with no key at all', () => {
    const d = draft([
      stage({ key: 'only', fields: [{ key: '', label: 'Nameless', type: 'text', required: false }] }),
    ])
    assert.ok(messages(d).some((m) => m.includes('has no key')))
  })
})

describe('reporting', () => {
  it('returns every problem rather than the first', () => {
    const d = draft(
      [stage({ key: 'Bad Key', name: '', assignees: [], nextStageKey: 'ghost' })],
      '',
    )
    assert.ok(validateTemplate(d).length >= 4)
  })
})
