import type { Contact, Tag } from '@crm/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify } from '../../../components/ui/Toast'
import { announceContactsChanged } from '../../../lib/crossTab'
import { activityKeys } from '../../activity/api/activityQueries'
import { contactKeys } from '../../contacts/api/contactQueries'
import { addContactTag, removeContactTag } from './tagsApi'

const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name)

/**
 * Tag changes are applied to the cache immediately and rolled back if the server rejects
 * them. They are safe to make optimistic: adding or removing a tag is idempotent.
 */
export function useContactTagMutations(contactId: string) {
  const queryClient = useQueryClient()
  const detailKey = contactKeys.detail(contactId)

  async function applyOptimistic(change: (tags: Tag[]) => Tag[]) {
    await queryClient.cancelQueries({ queryKey: detailKey })
    const previous = queryClient.getQueryData<Contact>(detailKey)
    queryClient.setQueryData<Contact>(detailKey, (contact) =>
      contact ? { ...contact, tags: change(contact.tags) } : contact,
    )
    return { previous }
  }

  const callbacks = {
    onError: (error: Error, tag: Tag, context: { previous?: Contact } | undefined) => {
      queryClient.setQueryData(detailKey, context?.previous)
      notify.error(`Couldn't update tag “${tag.name}”`, error.message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey })
      void queryClient.invalidateQueries({ queryKey: activityKeys.contact(contactId) })
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: contactKeys.counts() })
      announceContactsChanged([contactId])
    },
  }

  // Tag changes to one contact run one after another, so quick clicks can't reorder or
  // roll back each other.
  const scope = { id: `contact-tags-${contactId}` }

  const addTag = useMutation({
    scope,
    mutationFn: (tag: Tag) => addContactTag(contactId, tag.id),
    onMutate: (tag) =>
      applyOptimistic((tags) =>
        tags.some((existing) => existing.id === tag.id) ? tags : [...tags, tag].sort(byName),
      ),
    ...callbacks,
  })

  const removeTag = useMutation({
    scope,
    mutationFn: (tag: Tag) => removeContactTag(contactId, tag.id),
    onMutate: (tag) => applyOptimistic((tags) => tags.filter((existing) => existing.id !== tag.id)),
    ...callbacks,
  })

  return { addTag, removeTag }
}
