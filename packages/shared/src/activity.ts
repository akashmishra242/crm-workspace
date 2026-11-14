import { z } from 'zod'
import type { ContactField } from './contact'
import type { TagColor } from './tag'
import type { User } from './user'

export const ACTIVITY_TYPES = [
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'TAG_ADDED',
  'TAG_REMOVED',
  'CONTACT_DELETED',
  'CONTACT_RESTORED',
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export type FieldChange = {
  from: string | null
  to: string | null
}

export type ContactChanges = Partial<Record<ContactField, FieldChange>>

export type TagActivityPayload = {
  tagId: string
  tagName: string
  tagColor: TagColor
  source: 'single' | 'bulk'
}

type ActivityBase = {
  id: string
  contactId: string
  /** Who made the change; null for system changes such as the initial import. */
  actor: User | null
  createdAt: string
}

export type Activity = ActivityBase &
  (
    | { type: 'CONTACT_CREATED'; payload: Record<string, never> }
    | { type: 'CONTACT_UPDATED'; payload: { changes: ContactChanges } }
    | { type: 'TAG_ADDED' | 'TAG_REMOVED'; payload: TagActivityPayload }
    | { type: 'CONTACT_DELETED' | 'CONTACT_RESTORED'; payload: { name: string } }
  )

export const ACTIVITY_PAGE_SIZE = 20

export const activityListQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
})

export type ActivityPage = {
  data: Activity[]
  nextCursor: string | null
}

/** The change history across all contacts, optionally narrowed by kind and teammate. */
export const activityFeedQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  type: z.enum(ACTIVITY_TYPES).optional(),
  actorId: z.uuid().optional(),
})
export type ActivityFeedQuery = z.infer<typeof activityFeedQuerySchema>

export type ActivityFeedItem = Activity & {
  /** The contact's name when the change was listed, so the feed needs no extra request. */
  contactName: string
  /** Deleted contacts keep their history; the UI offers Restore instead of a link. */
  contactDeleted: boolean
}

export type ActivityFeedPage = {
  data: ActivityFeedItem[]
  nextCursor: string | null
}
