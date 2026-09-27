/**
 * Who may read a task.
 *
 * Kept out of queries.ts so it can be tested directly: that module carries
 * `import 'server-only'` and cannot be driven from a test, and an access
 * rule nobody can exercise is an access rule nobody can check.
 *
 * Three ways in, and they are deliberately different questions.
 *
 * You hold the stage — the ordinary case.
 *
 * You were part of this run earlier: you raised it, or you held one of its
 * other stages. Somebody who wrote the draft can still read what happened
 * to it after they handed it on, which is what makes a handover feel like
 * a handover rather than a disappearance.
 *
 * Or you oversee the organisation. That one is a capability rather than a
 * relationship, and the UI hands it out on the strength of the same
 * capability, so the two must agree — a Board that shows a card linking to
 * a page its reader cannot open is worse than a Board that shows nothing.
 *
 * Reading only. Acting on a task is decided elsewhere and separately:
 * completing needs you to be the assignee, and reassigning and cancelling
 * need their own capabilities.
 */

import { can } from '@/lib/auth/permissions'
import type { AccessLevel } from '@/lib/types/status'

export interface TaskViewer {
  userId: string
  accessLevel: AccessLevel
}

export interface TaskAudience {
  /** Who holds the stage being opened. */
  assignees: readonly string[]
  /** Who raised the run. */
  initiatedBy: string
  /** Assignees of every stage of the run, including this one. */
  everyStageAssignees: readonly (readonly string[])[]
}

/** True when this person took part in the run at some point. */
export function participatedIn(viewer: TaskViewer, run: TaskAudience): boolean {
  if (run.initiatedBy === viewer.userId) return true
  return run.everyStageAssignees.some((holders) => holders.includes(viewer.userId))
}

export function canViewTask(viewer: TaskViewer, run: TaskAudience): boolean {
  if (run.assignees.includes(viewer.userId)) return true
  if (participatedIn(viewer, run)) return true
  return can(viewer.accessLevel, 'instance.view_all')
}
