import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  AA_NORMAL_TEXT,
  CLEARLY_DIFFERENT,
  colorDifference,
  contrastRatio,
  parseHex,
} from './contrast'

/**
 * The palette, read from the stylesheet that actually ships.
 *
 * Reading the CSS rather than a duplicate table in TypeScript is the point:
 * a copy would let the two drift, and it is the shipped value whose contrast
 * anybody actually experiences.
 */
const CSS = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')

const TOKENS = new Map<string, string>(
  [...CSS.matchAll(/^\s*--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6});/gm)].map(
    (match) => [match[1], match[2]],
  ),
)

function token(name: string): string {
  const value = TOKENS.get(name)
  assert.ok(value, `--${name} is missing from globals.css`)
  return value
}

const WHITE = '#ffffff'

describe('the palette parses at all', () => {
  it('found the tokens', () => {
    assert.ok(TOKENS.size > 30, `only parsed ${TOKENS.size} tokens`)
  })

  it('is written in plain ASCII hex', () => {
    // A Devanagari digit slipped into a hex value twice during this build.
    // Both times it parsed as a colour somewhere and rendered as nothing.
    for (const [name, value] of TOKENS) {
      assert.match(value, /^#[0-9a-f]{6}$/i, `--${name} is ${value}`)
      assert.doesNotThrow(() => parseHex(value), `--${name} is ${value}`)
    }
  })
})

describe('text is legible on the surface it sits on', () => {
  const onWhite = ['foreground', 'muted', 'subtle', 'accent']

  for (const name of onWhite) {
    it(`--${name} clears AA on white`, () => {
      const ratio = contrastRatio(token(name), WHITE)
      assert.ok(
        ratio >= AA_NORMAL_TEXT,
        `--${name} ${token(name)} is ${ratio.toFixed(2)}:1, needs ${AA_NORMAL_TEXT}`,
      )
    })
  }

  it('the page background is light enough for the same inks', () => {
    // Not every panel is white; the canvas carries text too.
    const ratio = contrastRatio(token('muted'), token('background'))
    assert.ok(ratio >= AA_NORMAL_TEXT, `${ratio.toFixed(2)}:1`)
  })
})

describe('a status pill is legible on its own tint', () => {
  const STATUSES = ['action', 'progress', 'waiting', 'overdue', 'complete', 'neutral']

  for (const status of STATUSES) {
    it(`${status} ink on ${status} tint`, () => {
      const ink = token(`status-${status}`)
      const tint = token(`status-${status}-soft`)
      const ratio = contrastRatio(ink, tint)
      assert.ok(
        ratio >= AA_NORMAL_TEXT,
        `${ink} on ${tint} is ${ratio.toFixed(2)}:1, needs ${AA_NORMAL_TEXT}`,
      )
    })
  }
})

describe('a project chip is legible on its own tint', () => {
  const LABELS = [
    'slate',
    'blue',
    'teal',
    'green',
    'amber',
    'rose',
    'purple',
    'cyan',
  ]

  for (const label of LABELS) {
    it(`${label} ink on ${label} tint`, () => {
      const ratio = contrastRatio(token(`label-${label}`), token(`label-${label}-soft`))
      assert.ok(ratio >= AA_NORMAL_TEXT, `${ratio.toFixed(2)}:1`)
    })
  }
})

describe('a primary button carries its own label', () => {
  it('white on the accent', () => {
    const ratio = contrastRatio(WHITE, token('accent'))
    assert.ok(ratio >= AA_NORMAL_TEXT, `${ratio.toFixed(2)}:1`)
  })

  it('and still does when hovered or pressed', () => {
    // A hover that drops below the bar is a button that becomes unreadable
    // exactly while somebody is pointing at it.
    for (const name of ['accent-hover', 'accent-strong']) {
      const ratio = contrastRatio(WHITE, token(name))
      assert.ok(ratio >= AA_NORMAL_TEXT, `--${name} ${ratio.toFixed(2)}:1`)
    }
  })
})

describe('colours that mean different things look different', () => {
  it('the brand does not impersonate a status', () => {
    // The point of moving off navy: the one colour that means "you can press
    // this" must not read as the colour that means "in progress".
    const accent = token('accent')
    for (const status of ['progress', 'action', 'overdue', 'complete', 'waiting']) {
      const difference = colorDifference(accent, token(`status-${status}`))
      assert.ok(
        difference >= CLEARLY_DIFFERENT,
        `accent is only ${difference.toFixed(1)} from status-${status}`,
      )
    }
  })

  it('no two statuses could be taken for each other', () => {
    const statuses = ['action', 'progress', 'waiting', 'overdue', 'complete']
    for (const [i, a] of statuses.entries()) {
      for (const b of statuses.slice(i + 1)) {
        const difference = colorDifference(token(`status-${a}`), token(`status-${b}`))
        assert.ok(
          difference >= CLEARLY_DIFFERENT,
          `${a} and ${b} are only ${difference.toFixed(1)} apart`,
        )
      }
    }
  })

  it('the eight project colours are actually eight colours', () => {
    // The token file claims more than eight "stops being distinguishable and
    // starts being decoration". That only holds if the eight are themselves
    // distinguishable, which nothing until now checked.
    const labels = ['slate', 'blue', 'teal', 'green', 'amber', 'rose', 'purple', 'cyan']
    for (const [i, a] of labels.entries()) {
      for (const b of labels.slice(i + 1)) {
        const difference = colorDifference(token(`label-${a}`), token(`label-${b}`))
        assert.ok(
          difference >= CLEARLY_DIFFERENT,
          `${a} and ${b} are only ${difference.toFixed(1)} apart`,
        )
      }
    }
  })
})

describe('the stage ramp', () => {
  const ramp = [1, 2, 3, 4, 5, 6].map((n) => token(`stage-${n}`))

  it('has a distinct colour at every stop', () => {
    assert.equal(new Set(ramp.map((c) => c.toLowerCase())).size, ramp.length)
  })

  it('steps far enough between neighbours to read as a progression', () => {
    // Adjacent columns sit next to each other, so these are the pairs that
    // have to be separable. A lower bar than CLEARLY_DIFFERENT on purpose:
    // the ramp is meant to look like one arc, not six unrelated colours.
    for (let i = 1; i < ramp.length; i += 1) {
      const step = colorDifference(ramp[i - 1], ramp[i])
      assert.ok(step >= 8, `stage ${i} and ${i + 1} are only ${step.toFixed(1)} apart`)
    }
  })

  it('travels somewhere, rather than wandering back', () => {
    // First to last should be an unmistakable change: the whole claim is that
    // the arc points at "done".
    const travelled = colorDifference(ramp[0], ramp[ramp.length - 1])
    assert.ok(travelled >= 60, `the ramp only covers ${travelled.toFixed(1)}`)
  })

  it('never lands on white, which would erase a column cap', () => {
    for (const stop of ramp) {
      assert.ok(contrastRatio(stop, WHITE) >= 2, `${stop} is nearly invisible on white`)
    }
  })

  it('starts on the brand, so a board opens where the product does', () => {
    assert.equal(token('stage-1').toLowerCase(), token('accent').toLowerCase())
  })
})
