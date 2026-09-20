/** People who log in and receive work. */

import type { DepartmentId, RoleId, TeamId, UserId } from './ids'
import type { AccessLevel, EntityStatus } from './status'

export interface User {
  userId: UserId
  name: string
  email: string
  phone?: string
  photoUrl?: string
  departmentId?: DepartmentId
  teamId?: TeamId
  /** Workflow responsibilities held by this person (spec §6). */
  roleIds: RoleId[]
  /** Permission tier, independent of workflow roles (spec §46). */
  accessLevel: AccessLevel
  status: EntityStatus
  joiningDate?: Date
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

/** User shape safe to send to the client — never includes `passwordHash`. */
export type PublicUser = Omit<User, 'passwordHash'>
