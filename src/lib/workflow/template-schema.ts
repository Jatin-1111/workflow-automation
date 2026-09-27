/**
 * What the Workflow Builder posts, read rather than assumed.
 *
 * The editor sends the whole template as one JSON document, and the action
 * used to do `JSON.parse(raw) as SubmittedTemplate` — a cast, which checks
 * nothing at runtime. Everything after it trusted a shape nobody had
 * verified: `{}` parses cleanly and then `stages.map` throws, and a
 * document with `priority: "banana"` or `dueInHours: -5` was stored intact
 * because the validator that ran afterwards only ever examined the graph.
 *
 * Two different questions, kept apart on purpose.
 *
 * This file answers "is this a template document": right shapes, known
 * enum values, numbers that are numbers and inside a range, strings inside
 * a length. Failing it means the thing cannot be stored at all, because it
 * is not a template.
 *
 * template-validation.ts answers "does this template hang together": keys
 * that resolve, stages that are reachable, approvals with somewhere to
 * send rejected work. Failing that is reported and still saved, because a
 * draft is allowed to be half-built.
 *
 * So this is deliberately permissive about *incompleteness*. An empty name,
 * a select with no options yet, a stage with nobody assigned — all valid
 * documents describing an unfinished workflow, and all things the other
 * file complains about at the point it matters.
 *
 * Pure, and built from the same const arrays the types come from, so a new
 * field type or priority cannot be accepted here without existing there.
 */

import * as z from 'zod'
import { HOURS_LIMITS, TEXT_LIMITS } from '@/lib/validation/bounds'
import { FIELD_TYPES } from '@/lib/types/workflow'
import { PRIORITIES } from '@/lib/types/status'
import { isEntityId } from '@/lib/ids/format'
import type { StageDefinition } from '@/lib/types/workflow'

/** A permanent id of a given kind, checked for format only. */
function entityId(kind: Parameters<typeof isEntityId>[1]) {
  return z.string().refine((value) => isEntityId(value, kind), {
    error: `Expected a ${kind} id, like BO-XXX-00001.`,
  })
}

/**
 * An id that may be left unset.
 *
 * The editor's "Not tied to a project" option is a select with an empty
 * value, so unset arrives as `""` rather than as a missing key. Treating
 * only a missing key as absence rejects every save from a workflow with
 * no project, which is most of them.
 */
function optionalEntityId(kind: Parameters<typeof isEntityId>[1]) {
  return z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    entityId(kind).optional(),
  )
}

/**
 * A key, bounded but not patterned.
 *
 * The pattern belongs in template-validation, which reports it while
 * somebody is still typing rather than refusing to save their work.
 */
const key = z.string().max(TEXT_LIMITS.label)

const label = z.string().max(TEXT_LIMITS.label)

const fieldSchema = z.object({
  key,
  label,
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
  helpText: z.string().max(TEXT_LIMITS.helpText).optional(),
  options: z.array(z.string().max(TEXT_LIMITS.option)).max(50).optional(),
})

const fileSchema = z.object({
  key,
  label,
  required: z.boolean(),
  acceptedExtensions: z.array(z.string().max(16)).max(30).optional(),
})

const checklistSchema = z.object({
  key,
  label,
  group: z.string().max(TEXT_LIMITS.label).optional(),
  required: z.boolean(),
})

const assigneeSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('role'), roleId: entityId('role') }),
  z.object({ mode: z.literal('users'), userIds: z.array(entityId('user')).max(50) }),
  z.object({ mode: z.literal('initiator') }),
  z.object({ mode: z.literal('stage_assignee'), stageKey: key }),
])

const conditionSchema = z.object({
  fieldKey: key,
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in']),
  value: z.union([
    z.string().max(TEXT_LIMITS.option),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string().max(TEXT_LIMITS.option), z.number()])).max(50),
  ]),
})

/**
 * Hours, as an offset from the moment a stage activates.
 *
 * A whole number: half an hour of deadline is a precision the product does
 * not offer anywhere it is read. Bounded at a year, because a stage due in
 * a century is a typo that would sit in the data looking deliberate.
 */
const hours = z
  .number()
  .int({ error: 'Give this in whole hours.' })
  .min(HOURS_LIMITS.min, { error: 'Hours cannot be negative.' })
  .max(HOURS_LIMITS.max, { error: 'Give this as a year or less, in hours.' })
  .optional()

const stageSchema = z.object({
  key,
  name: label,
  description: z.string().max(TEXT_LIMITS.description).optional(),
  instructions: z.string().max(TEXT_LIMITS.instructions).optional(),

  assignees: z.array(assigneeSchema).max(50),
  completionRule: z.enum(['any', 'all']),

  fields: z.array(fieldSchema).max(100),
  files: z.array(fileSchema).max(50),
  checklist: z.array(checklistSchema).max(200),

  priority: z.enum(PRIORITIES),
  dueInHours: hours,
  slaHours: hours,

  requiresApproval: z.boolean(),
  rejectTargetStageKey: key.optional(),

  nextStageKey: key.nullable(),

  conditions: z.array(conditionSchema).max(20).optional(),
})

export const submittedTemplateSchema = z.object({
  name: z.string().max(TEXT_LIMITS.name),
  description: z.string().max(TEXT_LIMITS.description).optional(),
  projectId: optionalEntityId('project'),
  departmentId: optionalEntityId('department'),
  stages: z.array(stageSchema).max(100),
  initialStageKey: key,
})

export type SubmittedTemplate = z.infer<typeof submittedTemplateSchema>

export interface TemplateParse {
  ok: boolean
  template?: SubmittedTemplate
  /** Where it went wrong, in terms somebody can act on. */
  problems: string[]
}

/**
 * Read a posted template document.
 *
 * Never throws: the caller is a server action, and an exception there is a
 * 500 rather than an answer. A malformed document comes back as problems
 * naming the path that was wrong, because "stages.2.priority" is the
 * difference between a fixable report and "something went wrong".
 */
export function parseSubmittedTemplate(raw: unknown): TemplateParse {
  if (typeof raw !== 'string') {
    return { ok: false, problems: ['The workflow was not sent in a form this can read.'] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, problems: ['The workflow could not be read. Try saving again.'] }
  }

  const result = submittedTemplateSchema.safeParse(parsed)
  if (result.success) return { ok: true, template: result.data, problems: [] }

  return {
    ok: false,
    problems: result.error.issues.map((issue) => {
      const path = issue.path.join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    }),
  }
}

/**
 * The parsed stages, as the engine's own type.
 *
 * The schema is built from the same unions the type is, so this is a
 * restatement rather than a claim — but `roleId` and `userIds` are branded
 * in the type and plain strings here, and only the caller can say they
 * exist. Format is checked above; existence stays the action's job.
 */
export function asStageDefinitions(stages: SubmittedTemplate['stages']): StageDefinition[] {
  return stages as StageDefinition[]
}
