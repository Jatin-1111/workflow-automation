/**
 * Parsing what someone typed into the search box (spec §48).
 *
 * Pure, so the awkward parts — a permanent id pasted in, a regex character
 * typed by accident — are settled and tested away from the database.
 */

import { parseId } from '@/lib/ids/format'
import type { EntityKind } from '@/lib/types/ids'

export interface ParsedSearch {
  /** The trimmed text, as typed. */
  term: string
  /** Set when the whole term is a permanent id, e.g. `BO-USR-00001`. */
  exactId?: { kind: EntityKind; id: string }
  /** Safe to hand to MongoDB as a case-insensitive contains match. */
  pattern: RegExp
  usable: boolean
}

/** The shortest term worth running: one letter would match nearly everything. */
export const MIN_SEARCH_LENGTH = 2

/**
 * Escape everything a regular expression treats as special.
 *
 * The term goes straight into a MongoDB regex, so a stray `(` would otherwise
 * be a syntax error and `.*` would be a way to match every record there is.
 */
export function escapeForRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseSearch(raw: string | undefined | null): ParsedSearch {
  const term = (raw ?? '').trim()
  const pattern = new RegExp(escapeForRegex(term), 'i')

  if (term.length < MIN_SEARCH_LENGTH) {
    return { term, pattern, usable: false }
  }

  // A pasted id is nearly always someone navigating, not searching.
  const parsed = parseId(term.toUpperCase())
  return {
    term,
    pattern,
    usable: true,
    exactId: parsed ? { kind: parsed.kind, id: term.toUpperCase() } : undefined,
  }
}

/** Where an exact id should take you, when there is a page for it. */
export function destinationForId(kind: EntityKind, id: string): string | null {
  switch (kind) {
    case 'task':
      return `/tasks/${id}`
    case 'project':
      return `/projects/${id}`
    case 'user':
      return `/team/${id}`
    default:
      return null
  }
}
