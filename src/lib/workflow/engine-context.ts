/**
 * Builds the engine's context from the database.
 *
 * This is the seam between the pure engine and storage: role-to-person mapping
 * is resolved here and handed in, so the engine never queries anything.
 */

import { findUsersByRole } from '@/lib/db/repositories/users'
import type { EngineContext } from '@/lib/engine'
import type { RoleId, UserId } from '@/lib/types/ids'
import type { WorkflowTemplate } from '@/lib/types/workflow'

/** Every role named by any stage of a template. */
function rolesUsedBy(template: WorkflowTemplate): RoleId[] {
  const roleIds = template.stages.flatMap((stage) =>
    stage.assignees
      .filter((source) => source.mode === 'role')
      .map((source) => source.roleId),
  )
  return [...new Set(roleIds)]
}

/**
 * Resolve the template's roles to their current holders.
 *
 * Resolved per operation rather than cached, so a role remapped by an admin
 * takes effect on the next stage that activates.
 */
export async function buildEngineContext(
  template: WorkflowTemplate,
  now: Date = new Date(),
): Promise<EngineContext> {
  const roleIds = rolesUsedBy(template)

  const entries = await Promise.all(
    roleIds.map(async (roleId): Promise<[string, UserId[]]> => {
      const holders = await findUsersByRole(roleId)
      return [roleId, holders.map((user) => user.userId)]
    }),
  )

  return { now, usersByRole: Object.fromEntries(entries) }
}
