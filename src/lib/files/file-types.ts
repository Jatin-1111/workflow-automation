/**
 * What an uploaded file may be, and how it is served back.
 *
 * One list, used twice: uploads are accepted only for these extensions, and a
 * download takes its `Content-Type` from the same list. The browser's own claim
 * about a file's type is never trusted on the way back out. An upload named
 * `chart.png` that is really a web page, labelled `text/html`, would otherwise
 * run as a page on this application's own origin for whoever opened it.
 *
 * Nothing here can run as a page or a script (no HTML, SVG, XML or JS), and
 * anything not listed is served as an opaque download.
 *
 * No `server-only` import: this is pure, so tests can call it directly.
 */

import { extname } from 'node:path'

interface FileType {
  mime: string
  /** Safe for the browser to show in place rather than save. */
  inline: boolean
}

// A Map, not an object: an upload named `x.constructor` must not find a
// property on Object.prototype and be mistaken for an accepted type.
const FILE_TYPES: ReadonlyMap<string, FileType> = new Map([
  ['pdf', { mime: 'application/pdf', inline: true }],
  ['doc', { mime: 'application/msword', inline: false }],
  [
    'docx',
    {
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      inline: false,
    },
  ],
  ['xls', { mime: 'application/vnd.ms-excel', inline: false }],
  [
    'xlsx',
    {
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      inline: false,
    },
  ],
  ['csv', { mime: 'text/csv; charset=utf-8', inline: false }],
  ['ppt', { mime: 'application/vnd.ms-powerpoint', inline: false }],
  [
    'pptx',
    {
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      inline: false,
    },
  ],
  ['txt', { mime: 'text/plain; charset=utf-8', inline: true }],
  ['png', { mime: 'image/png', inline: true }],
  ['jpg', { mime: 'image/jpeg', inline: true }],
  ['jpeg', { mime: 'image/jpeg', inline: true }],
  ['webp', { mime: 'image/webp', inline: true }],
  ['gif', { mime: 'image/gif', inline: true }],
])

/** Extensions an upload may carry, whatever a template's slot asks for (spec §39). */
export const ACCEPTED_EXTENSIONS: ReadonlySet<string> = new Set(FILE_TYPES.keys())

export function extensionOf(fileName: string): string {
  return extname(fileName).replace('.', '').toLowerCase()
}

/**
 * A `Content-Disposition` value that survives any filename.
 *
 * The plain `filename` is ASCII only, with quotes, backslashes and anything a
 * header cannot carry replaced, so it can neither break out of its quotes nor
 * carry a line break. `filename*` holds the real name for browsers that read it.
 */
function contentDisposition(kind: 'inline' | 'attachment', fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\%]/g, '_')
  let encoded: string | null = null
  try {
    encoded = encodeURIComponent(fileName).replace(
      /['()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    )
  } catch {
    // A lone surrogate cannot be encoded; the ASCII name still works.
  }
  return encoded
    ? `${kind}; filename="${fallback}"; filename*=UTF-8''${encoded}`
    : `${kind}; filename="${fallback}"`
}

/** Every header a file download carries. */
export function fileResponseHeaders(
  fileName: string,
  byteLength: number,
): Record<string, string> {
  const type = FILE_TYPES.get(extensionOf(fileName))
  return {
    'Content-Type': type?.mime ?? 'application/octet-stream',
    'Content-Length': String(byteLength),
    'Content-Disposition': contentDisposition(type?.inline ? 'inline' : 'attachment', fileName),
    // The type above is the truth; the browser is not to guess a different one.
    'X-Content-Type-Options': 'nosniff',
    // A document belongs to the person who was allowed to fetch it.
    'Cache-Control': 'private, no-store',
  }
}
