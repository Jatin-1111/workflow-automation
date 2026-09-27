/**
 * Contrast, so the palette's promises can be checked rather than believed.
 *
 * Every ink in the token set is claimed to clear WCAG AA on white and on its
 * own tint. That claim was true when each colour was chosen and there is
 * nothing stopping the next person from nudging a hex until it is not, so it
 * is worth being able to compute.
 *
 * Pure and dependency-free: it takes hex strings and returns a number.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Accepts `#rgb` and `#rrggbb`, in either case. */
export function parseHex(hex: string): Rgb {
  const body = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]+$/.test(body) || (body.length !== 3 && body.length !== 6)) {
    throw new Error(`Not a hex colour: ${hex}`)
  }
  const full =
    body.length === 3
      ? body
          .split('')
          .map((c) => c + c)
          .join('')
      : body
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

/** The sRGB inverse companding WCAG specifies, not a plain divide by 255. */
function channel(value: number): number {
  const s = value / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** The WCAG 2 ratio, between 1 and 21, order-independent. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

/** AA for body text. Large text and non-text have lower bars we do not use. */
export const AA_NORMAL_TEXT = 4.5

/* -------------------------------------------------------------------------
 * Telling two colours apart
 *
 * Contrast ratio answers "can I read this on that", and it is the wrong
 * question for "are these two the same colour". It measures lightness alone,
 * so indigo against red scores 1.03:1 — near-identical by that measure, and
 * obviously different to anybody looking. Distinguishability needs a
 * perceptual metric, so: CIE L*a*b* and the CIE76 difference.
 * ---------------------------------------------------------------------- */

interface Lab {
  L: number
  a: number
  b: number
}

/** D65, the white point sRGB is defined against. */
const WHITE_POINT = { x: 95.047, y: 100.0, z: 108.883 }

function pivot(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29
}

export function toLab(hex: string): Lab {
  const { r, g, b } = parseHex(hex)
  const lin = [r, g, b].map((v) => {
    const s = v / 255
    return (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4) * 100
  })
  const [R, G, B] = lin
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / WHITE_POINT.x
  const y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / WHITE_POINT.y
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / WHITE_POINT.z
  const [fx, fy, fz] = [pivot(x), pivot(y), pivot(z)]
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

/**
 * CIE76 colour difference.
 *
 * Roughly: 1 is the smallest difference a person can see under ideal
 * conditions, 10 is a clear difference, and anything past about 25 is
 * plainly a different colour. CIE76 over CIEDE2000 on purpose — it is a
 * plain distance with no special cases, and the thresholds this codebase
 * cares about are coarse enough that the extra accuracy buys nothing.
 */
export function colorDifference(a: string, b: string): number {
  const first = toLab(a)
  const second = toLab(b)
  return Math.hypot(first.L - second.L, first.a - second.a, first.b - second.b)
}

/** Two colours nobody would mistake for each other at a glance. */
export const CLEARLY_DIFFERENT = 25
