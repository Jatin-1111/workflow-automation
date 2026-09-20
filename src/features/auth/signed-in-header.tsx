import { LogoutButton } from './logout-button'
import type { PublicUser } from '@/lib/types/user'

/**
 * Minimal signed-in header. The full navigation shell (spec §47) arrives with
 * the My Work dashboard; this exists so every protected page can show who is
 * signed in.
 */
export function SignedInHeader({ user }: { user: PublicUser }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <span className="text-sm font-semibold tracking-tight">Business Orbit</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">
            {user.name}
            <span className="text-subtle"> · {user.userId}</span>
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
