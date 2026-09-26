/** Major Projects — the top-level initiatives workflows run inside (spec §2). */

import type { ProjectId, UserId } from './ids'
import type { EntityStatus } from './status'
import type { LabelColor } from './label'

export interface Project {
  projectId: ProjectId
  name: string
  description?: string
  ownerId?: UserId
  memberIds: UserId[]
  /** How this project is told apart on a screen carrying several (spec §7). */
  color?: LabelColor
  status: EntityStatus
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}
