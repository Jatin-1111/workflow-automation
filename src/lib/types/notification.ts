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
