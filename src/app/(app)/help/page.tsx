/**
 * HELP — how Business Orbit is put together.
 *
 * Reference rather than a tour: the four levels, the words the platform uses,
 * and the two distinctions people reliably get wrong. Written to be read when
 * somebody is confused, which is not the same moment as their first login.
 *
 * The four levels are drawn as a line with a station for each, like the runs
 * elsewhere, because they are a sequence: each one sits inside the last. The
 * panels beneath share a row and stretch to the same height.
 */

import { requireUser } from '@/lib/auth/dal'
import { PageHeader, Panel, buttonClass } from '@/features/ui/primitives'
import { startPracticeAction } from '@/features/onboarding/actions'
import { can } from '@/lib/auth/permissions'

const LEVELS = [
  {
    name: 'Major Project',
    example: 'Startup Mela 2027',
    meaning: 'An initiative that gathers related work in one place.',
  },
  {
    name: 'Workflow',
    example: 'Proposal Creation',
    meaning: 'A process that repeats inside it. The recipe.',
  },
  {
    name: 'Instance',
    example: 'Proposal: ABC Technologies',
    meaning: 'One run of the process, for one client. The meal.',
  },
  {
    name: 'Stage',
    example: 'Design & Formatting',
    meaning: 'The step you are responsible for. It is a task on your My Work.',
    yours: true,
  },
] as const

function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>
}

export default async function HelpPage() {
  const user = await requireUser()
  const oversees = can(user.accessLevel, 'management.view_dashboard')
  const administers = can(user.accessLevel, 'admin.manage_roles')

  return (
    <>
      <PageHeader
        title="How this works"
        description="The shape of the platform, and the words it uses. New here? The practice workflow is three short stages in a Sandbox project: it runs on the same machinery as real work and affects nothing."
        actions={
          <form action={startPracticeAction}>
            <button type="submit" className={buttonClass('primary', 'md')}>
              Run a practice workflow
            </button>
          </form>
        }
      />

      <div className="space-y-6">
        <Panel title="The four levels" description="Almost every misunderstanding starts here.">
          <ol className="grid gap-x-6 gap-y-5 px-5 py-6 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((level, index) => (
              <li key={level.name} className="relative min-w-0">
                {/* The line the stations sit on, joining each level to the next.
                    The last level has nothing after it, so it draws none; a
                    line running off the end was adding a scrollbar. */}
                {index < LEVELS.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-3 right-[-1.5rem] top-[0.6rem] hidden h-[5px] bg-border-strong lg:block"
                  />
                ) : null}
                <span
                  aria-hidden
                  className={`relative z-10 block size-[1.1rem] rounded-full border-[4px] ${
                    'yours' in level
                      ? 'border-foreground bg-surface ring-4 ring-accent-ring'
                      : 'border-accent bg-accent'
                  }`}
                />
                <p className="mt-3 text-xs font-semibold text-muted">
                  {index + 1}. {level.name}
                </p>
                <p className="mt-0.5 text-base font-bold tracking-[-0.01em] [overflow-wrap:anywhere]">
                  {level.example}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{level.meaning}</p>
              </li>
            ))}
          </ol>

          <p className="border-t border-border bg-surface-sunken px-5 py-3.5 text-sm leading-relaxed text-muted">
            The one worth holding on to: a workflow is the <em>recipe</em>, an instance is the{' '}
            <em>meal</em>. Changing the recipe never changes a meal already being cooked.
          </p>
        </Panel>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
          <Panel fill title="The habit the platform asks for">
            <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-muted">
              <p>
                When you finish your part, the platform works out who is next, gives them
                the task and tells them. Nobody has to be messaged, and nothing has to be
                chased.
              </p>
              <p>
                So the habit is simply: <Term>check My Work instead of asking</Term>. If
                something you raised has gone quiet, it is in your Waiting section with the
                name of whoever is holding it and how long it has been there.
              </p>
              <p>
                Anything the platform tells you lands in <Term>Notifications</Term>. Press
                Refresh there to look again.
              </p>
            </div>
          </Panel>

          <Panel fill title="Two things people mix up">
            <dl className="divide-y divide-border">
              <div className="px-5 py-4">
                <dt className="text-sm font-bold text-foreground">
                  A role is not an access level
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">
                  A <Term>workflow role</Term> (Proposal Designer, QC Owner) decides what
                  work reaches you. An <Term>access level</Term> (employee, manager,
                  administrator) decides what you can see and change. They are independent:
                  somebody can be an employee who holds three roles, or an administrator who
                  holds none.
                </dd>
              </div>

              <div className="px-5 py-4">
                <dt className="text-sm font-bold text-foreground">
                  Finishing a stage is not approving it
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">
                  Most stages are completed. Some are approval stages, where the choice is to
                  approve or send the work back. Sending it back always needs a comment, and
                  the work returns as a new pass with everything from the previous one still
                  on record.
                </dd>
              </div>
            </dl>
          </Panel>
        </div>

        {oversees || administers ? (
          <div
            className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${
              oversees && administers ? 'lg:grid-cols-2' : ''
            }`}
          >
            {oversees ? (
              <Panel fill title="If you manage the work">
                <ul className="space-y-3 px-5 py-4 text-sm leading-relaxed text-muted">
                  <li>
                    <Term>Overview</Term>: what is running now, and what has been sitting
                    longer than its stage allows.
                  </li>
                  <li>
                    <Term>Team</Term>, a tab of Overview: what each person is carrying. Open
                    a task and you can move it to somebody else, with a reason that goes on
                    the record.
                  </li>
                  <li>
                    <Term>Reports</Term>, another tab: how long work takes, which stage holds
                    it up and how often it comes back. Measured from the records, not
                    estimated.
                  </li>
                  <li>
                    <Term>Board</Term>: every run of one workflow as columns. Move a card you
                    hold with its button, or drag it.
                  </li>
                </ul>
              </Panel>
            ) : null}

            {administers ? (
              <Panel fill title="If you set it up">
                <ul className="space-y-3 px-5 py-4 text-sm leading-relaxed text-muted">
                  <li>
                    <Term>Admin</Term>: who holds which role. This is how somebody joining or
                    leaving is handled: point the role at somebody else and every workflow
                    follows.
                  </li>
                  <li>
                    <Term>Workflows</Term>: build a process without a developer. It starts as
                    a draft, and publishing is what lets work start on it.
                  </li>
                  <li>
                    A published version cannot be edited, because work is running on it.
                    Editing creates the next version, and anything already in flight
                    continues on the one it started with.
                  </li>
                </ul>
              </Panel>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'How this works' }
