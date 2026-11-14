import type { Activity, ActivityPage, Contact, Tag } from '@crm/shared'
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { notify } from '../../../components/ui/Toast'
import { announceContactsChanged } from '../../../lib/crossTab'
import { getCurrentUserId } from '../../../lib/session'
import { activityKeys } from '../../activity/api/activityQueries'
import { contactKeys } from '../../contacts/api/contactQueries'
import { userListQuery } from '../../users/api/userQueries'
import { addContactTag, removeContactTag } from './tagsApi'

const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name)

type ActivityData = InfiniteData<ActivityPage, string | null>
type Snapshot = { contact?: Contact; activity?: ActivityData }

/**
 * Tag changes show at once, on the contact and as a new line in its activity, and are
 * rolled back if the server rejects them. That is safe because adding or removing a tag is
 * idempotent. After the server answers, both are refetched so the real entry replaces ours.
 */
export function useContactTagMutations(contactId: string) {
  const queryClient = useQueryClient()
  const detailKey = contactKeys.detail(contactId)
  const activityKey = activityKeys.contact(contactId)

  async function applyOptimistic(
    tag: Tag,
    type: 'TAG_ADDED' | 'TAG_REMOVED',
    change: (tags: Tag[]) => Tag[],
  ): Promise<Snapshot> {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: detailKey }),
      queryClient.cancelQueries({ queryKey: activityKey }),
    ])
    const snapshot: Snapshot = {
      contact: queryClient.getQueryData<Contact>(detailKey),
      activity: queryClient.getQueryData<ActivityData>(activityKey),
    }
    queryClient.setQueryData<Contact>(detailKey, (contact) =>
      contact ? { ...contact, tags: change(contact.tags) } : contact,
    )

    const actor =
      queryClient
        .getQueryData(userListQuery().queryKey)
        ?.find((user) => user.id === getCurrentUserId()) ?? null
    const entry: Activity = {
      id: `pending-${type}-${tag.id}`,
      contactId,
      type,
      payload: { tagId: tag.id, tagName: tag.name, tagColor: tag.color, source: 'single' },
      actor,
      createdAt: new Date().toISOString(),
    }
    queryClient.setQueryData<ActivityData>(activityKey, (data) => {
      const [first, ...rest] = data?.pages ?? []
      if (!data || !first) return data
      return { ...data, pages: [{ ...first, data: [entry, ...first.data] }, ...rest] }
    })
    return snapshot
  }

  const callbacks = {
    onError: (error: Error, tag: Tag, snapshot: Snapshot | undefined) => {
      queryClient.setQueryData(detailKey, snapshot?.contact)
      queryClient.setQueryData(activityKey, snapshot?.activity)
      notify.error(`Couldn't update tag “${tag.name}”`, error.message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey })
      void queryClient.invalidateQueries({ queryKey: activityKey })
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
      applyOptimistic(tag, 'TAG_ADDED', (tags) =>
        tags.some((existing) => existing.id === tag.id) ? tags : [...tags, tag].sort(byName),
      ),
    ...callbacks,
  })

  const removeTag = useMutation({
    scope,
    mutationFn: (tag: Tag) => removeContactTag(contactId, tag.id),
    onMutate: (tag) =>
      applyOptimistic(tag, 'TAG_REMOVED', (tags) =>
        tags.filter((existing) => existing.id !== tag.id),
      ),
    ...callbacks,
  })

  return { addTag, removeTag }
}
