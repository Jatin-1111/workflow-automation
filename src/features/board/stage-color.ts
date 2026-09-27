/**
 * A stage's colour, from where it sits in the workflow.
 *
 * A board of identical white columns does not read as a pipeline: the first
 * stage and the last look the same, so the eye has to read every heading to
 * find out where work is. Colour by position fixes that without asking
 * anybody to configure anything.
 *
 * The arc runs from the brand's indigo through blue and cyan to green, so it
 * always points the same way — towards done. That ordering is the whole
 * point. A colour picked per stage would be decoration; a colour derived
 * from position is information, and it stays correct when somebody inserts a
 * stage in the middle.
 *
 * Kept out of the engine deliberately: how a stage looks is not something the
 * state machine has an opinion about.
 */

/** Written out rather than composed, because Tailwind scans for literals. */
const CAPS = [
  'bg-stage-1',
  'bg-stage-2',
  'bg-stage-3',
  'bg-stage-4',
  'bg-stage-5',
  'bg-stage-6',
] as const

/**
 * The cap class for the stage at `index`.
 *
 * Workflows longer than the ramp wrap round. Two stages then share a colour,
 * which is honest — colour is a hint about position here, not an identifier,
 * and the heading beside it is what actually names the stage.
 */
export function stageCap(index: number): string {
  if (!Number.isInteger(index) || index < 0) return CAPS[0]
  return CAPS[index % CAPS.length]
}

export const STAGE_RAMP_LENGTH = CAPS.length
