'use client'

/**
 * Ask before leaving a page that holds unsaved work.
 *
 * The workflow builder keeps everything in memory until Save, and clicking
 * Board halfway through building one threw away every stage, role and field
 * without a word. Two ways out are covered:
 *
 * - closing the tab, reloading, or typing an address: the browser's own
 *   "Leave site?" prompt, through `beforeunload`;
 * - clicking any link inside the app: a confirm, checked in the capture
 *   phase on the document so it runs before Next's `<Link>` handler. Next 16
 *   offers `onNavigate` only per link, and the links that matter here (the
 *   header and navigation) belong to the layout, not to this page.
 *
 * The browser's Back button is not covered: the app router has already
 * changed the address by the time anything here could ask.
 */

import { useEffect } from 'react'

const QUESTION = 'You have changes that are not saved. Leave and lose them?'

/** A plain left click on a link that would take the page somewhere else. */
function leavingLink(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0) return null
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null

  const link = (event.target as Element | null)?.closest?.('a[href]')
  if (!(link instanceof HTMLAnchorElement)) return null
  if (link.target && link.target !== '_self') return null
  if (link.hasAttribute('download')) return null

  const destination = new URL(link.href, window.location.href)
  const here = new URL(window.location.href)
  // A link to a spot on this same page leaves nothing behind.
  if (
    destination.origin === here.origin &&
    destination.pathname === here.pathname &&
    destination.search === here.search
  ) {
    return null
  }
  return link
}

export function useLeaveWarning(unsaved: boolean): void {
  useEffect(() => {
    if (!unsaved) return

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Still needed by some browsers to show the prompt at all.
      event.returnValue = ''
    }

    const click = (event: MouseEvent) => {
      if (!leavingLink(event)) return
      if (window.confirm(QUESTION)) return
      event.preventDefault()
      event.stopPropagation()
    }

    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', click, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', click, true)
    }
  }, [unsaved])
}
