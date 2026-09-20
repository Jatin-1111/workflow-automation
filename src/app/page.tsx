import { redirect } from 'next/navigation'
import { currentLandingPath } from '@/lib/auth/dal'

/** The root always hands off to the right landing page for the session (spec §47). */
export default async function RootPage() {
  redirect(await currentLandingPath())
}
