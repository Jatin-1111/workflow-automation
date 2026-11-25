/**
 * The cookie that remembers whether the sidebar is folded to its icon rail.
 *
 * Its own file, not an export of the client component that writes it: a server
 * component importing a constant from a 'use client' module is handed a
 * reference to it, not the string, so the cookie would never be found.
 */
export const SIDEBAR_COOKIE = 'bo-sidebar'
