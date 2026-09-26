/**
 * A project's colour.
 *
 * Stored as the name of a palette entry rather than a hex value, so a project
 * cannot carry a colour the interface has no styling for, and so the palette
 * can be retuned in one place without rewriting records.
 */

export const LABEL_COLORS = [
  'slate',
  'blue',
  'teal',
  'green',
  'amber',
  'rose',
  'purple',
  'cyan',
] as const

export type LabelColor = (typeof LABEL_COLORS)[number]

export function isLabelColor(value: unknown): value is LabelColor {
  return LABEL_COLORS.includes(value as LabelColor)
}

/**
 * A colour for a project that has not been given one.
 *
 * Derived from the id rather than random, so the same project keeps the same
 * colour on every screen and after every restart.
 */
export function fallbackColor(seed: string): LabelColor {
  let total = 0
  for (const character of seed) total += character.charCodeAt(0)
  return LABEL_COLORS[total % LABEL_COLORS.length]
}
