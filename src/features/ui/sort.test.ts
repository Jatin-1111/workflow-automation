import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nextSort, parseSort, sortRows } from './sort'

const KEYS = ['name', 'active'] as const
const DEFAULT = { key: 'name', direction: 'asc' } as const

describe('parseSort', () => {
  it('reads a known column and direction', () => {
    assert.deepEqual(parseSort({ sort: 'active', dir: 'desc' }, KEYS, DEFAULT), {
      key: 'active',
      direction: 'desc',
    })
  })

  it('falls back on a column it does not know', () => {
    assert.deepEqual(parseSort({ sort: '__proto__' }, KEYS, DEFAULT), DEFAULT)
    assert.deepEqual(parseSort({ sort: 'constructor' }, KEYS, DEFAULT), DEFAULT)
  })

  it('treats anything but desc as ascending', () => {
    assert.equal(parseSort({ sort: 'name', dir: 'sideways' }, KEYS, DEFAULT).direction, 'asc')
  })

  it('takes the first of a repeated parameter', () => {
    assert.equal(parseSort({ sort: ['active', 'name'] }, KEYS, DEFAULT).key, 'active')
  })
})

describe('nextSort', () => {
  it('starts a new column in the direction asked for', () => {
    assert.deepEqual(nextSort(DEFAULT, 'active', 'desc'), { key: 'active', direction: 'desc' })
  })

  it('flips the column already sorted', () => {
    assert.equal(nextSort({ key: 'active', direction: 'desc' }, 'active', 'desc').direction, 'asc')
  })
})

describe('sortRows', () => {
  const rows = [
    { name: 'Rohan', n: 3 },
    { name: 'Meera', n: 3 },
    { name: 'Nitin', n: 0 },
    { name: 'Ghost', n: undefined },
  ]
  const byName = (row: { name: string }) => row.name

  it('sorts numbers as numbers and breaks ties by name', () => {
    const sorted = sortRows(rows, (r) => r.n, 'desc', byName)
    assert.deepEqual(
      sorted.map((r) => r.name),
      ['Meera', 'Rohan', 'Nitin', 'Ghost'],
    )
  })

  it('puts a missing value last in either direction', () => {
    assert.equal(sortRows(rows, (r) => r.n, 'asc', byName).at(-1)?.name, 'Ghost')
    assert.equal(sortRows(rows, (r) => r.n, 'desc', byName).at(-1)?.name, 'Ghost')
  })

  it('does not disturb the array it was given', () => {
    const copy = [...rows]
    sortRows(rows, (r) => r.n, 'asc', byName)
    assert.deepEqual(rows, copy)
  })
})
