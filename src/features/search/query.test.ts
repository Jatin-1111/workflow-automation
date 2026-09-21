import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  destinationForId,
  escapeForRegex,
  MIN_SEARCH_LENGTH,
  parseSearch,
} from './query'

describe('escapeForRegex', () => {
  it('neutralises every character a regex treats as special', () => {
    const escaped = escapeForRegex('a.b*c+d?e^f$g{h}i(j)k|l[m]n')
    // The escaped form must match the literal text and nothing cleverer.
    assert.equal(new RegExp(escaped).test('a.b*c+d?e^f$g{h}i(j)k|l[m]n'), true)
    assert.equal(new RegExp(escaped).test('axbxcxd'), false)
  })

  it('stops a wildcard from matching everything', () => {
    // Without escaping, ".*" would turn a search box into "list all records".
    const pattern = new RegExp(escapeForRegex('.*'), 'i')
    assert.equal(pattern.test('Proposal — ABC Technologies'), false)
    assert.equal(pattern.test('literally .* here'), true)
  })

  it('does not throw on input that would be invalid as a pattern', () => {
    assert.doesNotThrow(() => new RegExp(escapeForRegex('([')))
  })
})

describe('parseSearch', () => {
  it('refuses a term too short to be meaningful', () => {
    assert.equal(parseSearch('a').usable, false)
    assert.equal(parseSearch('').usable, false)
    assert.equal(parseSearch(undefined).usable, false)
    assert.equal(parseSearch('   ').usable, false)
    assert.equal(parseSearch('a'.repeat(MIN_SEARCH_LENGTH)).usable, true)
  })

  it('trims what was typed', () => {
    assert.equal(parseSearch('  ABC  ').term, 'ABC')
  })

  it('matches case-insensitively', () => {
    assert.equal(parseSearch('abc').pattern.test('Proposal — ABC Technologies'), true)
  })

  it('recognises a permanent id, whatever case it was pasted in', () => {
    assert.deepEqual(parseSearch('BO-USR-00001').exactId, {
      kind: 'user',
      id: 'BO-USR-00001',
    })
    assert.deepEqual(parseSearch('bo-tsk-00042').exactId, {
      kind: 'task',
      id: 'BO-TSK-00042',
    })
  })

  it('does not mistake ordinary text for an id', () => {
    assert.equal(parseSearch('ABC Technologies').exactId, undefined)
    assert.equal(parseSearch('BO-ZZZ-00001').exactId, undefined)
    assert.equal(parseSearch('BO-USR-1').exactId, undefined)
  })

  it('still searches by text when the term is an id', () => {
    // The id may also appear inside a name, so the pattern is always built.
    assert.equal(parseSearch('BO-USR-00001').usable, true)
    assert.ok(parseSearch('BO-USR-00001').pattern instanceof RegExp)
  })
})

describe('destinationForId', () => {
  it('knows where the kinds with pages of their own live', () => {
    assert.equal(destinationForId('task', 'BO-TSK-00001'), '/tasks/BO-TSK-00001')
    assert.equal(destinationForId('project', 'BO-PRJ-00001'), '/projects/BO-PRJ-00001')
    assert.equal(destinationForId('user', 'BO-USR-00001'), '/team/BO-USR-00001')
  })

  it('returns nothing for kinds with no page', () => {
    assert.equal(destinationForId('comment', 'BO-CMT-00001'), null)
    assert.equal(destinationForId('timelineEvent', 'BO-EVT-00001'), null)
  })
})
