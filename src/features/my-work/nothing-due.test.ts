import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nothingDueToday } from './nothing-due'

describe('an empty Needs action tab, for somebody who is not idle', () => {
  it('says nothing different when there is genuinely nothing anywhere', () => {
    // The ordinary empty state is right then; this only replaces it when it
    // would be untrue.
    assert.equal(nothingDueToday({ in_progress: 0, upcoming: 0 }), null)
  })

  it('does not tell somebody holding work that nothing needs them', () => {
    // Two tasks due tomorrow used to sit under "2 open items" and
    // "Nothing needs you right now", one directly above the other.
    const said = nothingDueToday({ in_progress: 0, upcoming: 2 })
    assert.ok(said)
    assert.doesNotMatch(said.headline, /Nothing needs you/)
    assert.equal(said.detail, 'You still have 2 tasks due later.')
  })

  it('mentions started work, which can be due today and still not appear here', () => {
    // Starting a task moves it to In progress whatever its deadline.
    const said = nothingDueToday({ in_progress: 1, upcoming: 0 })
    assert.equal(said?.detail, 'You still have 1 task you have started.')
  })

  it('names both when both apply, started work first', () => {
    const said = nothingDueToday({ in_progress: 1, upcoming: 3 })
    assert.equal(said?.detail, 'You still have 1 task you have started and 3 tasks due later.')
    assert.deepEqual(
      said?.links.map((link) => link.view),
      ['in_progress', 'upcoming'],
    )
  })

  it('offers a way to the work it mentions, and only that', () => {
    const said = nothingDueToday({ in_progress: 0, upcoming: 1 })
    assert.deepEqual(said?.links, [{ view: 'upcoming', label: 'See what is coming up' }])
  })
})
