import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { navSectionFor } from './nav-section'

describe('which navigation entry a page lights up', () => {
  it('lights up the entry a page sits under', () => {
    assert.equal(navSectionFor('/my-work'), '/my-work')
    assert.equal(navSectionFor('/workflows'), '/workflows')
    assert.equal(navSectionFor('/workflows/BO-WFL-00001/2'), '/workflows')
    assert.equal(navSectionFor('/admin'), '/admin')
  })

  it('counts a task as My Work, as each task page used to say', () => {
    assert.equal(navSectionFor('/tasks/BO-TSK-00007'), '/my-work')
  })

  it('lights up Overview for all four of its views and the pages inside them', () => {
    for (const path of ['/dashboard', '/projects', '/team', '/reports', '/projects/BO-PRJ-00001', '/team/BO-USR-00002']) {
      assert.equal(navSectionFor(path), '/dashboard', path)
    }
  })

  it('does not mistake a longer name for a section', () => {
    // "/teams" is not the Team view; it falls through to its own segment.
    assert.equal(navSectionFor('/teams'), '/teams')
  })

  it('lights up nothing at the root', () => {
    assert.equal(navSectionFor('/'), null)
  })
})
