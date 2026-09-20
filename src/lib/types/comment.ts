/** Internal discussion attached to a workflow instance (spec §40). */

import type { CommentId, TaskId, UserId, WorkflowInstanceId } from './ids'

export interface Comment {
  commentId: CommentId
  instanceId: WorkflowInstanceId
  taskId?: TaskId
  stageKey?: string
  authorId: UserId
  body: string
  createdAt: Date
  updatedAt: Date
}
