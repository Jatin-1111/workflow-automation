'use client'

/** Mark everything read, then bring the list and the sidebar bell up to date. */

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import { buttonClass } from '@/features/ui/primitives'
import { markAllReadAction } from './actions'
import { announceNotificationsChanged } from './events'

export function MarkAllRead() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllReadAction()
          router.refresh()
          announceNotificationsChanged()
        })
      }
      className={buttonClass('secondary', 'md')}
    >
      <CheckCheck size={16} strokeWidth={1.75} aria-hidden />
      {pending ? 'Marking…' : 'Mark all as read'}
    </button>
  )
}
