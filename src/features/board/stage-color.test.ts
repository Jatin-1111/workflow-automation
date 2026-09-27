import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STAGE_RAMP_LENGTH, stageCap } from './stage-color'

describe('a stage takes its colour from its position', () => {
  it('starts every board on the same colour', () => {
    // Two boards side by side should agree about where the beginning is.
    assert.equal(stageCap(0), 'bg-stage-1')
  })

  it('gives consecutive stages different colours', () => {
    const run = Array.from({ length: STAGE_RAMP_LENGTH }, (_, i) => stageCap(i))
    assert.equal(new Set(run).size, STAGE_RAMP_LENGTH)
  })

  it('wraps rather than running out', () => {
    // An eleven-stage workflow is allowed to exist; it must not render a
    // column with no cap class at all.
    assert.equal(stageCap(STAGE_RAMP_LENGTH), stageCap(0))
    assert.equal(stageCap(STAGE_RAMP_LENGTH + 2), stageCap(2))
  })

  it('never returns nothing, whatever it is handed', () => {
    for (const bad of [-1, 1.5, Number.NaN]) {
      assert.match(stageCap(bad), /^bg-stage-\d$/)
    }
  })
})
