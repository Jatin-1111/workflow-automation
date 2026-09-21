/**
 * HELP — how Business Orbit is put together.
 *
 * Reference rather than a tour: the four levels, the words the platform uses,
 * and the two distinctions people reliably get wrong. Written to be read when
 * somebody is confused, which is not the same moment as their first login.
 */

import { requireUser } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { PageHeader, Panel, buttonClass } from '@/features/ui/primitives'
import { startPracticeAction } from '@/features/onboarding/actions'
import { can } from '@/lib/auth/permissions'

export default async function HelpPage() {
  const user = await requireUser()
  const oversees = can(user.accessLevel, 'management.view_dashboard')
  const administers = can(user.accessLevel, 'admin.manage_roles')

  return (
    <AppShell user={user} current="/help">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader
          title="How this works"
          description="The shape of the platform, and the words it uses."
          actions={
            <form action={startPracticeAction}>
              <button type="submit" className={buttonClass('primary', 'md')}>
                Run a practice workflow
              </button>
            </form>
          }
        />

        <div className="space-y-6">
          <Panel
            title="The four levels"
            description="Almost every misunderstanding starts here."
          >
            <div className="space-y-4 px-5 py-4">
              <p className="text-sm leading-relaxed text-muted">
                A <strong className="font-medium text-foreground">Major Project</strong> is
                an initiative, like Startup Mela 2027. A{' '}
                <strong className="font-medium text-foreground">Workflow</strong> is a
                process that repeats inside it, like Proposal Creation. Each time you run
                that process you get an{' '}
                <strong className="font-medium text-foreground">instance</strong> — one
                proposal, for one client. An instance moves through{' '}
                <strong className="font-medium text-foreground">stages</strong>, and the
                stage you are responsible for is a{' '}
                <strong className="font-medium text-foreground">task</strong> on your My
                Work.
              </p>

              <ol className="space-y-2 rounded-lg border border-border bg-surface-sunken p-4 text-sm">
                <li className="text-muted">Startup Mela 2027</li>
                <li className="pl-4 text-muted">↳ Proposal Creation</li>
                <li className="pl-8 text-muted">↳ Proposal — ABC Technologies</li>
                <li className="pl-12 font-medium text-foreground">
                  ↳ Design &amp; Formatting — assigned to you
                </li>
              </ol>

              <p className="text-sm leading-relaxed text-muted">
                The one worth holding on to: a workflow is the{' '}
                <em>recipe</em>, an instance is the <em>meal</em>. Changing the recipe
                never changes a meal already being cooked.
              </p>
            </div>
          </Panel>

          <Panel title="The habit the platform asks for">
            <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-muted">
              <p>
                When you finish your part, the platform works out who is next, gives them
                the task and tells them. Nobody has to be messaged, and nothing has to be
                chased.
              </p>
              <p>
                So the habit is simply: <strong className="font-medium text-foreground">
                check My Work instead of asking</strong>. If something you raised has gone
                quiet, it is in your Waiting section with the name of whoever is holding
                it and how long it has been there.
              </p>
            </div>
          </Panel>

          <Panel title="Two things people mix up">
            <dl className="divide-y divide-border">
              <div className="px-5 py-4">
                <dt className="text-sm font-medium text-foreground">
                  A role is not an access level
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">
                  A <strong className="font-medium text-foreground">workflow role</strong>{' '}
                  — Proposal Designer, QC Owner — decides what work reaches you. An{' '}
                  <strong className="font-medium text-foreground">access level</strong> —
                  employee, manager, administrator — decides what you can see and change.
                  They are independent: somebody can be an employee who holds three roles,
                  or an administrator who holds none.
                </dd>
              </div>

              <div className="px-5 py-4">
                <dt className="text-sm font-medium text-foreground">
                  Finishing a stage is not approving it
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">
                  Most stages are completed. Some are approval stages, where the choice is
                  to approve or send the work back. Sending it back always needs a
                  comment, and the work returns as a new pass with everything from the
                  previous one still on record.
                </dd>
              </div>
            </dl>
          </Panel>

          {oversees ? (
            <Panel title="If you manage the work">
              <ul className="space-y-2 px-5 py-4 text-sm leading-relaxed text-muted">
                <li>
                  <strong className="font-medium text-foreground">Dashboard</strong> — what
                  is running now, and what has been sitting longer than its stage allows.
                </li>
                <li>
                  <strong className="font-medium text-foreground">Team</strong> — what each
                  person is carrying. Open a task and you can move it to somebody else,
                  with a reason that goes on the record.
                </li>
                <li>
                  <strong className="font-medium text-foreground">Reports</strong> — how
                  long work takes, which stage holds it up and how often it comes back.
                  Measured from the records, not estimated.
                </li>
              </ul>
            </Panel>
          ) : null}

          {administers ? (
            <Panel title="If you set it up">
              <ul className="space-y-2 px-5 py-4 text-sm leading-relaxed text-muted">
                <li>
                  <strong className="font-medium text-foreground">Admin</strong> — who
                  holds which role. This is how somebody joining or leaving is handled:
                  point the role at somebody else and every workflow follows.
                </li>
                <li>
                  <strong className="font-medium text-foreground">Workflows</strong> —
                  build a process without a developer. It starts as a draft, and publishing
                  is what lets work start on it.
                </li>
                <li>
                  A published version cannot be edited, because work is running on it.
                  Editing creates the next version, and anything already in flight
                  continues on the one it started with.
                </li>
              </ul>
            </Panel>
          ) : null}

          <Panel title="Try it for real">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <p className="max-w-md text-sm leading-relaxed text-muted">
                The practice workflow is three short stages in the Sandbox project. Record
                something, attach a file, then approve it or send it back. It uses exactly
                the same machinery as real work, and affects nothing.
              </p>
              <form action={startPracticeAction}>
                <button type="submit" className={buttonClass('secondary', 'md')}>
                  Start a practice run
                </button>
              </form>
            </div>
          </Panel>
        </div>
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
