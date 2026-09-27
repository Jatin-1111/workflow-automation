import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  decideForAccount,
  decideForAddress,
  describeWait,
  THROTTLE,
} from './throttle'

const NOW = new Date('2026-03-01T12:00:00.000Z')

/** `count` failures, the most recent `agoMs` before now. */
function failures(count: number, agoMs = 1000): Date[] {
  return Array.from(
    { length: count },
    (_, index) => new Date(NOW.getTime() - agoMs - (count - 1 - index) * 1000),
  )
}

describe('somebody who mistypes their password', () => {
  it('is not delayed at all for the first few attempts', () => {
    for (let count = 0; count < THROTTLE.freeAttempts; count += 1) {
      assert.equal(decideForAccount(failures(count), NOW).allowed, true, `after ${count}`)
    }
  })

  it('has no history to answer for when there is none', () => {
    assert.deepEqual(decideForAccount([], NOW), { allowed: true, retryAfterSeconds: 0 })
  })
})

describe('somebody who keeps guessing', () => {
  it('waits once the free attempts are gone', () => {
    const decision = decideForAccount(failures(THROTTLE.freeAttempts), NOW)
    assert.equal(decision.allowed, false)
    assert.ok(decision.retryAfterSeconds > 0)
  })

  it('waits longer each time, so guessing gets worse', () => {
    const waits = [5, 6, 7, 8].map(
      (count) => decideForAccount(failures(count), NOW).retryAfterSeconds,
    )
    for (let i = 1; i < waits.length; i += 1) {
      assert.ok(waits[i] > waits[i - 1], `${waits[i - 1]} then ${waits[i]}`)
    }
  })

  it('stops the wait growing without limit', () => {
    // An unbounded delay is a lockout wearing a disguise, and the point of
    // backoff is that the real owner always gets back in eventually.
    const cap = THROTTLE.maxDelayMs / 1000
    for (const count of [20, 50, 500]) {
      assert.ok(
        decideForAccount(failures(count), NOW).retryAfterSeconds <= cap,
        `${count} failures`,
      )
    }
  })

  it('lets them back in once the wait has passed', () => {
    const justOver = THROTTLE.maxDelayMs + 1000
    assert.equal(decideForAccount(failures(6, justOver), NOW).allowed, true)
  })
})

describe('the window', () => {
  it('forgets failures older than it', () => {
    // Yesterday's fumbling must not count against somebody today.
    const old = failures(20, THROTTLE.windowMs + 60_000)
    assert.equal(decideForAccount(old, NOW).allowed, true)
  })

  it('counts a failure right on the edge as gone', () => {
    const edge = [new Date(NOW.getTime() - THROTTLE.windowMs)]
    assert.equal(decideForAccount([...edge, ...failures(4)], NOW).allowed, true)
  })

  it('still counts older failures inside it towards the total', () => {
    // Four fumbles earlier in the window plus one just now is five, and
    // the fifth is the one that earns a wait. The earlier four only
    // matter if the window is actually being consulted.
    const earlier = failures(4, THROTTLE.windowMs - 60_000)
    const justNow = failures(1, 1000)
    assert.equal(decideForAccount([...earlier, ...justNow], NOW).allowed, false)

    // The same recent failure on its own is nothing to answer for.
    assert.equal(decideForAccount(justNow, NOW).allowed, true)
  })
})

describe('an office behind one address', () => {
  it('is not locked out by ordinary fumbling', () => {
    // Everyone here shares an IP. Twenty people getting it wrong in a
    // quarter of an hour must not shut the building out.
    assert.equal(decideForAddress(failures(20), NOW).allowed, true)
  })

  it('is stopped once it looks like a list being worked through', () => {
    const decision = decideForAddress(failures(THROTTLE.addressAttempts), NOW)
    assert.equal(decision.allowed, false)
    assert.ok(decision.retryAfterSeconds > 0)
  })

  it('is let go again after the window', () => {
    const old = failures(THROTTLE.addressAttempts, THROTTLE.windowMs + 1000)
    assert.equal(decideForAddress(old, NOW).allowed, true)
  })
})

describe('the wait, said out loud', () => {
  it('uses seconds while it is short', () => {
    assert.equal(describeWait(1), '1 second')
    assert.equal(describeWait(45), '45 seconds')
  })

  it('uses minutes once it is not', () => {
    assert.equal(describeWait(60), '1 minute')
    assert.equal(describeWait(90), '2 minutes')
  })
})

describe('the decision does not depend on the order it is given', () => {
  it('reads shuffled failures the same as sorted ones', () => {
    // A database returns rows in whatever order it likes.
    const sorted = failures(7)
    const shuffled = [...sorted].reverse()
    assert.deepEqual(decideForAccount(shuffled, NOW), decideForAccount(sorted, NOW))
  })
})
