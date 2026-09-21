/** In-app notification (spec §41). No email or messaging channel in this version. */

import type {
  NotificationId,
  TaskId,
  UserId,
  WorkflowInstanceId,
} from './ids'

export const NOTIFICATION_KINDS = [
  'task_assigned',
  'task_reassigned',
  'approval_required',
  'changes_requested',
  'file_uploaded',
  'stage_completed',
  'deadline_approaching',
  'task_overdue',
  'workflow_completed',
  /**
   * Both beyond §41's list. Work that stops — parked or called off — has to
   * reach the people relying on it, and saying so under a kind that means
   * something else would read as a lie on the notifications page.
   */
  'task_held',
  'workflow_cancelled',
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export interface Notification {
  notificationId: NotificationId
  recipientId: UserId
  kind: NotificationKind
  title: string
  body?: string
  instanceId?: WorkflowInstanceId
  taskId?: TaskId
  readAt?: Date
  createdAt: Date
}
