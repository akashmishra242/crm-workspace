import { registerSW } from 'virtual:pwa-register'
import { notify } from '../components/ui/Toast'
import { t } from '../i18n'
import { CLIENT_OUTDATED_EVENT } from './http'
import { hasUnsavedChanges } from './unsavedChanges'

/**
 * Keeps open tabs on the latest deploy without ever throwing away someone's work.
 *
 * 1. Find updates: the browser only re-checks the service worker on a full page load, and a
 *    single-page app can stay open for days. So check every 6 hours. Coming back to the tab or
 *    back online also checks, if 6 hours have passed (a sleeping laptop pauses timers).
 * 2. Apply at a safe moment: straight away if the tab is in the background, otherwise on the
 *    next page change, or now from the toast. Never while a form has unsaved changes.
 * 3. Recover from version skew: a tab still running old code may ask for a code chunk the
 *    deploy removed, or the API may say this build is too old. Either way, reload once.
 */
const CHECK_EVERY_MS = 6 * 60 * 60_000
const UPDATE_TOAST_ID = 'app-update'
const RELOADED_AT_KEY = 'crm.reloadedForUpdateAt'

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null
let registration: ServiceWorkerRegistration | undefined
let updateWaiting = false
/** Set when the API refused this build: switch as soon as the new version is downloaded. */
let mustUpdate = false

function applyIfSafe(reason: 'hidden' | 'navigation' | 'user') {
  if (!updateWaiting || !applyUpdate) return
  if (hasUnsavedChanges() && reason !== 'user') return
  updateWaiting = false
  void applyUpdate(true)
}

/** Called on every route change: the page is changing anyway, so it may as well be new code. */
export function onNavigation() {
  applyIfSafe('navigation')
}

function announceUpdate() {
  updateWaiting = true
  if (mustUpdate) return applyIfSafe('user')
  if (document.visibilityState === 'hidden') return applyIfSafe('hidden')
  notify.prompt(UPDATE_TOAST_ID, t.update.title, t.update.description, {
    label: t.update.reload,
    onClick: () => applyIfSafe('user'),
  })
}

/** At most one forced reload a minute, so a broken deploy can't cause a reload loop. */
export function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0)
    if (Date.now() - last < 60_000) return
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()))
  } catch {
    // Storage blocked: still reload, the browser's cache rules keep this from looping.
  }
  window.location.reload()
}

export function startUpdateChecks() {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh: announceUpdate,
    onRegisteredSW(_url, registered) {
      registration = registered
      if (!registered) return
      // The page load itself just checked, so the clock starts now.
      let lastCheck = Date.now()
      const check = () => {
        if (!navigator.onLine) return
        lastCheck = Date.now()
        void registered.update().catch(() => {})
      }
      const checkIfDue = () => {
        if (Date.now() - lastCheck >= CHECK_EVERY_MS) check()
      }
      setInterval(check, CHECK_EVERY_MS)
      window.addEventListener('online', checkIfDue)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkIfDue()
      })
    },
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') applyIfSafe('hidden')
  })

  window.addEventListener(CLIENT_OUTDATED_EVENT, () => {
    if (updateWaiting) return applyIfSafe('user')
    // Without a service worker (development, or blocked) a reload is the update.
    if (!registration) return reloadForNewVersion()
    mustUpdate = true
    void registration.update().catch(() => reloadForNewVersion())
  })

  // Vite fires this when a lazy chunk can't be loaded, typically because a deploy replaced
  // it while this tab still ran the old code.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadForNewVersion()
  })
}
