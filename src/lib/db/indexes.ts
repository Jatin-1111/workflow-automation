/**
 * Index declarations, applied by `npm run db:indexes` and by the seed script.
 *
 * Every unique index here enforces an invariant the application relies on —
 * most importantly that a permanent entity id is never reused.
 */

import { getDb } from './client'
import { COLLECTIONS } from './collections'

export async function ensureIndexes(): Promise<void> {
  const db = await getDb()

  await db.collection(COLLECTIONS.users).createIndexes([
    { key: { userId: 1 }, unique: true, name: 'user_id_unique' },
    { key: { email: 1 }, unique: true, name: 'user_email_unique' },
    { key: { roleIds: 1 }, name: 'user_roles' },
    { key: { departmentId: 1 }, name: 'user_department' },
  ])

  await db.collection(COLLECTIONS.departments).createIndexes([
    { key: { departmentId: 1 }, unique: true, name: 'department_id_unique' },
  ])

  await db.collection(COLLECTIONS.teams).createIndexes([
    { key: { teamId: 1 }, unique: true, name: 'team_id_unique' },
  ])

  await db.collection(COLLECTIONS.roles).createIndexes([
    { key: { roleId: 1 }, unique: true, name: 'role_id_unique' },
    { key: { key: 1 }, unique: true, name: 'role_key_unique' },
  ])

  await db.collection(COLLECTIONS.projects).createIndexes([
    { key: { projectId: 1 }, unique: true, name: 'project_id_unique' },
  ])

  await db.collection(COLLECTIONS.workflowTemplates).createIndexes([
    // One document per version; the pair is the real identity (spec §38).
    { key: { workflowId: 1, version: 1 }, unique: true, name: 'template_version_unique' },
    { key: { projectId: 1, status: 1 }, name: 'template_by_project' },
  ])

  await db.collection(COLLECTIONS.workflowInstances).createIndexes([
    { key: { instanceId: 1 }, unique: true, name: 'instance_id_unique' },
    { key: { workflowId: 1, status: 1 }, name: 'instance_by_workflow' },
    { key: { projectId: 1, status: 1 }, name: 'instance_by_project' },
  ])

  await db.collection(COLLECTIONS.tasks).createIndexes([
    { key: { taskId: 1 }, unique: true, name: 'task_id_unique' },
    // The My Work dashboard's primary query (spec §7).
    { key: { assignees: 1, status: 1, dueAt: 1 }, name: 'task_my_work' },
    { key: { instanceId: 1, stageKey: 1 }, name: 'task_by_instance_stage' },
    { key: { projectId: 1, status: 1 }, name: 'task_by_project' },
  ])

  await db.collection(COLLECTIONS.files).createIndexes([
    { key: { fileId: 1 }, unique: true, name: 'file_id_unique' },
    { key: { instanceId: 1, slotKey: 1, version: -1 }, name: 'file_versions' },
  ])

  await db.collection(COLLECTIONS.comments).createIndexes([
    { key: { commentId: 1 }, unique: true, name: 'comment_id_unique' },
    { key: { instanceId: 1, createdAt: 1 }, name: 'comment_by_instance' },
  ])

  await db.collection(COLLECTIONS.notifications).createIndexes([
    { key: { notificationId: 1 }, unique: true, name: 'notification_id_unique' },
    { key: { recipientId: 1, readAt: 1, createdAt: -1 }, name: 'notification_inbox' },
  ])

  await db.collection(COLLECTIONS.timelineEvents).createIndexes([
    { key: { eventId: 1 }, unique: true, name: 'event_id_unique' },
    { key: { instanceId: 1, at: 1 }, name: 'timeline_by_instance' },
  ])
}
