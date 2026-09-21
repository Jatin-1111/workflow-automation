/** Workflow templates seeded at setup. */

import { PODCAST_PRODUCTION_WORKFLOW } from './podcast-production'
import { PRACTICE_WORKFLOW } from './practice'
import { PROPOSAL_CREATION_WORKFLOW } from './proposal-creation'
import type { WorkflowTemplateSeed } from './types'

export const WORKFLOW_SEEDS: WorkflowTemplateSeed[] = [
  PROPOSAL_CREATION_WORKFLOW,
  PODCAST_PRODUCTION_WORKFLOW,
  PRACTICE_WORKFLOW,
]
