import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatId, isEntityId, parseId } from './format'
import { ENTITY_KINDS, type EntityKind } from '@/lib/types/ids'

describe('formatId', () => {
  it('zero-pads the sequence to the declared width', () => {
    assert.equal(formatId('user', 1), 'BO-USR-00001')
    assert.equal(formatId('project', 42), 'BO-PRJ-00042')
    assert.equal(formatId('task', 12345), 'BO-TSK-12345')
  })

  it('does not truncate a sequence that outgrows the width', () => {
    assert.equal(formatId('task', 123456), 'BO-TSK-123456')
  })

  it('rejects a sequence that is not a positive integer', () => {
    assert.throws(() => formatId('user', 0))
    assert.throws(() => formatId('user', -1))
    assert.throws(() => formatId('user', 1.5))
  })

  it('emits a distinct prefix for every entity kind', () => {
    const prefixes = Object.values(ENTITY_KINDS)
    assert.equal(new Set(prefixes).size, prefixes.length)
  })
})

describe('parseId', () => {
  it('round-trips every entity kind', () => {
    for (const kind of Object.keys(ENTITY_KINDS) as EntityKind[]) {
      assert.deepEqual(parseId(formatId(kind, 7)), { kind, sequence: 7 })
    }
  })

  it('returns null for malformed ids', () => {
    assert.equal(parseId('BO-USR-1'), null, 'sequence too short')
    assert.equal(parseId('XX-USR-00001'), null, 'wrong namespace')
    assert.equal(parseId('BO-ZZZ-00001'), null, 'unknown prefix')
    assert.equal(parseId('BO-USR-0000d'), null, 'non-numeric sequence')
    assert.equal(parseId('BO-USR-00001 '), null, 'trailing whitespace')
    assert.equal(parseId('Tanu'), null, 'a display name is never an id')
  })
})

describe('isEntityId', () => {
  it('narrows only to the matching kind', () => {
    assert.equal(isEntityId('BO-USR-00001', 'user'), true)
    assert.equal(isEntityId('BO-USR-00001', 'project'), false)
    assert.equal(isEntityId('not-an-id', 'user'), false)
  })
})
