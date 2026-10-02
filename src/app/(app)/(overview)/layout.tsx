/**
 * The frame the four Overview views share: one width, the tabs on top.
 *
 * Each view used to draw its own frame at its own width — Now 1280px,
 * Reports 1152px, Projects and Team 1024px — so the tab row slid sideways on
 * every click, and the tabs vanished with the rest of the page while the next
 * view loaded. Here they are drawn once and stay where they are; only the
 * view beneath them changes.
 */

import { OverviewTabs } from '@/features/management/overview-tabs'

export default function OverviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <OverviewTabs />
      {children}
    </main>
  )
}
