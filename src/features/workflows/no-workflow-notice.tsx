/**
 * What to say when no workflow has been published yet.
 *
 * Only administrators can build one, and Workflows is not in anyone else's
 * navigation, so telling an employee or a manager to "build one under
 * Workflows" sent them at a page that answers with "no access". They are told
 * who can; an administrator gets the link.
 */

import Link from 'next/link'

export function NoWorkflowNotice({
  canBuild,
  after,
}: {
  /** Whether this person may open Workflows (admin.manage_workflows). */
  canBuild: boolean
  /** The sentence that finishes the thought on this particular page. */
  after: string
}) {
  return (
    <>
      No workflow has been published yet.{' '}
      {canBuild ? (
        <>
          <Link href="/workflows" className="text-accent underline-offset-4 hover:underline">
            Build one in Workflows
          </Link>{' '}
          and publish it.
        </>
      ) : (
        'Ask an administrator to build and publish one.'
      )}{' '}
      {after}
    </>
  )
}
