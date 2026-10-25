'use client'

/**
 * Search, in the header on a wide screen and one tap away on a narrow one.
 *
 * Two gaps this closes. On a phone the box was simply hidden, so somebody
 * who knew the name of what they wanted had no way to look for it. And for
 * somebody who lives in the product, reaching for the mouse to search is the
 * slowest part of the day: `/` now focuses the box from anywhere, the way it
 * does in most tools people already use, and the key is shown in the box so
 * it can be discovered.
 *
 * Uses next/form so a search is a navigation inside the app, not a reload
 * that redraws the header.
 */

import Form from 'next/form'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Typing somewhere else must never be interrupted by a shortcut. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}

export function HeaderSearch() {
  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return
      // The box is hidden below `md`; focusing something invisible would
      // swallow the keystroke and show nothing.
      if (!input.current || input.current.offsetParent === null) return
      event.preventDefault()
      input.current.focus()
      input.current.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <Form action="/search" className="relative mx-auto hidden w-full max-w-md md:block">
        <Search
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
        />
        <input
          ref={input}
          type="search"
          name="q"
          placeholder="Search or paste an ID"
          aria-label="Search Business Orbit"
          aria-keyshortcuts="/"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => setEmpty(event.target.value.length === 0)}
          className="h-9 w-full rounded-md border border-border bg-surface-sunken pl-9 pr-9 text-sm text-foreground transition-ui placeholder:text-subtle hover:border-border-strong focus-visible:border-accent focus-visible:bg-surface"
        />
        {empty && !focused ? (
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-surface px-1.5 font-mono text-[0.6875rem] leading-5 text-subtle"
          >
            /
          </kbd>
        ) : null}
      </Form>

      <Link
        href="/search"
        aria-label="Search"
        className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition-ui hover:bg-black/[0.045] hover:text-foreground md:hidden"
      >
        <Search size={18} strokeWidth={1.75} aria-hidden />
      </Link>
    </>
  )
}
