/**
 * What a drag means.
 *
 * Dropping a card on a column is a gesture, not an instruction: this decides
 * which engine operation it stands for, and the engine still decides whether
 * that operation is allowed. Pure, because it is the rule that keeps a board
 * from becoming a way around the workflow.
 */

export type Move =
  | { kind: 'same' }
  /** Finish this stage. On an approval stage that means approving. */
  | { kind: 'forward'; approval: boolean }
  /** Send it back, which only an approval stage may do and which needs a reason. */
  | { kind: 'backward' }
  | { kind: 'illegal'; reason: string }

export interface MoveStage {
  key: string
  name: string
  requiresApproval: boolean
  nextStageKey?: string | null
}

export function classifyMove(
  stages: MoveStage[],
  fromKey: string,
  toKey: string,
): Move {
  if (fromKey === toKey) return { kind: 'same' }

  const from = stages.find((stage) => stage.key === fromKey)
  if (!from) {
    return {
      kind: 'illegal',
      reason: 'This run is on a stage its workflow no longer defines.',
    }
  }

  const order = stages.map((stage) => stage.key)
  const toIndex = order.indexOf(toKey)
  if (toIndex === -1) {
    return { kind: 'illegal', reason: 'That column is not part of this workflow.' }
  }

  if (from.nextStageKey === toKey) {
    return { kind: 'forward', approval: from.requiresApproval }
  }

  if (toIndex < order.indexOf(fromKey)) {
    // Sending work back is a decision an approval stage makes, not a way to
    // reopen any stage by dragging it leftwards.
    if (!from.requiresApproval) {
      return {
        kind: 'illegal',
        reason: `Only an approval stage can send work back, and ${from.name} is not one.`,
      }
    }
    return { kind: 'backward' }
  }

  const next = stages.find((stage) => stage.key === from.nextStageKey)
  return {
    kind: 'illegal',
    reason: next
      ? `${from.name} only leads to ${next.name}. The route is set by the workflow, not by where a card is dropped.`
      : `${from.name} is the last stage; completing it finishes the run.`,
  }
}
