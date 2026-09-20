import { requireUser } from '@/lib/auth/dal'
import { CAPABILITIES_BY_ACCESS_LEVEL } from '@/lib/auth/permissions'
import { SignedInHeader } from '@/features/auth/signed-in-header'

/** Placeholder. The real My Work dashboard (spec §7–§10) lands in Phase 4. */
export default async function MyWorkPage() {
  const user = await requireUser()
  const capabilities = CAPABILITIES_BY_ACCESS_LEVEL[user.accessLevel]

  return (
    <>
      <SignedInHeader user={user} />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-xl font-semibold tracking-tight">My Work</h1>
        <p className="mt-1 text-sm text-muted">
          Signed in as {user.name} ({user.accessLevel}). Assigned work appears
          here once the workflow engine is running.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-subtle">
              User ID
            </dt>
            <dd className="mt-1 font-mono text-sm">{user.userId}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-subtle">
              Workflow roles
            </dt>
            <dd className="mt-1 font-mono text-sm">{user.roleIds.join(', ')}</dd>
          </div>
        </dl>

        <section className="mt-8 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-subtle">
            Capabilities granted by this access level
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {capabilities.map((capability) => (
              <li
                key={capability}
                className="rounded border border-border bg-accent-soft px-2 py-1 font-mono text-xs text-accent"
              >
                {capability}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}
