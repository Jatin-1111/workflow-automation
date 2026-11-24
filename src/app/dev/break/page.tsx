/**
 * Dev-only: the new components against the worst realistic data.
 *
 * `?data=` picks the fixture: demo, worst, empty, one or many. It renders the
 * same components the app uses, fed through the same props, so a break here
 * is a break there. It is not found in production.
 *
 * Every worst-case value is either a real naming pattern or the limit the
 * validation bounds actually allow (80 characters for a name, 120 for a stage
 * label), never random text.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StatStrip, StatTile } from '@/features/management/stat-tile'
import { WorkloadList } from '@/features/management/workload-list'
import type { WorkloadRow } from '@/features/management/queries'
import { RunLine, type RunStop } from '@/features/ui/run-line'
import { Panel } from '@/features/ui/primitives'

type Fixture = 'demo' | 'worst' | 'empty' | 'one' | 'many'
const FIXTURES: { id: Fixture; label: string }[] = [
  { id: 'demo', label: 'Demo data' },
  { id: 'worst', label: 'Worst case' },
  { id: 'empty', label: 'Empty' },
  { id: 'one', label: 'One' },
  { id: 'many', label: '1,000 rows' },
]

const person = (
  n: number,
  name: string,
  active: number,
  overdue: number,
  pendingApprovals: number,
): WorkloadRow => ({
  userId: `BO-USR-${String(n).padStart(5, '0')}` as WorkloadRow['userId'],
  name,
  roleCount: 1,
  active,
  dueToday: 0,
  overdue,
  pendingApprovals,
})

const LONGEST_STAGE =
  'Legal and compliance review for regulated-market launches in the EU and UK before sign-off' // 91
const AT_LIMIT_STAGE = 'Regional marketing sign-off, including localisation and accessibility checks ahead of go-live' // < 120

function fixture(which: Fixture) {
  const stop = (name: string, state: RunStop['state'], revisionRound?: number): RunStop => ({
    name,
    state,
    revisionRound,
  })

  switch (which) {
    case 'worst':
      return {
        stops: [
          stop('Draft', 'done'),
          stop(LONGEST_STAGE, 'done'),
          stop('Design & formatting', 'done', 4),
          stop(AT_LIMIT_STAGE, 'current', 12),
          stop('QC', 'upcoming'),
          stop('Conditional: only if the client is in a regulated sector', 'skipped'),
          stop('Publish to staging', 'upcoming'),
          stop('Pré-lançamento: revisão final', 'upcoming'),
          stop('Archive', 'upcoming'),
        ],
        people: [
          person(1, 'Aleksandra Wiśniewska-Kowalczyk-Montgomery-Featherstonehaugh III', 1284, 17, 99),
          person(2, 'Jo', 1, 1, 0),
          person(3, 'Nguyễn Thị Minh Khai', 0, 0, 0),
          person(4, 'Bartholomew Fitzgerald', 999, 0, 1),
        ],
        figures: [1284, 99, 100000, 12, 0, 1, 31, 1],
      }
    case 'empty':
      return { stops: [], people: [], figures: [0, 0, 0, 0, 0, 0, 0, 0] }
    case 'one':
      return {
        stops: [stop('Review', 'current')],
        people: [person(1, 'Nitin', 1, 1, 1)],
        figures: [1, 1, 1, 1, 1, 1, 1, 1],
      }
    case 'many':
      return {
        stops: Array.from({ length: 12 }, (_, i) =>
          stop(`Stage ${i + 1}`, i < 5 ? 'done' : i === 5 ? 'current' : 'upcoming'),
        ),
        people: Array.from({ length: 1000 }, (_, i) =>
          person(i + 1, `Person ${i + 1}`, (i * 7) % 40, i % 9 === 0 ? 2 : 0, i % 13 === 0 ? 1 : 0),
        ),
        figures: [214, 38, 1204, 87, 5, 66, 3090, 12],
      }
    default:
      return {
        stops: [stop('Write the draft', 'done'), stop('Review', 'current', 2), stop('Publish', 'upcoming')],
        people: [
          person(1, 'Meera Nair', 1, 1, 1),
          person(2, 'Rohan Das', 1, 1, 0),
          person(3, 'Nitin', 0, 0, 0),
        ],
        figures: [2, 1, 0, 2, 0, 0, 1, 1],
      }
  }
}

const LABELS = [
  'Overdue tasks',
  'Pending approvals',
  'Due today',
  'Active workflows',
  'Blocked',
  'Completed this week',
  'Completed overall',
  'Projects',
]
const SIZES = ['lead', 'lead', 'base', 'base', 'quiet', 'quiet', 'quiet', 'quiet'] as const
const TONES = ['alert', 'action', 'action', 'progress', 'alert', 'good', 'good', 'neutral'] as const

export default async function BreakPage({ searchParams }: PageProps<'/dev/break'>) {
  if (process.env.NODE_ENV === 'production') notFound()

  const { data } = await searchParams
  const which = (FIXTURES.find((f) => f.id === data)?.id ?? 'demo') as Fixture
  const { stops, people, figures } = fixture(which)

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8 pb-24">
      <h1 className="text-[2rem] font-extrabold leading-9 tracking-[-0.03em]">
        Break test: {FIXTURES.find((f) => f.id === which)?.label}
      </h1>

      <StatStrip columns="ribbon">
        {LABELS.map((label, i) => (
          <StatTile
            key={label}
            label={label}
            value={figures[i]}
            tone={TONES[i]}
            size={SIZES[i]}
          />
        ))}
      </StatStrip>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8" title="A run's line" count={stops.length}>
          <div className="px-5 py-5">
            {stops.length === 0 ? (
              <p className="text-sm text-muted">No stages.</p>
            ) : (
              <RunLine stops={stops} />
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-4" title="Team workload" count={people.length}>
          {people.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">Nobody to show.</p>
          ) : (
            <div className="max-h-[32rem] overflow-y-auto">
              <WorkloadList rows={people} />
            </div>
          )}
        </Panel>
      </div>

      {/* Dev chrome: plain on purpose, not part of the design under test. */}
      <div className="fixed inset-x-0 bottom-3 flex justify-center">
        <div
          role="group"
          aria-label="Data set"
          className="flex gap-0.5 rounded-lg bg-neutral-200 p-0.5 font-sans text-xs shadow"
        >
          {FIXTURES.map((f) => (
            <Link
              key={f.id}
              href={`/dev/break?data=${f.id}`}
              className={`rounded-md px-3 py-1.5 ${
                f.id === which ? 'bg-white font-semibold shadow-sm' : 'text-neutral-600'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
