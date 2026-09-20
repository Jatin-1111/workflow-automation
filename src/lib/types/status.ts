/** Status and priority vocabularies shared across tasks, instances and views. */

/** Task lifecycle states (spec §42). */
export const TASK_STATUSES = [
  'not_started',
  'in_progress',
  'waiting',
  'pending_approval',
  'completed',
  'overdue',
  'blocked',
  'cancelled',
] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/** Workflow instance lifecycle states. */
export const INSTANCE_STATUSES = [
  'active',
  'pending_approval',
  'blocked',
  'completed',
  'cancelled',
] as const
export type InstanceStatus = (typeof INSTANCE_STATUSES)[number]

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

/**
 * My Work dashboard sections (spec §9). Derived from task state at read time —
 * never stored, so a task cannot drift out of sync with its own bucket.
 */
export const WORK_BUCKETS = [
  'needs_action',
  'in_progress',
  'waiting',
  'upcoming',
  'overdue',
  'completed',
] as const
export type WorkBucket = (typeof WORK_BUCKETS)[number]

/** Permission tier, distinct from a user's workflow roles (spec §46). */
export const ACCESS_LEVELS = ['employee', 'manager', 'admin'] as const
export type AccessLevel = (typeof ACCESS_LEVELS)[number]

export const ENTITY_STATUSES = ['active', 'inactive'] as const
export type EntityStatus = (typeof ENTITY_STATUSES)[number]
