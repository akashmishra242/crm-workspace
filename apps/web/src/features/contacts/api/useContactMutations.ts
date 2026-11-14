import type {
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
  VersionConflictDetails,
} from '@crm/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { announceContactsChanged } from '../../../lib/crossTab'
import { isApiError } from '../../../lib/http'
import { activityKeys } from '../../activity/api/activityQueries'
import { contactKeys } from './contactQueries'
import { createContact, deleteContact, restoreContact, updateContact } from './contactsApi'

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContactCreateInput) => createContact(input),
    onSuccess: (contact) => {
      queryClient.setQueryData(contactKeys.detail(contact.id), contact)
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: contactKeys.counts() })
      announceContactsChanged([contact.id])
    },
  })
}

type QueryClient = ReturnType<typeof useQueryClient>

/** Everything that lists or counts contacts, or shows history, changes with a delete. */
function refreshAfterDeleteOrRestore(queryClient: QueryClient, contactId: string) {
  void queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
  void queryClient.invalidateQueries({ queryKey: contactKeys.counts() })
  void queryClient.invalidateQueries({ queryKey: activityKeys.all })
  announceContactsChanged([contactId])
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contactId: string) => deleteContact(contactId),
    onSuccess: (_result, contactId) => {
      queryClient.removeQueries({ queryKey: contactKeys.detail(contactId) })
      refreshAfterDeleteOrRestore(queryClient, contactId)
    },
  })
}

/**
 * A plain function rather than a hook: Undo is clicked in a toast after the contact page has
 * unmounted, when a hook's callbacks would no longer run.
 */
export async function restoreContactAndRefresh(queryClient: QueryClient, contactId: string) {
  const contact = await restoreContact(contactId)
  queryClient.setQueryData(contactKeys.detail(contact.id), contact)
  refreshAfterDeleteOrRestore(queryClient, contact.id)
  return contact
}

export function useUpdateContact(contactId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContactUpdateInput) => updateContact(contactId, input),
    // A refetch that started before the save could land after it and restore the old version.
    onMutate: () => queryClient.cancelQueries({ queryKey: contactKeys.detail(contactId) }),
    onSuccess: (contact: Contact) => {
      queryClient.setQueryData(contactKeys.detail(contact.id), contact)
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: contactKeys.counts() })
      void queryClient.invalidateQueries({ queryKey: activityKeys.contact(contact.id) })
      announceContactsChanged([contact.id])
    },
    onError: (error) => {
      // A conflict response carries the latest version: show it everywhere straight away.
      if (isApiError(error, 'VERSION_CONFLICT')) {
        const { current } = error.details as VersionConflictDetails
        queryClient.setQueryData(contactKeys.detail(contactId), current)
        void queryClient.invalidateQueries({ queryKey: activityKeys.contact(contactId) })
      }
    },
  })
}
