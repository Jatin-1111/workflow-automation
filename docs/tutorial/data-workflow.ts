/** A small, obvious workflow for the tutorial: write → review → publish. */
import { closeMongoClient } from '@/lib/db/client'
import { nextId } from '@/lib/ids/generate'
import { insertTemplate } from '@/lib/db/repositories/workflow-templates'
import { listProjects } from '@/lib/db/repositories/projects'
import type { StageDefinition } from '@/lib/types/workflow'
import type { ProjectId, RoleId, UserId, WorkflowTemplateId } from '@/lib/types/ids'

const WRITER = 'BO-ROL-00001' as RoleId
const EDITOR = 'BO-ROL-00002' as RoleId

const stages: StageDefinition[] = [
  {
    key: 'write_draft',
    name: 'Write the draft',
    instructions: 'Write the post and paste it in. The editor reviews it next.',
    assignees: [{ mode: 'role', roleId: WRITER }],
    completionRule: 'any',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', required: true },
      { key: 'draft', label: 'The draft', type: 'textarea', required: true },
      {
        key: 'publish_by',
        label: 'Wanted by',
        type: 'date',
        required: false,
        helpText: 'Leave blank if there is no particular date.',
      },
    ],
    files: [],
    checklist: [],
    priority: 'medium',
    dueInHours: 48,
    requiresApproval: false,
    nextStageKey: 'review',
  },
  {
    key: 'review',
    name: 'Review',
    instructions: 'Read it. Approve to send it on, or send it back with a note.',
    assignees: [{ mode: 'role', roleId: EDITOR }],
    completionRule: 'any',
    fields: [],
    files: [],
    checklist: [
      { key: 'reads_well', label: 'Reads well', required: true },
      { key: 'facts_checked', label: 'Facts checked', required: true },
    ],
    priority: 'high',
    dueInHours: 24,
    requiresApproval: true,
    rejectTargetStageKey: 'write_draft',
    nextStageKey: 'publish',
  },
  {
    key: 'publish',
    name: 'Publish',
    instructions: 'Put it live and paste the link.',
    assignees: [{ mode: 'role', roleId: WRITER }],
    completionRule: 'any',
    fields: [{ key: 'live_url', label: 'Live link', type: 'text', required: true }],
    files: [],
    checklist: [],
    priority: 'medium',
    dueInHours: 24,
    requiresApproval: false,
    nextStageKey: null,
  },
]

async function main() {
  const project = (await listProjects())[0]
  const workflowId = (await nextId('workflowTemplate')) as WorkflowTemplateId
  const now = new Date()
  await insertTemplate({
    workflowId,
    version: 1,
    name: 'Blog Post',
    description: 'From a draft to a published post, with one review in between.',
    projectId: project?.projectId as ProjectId | undefined,
    stages,
    initialStageKey: 'write_draft',
    status: 'draft',
    createdBy: 'BO-USR-00001' as UserId,
    createdAt: now,
    updatedAt: now,
  })
  console.log('draft created:', workflowId, 'project:', project?.name ?? 'none')
  await closeMongoClient()
}
main()
