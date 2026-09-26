/**
 * What is left to set up, and what someone has already been shown.
 *
 * The steps read the real state of the organisation rather than a list of
 * boxes somebody ticked. A checklist that can be completed without the work
 * being done teaches people to ignore it.
 */

import 'server-only'
import { listRoles } from '@/lib/db/repositories/roles'
import { listUsers } from '@/lib/db/repositories/users'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { listAllTemplates } from '@/lib/db/repositories/workflow-templates'
import { PRACTICE_WORKFLOW } from '@/lib/seed/workflows/practice'
import { can } from '@/lib/auth/permissions'
import type { PublicUser } from '@/lib/types/user'
import { buildSetupSteps, type SetupStep } from './steps'

export type { SetupStep }

export interface Onboarding {
  showTour: boolean
  showSetup: boolean
  steps: SetupStep[]
  remaining: number
  practiceDone: boolean
}

export async function getOnboarding(user: PublicUser): Promise<Onboarding> {
  const [roles, users, templates, instances] = await Promise.all([
    listRoles(),
    listUsers(),
    listAllTemplates(),
    listInstances(),
  ])

  const { steps, practiceDone } = buildSetupSteps({
    viewer: user,
    users,
    roles,
    templates,
    instances,
    practiceWorkflowName: PRACTICE_WORKFLOW.name,
  })

  const remaining = steps.filter((step) => !step.done).length

  return {
    showTour: !user.onboarding?.tourSeenAt,
    // Setting up the organisation is an administrator's job. An employee was
    // being shown a checklist for work that is not theirs to do, above the
    // work that is.
    showSetup:
      can(user.accessLevel, 'admin.manage_users') &&
      remaining > 0 &&
      !user.onboarding?.setupDismissedAt,
    steps,
    remaining,
    practiceDone,
  }
}
