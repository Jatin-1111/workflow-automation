'use client'

/**
 * A header link that knows when it is the page being shown.
 *
 * The header is drawn once and survives navigation, so "is this the current
 * page" is read from the address on the client rather than told by each
 * page on the server.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navSectionFor } from './nav-section'

export function ShellLink({
  href,
  label,
  className,
  activeClassName = '',
  idleClassName = '',
  children,
}: {
  href: string
  /** For a link drawn as an icon alone. */
  label?: string
  className: string
  activeClassName?: string
  idleClassName?: string
  children: React.ReactNode
}) {
  const active = navSectionFor(usePathname()) === href
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`${className} ${active ? activeClassName : idleClassName}`}
    >
      {children}
    </Link>
  )
}
