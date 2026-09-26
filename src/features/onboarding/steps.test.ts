import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSetupSteps, type SetupInput, type SetupStep } from './steps'

const PRACTICE = 'Practice Run'
const ADMIN = { userId: 'BO-USR-00001', accessLevel: 'admin' as const }

function input(overrides: Partial<SetupInput> = {}): SetupInput {
  return {
    viewer: ADMIN,
    users: [{ userId: ADMIN.userId, name: 'Nitin', status: 'active', roleIds: [] }],
    roles: [],
    templates: [],
    instances: [],
    practiceWorkflowName: PRACTICE,
    ...overrides,
  }
}

function step(steps: SetupStep[], key: string) {
  return steps.find((candidate) => candidate.key === key)
}

/** The first thing not done: what the card marks "Do this next". */
function next(steps: SetupStep[]) {
  return steps.find((candidate) => !candidate.done)?.key
}

describe('an organisation of one administrator, set up by the bootstrap script', () => {
  const { steps } = buildSetupSteps(input())

  it('asks for colleagues first', () => {
    // A workflow hands work to a person. Alone, there is nobody to hand it to,
    // and every later step depends on that.
    assert.equal(next(steps), 'people')
    assert.equal(step(steps, 'people')?.done, false)
  })

  it('does not offer a practice run there is no workflow for', () => {
    // The button would call an action with no template behind it.
    assert.equal(step(steps, 'practice'), undefined)
  })

  it('does not claim every role is covered when there are no roles', () => {
    // It used to: coverage counted only roles a published workflow referenced,
    // and an empty organisation references none, so the check passed vacuously
    // — the most misleading thing to say to somebody starting from nothing.
    const roles = step(steps, 'roles')
    assert.equal(roles?.done, false)
    assert.match(roles?.title ?? '', /Create the roles/)
  })

  it('holds back the steps that cannot be done yet', () => {
    assert.equal(step(steps, 'roles')?.blocked, true)
    assert.equal(step(steps, 'workflow')?.blocked, true)
    assert.equal(step(steps, 'first-run')?.blocked, true)
  })
})

describe('as the organisation fills in', () => {
  const withColleagues = input({
    users: [
      { userId: ADMIN.userId, name: 'Nitin', status: 'active', roleIds: [] },
      { userId: 'BO-USR-00002', name: 'Tanu', status: 'active', roleIds: [] },
    ],
  })

  it('stops asking for colleagues, and unblocks roles', () => {
    const { steps } = buildSetupSteps(withColleagues)
    assert.equal(step(steps, 'people')?.done, true)
    assert.equal(step(steps, 'roles')?.blocked, false)
    assert.equal(next(steps), 'roles')
  })

  it('does not count a role nobody holds', () => {
    const { steps } = buildSetupSteps({
      ...withColleagues,
      roles: [{ roleId: 'BO-ROL-00001', name: 'Proposal Designer' }],
    })
    assert.equal(step(steps, 'roles')?.done, false)
    assert.match(step(steps, 'roles')?.detail ?? '', /Proposal Designer/)
  })

  it('counts a role once somebody active holds it', () => {
    const { steps } = buildSetupSteps({
      ...withColleagues,
      users: [
        { userId: ADMIN.userId, name: 'Nitin', status: 'active', roleIds: [] },
        {
          userId: 'BO-USR-00002',
          name: 'Tanu',
          status: 'active',
          roleIds: ['BO-ROL-00001'],
        },
      ],
      roles: [{ roleId: 'BO-ROL-00001', name: 'Proposal Designer' }],
    })
    assert.equal(step(steps, 'roles')?.done, true)
    assert.equal(step(steps, 'workflow')?.blocked, false)
  })

  it('does not count a role held only by a deactivated person', () => {
    // The engine resolves a role to its *active* holders and would refuse to
    // route, so setup must not call this covered.
    const { steps } = buildSetupSteps({
      ...withColleagues,
      users: [
        { userId: ADMIN.userId, name: 'Nitin', status: 'active', roleIds: [] },
        { userId: 'BO-USR-00002', name: 'Tanu', status: 'active', roleIds: [] },
        {
          userId: 'BO-USR-00003',
          name: 'Gone',
          status: 'inactive',
          roleIds: ['BO-ROL-00001'],
        },
      ],
      roles: [{ roleId: 'BO-ROL-00001', name: 'Proposal Designer' }],
    })
    assert.equal(step(steps, 'roles')?.done, false)
  })
})

describe('once there is something to practise on', () => {
  const ready: SetupInput = input({
    templates: [
      { workflowId: 'BO-WFL-00003', name: PRACTICE, status: 'active', stages: [] },
    ],
  })

  it('offers the practice run', () => {
    const { steps } = buildSetupSteps(ready)
    assert.equal(step(steps, 'practice')?.done, false)
    assert.equal(next(steps), 'practice')
  })

  it('records it once the viewer has finished one', () => {
    const { steps, practiceDone } = buildSetupSteps({
      ...ready,
      instances: [
        { workflowId: 'BO-WFL-00003', initiatedBy: ADMIN.userId, status: 'completed' },
      ],
    })
    assert.equal(practiceDone, true)
    assert.equal(step(steps, 'practice')?.done, true)
  })

  it('does not credit a practice run somebody else finished', () => {
    const { practiceDone } = buildSetupSteps({
      ...ready,
      instances: [
        { workflowId: 'BO-WFL-00003', initiatedBy: 'BO-USR-00009', status: 'completed' },
      ],
    })
    assert.equal(practiceDone, false)
  })

  it('does not treat the practice workflow as real work', () => {
    const { steps } = buildSetupSteps({
      ...ready,
      instances: [
        { workflowId: 'BO-WFL-00003', initiatedBy: ADMIN.userId, status: 'active' },
      ],
    })
    assert.equal(step(steps, 'first-run')?.done, false)
  })
})

describe('somebody who cannot set anything up', () => {
  it('is shown only the practice step, not the organisation checklist', () => {
    const { steps } = buildSetupSteps({
      ...input({
        viewer: { userId: 'BO-USR-00004', accessLevel: 'employee' },
        templates: [
          { workflowId: 'BO-WFL-00003', name: PRACTICE, status: 'active', stages: [] },
        ],
      }),
    })
    assert.deepEqual(steps.map((s) => s.key), ['practice'])
  })
})
