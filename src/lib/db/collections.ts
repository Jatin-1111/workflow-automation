/** Canonical collection names. Referenced only through this module. */

export const COLLECTIONS = {
  counters: 'counters',
  users: 'users',
  departments: 'departments',
  teams: 'teams',
  roles: 'roles',
  projects: 'projects',
  workflowTemplates: 'workflow_templates',
  workflowInstances: 'workflow_instances',
  tasks: 'tasks',
  files: 'files',
  comments: 'comments',
  notifications: 'notifications',
  timelineEvents: 'timeline_events',
  sessions: 'sessions',
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
