/**
 * What is left to set up, and what someone has already been shown.
 *
 * The steps read the real state of the organisation rather than a list of
 * boxes somebody ticked. A checklist that can be completed without the work
 * being done teaches people to ignore it.
 */

import 'server-only'
import { can } from '@/lib/auth/permissions'
import { listRoles } from '@/lib/db/repositories/roles'
import { listUsers } from '@/lib/db/repositories/users'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { listAllTemplates } from '@/lib/db/repositories/workflow-templates'
import { PRACTICE_WORKFLOW } from '@/lib/seed/workflows/practice'
import type { PublicUser } from '@/lib/types/user'

export interface SetupStep {
  key: string
  title: string
  detail: string
  done: boolean
  href?: string
  /** Shown as the reason this matters, not as an instruction. */
  because?: string
}

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

  const practiceTemplate = templates.find(
    (template) => template.name === PRACTICE_WORKFLOW.name,
  )
  const myPractice = instances.filter(
    (instance) =>
      practiceTemplate &&
      instance.workflowId === practiceTemplate.workflowId &&
      instance.initiatedBy === user.userId,
  )
  const practiceDone = myPractice.some((instance) => instance.status === 'completed')
  const practiceStarted = myPractice.length > 0

  const steps: SetupStep[] = [
    {
      key: 'practice',
      title: practiceDone ? 'You have run a workflow end to end' : 'Run a practice workflow',
      detail: practiceStarted && !practiceDone
        ? 'You have one in progress. Finish it to see a workflow complete.'
        : 'Three short stages in the Sandbox project. Nothing real is affected.',
      done: practiceDone,
      because: 'The quickest way to understand the product is to run one.',
    },
  ]

  // Only an administrator can act on the rest, so only they are shown it.
  if (can(user.accessLevel, 'admin.manage_roles')) {
    const activeHolders = (roleId: string) =>
      users.filter(
        (candidate) => candidate.status === 'active' && candidate.roleIds.includes(roleId as never),
      ).length

    const usedRoleIds = new Set(
      templates
        .filter((template) => template.status === 'active')
        .flatMap((template) =>
          template.stages.flatMap((stage) =>
            stage.assignees.flatMap((source) =>
              source.mode === 'role' ? [source.roleId as string] : [],
            ),
          ),
        ),
    )
    const uncovered = roles.filter(
      (role) => usedRoleIds.has(role.roleId) && activeHolders(role.roleId) === 0,
    )

    steps.push({
      key: 'roles',
      title:
        uncovered.length === 0
          ? 'Every role a workflow uses has somebody in it'
          : `${uncovered.length} role${uncovered.length === 1 ? '' : 's'} has nobody in it`,
      detail:
        uncovered.length === 0
          ? 'Work can reach a person at every stage.'
          : `${uncovered.map((role) => role.name).join(', ')} — a workflow routing here will refuse to move.`,
      done: uncovered.length === 0,
      href: '/admin',
      because: 'Workflows send work to roles, and a role with nobody in it stops the work.',
    })

    const published = templates.filter(
      (template) => template.status === 'active' && template.name !== PRACTICE_WORKFLOW.name,
    )
    steps.push({
      key: 'workflow',
      title:
        published.length > 0
          ? `${published.length} workflow${published.length === 1 ? '' : 's'} published`
          : 'Publish your first workflow',
      detail:
        published.length > 0
          ? published.map((template) => template.name).join(', ')
          : 'Build a process in the Workflow Builder, then publish it so work can start.',
      done: published.length > 0,
      href: '/workflows',
      because: 'Nothing can run until a workflow is published.',
    })

    const real = instances.filter(
      (instance) =>
        !practiceTemplate || instance.workflowId !== practiceTemplate.workflowId,
    )
    steps.push({
      key: 'first-run',
      title: real.length > 0 ? 'Real work is running' : 'Start your first real piece of work',
      detail:
        real.length > 0
          ? `${real.length} started so far.`
          : 'Once a workflow is published, starting one puts it on somebody’s My Work.',
      done: real.length > 0,
      because: 'This is the point at which the platform starts replacing the chasing.',
    })
  }

  const remaining = steps.filter((step) => !step.done).length

  return {
    showTour: !user.onboarding?.tourSeenAt,
    showSetup: remaining > 0 && !user.onboarding?.setupDismissedAt,
    steps,
    remaining,
    practiceDone,
  }
}
