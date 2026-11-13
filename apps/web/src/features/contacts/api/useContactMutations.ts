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
import { createContact, updateContact } from './contactsApi'

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
