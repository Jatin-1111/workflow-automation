import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyMove, type MoveStage } from './transitions'

/** Request -> Content -> Approval (an approval stage) -> Dispatch. */
const STAGES: MoveStage[] = [
  { key: 'request', name: 'Request', requiresApproval: false, nextStageKey: 'content' },
  { key: 'content', name: 'Content', requiresApproval: false, nextStageKey: 'approval' },
  { key: 'approval', name: 'Approval', requiresApproval: true, nextStageKey: 'dispatch' },
  { key: 'dispatch', name: 'Dispatch', requiresApproval: false, nextStageKey: null },
]

describe('what dropping a card means', () => {
  it('is nothing when the card lands where it started', () => {
    assert.deepEqual(classifyMove(STAGES, 'content', 'content'), { kind: 'same' })
  })

  it('reads a drop on the next column as completing the stage', () => {
    assert.deepEqual(classifyMove(STAGES, 'request', 'content'), {
      kind: 'forward',
      approval: false,
    })
  })

  it('reads the same drop on an approval stage as approving', () => {
    assert.deepEqual(classifyMove(STAGES, 'approval', 'dispatch'), {
      kind: 'forward',
      approval: true,
    })
  })

  it('reads a leftward drop from an approval stage as sending work back', () => {
    assert.deepEqual(classifyMove(STAGES, 'approval', 'content'), { kind: 'backward' })
  })

  it('refuses to reopen an earlier stage from one that cannot approve', () => {
    // Otherwise any stage could be rewound by dragging, and the revision
    // record would stop meaning anything.
    const move = classifyMove(STAGES, 'content', 'request')
    assert.equal(move.kind, 'illegal')
    assert.match(move.kind === 'illegal' ? move.reason : '', /Only an approval stage/)
  })

  it('refuses a jump over a stage', () => {
    // The whole point: a card cannot skip the work in between.
    const move = classifyMove(STAGES, 'request', 'dispatch')
    assert.equal(move.kind, 'illegal')
    assert.match(move.kind === 'illegal' ? move.reason : '', /only leads to Content/)
  })

  it('refuses a drop on a column of another workflow', () => {
    const move = classifyMove(STAGES, 'content', 'somewhere_else')
    assert.equal(move.kind, 'illegal')
    assert.match(move.kind === 'illegal' ? move.reason : '', /not part of this workflow/)
  })

  it('says the last stage finishes the run rather than leading anywhere', () => {
    const move = classifyMove(STAGES, 'dispatch', 'request')
    assert.equal(move.kind, 'illegal')
  })

  it('refuses a card whose stage the workflow no longer defines', () => {
    const move = classifyMove(STAGES, 'retired_stage', 'content')
    assert.equal(move.kind, 'illegal')
    assert.match(move.kind === 'illegal' ? move.reason : '', /no longer defines/)
  })
})
