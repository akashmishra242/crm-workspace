import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'crm.currentUserId'

let currentUserId = readStoredUserId()
const listeners = new Set<() => void>()

/**
 * Each tab keeps its own teammate (sessionStorage), so two tabs can act as two people when
 * trying out conflicting edits. New tabs start as the teammate picked most recently.
 */
function readStoredUserId(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * The teammate this tab acts as. There is no login: the id is sent with every request so
 * the API can attribute changes, and it scopes the teammate's synced preferences.
 */
export function getCurrentUserId(): string | null {
  return currentUserId
}

export function setCurrentUserId(id: string) {
  if (id === currentUserId) return
  currentUserId = id
  try {
    window.sessionStorage.setItem(STORAGE_KEY, id)
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Blocked storage: the choice still applies until the tab closes.
  }
  listeners.forEach((notify) => notify())
}

/** Forgets a teammate the server no longer knows, e.g. after the database was reset. */
export function clearCurrentUserId() {
  currentUserId = null
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored to clear.
  }
  listeners.forEach((notify) => notify())
}

export function subscribeToSession(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCurrentUserId(): string | null {
  return useSyncExternalStore(subscribeToSession, getCurrentUserId)
}
