import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/dal'
import { landingPath } from '@/lib/auth/permissions'
import { LoginForm } from '@/features/auth/login-form'

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  // An active session skips the form. A deactivated account falls through to it,
  // which is why the proxy does not redirect authenticated users away.
  const user = await getCurrentUser()
  if (user) redirect(landingPath(user.accessLevel))

  const { next } = await searchParams
  const nextPath = typeof next === 'string' ? next : undefined

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight">Business Orbit</h1>
          <p className="mt-1 text-sm text-muted">
            Internal workflow operating system
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <LoginForm next={nextPath} />
        </div>
      </div>
    </main>
  )
}
