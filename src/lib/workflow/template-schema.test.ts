import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseSubmittedTemplate } from './template-schema'
import { HOURS_LIMITS, TEXT_LIMITS } from '@/lib/validation/bounds'

/** A stage the schema is happy with, as the editor would send it. */
function stage(overrides: Record<string, unknown> = {}) {
  return {
    key: 'only',
    name: 'Only stage',
    assignees: [{ mode: 'initiator' }],
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

function document(overrides: Record<string, unknown> = {}) {
  return { name: 'Test workflow', stages: [stage()], initialStageKey: 'only', ...overrides }
}

function parse(value: unknown) {
  return parseSubmittedTemplate(typeof value === 'string' ? value : JSON.stringify(value))
}

function problems(value: unknown): string[] {
  const result = parse(value)
  assert.ok(!result.ok, 'expected this document to be refused')
  return result.problems
}

describe('a document that is not a template at all', () => {
  it('refuses an empty object rather than throwing on it', () => {
    // This was the bug: `{}` parsed as JSON, passed a cast that checks
    // nothing, and reached `stages.map` — a 500 rather than an answer.
    const result = parse({})
    assert.equal(result.ok, false)
    assert.ok(result.problems.length > 0)
  })

  it('refuses text that is not JSON', () => {
    assert.match(problems('not json at all')[0], /could not be read/)
  })

  it('refuses a missing template field entirely', () => {
    assert.match(problems(undefined)[0], /form this can read/)
  })

  it('refuses stages that are not a list', () => {
    assert.ok(problems(document({ stages: 'lots' })).some((p) => p.startsWith('stages')))
  })

  it('names the path that was wrong, so it can be fixed', () => {
    // "stages.0.priority" is the difference between a report somebody can
    // act on and "something went wrong".
    const found = problems(document({ stages: [stage({ priority: 'banana' })] }))
    assert.ok(
      found.some((problem) => problem.startsWith('stages.0.priority')),
      found.join(' | '),
    )
  })
})

describe('values outside what the type allows', () => {
  it('refuses an unknown priority', () => {
    assert.ok(problems(document({ stages: [stage({ priority: 'banana' })] })).length > 0)
  })

  it('refuses an unknown field type', () => {
    const bad = stage({
      fields: [{ key: 'x', label: 'X', type: 'banana', required: false }],
    })
    assert.ok(problems(document({ stages: [bad] })).length > 0)
  })

  it('refuses an unknown completion rule', () => {
    assert.ok(problems(document({ stages: [stage({ completionRule: 'some' })] })).length > 0)
  })

  it('refuses an unknown assignee mode', () => {
    const bad = stage({ assignees: [{ mode: 'whoever' }] })
    assert.ok(problems(document({ stages: [bad] })).length > 0)
  })

  it('refuses a role id that is not one', () => {
    const bad = stage({ assignees: [{ mode: 'role', roleId: 'admin' }] })
    assert.ok(problems(document({ stages: [bad] })).length > 0)
  })

  it('refuses a required boolean sent as a string', () => {
    const bad = stage({ requiresApproval: 'yes' })
    assert.ok(problems(document({ stages: [bad] })).length > 0)
  })
})

describe('numbers on a stage', () => {
  it('refuses a negative deadline', () => {
    // A task due before the stage it belongs to started.
    assert.match(
      problems(document({ stages: [stage({ dueInHours: -5 })] })).join(' '),
      /cannot be negative/,
    )
  })

  it('refuses a deadline further out than a year', () => {
    assert.match(
      problems(document({ stages: [stage({ dueInHours: HOURS_LIMITS.max + 1 })] })).join(' '),
      /year or less/,
    )
  })

  it('refuses half an hour, which nothing in the product shows', () => {
    assert.match(
      problems(document({ stages: [stage({ slaHours: 1.5 })] })).join(' '),
      /whole hours/,
    )
  })

  it('accepts the boundaries', () => {
    const at = document({
      stages: [stage({ dueInHours: HOURS_LIMITS.min, slaHours: HOURS_LIMITS.max })],
    })
    assert.equal(parse(at).ok, true)
  })
})

describe('text that is too long to be a label', () => {
  it('refuses an oversized workflow name', () => {
    const long = 'a'.repeat(TEXT_LIMITS.name + 1)
    assert.ok(problems(document({ name: long })).length > 0)
  })

  it('refuses oversized instructions', () => {
    const long = 'a'.repeat(TEXT_LIMITS.instructions + 1)
    assert.ok(problems(document({ stages: [stage({ instructions: long })] })).length > 0)
  })
})

describe('what a half-built draft is allowed to look like', () => {
  // The schema says whether this is a template document. Whether it is
  // finished is template-validation's question, reported without blocking
  // the save, so none of these may be refused here.

  it('allows an empty name', () => {
    assert.equal(parse(document({ name: '' })).ok, true)
  })

  it('allows a stage with nobody assigned yet', () => {
    assert.equal(parse(document({ stages: [stage({ assignees: [] })] })).ok, true)
  })

  it('allows a select with no options yet', () => {
    const building = stage({
      fields: [{ key: 'kind', label: 'Kind', type: 'select', required: false }],
    })
    assert.equal(parse(document({ stages: [building] })).ok, true)
  })

  it('allows an initial stage key that does not resolve yet', () => {
    assert.equal(parse(document({ initialStageKey: 'nowhere' })).ok, true)
  })

  it('allows no stages at all', () => {
    assert.equal(parse(document({ stages: [] })).ok, true)
  })
})

describe('what it hands back', () => {
  it('returns the document, with unknown keys dropped', () => {
    const result = parse(document({ sneaked: 'value', status: 'active' }))
    assert.ok(result.ok && result.template)
    assert.ok(!('sneaked' in result.template))
    // status is the server's to decide; a post must not be able to publish
    // itself by claiming to be active.
    assert.ok(!('status' in result.template))
  })

  it('keeps the stages it was given', () => {
    const result = parse(document())
    assert.ok(result.ok && result.template)
    assert.equal(result.template.stages.length, 1)
    assert.equal(result.template.stages[0].key, 'only')
  })
})

describe('what the editor actually posts', () => {
  /**
   * Captured from the Workflow Builder on a newly created draft, verbatim.
   *
   * A fixture rather than a hand-written one because the first version of
   * this schema was written against a guess and rejected every real save:
   * the editor sends `projectId: ""` for "not tied to a project", and only
   * a missing key counted as absence. Every test passed. Nothing worked.
   */
  const REAL = JSON.stringify({
    name: 'Schema Test Workflow',
    description: '',
    projectId: '',
    departmentId: '',
    stages: [
      {
        key: 'first_stage',
        name: 'First stage',
        instructions: '',
        assignees: [{ mode: 'initiator' }],
        completionRule: 'any',
        fields: [],
        files: [],
        checklist: [],
        priority: 'medium',
        requiresApproval: false,
        nextStageKey: null,
      },
    ],
    initialStageKey: 'first_stage',
  })

  it('accepts it', () => {
    const result = parseSubmittedTemplate(REAL)
    assert.ok(result.ok, result.problems.join(' | '))
  })

  it('reads an unset project as unset, not as a broken id', () => {
    const result = parseSubmittedTemplate(REAL)
    assert.ok(result.ok && result.template)
    assert.equal(result.template.projectId, undefined)
    assert.equal(result.template.departmentId, undefined)
  })

  it('still refuses an id that is present and wrong', () => {
    const bad = JSON.parse(REAL)
    bad.projectId = 'the-big-one'
    assert.ok(problems(bad).some((problem) => problem.startsWith('projectId')))
  })

  it('accepts a project that is properly identified', () => {
    const good = JSON.parse(REAL)
    good.projectId = 'BO-PRJ-00001'
    const result = parse(good)
    assert.ok(result.ok && result.template)
    assert.equal(result.template.projectId, 'BO-PRJ-00001')
  })
})
