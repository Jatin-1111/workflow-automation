'use client'

/**
 * What somebody sees when a page fails.
 *
 * Previously an unhandled error showed Next's own screen, which says nothing
 * about this platform and offers no way back. The message here does not repeat
 * the exception — it is rarely meaningful to the reader, and it can carry
 * details from the server that should not be on screen.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { buttonClass } from '@/features/ui/primitives'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // The digest is how this instance is found in the server logs.
    console.error('Page failed:', error.digest ?? error.message)
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-20 text-center">
      <span
        aria-hidden
        className="mb-4 flex size-11 items-center justify-center rounded-full bg-status-overdue-soft text-status-overdue"
      >
        <TriangleAlert size={20} strokeWidth={1.75} />
      </span>

      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        That page did not load
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Something went wrong on our side. Nothing you were doing has been lost —
        work is only recorded when you complete a stage.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={reset} className={buttonClass('primary', 'md')}>
          <RotateCw size={16} strokeWidth={1.75} aria-hidden />
          Try again
        </button>
        <Link href="/my-work" className={buttonClass('secondary', 'md')}>
          Back to My Work
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-subtle">
          Reference {error.digest}
        </p>
      ) : null}
    </main>
  )
}
