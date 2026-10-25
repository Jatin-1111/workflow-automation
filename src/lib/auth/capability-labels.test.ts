import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CAPABILITY_GROUPS,
  CAPABILITY_LABELS,
  UNGROUPED,
  groupedCapabilities,
} from './capability-labels'
import { CAPABILITIES, CAPABILITIES_BY_ACCESS_LEVEL } from './permissions'

describe('what a permission is called on screen', () => {
  it('has a plain sentence for every capability', () => {
    for (const capability of CAPABILITIES) {
      const label = CAPABILITY_LABELS[capability]
      assert.ok(label && label.length > 8, capability)
      // The profile used to print `instance.view_authorized`.
      assert.doesNotMatch(label, /[._]/, `${capability} leaks its code: "${label}"`)
    }
  })

  it('lists every capability in a group, so none can go missing from a page', () => {
    assert.deepEqual(UNGROUPED, [])
  })

  it('lists none twice', () => {
    const all = CAPABILITY_GROUPS.flatMap((group) => group.capabilities)
    assert.equal(new Set(all).size, all.length)
  })

  it('shows an employee only everyday work', () => {
    const groups = groupedCapabilities(CAPABILITIES_BY_ACCESS_LEVEL.employee)
    assert.deepEqual(
      groups.map((group) => group.title),
      ['Everyday work'],
    )
  })

  it('shows an administrator all three, and everything they can do', () => {
    const groups = groupedCapabilities(CAPABILITIES_BY_ACCESS_LEVEL.admin)
    assert.deepEqual(
      groups.map((group) => group.title),
      ['Everyday work', 'Oversight', 'Administration'],
    )
    assert.equal(
      groups.flatMap((group) => group.items).length,
      CAPABILITIES_BY_ACCESS_LEVEL.admin.length,
    )
  })
})
