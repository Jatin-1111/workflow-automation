'use server'

import { revalidatePath } from 'next/cache'
import { requireCapability, requireUser } from '@/lib/auth/dal'
import { nextId } from '@/lib/ids/generate'
import { insertComment } from '@/lib/db/repositories/comments'
import { insertFile, nextVersionForSlot } from '@/lib/db/repositories/files'
import { appendTimelineEvents } from '@/lib/db/repositories/timeline-events'
import {
  approveTask,
  attachFileToTask,
  completeTask,
  loadTaskContext,
  reassignTaskTo,
  requestTaskChanges,
  saveTaskProgress,
  type OperationOutcome,
} from '@/lib/workflow/service'
import { FileRejected, storeFile } from '@/lib/files/storage'
import {
  readAssignees,
  readFileId,
  readReason,
  readSubmission,
  readTaskId,
} from './form-parsing'
import type { StageSubmission } from '@/lib/engine'
import { listUsers } from '@/lib/db/repositories/users'
import type { FileId, TaskId } from '@/lib/types/ids'

export type TaskActionState = OperationOutcome | { ok: null }

function refuse(code: string, message: string): TaskActionState {
  return { ok: false, errors: [{ code, message }] }
}

function revalidateTask(taskId: TaskId) {
  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/my-work')
}

async function operate(
  formData: FormData,
  action: (taskId: TaskId, actor: Awaited<ReturnType<typeof requireUser>>['userId'], submission: StageSubmission) => Promise<OperationOutcome>,
): Promise<TaskActionState> {
  const user = await requireUser()
  const taskId = readTaskId(formData)
  if (!taskId) return refuse('task_not_found', 'That task could not be identified.')

  const outcome = await action(taskId, user.userId, readSubmission(formData))
  if (outcome.ok) revalidateTask(taskId)
  return outcome
}

export async function saveProgressAction(
  _previous: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  return operate(formData, saveTaskProgress)
}

export async function completeStageAction(
  _previous: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  return operate(formData, completeTask)
}

export async function requestChangesAction(
  _previous: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  return operate(formData, requestTaskChanges)
}

/** Approve, and mark the file that was approved as final (spec §30). */
export async function approveAction(
  _previous: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await requireUser()
  const taskId = readTaskId(formData)
  if (!taskId) return refuse('task_not_found', 'That task could not be identified.')

  const finalFileId = readFileId(formData)

  const outcome = await approveTask(taskId, user.userId, readSubmission(formData), finalFileId)
  if (!outcome.ok) return outcome

  revalidateTask(taskId)
  return outcome
}

/**
 * Store an upload and attach it to the task (spec §12).
 *
 * The file is written first and recorded second: if the engine refuses the
 * attachment, an orphaned blob is a smaller problem than a database row
 * pointing at bytes that were never saved.
 */
export async function uploadFileAction(
  _previous: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await requireUser()
  const taskId = readTaskId(formData)
  if (!taskId) return refuse('task_not_found', 'That task could not be identified.')

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return refuse('no_file', 'Choose a file to upload.')
  }

  const loaded = await loadTaskContext(taskId)
  if (!loaded) return refuse('task_not_found', 'That task no longer exists.')
  if (!loaded.task.assignees.includes(user.userId)) {
    return refuse('not_assigned', 'This task is not assigned to you.')
  }

  const slotKeyRaw = String(formData.get('slotKey') ?? '')
  const stage = loaded.template.stages.find(
    (candidate) => candidate.key === loaded.task.stageKey,
  )
  const slot = stage?.files.find((candidate) => candidate.key === slotKeyRaw)
  const slotKey = slot?.key

  let stored
  try {
    stored = await storeFile({
      instanceId: loaded.instance.instanceId,
      file,
      allowedExtensions: slot?.acceptedExtensions,
    })
  } catch (error) {
    if (error instanceof FileRejected) return refuse('file_rejected', error.message)
    throw error
  }

  const fileId = await nextId('file')
  const version = await nextVersionForSlot(loaded.instance.instanceId, slotKey)

  await insertFile({
    fileId,
    instanceId: loaded.instance.instanceId,
    workflowId: loaded.instance.workflowId,
    taskId,
    stageKey: loaded.task.stageKey,
    slotKey,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: stored.sizeBytes,
    version,
    storageKey: stored.storageKey,
    isFinalApproved: false,
    uploadedBy: user.userId,
    uploadedAt: new Date(),
  })

  const outcome = await attachFileToTask(taskId, user.userId, {
    fileId: fileId as FileId,
    slotKey,
    version,
  })
  if (outcome.ok) revalidateTask(taskId)
  return outcome
}

/**
 * Move an open task to somebody else (spec §46).
 *
 * Reserved to people who carry the reassignment capability, and accepted only
 * for accounts that are actually active — handing work to a deactivated person
 * would strand it where nobody can act on it.
 */
export async function reassignAction(
  _previous: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const actor = await requireCapability('task.reassign')

  const taskId = readTaskId(formData)
  if (!taskId) return refuse('task_not_found', 'That task could not be identified.')

  const active = new Set(
    (await listUsers())
      .filter((candidate) => candidate.status === 'active')
      .map((candidate) => candidate.userId),
  )
  const assignees = readAssignees(formData).filter((userId) => active.has(userId))

  if (assignees.length === 0) {
    return refuse('no_new_assignees', 'Choose at least one active person.')
  }

  const outcome = await reassignTaskTo(
    taskId,
    actor.userId,
    assignees,
    readReason(formData),
  )
  if (outcome.ok) revalidateTask(taskId)
  return outcome
}

/** Add a comment to the workflow, and record it in the timeline (spec §40). */
export async function addCommentAction(
  _previous: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await requireUser()
  const taskId = readTaskId(formData)
  if (!taskId) return refuse('task_not_found', 'That task could not be identified.')

  const body = String(formData.get('body') ?? '').trim()
  if (!body) return refuse('empty_comment', 'Write something before posting.')

  const loaded = await loadTaskContext(taskId)
  if (!loaded) return refuse('task_not_found', 'That task no longer exists.')

  const participates =
    loaded.instance.initiatedBy === user.userId ||
    loaded.tasks.some((task) => task.assignees.includes(user.userId))
  if (!participates) {
    return refuse('not_assigned', 'You are not part of this workflow.')
  }

  const now = new Date()
  await insertComment({
    commentId: await nextId('comment'),
    instanceId: loaded.instance.instanceId,
    taskId,
    stageKey: loaded.task.stageKey,
    authorId: user.userId,
    body,
    createdAt: now,
    updatedAt: now,
  })

  await appendTimelineEvents([
    {
      eventId: await nextId('timelineEvent'),
      instanceId: loaded.instance.instanceId,
      taskId,
      stageKey: loaded.task.stageKey,
      actorId: user.userId,
      action: 'comment_added',
      comment: body,
      at: now,
    },
  ])

  revalidateTask(taskId)
  return { ok: true }
}
