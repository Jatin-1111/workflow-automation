/**
 * The business day boundary.
 *
 * "Due today" has to mean the same thing wherever the server runs, so the day
 * is resolved in Business Orbit's own time zone rather than the host's. A
 * deployment in UTC and a laptop in IST must bucket the same task the same way.
 */

export const DEFAULT_TIME_ZONE = 'Asia/Kolkata'

export function businessTimeZone(): string {
  return process.env.BUSINESS_TIME_ZONE ?? DEFAULT_TIME_ZONE
}

/** How far the zone is ahead of UTC at this instant, in milliseconds. */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)

  // `hour` comes back as 24 at midnight under hour12: false.
  const hour = read('hour') % 24

  const asIfUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    hour,
    read('minute'),
    read('second'),
  )
  return asIfUtc - at.getTime()
}

/** The last instant of the day `at` falls in, for the given zone. */
export function endOfBusinessDay(at: Date, timeZone = businessTimeZone()): Date {
  const offset = zoneOffsetMs(at, timeZone)
  const local = new Date(at.getTime() + offset)

  const endLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    23,
    59,
    59,
    999,
  )
  return new Date(endLocal - offset)
}

/** True when both instants fall on the same business day. */
export function isSameBusinessDay(
  a: Date,
  b: Date,
  timeZone = businessTimeZone(),
): boolean {
  return endOfBusinessDay(a, timeZone).getTime() === endOfBusinessDay(b, timeZone).getTime()
}
