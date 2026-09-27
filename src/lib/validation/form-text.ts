/**
 * Free text arriving from a form, bounded.
 *
 * Of 93 inputs in the app, 14 carried a maxLength and the server bounded
 * two fields in total. Everything else — every description, every comment,
 * every reason somebody was given for reassigning work — would store
 * whatever a request could carry. A pasted document in a comment becomes a
 * Mongo document nobody can read and a timeline nobody can scroll.
 *
 * Not a type check. coerceFieldValue reads a stage's declared answers;
 * this is for the fixed text fields the product's own forms collect, where
 * the only question is whether it is present and whether it is sane.
 *
 * Pure, and takes the raw value rather than a FormData, so the rules can
 * be tested without building a request.
 */

/**
 * What to call a field in a sentence somebody reads.
 *
 * Most input names already read as words. These are the ones that do not:
 * "The body must be 5000 characters or fewer" is the form's vocabulary
 * leaking out, and nobody thinks of what they typed as a body.
 */
const LABELS: Record<string, string> = {
  body: 'comment',
  photoUrl: 'photo link',
  roleIds: 'roles',
  memberIds: 'team members',
}

/** Turn a form field name into something readable in a sentence. */
function humanise(field: string): string {
  return (
    LABELS[field] ??
    field
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
  )
}

/**
 * The first field that is longer than it is allowed to be.
 *
 * Returns a message, or null when everything fits. One message rather than
 * a list because these forms carry a handful of fields and the caller has
 * one place to show it — and because over-length text is nearly always a
 * paste into a single box rather than a form filled in wrongly throughout.
 *
 * A field the form did not carry is not checked. A narrow form that omits
 * `description` must not be told its description is too long.
 */
export function tooLong(
  formData: Pick<FormData, 'get' | 'has'>,
  limits: Record<string, number>,
): string | null {
  for (const [field, limit] of Object.entries(limits)) {
    if (!formData.has(field)) continue

    const raw = formData.get(field)
    if (typeof raw !== 'string') continue

    if (raw.trim().length > limit) {
      return `The ${humanise(field)} must be ${limit} characters or fewer.`
    }
  }
  return null
}

/**
 * A required piece of text, trimmed and bounded.
 *
 * Returns null when it is missing or too long, which is the shape the
 * admin actions already expect from readName.
 */
export function requiredText(raw: unknown, limit: number): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (value.length === 0 || value.length > limit) return null
  return value
}

/**
 * An optional piece of text: trimmed, undefined when blank.
 *
 * Takes no limit, deliberately. An earlier version truncated to one, which
 * is the silent data loss this whole exercise exists to remove — somebody
 * pastes a paragraph, the form says it saved, and the end of it is gone.
 * Bounding is `tooLong`'s job and it refuses out loud; this runs after it.
 */
export function optionalText(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value.length > 0 ? value : undefined
}
