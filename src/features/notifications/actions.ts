'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/dal'
import { markAllNotificationsRead } from '@/lib/db/repositories/notifications'

/** Clear the unread marker for the signed-in person only (spec §41). */
export async function markAllReadAction(): Promise<void> {
  const user = await requireUser()
  await markAllNotificationsRead(user.userId)
  revalidatePath('/notifications')
  revalidatePath('/my-work')
}
