/**
 * Route gate.
 *
 * Runs on every request, so it only reads the session cookie - never the
 * database (see the Proxy guidance in the Next.js authentication guide). It is
 * an optimistic pre-filter; real authorization lives in `src/lib/auth/dal.ts`.
 *
 * Authenticated users are deliberately NOT redirected away from `/login`. That
 * is what lets a deactivated account, whose cookie is still valid, reach the
 * login page instead of bouncing between it and a dashboard it cannot open.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/token'

/** Reachable without a session. Everything else requires one. */
const PUBLIC_PATHS = ['/login', '/no-access']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  )
  if (session) return NextResponse.next()

  const loginUrl = new URL('/login', request.nextUrl)
  // Preserve where they were headed so login can return them there.
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
