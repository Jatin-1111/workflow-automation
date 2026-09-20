/**
 * Permanent entity identifiers.
 *
 * Every entity carries an immutable `BO-XXX-00000` id. Relationships, audit
 * history and engine logic reference these ids only — never display names, so
 * that renaming a person or a project never rewrites history.
 */

/** Entity kind segment of an id. Extend here, never inline. */
export const ENTITY_KINDS = {
  user: 'USR',
  department: 'DEP',
  team: 'TEM',
  role: 'ROL',
  project: 'PRJ',
  workflowTemplate: 'WFL',
  workflowInstance: 'INS',
  task: 'TSK',
  file: 'FIL',
  comment: 'CMT',
  notification: 'NTF',
  timelineEvent: 'EVT',
} as const

export type EntityKind = keyof typeof ENTITY_KINDS
export type EntityPrefix = (typeof ENTITY_KINDS)[EntityKind]

/** Width of the zero-padded sequence segment, e.g. `00001`. */
export const ID_SEQUENCE_WIDTH = 5

declare const brand: unique symbol
type Branded<K extends EntityKind> = string & { readonly [brand]: K }

export type UserId = Branded<'user'>
export type DepartmentId = Branded<'department'>
export type TeamId = Branded<'team'>
export type RoleId = Branded<'role'>
export type ProjectId = Branded<'project'>
export type WorkflowTemplateId = Branded<'workflowTemplate'>
export type WorkflowInstanceId = Branded<'workflowInstance'>
export type TaskId = Branded<'task'>
export type FileId = Branded<'file'>
export type CommentId = Branded<'comment'>
export type NotificationId = Branded<'notification'>
export type TimelineEventId = Branded<'timelineEvent'>

export type EntityId<K extends EntityKind> = Branded<K>
