/**
 * Management panels.
 *
 * Thin wrappers over the shared kit, kept so the many management pages that
 * already import them do not each need to know about the kit directly.
 */

import { Empty, Panel } from '@/features/ui/primitives'

export function Section({
  title,
  count,
  description,
  children,
}: {
  title: string
  count?: number
  description?: string
  children: React.ReactNode
}) {
  return (
    <Panel title={title} count={count} description={description}>
      {children}
    </Panel>
  )
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <Empty>{children}</Empty>
}
