/**
 * Whether somebody has a part in a workflow run.
 *
 * The one rule behind "may this person see this run's files and join its
 * conversation": they started it, or they hold one of its tasks. Said once so a
 * download and a comment cannot drift into answering differently. Anyone with
 * the wider `instance.view_all` capability is a separate question, settled by
 * the caller.
 *
 * Pure. Takes what has already been loaded.
 */

import type { UserId } from '@/lib/types/ids'

export function isInvolved(
  userId: UserId,
  instance: { initiatedBy: UserId },
  tasks: readonly { assignees: readonly UserId[] }[],
): boolean {
  return (
    instance.initiatedBy === userId ||
    tasks.some((task) => task.assignees.includes(userId))
  )
}
