/**
 * A person's own recent actions, for their profile.
 *
 * Read the same way as a run's history — the same sentences, the same stage
 * names — but spoken to the reader: "You approved the work at Review". It
 * used to print the database's names for events, "stage activated · Review".
 */

import 'server-only'
import { listFilesForInstance } from '@/lib/db/repositories/files'
import { listTasksForInstance } from '@/lib/db/repositories/tasks'
import { listTimelineForActor } from '@/lib/db/repositories/timeline-events'
import { listUsers } from '@/lib/db/repositories/users'
import { findInstancesByIds } from '@/lib/db/repositories/workflow-instances'
import { findTemplateVersion } from '@/lib/db/repositories/workflow-templates'
import { humanise } from '@/features/my-work/format'
import {
  assignmentRecipients,
  eventsWorthALine,
  timelineSentence,
  type TimelineSentence,
} from '@/features/tasks/timeline-wording'
import type { UserId } from '@/lib/types/ids'

export interface ActivityRow {
  eventId: string
  sentence: TimelineSentence
  /** The run it happened in, by title. */
  runTitle: string
  comment?: string
  at: Date
}

export async function getMyActivity(userId: UserId, limit = 20): Promise<ActivityRow[]> {
  const events = await listTimelineForActor(userId, limit)
  const instanceIds = [...new Set(events.map((event) => event.instanceId))]

  const [instances, users, tasksByRun, filesByRun] = await Promise.all([
    findInstancesByIds(instanceIds),
    listUsers(),
    Promise.all(instanceIds.map((id) => listTasksForInstance(id))),
    Promise.all(instanceIds.map((id) => listFilesForInstance(id))),
  ])
  // Each run reads its stage names from the version it was started on.
  const templates = await Promise.all(
    instances.map((instance) => findTemplateVersion(instance.workflowId, instance.templateVersion)),
  )

  const userName = new Map(users.map((user) => [user.userId, user.name]))
  const nameOf = (id: UserId) => userName.get(id) ?? id
  const tasks = tasksByRun.flat()
  const files = filesByRun.flat()

  return eventsWorthALine(events).map((event) => {
    const index = instances.findIndex((instance) => instance.instanceId === event.instanceId)
    const stages = index >= 0 ? (templates[index]?.stages ?? []) : []
    const recipients = assignmentRecipients(
      event,
      tasks.filter((task) => task.instanceId === event.instanceId),
    )
    return {
      eventId: event.eventId,
      sentence: timelineSentence({
        action: event.action,
        actorName: nameOf(event.actorId),
        actorIsViewer: true,
        stageName: event.stageKey
          ? (stages.find((stage) => stage.key === event.stageKey)?.name ??
            humanise(event.stageKey))
          : undefined,
        // Starting a workflow usually hands its first stage to yourself.
        recipientNames: recipients?.map((id) => (id === userId ? 'You' : nameOf(id))),
        viewerIsRecipient: recipients?.includes(userId),
        fileName: event.fileId
          ? files.find((file) => file.fileId === event.fileId)?.name
          : undefined,
      }),
      runTitle: index >= 0 ? instances[index].title : event.instanceId,
      comment: event.comment,
      at: event.at,
    }
  })
}
