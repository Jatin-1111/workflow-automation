/**
 * Boards for the dev break page.
 *
 * Plausible values only: real naming patterns, and lengths up to the limits in
 * the validation bounds (80 for a name, 120 for a stage label or a run title).
 */

import type { Board, BoardCard, BoardColumn } from '@/features/board/queries'

type Kind = 'demo' | 'worst' | 'empty' | 'one' | 'many'

const who = (n: number, name: string) => {
  const parts = name.split(' ')
  return {
    userId: `BO-USR-${String(n).padStart(5, '0')}` as BoardCard['assignees'][number]['userId'],
    name,
    initials: (parts[0][0] + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase(),
  }
}

const NOW = Date.now()
const days = (n: number) => new Date(NOW + n * 86_400_000)

function card(n: number, overrides: Partial<BoardCard> = {}): BoardCard {
  return {
    instanceId: `BO-INS-${String(n).padStart(5, '0')}` as BoardCard['instanceId'],
    taskId: `BO-TSK-${String(n).padStart(5, '0')}` as BoardCard['taskId'],
    title: `Run ${n}`,
    projectName: 'Website Content',
    projectColor: 'teal',
    stageKey: 'draft',
    assignees: [who(2, 'Meera Nair')],
    dueAt: days(2),
    overdue: false,
    slaBreached: false,
    priority: 'medium',
    checklistDone: 0,
    checklistTotal: 0,
    fileCount: 0,
    revisionRound: 1,
    mine: false,
    ...overrides,
  }
}

function column(key: string, name: string, cards: BoardCard[], requiresApproval = false): BoardColumn {
  return { key, name, requiresApproval, cards: cards.map((c) => ({ ...c, stageKey: key })) }
}

export function boardFixture(kind: Kind): Board {
  const base = { workflowId: 'BO-WFL-00001', version: 1, elsewhere: [], done: [] }

  switch (kind) {
    case 'empty':
      return {
        ...base,
        name: 'Blog Post',
        columns: [column('draft', 'Write the draft', []), column('review', 'Review', [], true), column('publish', 'Publish', [])],
      }
    case 'one':
      return {
        ...base,
        name: 'Blog Post',
        columns: [
          column('draft', 'Write the draft', [card(1, { mine: true, title: 'How we choose a CRM' })]),
          column('review', 'Review', [], true),
          column('publish', 'Publish', []),
        ],
      }
    case 'worst':
      return {
        ...base,
        name: 'Regional launch readiness for regulated markets in the EU and UK',
        columns: [
          column('draft', 'Draft', [
            card(1, {
              mine: true,
              title: 'Case study: Ridgeline Foods and the long road to a compliant, accessible, localised launch in four languages',
              priority: 'urgent',
              overdue: true,
              dueAt: days(-53),
              checklistDone: 3,
              checklistTotal: 11,
              fileCount: 12,
              revisionRound: 12,
              assignees: [who(1, 'Aleksandra Wiśniewska-Kowalczyk'), who(2, 'Jo'), who(3, 'Nguyễn Thị Minh Khai'), who(4, 'Bartholomew Fitzgerald'), who(5, 'Priya Raman')],
            }),
            card(2, { title: 'No open task on this one', taskId: undefined, projectName: undefined, assignees: [] }),
          ]),
          column('legal', 'Legal and compliance review for regulated-market launches in the EU and UK before sign-off', [
            card(3, { title: 'Pricing page rewrite', priority: 'high', overdue: true, dueAt: days(-2), mine: true }),
          ], true),
          column('design', 'Design and formatting', []),
          column('regional', 'Regional marketing sign-off, including localisation and accessibility checks', []),
          column('qc', 'QC', [card(4, { title: 'Podcast: Episode 04', dueAt: days(0) })]),
          column('stage', 'Publish to staging', []),
          column('publish', 'Publish', []),
        ],
      }
    case 'many':
      return {
        ...base,
        name: 'Blog Post',
        columns: [
          column('draft', 'Write the draft', Array.from({ length: 40 }, (_, i) => card(i + 1, { title: `Post ${i + 1}: a working title`, mine: i % 3 === 0 }))),
          column('review', 'Review', [], true),
          column('publish', 'Publish', []),
        ],
      }
    default:
      return {
        ...base,
        name: 'Blog Post',
        columns: [
          column('draft', 'Write the draft', [card(1, { mine: true, title: 'How we choose a CRM', dueAt: days(1), checklistDone: 1, checklistTotal: 2 })]),
          column('review', 'Review', [card(2, { title: 'Pricing page rewrite', overdue: true, dueAt: days(-53), revisionRound: 2, priority: 'high' })], true),
          column('publish', 'Publish', [card(3, { title: 'Case study: Ridgeline Foods', assignees: [who(3, 'Rohan Das')] })]),
        ],
      }
  }
}
