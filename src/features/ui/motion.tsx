'use client'

/**
 * Motion shared by every feature, using the same curve and durations as the
 * CSS tokens in globals.css (--ease, --duration-fast, --duration), so a Motion
 * animation and a CSS transition read as one system.
 *
 * Reduced motion is handled once here: with the user's setting on, transforms
 * are dropped and only opacity animates, which is gentler rather than absent.
 */

import { MotionConfig } from 'motion/react'

/** Matches --ease in globals.css. */
export const EASE = [0.16, 1, 0.3, 1] as const

export const DURATION = { fast: 0.15, base: 0.2, slow: 0.3 } as const

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
