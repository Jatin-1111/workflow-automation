/** Business Orbit's org chart: departments, teams and workflow roles. */

import type { DepartmentId, RoleId, TeamId, UserId } from './ids'
import type { EntityStatus } from './status'

export interface Department {
  departmentId: DepartmentId
  name: string
  description?: string
  headUserId?: UserId
  status: EntityStatus
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  teamId: TeamId
  name: string
  departmentId?: DepartmentId
  leadUserId?: UserId
  status: EntityStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * A workflow responsibility (Proposal Designer, QC Owner, ...), not a
 * permission tier. Stages name a role; the admin maps the role to a person, so
 * replacing that person never touches the workflow (spec §6).
 */
export interface Role {
  roleId: RoleId
  /** Stable machine key used by seeds and templates, e.g. `proposal_designer`. */
  key: string
  name: string
  description?: string
  status: EntityStatus
  createdAt: Date
  updatedAt: Date
}
