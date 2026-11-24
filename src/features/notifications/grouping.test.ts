import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { groupByDay } from './grouping'

const NOW = new Date(2026, 10, 24, 12, 0)
const at = (day: number, hour: number) => ({ createdAt: new Date(2026, 10, day, hour, 0) })

describe('groupByDay', () => {
  it('calls the current day Today and the one before Yesterday', () => {
    const groups = groupByDay([at(24, 11), at(23, 9)], NOW)
    assert.deepEqual(
      groups.map((group) => group.label),
      ['Today', 'Yesterday'],
    )
  })

  it('names an older day by its date', () => {
    const [group] = groupByDay([at(20, 9)], NOW)
    assert.match(group.label, /20 November/)
  })

  it('puts things from one day together and keeps their order', () => {
    const first = at(24, 11)
    const second = at(24, 8)
    const [group] = groupByDay([first, second], NOW)
    assert.deepEqual(group.items, [first, second])
  })

  it('treats 23:50 last night as yesterday however early it is now', () => {
    const early = new Date(2026, 10, 24, 0, 5)
    const [group] = groupByDay([{ createdAt: new Date(2026, 10, 23, 23, 50) }], early)
    assert.equal(group.label, 'Yesterday')
  })

  it('gives nothing for nothing', () => {
    assert.deepEqual(groupByDay([], NOW), [])
  })
})
