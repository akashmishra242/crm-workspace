/**
 * Tells the app's other open tabs that server data changed, so they refetch at once instead
 * of showing stale contacts until the next focus. Same-browser only; no server round trip.
 */
type CrossTabMessage = { type: 'contacts-changed'; contactIds: string[] }

const channel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('crm-workspace')

export function announceContactsChanged(contactIds: string[]) {
  channel?.postMessage({ type: 'contacts-changed', contactIds } satisfies CrossTabMessage)
}

export function onContactsChangedElsewhere(handler: (contactIds: string[]) => void) {
  const listener = (event: MessageEvent<CrossTabMessage>) => {
    if (event.data.type === 'contacts-changed') handler(event.data.contactIds)
  }
  channel?.addEventListener('message', listener)
  return () => channel?.removeEventListener('message', listener)
}
