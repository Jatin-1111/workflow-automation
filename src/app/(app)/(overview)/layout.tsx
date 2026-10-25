/**
 * The tabs the four Overview views share.
 *
 * Drawn once so they stay where they are while the view beneath them loads:
 * they used to be drawn by each page, and vanished with it on every click.
 * The width is the signed-in layout's, which is what makes the tab row sit
 * at the same position on all four.
 */

import { OverviewTabs } from '@/features/management/overview-tabs'

export default function OverviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OverviewTabs />
      {children}
    </>
  )
}
