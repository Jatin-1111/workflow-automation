/**
 * When a workflow may be deleted.
 *
 * Deleting is only honest while nothing has ever run on it: instances and their
 * timeline events point at the workflow by id, so removing it from under them
 * would leave recorded history resolving to nothing. A workflow with any run,
 * finished or not, is retired instead.
 */

/** Why this workflow cannot be deleted, or null when it can. */
export function workflowDeletionBlocker(
  name: string,
  runCount: number,
): string | null {
  if (runCount <= 0) return null

  const work = runCount === 1 ? '1 piece of work has' : `${runCount} pieces of work have`
  return `${name} cannot be deleted: ${work} run on it, and that history has to stay readable. Retire it instead.`
}
