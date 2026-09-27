import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_TIME_ZONE,
  endOfBusinessDay,
  isSameBusinessDay,
} from './business-day'

const IST = DEFAULT_TIME_ZONE

/** The same instant, carrying different milliseconds. */
function withMs(iso: string, ms: number): Date {
  const at = new Date(iso)
  at.setUTCMilliseconds(ms)
  return at
}

describe('the end of the business day does not depend on when you ask', () => {
  it('is the same for two instants that differ only in milliseconds', () => {
    // The offset was measured against a whole-second reading of the clock
    // but subtracted from an instant that still carried its milliseconds,
    // so every caller inherited them.
    const a = withMs('2026-09-28T00:34:12Z', 466)
    const b = withMs('2026-09-28T00:34:12Z', 0)
    assert.equal(endOfBusinessDay(a, IST).getTime(), endOfBusinessDay(b, IST).getTime())
  })

  it('is the same from any moment within the day', () => {
    const day = [
      '2026-09-28T00:00:00.001Z',
      '2026-09-28T06:15:43.777Z',
      '2026-09-28T13:59:59.123Z',
      '2026-09-28T18:29:59.999Z',
    ].map((iso) => endOfBusinessDay(new Date(iso), IST).getTime())

    assert.equal(new Set(day).size, 1, `got ${[...new Set(day)].join(', ')}`)
  })

  it('is idempotent', () => {
    // Feeding the answer back in must not move it. It did: the answer ends
    // in .999, and those 999 milliseconds were then folded into the next
    // offset, pushing the result a second further each time.
    for (const ms of [0, 1, 466, 999]) {
      const at = withMs('2026-09-28T00:34:12Z', ms)
      const once = endOfBusinessDay(at, IST)
      assert.equal(endOfBusinessDay(once, IST).getTime(), once.getTime(), `ms=${ms}`)
    }
  })

  it('lands on the last instant of the day, never the first of the next', () => {
    // With milliseconds in play the result was 18:30:00.465Z — which is
    // 00:00:00.465 IST, the following day. A boundary that crosses the
    // boundary it is meant to mark.
    for (const ms of [0, 1, 466, 999]) {
      const end = endOfBusinessDay(withMs('2026-09-28T00:34:12Z', ms), IST)
      assert.equal(end.toISOString(), '2026-09-28T18:29:59.999Z', `ms=${ms}`)
    }
  })
})

describe('the day it resolves', () => {
  it('uses the business zone rather than the host', () => {
    // 20:00 UTC on the 27th is already 01:30 IST on the 28th, so the
    // business day that instant belongs to ends on the 28th.
    const end = endOfBusinessDay(new Date('2026-09-27T20:00:00Z'), IST)
    assert.equal(end.toISOString(), '2026-09-28T18:29:59.999Z')
  })

  it('treats 23:59:59.999 in the zone as still that day', () => {
    const lastMoment = new Date('2026-09-28T18:29:59.999Z')
    assert.equal(endOfBusinessDay(lastMoment, IST).getTime(), lastMoment.getTime())
  })

  it('treats the millisecond after as the next day', () => {
    const justAfter = new Date('2026-09-28T18:30:00.000Z')
    assert.equal(endOfBusinessDay(justAfter, IST).toISOString(), '2026-09-29T18:29:59.999Z')
  })

  it('works in a zone behind UTC, and one that observes daylight saving', () => {
    // Not because the product runs there, but because an offset computed
    // correctly should not be an accident of +05:30 being positive and
    // constant.
    const summer = endOfBusinessDay(new Date('2026-07-15T16:00:00.321Z'), 'America/New_York')
    assert.equal(summer.toISOString(), '2026-07-16T03:59:59.999Z') // UTC-4

    const winter = endOfBusinessDay(new Date('2026-01-15T16:00:00.321Z'), 'America/New_York')
    assert.equal(winter.toISOString(), '2026-01-16T04:59:59.999Z') // UTC-5
  })
})

describe('isSameBusinessDay', () => {
  it('is true for two instants a fraction of a second apart', () => {
    // It compares two endOfBusinessDay results directly, so it inherited
    // the defect whole: two times 466ms apart were different days.
    const a = withMs('2026-09-28T00:34:12Z', 466)
    const b = withMs('2026-09-28T00:34:12Z', 0)
    assert.equal(isSameBusinessDay(a, b, IST), true)
  })

  it('is true across a whole day, whatever the milliseconds', () => {
    const morning = new Date('2026-09-28T04:00:00.123Z')
    const evening = new Date('2026-09-28T17:00:00.987Z')
    assert.equal(isSameBusinessDay(morning, evening, IST), true)
  })

  it('is false across the boundary', () => {
    const before = new Date('2026-09-28T18:29:59.999Z')
    const after = new Date('2026-09-28T18:30:00.000Z')
    assert.equal(isSameBusinessDay(before, after, IST), false)
  })
})
