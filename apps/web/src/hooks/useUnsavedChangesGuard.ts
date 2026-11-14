import { useEffect, useId } from 'react'
import { useBlocker } from 'react-router'
import { setUnsavedChanges } from '../lib/unsavedChanges'

/**
 * Protects unsaved edits: in-app navigation is held until the user confirms, and closing
 * or reloading the tab triggers the browser's own prompt.
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const formId = useId()
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    // A new app version waits while there are unsaved edits.
    setUnsavedChanges(formId, true)
    return () => {
      window.removeEventListener('beforeunload', warn)
      setUnsavedChanges(formId, false)
    }
  }, [hasUnsavedChanges, formId])

  return blocker
}
