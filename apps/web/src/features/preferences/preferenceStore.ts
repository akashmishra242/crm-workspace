import type { PreferenceKey, PreferenceMap, StoredPreference } from '@crm/shared'
import { isApiError } from '../../lib/http'
import { getCurrentUserId, subscribeToSession } from '../../lib/session'
import { savePreference } from './preferencesApi'

type Entry = StoredPreference & {
  /** Changed locally and not yet confirmed by the server. */
  pending: boolean
}

type Entries = Partial<Record<PreferenceKey, Entry>>

/** Rapid changes (dragging a column edge, reordering) collapse into one request. */
const SAVE_DELAY_MS = 1_000

const listeners = new Set<() => void>()
const saveTimers = new Map<PreferenceKey, ReturnType<typeof setTimeout>>()

/** The teammate whose preferences are loaded; pushes always go out under this id. */
let owner = getCurrentUserId()
let entries: Entries = load()

const storageKey = (userId: string | null) => `crm.preferences.${userId ?? 'anonymous'}`

function load(): Entries {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(owner)) ?? '{}') as Entries
  } catch {
    return {}
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

function commit(next: Entries) {
  entries = next
  try {
    window.localStorage.setItem(storageKey(owner), JSON.stringify(entries))
  } catch {
    // Storage full or blocked: preferences still apply for this tab and still sync.
  }
  notify()
}

function setEntry(key: PreferenceKey, entry: Entry) {
  commit({ ...entries, [key]: entry })
}

async function push(key: PreferenceKey, { keepalive = false } = {}) {
  clearTimeout(saveTimers.get(key))
  saveTimers.delete(key)
  const entry = entries[key]
  const pushedFor = owner
  if (!entry?.pending || !pushedFor) return

  try {
    const stored = await savePreference(
      key,
      { value: entry.value, updatedAt: entry.updatedAt },
      { keepalive, asUser: pushedFor },
    )
    if (owner !== pushedFor) return
    // A change made while the request was in flight is newer and stays pending.
    const current = entries[key]
    if (!current || stored.updatedAt >= current.updatedAt) {
      setEntry(key, { ...stored, pending: false })
    }
  } catch (error) {
    // The server refused the value itself, so retrying would never succeed.
    if (isApiError(error) && error.status >= 400 && error.status < 500 && owner === pushedFor) {
      if (entries[key] === entry) setEntry(key, { ...entry, pending: false })
    }
    // Otherwise it stays pending and is retried on the next change, focus or reconnect.
  }
}

/**
 * Local-first preference store. A change applies and persists to localStorage at once, then
 * syncs to the server in the background, debounced per key. When the server holds a newer
 * value (written on another device) it wins; otherwise the local value is pushed.
 */
export const preferenceStore = {
  get: (key: PreferenceKey): unknown => entries[key]?.value,

  set(key: PreferenceKey, value: unknown) {
    setEntry(key, { value, updatedAt: new Date().toISOString(), pending: true })
    clearTimeout(saveTimers.get(key))
    saveTimers.set(
      key,
      setTimeout(() => void push(key), SAVE_DELAY_MS),
    )
  },

  reconcile(server: PreferenceMap) {
    const next = { ...entries }
    const toPush: PreferenceKey[] = []
    for (const key of Object.keys({ ...entries, ...server }) as PreferenceKey[]) {
      const local = entries[key]
      const remote = server[key]
      if (remote && (!local || remote.updatedAt > local.updatedAt)) {
        next[key] = { ...remote, pending: false }
      } else if (local?.pending) {
        toPush.push(key)
      }
    }
    commit(next)
    toPush.forEach((key) => void push(key))
  },

  /** Sends pending changes now; used when the page is hidden or the teammate changes. */
  flush() {
    for (const [key, entry] of Object.entries(entries) as Array<[PreferenceKey, Entry]>) {
      if (entry.pending) void push(key, { keepalive: true })
    }
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  /** Re-reads the current teammate's stored copy (also used by tests after clearing storage). */
  reload() {
    saveTimers.forEach((timer) => clearTimeout(timer))
    saveTimers.clear()
    owner = getCurrentUserId()
    entries = load()
    notify()
  },
}

// Each teammate has their own preferences. Before switching, send the outgoing teammate's
// unsaved changes under their own id, then load the new teammate's copy.
subscribeToSession(() => {
  preferenceStore.flush()
  preferenceStore.reload()
})

// Another tab of this app saved preferences for the same teammate (fires only in other tabs).
window.addEventListener('storage', (event) => {
  if (event.key === storageKey(owner)) {
    entries = load()
    notify()
  }
})
