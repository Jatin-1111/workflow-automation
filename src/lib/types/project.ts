/** Major Projects — the top-level initiatives workflows run inside (spec §2). */

import type { ProjectId, UserId } from './ids'
import type { EntityStatus } from './status'

export interface Project {
  projectId: ProjectId
  name: string
  description?: string
  ownerId?: UserId
  memberIds: UserId[]
  status: EntityStatus
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}
