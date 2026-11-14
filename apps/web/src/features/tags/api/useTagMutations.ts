import { TAG_COLORS, type BulkTagInput, type Tag } from '@crm/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { announceContactsChanged } from '../../../lib/crossTab'
import { activityKeys } from '../../activity/api/activityQueries'
import { bulkActionKeys } from '../../history/historyQueries'
import { contactKeys } from '../../contacts/api/contactQueries'
import { tagKeys } from './tagQueries'
import { bulkUpdateTags, createTag } from './tagsApi'

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => {
      const existing = queryClient.getQueryData<Tag[]>(tagKeys.all) ?? []
      const color = TAG_COLORS[existing.length % TAG_COLORS.length]
      return createTag({ name, color })
    },
    onSuccess: (tag) => {
      queryClient.setQueryData<Tag[]>(tagKeys.all, (tags = []) =>
        [...tags, tag].sort((a, b) => a.name.localeCompare(b.name)),
      )
    },
    // Typically TAG_ALREADY_EXISTS: someone else created it, so refresh the list to show it.
    onError: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  })
}

export function useBulkTagMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkTagInput) => bulkUpdateTags(input),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.all })
      void queryClient.invalidateQueries({ queryKey: activityKeys.all })
      void queryClient.invalidateQueries({ queryKey: bulkActionKeys.all })
      announceContactsChanged(input.contactIds)
    },
  })
}
