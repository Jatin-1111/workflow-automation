'use client'

/**
 * The frame that lets the sidebar fold to an icon rail on a wide screen.
 *
 * Expanded is the default and the state everyone starts in: the labels are
 * how people learn the product. The rail is opt-in, for somebody who knows
 * where everything is and wants the width back, and the choice is kept in a
 * cookie so the server draws the right one on the next visit instead of
 * flashing the wrong one first.
 *
 * Only the wide layout has a rail. Below `lg` the sidebar is already a bar
 * across the top, so the state is ignored there.
 */

import { createContext, useCallback, useContext, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { SIDEBAR_COOKIE } from './sidebar-cookie'

const SidebarContext = createContext({ collapsed: false, toggle: () => {} })

/** Whether the sidebar is currently the rail. Read by the parts that change. */
export function useSidebarCollapsed() {
  return useContext(SidebarContext).collapsed
}

export function ShellFrame({
  initialCollapsed,
  sidebar,
  children,
}: {
  initialCollapsed: boolean
  /** Drawn by the server, so it is passed in rather than imported here. */
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)

  const toggle = useCallback(() => {
    const next = !collapsed
    setCollapsed(next)
    // Outside the state updater: React may run an updater twice, and a
    // cookie write is not something to repeat.
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 'rail' : 'full'}; path=/; max-age=31536000; samesite=lax`
  }, [collapsed])

  return (
    <SidebarContext value={{ collapsed, toggle }}>
      <div
        data-sidebar={collapsed ? 'rail' : 'full'}
        className="group/shell transition-[grid-template-columns] duration-200 ease-(--ease) lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:data-[sidebar=rail]:grid-cols-[4.5rem_minmax(0,1fr)]"
      >
        {sidebar}
        {children}
      </div>
    </SidebarContext>
  )
}

/** The control that folds the sidebar. Wide screens only. */
export function SidebarToggle() {
  const { collapsed, toggle } = useContext(SidebarContext)
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const Glyph = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={!collapsed}
      aria-controls="app-sidebar"
      aria-label={label}
      title={label}
      className="transition-ui hidden h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted hover:bg-sidebar-hover hover:text-foreground active:scale-[0.98] lg:flex lg:group-data-[sidebar=rail]/shell:justify-center lg:group-data-[sidebar=rail]/shell:px-0"
    >
      <span
        aria-hidden
        className="flex w-3 shrink-0 justify-center lg:group-data-[sidebar=rail]/shell:w-auto [&>svg]:shrink-0"
      >
        <Glyph size={16} strokeWidth={1.75} />
      </span>
      <span className="lg:group-data-[sidebar=rail]/shell:sr-only">Collapse</span>
    </button>
  )
}
