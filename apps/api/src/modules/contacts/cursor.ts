import {
  CONTACT_SORT_FIELDS,
  SORT_ORDERS,
  type ContactSortField,
  type SortOrder,
} from '@crm/shared'
import { z } from 'zod'
import { decodeCursor, encodeCursor, invalidCursor } from '../../lib/cursor'

const contactCursorSchema = z.object({
  sort: z.enum(CONTACT_SORT_FIELDS),
  order: z.enum(SORT_ORDERS),
  /** The sort column rendered as text, so timestamps keep Postgres' microsecond precision. */
  value: z.string(),
  id: z.uuid(),
  direction: z.enum(['next', 'prev']),
})

export type ContactCursor = z.infer<typeof contactCursorSchema>
export type PageDirection = ContactCursor['direction']

export function encodeContactCursor(cursor: ContactCursor): string {
  return encodeCursor(cursor)
}

/** A cursor is only meaningful for the sort it was issued under. */
export function decodeContactCursor(
  raw: string,
  sort: ContactSortField,
  order: SortOrder,
): ContactCursor {
  const cursor = decodeCursor(raw, contactCursorSchema)
  if (cursor.sort !== sort || cursor.order !== order) {
    throw invalidCursor()
  }
  return cursor
}
