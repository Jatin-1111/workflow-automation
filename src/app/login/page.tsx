import { redirect } from 'next/navigation'
import { Orbit } from 'lucide-react'
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
    <main id="main" className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            aria-hidden
            className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent text-white shadow-lift"
          >
            <Orbit size={26} strokeWidth={1.75} />
          </span>
          <h1 className="text-[1.625rem] font-bold leading-8 sm:text-[2rem] sm:leading-9 tracking-[-0.02em]">Business Orbit</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in to see what needs you.</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-lift">
          <LoginForm next={nextPath} />
        </div>
      </div>
    </main>
  )
}

export const metadata = { title: 'Sign in' }
