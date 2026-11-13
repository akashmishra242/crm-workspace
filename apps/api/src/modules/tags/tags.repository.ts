import type { Tag, TagCreateInput } from '@crm/shared'
import { and, asc, eq, ilike, inArray } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { contacts, contactTags, tags } from '../../db/schema'
import { escapeLikePattern } from '../../lib/sql'

const tagColumns = { id: tags.id, name: tags.name, color: tags.color }

export async function findTags(db: Database, q: string | undefined): Promise<Tag[]> {
  return db
    .select(tagColumns)
    .from(tags)
    .where(q ? ilike(tags.name, `%${escapeLikePattern(q)}%`) : undefined)
    .orderBy(asc(tags.name))
}

export async function findTagById(db: Database, id: string): Promise<Tag | undefined> {
  const [tag] = await db.select(tagColumns).from(tags).where(eq(tags.id, id))
  return tag
}

export async function insertTag(db: Database, input: TagCreateInput): Promise<Tag> {
  const [tag] = await db.insert(tags).values(input).returning(tagColumns)
  if (!tag) throw new Error('Insert returned no tag row')
  return tag
}

export async function findExistingContactIds(db: Database, ids: string[]): Promise<string[]> {
  const rows = await db.select({ id: contacts.id }).from(contacts).where(inArray(contacts.id, ids))
  return rows.map((row) => row.id)
}

/** Returns only the contacts that did not already have the tag. */
export async function assignTag(
  db: Database,
  contactIds: string[],
  tagId: string,
): Promise<string[]> {
  if (contactIds.length === 0) return []
  const rows = await db
    .insert(contactTags)
    .values(contactIds.map((contactId) => ({ contactId, tagId })))
    .onConflictDoNothing()
    .returning({ contactId: contactTags.contactId })
  return rows.map((row) => row.contactId)
}

/** Returns only the contacts that actually had the tag. */
export async function unassignTag(
  db: Database,
  contactIds: string[],
  tagId: string,
): Promise<string[]> {
  if (contactIds.length === 0) return []
  const rows = await db
    .delete(contactTags)
    .where(and(eq(contactTags.tagId, tagId), inArray(contactTags.contactId, contactIds)))
    .returning({ contactId: contactTags.contactId })
  return rows.map((row) => row.contactId)
}
