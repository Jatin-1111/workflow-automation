import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  blockedMessage,
  departmentUses,
  projectUses,
  roleUses,
  teamUses,
  type RefTemplate,
} from './references'

const DESIGN = 'BO-DEP-00004'
const PROPOSAL_TEAM = 'BO-TEM-00001'
const MELA = 'BO-PRJ-00001'
const DESIGNER = 'BO-ROL-00005'

function template(overrides: Partial<RefTemplate> = {}): RefTemplate {
  return { stages: [], ...overrides }
}

function roleStage(roleId: string) {
  return { assignees: [{ mode: 'role', roleId }] }
}

describe('what blocks a department being deleted', () => {
  it('is nothing when the department is unused', () => {
    assert.deepEqual(
      departmentUses(DESIGN, { users: [], teams: [], templates: [] }),
      [],
    )
  })

  it('counts the people, teams and workflows that point at it', () => {
    const uses = departmentUses(DESIGN, {
      users: [
        { departmentId: DESIGN, roleIds: [] },
        { departmentId: DESIGN, roleIds: [] },
        { departmentId: 'BO-DEP-00002', roleIds: [] },
      ],
      teams: [{ departmentId: DESIGN }],
      templates: [template({ departmentId: DESIGN })],
    })

    assert.deepEqual(uses, ['2 people', '1 team', '1 workflow'])
  })

  it('says "person" for one and "people" for more', () => {
    const one = departmentUses(DESIGN, {
      users: [{ departmentId: DESIGN, roleIds: [] }],
      teams: [],
      templates: [],
    })
    assert.deepEqual(one, ['1 person'])
  })
})

describe('what blocks a team being deleted', () => {
  it('counts only its members', () => {
    assert.deepEqual(
      teamUses(PROPOSAL_TEAM, {
        users: [
          { teamId: PROPOSAL_TEAM, roleIds: [] },
          { teamId: 'BO-TEM-00002', roleIds: [] },
        ],
      }),
      ['1 person'],
    )
  })
})

describe('what blocks a project being deleted', () => {
  it('counts running work before workflows', () => {
    const uses = projectUses(MELA, {
      instances: [{ projectId: MELA }, { projectId: MELA }],
      templates: [template({ projectId: MELA })],
    })

    assert.deepEqual(uses, ['2 running workflows', '1 workflow'])
  })

  it('ignores work belonging to another project', () => {
    assert.deepEqual(
      projectUses(MELA, { instances: [{ projectId: 'BO-PRJ-00003' }], templates: [] }),
      [],
    )
  })
})

describe('what blocks a role being deleted', () => {
  it('counts the people holding it', () => {
    assert.deepEqual(
      roleUses(DESIGNER, {
        users: [{ roleIds: [DESIGNER] }, { roleIds: ['BO-ROL-00003'] }],
        templates: [],
      }),
      ['1 holder'],
    )
  })

  it('counts a workflow whose stage routes to it', () => {
    assert.deepEqual(
      roleUses(DESIGNER, {
        users: [],
        templates: [template({ stages: [roleStage(DESIGNER)] })],
      }),
      ['1 workflow'],
    )
  })

  it('counts an unpublished draft too', () => {
    // A draft naming the role would fail to route the moment it was published,
    // so it has to count as a use.
    const drafts = [template({ stages: [roleStage(DESIGNER)] })]
    assert.deepEqual(roleUses(DESIGNER, { users: [], templates: drafts }), ['1 workflow'])
  })

  it('ignores stages assigned some other way', () => {
    const other = template({
      stages: [
        { assignees: [{ mode: 'initiator' }] },
        { assignees: [{ mode: 'role', roleId: 'BO-ROL-00009' }] },
      ],
    })
    assert.deepEqual(roleUses(DESIGNER, { users: [], templates: [other] }), [])
  })

  it('counts a workflow once however many of its stages name the role', () => {
    const twice = template({ stages: [roleStage(DESIGNER), roleStage(DESIGNER)] })
    assert.deepEqual(roleUses(DESIGNER, { users: [], templates: [twice] }), ['1 workflow'])
  })
})

describe('the refusal itself', () => {
  it('names the record and what is holding it', () => {
    assert.equal(
      blockedMessage('Design', ['2 people', '1 workflow']),
      'Design is still in use by 2 people, 1 workflow. ' +
        'Move those across first, or set it inactive instead.',
    )
  })
})
