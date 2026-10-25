import { buttonClass } from '@/features/ui/primitives'
import Link from 'next/link'
import { currentLandingPath } from '@/lib/auth/dal'

export default async function NoAccessPage() {
  const landing = await currentLandingPath()

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">You do not have access to this page</h1>
        <p className="mt-2 text-sm text-muted">
          Your account does not carry the permission this page requires. An
          administrator can change your access level.
        </p>
        <Link
          href={landing}
          className={`mt-6 ${buttonClass('primary', 'lg')}`}
        >
          Back to my work
        </Link>
      </div>
    </main>
  )
}

export const metadata = { title: 'No access' }
