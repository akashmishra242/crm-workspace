import {
  CONTACT_FIELDS,
  type Contact,
  type ContactChanges,
  type ContactFields,
  type ContactListQuery,
  type ContactPage,
  type contactCreateSchema,
  type contactUpdateSchema,
} from '@crm/shared'
import type { z } from 'zod'
import type { Database } from '../../db/client'
import { notFound, versionConflict } from '../../errors/app-error'
import { insertActivities } from '../activities/activities.repository'
import {
  findContactPage,
  findContactRow,
  findTagsByContactIds,
  insertContact,
  toContact,
  updateContactFields,
  type ContactPageRow,
  type ContactRow,
} from './contacts.repository'
import { decodeContactCursor, encodeContactCursor, type PageDirection } from './cursor'

type ContactCreate = z.output<typeof contactCreateSchema>
type ContactUpdate = z.output<typeof contactUpdateSchema>

export async function listContacts(db: Database, query: ContactListQuery): Promise<ContactPage> {
  const { sort, order, limit, cursor: rawCursor, offset = 0, ...filters } = query
  const cursor = rawCursor ? decodeContactCursor(rawCursor, sort, order) : undefined

  // A jump lands mid-list with OFFSET; from there, Next and Prev continue with cursors.
  const { rows, hasMore } = await findContactPage(db, {
    filters,
    sort,
    order,
    limit,
    cursor,
    offset,
  })
  const tagsByContact = await findTagsByContactIds(
    db,
    rows.map((row) => row.id),
  )

  const pageCursor = (row: ContactPageRow | undefined, direction: PageDirection) =>
    row ? encodeContactCursor({ sort, order, value: row.sortValue, id: row.id, direction }) : null
  const cameBackwards = cursor?.direction === 'prev'

  return {
    data: rows.map((row) => toContact(row, tagsByContact.get(row.id) ?? [])),
    page: {
      // Arriving from one side proves a page exists on that side; `hasMore` covers the other.
      nextCursor: hasMore || cameBackwards ? pageCursor(rows.at(-1), 'next') : null,
      prevCursor: (cameBackwards ? hasMore : cursor !== undefined || offset > 0)
        ? pageCursor(rows[0], 'prev')
        : null,
    },
  }
}

export async function getContact(db: Database, id: string): Promise<Contact> {
  const row = await findContactRow(db, id)
  if (!row) throw notFound('Contact')
  return withTags(db, row)
}

export async function createContact(
  db: Database,
  input: ContactCreate,
  actorId: string | null,
): Promise<Contact> {
  return db.transaction(async (tx) => {
    const row = await insertContact(tx, input, actorId)
    await insertActivities(tx, [
      { contactId: row.id, type: 'CONTACT_CREATED', payload: {}, actorId },
    ])
    return toContact(row, [])
  })
}

/**
 * Optimistic concurrency: the caller sends the version it edited. The row lock serialises
 * concurrent writers so the version check and the diff both see the latest committed row.
 */
export async function updateContact(
  db: Database,
  id: string,
  { version, ...fields }: ContactUpdate,
  actorId: string | null,
): Promise<Contact> {
  return db.transaction(async (tx) => {
    const current = await findContactRow(tx, id, { forUpdate: true })
    if (!current) throw notFound('Contact')
    if (current.version !== version) throw versionConflict(await withTags(tx, current))

    const { updates, changes } = diffContact(current, fields)
    if (Object.keys(changes).length === 0) return withTags(tx, current)

    const updated = await updateContactFields(tx, id, updates, actorId)
    await insertActivities(tx, [
      { contactId: id, type: 'CONTACT_UPDATED', payload: { changes }, actorId },
    ])
    return withTags(tx, updated)
  })
}

function diffContact(current: ContactRow, next: Partial<ContactFields>) {
  const updates: Partial<ContactFields> = {}
  const changes: ContactChanges = {}
  for (const field of CONTACT_FIELDS) {
    const value = next[field]
    if (value === undefined || value === current[field]) continue
    changes[field] = { from: current[field], to: value }
    Object.assign(updates, { [field]: value })
  }
  return { updates, changes }
}

async function withTags(db: Database, row: ContactRow): Promise<Contact> {
  const tagsByContact = await findTagsByContactIds(db, [row.id])
  return toContact(row, tagsByContact.get(row.id) ?? [])
}
