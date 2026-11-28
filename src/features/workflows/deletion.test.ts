import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { workflowDeletionBlocker } from './deletion'

describe('what blocks a workflow being deleted', () => {
  it('is nothing when no work has ever run on it', () => {
    assert.equal(workflowDeletionBlocker('Blog Post', 0), null)
  })

  it('refuses when a single piece of work has run on it', () => {
    const message = workflowDeletionBlocker('Blog Post', 1)
    assert.match(message ?? '', /Blog Post/)
    assert.match(message ?? '', /1 piece of work/)
  })

  it('counts the work in the plural', () => {
    assert.match(workflowDeletionBlocker('Blog Post', 3) ?? '', /3 pieces of work/)
  })

  it('says how to take it out of use instead', () => {
    assert.match(workflowDeletionBlocker('Blog Post', 2) ?? '', /retire/i)
  })
})
