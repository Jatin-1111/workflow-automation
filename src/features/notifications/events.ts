/**
 * The one browser event the notification pieces share.
 *
 * The bell lives in the sidebar and the list lives in the page, and neither
 * knows about the other. When the page refreshes or reads something it says
 * so here, and the bell asks the server for its count again.
 */

export const NOTIFICATIONS_CHANGED = 'orbit:notifications-changed'

export function announceNotificationsChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED))
}
