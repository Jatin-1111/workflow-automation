import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'

/**
 * Placeholder for the management dashboard (spec §16). Guarded by capability,
 * so an employee who types the URL is turned away by the data layer rather
 * than by a hidden nav link.
 */
export default async function ManagementDashboardPage() {
  const user = await requireCapability('management.view_dashboard')

  return (
    <AppShell user={user} current="/dashboard">
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Management Overview</h1>
        <p className="mt-1 text-sm text-muted">
          Active workflows, approvals, overdue work and team workload arrive in
          Phase 6.
        </p>
        <Link
          href="/my-work"
          className="mt-6 inline-block text-sm text-accent underline-offset-4 hover:underline"
        >
          Go to My Work
        </Link>
      </main>
    </AppShell>
  )
}
