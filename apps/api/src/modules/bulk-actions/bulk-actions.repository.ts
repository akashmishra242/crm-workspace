import {
  BULK_ACTION_PAGE_SIZE,
  type BulkActionPage,
  type BulkActionRecord,
  type BulkTagAction,
  type BulkTagResult,
  type Tag,
} from '@crm/shared'
import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Database } from '../../db/client'
import { bulkActions, users } from '../../db/schema'
import { decodeCursor, encodeCursor } from '../../lib/cursor'

type BulkActionLog = {
  action: BulkTagAction
  tag: Tag
  requestedCount: number
  result: BulkTagResult
  actorId: string | null
}

/** Written in the same transaction as the change itself, so the log can't disagree with it. */
export async function recordBulkAction(db: Database, log: BulkActionLog): Promise<void> {
  await db.insert(bulkActions).values({
    action: log.action,
    tagId: log.tag.id,
    tagName: log.tag.name,
    tagColor: log.tag.color,
    requestedCount: log.requestedCount,
    updatedCount: log.result.updatedCount,
    unchangedCount: log.result.unchangedCount,
    notFoundCount: log.result.notFoundIds.length,
    actorId: log.actorId,
  })
}

const bulkActionCursorSchema = z.object({ createdAt: z.string().min(1), id: z.uuid() })

/** Newest first, keyset-paginated on (created_at, id) like the contact list. */
export async function findBulkActionPage(
  db: Database,
  rawCursor: string | undefined,
): Promise<BulkActionPage> {
  const cursor = rawCursor ? decodeCursor(rawCursor, bulkActionCursorSchema) : undefined

  const rows = await db
    .select({
      record: bulkActions,
      actorName: users.name,
      actorEmail: users.email,
      createdAtText: sql<string>`${bulkActions.createdAt}::text`,
    })
    .from(bulkActions)
    .leftJoin(users, eq(users.id, bulkActions.actorId))
    .where(
      cursor
        ? sql`(${bulkActions.createdAt}, ${bulkActions.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
        : undefined,
    )
    .orderBy(desc(bulkActions.createdAt), desc(bulkActions.id))
    .limit(BULK_ACTION_PAGE_SIZE + 1)

  const page = rows.slice(0, BULK_ACTION_PAGE_SIZE)
  const last = page.at(-1)
  return {
    data: page.map(toBulkActionRecord),
    nextCursor:
      rows.length > BULK_ACTION_PAGE_SIZE && last
        ? encodeCursor({ createdAt: last.createdAtText, id: last.record.id })
        : null,
  }
}

type BulkActionRow = {
  record: typeof bulkActions.$inferSelect
  actorName: string | null
  actorEmail: string | null
}

function toBulkActionRecord({ record, actorName, actorEmail }: BulkActionRow): BulkActionRecord {
  return {
    id: record.id,
    action: record.action,
    tag: { id: record.tagId, name: record.tagName, color: record.tagColor },
    requestedCount: record.requestedCount,
    updatedCount: record.updatedCount,
    unchangedCount: record.unchangedCount,
    notFoundCount: record.notFoundCount,
    actor:
      record.actorId && actorName && actorEmail
        ? { id: record.actorId, name: actorName, email: actorEmail }
        : null,
    status: 'completed',
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt.toISOString(),
  }
}
