/**
 * A page, task or workflow that is not there.
 *
 * Deliberately says nothing about whether the record exists: the download
 * route and the task pages answer 404 both for a missing record and for one
 * the viewer may not see, and this page must not undo that by implying the
 * difference.
 */

import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { buttonClass } from '@/features/ui/primitives'

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-20 text-center">
      <span
        aria-hidden
        className="mb-4 flex size-11 items-center justify-center rounded-full bg-surface-sunken text-muted"
      >
        <FileQuestion size={20} strokeWidth={1.75} />
      </span>

      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Not found
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        This page does not exist, or it belongs to work you are not part of.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link href="/my-work" className={buttonClass('primary', 'md')}>
          Back to My Work
        </Link>
        <Link href="/search" className={buttonClass('secondary', 'md')}>
          Search
        </Link>
      </div>
    </main>
  )
}
