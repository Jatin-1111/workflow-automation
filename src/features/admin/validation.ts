/**
 * Checks the admin forms need, kept out of the server-action module so they
 * can be called from a test. A `'use server'` file may only export async
 * functions, which is not a reason to leave validation unproven.
 */

/**
 * A link to a photograph, not an upload.
 *
 * Restricted to http(s): the value ends up in an image `src`, and a
 * `javascript:` or `data:` URL there is something the browser will act on.
 * Anything else is dropped rather than refused — a bad avatar link should not
 * stop somebody being added.
 */
export function safePhotoUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}
