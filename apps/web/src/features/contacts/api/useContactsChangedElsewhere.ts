import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { onContactsChangedElsewhere } from '../../../lib/crossTab'
import { activityKeys } from '../../activity/api/activityQueries'
import { contactKeys } from './contactQueries'

/**
 * Refetches when another tab saves a contact. On an open contact page this surfaces the
 * "updated by someone else" notice immediately, before the user tries to save.
 */
export function useContactsChangedElsewhere() {
  const queryClient = useQueryClient()

  useEffect(
    () =>
      onContactsChangedElsewhere((contactIds) => {
        void queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
        void queryClient.invalidateQueries({ queryKey: contactKeys.counts() })
        for (const id of contactIds) {
          void queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) })
          void queryClient.invalidateQueries({ queryKey: activityKeys.contact(id) })
        }
      }),
    [queryClient],
  )
}
