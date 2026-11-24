'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/dal'
import { isEntityId } from '@/lib/ids/format'
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/db/repositories/notifications'
import type { NotificationId } from '@/lib/types/ids'

/** Clear the unread marker for the signed-in person only (spec §41). */
export async function markAllReadAction(): Promise<void> {
  const user = await requireUser()
  await markAllNotificationsRead(user.userId)
  revalidatePath('/notifications')
  revalidatePath('/my-work')
}

/**
 * Mark one notification read when somebody opens it.
 *
 * Quiet on a bad id: a stale page can name a notification that has gone, and
 * that is not worth an error for someone who is only trying to read a task.
 */
export async function markReadAction(notificationId: string): Promise<void> {
  const user = await requireUser()
  if (!isEntityId(notificationId, 'notification')) return
  await markNotificationRead(user.userId, notificationId as NotificationId)
  revalidatePath('/notifications')
}
