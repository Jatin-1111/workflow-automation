import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatDeadline } from './format'

const DUE = new Date('2026-09-30T12:00:00Z')
const NOW = new Date('2026-10-02T12:00:00Z')

describe('a deadline on finished work', () => {
  it('is no longer called overdue', () => {
    // A task done a day late showed "Completed" beside "Overdue 2d" in red,
    // and the number kept growing after the work was handed on.
    const finished = new Date('2026-10-01T12:00:00Z')
    assert.deepEqual(formatDeadline(DUE, NOW, finished), {
      label: 'Finished 1d late',
      overdue: false,
    })
  })

  it('says how late it was when it finished, not how late it is now', () => {
    const finished = new Date('2026-09-30T15:00:00Z')
    assert.equal(formatDeadline(DUE, NOW, finished).label, 'Finished 3h late')
  })

  it('says so when it was on time', () => {
    const finished = new Date('2026-09-29T12:00:00Z')
    assert.deepEqual(formatDeadline(DUE, NOW, finished), {
      label: 'Finished on time',
      overdue: false,
    })
  })

  it('needs no deadline to have finished', () => {
    assert.equal(formatDeadline(undefined, NOW, NOW).label, 'Finished')
  })

  it('still counts open work against now', () => {
    assert.deepEqual(formatDeadline(DUE, NOW), { label: 'Overdue 2d', overdue: true })
  })
})
