/**
 * The workflow engine's operations.
 *
 * Pure: no database, no request context, no React. Each operation takes the
 * current state and returns either a refusal or the next state plus the
 * records to persist. Routing is deterministic - the next stage comes from the
 * template, never from a judgement call (spec §51).
 */

import type { FieldValue, WorkflowInstance } from '@/lib/types/instance'
import type { ChecklistItemState, Task } from '@/lib/types/task'
import type { FileId, UserId } from '@/lib/types/ids'
import type { StageDefinition } from '@/lib/types/workflow'
import { activateStage } from './activate'
import { resolveAssignees } from './assignees'
import { accept, refuse, type EngineOutcome } from './errors'
import { buildTaskDraft, findStage, nextStageOf } from './stages'
import { pickDeclaredFields, validateCompletion } from './validation'
import type {
  EngineContext,
  EngineResult,
  StageSubmission,
  StartInstanceRequest,
  StartResult,
  TaskOperationRequest,
  TaskUpdate,
} from './types'

/** Shared preconditions for any operation acting on a task. */
function loadTask(
  request: TaskOperationRequest,
): EngineOutcome<{ task: Task; stage: StageDefinition }> {
  const task = request.tasks.find((candidate) => candidate.taskId === request.taskId)
  if (!task) {
    return refuse({ code: 'task_not_found', message: 'That task does not exist.' })
  }
  if (task.completedAt) {
    return refuse({
      code: 'task_already_completed',
      message: 'That task has already been completed.',
    })
  }
  if (
    request.instance.status === 'completed' ||
    request.instance.status === 'cancelled'
  ) {
    return refuse({
      code: 'instance_not_active',
      message: 'This workflow is no longer running.',
    })
  }
  if (!task.assignees.includes(request.actor)) {
    return refuse({
      code: 'not_assigned',
      message: 'This task is not assigned to you.',
    })
  }
  const stage = findStage(request.template, task.stageKey)
  if (!stage) {
    return refuse({
      code: 'stage_not_found',
      message: `Stage "${task.stageKey}" is not defined in this workflow version.`,
      key: task.stageKey,
    })
  }
  return accept({ task, stage })
}

interface MergedSubmission {
  fieldValues: Record<string, FieldValue>
  checkedItemKeys: string[]
  uploadedSlotKeys: string[]
}

/** Merge a submission over a task's saved state without mutating either. */
function mergeSubmission(
  stage: StageDefinition,
  task: Task,
  submission: StageSubmission | undefined,
): MergedSubmission {
  const declaredItems = new Set(stage.checklist.map((item) => item.key))

  return {
    fieldValues: {
      ...task.fieldValues,
      ...pickDeclaredFields(stage, submission?.fieldValues),
    },
    // A submission carries the complete set of ticked items, not a delta.
    checkedItemKeys: submission?.checkedItemKeys
      ? submission.checkedItemKeys.filter((key) => declaredItems.has(key))
      : task.checklist.filter((item) => item.checked).map((item) => item.key),
    uploadedSlotKeys: task.files
      .map((file) => file.slotKey)
      .filter((slot): slot is string => Boolean(slot)),
  }
}

function applyChecklist(
  task: Task,
  checkedItemKeys: string[],
  at: Date,
  actor: UserId,
): ChecklistItemState[] {
  return task.checklist.map((item) => {
    const checked = checkedItemKeys.includes(item.key)
    if (checked === item.checked) return item
    return checked
      ? { key: item.key, checked: true, checkedBy: actor, checkedAt: at }
      : { key: item.key, checked: false }
  })
}

/** Keep an approval task's status; otherwise the stage is being worked on. */
function workingStatus(task: Task): Task['status'] {
  return task.status === 'pending_approval' ? 'pending_approval' : 'in_progress'
}

/**
 * Create a workflow instance and open its first stage (spec §21).
 *
 * The stage that triggers a process is a stage like any other, so the request
 * itself appears in the timeline rather than sitting outside it.
 */
export function startInstance(
  request: StartInstanceRequest,
  context: EngineContext,
): EngineOutcome<StartResult> {
  const { template, initiatedBy, title, projectId, fieldValues = {} } = request

  const stage = findStage(template, template.initialStageKey)
  if (!stage) {
    return refuse({
      code: 'stage_not_found',
      message: `Initial stage "${template.initialStageKey}" is not defined.`,
      key: template.initialStageKey,
    })
  }

  const seededValues = pickDeclaredFields(stage, fieldValues)

  const instance: StartResult['instance'] = {
    workflowId: template.workflowId,
    // Pin the version now; later template edits never reach this run (spec §38).
    templateVersion: template.version,
    projectId: projectId ?? template.projectId,
    title,
    currentStageKeys: [stage.key],
    status: 'active',
    priority: stage.priority,
    initiatedBy,
    fieldValues: seededValues,
    startedAt: context.now,
  }

  const assignees = resolveAssignees(stage, { initiatedBy }, [], context)
  if (assignees.length === 0) {
    return refuse({
      code: 'no_assignee_resolved',
      message: `No one is currently assigned to "${stage.name}". Map its role to a user first.`,
      key: stage.key,
    })
  }

  const task = buildTaskDraft({
    stage,
    // The instance id is stamped by the persistence layer on insert, because
    // a pure engine cannot allocate permanent ids.
    instance: {
      instanceId: '' as Task['instanceId'],
      workflowId: template.workflowId,
      projectId: instance.projectId,
    },
    assignees,
    activatedAt: context.now,
    revisionRound: 1,
  })

  return accept({
    instance,
    newTasks: [{ ...task, fieldValues: seededValues }],
    events: [
      {
        stageKey: stage.key,
        actorId: initiatedBy,
        action: 'instance_created',
        at: context.now,
      },
      {
        stageKey: stage.key,
        actorId: initiatedBy,
        action: 'stage_activated',
        at: context.now,
      },
      {
        stageKey: stage.key,
        actorId: initiatedBy,
        action: 'task_assigned',
        at: context.now,
      },
    ],
    // Whoever started the workflow does not need telling about their own task.
    notifications: assignees
      .filter((recipientId) => recipientId !== initiatedBy)
      .map((recipientId) => ({
        recipientId,
        kind: 'task_assigned' as const,
        title: `New task: ${stage.name}`,
        body: title,
        taskStageKey: stage.key,
      })),
  })
}

/** Save work in progress without advancing the workflow (spec §14). */
export function saveProgress(
  request: TaskOperationRequest,
): EngineOutcome<EngineResult> {
  const loaded = loadTask(request)
  if (!loaded.ok) return loaded

  const { task, stage } = loaded.result
  const { context } = request
  const merged = mergeSubmission(stage, task, request.submission)

  return accept({
    instance: request.instance,
    taskUpdates: [
      {
        taskId: task.taskId,
        changes: {
          fieldValues: merged.fieldValues,
          checklist: applyChecklist(
            task,
            merged.checkedItemKeys,
            context.now,
            request.actor,
          ),
          status: workingStatus(task),
          updatedAt: context.now,
        },
      },
    ],
    newTasks: [],
    events: [
      {
        taskId: task.taskId,
        stageKey: stage.key,
        actorId: request.actor,
        action: 'progress_saved',
        at: context.now,
      },
    ],
    notifications: [],
  })
}

/** Attach an uploaded file to the task it was uploaded from (spec §12). */
export function recordFileUpload(
  request: TaskOperationRequest & {
    file: { fileId: FileId; slotKey?: string; version: number }
  },
): EngineOutcome<EngineResult> {
  const loaded = loadTask(request)
  if (!loaded.ok) return loaded

  const { task, stage } = loaded.result
  const { context } = request

  return accept({
    instance: request.instance,
    taskUpdates: [
      {
        taskId: task.taskId,
        changes: {
          files: [
            ...task.files,
            { fileId: request.file.fileId, slotKey: request.file.slotKey },
          ],
          status: workingStatus(task),
          updatedAt: context.now,
        },
      },
    ],
    newTasks: [],
    events: [
      {
        taskId: task.taskId,
        stageKey: stage.key,
        actorId: request.actor,
        action: 'file_uploaded',
        fileId: request.file.fileId,
        fileVersion: request.file.version,
        at: context.now,
      },
    ],
    notifications: [],
  })
}

/**
 * Complete an assigned stage and hand the work to whoever is next (spec §24).
 *
 * On a stage whose completion rule is `all`, the first assignee to finish
 * records their part and the stage stays open for the rest (spec §22).
 */
export function completeStage(
  request: TaskOperationRequest,
): EngineOutcome<EngineResult> {
  const loaded = loadTask(request)
  if (!loaded.ok) return loaded

  const { task, stage } = loaded.result
  const { context } = request
  const merged = mergeSubmission(stage, task, request.submission)

  const blockers = validateCompletion(stage, merged)
  if (blockers.length > 0) return { ok: false, errors: blockers }

  const completedBy = task.completedBy.includes(request.actor)
    ? task.completedBy
    : [...task.completedBy, request.actor]
  const checklist = applyChecklist(
    task,
    merged.checkedItemKeys,
    context.now,
    request.actor,
  )

  const everyoneDone =
    stage.completionRule === 'any' ||
    task.assignees.every((assignee) => completedBy.includes(assignee))

  if (!everyoneDone) {
    return accept({
      instance: request.instance,
      taskUpdates: [
        {
          taskId: task.taskId,
          changes: {
            fieldValues: merged.fieldValues,
            checklist,
            completedBy,
            status: 'in_progress',
            updatedAt: context.now,
          },
        },
      ],
      newTasks: [],
      events: [
        {
          taskId: task.taskId,
          stageKey: stage.key,
          actorId: request.actor,
          action: 'assignee_completed',
          at: context.now,
        },
      ],
      notifications: [],
    })
  }

  const completion: TaskUpdate = {
    taskId: task.taskId,
    changes: {
      fieldValues: merged.fieldValues,
      checklist,
      completedBy,
      status: 'completed',
      completedAt: context.now,
      updatedAt: context.now,
    },
  }

  return advance({
    request,
    stage,
    completion,
    instanceFieldValues: merged.fieldValues,
    action: 'stage_completed',
    comment: request.submission?.comment,
  })
}

/** Grant final approval and move the work on (spec §30). */
export function approve(
  request: TaskOperationRequest & { finalFileId?: FileId },
): EngineOutcome<EngineResult> {
  const loaded = loadTask(request)
  if (!loaded.ok) return loaded

  const { task, stage } = loaded.result
  const { context } = request

  if (!stage.requiresApproval) {
    return refuse({
      code: 'not_an_approval_stage',
      message: `"${stage.name}" is not an approval stage.`,
      key: stage.key,
    })
  }

  const merged = mergeSubmission(stage, task, request.submission)
  const blockers = validateCompletion(stage, merged)
  if (blockers.length > 0) return { ok: false, errors: blockers }

  const completion: TaskUpdate = {
    taskId: task.taskId,
    changes: {
      fieldValues: merged.fieldValues,
      checklist: applyChecklist(
        task,
        merged.checkedItemKeys,
        context.now,
        request.actor,
      ),
      completedBy: [request.actor],
      status: 'completed',
      completedAt: context.now,
      updatedAt: context.now,
    },
  }

  return advance({
    request,
    stage,
    completion,
    instanceFieldValues: merged.fieldValues,
    action: 'approval_granted',
    comment: request.submission?.comment,
    approvedFileId: request.finalFileId ?? latestFileId(request.tasks),
  })
}

/**
 * Send the work back for revision (spec §29).
 *
 * A comment is mandatory, the target comes from the template rather than being
 * assumed to be the previous stage, and existing files are preserved: the
 * revision arrives as a new pass so the timeline reads correctly.
 */
export function requestChanges(
  request: TaskOperationRequest,
): EngineOutcome<EngineResult> {
  const loaded = loadTask(request)
  if (!loaded.ok) return loaded

  const { task, stage } = loaded.result
  const { context } = request

  if (!stage.requiresApproval) {
    return refuse({
      code: 'not_an_approval_stage',
      message: `"${stage.name}" is not an approval stage.`,
      key: stage.key,
    })
  }

  const comment = request.submission?.comment?.trim()
  if (!comment) {
    return refuse({
      code: 'comment_required',
      message: 'Explain what needs to change before sending the work back.',
    })
  }

  if (!stage.rejectTargetStageKey) {
    return refuse({
      code: 'reject_target_missing',
      message: `"${stage.name}" does not define where rejected work goes.`,
      key: stage.key,
    })
  }

  const target = findStage(request.template, stage.rejectTargetStageKey)
  if (!target) {
    return refuse({
      code: 'stage_not_found',
      message: `Stage "${stage.rejectTargetStageKey}" is not defined in this workflow version.`,
      key: stage.rejectTargetStageKey,
    })
  }

  const completion: TaskUpdate = {
    taskId: task.taskId,
    changes: {
      completedBy: [request.actor],
      status: 'completed',
      completedAt: context.now,
      updatedAt: context.now,
    },
  }

  const activation = activateStage({
    stage: target,
    instance: request.instance,
    tasks: applyTaskUpdate(request.tasks, completion),
    actor: request.actor,
    context,
  })
  if (!activation.ok) return activation

  return accept({
    instance: {
      ...request.instance,
      currentStageKeys: [target.key],
      status: 'active',
      updatedAt: context.now,
    },
    taskUpdates: [completion],
    newTasks: [activation.result.task],
    events: [
      {
        taskId: task.taskId,
        stageKey: stage.key,
        actorId: request.actor,
        action: 'changes_requested',
        comment,
        at: context.now,
      },
      ...activation.result.events,
    ],
    notifications: activation.result.notifications.map((notification) => ({
      ...notification,
      kind: 'changes_requested' as const,
      title: `Changes requested: ${target.name}`,
      body: comment,
    })),
  })
}

/** Apply a pending update to a task list, so routing sees the new state. */
function applyTaskUpdate(tasks: Task[], update: TaskUpdate): Task[] {
  return tasks.map((task) =>
    task.taskId === update.taskId ? { ...task, ...update.changes } : task,
  )
}

/** Shared tail of completion and approval: close the task, open what follows. */
function advance(params: {
  request: TaskOperationRequest
  stage: StageDefinition
  completion: TaskUpdate
  instanceFieldValues: Record<string, FieldValue>
  action: 'stage_completed' | 'approval_granted'
  comment?: string
  approvedFileId?: FileId
}): EngineOutcome<EngineResult> {
  const { request, stage, completion } = params
  const { context } = request

  const tasksAfter = applyTaskUpdate(request.tasks, completion)

  const completionEvent = {
    taskId: completion.taskId,
    stageKey: stage.key,
    actorId: request.actor,
    action: params.action,
    comment: params.comment,
    fileId: params.approvedFileId,
    at: context.now,
  }

  const instanceBase: WorkflowInstance = {
    ...request.instance,
    fieldValues: {
      ...request.instance.fieldValues,
      ...params.instanceFieldValues,
    },
    updatedAt: context.now,
  }

  const next = nextStageOf(request.template, stage)

  if (!next) {
    return accept({
      instance: {
        ...instanceBase,
        currentStageKeys: [],
        status: 'completed',
        completedAt: context.now,
      },
      taskUpdates: [completion],
      newTasks: [],
      events: [
        completionEvent,
        {
          stageKey: stage.key,
          actorId: request.actor,
          action: 'instance_completed',
          at: context.now,
        },
      ],
      notifications: [
        {
          recipientId: request.instance.initiatedBy,
          kind: 'workflow_completed',
          title: `Completed: ${request.instance.title}`,
        },
      ],
    })
  }

  const activation = activateStage({
    stage: next,
    instance: instanceBase,
    tasks: tasksAfter,
    actor: request.actor,
    context,
  })
  if (!activation.ok) return activation

  return accept({
    instance: {
      ...instanceBase,
      currentStageKeys: [next.key],
      status: next.requiresApproval ? 'pending_approval' : 'active',
    },
    taskUpdates: [completion],
    newTasks: [activation.result.task],
    events: [completionEvent, ...activation.result.events],
    notifications: activation.result.notifications,
  })
}

/** Most recently attached file across the instance: the approval's target. */
function latestFileId(tasks: Task[]): FileId | undefined {
  const withFiles = tasks
    .filter((task) => task.files.length > 0)
    .sort((a, b) => b.activatedAt.getTime() - a.activatedAt.getTime())
  return withFiles[0]?.files.at(-1)?.fileId
}
