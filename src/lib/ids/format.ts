/** Formatting and parsing of `BO-XXX-00000` identifiers. Pure — no I/O. */

import {
  ENTITY_KINDS,
  ID_SEQUENCE_WIDTH,
  type EntityId,
  type EntityKind,
  type EntityPrefix,
} from '@/lib/types/ids'

export const ID_NAMESPACE = 'BO'

const PREFIX_TO_KIND = Object.fromEntries(
  Object.entries(ENTITY_KINDS).map(([kind, prefix]) => [prefix, kind]),
) as Record<EntityPrefix, EntityKind>

// String.raw keeps the `\d` escape intact; a plain template literal would swallow it.
const ID_PATTERN = new RegExp(
  String.raw`^${ID_NAMESPACE}-([A-Z]{3})-(\d{${ID_SEQUENCE_WIDTH},})$`,
)

/** Build an id from a kind and sequence number, e.g. `BO-USR-00001`. */
export function formatId<K extends EntityKind>(
  kind: K,
  sequence: number,
): EntityId<K> {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Id sequence must be a positive integer, received ${sequence}`)
  }
  const padded = String(sequence).padStart(ID_SEQUENCE_WIDTH, '0')
  return `${ID_NAMESPACE}-${ENTITY_KINDS[kind]}-${padded}` as EntityId<K>
}

/** Split an id back into its kind and sequence, or `null` if malformed. */
export function parseId(
  id: string,
): { kind: EntityKind; sequence: number } | null {
  const match = ID_PATTERN.exec(id)
  if (!match) return null
  const kind = PREFIX_TO_KIND[match[1] as EntityPrefix]
  if (!kind) return null
  return { kind, sequence: Number(match[2]) }
}

/** Narrow an untrusted string to an id of a specific kind. */
export function isEntityId<K extends EntityKind>(
  id: string,
  kind: K,
): id is EntityId<K> {
  return parseId(id)?.kind === kind
}
