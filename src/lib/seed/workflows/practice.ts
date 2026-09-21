/**
 * Practice Run — somewhere safe to learn the product.
 *
 * Three short stages that exercise the things people have to do for real:
 * record something, upload a file, tick a checklist, and be sent back once.
 * Every stage goes to whoever started it, so one person can drive the whole
 * thing alone without waiting on a colleague.
 *
 * It is an ordinary workflow on the ordinary engine — which is rather the
 * point. Learning it is learning the product.
 */

import type { WorkflowTemplateSeed } from './types'

export const PRACTICE_WORKFLOW: WorkflowTemplateSeed = {
  key: 'practice_run',
  name: 'Practice Run',
  description:
    'A safe workflow for learning how Business Orbit works. Nothing here affects real work.',
  projectKey: 'sandbox',
  departmentKey: 'operations',
  initialStageKey: 'describe',
  stages: [
    {
      key: 'describe',
      name: 'Describe the work',
      description: 'Stand in for the moment somebody raises a request.',
      instructions:
        'Type anything you like below and complete the stage. In a real workflow this is where the person who needs something describes it. Watch what happens next: the platform moves the work on by itself.',
      assignees: [{ mode: 'initiator' }],
      completionRule: 'any',
      fields: [
        {
          key: 'practice_subject',
          label: 'What is this practice run about',
          type: 'text',
          required: true,
          helpText: 'Anything at all. Nobody else sees this.',
        },
      ],
      files: [],
      checklist: [],
      priority: 'low',
      dueInHours: 72,
      requiresApproval: false,
      nextStageKey: 'produce',
    },
    {
      key: 'produce',
      name: 'Attach something',
      description: 'Stands in for design, content or any stage that produces a file.',
      instructions:
        'Upload any file using the panel on the right, then complete the stage. Try completing it before you upload: the platform will refuse, which is how a required file is enforced everywhere else.',
      assignees: [{ mode: 'initiator' }],
      completionRule: 'any',
      fields: [],
      files: [
        {
          key: 'practice_file',
          label: 'Any file at all',
          required: true,
        },
      ],
      checklist: [],
      priority: 'low',
      dueInHours: 72,
      requiresApproval: false,
      nextStageKey: 'check',
    },
    {
      key: 'check',
      name: 'Check and approve',
      description: 'Stands in for quality check and approval together.',
      instructions:
        'Tick every item, then choose Approve final or Request changes. Requesting changes needs a comment and sends the work back to Attach something as a second pass, exactly as a real rejection does.',
      assignees: [{ mode: 'initiator' }],
      completionRule: 'any',
      fields: [],
      files: [],
      checklist: [
        { key: 'read_instructions', label: 'I read the instructions', group: 'Checks', required: true },
        { key: 'saw_the_file', label: 'I can see the file I uploaded', group: 'Checks', required: true },
        { key: 'saw_the_history', label: 'I found the activity history', group: 'Checks', required: true },
      ],
      priority: 'low',
      dueInHours: 72,
      requiresApproval: true,
      rejectTargetStageKey: 'produce',
      nextStageKey: null,
    },
  ],
}
