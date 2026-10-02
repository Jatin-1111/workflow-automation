/**
 * The frame every Overview view sits in: one width, the tabs on top.
 *
 * Each of the four pages used to choose its own width — Now 1280px, Reports
 * 1152px, Projects and Team 1024px — and centre itself, so the tab row slid
 * sideways every time a tab was clicked, and the narrower pages jumped in
 * from their full-width loading screen. They share this frame now, at the
 * width of the header above it, so switching tabs moves nothing but the
 * content.
 */

import { OverviewTabs } from './overview-tabs'

export function OverviewPage({
  current,
  children,
}: {
  /** The tab this page is, by its route. */
  current: string
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <OverviewTabs current={current} />
      {children}
    </main>
  )
}
