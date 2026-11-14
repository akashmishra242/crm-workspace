import type {
  Contact,
  ContactFields,
  ContactFilters,
  ContactSortField,
  SortOrder,
  Tag,
} from '@crm/shared'
import { and, asc, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { contacts, contactTags, tags } from '../../db/schema'
import { contactFilterCondition } from './contact-filters'
import type { ContactCursor, PageDirection } from './cursor'

const contactColumns = {
  id: contacts.id,
  firstName: contacts.firstName,
  lastName: contacts.lastName,
  email: contacts.email,
  phone: contacts.phone,
  company: contacts.company,
  version: contacts.version,
  createdAt: contacts.createdAt,
  updatedAt: contacts.updatedAt,
  lastActivityAt: contacts.lastActivityAt,
}

export type ContactRow = Pick<typeof contacts.$inferSelect, keyof typeof contactColumns>

const sortColumns: Record<ContactSortField, typeof contacts.sortName | typeof contacts.createdAt> =
  {
    name: contacts.sortName,
    createdAt: contacts.createdAt,
  }

type ContactPageRequest = {
  filters: ContactFilters
  sort: ContactSortField
  order: SortOrder
  limit: number
  cursor?: ContactCursor
}

export type ContactPageRow = ContactRow & { sortValue: string }

/**
 * Keyset pagination: the cursor row's (sort value, id) pair is the boundary, so every page
 * costs the same however deep it is. Reading backwards flips the scan, then restores order.
 */
export async function findContactPage(
  db: Database,
  request: ContactPageRequest,
): Promise<{ rows: ContactPageRow[]; hasMore: boolean }> {
  const { filters, sort, order, limit, cursor } = request
  const direction: PageDirection = cursor?.direction ?? 'next'
  const scanAscending = (order === 'asc') === (direction === 'next')
  const sortColumn = sortColumns[sort]

  const rows = await db
    .select({ ...contactColumns, sortValue: sql<string>`${sortColumn}::text` })
    .from(contacts)
    .where(
      and(
        contactFilterCondition(filters),
        cursor ? afterCursor(sort, cursor, scanAscending) : undefined,
      ),
    )
    .orderBy(
      ...(scanAscending
        ? [asc(sortColumn), asc(contacts.id)]
        : [desc(sortColumn), desc(contacts.id)]),
    )
    .limit(limit + 1)

  const page = rows.slice(0, limit)
  return {
    rows: direction === 'prev' ? page.reverse() : page,
    hasMore: rows.length > limit,
  }
}

function afterCursor(sort: ContactSortField, cursor: ContactCursor, scanAscending: boolean): SQL {
  const boundary = sort === 'createdAt' ? sql`${cursor.value}::timestamptz` : sql`${cursor.value}`
  const comparison = scanAscending ? sql`>` : sql`<`
  return sql`(${sortColumns[sort]}, ${contacts.id}) ${comparison} (${boundary}, ${cursor.id}::uuid)`
}

export async function countContacts(db: Database, filters: ContactFilters): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(contacts)
    .where(contactFilterCondition(filters))
  return result?.count ?? 0
}

export async function findContactRow(
  db: Database,
  id: string,
  options: { forUpdate?: boolean } = {},
): Promise<ContactRow | undefined> {
  const query = db.select(contactColumns).from(contacts).where(eq(contacts.id, id))
  const [row] = options.forUpdate ? await query.for('update') : await query
  return row
}

export async function contactExists(db: Database, id: string): Promise<boolean> {
  const [row] = await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, id))
  return row !== undefined
}

export async function insertContact(
  db: Database,
  fields: Partial<ContactFields> & Pick<ContactFields, 'firstName'>,
): Promise<ContactRow> {
  const [row] = await db
    .insert(contacts)
    .values({ ...fields, lastActivityAt: sql`now()` })
    .returning(contactColumns)
  if (!row) throw new Error('Insert returned no contact row')
  return row
}

export async function updateContactFields(
  db: Database,
  id: string,
  fields: Partial<ContactFields>,
): Promise<ContactRow> {
  const [row] = await db
    .update(contacts)
    .set({
      ...fields,
      version: sql`${contacts.version} + 1`,
      updatedAt: sql`now()`,
      lastActivityAt: sql`now()`,
    })
    .where(eq(contacts.id, id))
    .returning(contactColumns)
  if (!row) throw new Error(`Contact ${id} disappeared during update`)
  return row
}

/** Tag changes record activity but leave `version` alone; see "Tags don't bump the version" in the README. */
export async function touchContacts(db: Database, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await db
    .update(contacts)
    .set({ updatedAt: sql`now()`, lastActivityAt: sql`now()` })
    .where(inArray(contacts.id, ids))
}

export async function findTagsByContactIds(
  db: Database,
  contactIds: string[],
): Promise<Map<string, Tag[]>> {
  const tagsByContact = new Map<string, Tag[]>(contactIds.map((id) => [id, []]))
  if (contactIds.length === 0) return tagsByContact

  const rows = await db
    .select({ contactId: contactTags.contactId, id: tags.id, name: tags.name, color: tags.color })
    .from(contactTags)
    .innerJoin(tags, eq(tags.id, contactTags.tagId))
    .where(inArray(contactTags.contactId, contactIds))
    .orderBy(asc(tags.name))

  for (const { contactId, ...tag } of rows) {
    tagsByContact.get(contactId)?.push(tag)
  }
  return tagsByContact
}

export function toContact(row: ContactRow, contactTagList: Tag[]): Contact {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    company: row.company,
    tags: contactTagList,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
  }
}
