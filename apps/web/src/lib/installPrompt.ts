import { useSyncExternalStore } from 'react'

/** Chrome and Edge fire this when the app can be installed; Safari never does. */
type InstallPromptEvent = Event & { prompt: () => Promise<void> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

window.addEventListener('beforeinstallprompt', (event) => {
  // Keep the browser's mini-infobar quiet; the user menu offers "Install app" instead.
  event.preventDefault()
  deferred = event as InstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  notify()
})

/** Returns a function that shows the browser's install prompt, or null when unavailable. */
export function useInstallPrompt(): (() => void) | null {
  const available = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => deferred !== null,
  )
  if (!available) return null
  return () => {
    void deferred?.prompt()
    deferred = null
    notify()
  }
}
