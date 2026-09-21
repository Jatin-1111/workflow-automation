/**
 * Capability model for the three permission tiers (spec §46).
 *
 * Pure and dependency-free so it can be unit tested and reasoned about in one
 * place. A user's `accessLevel` decides what they may do to the system; their
 * workflow roles decide what work reaches them. The two are independent.
 */

import type { AccessLevel } from '@/lib/types/status'

export const CAPABILITIES = [
  // Everyday work
  'work.view_own',
  'task.complete_assigned',
  'file.upload',
  'comment.write',
  'instance.view_authorized',

  // Oversight
  'management.view_dashboard',
  'team.view_workload',
  'project.view_dashboard',
  'task.reassign',
  'instance.cancel',
  'instance.view_all',

  // Administration
  'admin.manage_users',
  'admin.manage_roles',
  'admin.manage_projects',
  'admin.manage_workflows',
] as const
export type Capability = (typeof CAPABILITIES)[number]

const EMPLOYEE_CAPABILITIES: Capability[] = [
  'work.view_own',
  'task.complete_assigned',
  'file.upload',
  'comment.write',
  'instance.view_authorized',
]

const MANAGER_CAPABILITIES: Capability[] = [
  ...EMPLOYEE_CAPABILITIES,
  'management.view_dashboard',
  'team.view_workload',
  'project.view_dashboard',
  'task.reassign',
  // Calling off a run stops work for everybody, so it sits with oversight
  // rather than with whoever happens to hold the current stage.
  'instance.cancel',
]

const ADMIN_CAPABILITIES: Capability[] = [
  ...MANAGER_CAPABILITIES,
  'instance.view_all',
  'admin.manage_users',
  'admin.manage_roles',
  'admin.manage_projects',
  'admin.manage_workflows',
]

/** Capabilities granted by each tier. Tiers are cumulative. */
export const CAPABILITIES_BY_ACCESS_LEVEL: Record<AccessLevel, Capability[]> = {
  employee: EMPLOYEE_CAPABILITIES,
  manager: MANAGER_CAPABILITIES,
  admin: ADMIN_CAPABILITIES,
}

export function can(accessLevel: AccessLevel, capability: Capability): boolean {
  return CAPABILITIES_BY_ACCESS_LEVEL[accessLevel].includes(capability)
}

/** True when the tier grants every listed capability. */
export function canAll(
  accessLevel: AccessLevel,
  capabilities: Capability[],
): boolean {
  return capabilities.every((capability) => can(accessLevel, capability))
}

/** Where a user lands after login (spec §47). */
export function landingPath(accessLevel: AccessLevel): string {
  return can(accessLevel, 'management.view_dashboard') ? '/dashboard' : '/my-work'
}
