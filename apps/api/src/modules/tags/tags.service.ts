import type {
  BulkTagAction,
  BulkTagInput,
  BulkTagResult,
  Tag,
  TagActivityPayload,
} from '@crm/shared'
import type { Database } from '../../db/client'
import { notFound } from '../../errors/app-error'
import { insertActivities } from '../activities/activities.repository'
import { contactExists, findTagsByContactIds, touchContacts } from '../contacts/contacts.repository'
import { assignTag, findExistingContactIds, findTagById, unassignTag } from './tags.repository'

type TagChange = {
  contactIds: string[]
  tag: Tag
  action: BulkTagAction
  source: TagActivityPayload['source']
  actorId: string | null
}

type SingleTagChange = {
  contactId: string
  tagId: string
  action: BulkTagAction
  actorId: string | null
}

export async function changeTagInBulk(
  db: Database,
  { contactIds, tagId, action }: BulkTagInput,
  actorId: string | null,
): Promise<BulkTagResult> {
  const requestedIds = [...new Set(contactIds)]

  return db.transaction(async (tx) => {
    const tag = await requireTag(tx, tagId)
    const existingIds = await findExistingContactIds(tx, requestedIds)
    const changedIds = await applyTagChange(tx, {
      contactIds: existingIds,
      tag,
      action,
      source: 'bulk',
      actorId,
    })

    const existing = new Set(existingIds)
    return {
      updatedCount: changedIds.length,
      unchangedCount: existingIds.length - changedIds.length,
      notFoundIds: requestedIds.filter((id) => !existing.has(id)),
    }
  })
}

export async function changeContactTag(
  db: Database,
  { contactId, tagId, action, actorId }: SingleTagChange,
): Promise<Tag[]> {
  return db.transaction(async (tx) => {
    if (!(await contactExists(tx, contactId))) throw notFound('Contact')
    const tag = await requireTag(tx, tagId)
    await applyTagChange(tx, { contactIds: [contactId], tag, action, source: 'single', actorId })

    const tagsByContact = await findTagsByContactIds(tx, [contactId])
    return tagsByContact.get(contactId) ?? []
  })
}

/** Adding or removing is idempotent: activity is only recorded for rows that changed. */
async function applyTagChange(db: Database, change: TagChange): Promise<string[]> {
  const { contactIds, tag, action, source, actorId } = change
  const changedIds =
    action === 'add'
      ? await assignTag(db, contactIds, tag.id)
      : await unassignTag(db, contactIds, tag.id)

  await touchContacts(db, changedIds)
  await insertActivities(
    db,
    changedIds.map((contactId) => ({
      contactId,
      type: action === 'add' ? 'TAG_ADDED' : 'TAG_REMOVED',
      payload: { tagId: tag.id, tagName: tag.name, tagColor: tag.color, source },
      actorId,
    })),
  )
  return changedIds
}

async function requireTag(db: Database, tagId: string): Promise<Tag> {
  const tag = await findTagById(db, tagId)
  if (!tag) throw notFound('Tag')
  return tag
}
