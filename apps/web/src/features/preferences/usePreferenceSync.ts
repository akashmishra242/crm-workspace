import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useCurrentUserId } from '../../lib/session'
import { preferenceStore } from './preferenceStore'
import { fetchPreferences } from './preferencesApi'

/**
 * Keeps the local preference store in step with the server: pulls on load and whenever the
 * tab regains focus (picking up changes made on another device), and pushes pending local
 * changes before the page is hidden and when the connection comes back.
 */
export function usePreferenceSync() {
  const userId = useCurrentUserId()

  useQuery({
    queryKey: ['preferences', userId],
    queryFn: async ({ signal }) => {
      const server = await fetchPreferences(signal)
      preferenceStore.reconcile(server)
      return server
    },
    enabled: userId !== null,
    staleTime: 0,
  })

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') preferenceStore.flush()
    }
    document.addEventListener('visibilitychange', flushWhenHidden)
    window.addEventListener('online', preferenceStore.flush)
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden)
      window.removeEventListener('online', preferenceStore.flush)
    }
  }, [])
}
