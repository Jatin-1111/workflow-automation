/**
 * SEARCH — one box across everything (spec §48).
 *
 * People, projects, workflows, work, stages and files, scoped to what the
 * person searching is allowed to see.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { Section } from '@/features/management/section'
import { runSearch } from '@/features/search/queries'
import { MIN_SEARCH_LENGTH } from '@/features/search/query'

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const user = await requireUser()
  const params = await searchParams

  const term = typeof params.q === 'string' ? params.q : ''
  const results = await runSearch(term, user)

  // A pasted id is navigation: go straight there rather than showing one row.
  if (results.jumpTo && params.jump !== 'no') {
    redirect(results.jumpTo)
  }

  return (
    <AppShell user={user} current="/search">
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Search</h1>
          <p className="mt-1 text-sm text-muted">
            People, projects, workflows, work, stages and files. Paste an ID to go
            straight to it.
          </p>
        </div>

        <form method="get" action="/search" className="mb-6 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={results.parsed.term}
            autoFocus
            placeholder="Client, person, stage, file, or an ID like BO-TSK-00001"
            className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            Search
          </button>
        </form>

        {!results.parsed.usable ? (
          <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            {results.parsed.term.length === 0
              ? 'Type something to search for.'
              : `Use at least ${MIN_SEARCH_LENGTH} characters.`}
          </p>
        ) : results.total === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center">
            <p className="text-sm text-muted">
              Nothing matches “{results.parsed.term}” in what you can see.
            </p>
            <p className="mt-1 text-xs text-subtle">
              Search covers the work you have a part in. Ask whoever owns a piece
              of work to add you to it.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted">
              {results.total} result{results.total === 1 ? '' : 's'} for “
              {results.parsed.term}”
            </p>

            {results.groups.map((group) => (
              <Section key={group.label} title={group.label} count={group.hits.length}>
                <ul className="divide-y divide-border">
                  {group.hits.map((hit) => {
                    const body = (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{hit.title}</span>
                          {hit.context ? (
                            <span className="block truncate text-xs text-muted">
                              {hit.context}
                            </span>
                          ) : null}
                          <span className="block font-mono text-[11px] text-subtle">
                            {hit.id}
                          </span>
                        </span>
                        {hit.meta ? (
                          <span className="shrink-0 text-xs text-muted">{hit.meta}</span>
                        ) : null}
                      </>
                    )

                    return (
                      <li key={`${group.label}-${hit.id}`}>
                        {hit.href ? (
                          <Link
                            href={hit.href}
                            className="flex items-center gap-4 px-4 py-2.5 transition hover:bg-accent-soft/60"
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-4 px-4 py-2.5">{body}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Section>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
