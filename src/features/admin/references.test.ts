import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  blockedMessage,
  departmentUses,
  personBlockedMessage,
  projectUses,
  roleUses,
  teamUses,
  userUses,
  type RefTemplate,
  type UserFootprint,
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

const CLEAN: UserFootprint = {
  actions: 0,
  assignedRuns: 0,
  workflowsAuthored: 0,
  projectsOwned: 0,
  projectMemberships: 0,
  departmentsHeaded: 0,
  teamsLed: 0,
}

describe('deleting a person', () => {
  it('is allowed for somebody with no footprint at all', () => {
    // Added with the wrong address, or never used: the case delete is for.
    const uses = userUses(CLEAN)
    assert.deepEqual(uses, { history: [], structure: [] })
    assert.equal(personBlockedMessage('Sanket', uses), null)
  })

  it('is refused for somebody who has done anything', () => {
    // Every action leaves a timeline event with their id on it, and the
    // timeline is append-only. Removing the person would orphan it.
    const message = personBlockedMessage('Rohan', userUses({ ...CLEAN, actions: 12 }))
    assert.match(message ?? '', /has history here — 12 recorded actions/)
  })

  it('is refused for somebody given work they never touched', () => {
    // Being assigned is not an action of theirs, so it does not appear as
    // one — but the task still names them.
    const message = personBlockedMessage('Rohan', userUses({ ...CLEAN, assignedRuns: 1 }))
    assert.match(message ?? '', /1 workflow run/)
  })

  it('is refused for somebody who wrote a workflow', () => {
    const message = personBlockedMessage('Nitin', userUses({ ...CLEAN, workflowsAuthored: 2 }))
    assert.match(message ?? '', /2 workflow versions/)
  })

  it('points at deactivation when the obstacle is history', () => {
    // "Move those across first" is the advice for a department. It is
    // meaningless for history, which cannot be moved anywhere.
    const message = personBlockedMessage('Rohan', userUses({ ...CLEAN, actions: 1 })) ?? ''
    assert.match(message, /Deactivate them instead/)
    assert.doesNotMatch(message, /Move those across/)
  })

  it('asks for the assignment to change when the obstacle is only structure', () => {
    const message =
      personBlockedMessage('Meera', userUses({ ...CLEAN, projectsOwned: 1, teamsLed: 2 })) ?? ''
    assert.match(message, /still named on 1 project they own, 2 teams they lead/)
    assert.match(message, /Change those first, then delete/)
    assert.doesNotMatch(message, /Deactivate/)
  })

  it('gives the history answer when both apply', () => {
    // Clearing their projects would not make them deletable, so saying
    // "change those first" would send somebody on a pointless errand.
    const message =
      personBlockedMessage('Meera', userUses({ ...CLEAN, actions: 3, projectsOwned: 1 })) ?? ''
    assert.match(message, /Deactivate them instead/)
    assert.doesNotMatch(message, /Change those first/)
  })

  it('reads in the singular when there is one of something', () => {
    const uses = userUses({ ...CLEAN, actions: 1, departmentsHeaded: 1 })
    assert.deepEqual(uses.history, ['1 recorded action'])
    assert.deepEqual(uses.structure, ['1 department they head'])
  })
})

